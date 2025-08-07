import { TelegramToNotionService } from '../src/TelegramToNotionService.js';
import { createInterface } from 'readline/promises';

/**
 * Interactive example demonstrating how to extract Telegram messages and push them to Notion
 */
async function interactiveExample(): Promise<void> {
    const service = new TelegramToNotionService();
    const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Received interrupt signal. Cleaning up...');
        rl.close();
        await service.disconnect();
        console.log('👋 Cleanup complete. Exiting...');
        process.exit(0);
    });

    try {
        console.log('=== Telegram to Notion Message Extractor ===\n');

        // Get available chats
        console.log('📡 Connecting to Telegram and fetching your chats...');
        const chats = await service.getAvailableChats();
        
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

        // Get user choice
        console.log('\nChoose an option:');
        console.log('1. Extract from a specific chat');
        console.log('2. Extract from multiple specific chats');
        console.log('3. Extract from all user chats');
        console.log('4. Extract from all group chats');
        console.log('5. Extract from all channels');
        console.log('6. Extract from all chats');
        console.log('7. Create a new messages database');
        console.log('8. Query existing messages from database');
        console.log('9. Show database statistics');

        const choice = await rl.question('\nEnter your choice (1-9): ');

        switch (choice) {
            case '1':
                await extractSpecificChat(service, rl, displayChats);
                break;
            case '2':
                await extractMultipleChats(service, rl, displayChats);
                break;
            case '3':
                await extractFilteredChats(service, { includeUsers: true });
                break;
            case '4':
                await extractFilteredChats(service, { includeGroups: true });
                break;
            case '5':
                await extractFilteredChats(service, { includeChannels: true });
                break;
            case '6':
                await extractAllChats(service);
                break;
            case '7':
                await createDatabase(service, rl);
                break;
            case '8':
                await queryMessages(service, rl);
                break;
            case '9':
                await showDatabaseStats(service);
                break;
            default:
                console.log('Invalid choice. Exiting...');
                return;
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        rl.close();
        await service.disconnect();
        
        // Force exit after a short delay to ensure cleanup completes
        setTimeout(() => {
            console.log('👋 Exiting...');
            process.exit(0);
        }, 1000);
    }
}

/**
 * Extract messages from a specific chat
 */
async function extractSpecificChat(
    service: TelegramToNotionService, 
    rl: any, 
    chats: any[]
): Promise<void> {
    try {
        console.log(`\n📋 Debug: About to ask for chat number (1-${chats.length})`);
        const chatIndex = await rl.question(`\nEnter chat number (1-${chats.length}): `);
        console.log(`📋 Debug: Got chat index: "${chatIndex}"`);
        
        const selectedChat = chats[parseInt(chatIndex) - 1];
        
        if (!selectedChat) {
            console.log('Invalid chat number');
            return;
        }

        console.log(`📋 Debug: Selected chat: ${selectedChat.title}`);
        
        const messageLimit = await rl.question('How many messages to extract? (default: 50): ');
        console.log(`📋 Debug: Got message limit: "${messageLimit}"`);
        const limit = parseInt(messageLimit) || 50;

        const includeOutgoing = await rl.question('Include your own messages? (y/n, default: y): ');
        console.log(`📋 Debug: Got includeOutgoing: "${includeOutgoing}"`);
        
        const includeMedia = await rl.question('Include media messages? (y/n, default: y): ');
        console.log(`📋 Debug: Got includeMedia: "${includeMedia}"`);

        console.log(`\n🔄 Extracting ${limit} messages from "${selectedChat.title}"...`);

        const result = await service.extractChatToNotion(selectedChat.id, {
            messageLimit: limit,
            includeOutgoing: includeOutgoing.toLowerCase() !== 'n',
            includeMedia: includeMedia.toLowerCase() !== 'n'
        });

        console.log(`\n✅ Successfully extracted ${result.messageCount} messages from "${result.chatName}"`);
    } catch (error) {
        console.error('❌ Error in extractSpecificChat:', error);
        throw error;
    }
}

/**
 * Extract messages from multiple specific chats
 */
