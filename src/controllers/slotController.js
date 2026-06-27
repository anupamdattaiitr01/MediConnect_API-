import * as slotRepository from '../repositories/slotRepository.js';
import * as cacheService from '../services/cacheService.js';

export const getAvailableSlots = async (req, res) => {
  try {
    const { specialty } = req.query;
    const cacheKey = specialty ? `slots:${specialty}` : 'slots:all';

    const cachedSlots = cacheService.get(cacheKey);
    if (cachedSlots) {
      return res.status(200).json({
        success: true,
        cached: true, 
        count: cachedSlots.length,
        data: cachedSlots,
      });
    }

    const slots = await slotRepository.findAvailableSlots(specialty);
    
    cacheService.set(cacheKey, slots, 15000);
    
    return res.status(200).json({
      success: true,
      cached: false,
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