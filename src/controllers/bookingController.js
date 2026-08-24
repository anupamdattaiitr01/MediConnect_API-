import { query, withTransaction } from '../config/db.js';
import { asyncHandler, httpError } from '../middleware/errorHandler.js';
import { isUuid } from '../utils/validation.js';

/**
 * Book a slot.
 *
 * This is the part of the project that has to be right. Several patients can
 * press "book" on the same slot in the same millisecond, and exactly one of
 * them must succeed.
 *
 * The naive version reads the slot, checks `status === 'available'`, then
 * writes. That has a gap: two requests can both read "available" before either
 * one writes, and both then go on to book. Making the window smaller does not
 * fix it -- the window just has to be unlucky.
 *
 * So the read and the write are a single statement:
 *
 *     UPDATE slots SET status = 'booked'
 *      WHERE id = $1 AND status = 'available'
 *
 * PostgreSQL takes a row lock for the duration of each UPDATE, so concurrent
 * writers are serialised, and each one re-checks `status = 'available'` against
 * the row as it actually stands after the previous writer committed. The first
 * one flips the row and gets rowCount 1; every other one matches nothing and
 * gets rowCount 0. There is no gap between the check and the write because
 * they are the same operation.
 *
 * The UNIQUE constraint on bookings.slot_id is the backstop: even if this logic
 * were wrong, the database still could not store two bookings for one slot.
 */
export const createBooking = asyncHandler(async (req, res) => {
  const { slotId } = req.body;
  if (!isUuid(slotId)) throw httpError(400, 'slotId must be a valid UUID.');

  const patientId = req.user.id; // from the JWT, never from the request body

  const booking = await withTransaction(async (client) => {
    const claim = await client.query(
      `UPDATE slots
          SET status = 'booked'
        WHERE id = $1 AND status = 'available'
        RETURNING id, start_time, end_time`,
      [slotId]
    );

    if (claim.rowCount === 0) {
      // Nothing was updated. Either the slot does not exist, or somebody else
      // already took it. One extra read tells the client which -- and it is
      // safe to read now, because we are past the point of racing.
      const existing = await client.query('SELECT id FROM slots WHERE id = $1', [slotId]);

      throw existing.rowCount === 0
        ? httpError(404, 'Slot not found.')
        : httpError(409, 'This slot is already booked.');
    }

    const slot = claim.rows[0];

    // Rejecting here rolls the whole transaction back, which also undoes the
    // claim above -- the slot returns to 'available' for someone else.
    if (slot.start_time <= new Date()) {
      throw httpError(409, 'That appointment time has already passed.');
    }

    const { rows } = await client.query(
      `INSERT INTO bookings (slot_id, patient_id)
       VALUES ($1, $2)
       RETURNING id, slot_id, patient_id, created_at`,
      [slotId, patientId]
    );

    return { ...rows[0], start_time: slot.start_time, end_time: slot.end_time };
  });

  res.status(201).json({ success: true, message: 'Appointment confirmed.', data: booking });
});

/** The patient's own bookings. Scoped to req.user.id, so nobody can read anyone else's. */
export const myBookings = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT b.id, b.slot_id, b.created_at,
            s.start_time, s.end_time,
            d.id AS doctor_id, d.name AS doctor_name
       FROM bookings b
       JOIN slots s ON s.id = b.slot_id
       JOIN users d ON d.id = s.doctor_id
      WHERE b.patient_id = $1
      ORDER BY s.start_time ASC`,
    [req.user.id]
  );

  res.json({ success: true, count: rows.length, data: rows });
});