async function extractMultipleChats(
    service: TelegramToNotionService, 
    rl: any, 
    chats: any[]
): Promise<void> {
    const chatNumbers = await rl.question(`\nEnter chat numbers separated by commas (1-${chats.length}): `);
    const indices = chatNumbers.split(',').map((n: string) => parseInt(n.trim()) - 1);
    const selectedChats = indices
        .filter((i: number) => i >= 0 && i < chats.length)
        .map((i: number) => chats[i]);

    if (selectedChats.length === 0) {
        console.log('No valid chats selected');
        return;
    }

    const messageLimit = await rl.question('How many messages per chat? (default: 50): ');
    const limit = parseInt(messageLimit) || 50;

    console.log(`\n🔄 Extracting ${limit} messages from ${selectedChats.length} chats...`);

    const chatIds = selectedChats.map((chat: any) => chat.id);
    const results = await service.extractMultipleChatsToNotion(chatIds, {
        messageLimit: limit
    });

    const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
    console.log(`\n✅ Successfully extracted ${totalMessages} messages from ${results.length} chats`);
}

/**
 * Extract messages from filtered chats
 */
async function extractFilteredChats(
    service: TelegramToNotionService, 
    filter: { includeUsers?: boolean; includeGroups?: boolean; includeChannels?: boolean }
): Promise<void> {
    const chatType = filter.includeUsers ? 'user chats' :
                    filter.includeGroups ? 'group chats' :
                    filter.includeChannels ? 'channels' : 'chats';

    console.log(`\n🔄 Extracting messages from all ${chatType}...`);

    const results = await service.extractAllChatsToNotion({
        messageLimit: 50,
        chatFilter: filter
    });

    const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
    console.log(`\n✅ Successfully extracted ${totalMessages} messages from ${results.length} ${chatType}`);
}

/**
 * Extract messages from all chats
 */
async function extractAllChats(service: TelegramToNotionService): Promise<void> {
    try {
        console.log('\n🔄 Extracting messages from all chats...');
        console.log('⚠️  This might take a while depending on how many chats you have');
        console.log('📋 Debug: About to call extractAllChatsToNotion');

        const results = await service.extractAllChatsToNotion({
            messageLimit: 50
        });

        console.log('📋 Debug: extractAllChatsToNotion completed');
        const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
        console.log(`\n✅ Successfully extracted ${totalMessages} messages from ${results.length} chats`);
    } catch (error) {
        console.error('❌ Error in extractAllChats:', error);
        throw error;
    }
}

/**
 * Simple example for programmatic use
 */
