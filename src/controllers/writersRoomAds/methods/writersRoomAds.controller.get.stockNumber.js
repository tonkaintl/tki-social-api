import WritersRoomAds from '../../../models/writersRoomAds.model.js';
import { logger } from '../../../utils/logger.js';

/**
 * Get Writers Room ads by stock number
 */
export async function getWritersRoomAdsByStockNumber(req, res) {
  try {
    const { stockNumber } = req.params;

    if (!stockNumber) {
      logger.warn('Missing stock number parameter', {
        requestId: req.id,
      });

      return res.status(400).json({
        code: 'MISSING_STOCK_NUMBER',
        message: 'Stock number is required',
        requestId: req.id,
      });
    }

    logger.info('Get Writers Room ads by stock number request', {
      requestId: req.id,
      stockNumber,
    });

    const ads = await WritersRoomAds.find({
      stock_number: stockNumber,
    }).sort({
      created_at: -1,
    });

    logger.info('Writers Room ads retrieved successfully', {
      adsCount: ads.length,
      requestId: req.id,
      stockNumber,
    });

    return res.status(200).json({
      ads,
      count: ads.length,
      requestId: req.id,
      stockNumber,
    });
  } catch (error) {
    logger.error('Failed to get Writers Room ads', {
      error: error.message,
      requestId: req.id,
      stockNumber: req.params.stockNumber,
    });

    return res.status(500).json({
      code: 'WRITERS_ROOM_ADS_FETCH_FAILED',
      message: 'Failed to retrieve Writers Room ads',
      requestId: req.id,
    });
  }
}
