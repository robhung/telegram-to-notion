# Telegram to Notion Message Extractor

A powerful TypeScript/Node.js application that extracts messages from Telegram and pushes them to Notion pages. This project combines the GramJS library for Telegram integration with the official Notion API to create a seamless message archiving solution.

## Features

### Telegram Integration

- 🔐 **Secure Authentication** - Uses official Telegram API with session management
- 📖 **Message Extraction** - Retrieve message history from any chat, group, or channel
- 👥 **Chat Management** - List dialogs, search chats, and manage conversations
- 🔍 **Advanced Filtering** - Filter by date, message type, chat type, and more
- 📨 **Send Messages** - Send text messages to users, groups, and channels (bonus feature)

### Notion Integration

- 🗄️ **Database Pages** - Each message becomes a structured database page with rich properties
- 🔍 **Advanced Querying** - Filter, sort, and search messages using Notion's powerful database features
- 📊 **Batch Processing** - Efficiently handle large message volumes with automatic batching
- 📈 **Analytics & Stats** - Built-in statistics and insights about your message data
- 🎯 **Flexible Targeting** - Extract from specific chats or all chats at once

### General Features

- 📘 **TypeScript Support** - Full TypeScript support with comprehensive type definitions
- ⚙️ **Configurable Options** - Customize extraction behavior with detailed options
- 🛡️ **Error Handling** - Robust error handling and retry mechanisms
- 📋 **Interactive CLI** - User-friendly command-line interface for easy operation

## Prerequisites

- Node.js (version 16 or higher)
- A Telegram account with API credentials (API ID and API Hash)
- A Notion account with workspace access

## Quick Start

