import { TelegramClient } from './TelegramClient';
import { NotionClient } from './NotionClient';
import { TelegramToNotionService } from './TelegramToNotionService';
import { CliOptions } from './types';

// Export library classes for use as a module
export { TelegramClient, NotionClient, TelegramToNotionService };
export * from './types';

/**
 * Main application function for extracting Telegram messages and pushing them to Notion
 */
async function main(): Promise<void> {
    const service = new TelegramToNotionService();
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Received interrupt signal. Cleaning up...');
        await service.disconnect();
        console.log('👋 Cleanup complete. Exiting...');
        process.exit(0);
    });

    try {
        console.log('=== Telegram to Notion Message Extractor ===\n');
        console.log(`🚀 DEBUG: Application started at ${new Date().toISOString()}`);

        // Parse command line arguments
        const options = parseCliArgs();
        
        if (options.help) {
            showHelp();
            return;
        }

        // Get available chats first (needed for most operations)
        console.log('📡 DEBUG: Connecting to Telegram and fetching your chats...');
        const chatFetchStart = Date.now();
        
        const chats = await service.getAvailableChats();
        
        const chatFetchTime = Date.now() - chatFetchStart;
        console.log(`📡 DEBUG: Chat fetching completed in ${chatFetchTime}ms`);
        console.log(`\n✅ Found ${chats.length} chats. Here are your recent chats:\n`);
        
        // Display first 15 chats
        const displayChats = chats.slice(0, 15);
        displayChats.forEach((chat, index) => {
            const type = chat.isUser ? '👤 User' : 
                        chat.isGroup ? '👥 Group' : 
                        chat.isChannel ? '📢 Channel' : '❓ Unknown';
            const unread = chat.unreadCount > 0 ? ` (${chat.unreadCount} unread)` : '';
            console.log(`${index + 1}. ${chat.title} [${type}]${unread}`);
        });

        if (chats.length > 15) {
            console.log(`... and ${chats.length - 15} more chats`);
        }

        console.log(`\n📋 DEBUG: Running action: ${options.action}`);

        switch (options.action) {
            case 'specific':
                await extractSpecificChatCli(service, displayChats, options);
                break;
            case 'multiple':
                await extractMultipleChatsCli(service, displayChats, options);
                break;
            case 'users':
                await extractFilteredChats(service, { includeUsers: true }, options.messageLimit);
                break;
            case 'groups':
                await extractFilteredChats(service, { includeGroups: true }, options.messageLimit);
                break;
            case 'channels':
                await extractFilteredChats(service, { includeChannels: true }, options.messageLimit);
                break;
            case 'all':
                await extractAllChats(service, options.messageLimit);
                break;
            case 'create-db':
                await createDatabaseCli(service, options);
                break;
            case 'stats':
                await showDatabaseStats(service);
                break;
            case 'list-topics':
                await listTopicsCli(service, displayChats, options);
                break;
            case 'topic':
                await extractTopicCli(service, displayChats, options);
                break;
            case 'list':
                // Just list chats (already done above)
                break;
            default:
                console.log('❌ Invalid action. Use --help to see available options.');
                showHelp();
                return;
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await service.disconnect();
        
        // Force exit after a short delay to ensure cleanup completes
        setTimeout(() => {
            console.log('👋 Exiting...');
            process.exit(0);
        }, 1000);
    }
}

/**
 * Parse command line arguments
 */
