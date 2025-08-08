# Topic Support for Telegram Forum Groups

## Overview

Your Telegram to Notion extractor now supports extracting messages from specific topics in Telegram forum groups (supergroups with topics enabled). This allows you to filter and extract messages from specific discussion threads within large group chats.

## What's New

### 1. Enhanced Data Types

- **MessageInfo**: Now includes `topicId`, `replyToMsgId`, and `threadId` fields
- **TopicInfo**: New interface for topic discovery with title, message count, and metadata
- **NotionMessage**: Enhanced to include topic information in Notion database
- **CliOptions**: Added topic-related command line options

### 2. Topic Discovery

- **Check Forum Status**: Determine if a chat is a forum group
- **List Topics**: Discover available topics with their IDs and titles
- **Topic Metadata**: Get topic message counts and last activity dates

### 3. Message Filtering by Topic

- **Single Topic**: Extract messages from one specific topic
- **Multiple Topics**: Extract from several topics simultaneously
- **Topic Exclusion**: Option to exclude topic messages and get only general chat

### 4. Enhanced Notion Integration

- **Topic Fields**: New database columns for Topic, Topic ID, and Thread ID
- **Improved Tracking**: Better organization of messages by topic in Notion

## Usage Examples

### List Available Topics

First, check if a chat has topics and list them:

```bash
# List all chats to find the forum group
npm run dev

# List topics in chat #3 (if it's a forum group)
npm run dev -- --action list-topics --chat 3
```

### Extract from Specific Topic

Once you know the topic IDs, extract messages from them:

```bash
# Extract 50 messages from topic ID 123 in chat #3
npm run dev -- --action topic --chat 3 --topic 123 --limit 50

# Extract from multiple topics
npm run dev -- --action topic --chat 3 --topics 123,456,789 --limit 30
```

### Regular Chat Extraction (unchanged)

Normal chat extraction still works exactly the same:

```bash
# Extract from entire chat (including all topics)
npm run dev -- --action specific --chat 3 --limit 100
```

## Technical Implementation

### API Changes

The `getMessages` method now accepts topic filtering options:

```typescript
await telegramClient.getMessages(chatId, limit, {
  topicId: 123, // Filter by specific topic
});
```

### Service Layer

The `TelegramToNotionService` supports topic filtering in extraction options:

```typescript
await service.extractChatToNotion(chatId, {
  messageLimit: 50,
  topicFilter: {
    topicId: 123, // Single topic
    topicIds: [123, 456], // Multiple topics
    includeGeneralTopic: true, // Include non-topic messages
  },
});
```

### Database Schema

Notion databases now include these new fields:

- **Topic**: Text field with topic title
- **Topic ID**: Number field with numeric topic identifier
- **Thread ID**: Number field for threaded messages

## Limitations & Notes

### Current Limitations

1. **Topic Discovery**: The current implementation uses heuristics to find topics. Some forum groups may have topics that aren't detected.
2. **Topic Titles**: Topic titles are currently basic (`Topic {ID}`). Future versions could fetch actual topic names from the forum structure.
3. **Topic Filtering**: The Telegram API topic filtering is experimental and may not work perfectly with all forum group configurations.

### Telegram Forum Requirements

- The chat must be a **supergroup** (not a regular group)
- **Forum/Topics must be enabled** by the group administrators
- Your account must have **access to read messages** in the specific topics

### Best Practices

1. **Test First**: Always use `--action list-topics` to check if a chat supports topics
2. **Start Small**: Begin with small message limits when testing topic extraction
3. **Verify Results**: Check the Notion database to ensure topic information is properly captured

## Troubleshooting

### "Not a forum group" Error

If you get this error, the chat either:

- Isn't a supergroup
- Doesn't have forum/topics enabled
- You don't have sufficient permissions

### No Topics Found

This could mean:

- The forum group has no active topics
- Topics are restricted and you can't see them
- The topic discovery algorithm needs improvement

### Missing Topic Information

If messages appear without topic information:

- They might be general chat messages (not in any topic)
- The topic detection logic may need refinement
- The messages might be from before topics were enabled

## Future Enhancements

Potential improvements for future versions:

1. **Better Topic Discovery**: Use more sophisticated Telegram API calls
2. **Topic Title Resolution**: Fetch actual topic names instead of generic labels
3. **Topic Creation Date**: Include when topics were created
4. **Participant Filtering**: Filter by topic participants
5. **Real-time Topic Monitoring**: Watch for new messages in specific topics

## Migration Notes

This update is **backward compatible**:

- Existing databases will work with new topic fields (they'll just be empty)
- Regular chat extraction continues to work unchanged
- All existing CLI commands remain functional

The new topic fields will only be populated for:

- Messages extracted from forum groups
- New extractions after this update
- Messages that actually belong to topics
