import { TelegramClient } from './TelegramClient.js';
import { NotionClient, NotionMessage } from './NotionClient.js';
import type { MessageInfo, DialogInfo, TopicInfo } from './types.js';

export interface ExtractionOptions {
  /** Number of messages to extract per chat */
  messageLimit?: number;
  /** Whether to include outgoing messages */
  includeOutgoing?: boolean;
  /** Whether to include media messages */
  includeMedia?: boolean;
  /** Filter chats by type */
  chatFilter?: {
    includeUsers?: boolean;
    includeGroups?: boolean;
    includeChannels?: boolean;
  };
  /** Date range filter */
  dateFilter?: {
    from?: Date;
    to?: Date;
  };
  /** Topic filtering for forum groups */
  topicFilter?: {
    topicId?: number;           // Extract from specific topic
    topicIds?: number[];        // Extract from multiple topics
    includeGeneralTopic?: boolean; // Include messages not in any topic
  };
}

export interface ExtractionResult {
  chatName: string;
  chatId: string | number;
  messageCount: number;
  messages: NotionMessage[];
}

export class TelegramToNotionService {
  private telegramClient: TelegramClient;
  private notionClient: NotionClient;

  constructor() {
    this.telegramClient = new TelegramClient();
    this.notionClient = new NotionClient();
  }

