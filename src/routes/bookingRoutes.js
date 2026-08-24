import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createBooking, myBookings } from '../controllers/bookingController.js';

const router = Router();

// Patients only. A doctor hitting these gets a 403.
router.post('/', authenticate, requireRole('patient'), createBooking);
router.get('/my', authenticate, requireRole('patient'), myBookings);

export default router;