function parseCliArgs(): CliOptions {
    const args = process.argv.slice(2);
    const options: CliOptions = {
        action: 'list',
        messageLimit: 50,
        includeOutgoing: true,
        includeMedia: true
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        
        switch (arg) {
            case '--help':
            case '-h':
                options.help = true;
                break;
            case '--action':
            case '-a':
                options.action = args[++i];
                break;
            case '--chat':
            case '-c':
                options.chatIndex = parseInt(args[++i]);
                break;
            case '--chats':
                options.chatIndices = args[++i].split(',').map(n => parseInt(n.trim()));
                break;
            case '--limit':
            case '-l':
                options.messageLimit = parseInt(args[++i]);
                break;
            case '--no-outgoing':
                options.includeOutgoing = false;
                break;
            case '--no-media':
                options.includeMedia = false;
                break;
            case '--parent-page':
            case '-p':
                options.parentPageId = args[++i];
                break;
            case '--db-title':
            case '-t':
                options.databaseTitle = args[++i];
                break;
            case '--topic':
                options.topicId = parseInt(args[++i]);
                break;
            case '--topics':
                options.topicIds = args[++i].split(',').map(n => parseInt(n.trim()));
                break;
            case '--list-topics':
                options.listTopics = true;
                break;
        }
    }

    return options;
}

/**
 * Show help message
 */
function showHelp(): void {
    console.log(`
Usage: npm run dev -- [options]

Actions:
  --action list         List available chats (default)
  --action specific     Extract from a specific chat (use with --chat)
  --action multiple     Extract from multiple chats (use with --chats)
  --action users        Extract from all user chats
  --action groups       Extract from all group chats
  --action channels     Extract from all channels
  --action all          Extract from all chats
  --action create-db    Create a new messages database (use with --parent-page)
  --action stats        Show database statistics
  --action list-topics  List topics in a forum group (use with --chat)
  --action topic        Extract from specific topic(s) (use with --chat and --topic/--topics)

Options:
  --chat, -c <number>           Chat number (1-based index from list)
  --chats <numbers>             Comma-separated chat numbers (e.g. 1,3,5)
  --limit, -l <number>          Message limit per chat (default: 50)
  --no-outgoing                 Exclude your own messages
  --no-media                    Exclude media messages
  --parent-page, -p <id>        Parent page ID for creating database
  --db-title, -t <title>        Database title (default: "Telegram Messages")
  --topic <number>              Extract from specific topic ID
  --topics <numbers>            Comma-separated topic IDs (e.g. 1,2,3)
  --list-topics                 List available topics in forum group
  --help, -h                    Show this help message

Examples:
  # List all chats
  npm run dev

  # Extract 100 messages from chat #1
  npm run dev -- --action specific --chat 1 --limit 100

  # Extract from multiple chats
  npm run dev -- --action multiple --chats 1,2,3 --limit 20

  # Extract from all user chats
  npm run dev -- --action users --limit 30

  # Create a new database
  npm run dev -- --action create-db --parent-page <page-id> --db-title "My Messages"

  # Show database stats
  npm run dev -- --action stats

  # List topics in a forum group
  npm run dev -- --action list-topics --chat 1

  # Extract from specific topic
  npm run dev -- --action topic --chat 1 --topic 123 --limit 50

  # Extract from multiple topics
  npm run dev -- --action topic --chat 1 --topics 123,456,789 --limit 30
`);
}

/**
 * Extract messages from a specific chat using CLI arguments
 */
async function extractSpecificChatCli(
    service: TelegramToNotionService, 
    chats: any[],
    options: CliOptions
): Promise<void> {
    try {
        if (!options.chatIndex) {
            console.log('❌ DEBUG: No chat index provided. Use --chat option.');
            return;
        }

        console.log(`📋 DEBUG: Using chat index: ${options.chatIndex}`);
        
        const selectedChat = chats[options.chatIndex - 1];
        
        if (!selectedChat) {
            console.log(`❌ DEBUG: Invalid chat number. Must be between 1 and ${chats.length}`);
            return;
        }

        console.log(`📋 DEBUG: Selected chat: ${selectedChat.title} (ID: ${selectedChat.id})`);
        
        const limit = options.messageLimit || 50;
        const includeOutgoing = options.includeOutgoing !== false;
        const includeMedia = options.includeMedia !== false;

        console.log(`\n🔄 DEBUG: About to start extraction of ${limit} messages from "${selectedChat.title}"...`);
        console.log(`🔄 DEBUG: Extraction options:`, {
            messageLimit: limit,
            includeOutgoing,
            includeMedia
        });

        const extractionStartTime = Date.now();
        console.log(`⏰ DEBUG: Extraction started at ${new Date().toISOString()}`);

        // Build extraction options with topic filtering if specified
        const extractionOptions: any = {
            messageLimit: limit,
            includeOutgoing,
            includeMedia
        };

        // Add topic filtering if specified
        if (options.topicId || options.topicIds) {
            extractionOptions.topicFilter = {};
            if (options.topicId) {
                extractionOptions.topicFilter.topicId = options.topicId;
            }
            if (options.topicIds) {
                extractionOptions.topicFilter.topicIds = options.topicIds;
            }
        }

        const result = await service.extractChatToNotion(selectedChat.id, extractionOptions);

        const extractionTime = Date.now() - extractionStartTime;
        console.log(`⏰ DEBUG: Extraction completed in ${extractionTime}ms`);
        console.log(`\n✅ Successfully extracted ${result.messageCount} messages from "${result.chatName}"`);
    } catch (error) {
        console.error('❌ DEBUG: Error in extractSpecificChatCli:', error);
        console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
    }
}

