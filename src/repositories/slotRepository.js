import pool, { query } from '../config/db.js';

export const findAvailableSlots = async (specializationSlug) => {
  let sql = `
    SELECT 
      s.id AS slot_id,
      s.start_time,
      s.end_time,
      u.name AS doctor_name,
      sp.name AS specialization
    FROM slots s
    INNER JOIN users u ON s.doctor_id = u.id
    INNER JOIN doctor_profiles dp ON u.id = dp.user_id
    INNER JOIN specializations sp ON dp.specialization_id = sp.id
    WHERE s.status = 'available' AND s.start_time > NOW()
  `;
  
  const params = [];

  if (specializationSlug) {
    sql += ` AND sp.slug = $1`;
    params.push(specializationSlug);
  }

  sql += ` ORDER BY s.start_time ASC;`;

  const result = await query(sql, params);
  return result.rows;
};

export const createBookingTransaction = async (slotId, patientId) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const slotCheckSql = `
      SELECT id, status FROM slots 
      WHERE id = $1 
      FOR UPDATE;
    `;
    const slotResult = await client.query(slotCheckSql, [slotId]);

    if (slotResult.rows.length === 0) {
      throw new Error('SLOT_NOT_FOUND');
    }

    const slot = slotResult.rows[0];

    if (slot.status !== 'available') {
      throw new Error('SLOT_ALREADY_BOOKED');
    }

    const updateSlotSql = `
      UPDATE slots 
      SET status = 'booked' 
      WHERE id = $1;
    `;
    await client.query(updateSlotSql, [slotId]);

    const createBookingSql = `
      INSERT INTO bookings (slot_id, patient_id, status) 
      VALUES ($1, $2, 'confirmed')
      RETURNING id, slot_id, status, created_at;
    `;
    const bookingResult = await client.query(createBookingSql, [slotId, patientId]);

    await client.query('COMMIT');
    
    return bookingResult.rows[0];

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};