1. Set up your credentials (see [Installation](#installation) below)
2. Run the interactive extractor:
   ```bash
   npm run telegram-to-notion:dev
   ```
3. Follow the prompts to extract messages from your chats to Notion!

For detailed setup instructions, see [DATABASE_SETUP.md](DATABASE_SETUP.md).

## Installation

1. **Clone or download this project**

   ```bash
   cd jimmyHungCcTracker
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Build the TypeScript project**

   ```bash
   npm run build
   ```

4. **Get Telegram API credentials**

   - Go to [https://my.telegram.org/apps](https://my.telegram.org/apps)
   - Log in with your Telegram account
   - Create a new application
   - Note down your `api_id` and `api_hash`

5. **Set up environment variables**

   ```bash
   cp env.example .env
   ```

   Edit the `.env` file with your credentials:

   ```env
   # Telegram API credentials
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   PHONE_NUMBER=+1234567890
   SESSION_NAME=my_telegram_session

   # Notion API credentials (required for message extraction)
   NOTION_TOKEN=secret_your_integration_token_here
   NOTION_DATABASE_ID=your_notion_database_id_here
   ```

   **Important**: For Notion setup, see the detailed guide: [DATABASE_SETUP.md](DATABASE_SETUP.md)

## Usage Examples

### Interactive Message Extraction

The easiest way to get started is with the interactive CLI:

```bash
# Run the interactive message extractor
npm run telegram-to-notion:dev

# Or run different example modes
npm run telegram-to-notion:dev simple  # Simple programmatic example
npm run telegram-to-notion:dev batch   # Batch extraction example
```

### Programmatic Usage

#### Extract Messages from a Specific Chat

```typescript
import { TelegramToNotionService } from "./src/TelegramToNotionService.js";

const service = new TelegramToNotionService();

// Extract 50 messages from a specific chat
const result = await service.extractChatToNotion("username_or_chat_id", {
  messageLimit: 50,
  includeOutgoing: true,
  includeMedia: false,
});

console.log(
  `Extracted ${result.messageCount} messages from "${result.chatName}"`
);
await service.disconnect();
```

#### Extract from Multiple Chats

```typescript
import { TelegramToNotionService } from "./src/TelegramToNotionService.js";

const service = new TelegramToNotionService();

// Extract messages from multiple chats
const chatIds = ["chat1_username", "chat2_username", "group_name"];
const results = await service.extractMultipleChatsToNotion(chatIds, {
  messageLimit: 30,
  includeOutgoing: true,
  dateFilter: {
    from: new Date("2024-01-01"),
    to: new Date(),
  },
});

console.log(`Extracted ${results.length} chats`);
await service.disconnect();
```

#### Extract All User Chats

```typescript
import { TelegramToNotionService } from "./src/TelegramToNotionService.js";

const service = new TelegramToNotionService();

// Extract messages from all user chats (not groups/channels)
const results = await service.extractAllChatsToNotion({
  messageLimit: 20,
  chatFilter: {
    includeUsers: true,
    includeGroups: false,
    includeChannels: false,
  },
});

console.log(`Extracted from ${results.length} user chats`);
await service.disconnect();
```

### Using Individual Components

If you prefer to use the Telegram and Notion clients separately:

```typescript
import { TelegramClient, NotionClient } from "./src/index.js";

// Telegram client (existing functionality)
const telegramClient = new TelegramClient();
await telegramClient.connect();

const messages = await telegramClient.getMessages("username", 10);
console.log("Retrieved messages:", messages.length);

// Notion client (new functionality)
const notionClient = new NotionClient();

// Convert and push messages to Notion
const notionMessages = messages.map((msg) => ({
  id: msg.id,
  content: msg.message || "[No content]",
  sender: msg.isOutgoing ? "You" : "Other User",
  date: new Date(msg.date * 1000),
  chatName: "Chat Name",
  isOutgoing: msg.isOutgoing,
}));

await notionClient.addMessages(notionMessages);
```

### Available Scripts

```bash
# Message extraction scripts
npm run telegram-to-notion          # Compiled interactive extractor
npm run telegram-to-notion:dev      # Development interactive extractor

# Basic Telegram examples (legacy)
npm run example                     # Basic Telegram client example
npm run example:dev                 # Development Telegram example

# Development scripts
npm run build                       # Build TypeScript to JavaScript
npm run dev                         # Run main index.ts in development
npm run clear-session               # Clear saved Telegram session
```

## API Reference

### TelegramClient

#### Constructor

```javascript
const client = new TelegramClient();
```

#### Methods

##### `connect()`

Connects to Telegram and authenticates the user.

```javascript
const success = await client.connect();
```

##### `disconnect()`

Disconnects from Telegram.

```javascript
await client.disconnect();
```

##### `getMe()`

Gets information about the current user.

```javascript
const userInfo = await client.getMe();
// Returns: { id, firstName, lastName, username, phone, isBot }
```

##### `getDialogs()`

Gets list of all chats (dialogs).

```javascript
const dialogs = await client.getDialogs();
// Returns array of: { id, title, isUser, isGroup, isChannel, unreadCount }
```

##### `getMessages(chatId, limit)`

Gets messages from a specific chat.

```javascript
const messages = await client.getMessages("username", 20);
// Returns array of: { id, message, date, fromId, sender, isOutgoing, media }
```

##### `sendMessage(chatId, message)`

Sends a message to a specific chat.

```javascript
const result = await client.sendMessage("username", "Hello!");
// Returns: { id, message, date, chatId, success }
```

##### `searchChats(query)`

Searches for chats and users by name.

```javascript
const results = await client.searchChats("john");
// Returns: { chats: [...], users: [...] }
```

##### `markAsRead(chatId)`

Marks all messages in a chat as read.

```javascript
await client.markAsRead("username");
```

### TelegramToNotionService

#### Constructor

```javascript
const service = new TelegramToNotionService();
```

#### Methods

##### `extractChatToNotion(chatId, options)`

Extracts messages from a specific chat and pushes them to Notion.

```javascript
const result = await service.extractChatToNotion("username", {
  messageLimit: 50,
  includeOutgoing: true,
  includeMedia: false,
  dateFilter: {
    from: new Date("2024-01-01"),
    to: new Date(),
  },
});
// Returns: { chatName, chatId, messageCount, messages }
```

##### `extractMultipleChatsToNotion(chatIds, options)`

Extracts messages from multiple chats.

```javascript
const results = await service.extractMultipleChatsToNotion(
  ["chat1", "chat2"],
  options
);
// Returns: Array of { chatName, chatId, messageCount, messages }
```

##### `extractAllChatsToNotion(options)`

Extracts messages from all available chats with filtering.

```javascript
const results = await service.extractAllChatsToNotion({
  messageLimit: 20,
  chatFilter: {
    includeUsers: true,
    includeGroups: false,
    includeChannels: false,
  },
});
```

##### `getAvailableChats()`

Gets list of all available chats for extraction.

```javascript
const chats = await service.getAvailableChats();
// Returns: Array of DialogInfo objects
```

### NotionClient

#### Constructor

```javascript
const notionClient = new NotionClient({
  token: "your_token", // Optional if in env
  pageId: "your_page_id", // Optional if in env
});
```

#### Methods

##### `addMessage(message)`

Adds a single message to the Notion page.

```javascript
await notionClient.addMessage({
  id: 123,
  content: "Hello world",
  sender: "John Doe",
  date: new Date(),
  chatName: "My Chat",
  isOutgoing: false,
});
```

##### `addMessages(messages)`

Adds multiple messages in batch.

```javascript
await notionClient.addMessages(messagesArray);
```

##### `testConnection()`

Tests the connection to Notion API.

```javascript
const isConnected = await notionClient.testConnection();
```

## Examples

### Reading Messages from All Chats

```javascript
import { TelegramClient } from "./src/TelegramClient.js";

const client = new TelegramClient();
await client.connect();

const dialogs = await client.getDialogs();

for (const dialog of dialogs.slice(0, 5)) {
  console.log(`\n=== ${dialog.title} ===`);
  const messages = await client.getMessages(dialog.id, 3);

  messages.forEach((msg) => {
    const date = new Date(msg.date * 1000).toLocaleString();
    console.log(`[${date}] ${msg.message || "[Media]"}`);
  });
}

await client.disconnect();
```

### Sending Messages to Multiple Chats

```javascript
import { TelegramClient } from "./src/TelegramClient.js";

const client = new TelegramClient();
await client.connect();

const recipients = ["user1", "user2", "group_name"];
const message = "Hello everyone!";

for (const recipient of recipients) {
  try {
    await client.sendMessage(recipient, message);
    console.log(`✅ Message sent to ${recipient}`);
  } catch (error) {
    console.log(`❌ Failed to send to ${recipient}: ${error.message}`);
  }
}

await client.disconnect();
```

### Monitoring New Messages

```javascript
import { TelegramClient } from "./src/TelegramClient.js";

const client = new TelegramClient();
await client.connect();

// Simple polling approach (check every 30 seconds)
setInterval(async () => {
  const dialogs = await client.getDialogs();

  for (const dialog of dialogs) {
    if (dialog.unreadCount > 0) {
      console.log(`💬 ${dialog.unreadCount} new messages in ${dialog.title}`);

      const messages = await client.getMessages(dialog.id, dialog.unreadCount);
      messages.forEach((msg) => {
        if (!msg.isOutgoing) {
          // Only show incoming messages
          console.log(`  📨 ${msg.message || "[Media]"}`);
        }
      });

      // Optionally mark as read
      // await client.markAsRead(dialog.id);
    }
  }
}, 30000);
```

## Error Handling

The client includes comprehensive error handling. Here are common scenarios:

```javascript
try {
  await client.sendMessage("nonexistent_user", "Hello");
} catch (error) {
  if (error.message.includes("USERNAME_NOT_OCCUPIED")) {
    console.log("User not found");
  } else if (error.message.includes("FLOOD_WAIT")) {
    console.log("Rate limited, wait before sending more messages");
  } else {
    console.log("Other error:", error.message);
  }
}
```

## Session Management

The client automatically saves your session after the first login. The session string will be printed to the console. For production use, you can:

1. Save the session string to a file
2. Use it to initialize the client without re-authentication:

```javascript
import { StringSession } from "gram-js/sessions/index.js";

const savedSession = "your_session_string_here";
const session = new StringSession(savedSession);

// Pass the session to TelegramClient constructor
// (Note: You'll need to modify the constructor to accept a session parameter)
```

## Security Notes

- 🔒 **Never share your API credentials** - Keep your `.env` file secure
- 🔑 **Protect your session string** - It's equivalent to your login credentials
- 📱 **Two-Factor Authentication** - The client supports 2FA if enabled on your account
- 🚫 **Rate Limits** - Respect Telegram's rate limits to avoid temporary bans

## Troubleshooting

### Common Issues

1. **"Invalid phone number"**

   - Make sure to include the country code (e.g., +1234567890)

2. **"API_ID_INVALID"**

   - Double-check your API ID and API Hash from my.telegram.org

3. **"PHONE_CODE_INVALID"**

   - Enter the verification code exactly as received

4. **Connection timeouts**

   - Check your internet connection
   - Try using a VPN if Telegram is restricted in your region

5. **"USER_DEACTIVATED"**
   - Your account may be limited or banned

### Debug Mode

To enable debug logging, set the environment variable:

```bash
DEBUG=gram* npm start
```

## Connection Methods & Network Compatibility

This client implements intelligent connection fallback to ensure reliable connections across different network environments.

### Connection Types

#### 1. **TCP without WSS (Default First Choice)**

- **Protocol**: Direct TCP connection to Telegram servers
- **Port**: 80 (HTTP port)
- **Security**: Encrypted via Telegram's MTProto protocol
- **Best for**: Corporate networks, restricted environments, hotel WiFi

#### 2. **TCP with WSS (WebSocket Secure)**

- **Protocol**: WebSocket Secure over TLS
- **Port**: 443 (HTTPS port)
- **Security**: Double-encrypted (TLS + MTProto)
- **Best for**: Home networks, unrestricted environments

### How Connection Fallback Works

The client automatically tries connection methods in this order:

```
1. TCP without WSS (Port 80) → Most compatible
2. TCP with WSS (Port 443)   → More secure but sometimes blocked
```

Example from logs:

```
Connecting to Telegram using TCP without WSS...
[INFO] - [Connecting to 149.154.167.91:80/TCPFull...]
✅ Connection successful!
```

### Network Environment Compatibility

| Environment                   | Recommended  | Reason                                       |
| ----------------------------- | ------------ | -------------------------------------------- |
| **🏢 Corporate Networks**     | TCP (no WSS) | WebSocket traffic often blocked by firewalls |
| **🏨 Hotel/Airport WiFi**     | TCP (no WSS) | Captive portals may interfere with WSS       |
| **🏠 Home WiFi**              | Either works | Usually no restrictions                      |
| **📱 Mobile Data**            | Either works | Carriers rarely block either method          |
| **🌍 Restricted Countries**   | TCP (no WSS) | Less likely to be filtered or detected       |
| **🔒 High-Security Networks** | TCP (no WSS) | Simpler protocol, fewer inspection points    |

### Why Both Methods Are Secure

Both connection methods provide the same level of security:

- **Application-Level Encryption**: Telegram's MTProto protocol encrypts all data end-to-end
- **Server Authentication**: Both methods verify server identity
- **Perfect Forward Secrecy**: Session keys are rotated regularly

The difference is only in the transport layer:

- **TCP without WSS**: MTProto encryption only
- **TCP with WSS**: TLS encryption + MTProto encryption (double-layered)

### Troubleshooting Connection Issues

If you experience connection problems:

1. **Clear your session and retry**:

   ```bash
   npm run clear-session
   npm run example
   ```

2. **Check the connection logs** for which method succeeded:

   ```
   Connecting to Telegram using TCP without WSS...  ← This method
   [INFO] - [Connection to 149.154.167.91:80/TCPFull complete!]  ← Success!
   ```

3. **Network-specific issues**:

   - **Corporate firewall**: TCP without WSS usually works
   - **VPN interference**: Try disconnecting VPN temporarily
   - **Proxy settings**: Ensure proxy allows TCP connections on port 80

4. **Manual connection method** (if needed):
   ```javascript
   // Force specific connection type in your code
   const client = new TelegramClient({
     // This will be implemented if needed
     connectionMethod: "tcp-no-wss", // or 'tcp-wss'
   });
   ```

### Connection Success Indicators

Look for these log messages to confirm successful connection:

```bash
✅ Success: "Connection to [IP]:80/TCPFull complete!"
✅ Success: "Successfully connected to Telegram!"
✅ Success: "Session saved to file"

❌ Failed: "WebSocket connection failed"
❌ Failed: "connection closed"
❌ Failed: "Not connected"
```

## Contributing

Feel free to submit issues and pull requests to improve this project.

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Disclaimer

This project is for educational purposes. Make sure to comply with Telegram's Terms of Service and respect user privacy when using this client.
