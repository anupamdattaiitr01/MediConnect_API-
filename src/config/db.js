import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Without a listener, an idle client erroring out (database restart, network
// drop) is an unhandled 'error' event and Node kills the process.
pool.on('error', (err) => console.error('Unexpected database pool error:', err.message));

export const query = (text, params) => pool.query(text, params);

/**
 * Runs `fn` inside a transaction: COMMIT on success, ROLLBACK on any throw,
 * and the client is always returned to the pool.
 *
 * `fn` receives the checked-out client and must run every statement on it.
 * Using the pool directly inside `fn` would run that statement on a different
 * connection, outside the transaction, where a rollback could not undo it.
 */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
