/**
 * Script to import sparks from text files
 *
 * Usage: node scripts/import-sparks.js
 *
 * Reads text files from src/controllers/sparks/ directory and imports them as sparks.
 * Each file represents a group, and each pair of lines (section + thesis) creates a spark.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import connectToDb from '../src/config/database.js';
import { config } from '../src/config/env.js';
import { SPARK_GROUP } from '../src/constants/sparks.js';
import Sparks from '../src/models/sparks.model.js';
import { logger } from '../src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping of file names to group constants
const FILE_TO_GROUP = {
  'Buyers & Transparency.txt': SPARK_GROUP.BUYERS_TRANSPARENCY,
  'Industry Culture, Tonka Voice, Big Picture.txt':
    SPARK_GROUP.INDUSTRY_CULTURE,
  'Selling & Vendors.txt': SPARK_GROUP.SELLING_VENDORS,
};

/**
 * Parse a text file and extract sparks
 * Each spark is 3 lines:
 * 1. Section (title/heading)
 * 2. Thesis (description)
 * 3. Empty line (separator)
 */
function parseSparkFile(filePath, group) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() !== '');

  const sparks = [];

  // Process pairs of lines (section, thesis)
  for (let i = 0; i < lines.length; i += 2) {
    if (i + 1 >= lines.length) break;

    const section = lines[i].trim();
    const thesis = lines[i + 1].trim();

    if (!section || !thesis) continue;

    // Extract concept from section if it contains special formatting
    // Default concept is just the section title
    const concept = extractConcept(section);

    sparks.push({
      categories: [], // Will be set manually or via another script
      concept,
      group,
      section,
      thesis,
    });
  }

  return sparks;
}

/**
 * Extract concept from section
 * For now, just use the section as the concept
 * This can be enhanced with AI or manual input later
 */
function extractConcept(section) {
  // Simple approach: use the section title
  // Could be enhanced to extract key themes
  return section;
}

/**
 * Import all spark files
 */
async function importSparks() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectToDb(config.MONGODB_TKISOCIAL_URI);
    logger.info('Connected to MongoDB');

    const sparksDir = path.join(__dirname, '../src/controllers/sparks');
    const allSparks = [];

    // Read each file and parse sparks
    for (const [filename, group] of Object.entries(FILE_TO_GROUP)) {
      const filePath = path.join(sparksDir, filename);

      if (!fs.existsSync(filePath)) {
        logger.warn(`File not found: ${filename}`);
        continue;
      }

      logger.info(`Parsing ${filename}...`);
      const sparks = parseSparkFile(filePath, group);
      logger.info(`Found ${sparks.length} sparks in ${filename}`);

      allSparks.push(...sparks);
    }

    logger.info(`Total sparks to import: ${allSparks.length}`);

    // Import sparks with upsert (by section)
    let created = 0;
    let updated = 0;
    let failed = 0;

    for (const spark of allSparks) {
      try {
        const result = await Sparks.findOneAndUpdate(
          { section: spark.section },
          {
            $set: {
              ...spark,
              updated_at: new Date(),
            },
          },
          {
            new: true,
            runValidators: true,
            upsert: true,
          }
        );

        // Check if created or updated
        const wasCreated =
          result.created_at.getTime() === result.updated_at.getTime();

        if (wasCreated) {
          created++;
        } else {
          updated++;
        }

        logger.info(`${wasCreated ? 'Created' : 'Updated'}: ${spark.section}`);
      } catch (error) {
        failed++;
        logger.error(`Failed to import spark: ${spark.section}`, {
          error: error.message,
        });
      }
    }

    logger.info('Import complete!', {
      created,
      failed,
      total: allSparks.length,
      updated,
    });

    process.exit(0);
  } catch (error) {
    logger.error('Import failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run the import
importSparks();
