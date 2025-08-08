import { TelegramClient as GramJSClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { Api } from 'telegram/tl/index.js';
import { createInterface } from 'readline/promises';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import type {
  DialogInfo,
  MessageInfo,
  UserInfo,
  SendMessageResult,
  SearchResult,
  TelegramClientConfig
} from './types.js';

dotenv.config();

export class TelegramClient {
  private apiId: number;
  private apiHash: string;
  private phoneNumber: string;
  private client: GramJSClient | null = null;
  private session: StringSession;
  private envFile: string;

  constructor(config?: Partial<TelegramClientConfig>) {
    this.apiId = config?.apiId ?? parseInt(process.env.TELEGRAM_API_ID || '0');
    this.apiHash = config?.apiHash ?? (process.env.TELEGRAM_API_HASH || '');
    this.phoneNumber = config?.phoneNumber ?? (process.env.PHONE_NUMBER || '');
    this.envFile = path.join(process.cwd(), '.env');
    
    // Load existing session or create new one
    this.session = this.loadSession();

    if (!this.apiId || !this.apiHash || !this.phoneNumber) {
      throw new Error('Missing required environment variables: TELEGRAM_API_ID, TELEGRAM_API_HASH, PHONE_NUMBER');
    }
  }

  /**
   * Load session from environment variable or create a new empty session
   */
  private loadSession(): StringSession {
    try {
      const sessionString = process.env.TELEGRAM_SESSION;
      if (sessionString && sessionString.trim()) {
        console.log('Loaded existing session from environment');
        return new StringSession(sessionString);
      }
    } catch (error) {
      console.warn('Could not load session from environment:', error);
    }
    
    console.log('Creating new session');
    return new StringSession('');
  }

  /**
   * Save session to .env file
   */
  private saveSession(): void {
    try {
      const sessionString = this.session.save();
      if (sessionString) {
        this.updateEnvFile('TELEGRAM_SESSION', sessionString);
        console.log('Session saved to .env file');
      }
    } catch (error) {
      console.error('Could not save session:', error);
    }
  }

  /**
   * Update a specific environment variable in the .env file
   */
  private updateEnvFile(key: string, value: string): void {
    try {
      let envContent = '';
      
      // Read existing .env file if it exists
      if (fs.existsSync(this.envFile)) {
        envContent = fs.readFileSync(this.envFile, 'utf8');
      }

      // Split into lines
      const lines = envContent.split('\n');
      let updated = false;

      // Update existing line or add new one
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith(`${key}=`)) {
          lines[i] = `${key}=${value}`;
          updated = true;
          break;
        }
      }

      // If not found, add it
      if (!updated) {
        lines.push(`${key}=${value}`);
      }

      // Write back to file
      fs.writeFileSync(this.envFile, lines.join('\n'), 'utf8');
      
      // Update process.env for current session
      process.env[key] = value;
    } catch (error) {
      console.error(`Could not update ${key} in .env file:`, error);
    }
  }

  /**
   * Initialize and connect to Telegram
   */
  async connect(): Promise<boolean> {
    const connectionConfigs = [
      {
        name: 'TCP without WSS',
        config: {
          connectionRetries: 3,
          maxConcurrentDownloads: 1,
          retryDelay: 2000,
          timeout: 30,
          useWSS: false,
          autoReconnect: true,
        }
      },
      {
        name: 'TCP with WSS',
        config: {
          connectionRetries: 3,
          maxConcurrentDownloads: 1,
          retryDelay: 2000,
          timeout: 30,
          useWSS: true,
          autoReconnect: true,
        }
      }
    ];

    for (const { name, config } of connectionConfigs) {
      try {
        console.log(`Connecting to Telegram using ${name}...`);
        
        this.client = new GramJSClient(
          this.session,
          this.apiId,
          this.apiHash,
          config
        );

        return await this.attemptConnection();
      } catch (error) {
        console.warn(`Connection failed with ${name}:`, error);
        if (this.client) {
          try {
            await this.client.disconnect();
          } catch (disconnectError) {
            // Ignore disconnect errors
          }
        }
        // Continue to next connection method
      }
    }

    console.error('All connection methods failed');
    return false;
  }

  /**
   * Attempt to connect and authenticate
   */
  private async attemptConnection(): Promise<boolean> {
    console.log('🔌 DEBUG: Starting attemptConnection...');
    try {

      if (!this.client) {
        throw new Error('Client not initialized');
      }

      // Check if we already have a valid session
      const sessionString = this.session.save();
      console.log(`🔌 DEBUG: Session string length: ${sessionString ? sessionString.length : 0}`);
      
      if (sessionString) {
        console.log('🔌 DEBUG: Using existing session...');
        try {
          console.log('🔌 DEBUG: Calling client.connect()...');
          const connectStart = Date.now();
          
          await this.client.connect();
          
          const connectDuration = Date.now() - connectStart;
          console.log(`🔌 DEBUG: client.connect() completed in ${connectDuration}ms`);
          
          if (this.client.connected) {
            console.log('✅ DEBUG: Successfully connected with existing session!');
            return true;
          } else {
            console.warn('⚠️  DEBUG: connect() succeeded but client.connected is false');
          }
        } catch (error) {
          console.warn('⚠️  DEBUG: Existing session failed, will create new one:', error);
          // Clear the invalid session and recreate client with same config
          this.session = new StringSession('');
          throw new Error('Session invalid, need new authentication');
        }
      }

      console.log('🔌 DEBUG: Starting new authentication...');
      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      console.log('🔌 DEBUG: Calling client.start()...');
      const startTime = Date.now();
      
      await this.client.start({
        phoneNumber: async (): Promise<string> => {
          console.log(`🔌 DEBUG: Using phone number: ${this.phoneNumber}`);
          return this.phoneNumber;
        },
        password: async (): Promise<string> => {
          const answer = await rl.question('Enter your 2FA password: ');
          console.log('🔌 DEBUG: 2FA password entered');
          return answer;
        },
        phoneCode: async (): Promise<string> => {
          const answer = await rl.question('Enter the code you received: ');
          console.log('🔌 DEBUG: Phone code entered');
          return answer;
        },
        onError: (err: Error): void => {
          console.error('❌ DEBUG: Authentication error:', err);
          // If we get an auth error, clean up the session
          this.session = new StringSession('');
        },
      });
      
      const startDuration = Date.now() - startTime;
      console.log(`🔌 DEBUG: client.start() completed in ${startDuration}ms`);

      rl.close();

      // Save the session after successful authentication
      console.log('🔌 DEBUG: Saving session...');
      this.saveSession();

      console.log('✅ DEBUG: Successfully connected to Telegram!');
      console.log('✅ DEBUG: Session saved to .env file');
      
      return true;
    } catch (error) {
      console.error('❌ DEBUG: Connection attempt failed:', error);
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // If connection failed with authentication error, clean up session
      if (error instanceof Error && (
        error.message.includes('invalid new nonce hash') ||
        error.message.includes('Session invalid')
      )) {
        console.log('🧹 DEBUG: Cleaning up invalid session...');
        this.session = new StringSession('');
        this.updateEnvFile('TELEGRAM_SESSION', '');
      }
      
      throw error; // Re-throw to be caught by outer try-catch
    }
  }

  /**
   * Disconnect from Telegram
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.disconnect();
        console.log('Disconnected from Telegram');
      } catch (error) {
        console.warn('Error during disconnect:', error);
      }
    }
  }

  /**
   * Clear stored session (useful for troubleshooting auth issues)
   */
  clearSession(): void {
    this.session = new StringSession('');
    try {
      this.updateEnvFile('TELEGRAM_SESSION', '');
      console.log('Session cleared from .env file');
    } catch (error) {
      console.warn('Could not clear session from .env file:', error);
    }
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client?.connected ?? false;
  }

  /**
   * Get list of dialogs (chats)
   */
  async getDialogs(): Promise<DialogInfo[]> {
    console.log('🗨️  DEBUG: Starting getDialogs...');
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    if (!this.client.connected) {
      console.error('❌ DEBUG: Client exists but is not connected!');
      throw new Error('Client not connected');
    }

    try {
      console.log('🗨️  DEBUG: Calling client.getDialogs()...');
      const startTime = Date.now();
      
      const dialogs = await this.client.getDialogs();
      
      const duration = Date.now() - startTime;
      console.log(`🗨️  DEBUG: getDialogs completed in ${duration}ms, found ${dialogs.length} dialogs`);
      
      const result = dialogs.map((dialog): DialogInfo => ({
        id: dialog.id?.toString() || '',
        title: dialog.title || '',
        isUser: dialog.isUser || false,
        isGroup: dialog.isGroup || false,
        isChannel: dialog.isChannel || false,
        unreadCount: dialog.unreadCount || 0,
      }));
      
      console.log(`🗨️  DEBUG: Mapped ${result.length} dialogs to DialogInfo format`);
      return result;
    } catch (error) {
      console.error('❌ DEBUG: Error getting dialogs:', error);
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Get messages from a specific chat
   * @param chatId - Chat ID or username
   * @param limit - Number of messages to retrieve (default: 10)
   */
  async getMessages(chatId: string | number, limit: number = 10): Promise<MessageInfo[]> {
    console.log(`💬 DEBUG: Starting getMessages for chat ${chatId}, limit: ${limit}`);
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    if (!this.client.connected) {
      console.error('❌ DEBUG: Client exists but is not connected!');
      throw new Error('Client not connected');
    }

    try {
      console.log(`💬 DEBUG: Calling client.getMessages for chat ${chatId}...`);
      const startTime = Date.now();
      
      const messages = await this.client.getMessages(chatId, {
        limit: limit,
      });
      
      const duration = Date.now() - startTime;
      console.log(`💬 DEBUG: getMessages completed in ${duration}ms, found ${messages.length} messages`);

      const result = messages.map((msg): MessageInfo => ({
        id: msg.id,
        message: msg.message,
        date: msg.date,
        fromId: (msg.fromId as any)?.userId || (msg.fromId as any)?.channelId,
        sender: msg.sender,
        isOutgoing: msg.out || false,
        media: msg.media ? {
          type: msg.media.className,
          hasMedia: true
        } : null
      }));
      
      console.log(`💬 DEBUG: Mapped ${result.length} messages to MessageInfo format`);
      return result;
    } catch (error) {
      console.error(`❌ DEBUG: Error getting messages for chat ${chatId}:`, error);
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Send a message to a specific chat
   * @param chatId - Chat ID or username
   * @param message - Message text to send
   */
  async sendMessage(chatId: string | number, message: string): Promise<SendMessageResult> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const result = await this.client.sendMessage(chatId, {
        message: message,
      });

      console.log(`Message sent to ${chatId}: "${message}"`);
      return {
        id: result.id,
        message: message,
        date: result.date,
        chatId: chatId,
        success: true
      };
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Search for a chat by name or username
   * @param query - Search query
   */
  async searchChats(query: string): Promise<SearchResult> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const result = await this.client.invoke(
        new Api.contacts.Search({
          q: query,
          limit: 10,
        })
      );

      const chats = result.chats.map((chat): any => ({
        id: chat.id?.toString() || '',
        title: (chat as any).title || '',
        username: (chat as any).username || '',
        type: chat.className,
      }));

      const users = result.users.map((user): any => ({
        id: user.id?.toString() || '',
        firstName: (user as any).firstName || '',
        lastName: (user as any).lastName || '',
        username: (user as any).username || '',
        phone: (user as any).phone || '',
        type: 'User',
      }));

      return { chats, users };
    } catch (error) {
      console.error('Error searching chats:', error);
      throw error;
    }
  }

  /**
   * Get information about the current user
   */
  async getMe(): Promise<UserInfo> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const me = await this.client.getMe();
      return {
        id: me.id?.toString() || '',
        firstName: me.firstName || undefined,
        lastName: me.lastName || undefined,
        username: me.username || undefined,
        phone: me.phone || undefined,
        isBot: me.bot || false,
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  /**
   * Mark messages as read in a chat
   * @param chatId - Chat ID or username
   */
  async markAsRead(chatId: string | number): Promise<boolean> {
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      await this.client.markAsRead(chatId);
      console.log(`Marked messages as read in chat: ${chatId}`);
      return true;
    } catch (error) {
      console.error('Error marking as read:', error);
      throw error;
    }
  }
}
