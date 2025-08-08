# Debug Logging Guide

This document explains the comprehensive debug logging that has been added to help troubleshoot hangs and issues.

## What was added

### 1. Enhanced TelegramToNotionService Debugging

- **extractChatToNotion**: Detailed timing and progress logs for each step
- **extractAllChatsToNotion**: Comprehensive logging for multi-chat operations
- **extractMultipleChatsToNotion**: Progress tracking for batch operations
- **Timeout wrappers**: All major operations now have timeouts to prevent infinite hangs

### 2. Enhanced TelegramClient Debugging

- **connect()**: Step-by-step connection process logging
- **attemptConnection()**: Detailed authentication flow tracking
- **getDialogs()**: Timing and count information for chat fetching
- **getMessages()**: Per-chat message retrieval timing and counts

### 3. Enhanced NotionClient Debugging

- **testConnection()**: Detailed connection test with timing
- **addMessage()**: Individual message addition timing and progress
- **addMessages()**: Batch processing with progress and timing per batch

### 4. Enhanced Example Script Debugging

- **extractSpecificChat()**: User input and extraction timing
- **extractAllChats()**: Complete flow timing and breakdown
- **Main flow**: Application startup and chat fetching timing

## Debug Log Format

All debug logs use the format:

```
🚀 DEBUG: [Description]  # Process start
🔗 DEBUG: [Description]  # Connection operations
📋 DEBUG: [Description]  # Data operations
💾 DEBUG: [Description]  # Database operations
⏰ DEBUG: [Description]  # Timing information
✅ DEBUG: [Description]  # Success operations
❌ DEBUG: [Description]  # Error operations
⚠️  DEBUG: [Description]  # Warning operations
```

## Timeout Configuration

The following timeouts are now in place to prevent hangs:

- Telegram connection: 30 seconds
- Notion connection test: 15 seconds
- Get dialogs: 20 seconds
- Get messages: 30 seconds
- Add messages to Notion: 60 seconds

## How to Use

1. Run your telegram-to-notion script as usual:

   ```bash
   npm run telegram-to-notion:dev
   ```

2. Watch for debug logs to identify exactly where the process hangs:

   - If it hangs during "Getting chat information", the issue is with Telegram
   - If it hangs during "Testing Notion connection", the issue is with Notion API
   - If it hangs during "Adding messages to Notion", the issue is with database operations

3. Look for timeout errors to identify hanging operations:

   ```
   Operation 'Get dialogs' timed out after 20000ms
   ```

4. Check error stacks for detailed error information

## Common Hang Points and Solutions

### Telegram Connection Hangs

- **Symptom**: Hangs at "🔗 DEBUG: Checking Telegram connection..."
- **Solution**: Check network connection, API credentials, session validity

### Dialog Fetching Hangs

- **Symptom**: Hangs at "📋 DEBUG: Getting chat information..."
- **Solution**: Network issues, try clearing session with `npm run clear-session`

### Message Retrieval Hangs

- **Symptom**: Hangs at "📨 DEBUG: Getting messages from Telegram..."
- **Solution**: Chat may have restrictions, try a different chat

### Notion Connection Hangs

- **Symptom**: Hangs at "🔍 DEBUG: Testing Notion connection..."
- **Solution**: Check Notion API token, database ID, and permissions

### Database Operations Hang

- **Symptom**: Hangs at "💾 DEBUG: Adding messages to Notion database..."
- **Solution**: Check database permissions, schema, and API rate limits

## Log Analysis

Use these commands to analyze logs:

```bash
# Filter for specific operations
npm run telegram-to-notion:dev 2>&1 | grep "DEBUG:"

# Save logs to file for analysis
npm run telegram-to-notion:dev 2>&1 | tee debug.log

# Watch for specific patterns
npm run telegram-to-notion:dev 2>&1 | grep -E "(timeout|ERROR|❌)"
```

This enhanced debugging should help you pinpoint exactly where the hang occurs!
