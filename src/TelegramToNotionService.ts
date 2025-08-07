import { TelegramClient } from './TelegramClient.js';
import { NotionClient, NotionMessage } from './NotionClient.js';
import type { MessageInfo, DialogInfo } from './types.js';

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

    try {
      // Ensure Telegram connection
      if (!this.telegramClient.isConnected()) {
        console.log('Connecting to Telegram...');
        await this.telegramClient.connect();
      }

      // Test Notion connection
      console.log('🔍 Debug: Testing Notion connection...');
      try {
        const notionConnected = await Promise.race([
          this.notionClient.testConnection(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 10000))
        ]);
        if (!notionConnected) {
          throw new Error('Failed to connect to Notion');
        }
        console.log('✅ Debug: Notion connection verified');
      } catch (error) {
        console.warn('⚠️  Debug: Notion connection test failed or timed out:', error instanceof Error ? error.message : String(error));
        console.log('🔄 Debug: Proceeding anyway (connection will be tested when adding messages)...');
      }

      // Get chat information
      console.log('🔍 Debug: Getting chat information...');
      const dialogs = await this.telegramClient.getDialogs();
      const chat = dialogs.find(d => d.id.toString() === chatId.toString());
      const chatName = chat?.title || `Chat ${chatId}`;

      console.log(`🔍 Debug: Extracting messages from: ${chatName}`);

      // Get messages from Telegram
      console.log('🔍 Debug: Getting messages from Telegram...');
      const telegramMessages = await this.telegramClient.getMessages(chatId, messageLimit);
      console.log(`🔍 Debug: Retrieved ${telegramMessages.length} raw messages`);

      // Filter messages based on options
      console.log('🔍 Debug: Filtering messages...');
      const filteredMessages = this.filterMessages(telegramMessages, {
        includeOutgoing,
        includeMedia,
        dateFilter
      });
      console.log(`🔍 Debug: ${filteredMessages.length} messages after filtering`);

      // Convert to Notion format
      console.log('🔍 Debug: Converting to Notion format...');
      const notionMessages = this.convertToNotionMessages(filteredMessages, chatName, chatId);
      console.log(`🔍 Debug: ${notionMessages.length} messages ready for Notion`);

      if (notionMessages.length === 0) {
        console.log('No messages to extract after filtering');
        return {
          chatName,
          chatId,
          messageCount: 0,
          messages: []
        };
      }

      // Push messages to Notion database as individual pages
      console.log('🔍 Debug: Adding messages to Notion database...');
      await this.notionClient.addMessages(notionMessages);
      console.log('🔍 Debug: Successfully added messages to Notion!');

      console.log(`Successfully extracted ${notionMessages.length} messages from ${chatName} to Notion`);

      return {
        chatName,
        chatId,
        messageCount: notionMessages.length,
        messages: notionMessages
      };

    } catch (error) {
      console.error('Error extracting chat to Notion:', error);
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
    const results: ExtractionResult[] = [];

    try {
      // Ensure Telegram connection
      if (!this.telegramClient.isConnected()) {
        console.log('Connecting to Telegram...');
        await this.telegramClient.connect();
      }

      // Test Notion connection
      console.log('Testing Notion connection...');
      try {
        const notionConnected = await Promise.race([
          this.notionClient.testConnection(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection test timeout')), 10000))
        ]);
        if (!notionConnected) {
          throw new Error('Failed to connect to Notion');
        }
        console.log('✅ Notion connection verified');
      } catch (error) {
        console.warn('⚠️  Notion connection test failed or timed out:', error instanceof Error ? error.message : String(error));
        console.log('🔄 Proceeding anyway (connection will be tested when adding messages)...');
      }

      console.log(`Extracting messages from ${chatIds.length} chats...`);

      for (const chatId of chatIds) {
        try {
          const result = await this.extractChatToNotion(chatId, options);
          results.push(result);

          // Small delay between chats to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to extract chat ${chatId}:`, error);
          // Continue with other chats
        }
      }

      const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
      console.log(`Successfully extracted ${totalMessages} messages from ${results.length} chats`);

      return results;

    } catch (error) {
      console.error('Error extracting multiple chats:', error);
      throw error;
    }
  }

  /**
   * Extract messages from all available chats
   */
  async extractAllChatsToNotion(options: ExtractionOptions = {}): Promise<ExtractionResult[]> {
    try {
      // Ensure Telegram connection
      if (!this.telegramClient.isConnected()) {
        console.log('Connecting to Telegram...');
        await this.telegramClient.connect();
      }

      // Get all dialogs
      const dialogs = await this.telegramClient.getDialogs();
      
      // Filter dialogs based on chat filter options
      const filteredDialogs = this.filterDialogs(dialogs, options.chatFilter);

      console.log(`Found ${filteredDialogs.length} chats to extract`);

      // Extract each chat
      const chatIds = filteredDialogs.map(dialog => dialog.id);
      return await this.extractMultipleChatsToNotion(chatIds, options);

    } catch (error) {
      console.error('Error extracting all chats:', error);
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
      mediaType: message.media?.type
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
