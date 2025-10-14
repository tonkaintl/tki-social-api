# Inventory API

## Overview

The Inventory API provides access to equipment inventory data from the TKI Binder database. It uses an adapter pattern to format item data in different output formats suitable for various use cases (social media posts, JSON APIs, text summaries).

## Architecture

### Components

1. **Inventory Service** (`inventory.service.js`)
   - Connects to the tki-binder MongoDB database
   - Fetches item documents by stock number
   - Manages database connection lifecycle

2. **Formatter Adapters** (`adapters/formatters/`)
   - `social.formatter.js` - Formats items for social media posts (with emojis, structured layout)
   - `json.formatter.js` - Returns clean JSON summary of key fields
   - `summary.formatter.js` - Creates concise one-line text summaries

3. **Controller** (`controllers/inventory/`)
   - Validates requests
   - Fetches items from the service
   - Applies the appropriate formatter
   - Returns formatted responses

### Adapter Pattern

The formatter adapters implement the `ItemFormatterAdapter` base class:

```javascript
class ItemFormatterAdapter {
  async formatItem(item) {
    // Returns: { stockNumber, formattedOutput, status, raw }
  }

  validateItem(item) {
    // Validates item has required fields
  }
}
```

This pattern allows easy addition of new output formats without changing the controller logic.

## API Endpoints

### Get Item by Stock Number

**Endpoint:** `GET /api/inventory/item`

**Authentication:** Required - Internal secret via `x-internal-secret` header

**Query Parameters:**

| Parameter     | Type   | Required | Default | Description                                   |
| ------------- | ------ | -------- | ------- | --------------------------------------------- |
| `stockNumber` | string | Yes      | -       | The stock number to search for                |
| `format`      | string | No       | `json`  | Output format: `social`, `json`, or `summary` |

**Example Requests:**

```bash
# Get item as JSON
curl "http://localhost:4300/api/inventory/item?stockNumber=12345&format=json" \
  -H "x-internal-secret: your-secret-key"

# Get item formatted for social media
curl "http://localhost:4300/api/inventory/item?stockNumber=12345&format=social" \
  -H "x-internal-secret: your-secret-key"

# Get item as a summary
curl "http://localhost:4300/api/inventory/item?stockNumber=12345&format=summary" \
  -H "x-internal-secret: your-secret-key"
```

**Response Format:**

```json
{
  "success": true,
  "stockNumber": "12345",
  "format": "json",
  "formattedOutput": "...",
  "result": {
    "stockNumber": "12345",
    "formattedOutput": "...",
    "status": "success",
    "raw": {
      /* original item data */
    }
  },
  "requestId": "abc-123-def-456"
}
```

## Output Formats

### Social Format

Produces a social media-ready post with emojis and structured information:

```
🚜 2020 John Deere 8345R
📋 Stock #12345
✨ Condition: Excellent
⏱️ Hours: 1,234
🔢 Serial: ABC123XYZ
📍 Location: Des Moines, IA
💰 Price: $185,000.00

Premium tractor with all the bells and whistles.
Fully serviced and ready to work.

📞 Contact us for more details!
🌐 Visit: https://tonkaintl.com
```

**Best for:** Social media posts, marketing materials, customer-facing content

### JSON Format

Returns a clean JSON object with normalized field names:

```json
{
  "stockNumber": "12345",
  "make": "John Deere",
  "model": "8345R",
  "year": 2020,
  "condition": "Excellent",
  "hours": 1234,
  "serialNumber": "ABC123XYZ",
  "location": "Des Moines, IA",
  "price": 185000,
  "description": "Premium tractor with all the bells and whistles...",
  "category": "Tractors",
  "status": "Available",
  "images": ["url1", "url2"]
}
```

**Best for:** API integrations, data processing, internal systems

### Summary Format

Produces a concise one-line summary:

```
2020 John Deere 8345R Stock #12345 (Excellent, 1,234 hrs, Des Moines, IA) - $185,000.00
```

**Best for:** Lists, search results, notifications, email subjects

## Error Handling

### Common Errors

**Item Not Found (404)**

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "Item with stock number '99999' not found",
  "statusCode": 404
}
```

**Invalid Format (400)**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "code": "invalid_enum_value",
      "message": "Invalid format. Must be one of: social, json, summary"
    }
  ]
}
```

**Missing Stock Number (400)**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "errors": [
    {
      "code": "too_small",
      "message": "Stock number is required"
    }
  ]
}
```

## Database Connection

The service connects to the TKI Binder MongoDB database using the connection string from environment variables:

```
MONGODB_TKIBINDER_URI=mongodb+srv://...
```

### Connection Management

- Connection is lazily initialized on first request
- Uses connection pooling (max 10, min 2 connections)
- Includes retry logic with 5-second delays
- Graceful shutdown support via `inventoryService.close()`

### Schema Flexibility

The Item schema is defined with `strict: false` to accommodate legacy data and schema evolution:

```javascript
const itemSchema = new mongoose.Schema(
  {
    // Core fields defined
    Stock_Number: String,
    Make: String,
    Model: String,
    // ... etc
  },
  {
    collection: 'items',
    strict: false, // Allows additional fields
  }
);
```

## Adding New Formatters

To add a new output format:

1. Create a new formatter in `src/adapters/formatters/`:

```javascript
import { ItemFormatterAdapter } from '../item-formatter.types.js';

export class MyFormatter extends ItemFormatterAdapter {
  constructor() {
    super('myformat');
  }

  async formatItem(item) {
    if (!this.validateItem(item)) {
      return {
        status: 'failed',
        stockNumber: item?.Stock_Number || 'unknown',
        formattedOutput: '',
        raw: item,
      };
    }

    // Your formatting logic here
    const output = `Custom format: ${item.Make} ${item.Model}`;

    return {
      status: 'success',
      stockNumber: item.Stock_Number,
      formattedOutput: output,
      raw: item,
    };
  }
}
```

2. Register the formatter in the controller:

```javascript
import { MyFormatter } from '../../../adapters/formatters/my.formatter.js';

const formatters = {
  json: new JsonFormatter(),
  social: new SocialFormatter(),
  summary: new SummaryFormatter(),
  myformat: new MyFormatter(), // Add here
};

const SUPPORTED_FORMATS = ['social', 'json', 'summary', 'myformat'];
```

3. Test your new formatter!

## Testing

Run the inventory service tests:

```bash
npm test inventory.service.spec.js
```

## Future Enhancements

- [ ] Add pagination for fetching multiple items
- [ ] Support filtering by category, make, model, etc.
- [ ] Add caching layer (Redis) for frequently accessed items
- [ ] Create HTML formatter for email templates
- [ ] Add CSV formatter for bulk exports
- [ ] Implement search functionality
- [ ] Add image URL transformation/optimization
- [ ] Create XML formatter for partner integrations