/**
 * Extract messages from multiple specific chats using CLI arguments
 */
async function extractMultipleChatsCli(
    service: TelegramToNotionService, 
    chats: any[],
    options: CliOptions
): Promise<void> {
    if (!options.chatIndices || options.chatIndices.length === 0) {
        console.log('❌ DEBUG: No chat indices provided. Use --chats option.');
        return;
    }

    console.log(`📋 DEBUG: Using chat indices: ${options.chatIndices.join(', ')}`);
    
    const selectedChats = options.chatIndices
        .filter((i: number) => i >= 1 && i <= chats.length)
        .map((i: number) => chats[i - 1]);

    if (selectedChats.length === 0) {
        console.log('❌ DEBUG: No valid chats selected');
        return;
    }

    const limit = options.messageLimit || 50;

    console.log(`\n🔄 DEBUG: Extracting ${limit} messages from ${selectedChats.length} chats...`);
    selectedChats.forEach((chat, index) => {
        console.log(`  ${index + 1}. ${chat.title}`);
    });

    const extractionStartTime = Date.now();
    console.log(`⏰ DEBUG: Multiple chat extraction started at ${new Date().toISOString()}`);

    const chatIds = selectedChats.map((chat: any) => chat.id);
    const results = await service.extractMultipleChatsToNotion(chatIds, {
        messageLimit: limit,
        includeOutgoing: options.includeOutgoing,
        includeMedia: options.includeMedia
    });

    const extractionTime = Date.now() - extractionStartTime;
    console.log(`⏰ DEBUG: Multiple chat extraction completed in ${extractionTime}ms`);
    
    const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
    console.log(`\n✅ Successfully extracted ${totalMessages} messages from ${results.length} chats`);
    
    results.forEach(result => {
        console.log(`  - ${result.chatName}: ${result.messageCount} messages`);
    });
}

/**
 * Extract messages from filtered chats
 */
