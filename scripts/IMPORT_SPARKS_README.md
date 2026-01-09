# Sparks Import Script

This script imports blog idea "sparks" from text files into the MongoDB database.

## File Format

The script expects text files in `src/controllers/sparks/` with the following format:

```
Section Title (What will appear as the spark heading)
 Thesis statement (The description/explanation)


Next Section Title
 Thesis for the next section


...
```

Each spark consists of:

1. **Section** (line 1): The main title/heading
2. **Thesis** (line 2): The description starting with a space
3. **Empty line** (line 3): Separator between sparks

## Group Mapping

Files are mapped to groups as follows:

- `Buyers & Transparency.txt` → `buyers_transparency`
- `Industry Culture, Tonka Voice, Big Picture.txt` → `industry_culture`
- `Selling & Vendors.txt` → `selling_vendors`

## Usage

```bash
node scripts/import-sparks.js
```

## Environment

Ensure your `.env` file has the correct MongoDB connection string:

```
MONGODB_URI=mongodb://localhost:27017/your-database
```

## What It Does

1. Reads each text file from the sparks directory
2. Parses section/thesis pairs
3. Creates/updates sparks in MongoDB using upsert (by section name)
4. Sets the `group` field based on the source file
5. Logs progress and results

## Output

The script will log:

- Number of sparks found in each file
- Created vs updated count
- Any failures with error details
- Final summary

## Notes

- **Concept field**: Currently set to match the section title. Can be enhanced later.
- **Categories field**: Initialized as empty array. Set manually or via another process.
- **Release order, times_used, last_used**: Use default values (0, 0, null).
- **Upsert behavior**: If a spark with the same section already exists, it will be updated.
