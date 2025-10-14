import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BinderAdapter } from '../adapters/binder/binder.adapter.js';
import { ApiError, ERROR_CODES } from '../constants/errors.js';

// Mock the client
vi.mock('../adapters/binder/binder.client.js', () => ({
  BinderClient: vi.fn().mockImplementation(() => ({
    close: vi.fn(),
    findItemByStockNumber: vi.fn(),
  })),
}));

// Mock logger
vi.mock('../utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock SocialCampaigns model
vi.mock('../models/socialCampaigns.model.js', () => ({
  default: {
    create: vi.fn(),
  },
}));

describe('BinderAdapter', () => {
  let adapter;
  let mockConfig;

  const mockDbItem = {
    industry: 'Agriculture',
    item_details: [
      {
        for_web: true,
        name: 'Condition',
        value: 'Excellent',
      },
      {
        for_web: true,
        name: 'Hours',
        value: '1234',
      },
    ],
    item_status: [
      {
        date: new Date(),
        entered_by: 'Test User',
        value: 'Available',
      },
    ],
    location: {
      city: 'Des Moines',
      state: 'IA',
      zip: '50309',
    },
    manufacturer: 'John Deere',
    model: '8345R',
    stock_number: 'TEST-001',
    title: '2020 John Deere 8345R Premium Tractor',
    tki_advertised_prices: [
      {
        date: new Date(),
        entered_by: 'Test User',
        rating: 5,
        value: { $numberDecimal: '185000.00' },
      },
    ],
    web_media: [
      {
        filename: 'test1.jpg',
        filepath: 'images/test1.jpg',
        is_primary: true,
        type: 'Image',
      },
      {
        filename: 'test2.jpg',
        filepath: 'images/test2.jpg',
        is_primary: false,
        type: 'Image',
      },
    ],
    year: '2020',
  };

  beforeEach(() => {
    mockConfig = {
      MONGODB_TKIBINDER_URI: 'mongodb://localhost:27017/test-binder',
    };

    adapter = new BinderAdapter(mockConfig);
    vi.clearAllMocks();
  });

  describe('getItem', () => {
    it('should fetch and normalize item successfully', async () => {
      adapter.client.findItemByStockNumber.mockResolvedValue(mockDbItem);

      const result = await adapter.getItem('TEST-001');

      expect(adapter.client.findItemByStockNumber).toHaveBeenCalledWith(
        'TEST-001'
      );
      expect(result).toEqual({
        category: 'Agriculture',
        description: '2020 John Deere 8345R Premium Tractor',
        images: [
          {
            filename: 'test1.jpg',
            filepath: 'images/test1.jpg',
            isPrimary: true,
          },
          {
            filename: 'test2.jpg',
            filepath: 'images/test2.jpg',
            isPrimary: false,
          },
        ],
        itemDetails: {
          Condition: 'Excellent',
          Hours: '1234',
        },
        location: 'Des Moines, IA, 50309',
        make: 'John Deere',
        model: '8345R',
        price: 185000,
        status: 'Available',
        stockNumber: 'TEST-001',
        title: '2020 John Deere 8345R Premium Tractor',
        unitNumber: null,
        year: '2020',
      });
    });

    it('should throw RESOURCE_NOT_FOUND when item does not exist', async () => {
      adapter.client.findItemByStockNumber.mockResolvedValue(null);

      await expect(adapter.getItem('NONEXISTENT')).rejects.toThrow(ApiError);

      try {
        await adapter.getItem('NONEXISTENT');
      } catch (error) {
        expect(error.code).toBe(ERROR_CODES.RESOURCE_NOT_FOUND);
        expect(error.statusCode).toBe(404);
        expect(error.message).toContain('NONEXISTENT');
      }
    });

    it('should handle database errors', async () => {
      adapter.client.findItemByStockNumber.mockRejectedValue(
        new Error('Connection timeout')
      );

      await expect(adapter.getItem('TEST-001')).rejects.toThrow(ApiError);

      try {
        await adapter.getItem('TEST-001');
      } catch (error) {
        expect(error.code).toBe(ERROR_CODES.EXTERNAL_SERVICE_ERROR);
        expect(error.statusCode).toBe(500);
      }
    });

    it('should handle items with missing optional fields', async () => {
      const minimalItem = {
        manufacturer: 'Caterpillar',
        model: 'D6',
        stock_number: 'TEST-002',
        title: 'Caterpillar D6',
      };

      adapter.client.findItemByStockNumber.mockResolvedValue(minimalItem);

      const result = await adapter.getItem('TEST-002');

      expect(result.stockNumber).toBe('TEST-002');
      expect(result.make).toBe('Caterpillar');
      expect(result.model).toBe('D6');
      expect(result.price).toBeNull();
      expect(result.hours).toBeUndefined(); // normalize function doesn't return hours field
    });
  });

  describe('createCampaign', () => {
    let mockSocialCampaigns;

    // Mock campaign data
    const mockCampaign = {
      _id: '507f1f77bcf86cd799439011',
      created_by: 'test-user',
      description: '2020 John Deere 8345R Premium Tractor',
      status: 'pending',
      stock_number: 'TEST-001',
      title: '2020 John Deere 8345R Premium Tractor',
      url: 'https://tonkaintl.com/inventory/TEST-001',
    };

    beforeEach(async () => {
      // Mock successful item fetch
      adapter.client.findItemByStockNumber.mockResolvedValue(mockDbItem);

      // Get the mocked model
      const { default: SocialCampaigns } = await import(
        '../models/socialCampaigns.model.js'
      );
      mockSocialCampaigns = SocialCampaigns;
      mockSocialCampaigns.create.mockResolvedValue(mockCampaign);
    });

    it('should create campaign from binder item', async () => {
      const result = await adapter.createCampaign('TEST-001', 'test-user');

      expect(mockSocialCampaigns.create).toHaveBeenCalledWith(
        expect.objectContaining({
          created_by: 'test-user',
          status: 'pending',
          stock_number: 'TEST-001',
          title: '2020 John Deere 8345R Premium Tractor',
          url: 'https://tonkaintl.com/inventory/TEST-001',
        })
      );

      expect(result).toEqual(mockCampaign);
    });

    it('should handle item not found during campaign creation', async () => {
      adapter.client.findItemByStockNumber.mockResolvedValue(null);

      await expect(
        adapter.createCampaign('INVALID-001', 'test-user')
      ).rejects.toThrow(ApiError);
    });

    it('should handle database errors during campaign creation', async () => {
      mockSocialCampaigns.create.mockRejectedValue(new Error('Database error'));

      await expect(
        adapter.createCampaign('TEST-001', 'test-user')
      ).rejects.toThrow(ApiError);
    });
  });

  describe('close', () => {
    it('should close the client connection', async () => {
      await adapter.close();

      expect(adapter.client.close).toHaveBeenCalled();
    });
  });
});
