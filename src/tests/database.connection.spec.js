import mongoose from 'mongoose';
import { afterAll, describe, expect, it } from 'vitest';

import { config } from '../config/env.js';

describe('Database Connection Tests', () => {
  afterAll(async () => {
    // Clean up connections after tests
    await mongoose.disconnect();
  });

  describe('TKI Portal Database', () => {
    it('should connect to TKI Portal MongoDB', async () => {
      const mongoUri =
        config.MONGODB_TKIPORTAL_URI || process.env.MONGODB_TKIPORTAL_URI;

      if (!mongoUri) {
        console.warn('MONGODB_TKIPORTAL_URI not configured, skipping test');
        return;
      }

      try {
        await mongoose.connect(mongoUri);
        expect(mongoose.connection.readyState).toBe(1); // 1 = connected
        await mongoose.disconnect();
      } catch (error) {
        throw new Error(`Failed to connect to TKI Portal DB: ${error.message}`);
      }
    });
  });

  describe('TKI Binder Database', () => {
    it('should connect to TKI Binder MongoDB', async () => {
      const mongoUri =
        config.MONGODB_TKIBINDER_URI || process.env.MONGODB_TKIBINDER_URI;

      if (!mongoUri) {
        console.warn('MONGODB_TKIBINDER_URI not configured, skipping test');
        return;
      }

      try {
        await mongoose.connect(mongoUri);
        expect(mongoose.connection.readyState).toBe(1); // 1 = connected
        await mongoose.disconnect();
      } catch (error) {
        throw new Error(`Failed to connect to TKI Binder DB: ${error.message}`);
      }
    });
  });

  describe('TKI Social Database', () => {
    it('should connect to TKI Social MongoDB', async () => {
      const mongoUri =
        config.MONGODB_TKISOCIAL_URI || process.env.MONGODB_TKISOCIAL_URI;

      if (!mongoUri) {
        console.warn('MONGODB_TKISOCIAL_URI not configured, skipping test');
        return;
      }

      try {
        await mongoose.connect(mongoUri);
        expect(mongoose.connection.readyState).toBe(1); // 1 = connected
        await mongoose.disconnect();
      } catch (error) {
        throw new Error(`Failed to connect to TKI Social DB: ${error.message}`);
      }
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle invalid connection string gracefully', async () => {
      const invalidUri = 'mongodb://invalid-host:27017/test';

      await expect(
        mongoose.connect(invalidUri, { serverSelectionTimeoutMS: 2000 })
      ).rejects.toThrow();
    });
  });
});