async function extractFilteredChats(
    service: TelegramToNotionService, 
    filter: { includeUsers?: boolean; includeGroups?: boolean; includeChannels?: boolean },
    messageLimit?: number
): Promise<void> {
    const chatType = filter.includeUsers ? 'user chats' :
                    filter.includeGroups ? 'group chats' :
                    filter.includeChannels ? 'channels' : 'chats';

    const limit = messageLimit || 50;
    console.log(`\n🔄 DEBUG: Extracting messages from all ${chatType} (limit: ${limit})...`);

    const extractionStartTime = Date.now();
    console.log(`⏰ DEBUG: Filtered extraction started at ${new Date().toISOString()}`);

    const results = await service.extractAllChatsToNotion({
        messageLimit: limit,
        chatFilter: filter
    });

    const extractionTime = Date.now() - extractionStartTime;
    console.log(`⏰ DEBUG: Filtered extraction completed in ${extractionTime}ms`);

    const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
    console.log(`\n✅ Successfully extracted ${totalMessages} messages from ${results.length} ${chatType}`);
    
    if (results.length > 0) {
        console.log(`📊 DEBUG: Breakdown by chat:`);
        results.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.chatName}: ${result.messageCount} messages`);
        });
    }
}

/**
 * Extract messages from all chats
 */
async function extractAllChats(service: TelegramToNotionService, messageLimit?: number): Promise<void> {
    try {
        const limit = messageLimit || 50;
        console.log(`\n🔄 DEBUG: Starting extraction from all chats (limit: ${limit})...`);
        console.log('⚠️  DEBUG: This might take a while depending on how many chats you have');
        console.log('📋 DEBUG: About to call extractAllChatsToNotion');

        const extractionStartTime = Date.now();
        console.log(`⏰ DEBUG: All chats extraction started at ${new Date().toISOString()}`);

        const results = await service.extractAllChatsToNotion({
            messageLimit: limit
        });

        const extractionTime = Date.now() - extractionStartTime;
        console.log(`⏰ DEBUG: All chats extraction completed in ${extractionTime}ms`);
        console.log('✅ DEBUG: extractAllChatsToNotion completed successfully');
        
        const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
        console.log(`\n🎉 Successfully extracted ${totalMessages} messages from ${results.length} chats`);
        
        // Show breakdown
        if (results.length > 0) {
            console.log(`📊 DEBUG: Extraction breakdown:`);
            results.forEach((result, index) => {
                console.log(`  ${index + 1}. ${result.chatName}: ${result.messageCount} messages`);
            });
        }
    } catch (error) {
        console.error('❌ DEBUG: Error in extractAllChats:', error);
        console.error('❌ DEBUG: Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
    }
}

/**
 * Create a new messages database using CLI arguments
 */
async function createDatabaseCli(service: TelegramToNotionService, options: CliOptions): Promise<void> {
    if (!options.parentPageId) {
        console.log('❌ DEBUG: No parent page ID provided. Use --parent-page option.');
        return;
    }

    const title = options.databaseTitle || 'Telegram Messages';
    
    console.log(`\n🔄 DEBUG: Creating messages database "${title}" in page ${options.parentPageId}...`);
    
    try {
        const databaseId = await service.createMessagesDatabase(
            options.parentPageId.trim(),
            title.trim()
        );
        
        console.log(`\n✅ Database created successfully!`);
        console.log(`📋 Database ID: ${databaseId}`);
        console.log(`💡 Add this to your .env file as NOTION_DATABASE_ID=${databaseId}`);
    } catch (error) {
        console.error(`❌ Failed to create database:`, error);
    }
}

/**
 * Show database statistics
 */
async function showDatabaseStats(service: TelegramToNotionService): Promise<void> {
    console.log('\n📊 Getting database statistics...');
    
    try {
        const stats = await service.getDatabaseStats();
        
        console.log(`\n📈 Database Statistics:`);
        console.log(`Total messages: ${stats.totalMessages}`);
        
        if (Object.keys(stats.chatCounts).length > 0) {
            console.log(`\n💬 Messages by chat:`);
            Object.entries(stats.chatCounts)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .forEach(([chat, count]) => {
                    console.log(`  ${chat}: ${count} messages`);
                });
            
            if (Object.keys(stats.chatCounts).length > 10) {
                console.log(`  ... and ${Object.keys(stats.chatCounts).length - 10} more chats`);
            }
        }
        
        if (Object.keys(stats.directionCounts).length > 0) {
            console.log(`\n📤📥 Messages by direction:`);
            Object.entries(stats.directionCounts).forEach(([direction, count]) => {
                const icon = direction === 'Incoming' ? '📥' : direction === 'Outgoing' ? '📤' : '❓';
                console.log(`  ${icon} ${direction}: ${count} messages`);
            });
        }
        
    } catch (error) {
        console.error(`❌ Failed to get database statistics:`, error);
    }
}

/**
 * List topics in a forum group
 */
async function listTopicsCli(
    service: TelegramToNotionService, 
    chats: any[],
    options: CliOptions
): Promise<void> {
    try {
        if (!options.chatIndex) {
            console.log('❌ DEBUG: No chat index provided. Use --chat option.');
            return;
        }

        const selectedChat = chats[options.chatIndex - 1];
        
        if (!selectedChat) {
            console.log(`❌ DEBUG: Invalid chat number. Must be between 1 and ${chats.length}`);
            return;
        }

        console.log(`🔍 Checking if "${selectedChat.title}" is a forum group...`);
        
        const isForum = await service.isForumGroup(selectedChat.id);
        
        if (!isForum) {
            console.log(`ℹ️  "${selectedChat.title}" is not a forum group. Regular groups don't have topics.`);
            return;
        }

        console.log(`📋 Getting topics from "${selectedChat.title}"...`);
        
        const topics = await service.getTopics(selectedChat.id);
        
        if (topics.length === 0) {
            console.log(`📭 No topics found in "${selectedChat.title}"`);
            return;
        }

        console.log(`\n🗂️  Found ${topics.length} topics in "${selectedChat.title}":\n`);
        
        topics.forEach((topic, index) => {
            const lastMessage = topic.lastMessageDate ? 
                ` (last: ${topic.lastMessageDate.toLocaleDateString()})` : '';
            console.log(`${index + 1}. Topic ${topic.id}: ${topic.title}${lastMessage}`);
        });

        console.log(`\n💡 To extract from a specific topic, use:`);
        console.log(`   npm run dev -- --action topic --chat ${options.chatIndex} --topic <topic-id>`);
        
    } catch (error) {
        console.error('❌ DEBUG: Error in listTopicsCli:', error);
        throw error;
    }
}

