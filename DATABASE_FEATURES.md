# Database Features Overview

## 🎯 What Changed

Your Telegram to Notion integration now stores **each message as a separate database page** instead of adding all messages as blocks to a single page. This provides significantly better organization, search capabilities, and data management.

## 🗄️ Database Schema

Each message becomes a Notion database page with these properties:

| Property       | Type      | Example                   | Description                          |
| -------------- | --------- | ------------------------- | ------------------------------------ |
| **Message**    | Title     | "Hey, how are you doing?" | Message content (used as page title) |
| **Content**    | Rich Text | Full message text         | Complete message content             |
| **Sender**     | Rich Text | "John Doe"                | Person who sent the message          |
| **Chat**       | Rich Text | "Work Team"               | Chat/group name                      |
| **Date**       | Date      | 2024-12-15 2:30 PM        | When message was sent                |
| **Direction**  | Select    | "Incoming" / "Outgoing"   | Message direction                    |
| **Message ID** | Number    | 12345                     | Telegram message ID                  |
| **Media Type** | Rich Text | "Photo"                   | Type of media attachment             |
| **Chat ID**    | Rich Text | "-123456789"              | Telegram chat identifier             |

## 🚀 New Capabilities

### 1. **Advanced Filtering & Search**

```bash
# Query messages interactively
npm run telegram-to-notion:dev
# Choose option 8: Query existing messages

# Filter by:
# - Chat name (partial match)
# - Sender name (partial match)
# - Direction (Incoming/Outgoing)
# - Date range (from/to dates)
# - Result limit
```

### 2. **Database Statistics**

```bash
# View statistics
npm run telegram-to-notion:dev
# Choose option 9: Show database statistics

# See:
# - Total message count
# - Messages per chat
# - Incoming vs outgoing breakdown
```

### 3. **Database Creation**

```bash
# Create a new messages database
npm run telegram-to-notion:dev
# Choose option 7: Create new messages database

# Automatically sets up:
# - Proper schema with all required properties
# - Select options for Direction field
# - Optimal property types for each data type
```

## 📊 Programmatic API

### Extract Messages (Database Pages)

```typescript
import { TelegramToNotionService } from "./src/TelegramToNotionService.js";

const service = new TelegramToNotionService();

// Each message becomes a database page
const result = await service.extractChatToNotion("username", {
  messageLimit: 50,
  includeOutgoing: true,
  includeMedia: false,
});

console.log(`Created ${result.messageCount} database pages`);
```

### Query Messages

```typescript
// Advanced querying with filters
const messages = await service.queryMessages({
  chatName: "Work Group", // Partial match
  sender: "John", // Partial match
  direction: "Incoming", // Exact match
  startDate: new Date("2024-01-01"),
  endDate: new Date(),
  limit: 100,
});

// Each result is a full Notion page object
messages.forEach((page) => {
  const props = page.properties;
  console.log(props.Content.rich_text[0].text.content);
});
```

### Database Statistics

```typescript
const stats = await service.getDatabaseStats();

console.log(`Total messages: ${stats.totalMessages}`);
console.log(
  "Top chats:",
  Object.entries(stats.chatCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
);
```

### Create Database

```typescript
// Create a new database programmatically
const databaseId = await service.createMessagesDatabase(
  "parent_page_id",
  "My Telegram Messages"
);

console.log(`Database created: ${databaseId}`);
// Use this ID in your .env file as NOTION_DATABASE_ID
```

## 🔍 Notion Database Views

Once your messages are in the database, create custom views:

### **📅 Timeline View**

- Sort by Date (descending)
- Group by Chat
- Filter for recent messages

### **💬 Chat View**

- Group by Chat name
- Show message counts per chat
- Filter by specific time periods

### **👤 Sender View**

- Group by Sender
- See conversation patterns
- Filter by incoming/outgoing

### **🔍 Search View**

- Filter by keyword in Content
- Search across all properties
- Save frequently used searches

## 📈 Database Benefits

### **Better Organization**

- ✅ Each message is a separate, searchable entity
- ✅ Consistent data structure across all messages
- ✅ Easy to filter, sort, and group
- ❌ No more scrolling through long text blocks

### **Enhanced Search**

- ✅ Search by any property (sender, chat, date, content)
- ✅ Combine multiple search criteria
- ✅ Save search filters as views
- ❌ No more Ctrl+F through pages

### **Data Analysis**

- ✅ Built-in statistics and aggregations
- ✅ Export to CSV or other formats
- ✅ Create charts and visualizations
- ✅ Integration with other Notion databases

### **Performance**

- ✅ Faster loading for large datasets
- ✅ Efficient pagination and filtering
- ✅ Better for thousands of messages
- ❌ No more slow-loading massive pages

## 🔄 Migration from Page Approach

If you previously used the page-based approach:

1. **Backup existing data** from your old pages
2. **Create new database** using option 7 in the interactive tool
3. **Re-extract messages** to populate the new database
4. **Update your .env** to use `NOTION_DATABASE_ID` instead of `NOTION_PAGE_ID`
5. **Archive old pages** once you're satisfied with the new setup

## 🛠️ Configuration Changes

### **Environment Variables**

```env
# OLD (page-based)
NOTION_PAGE_ID=your_page_id

# NEW (database-based)
NOTION_DATABASE_ID=your_database_id
```

### **API Changes**

```typescript
// OLD: Messages added as blocks to a page
await notionClient.addChatHeader(chatName, count);
await notionClient.addMessages(messages); // Blocks

// NEW: Messages added as database pages
await notionClient.addMessages(messages); // Database pages
await notionClient.queryMessages(filters); // Query capability
await notionClient.getDatabaseStats(); // Analytics
```

## 🎨 Customization Options

### **Property Modifications**

You can modify the database schema after creation:

- Add custom properties (tags, priority, status)
- Change property types (e.g., Chat as relation to Contacts database)
- Add formulas for calculated fields
- Create rollup properties for aggregations

### **View Customizations**

- Create filtered views for specific chats
- Build timeline views for chronological browsing
- Set up dashboard views with key metrics
- Design focused views for different use cases

### **Integration Extensions**

- Link messages to project databases
- Create tasks from important messages
- Tag messages with custom categories
- Build automation with Notion API

## 🚨 Important Notes

### **Rate Limiting**

- Database page creation has the same rate limits as before
- The tool automatically handles batching and delays
- Large extractions may take longer but are more reliable

### **Data Structure**

- Message content is stored in both Title and Content properties
- Title is truncated for display, Content has full text
- All timestamps are in ISO format for proper sorting

### **Permissions**

- Your Notion integration needs access to the database
- Database sharing works the same as page sharing
- Integration needs "Insert content" permission for database

---

**Start exploring your messages as structured data!** 🎉

Run `npm run telegram-to-notion:dev` and choose option 7 to create your first messages database.
