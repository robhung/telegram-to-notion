# Database Setup Guide: Messages as Notion Database Pages

This guide explains how to set up Notion to store each Telegram message as an individual database page, which provides much better structure, searchability, and data organization.

## Database vs Page Approach

### 🗄️ **Database Approach (Recommended)**

- Each message becomes a separate Notion page in a database
- Rich filtering, sorting, and querying capabilities
- Structured properties (sender, date, chat, direction, etc.)
- Better for large volumes of messages
- Notion's powerful database features (filters, views, formulas)

### 📄 **Page Approach (Previous)**

- All messages added as blocks to a single page
- Limited search and organization capabilities
- Better for simple archival

## Database Schema

When you create a messages database, it will have these properties:

| Property       | Type      | Description                         |
| -------------- | --------- | ----------------------------------- |
| **Message**    | Title     | Message content (truncated if long) |
| **Content**    | Rich Text | Full message content                |
| **Sender**     | Rich Text | Who sent the message                |
| **Chat**       | Rich Text | Chat/group name                     |
| **Date**       | Date      | When the message was sent           |
| **Direction**  | Select    | "Incoming" or "Outgoing"            |
| **Message ID** | Number    | Telegram message ID                 |
| **Media Type** | Rich Text | Type of media (if any)              |
| **Chat ID**    | Rich Text | Telegram chat ID                    |

## Setup Methods

### Method 1: Automatic Database Creation (Recommended)

1. **Get your Notion integration token** (same as before)
2. **Create a parent page** in Notion where the database will live
3. **Get the parent page ID** from the URL
4. **Use the interactive tool** to create the database:

```bash
npm run telegram-to-notion:dev
# Choose option 7: "Create a new messages database"
```

5. **Follow the prompts** and the tool will:
   - Create the database with proper schema
   - Give you the database ID to use in your `.env` file

### Method 2: Manual Database Creation

1. **Create a new database** in Notion
2. **Set up the properties** manually (see schema above)
3. **Share with your integration**
4. **Get the database ID** from the URL

## Environment Configuration

Update your `.env` file:

```env
# Telegram API credentials (same as before)
TELEGRAM_API_ID=your_api_id_here
TELEGRAM_API_HASH=your_api_hash_here
PHONE_NUMBER=+1234567890

# Notion API credentials
NOTION_TOKEN=secret_your_integration_token_here

# Database ID (not page ID!)
NOTION_DATABASE_ID=your_database_id_here
```

## Usage Examples

### Extract Messages to Database

```bash
# Interactive extraction
npm run telegram-to-notion:dev

# Choose any extraction option (1-6) to add messages to the database
```

### Query Messages from Database

```bash
npm run telegram-to-notion:dev
# Choose option 8: "Query existing messages from database"
```

You can filter by:

- Chat name (partial match)
- Sender name (partial match)
- Direction (Incoming/Outgoing)
- Date range
- Limit results

### View Database Statistics

```bash
npm run telegram-to-notion:dev
# Choose option 9: "Show database statistics"
```

Shows:

- Total message count
- Messages by chat
- Messages by direction (incoming/outgoing)

## Programmatic Usage

### Basic Message Extraction

```typescript
import { TelegramToNotionService } from "./src/TelegramToNotionService.js";

const service = new TelegramToNotionService();

// Extract messages (each becomes a database page)
const result = await service.extractChatToNotion("username", {
  messageLimit: 50,
});

console.log(`Added ${result.messageCount} pages to database`);
```

### Query Messages

```typescript
// Query messages with filters
const messages = await service.queryMessages({
  chatName: "Work Group",
  direction: "Incoming",
  startDate: new Date("2024-01-01"),
  limit: 100,
});

console.log(`Found ${messages.length} matching messages`);
```

### Database Statistics

```typescript
const stats = await service.getDatabaseStats();
console.log(`Total messages: ${stats.totalMessages}`);
console.log("Chat breakdown:", stats.chatCounts);
```

## Advanced Database Features

### Custom Views in Notion

Once your messages are in the database, you can create custom views:

1. **By Chat**: Group all messages by chat name
2. **By Date**: Timeline view of all messages
3. **Recent Incoming**: Filter for recent incoming messages only
4. **Media Messages**: Show only messages with attachments
5. **Keyword Search**: Filter by message content

### Formulas and Rollups

Add calculated properties:

- **Word Count**: Formula to count words in messages
- **Response Time**: Time between incoming and outgoing messages
- **Weekly Stats**: Rollup properties for weekly message counts

### Database Relations

Connect to other databases:

- **Contacts**: Link senders to a contacts database
- **Projects**: Tag messages related to specific projects
- **Tasks**: Create tasks from important messages

## Benefits of Database Approach

### 🔍 **Enhanced Search**

- Search across all message properties
- Filter by multiple criteria simultaneously
- Save search views for quick access

### 📊 **Better Analytics**

- Built-in sorting and grouping
- Visual timeline views
- Statistics and aggregations

### 🏗️ **Structured Data**

- Each message has consistent properties
- Easy to export and analyze
- Integrates with other Notion features

### ⚡ **Performance**

- Better for large datasets
- Faster loading and searching
- More efficient than long text pages

## Migration from Page Approach

If you previously used the page-based approach:

1. **Create a new database** using the setup above
2. **Re-extract your messages** to the new database
3. **Archive or delete** the old page-based data
4. **Update your workflows** to use database features

## Troubleshooting

### "Database not found"

- Check your `NOTION_DATABASE_ID` in `.env`
- Ensure the integration has access to the database
- Verify the database wasn't deleted or moved

### "Permission denied"

- Make sure you shared the database with your integration
- Check that the integration has "Edit" permissions
- Verify the integration token is correct

### "Rate limit exceeded"

- The tool automatically handles rate limiting
- For very large extractions, the process may take longer
- Consider smaller batch sizes for initial testing

### Database properties missing

- The tool automatically creates the required schema
- If manually created, ensure all properties match the expected types
- Property names are case-sensitive

## Best Practices

### 🎯 **Incremental Extraction**

- Extract messages in batches rather than all at once
- Use date filters to avoid duplicates
- Monitor database size and performance

### 🏷️ **Consistent Naming**

- Use consistent chat names across extractions
- Consider normalizing sender names
- Tag important conversations with keywords

### 📋 **Regular Maintenance**

- Periodically clean up test data
- Archive old conversations if needed
- Backup important message data

### 🔒 **Security**

- Limit integration permissions to specific databases
- Regularly review access logs
- Consider workspace-level security policies

---

**Ready to get started?** Run `npm run telegram-to-notion:dev` and choose option 7 to create your first messages database!
