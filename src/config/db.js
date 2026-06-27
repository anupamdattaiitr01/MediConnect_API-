import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 20,                  
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000, 
});

export const query = (text, params) => pool.query(text, params);

export default pool;