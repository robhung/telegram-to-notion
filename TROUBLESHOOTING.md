# Troubleshooting Guide

## "Step 3 invalid new nonce hash" Error

This error typically occurs during the authentication handshake with Telegram's servers. The fixes implemented in this project address the most common causes:

### What was Fixed

1. **Session Persistence**: The client now automatically saves and loads session data from a file (`telegram_session.session`), preventing repeated authentication attempts.

2. **Session Validation**: Before attempting authentication, the client checks if an existing session is valid and tries to use it first.

3. **Error Recovery**: When the nonce hash error occurs, the client automatically cleans up invalid session data and prompts for fresh authentication.

4. **Connection Configuration**: Improved connection settings with proper retry logic and timeout handling.

### Solutions

#### Quick Fix - Clear Session

If you continue getting the error, clear your session and re-authenticate:

```bash
npm run clear-session
```

Then run your app again. You'll need to enter your phone code again, but this will create a fresh, valid session.

#### Alternative - Manual Clear

You can also manually delete the session file:

```bash
rm telegram_session.session
```

### Preventive Measures

1. **Environment Variables**: Ensure your `.env` file has valid values:

   ```
   TELEGRAM_API_ID=your_api_id
   TELEGRAM_API_HASH=your_api_hash
   PHONE_NUMBER=+1234567890
   SESSION_NAME=telegram_session
   ```

2. **Network Stability**: Ensure you have a stable internet connection during authentication.

3. **Time Synchronization**: Make sure your system clock is synchronized (important for cryptographic operations).

### New Features Added

- **Session File Management**: Sessions are automatically saved to and loaded from files
- **Connection Status Check**: Use `client.isConnected()` to check connection status
- **Session Clearing**: Use `client.clearSession()` method or the npm script to reset authentication
- **Better Error Handling**: Automatic cleanup of invalid sessions on authentication errors

### Usage Example

```typescript
const client = new TelegramClient();

// The client will automatically load an existing session if available
const connected = await client.connect();

if (connected) {
  console.log("Connected!");
  console.log("Is connected:", client.isConnected());
} else {
  console.log("Failed to connect");
  // Clear session and try again
  client.clearSession();
}
```

If you continue to experience issues, try the following in order:

1. Clear the session: `npm run clear-session`
2. Check your environment variables
3. Ensure stable internet connection
4. Verify your API credentials at https://my.telegram.org/apps
