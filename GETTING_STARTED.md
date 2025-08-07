# Getting Started: Telegram to Notion Message Extraction

## Overview

This guide will help you quickly set up and start extracting messages from Telegram to push them into your Notion workspace.

## What You Can Do

✅ **Extract messages from specific Telegram chats**  
✅ **Push messages directly to any Notion page**  
✅ **Filter by date, message type, and chat type**  
✅ **Handle large volumes with automatic batching**  
✅ **Interactive CLI for easy operation**  
✅ **Programmatic API for custom integrations**

## Prerequisites Checklist

Before starting, make sure you have:

- [ ] **Node.js** (version 16+) installed
- [ ] **Telegram account** with access to chats you want to extract
- [ ] **Telegram API credentials** (API ID and Hash from [my.telegram.org](https://my.telegram.org/apps))
- [ ] **Notion account** with workspace access
- [ ] **Notion integration** created and configured

## 5-Minute Setup

### Step 1: Install Dependencies

```bash
git clone <your-repo>
cd telegram-to-notion
npm install
```

### Step 2: Configure Telegram

1. Get API credentials from [my.telegram.org/apps](https://my.telegram.org/apps)
2. Copy environment file: `cp env.example .env`
3. Edit `.env` with your Telegram credentials:
   ```env
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   PHONE_NUMBER=+1234567890
   ```

### Step 3: Configure Notion

1. Follow the detailed guide: [NOTION_SETUP.md](NOTION_SETUP.md)
2. Add to your `.env` file:
   ```env
   NOTION_TOKEN=secret_your_integration_token_here
   NOTION_PAGE_ID=your_notion_page_id_here
   ```

### Step 4: Test & Extract

```bash
# Run the interactive extractor
npm run telegram-to-notion:dev
```

Follow the prompts to extract messages from your chats!

## What Happens When You Extract

1. **Authentication**: You'll be prompted to log into Telegram (first time only)
2. **Chat Selection**: Choose which chats to extract from
3. **Filtering**: Optionally filter by message count, date range, etc.
4. **Extraction**: Messages are retrieved from Telegram
5. **Notion Push**: Messages are formatted and pushed to your Notion page

## Message Format in Notion

Messages appear in your Notion page like this:

```
📱 Chat Name (25 messages)
Extracted on 12/15/2024, 3:30:45 PM

→ [12/15/2024, 2:15:30 PM] John Doe in Chat Name: Hey, how are you doing?
← [12/15/2024, 2:16:45 PM] You in Chat Name: I'm good, thanks! How about you?
→ [12/15/2024, 2:17:12 PM] John Doe in Chat Name: Doing great! [Photo]
```

- `→` = Incoming messages
- `←` = Your outgoing messages
- `[Photo/Video/etc.]` = Media attachments
- Timestamps in your local timezone

## Common Use Cases

### 📋 **Backup Important Conversations**

Extract key conversations for permanent archival in Notion.

### 📊 **Analyze Chat Patterns**

Extract messages to analyze communication patterns or create reports.

### 🗃️ **Organize Project Communications**

Move project-related chat messages into organized Notion project pages.

### 🔍 **Search & Reference**

Use Notion's powerful search to find old messages across all your chats.

### 📝 **Meeting Notes Integration**

Extract meeting-related messages and integrate with your Notion meeting notes.

## Next Steps

### For Beginners

1. Start with the interactive CLI: `npm run telegram-to-notion:dev`
2. Extract from 1-2 small chats first to see how it works
3. Gradually expand to more chats or different filtering options

### For Developers

1. Check out the [API documentation](README.md#api-reference)
2. Look at the [examples](examples/) folder for programmatic usage
3. Customize extraction behavior with the options API

### For Power Users

1. Set up automated scheduled extractions
2. Create custom Notion database schemas for structured data
3. Build webhooks for real-time message sync

## Troubleshooting Quick Fixes

**"Telegram connection failed"**  
→ Check your API credentials and phone number format

**"Notion connection failed"**  
→ Verify your integration token and page ID ([Setup Guide](NOTION_SETUP.md))

**"No messages found"**  
→ Check your filtering options - try increasing message limit or changing date range

**"Rate limit exceeded"**  
→ The tool handles this automatically with delays, just wait a bit longer

## Support

- 📖 **Full Documentation**: [README.md](README.md)
- 🔧 **Notion Setup**: [NOTION_SETUP.md](NOTION_SETUP.md)
- 🐛 **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- 💬 **Issues**: Create a GitHub issue if you need help

## Security Reminders

- 🔒 **Never share your `.env` file** - it contains sensitive credentials
- 🔑 **Keep your API tokens secure** - treat them like passwords
- 📱 **Your session is saved locally** - delete it if switching accounts
- 🌐 **Only grant necessary permissions** - limit Notion integration access

---

**Ready to get started?** Run `npm run telegram-to-notion:dev` and follow the prompts!
