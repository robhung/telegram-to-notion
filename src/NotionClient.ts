import { Client } from '@notionhq/client';
import dotenv from 'dotenv';

dotenv.config();

export interface NotionMessage {
  id: number;
  content: string;
  sender: string;
  date: Date;
  chatName: string;
  isOutgoing: boolean;
  mediaType?: string;
  chatId?: string | number;
}

export interface NotionClientConfig {
  token?: string;
  databaseId?: string;
}

export class NotionClient {
  private client: Client;
  private databaseId: string;

  constructor(config?: NotionClientConfig) {
    const token = config?.token ?? process.env.NOTION_TOKEN;
    this.databaseId = config?.databaseId ?? process.env.NOTION_DATABASE_ID ?? '';

    if (!token) {
      throw new Error('Missing required environment variable: NOTION_TOKEN');
    }

    if (!this.databaseId) {
      throw new Error('Missing required environment variable: NOTION_DATABASE_ID');
    }

    this.client = new Client({ auth: token });
  }

  /**
   * Add a single message as a database page
   */
  async addMessage(message: NotionMessage): Promise<string> {
    console.log(`📝 DEBUG: Adding message ${message.id} from ${message.sender}`);
    const startTime = Date.now();
    
    try {
      console.log(`📝 DEBUG: Creating properties for message ${message.id}...`);
      const pageProperties = await this.createMessageProperties(message);
      
      console.log(`📝 DEBUG: Creating page for message ${message.id}...`);
      const response = await this.client.pages.create({
        parent: {
          type: 'database_id',
          database_id: this.databaseId,
        },
        properties: pageProperties,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ DEBUG: Added message ${message.id} as database page in ${duration}ms`);
      return response.id;
    } catch (error: any) {
      // Check if error is due to missing properties
      if (error.code === 'validation_error' && error.message?.includes('is not a property that exists')) {
        console.log('🔧 DEBUG: Database missing required properties, adding them...');
        const schemaStart = Date.now();
        
        await this.ensureDatabaseSchema();
        
        const schemaDuration = Date.now() - schemaStart;
        console.log(`🔧 DEBUG: Schema update completed in ${schemaDuration}ms`);
        
        // Retry the operation
        console.log('🔄 DEBUG: Retrying message addition...');
        const retryStart = Date.now();
        
        const pageProperties = await this.createMessageProperties(message);
        const response = await this.client.pages.create({
          parent: {
            type: 'database_id',
            database_id: this.databaseId,
          },
          properties: pageProperties,
        });

        const retryDuration = Date.now() - retryStart;
        const totalDuration = Date.now() - startTime;
        console.log(`✅ DEBUG: Added message ${message.id} as database page (after schema update) in ${retryDuration}ms (total: ${totalDuration}ms)`);
        return response.id;
      }
      
      const duration = Date.now() - startTime;
      console.error(`❌ DEBUG: Error adding message ${message.id} after ${duration}ms:`, error);
      console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

  /**
   * Add multiple messages as database pages in batch
   */
  async addMessages(messages: NotionMessage[]): Promise<string[]> {
    try {
      const pageIds: string[] = [];
      let schemaUpdated = false;
      
      // Process messages in smaller batches to respect rate limits
      const batchSize = 10;
      
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        try {
          // Process batch concurrently
          const batchPromises = batch.map(message => this.addMessage(message));
          const batchResults = await Promise.all(batchPromises);
          
          pageIds.push(...batchResults);
          
          console.log(`Added ${batch.length} message pages to database (batch ${Math.floor(i / batchSize) + 1})`);
        } catch (error: any) {
          // If we get a schema error and haven't updated schema yet, try to fix it
          if (!schemaUpdated && error.code === 'validation_error' && error.message?.includes('is not a property that exists')) {
            console.log('🔧 Database missing required properties, updating schema...');
            await this.ensureDatabaseSchema();
            schemaUpdated = true;
            
            // Retry the current batch
            console.log('🔄 Retrying current batch after schema update...');
            const batchPromises = batch.map(message => this.addMessage(message));
            const batchResults = await Promise.all(batchPromises);
            
            pageIds.push(...batchResults);
            console.log(`✅ Added ${batch.length} message pages to database (after schema update)`);
          } else {
            throw error;
          }
        }
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < messages.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.log(`Successfully added ${messages.length} messages as database pages`);
      return pageIds;
    } catch (error) {
      console.error('Error adding messages to Notion database:', error);
      throw error;
    }
  }

  /**
   * Create Notion database properties for a message
   */
  private async createMessageProperties(message: NotionMessage): Promise<any> {
    // Get the existing database to determine title property name
    const database = await this.client.databases.retrieve({
      database_id: this.databaseId,
    });
    
    const titlePropertyName = this.getTitlePropertyName(database.properties);
    
    const properties: any = {
      // Use existing title property or create new one
      [titlePropertyName]: {
        title: [
          {
            text: {
              content: this.truncateText(message.content || '[No content]', 100),
            },
          },
        ],
      },
      
      // Rich text for full message content
      'Content': {
        rich_text: [
          {
            text: {
              content: message.content || '[No content]',
            },
          },
        ],
      },
      
      // Sender name
      'Sender': {
        rich_text: [
          {
            text: {
              content: message.sender,
            },
          },
        ],
      },
      
      // Chat name
      'Chat': {
        rich_text: [
          {
            text: {
              content: message.chatName,
            },
          },
        ],
      },
      
      // Message date
      'Date': {
        date: {
          start: message.date.toISOString(),
        },
      },
      
      // Direction (Incoming/Outgoing)
      'Direction': {
        select: {
          name: message.isOutgoing ? 'Outgoing' : 'Incoming',
        },
      },
      
      // Message ID
      'Message ID': {
        number: message.id,
      },
    };

    // Add optional properties
    if (message.mediaType) {
      properties['Media Type'] = {
        rich_text: [
          {
            text: {
              content: message.mediaType,
            },
          },
        ],
      };
    }

    if (message.chatId) {
      properties['Chat ID'] = {
        rich_text: [
          {
            text: {
              content: message.chatId.toString(),
            },
          },
        ],
      };
    }

    return properties;
  }

  /**
   * Truncate text to specified length
   */
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength - 3) + '...';
  }

  /**
   * Create a messages database with appropriate schema
   */
  async createMessagesDatabase(parentPageId: string, title: string = 'Telegram Messages'): Promise<string> {
    try {
      const response = await this.client.databases.create({
        parent: {
          type: 'page_id',
          page_id: parentPageId,
        },
        title: [
          {
            text: {
              content: title,
            },
          },
        ],
        properties: {
          'Message': {
            title: {},
          },
          'Content': {
            rich_text: {},
          },
          'Sender': {
            rich_text: {},
          },
          'Chat': {
            rich_text: {},
          },
          'Date': {
            date: {},
          },
          'Direction': {
            select: {
              options: [
                {
                  name: 'Incoming',
                  color: 'blue',
                },
                {
                  name: 'Outgoing',
                  color: 'green',
                },
              ],
            },
          },
          'Message ID': {
            number: {},
          },
          'Media Type': {
            rich_text: {},
          },
          'Chat ID': {
            rich_text: {},
          },
        },
      });

      console.log(`Created messages database: ${title}`);
      console.log(`Database ID: ${response.id}`);
      return response.id;
    } catch (error) {
      console.error('Error creating messages database:', error);
      throw error;
    }
  }

  /**
   * Ensure the database has all required properties for messages
   */
  async ensureDatabaseSchema(): Promise<void> {
    try {
      console.log('🔍 Checking database schema...');
      
      // Get current database properties
      const database = await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
      
      const existingProperties = database.properties || {};
      
      // Log existing properties for debugging
      console.log('📋 Existing properties in database:');
      for (const [name, config] of Object.entries(existingProperties)) {
        console.log(`  - "${name}": ${(config as any).type}` + ((config as any).type === 'title' ? ' 🏆 (TITLE PROPERTY)' : ''));
      }
      
      // Find existing title property
      const titlePropertyName = Object.keys(existingProperties).find(
        key => (existingProperties[key] as any).type === 'title'
      );
      
      if (titlePropertyName !== undefined) {
        console.log(`🏆 Will use existing title property: "${titlePropertyName || '(unnamed title property)'}"`);
      } else {
        console.log('⚠️  No title property found, will create "Message" as title');
      }
      
      const requiredProperties = this.getRequiredProperties(existingProperties);
      
      const missingProperties: any = {};
      
      // Check which properties are missing
      for (const [propName, propConfig] of Object.entries(requiredProperties)) {
        if (!existingProperties[propName]) {
          missingProperties[propName] = propConfig;
          console.log(`📋 Missing property: ${propName}`);
        } else {
          console.log(`✅ Property exists: ${propName}`);
        }
      }
      
      if (Object.keys(missingProperties).length === 0) {
        console.log('✅ Database schema is up to date');
        return;
      }
      
      console.log(`🔧 Adding ${Object.keys(missingProperties).length} missing properties...`);
      
      // Update the database with missing properties
      await this.client.databases.update({
        database_id: this.databaseId,
        properties: missingProperties,
      });
      
      console.log('✅ Database schema updated successfully');
      
    } catch (error) {
      console.error('Error updating database schema:', error);
      throw error;
    }
  }

  /**
   * Get the required properties schema for messages
   */
  private getRequiredProperties(existingProperties: any = {}): any {
    // Find if there's already a title property
    const titlePropertyName = Object.keys(existingProperties).find(
      key => existingProperties[key].type === 'title'
    );
    
    const properties: any = {
      'Content': {
        rich_text: {},
      },
      'Sender': {
        rich_text: {},
      },
      'Chat': {
        rich_text: {},
      },
      'Date': {
        date: {},
      },
      'Direction': {
        select: {
          options: [
            {
              name: 'Incoming',
              color: 'blue',
            },
            {
              name: 'Outgoing',
              color: 'green',
            },
          ],
        },
      },
      'Message ID': {
        number: {},
      },
      'Media Type': {
        rich_text: {},
      },
      'Chat ID': {
        rich_text: {},
      },
    };
    
    // Only add a title property if one doesn't exist
    if (titlePropertyName === undefined) {
      properties['Message'] = {
        title: {},
      };
    }
    
    return properties;
  }

  /**
   * Get the name of the title property (existing or new)
   */
  private getTitlePropertyName(existingProperties: any = {}): string {
    const titlePropertyName = Object.keys(existingProperties).find(
      key => existingProperties[key].type === 'title'
    );
    // Return the existing title property name, even if it's empty string
    return titlePropertyName !== undefined ? titlePropertyName : 'Message';
  }

  /**
   * Test connection to Notion API and validate database
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.databases.retrieve({
        database_id: this.databaseId,
      });

      console.log('Notion database connection successful');
      console.log('Database title:', (response as any).title?.[0]?.text?.content || 'Untitled Database');
      console.log('Database ID:', response.id);
      return true;
    } catch (error) {
      console.error('Notion database connection failed:', error);
      return false;
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
      const filter: any = {};
      
      // Build filter conditions
      const conditions: any[] = [];
      
      if (options.chatName) {
        conditions.push({
          property: 'Chat',
          rich_text: {
            contains: options.chatName,
          },
        });
      }
      
      if (options.sender) {
        conditions.push({
          property: 'Sender',
          rich_text: {
            contains: options.sender,
          },
        });
      }
      
      if (options.direction) {
        conditions.push({
          property: 'Direction',
          select: {
            equals: options.direction,
          },
        });
      }
      
      if (options.startDate) {
        conditions.push({
          property: 'Date',
          date: {
            on_or_after: options.startDate.toISOString(),
          },
        });
      }
      
      if (options.endDate) {
        conditions.push({
          property: 'Date',
          date: {
            on_or_before: options.endDate.toISOString(),
          },
        });
      }

      // Combine conditions with AND
      if (conditions.length > 1) {
        filter.and = conditions;
      } else if (conditions.length === 1) {
        Object.assign(filter, conditions[0]);
      }

      const response = await this.client.databases.query({
        database_id: this.databaseId,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        sorts: [
          {
            property: 'Date',
            direction: 'descending',
          },
        ],
        page_size: options.limit || 100,
      });

      console.log(`Found ${response.results.length} messages in database`);
      return response.results;
    } catch (error) {
      console.error('Error querying messages from database:', error);
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
      // Query all pages to get counts
      const response = await this.client.databases.query({
        database_id: this.databaseId,
        page_size: 100, // Notion max, we might need pagination for larger datasets
      });

      const chatCounts: Record<string, number> = {};
      const directionCounts: Record<string, number> = {};

      response.results.forEach((page: any) => {
        const properties = page.properties;
        
        // Count by chat
        const chatName = properties.Chat?.rich_text?.[0]?.text?.content || 'Unknown';
        chatCounts[chatName] = (chatCounts[chatName] || 0) + 1;
        
        // Count by direction
        const direction = properties.Direction?.select?.name || 'Unknown';
        directionCounts[direction] = (directionCounts[direction] || 0) + 1;
      });

      return {
        totalMessages: response.results.length,
        chatCounts,
        directionCounts,
      };
    } catch (error) {
      console.error('Error getting database statistics:', error);
      throw error;
    }
  }
}