  /**
   * Timeout wrapper for operations that might hang
   */
  private async withTimeout<T>(operation: Promise<T>, timeoutMs: number, operationName: string): Promise<T> {
    return Promise.race([
      operation,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }

  /**
   * Extract messages from a specific chat and push to Notion
   */
  async extractChatToNotion(
    chatId: string | number, 
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult> {
    const {
      messageLimit = 50,
      includeOutgoing = true,
      includeMedia = true,
      dateFilter
    } = options;

    console.log(`🚀 DEBUG: Starting extractChatToNotion for chat ${chatId}`);
    console.log(`🚀 DEBUG: Options:`, { messageLimit, includeOutgoing, includeMedia, dateFilter });
    const startTime = Date.now();

    try {
      // Ensure Telegram connection
      console.log('🔗 DEBUG: Checking Telegram connection...');
      if (!this.telegramClient.isConnected()) {
        console.log('🔗 DEBUG: Not connected, connecting to Telegram...');
        await this.withTimeout(
          this.telegramClient.connect(),
          30000,
          'Telegram connection'
        );
        console.log('✅ DEBUG: Telegram connection established');
      } else {
        console.log('✅ DEBUG: Already connected to Telegram');
      }

      // Test Notion connection
      console.log('🔍 DEBUG: Testing Notion connection...');
      try {
        const notionConnected = await this.withTimeout(
          this.notionClient.testConnection(),
          15000,
          'Notion connection test'
        );
        if (!notionConnected) {
          throw new Error('Failed to connect to Notion');
        }
        console.log('✅ DEBUG: Notion connection verified');
      } catch (error) {
        console.warn('⚠️  DEBUG: Notion connection test failed or timed out:', error instanceof Error ? error.message : String(error));
        console.log('🔄 DEBUG: Proceeding anyway (connection will be tested when adding messages)...');
      }

      // Get chat information
      console.log('📋 DEBUG: Getting chat information...');
      const dialogs = await this.withTimeout(
        this.telegramClient.getDialogs(),
        20000,
        'Get dialogs'
      );
      console.log(`📋 DEBUG: Retrieved ${dialogs.length} dialogs`);
      
      const chat = dialogs.find(d => d.id.toString() === chatId.toString());
      const chatName = chat?.title || `Chat ${chatId}`;
      console.log(`📋 DEBUG: Found chat: ${chatName} (ID: ${chatId})`);

      // Get messages from Telegram (with topic filtering if specified)
      console.log('📨 DEBUG: Getting messages from Telegram...');
      let telegramMessages: MessageInfo[] = [];

      if (options.topicFilter?.topicId) {
        // Extract from specific topic
        console.log(`📨 DEBUG: Extracting from topic ID: ${options.topicFilter.topicId}`);
        telegramMessages = await this.withTimeout(
          this.telegramClient.getMessages(chatId, messageLimit, { 
            topicId: options.topicFilter.topicId 
          }),
          30000,
          'Get messages from specific topic'
        );
      } else if (options.topicFilter?.topicIds && options.topicFilter.topicIds.length > 0) {
        // Extract from multiple topics
        console.log(`📨 DEBUG: Extracting from ${options.topicFilter.topicIds.length} topics`);
        for (const topicId of options.topicFilter.topicIds) {
          const topicMessages = await this.withTimeout(
            this.telegramClient.getMessages(chatId, messageLimit, { topicId }),
            30000,
            `Get messages from topic ${topicId}`
          );
          telegramMessages.push(...topicMessages);
        }
        // Sort by date descending
        telegramMessages.sort((a, b) => b.date - a.date);
        // Limit to requested number
        telegramMessages = telegramMessages.slice(0, messageLimit);
      } else {
        // Extract all messages (default behavior)
        telegramMessages = await this.withTimeout(
          this.telegramClient.getMessages(chatId, messageLimit),
          30000,
          'Get messages from Telegram'
        );
        
        // If topic filtering is specified but no specific topics, filter out topic messages
        if (options.topicFilter && !options.topicFilter.includeGeneralTopic) {
          telegramMessages = telegramMessages.filter(msg => !msg.topicId);
        }
      }
      
      console.log(`📨 DEBUG: Retrieved ${telegramMessages.length} raw messages`);

      // Filter messages based on options
      console.log('🔍 DEBUG: Filtering messages...');
      const filteredMessages = this.filterMessages(telegramMessages, {
        includeOutgoing,
        includeMedia,
        dateFilter
      });
      console.log(`🔍 DEBUG: ${filteredMessages.length} messages after filtering`);

      // Convert to Notion format
      console.log('🔄 DEBUG: Converting to Notion format...');
      const notionMessages = this.convertToNotionMessages(filteredMessages, chatName, chatId);
      console.log(`🔄 DEBUG: ${notionMessages.length} messages ready for Notion`);

      if (notionMessages.length === 0) {
        console.log('📭 DEBUG: No messages to extract after filtering');
        return {
          chatName,
          chatId,
          messageCount: 0,
          messages: []
        };
      }

      // Push messages to Notion database as individual pages
      console.log('💾 DEBUG: Adding messages to Notion database...');
      console.log(`💾 DEBUG: About to add ${notionMessages.length} messages to Notion`);
      
      await this.withTimeout(
        this.notionClient.addMessages(notionMessages),
        60000, // 1 minute timeout for adding messages
        'Add messages to Notion'
      );
      
      console.log('✅ DEBUG: Successfully added messages to Notion!');
      const totalTime = Date.now() - startTime;
      console.log(`🏁 DEBUG: Total extraction time: ${totalTime}ms`);

      console.log(`Successfully extracted ${notionMessages.length} messages from ${chatName} to Notion`);

      return {
        chatName,
        chatId,
        messageCount: notionMessages.length,
        messages: notionMessages
      };

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ DEBUG: Error in extractChatToNotion after ${totalTime}ms:`, error);
      console.error(`❌ DEBUG: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Extract messages from multiple chats and push to Notion
   */
  async extractMultipleChatsToNotion(
    chatIds: (string | number)[],
    options: ExtractionOptions = {}
  ): Promise<ExtractionResult[]> {
    console.log(`🚀 DEBUG: Starting extractMultipleChatsToNotion for ${chatIds.length} chats`);
    console.log(`🚀 DEBUG: Chat IDs:`, chatIds);
    const startTime = Date.now();
    const results: ExtractionResult[] = [];

    try {
      // Ensure Telegram connection
      console.log('🔗 DEBUG: Checking Telegram connection for multiple chats...');
      if (!this.telegramClient.isConnected()) {
        console.log('🔗 DEBUG: Not connected, connecting to Telegram...');
        await this.withTimeout(
          this.telegramClient.connect(),
          30000,
          'Telegram connection for multiple chats'
        );
        console.log('✅ DEBUG: Telegram connection established');
      } else {
        console.log('✅ DEBUG: Already connected to Telegram');
      }

      // Test Notion connection
      console.log('🔍 DEBUG: Testing Notion connection for multiple chats...');
      try {
        const notionConnected = await this.withTimeout(
          this.notionClient.testConnection(),
          15000,
          'Notion connection test for multiple chats'
        );
        if (!notionConnected) {
          throw new Error('Failed to connect to Notion');
        }
        console.log('✅ DEBUG: Notion connection verified for multiple chats');
      } catch (error) {
        console.warn('⚠️  DEBUG: Notion connection test failed or timed out:', error instanceof Error ? error.message : String(error));
        console.log('🔄 DEBUG: Proceeding anyway (connection will be tested when adding messages)...');
      }

      console.log(`🔄 DEBUG: Starting extraction from ${chatIds.length} chats...`);

      for (let i = 0; i < chatIds.length; i++) {
        const chatId = chatIds[i];
        console.log(`📨 DEBUG: Processing chat ${i + 1}/${chatIds.length}: ${chatId}`);
        
        try {
          const result = await this.extractChatToNotion(chatId, options);
          results.push(result);
          console.log(`✅ DEBUG: Completed chat ${i + 1}/${chatIds.length}: ${result.chatName} (${result.messageCount} messages)`);

          // Small delay between chats to respect rate limits
          if (i < chatIds.length - 1) {
            console.log('⏱️  DEBUG: Waiting 500ms before next chat...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`❌ DEBUG: Failed to extract chat ${chatId}:`, error);
          console.error(`❌ DEBUG: Error stack for chat ${chatId}:`, error instanceof Error ? error.stack : 'No stack trace');
          // Continue with other chats
        }
      }

      const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
      const totalTime = Date.now() - startTime;
      console.log(`🏁 DEBUG: Multiple chats extraction completed in ${totalTime}ms`);
      console.log(`📊 DEBUG: Successfully extracted ${totalMessages} messages from ${results.length}/${chatIds.length} chats`);

      return results;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ DEBUG: Error in extractMultipleChatsToNotion after ${totalTime}ms:`, error);
      console.error(`❌ DEBUG: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Extract messages from all available chats
   */
  async extractAllChatsToNotion(options: ExtractionOptions = {}): Promise<ExtractionResult[]> {
    console.log(`🚀 DEBUG: Starting extractAllChatsToNotion`);
    console.log(`🚀 DEBUG: Options:`, options);
    const startTime = Date.now();

    try {
      // Ensure Telegram connection
      console.log('🔗 DEBUG: Checking Telegram connection for all chats...');
      if (!this.telegramClient.isConnected()) {
        console.log('🔗 DEBUG: Not connected, connecting to Telegram...');
        await this.withTimeout(
          this.telegramClient.connect(),
          30000,
          'Telegram connection for all chats'
        );
        console.log('✅ DEBUG: Telegram connection established');
      } else {
        console.log('✅ DEBUG: Already connected to Telegram');
      }

      // Get all dialogs
      console.log('📋 DEBUG: Getting all dialogs...');
      const dialogs = await this.withTimeout(
        this.telegramClient.getDialogs(),
        25000,
        'Get all dialogs'
      );
      console.log(`📋 DEBUG: Retrieved ${dialogs.length} total dialogs`);
      
      // Filter dialogs based on chat filter options
      console.log('🔍 DEBUG: Filtering dialogs...');
      const filteredDialogs = this.filterDialogs(dialogs, options.chatFilter);
      console.log(`🔍 DEBUG: ${filteredDialogs.length} chats after filtering`);

      if (filteredDialogs.length === 0) {
        console.log('📭 DEBUG: No chats match the filter criteria');
        return [];
      }

      console.log(`📊 DEBUG: About to extract from ${filteredDialogs.length} chats`);
      filteredDialogs.forEach((dialog, index) => {
        console.log(`📊 DEBUG: Chat ${index + 1}: ${dialog.title} (ID: ${dialog.id})`);
      });

      // Extract each chat
      const chatIds = filteredDialogs.map(dialog => dialog.id);
      console.log('🔄 DEBUG: Starting extraction from multiple chats...');
      
      const results = await this.extractMultipleChatsToNotion(chatIds, options);
      
      const totalTime = Date.now() - startTime;
      console.log(`🏁 DEBUG: All chats extraction completed in ${totalTime}ms`);
      
      return results;

    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.error(`❌ DEBUG: Error in extractAllChatsToNotion after ${totalTime}ms:`, error);
      console.error(`❌ DEBUG: Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Filter messages based on extraction options
   */
  private filterMessages(
    messages: MessageInfo[], 
    filters: Pick<ExtractionOptions, 'includeOutgoing' | 'includeMedia' | 'dateFilter'>
  ): MessageInfo[] {
    return messages.filter(message => {
      // Filter by outgoing status
      if (!filters.includeOutgoing && message.isOutgoing) {
        return false;
      }

      // Filter by media presence
      if (!filters.includeMedia && message.media) {
        return false;
      }

      // Filter by date range
      if (filters.dateFilter) {
        const messageDate = new Date(message.date * 1000);
        
        if (filters.dateFilter.from && messageDate < filters.dateFilter.from) {
          return false;
        }
        
        if (filters.dateFilter.to && messageDate > filters.dateFilter.to) {
          return false;
        }
      }

      // Only include messages with actual content
      return message.message && message.message.trim().length > 0;
    });
  }

  /**
   * Filter dialogs based on chat filter options
   */
  private filterDialogs(
    dialogs: DialogInfo[], 
    chatFilter?: ExtractionOptions['chatFilter']
  ): DialogInfo[] {
    if (!chatFilter) {
      return dialogs;
    }

    return dialogs.filter(dialog => {
      if (dialog.isUser && !chatFilter.includeUsers) return false;
      if (dialog.isGroup && !chatFilter.includeGroups) return false;
      if (dialog.isChannel && !chatFilter.includeChannels) return false;
      return true;
    });
  }

  /**
   * Convert Telegram messages to Notion format
   */
  private convertToNotionMessages(messages: MessageInfo[], chatName: string, chatId: string | number): NotionMessage[] {
    return messages.map(message => ({
      id: message.id,
      content: message.message || '[No content]',
      sender: this.getSenderName(message),
      date: new Date(message.date * 1000),
      chatName,
      chatId,
      isOutgoing: message.isOutgoing,
      mediaType: message.media?.type,
      // Include topic information if available
      topicId: message.topicId,
      topicTitle: message.topicId ? `Topic ${message.topicId}` : undefined, // We can enhance this later
      threadId: message.threadId
    }));
  }

  /**
   * Extract sender name from message
   */
  private getSenderName(message: MessageInfo): string {
    if (message.isOutgoing) {
      return 'You';
    }

    if (message.sender) {
      const sender = message.sender;
      
      // Try to get name from sender object
      if (sender.firstName || sender.lastName) {
        return `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
      }
      
      if (sender.username) {
        return `@${sender.username}`;
      }
      
      if (sender.title) {
        return sender.title;
      }
    }

    return `User ${message.fromId || 'Unknown'}`;
  }

  /**
   * Get list of available chats for extraction
   */
  async getAvailableChats(): Promise<DialogInfo[]> {
    try {
      if (!this.telegramClient.isConnected()) {
        await this.telegramClient.connect();
      }

      return await this.telegramClient.getDialogs();
    } catch (error) {
      console.error('Error getting available chats:', error);
      throw error;
    }
  }

  /**
   * Get topics from a forum group
   */
  async getTopics(chatId: string | number): Promise<TopicInfo[]> {
    try {
      if (!this.telegramClient.isConnected()) {
        await this.telegramClient.connect();
      }

      return await this.telegramClient.getTopics(chatId);
    } catch (error) {
      console.error('Error getting topics:', error);
      throw error;
    }
  }

  /**
   * Check if a chat is a forum group
   */
  async isForumGroup(chatId: string | number): Promise<boolean> {
    try {
      if (!this.telegramClient.isConnected()) {
        await this.telegramClient.connect();
      }

      return await this.telegramClient.isForumGroup(chatId);
    } catch (error) {
      console.error('Error checking forum group status:', error);
      throw error;
    }
  }

  /**
   * Create a new messages database
   */
  async createMessagesDatabase(parentPageId: string, title?: string): Promise<string> {
    try {
      console.log('Creating new messages database...');
      const databaseId = await this.notionClient.createMessagesDatabase(parentPageId, title);
      console.log(`Created database with ID: ${databaseId}`);
      console.log('You can now use this ID as NOTION_DATABASE_ID in your .env file');
      return databaseId;
    } catch (error) {
      console.error('Error creating messages database:', error);
      throw error;
    }
  }

  /**
   * Query messages from the database
   */
  async queryMessages(options: {
    chatName?: string;
    sender?: string;
    direction?: 'Incoming' | 'Outgoing';
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<any[]> {
    try {
      return await this.notionClient.queryMessages(options);
    } catch (error) {
      console.error('Error querying messages:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    totalMessages: number;
    chatCounts: Record<string, number>;
    directionCounts: Record<string, number>;
  }> {
    try {
      return await this.notionClient.getDatabaseStats();
    } catch (error) {
      console.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Disconnect from both services
   */
  async disconnect(): Promise<void> {
    try {
      await this.telegramClient.disconnect();
      console.log('Disconnected from services');
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}