/**
 * Extract messages from specific topics
 */
async function extractTopicCli(
    service: TelegramToNotionService, 
    chats: any[],
    options: CliOptions
): Promise<void> {
    try {
        if (!options.chatIndex) {
            console.log('❌ DEBUG: No chat index provided. Use --chat option.');
            return;
        }

        if (!options.topicId && !options.topicIds) {
            console.log('❌ DEBUG: No topic ID(s) provided. Use --topic or --topics option.');
            return;
        }

        const selectedChat = chats[options.chatIndex - 1];
        
        if (!selectedChat) {
            console.log(`❌ DEBUG: Invalid chat number. Must be between 1 and ${chats.length}`);
            return;
        }

        console.log(`🔍 Checking if "${selectedChat.title}" is a forum group...`);
        
        const isForum = await service.isForumGroup(selectedChat.id);
        
        if (!isForum) {
            console.log(`❌ "${selectedChat.title}" is not a forum group. Use --action specific instead.`);
            return;
        }

        const limit = options.messageLimit || 50;
        const includeOutgoing = options.includeOutgoing !== false;
        const includeMedia = options.includeMedia !== false;

        const extractionOptions: any = {
            messageLimit: limit,
            includeOutgoing,
            includeMedia,
            topicFilter: {}
        };

        if (options.topicId) {
            extractionOptions.topicFilter.topicId = options.topicId;
            console.log(`🔄 Extracting ${limit} messages from topic ${options.topicId} in "${selectedChat.title}"...`);
        } else if (options.topicIds) {
            extractionOptions.topicFilter.topicIds = options.topicIds;
            console.log(`🔄 Extracting ${limit} messages from ${options.topicIds.length} topics in "${selectedChat.title}"...`);
        }

        const extractionStartTime = Date.now();
        
        const result = await service.extractChatToNotion(selectedChat.id, extractionOptions);

        const extractionTime = Date.now() - extractionStartTime;
        console.log(`⏰ DEBUG: Topic extraction completed in ${extractionTime}ms`);
        
        const topicDesc = options.topicId ? `topic ${options.topicId}` : 
                         `${options.topicIds!.length} topics`;
        console.log(`\n✅ Successfully extracted ${result.messageCount} messages from ${topicDesc} in "${result.chatName}"`);
        
    } catch (error) {
        console.error('❌ DEBUG: Error in extractTopicCli:', error);
        throw error;
    }
}

// Export main function for programmatic use
export { main };

// Run main application if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}
