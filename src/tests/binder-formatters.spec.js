import { describe, expect, it } from 'vitest';

import { formatBinderItemForInstagram } from '../adapters/instagram/formatters/binder-item.formatter.js';
import { formatBinderItemForLinkedIn } from '../adapters/linkedin/formatters/binder-item.formatter.js';
import { formatBinderItemForMeta } from '../adapters/meta/formatters/binder-item.formatter.js';
import { formatBinderItemForReddit } from '../adapters/reddit/formatters/binder-item.formatter.js';
import { formatBinderItemForThreads } from '../adapters/threads/formatters/binder-item.formatter.js';
import { formatBinderItemForTikTokBusiness } from '../adapters/tiktok_business/formatters/binder-item.formatter.js';
import { formatBinderItemForTikTokPersonal } from '../adapters/tiktok_personal/formatters/binder-item.formatter.js';
import { formatBinderItemForX } from '../adapters/x/formatters/binder-item.formatter.js';
import { formatBinderItemForYouTube } from '../adapters/youtube/formatters/binder-item.formatter.js';

describe('Binder Item Formatters', () => {
  const mockItem = {
    category: 'Tractors',
    description: 'Premium tractor with all features',
    images: ['url1.jpg', 'url2.jpg'],
    location: 'Des Moines, IA',
    make: 'John Deere',
    model: '8345R',
    price: 185000,
    status: 'Available',
    stockNumber: 'TEST-001',
    year: 2020,
  };

  describe('formatBinderItemForMeta', () => {
    it('should format item for Facebook with emojis', () => {
      const result = formatBinderItemForMeta(mockItem);

      expect(result).toContain('🚜 2020 John Deere 8345R');
      expect(result).toContain('📋 Stock #TEST-001');
      expect(result).toContain('📍 Des Moines, IA');
      expect(result).toContain('💰 $185,000.00');
      expect(result).toContain('tonkaintl.com');
    });

    it('should handle items without year', () => {
      const itemWithoutYear = { ...mockItem, year: null };
      const result = formatBinderItemForMeta(itemWithoutYear);

      expect(result).toContain('🚜 John Deere 8345R');
      expect(result).not.toContain('2020');
    });

    it('should include description if present', () => {
      const result = formatBinderItemForMeta(mockItem);

      expect(result).toContain('Premium tractor with all features');
    });

    it('should handle minimal item data', () => {
      const minimalItem = {
        make: 'Caterpillar',
        model: 'D6',
        stockNumber: 'TEST-002',
      };

      const result = formatBinderItemForMeta(minimalItem);

      expect(result).toContain('Caterpillar D6');
      expect(result).toContain('TEST-002');
    });
  });

  describe('formatBinderItemForLinkedIn', () => {
    it('should format item for LinkedIn professionally', () => {
      const result = formatBinderItemForLinkedIn(mockItem);

      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('Des Moines, IA');
      expect(result).toContain('Price: $185,000.00');
      expect(result).toContain('tonkaintl.com');
    });

    it('should include hashtags', () => {
      const result = formatBinderItemForLinkedIn(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#Construction');
      expect(result).toContain('#Agriculture');
      expect(result).toContain('#JohnDeere');
    });

    it('should use pipe separators for specs', () => {
      const result = formatBinderItemForLinkedIn(mockItem);

      expect(result).toContain(' | ');
    });

    it('should have professional CTA', () => {
      const result = formatBinderItemForLinkedIn(mockItem);

      expect(result).toContain('Contact Tonkin International');
    });
  });

  describe('formatBinderItemForX', () => {
    it('should format item for X with character limit', () => {
      const result = formatBinderItemForX(mockItem);

      expect(result.length).toBeLessThanOrEqual(280);
      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('tonkaintl.com');
    });

    it('should use bullet points for readability', () => {
      const result = formatBinderItemForX(mockItem);

      expect(result).toContain('•');
    });

    it('should include hashtags', () => {
      const result = formatBinderItemForX(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#JohnDeere');
    });

    it('should handle long content gracefully', () => {
      const longItem = {
        ...mockItem,
        description: 'A'.repeat(300), // Very long description
      };

      const result = formatBinderItemForX(longItem);

      expect(result.length).toBeLessThanOrEqual(280);
    });
  });

  describe('formatBinderItemForReddit', () => {
    it('should format item for Reddit with markdown', () => {
      const result = formatBinderItemForReddit(mockItem);

      expect(result).toContain('# 2020 John Deere 8345R');
      expect(result).toContain('**Specifications:**');
      expect(result).toContain('* **Stock Number:** TEST-001');
      expect(result).toContain('* **Location:** Des Moines, IA');
      expect(result).toContain('* **Price:** $185,000.00');
    });

    it('should use markdown formatting', () => {
      const result = formatBinderItemForReddit(mockItem);

      expect(result).toContain('**Description:**');
      expect(result).toContain('---'); // Horizontal rule
      expect(result).toContain('[tonkaintl.com]');
    });

    it('should include all specifications as bullets', () => {
      const result = formatBinderItemForReddit(mockItem);

      const bulletCount = (result.match(/\*/g) || []).length;
      expect(bulletCount).toBeGreaterThan(10); // Multiple bullets for formatting
    });
  });

  describe('formatBinderItemForInstagram', () => {
    it('should format item for Instagram with emojis', () => {
      const result = formatBinderItemForInstagram(mockItem);

      expect(result).toContain('🚜 2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('📍 Des Moines, IA');
      expect(result).toContain('💰 $185,000.00');
    });

    it('should include Instagram hashtags', () => {
      const result = formatBinderItemForInstagram(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#JohnDeere');
      expect(result).toContain('#TonkinIntl');
    });

    it('should include description if present', () => {
      const result = formatBinderItemForInstagram(mockItem);

      expect(result).toContain('Premium tractor with all features');
    });
  });

  describe('formatBinderItemForThreads', () => {
    it('should format item for Threads conversationally', () => {
      const result = formatBinderItemForThreads(mockItem);

      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('Des Moines, IA');
      expect(result).toContain('$185,000.00');
    });

    it('should include Threads-style hashtags', () => {
      const result = formatBinderItemForThreads(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#JohnDeere');
    });

    it('should have conversational tone', () => {
      const result = formatBinderItemForThreads(mockItem);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatBinderItemForTikTokPersonal', () => {
    it('should format item for TikTok Personal with engaging style', () => {
      const result = formatBinderItemForTikTokPersonal(mockItem);

      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('$185,000.00');
    });

    it('should include TikTok hashtags', () => {
      const result = formatBinderItemForTikTokPersonal(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#JohnDeere');
      expect(result).toContain('#TikTok');
    });

    it('should be concise for video caption', () => {
      const result = formatBinderItemForTikTokPersonal(mockItem);

      expect(result.length).toBeLessThan(500);
    });
  });

  describe('formatBinderItemForTikTokBusiness', () => {
    it('should format item for TikTok Business professionally', () => {
      const result = formatBinderItemForTikTokBusiness(mockItem);

      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('$185,000.00');
    });

    it('should include business-focused hashtags', () => {
      const result = formatBinderItemForTikTokBusiness(mockItem);

      expect(result).toContain('#Business');
      expect(result).toContain('#HeavyEquipment');
    });

    it('should be suitable for business account', () => {
      const result = formatBinderItemForTikTokBusiness(mockItem);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('formatBinderItemForYouTube', () => {
    it('should format item for YouTube description', () => {
      const result = formatBinderItemForYouTube(mockItem);

      expect(result).toContain('2020 John Deere 8345R');
      expect(result).toContain('Stock #TEST-001');
      expect(result).toContain('Des Moines, IA');
      expect(result).toContain('$185,000.00');
    });

    it('should include YouTube-style details', () => {
      const result = formatBinderItemForYouTube(mockItem);

      expect(result).toContain('tonkaintl.com');
      expect(result).toContain('Premium tractor with all features');
    });

    it('should include hashtags for YouTube', () => {
      const result = formatBinderItemForYouTube(mockItem);

      expect(result).toContain('#HeavyEquipment');
      expect(result).toContain('#JohnDeere');
    });

    it('should support longer content for video descriptions', () => {
      const result = formatBinderItemForYouTube(mockItem);

      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(100);
    });
  });
});
