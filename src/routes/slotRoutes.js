import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { availableSlots, createSlot, mySlots } from '../controllers/slotController.js';

const router = Router();

// Public: patients browse before deciding to sign up.
router.get('/', availableSlots);

// Doctors only.
router.post('/', authenticate, requireRole('doctor'), createSlot);
router.get('/my', authenticate, requireRole('doctor'), mySlots);

export default router;
