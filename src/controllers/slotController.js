import { query } from '../config/db.js';
import { asyncHandler, httpError } from '../middleware/errorHandler.js';
import { parseDate } from '../utils/validation.js';

/** Doctor publishes a slot. doctor_id comes from the token, so a doctor can only publish for themselves. */
export const createSlot = asyncHandler(async (req, res) => {
  const startTime = parseDate(req.body.startTime);
  const endTime = parseDate(req.body.endTime);

  if (!startTime || !endTime) {
    throw httpError(400, 'startTime and endTime must be valid ISO-8601 date-times.');
  }
  if (endTime <= startTime) throw httpError(400, 'endTime must be after startTime.');
  if (startTime <= new Date()) throw httpError(400, 'A slot must start in the future.');

  const { rows } = await query(
    `INSERT INTO slots (doctor_id, start_time, end_time)
     VALUES ($1, $2, $3)
     RETURNING id, doctor_id, start_time, end_time, status`,
    [req.user.id, startTime, endTime]
  );

  res.status(201).json({ success: true, message: 'Slot published.', data: rows[0] });
});

/** Everything still bookable. Past slots are excluded -- they are not bookable, so they are not listed. */
export const availableSlots = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.id AS slot_id, s.start_time, s.end_time,
            d.id AS doctor_id, d.name AS doctor_name
       FROM slots s
       JOIN users d ON d.id = s.doctor_id
      WHERE s.status = 'available'
        AND s.start_time > now()
      ORDER BY s.start_time ASC`
  );

  res.json({ success: true, count: rows.length, data: rows });
});

/** The doctor's own calendar, including booked slots and who booked them. */
export const mySlots = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT s.id AS slot_id, s.start_time, s.end_time, s.status,
            p.id AS patient_id, p.name AS patient_name
       FROM slots s
       LEFT JOIN bookings b ON b.slot_id = s.id
       LEFT JOIN users p ON p.id = b.patient_id
      WHERE s.doctor_id = $1
      ORDER BY s.start_time ASC`,
    [req.user.id]
  );

  res.json({ success: true, count: rows.length, data: rows });
});
