# Telegram GramJS Client

A powerful TypeScript/Node.js client for reading and sending messages on Telegram using the GramJS library. This project provides a clean, easy-to-use interface for interacting with the Telegram API with full TypeScript support.

## Features

- 🔐 **Secure Authentication** - Uses official Telegram API with session management
- 📨 **Send Messages** - Send text messages to users, groups, and channels
- 📖 **Read Messages** - Retrieve message history from any chat
- 👥 **Chat Management** - List dialogs, search chats, and manage conversations
- 🔍 **Search Functionality** - Find chats and users by name or username
- ✅ **Mark as Read** - Mark messages as read in specific chats
- 🎯 **User Information** - Get current user details and chat information
- 📘 **TypeScript Support** - Full TypeScript support with built-in Node.js APIs

## Prerequisites

- Node.js (version 16 or higher)
- A Telegram account
- Telegram API credentials (API ID and API Hash)

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
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   PHONE_NUMBER=+1234567890
   SESSION_NAME=my_telegram_session
   ```

## Quick Start

### Basic Usage

For TypeScript:

```typescript
import { TelegramClient } from "./src/TelegramClient.js";
```

For JavaScript (using compiled files):

```javascript
import { TelegramClient } from "./dist/src/TelegramClient.js";

const client = new TelegramClient();

// Connect to Telegram
await client.connect();

// Get current user info
const me = await client.getMe();
console.log("Logged in as:", me.firstName);

// Get list of chats
const dialogs = await client.getDialogs();
console.log("Chats:", dialogs.length);

// Read messages from a chat
const messages = await client.getMessages("username", 10);
console.log("Messages:", messages);

// Send a message
await client.sendMessage("username", "Hello from GramJS!");

// Don't forget to disconnect
await client.disconnect();
```

### Run the Example

```bash
# Run the basic example (compiled JavaScript)
npm run example

# Run the basic example in development (TypeScript directly)
npm run example:dev

# Run the main script (compiled JavaScript)
npm start

# Run in development mode (TypeScript directly)
npm run dev

# Build the TypeScript project
npm run build
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
