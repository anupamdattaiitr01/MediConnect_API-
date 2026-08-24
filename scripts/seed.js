/** Creates two doctors, two patients and a few slots so the API can be tried immediately. */
import bcrypt from 'bcrypt';
import pool from '../src/config/db.js';

const PASSWORD = 'Password123!';

const seed = async () => {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const users = [
    ['Dr. Asha Rao', 'asha@mediconnect.test', 'doctor'],
    ['Dr. Imran Qureshi', 'imran@mediconnect.test', 'doctor'],
    ['Riya Sharma', 'riya@mediconnect.test', 'patient'],
    ['Kabir Nair', 'kabir@mediconnect.test', 'patient'],
  ];

  const doctorIds = [];

  for (const [name, email, role] of users) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, role`,
      [name, email, passwordHash, role]
    );
    if (rows[0].role === 'doctor') doctorIds.push(rows[0].id);
  }

  for (const doctorId of doctorIds) {
    // Eight 30-minute slots starting tomorrow at 09:00.
    await pool.query(
      `INSERT INTO slots (doctor_id, start_time, end_time)
       SELECT $1, gs, gs + interval '30 minutes'
         FROM generate_series(
                date_trunc('day', now()) + interval '1 day 9 hours',
                date_trunc('day', now()) + interval '1 day 12 hours 30 minutes',
                interval '30 minutes'
              ) AS gs`,
      [doctorId]
    );
  }

  const { rows } = await pool.query(
    `SELECT (SELECT count(*) FROM users) AS users,
            (SELECT count(*) FROM slots WHERE status = 'available') AS available_slots`
  );

  console.log(`Seeded ${rows[0].users} users and ${rows[0].available_slots} available slots.`);
  console.log(`All accounts use the password: ${PASSWORD}`);
};

seed()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error('Seed failed:', error.message);
    await pool.end();
    process.exit(1);
  });
