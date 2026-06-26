import * as slotRepository from '../repositories/slotRepository.js';

export const createBooking = async (req, res) => {
  try {
    const { slotId, patientId } = req.body;

    if (!slotId || !patientId) {
      return res.status(400).json({
        success: false,
        message: 'Missing mandatory parameters: slotId and patientId are required.',
      });
    }

    const booking = await slotRepository.createBookingTransaction(slotId, patientId);

    return res.status(201).json({
      success: true,
      message: 'Appointment successfully confirmed!',
      data: booking,
    });

  } catch (error) {
    if (error.message === 'SLOT_NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'The requested slot does not exist.' });
    }
    
    if (error.message === 'SLOT_ALREADY_BOOKED') {
      return res.status(409).json({ success: false, message: 'Conflict: This appointment slot has already been taken.' });
    }

    console.error('Transactional Booking Exception:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error processing transaction.',
    });
  }
};