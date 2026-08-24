import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';

dotenv.config();

// Fail at startup, not on the first request that needs them.
for (const key of ['DATABASE_URL', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}. See .env.example.`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'UP', database: 'up' });
  } catch {
    res.status(503).json({ status: 'DOWN', database: 'down' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/bookings', bookingRoutes);

// These two must come last. Registered any earlier, the 404 handler would
// swallow every route declared after it.
app.use(notFoundHandler);
app.use(errorHandler);

const start = async () => {
  // Check the database before accepting traffic, rather than inside the
  // listen callback where requests could already be arriving.
  try {
    await pool.query('SELECT 1');
    console.log('Database connected.');
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }

  const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

  // Finish in-flight requests and close pooled connections before exiting.
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

start();