async function simpleExample(): Promise<void> {
    const service = new TelegramToNotionService();

    try {
        console.log('=== Simple Telegram to Notion Example ===\n');

        // Extract messages from a specific chat (replace with actual chat ID or username)
        const chatId = 'username_or_chat_id'; // Replace this with actual chat ID
        
        console.log(`Extracting messages from chat: ${chatId}`);
        
        const result = await service.extractChatToNotion(chatId, {
            messageLimit: 20,
            includeOutgoing: true,
            includeMedia: false
        });

        console.log(`✅ Extracted ${result.messageCount} messages from "${result.chatName}"`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await service.disconnect();
        
        // Force exit after cleanup
        setTimeout(() => {
            process.exit(0);
        }, 500);
    }
}

/**
 * Batch extraction example
 */
async function batchExample(): Promise<void> {
    const service = new TelegramToNotionService();

    try {
        console.log('=== Batch Extraction Example ===\n');

        // Extract messages from multiple chats at once
        const chatIds = [
            'chat1_username', 
            'chat2_username', 
            // Add more chat IDs or usernames
        ];

        console.log(`Extracting messages from ${chatIds.length} chats...`);

        const results = await service.extractMultipleChatsToNotion(chatIds, {
            messageLimit: 30,
            includeOutgoing: true,
            includeMedia: true,
            // Optional: filter by date range
            dateFilter: {
                from: new Date('2024-01-01'),
                to: new Date()
            }
        });

        const totalMessages = results.reduce((sum, result) => sum + result.messageCount, 0);
        console.log(`✅ Extracted ${totalMessages} messages from ${results.length} chats`);

        results.forEach(result => {
            console.log(`  - ${result.chatName}: ${result.messageCount} messages`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await service.disconnect();
        
        // Force exit after cleanup
        setTimeout(() => {
            process.exit(0);
        }, 500);
    }
}

/**
 * Create a new messages database
 */
async function createDatabase(service: TelegramToNotionService, rl: any): Promise<void> {
    const parentPageId = await rl.question('\nEnter the parent page ID where the database should be created: ');
    const title = await rl.question('Enter a title for the database (default: "Telegram Messages"): ');
    
    console.log('\n🔄 Creating messages database...');
    
    try {
        const databaseId = await service.createMessagesDatabase(
            parentPageId.trim(),
            title.trim() || 'Telegram Messages'
        );
        
        console.log(`\n✅ Database created successfully!`);
        console.log(`📋 Database ID: ${databaseId}`);
        console.log(`💡 Add this to your .env file as NOTION_DATABASE_ID=${databaseId}`);
    } catch (error) {
        console.error(`❌ Failed to create database:`, error);
    }
}

/**
 * Query messages from the database
 */
async function queryMessages(service: TelegramToNotionService, rl: any): Promise<void> {
    console.log('\n🔍 Query messages from database');
    console.log('Leave fields empty to skip filtering by that criteria\n');
    
    const chatName = await rl.question('Filter by chat name (partial match): ');
    const sender = await rl.question('Filter by sender name (partial match): ');
    const direction = await rl.question('Filter by direction (Incoming/Outgoing): ');
    const startDate = await rl.question('Filter by start date (YYYY-MM-DD): ');
    const endDate = await rl.question('Filter by end date (YYYY-MM-DD): ');
    const limit = await rl.question('Maximum results (default: 20): ');
    
    const queryOptions: any = {};
    
    if (chatName.trim()) queryOptions.chatName = chatName.trim();
    if (sender.trim()) queryOptions.sender = sender.trim();
    if (direction.trim() && (direction.trim() === 'Incoming' || direction.trim() === 'Outgoing')) {
        queryOptions.direction = direction.trim();
    }
    if (startDate.trim()) {
        try {
            queryOptions.startDate = new Date(startDate.trim());
        } catch (e) {
            console.log('⚠️  Invalid start date format, skipping...');
        }
    }
    if (endDate.trim()) {
        try {
            queryOptions.endDate = new Date(endDate.trim());
        } catch (e) {
            console.log('⚠️  Invalid end date format, skipping...');
        }
    }
    if (limit.trim()) {
        const limitNum = parseInt(limit.trim());
        if (limitNum > 0) queryOptions.limit = limitNum;
    }
    
    if (!queryOptions.limit) queryOptions.limit = 20;
    
    console.log('\n🔄 Querying messages...');
    
    try {
        const messages = await service.queryMessages(queryOptions);
        
        if (messages.length === 0) {
            console.log('📭 No messages found matching your criteria');
            return;
        }
        
        console.log(`\n📨 Found ${messages.length} messages:\n`);
        
        messages.forEach((page: any, index: number) => {
            const properties = page.properties;
            const content = properties.Content?.rich_text?.[0]?.text?.content || '[No content]';
            const sender = properties.Sender?.rich_text?.[0]?.text?.content || 'Unknown';
            const chat = properties.Chat?.rich_text?.[0]?.text?.content || 'Unknown';
            const date = properties.Date?.date?.start || 'Unknown date';
            const direction = properties.Direction?.select?.name || 'Unknown';
            
            const directionIcon = direction === 'Incoming' ? '→' : '←';
            const truncatedContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
            
            console.log(`${index + 1}. ${directionIcon} [${new Date(date).toLocaleString()}] ${sender} in ${chat}`);
            console.log(`   "${truncatedContent}"`);
            console.log('');
        });
        
    } catch (error) {
        console.error(`❌ Failed to query messages:`, error);
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

// Export functions for use in other scripts
export { interactiveExample, simpleExample, batchExample };

// Run interactive example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    // Check if user wants to run a specific example
    const exampleType = process.argv[2];
    
    switch (exampleType) {
        case 'simple':
            simpleExample().catch(console.error);
            break;
        case 'batch':
            batchExample().catch(console.error);
            break;
        default:
            interactiveExample().catch(console.error);
    }
}
