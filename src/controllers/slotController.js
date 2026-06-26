import * as slotRepository from '../repositories/slotRepository.js';

export const getAvailableSlots = async (req, res) => {
  try {
    const { specialty } = req.query; 
    
    const slots = await slotRepository.findAvailableSlots(specialty);
    
    return res.status(200).json({
      success: true,
      count: slots.length,
      data: slots,
    });
  } catch (error) {
    console.error('Error fetching slots:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving appointment slots.',
    });
  }
};