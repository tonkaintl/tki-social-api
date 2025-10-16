import {
  PROVIDER_CAPABILITIES,
  PROVIDER_NAMES,
  SUPPORTED_PROVIDERS,
} from '../../../constants/providers.js';
import { logger } from '../../../utils/logger.js';

/**
 * Get supported social media platforms and their capabilities
 */
export async function platformsControllerGetPlatforms(req, res) {
  try {
    logger.info('Get platforms request', {
      requestId: req.id,
    });

    // Build platform information from constants
    const platforms = SUPPORTED_PROVIDERS.map(provider => ({
      capabilities: PROVIDER_CAPABILITIES[provider],
      id: provider,
      name: PROVIDER_NAMES[provider],
    }));

    // Add summary information
    const summary = {
      available_platforms: SUPPORTED_PROVIDERS,
      configured_platforms: [], // Will be populated when we add configuration checking
      total_platforms: SUPPORTED_PROVIDERS.length,
    };

    logger.info('Platforms retrieved successfully', {
      platformCount: platforms.length,
      requestId: req.id,
    });

    return res.status(200).json({
      platforms,
      requestId: req.id,
      summary,
    });
  } catch (error) {
    logger.error('Failed to get platforms', {
      error: error.message,
      requestId: req.id,
    });

    return res.status(500).json({
      code: 'PLATFORMS_FETCH_FAILED',
      message: 'Failed to retrieve platform information',
      requestId: req.id,
    });
  }
}
