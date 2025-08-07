# Notion Setup Guide

This guide will walk you through setting up Notion integration to extract Telegram messages and push them to your Notion workspace.

## Prerequisites

1. A Notion account ([notion.so](https://notion.so))
2. Basic understanding of Notion pages and databases
3. Telegram setup already completed (see main README.md)

## Step 1: Create a Notion Integration

1. Go to [https://www.notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "**+ New integration**"
3. Fill in the details:
   - **Name**: `Telegram Message Extractor` (or any name you prefer)
   - **Logo**: Upload an icon (optional)
   - **Associated workspace**: Select your workspace
4. Click "**Submit**"
5. **Important**: Copy the "**Internal Integration Secret**" - this is your `NOTION_TOKEN`

## Step 2: Create a Notion Page for Messages

1. Open Notion and navigate to your workspace
2. Create a new page where you want to store Telegram messages
3. Give it a title like "Telegram Messages" or "Chat Archive"
4. **Get the Page ID**:
   - Open the page in your browser
   - Look at the URL: `https://www.notion.so/workspace/PAGE_ID_HERE?v=...`
   - Copy the `PAGE_ID_HERE` part (32 characters, mix of letters and numbers)
   - This is your `NOTION_PAGE_ID`

## Step 3: Share the Page with Your Integration

1. On your Notion page, click "**Share**" in the top-right corner
2. Click "**Invite**"
3. Search for your integration name (e.g., "Telegram Message Extractor")
4. Select it and click "**Invite**"
5. Make sure the integration has "**Can edit**" permissions

## Step 4: Configure Environment Variables

1. Copy your environment template:

   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file and add your Notion credentials:

   ```env
   # Your existing Telegram config...
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   PHONE_NUMBER=+your_phone_number
   TELEGRAM_SESSION=your_session_string

   # Add these Notion config lines:
   NOTION_TOKEN=secret_your_integration_token_here
   NOTION_PAGE_ID=your_32_character_page_id_here
   ```

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Test the Setup

Run the interactive example to test everything works:

```bash
npm run telegram-to-notion:dev
```

Or test just the Notion connection:

```bash
npm run build
node -e "
import { NotionClient } from './dist/src/NotionClient.js';
const client = new NotionClient();
client.testConnection().then(success => {
  console.log(success ? '✅ Notion connection successful!' : '❌ Notion connection failed');
  process.exit(success ? 0 : 1);
});
"
```

## Troubleshooting

### "Notion connection failed"

1. **Check your integration token**:

   - Make sure you copied the full token from the integration settings
   - The token should start with `secret_`

2. **Check your page ID**:

   - Make sure you copied the correct 32-character page ID from the URL
   - Remove any dashes or extra characters

3. **Check page permissions**:
   - Make sure you invited your integration to the page
   - Make sure the integration has "Can edit" permissions

### "Page not found" or "Unauthorized"

1. Verify the page ID is correct
2. Ensure the integration is properly shared with the page
3. Check that the integration hasn't been deleted or revoked

### "API rate limit exceeded"

1. The script automatically handles rate limiting with delays
2. If you're extracting many messages, the process might take longer
3. Consider reducing the `messageLimit` in your extraction options

## Security Notes

- 🔒 **Never share your integration token** - Keep your `.env` file secure
- 🔑 **Use page-specific integrations** - Only grant access to pages that need it
- 📝 **Review permissions** - Regularly check which integrations have access to your pages

## Page Structure

When messages are extracted, they'll be added to your Notion page in this format:

```
Chat Name (X messages)
Extracted on [timestamp]

→ [timestamp] Sender Name in Chat Name: Message content
← [timestamp] You in Chat Name: Your message content
→ [timestamp] Another User in Chat Name: Another message [Media]
```

- `→` indicates incoming messages
- `←` indicates your outgoing messages
- `[Media]` indicates messages with attachments
- Each chat gets its own section with a header

## Advanced Usage

### Custom Page Templates

You can create a custom page template with:

- Headers for different time periods
- Tables for structured data
- Tags for categorizing messages

### Database Integration

Instead of a simple page, you can create a Notion database to store messages with properties like:

- **Date**: When the message was sent
- **Chat**: Which chat it came from
- **Sender**: Who sent the message
- **Content**: The message text
- **Type**: User/Group/Channel

### Automation

Consider setting up:

- Scheduled extractions using cron jobs
- Webhook integrations for real-time sync
- Custom filters for specific keywords or dates

## Next Steps

Once setup is complete, check out the main README.md for usage examples and the full API reference.
