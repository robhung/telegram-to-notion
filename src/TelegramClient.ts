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
  TelegramClientConfig,
  TopicInfo
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
   * @param options - Additional options for message retrieval
   */
  async getMessages(
    chatId: string | number, 
    limit: number = 10,
    options: {
      topicId?: number;           // Filter by specific topic ID (for forum groups)
      fromMessageId?: number;     // Start from specific message ID
      offsetId?: number;          // Alternative offset parameter
    } = {}
  ): Promise<MessageInfo[]> {
    console.log(`💬 DEBUG: Starting getMessages for chat ${chatId}, limit: ${limit}, options:`, options);
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
      
      // Prepare request parameters
      const requestParams: any = {
        limit: limit,
      };

      // Add topic filtering if specified
      if (options.topicId !== undefined) {
        console.log(`💬 DEBUG: Filtering messages for topic ID: ${options.topicId}`);
        requestParams.replyTo = options.topicId;
        // For forum groups, we need to filter by the topic's root message
        requestParams.topMsgId = options.topicId;
      }

      if (options.fromMessageId !== undefined) {
        requestParams.offsetId = options.fromMessageId;
      } else if (options.offsetId !== undefined) {
        requestParams.offsetId = options.offsetId;
      }

      const messages = await this.client.getMessages(chatId, requestParams);
      
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
        } : null,
        // Extract topic/thread information
        replyToMsgId: (msg.replyTo as any)?.replyToMsgId,
        topicId: (msg.replyTo as any)?.replyToTopId || options.topicId,
        threadId: (msg as any).groupedId
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

  /**
   * Get topics (forum threads) from a supergroup/forum
   * @param chatId - Chat ID of the forum group
   */
  async getTopics(chatId: string | number): Promise<TopicInfo[]> {
    console.log(`🔍 DEBUG: Getting topics for chat ${chatId}...`);
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    if (!this.client.connected) {
      throw new Error('Client not connected');
    }

    try {
      // Get the full chat info to check if it's a forum
      const fullChat = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: await this.client.getInputEntity(chatId)
        })
      );

      // Check if this is a forum group
      const chatInfo = fullChat.chats?.[0];
      if (!chatInfo || !(chatInfo as any).forum) {
        console.log(`ℹ️  Chat ${chatId} is not a forum group`);
        return [];
      }

      console.log(`🔍 DEBUG: Chat ${chatId} is a forum group, using comprehensive topic discovery...`);

      const topicsMap = new Map<number, TopicInfo>();
      
      // Method 1: Try to get forum topics using GetForumTopics API (if available)
      try {
        console.log(`🔍 DEBUG: Attempting to use GetForumTopics API...`);
        const forumTopics = await this.client.invoke(
          new Api.channels.GetForumTopics({
            channel: await this.client.getInputEntity(chatId),
            offsetDate: 0,
            offsetId: 0,
            offsetTopic: 0,
            limit: 100
          })
        );

        if (forumTopics.topics) {
          console.log(`🔍 DEBUG: Found ${forumTopics.topics.length} topics using GetForumTopics API`);
          for (const topic of forumTopics.topics) {
            const forumTopic = topic as any;
            if (forumTopic.id) {
              topicsMap.set(forumTopic.id, {
                id: forumTopic.id,
                title: forumTopic.title || `Topic ${forumTopic.id}`,
                messageCount: forumTopic.topMessage || 0,
                lastMessageDate: forumTopic.date ? new Date(forumTopic.date * 1000) : undefined,
                iconColor: forumTopic.iconColor,
                iconEmojiId: forumTopic.iconEmojiId
              });
            }
          }
        }
      } catch (error) {
        console.log(`ℹ️  GetForumTopics API not available or failed:`, error.message);
        console.log(`🔍 DEBUG: Falling back to message-based topic discovery...`);
      }

      // Method 2: Fallback - search through more messages to find topics
      if (topicsMap.size === 0) {
        console.log(`🔍 DEBUG: Using message-based topic discovery with extended search...`);
        
        // Search through more messages in batches
        const batchSize = 100;
        const maxBatches = 10; // Search up to 1000 recent messages
        let offsetId = 0;
        
        for (let batch = 0; batch < maxBatches; batch++) {
          console.log(`🔍 DEBUG: Searching batch ${batch + 1}/${maxBatches}...`);
          
          const messages = await this.client.getMessages(chatId, { 
            limit: batchSize,
            offsetId: offsetId
          });
          
          if (messages.length === 0) {
            console.log(`🔍 DEBUG: No more messages found, stopping search`);
            break;
          }
          
          // Update offset for next batch
          offsetId = messages[messages.length - 1].id;
          
          // Look for topic-related messages
          for (const msg of messages) {
            // Check for topic creation service messages
            if ((msg as any).action && (msg as any).action.className === 'MessageActionTopicCreate') {
              const topicId = msg.id;
              const topicTitle = (msg as any).action.title || `Topic ${topicId}`;
              
              if (!topicsMap.has(topicId)) {
                topicsMap.set(topicId, {
                  id: topicId,
                  title: topicTitle,
                  messageCount: 0,
                  lastMessageDate: new Date(msg.date * 1000),
                  iconColor: (msg as any).action.iconColor,
                  iconEmojiId: (msg as any).action.iconEmojiId
                });
                console.log(`🔍 DEBUG: Found topic ${topicId}: ${topicTitle}`);
              }
            }
            
            // Check for messages with topic IDs
            const replyTo = (msg.replyTo as any);
            const topicId = replyTo?.replyToTopId;
            
            if (topicId && !topicsMap.has(topicId)) {
              // Try to get the topic root message
              try {
                const topicRootMessage = await this.client.getMessages(chatId, {
                  ids: [topicId],
                  limit: 1
                });

                if (topicRootMessage.length > 0) {
                  const rootMsg = topicRootMessage[0];
                  let topicTitle = `Topic ${topicId}`;
                  
                  // Try to extract title from action
                  if ((rootMsg as any).action?.title) {
                    topicTitle = (rootMsg as any).action.title;
                  } else if (rootMsg.message) {
                    topicTitle = rootMsg.message.slice(0, 50) + (rootMsg.message.length > 50 ? '...' : '');
                  }

                  topicsMap.set(topicId, {
                    id: topicId,
                    title: topicTitle,
                    messageCount: 0,
                    lastMessageDate: new Date(rootMsg.date * 1000),
                    iconColor: (rootMsg as any)?.action?.iconColor,
                    iconEmojiId: (rootMsg as any)?.action?.iconEmojiId
                  });
                  console.log(`🔍 DEBUG: Found topic ${topicId}: ${topicTitle}`);
                }
              } catch (error) {
                console.warn(`⚠️  Could not get root message for topic ${topicId}:`, error.message);
              }
            }
          }
          
          // If we found some topics, we can stop early
          if (topicsMap.size > 10) {
            console.log(`🔍 DEBUG: Found ${topicsMap.size} topics, continuing to get more...`);
          }
        }
      }

      // Method 3: Try to get message counts for each topic (optional, may be slow)
      console.log(`🔍 DEBUG: Getting message counts for ${topicsMap.size} topics...`);
      let countAttempts = 0;
      const maxCountAttempts = 20; // Limit to prevent too many API calls
      
      for (const [topicId, topicInfo] of topicsMap.entries()) {
        if (countAttempts >= maxCountAttempts) {
          console.log(`🔍 DEBUG: Reached max count attempts (${maxCountAttempts}), skipping remaining counts`);
          break;
        }
        
        try {
          // Try to get a few messages from this topic to verify it exists
          const topicMessages = await this.getMessages(chatId, 5, { topicId });
          topicInfo.messageCount = topicMessages.length;
          if (topicMessages.length > 0) {
            // Update last message date if we found more recent messages
            const latestMsg = topicMessages[0];
            const msgDate = new Date(latestMsg.date * 1000);
            if (!topicInfo.lastMessageDate || msgDate > topicInfo.lastMessageDate) {
              topicInfo.lastMessageDate = msgDate;
            }
          }
          countAttempts++;
        } catch (error) {
          console.warn(`⚠️  Could not count messages for topic ${topicId}:`, error.message);
          // Keep the topic even if we can't count messages
          countAttempts++;
        }
      }

      const topics = Array.from(topicsMap.values()).sort((a, b) => {
        // Sort by last message date (most recent first)
        if (a.lastMessageDate && b.lastMessageDate) {
          return b.lastMessageDate.getTime() - a.lastMessageDate.getTime();
        }
        if (a.lastMessageDate) return -1;
        if (b.lastMessageDate) return 1;
        return b.id - a.id; // Fallback to ID sort
      });
      
      console.log(`🔍 DEBUG: Final result: Found ${topics.length} topics in forum group ${chatId}`);
      
      return topics;
    } catch (error) {
      console.error(`❌ DEBUG: Error getting topics for chat ${chatId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a chat is a forum group (has topics)
   * @param chatId - Chat ID to check
   */
  async isForumGroup(chatId: string | number): Promise<boolean> {
    console.log(`🔍 DEBUG: Checking if chat ${chatId} is a forum group...`);
    if (!this.client) {
      throw new Error('Client not connected. Call connect() first.');
    }

    try {
      const fullChat = await this.client.invoke(
        new Api.channels.GetFullChannel({
          channel: await this.client.getInputEntity(chatId)
        })
      );

      const chatInfo = fullChat.chats?.[0];
      const isForum = !!(chatInfo as any)?.forum;
      
      console.log(`🔍 DEBUG: Chat ${chatId} forum status: ${isForum}`);
      return isForum;
    } catch (error) {
      console.warn(`⚠️  Could not check forum status for chat ${chatId}:`, error);
      return false;
    }
  }
}
