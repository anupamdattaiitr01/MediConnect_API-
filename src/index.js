import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import slotRoutes from './routes/slotRoutes.js'; // 1. Import our new routes

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/v1/slots', slotRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', timestamp: new Date() });
});

async function verifyDatabaseConnection() {
  try {
    const res = await pool.query('SELECT NOW();');
    console.log(`✅ Database handshake successful. Server Time: ${res.rows[0].now}`);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await verifyDatabaseConnection();
});