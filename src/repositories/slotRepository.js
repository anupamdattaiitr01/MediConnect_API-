import { query } from '../config/db.js';

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

  // If a frontend filter is applied (e.g., /slots?specialty=cardiology)
  if (specializationSlug) {
    sql += ` AND sp.slug = $1`;
    params.push(specializationSlug);
  }

  // Always order chronologically
  sql += ` ORDER BY s.start_time ASC;`;

  const result = await query(sql, params);
  return result.rows;
};