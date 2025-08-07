import { TelegramClient } from '../src/TelegramClient.js';

async function basicExample(): Promise<void> {
    const client = new TelegramClient();
    
    try {
        console.log('=== Telegram Client Basic Usage Example ===\n');
        
        // Step 1: Connect to Telegram
        console.log('1. Connecting to Telegram...');
        const connected = await client.connect();
        if (!connected) {
            console.error('Failed to connect to Telegram');
            return;
        }
        
        // Step 2: Get current user info
        console.log('\n2. Getting user information...');
        const me = await client.getMe();
        console.log(`Logged in as: ${me.firstName} ${me.lastName} (@${me.username})`);
        console.log(`Phone: ${me.phone}`);
        
        // Step 3: Get list of chats
        console.log('\n3. Fetching chat list...');
        const dialogs = await client.getDialogs();
        console.log(`Found ${dialogs.length} chats\n`);
        
        // Display first 10 chats
        const displayChats = dialogs.slice(0, 10);
        displayChats.forEach((dialog, index) => {
            const type = dialog.isUser ? 'User' : 
                        dialog.isGroup ? 'Group' : 
                        dialog.isChannel ? 'Channel' : 'Unknown';
            const unread = dialog.unreadCount > 0 ? ` (${dialog.unreadCount} unread)` : '';
            console.log(`${index + 1}. ${dialog.title} [${type}]${unread}`);
        });
        
        // Step 4: Read messages from first chat
        if (dialogs.length > 0) {
            const firstChat = dialogs[0];
            console.log(`\n4. Reading messages from "${firstChat.title}"...`);
            
            const messages = await client.getMessages(firstChat.id, 5);
            console.log(`Retrieved ${messages.length} messages:\n`);
            
            messages.forEach((msg, index) => {
                const date = new Date(msg.date * 1000).toLocaleString();
                const direction = msg.isOutgoing ? '→' : '←';
                const content = msg.message || '[Media/Special message]';
                console.log(`${index + 1}. ${direction} [${date}] ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
            });
        }
        
        // Step 5: Search for chats (example)
        console.log('\n5. Searching for chats containing "test"...');
        try {
            const searchResults = await client.searchChats('test');
            console.log(`Found ${searchResults.chats.length} chats and ${searchResults.users.length} users`);
        } catch (error) {
            console.log('Search failed (this is normal if no results found)');
        }
        
        // Step 6: Example of sending a message (commented out for safety)
        /*
        console.log('\n6. Sending a test message...');
        // Uncomment and modify the line below to send a message
        // await client.sendMessage('username_or_chat_id', 'Hello from GramJS!');
        */
        
        console.log('\n=== Example completed successfully! ===');
        
    } catch (error) {
        console.error('Error in example:', error);
    } finally {
        // Always disconnect when done
        await client.disconnect();
    }
}

// Additional examples for specific use cases
async function sendMessageExample(): Promise<void> {
    const client = new TelegramClient();
    
    try {
        await client.connect();
        
        // Send message to a specific user or chat
        // Replace 'username' with actual username or chat ID
        const chatId: string | number = 'username'; // or use numeric ID
        const message = 'Hello from my GramJS bot!';
        
        const result = await client.sendMessage(chatId, message);
        console.log('Message sent:', result);
        
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        await client.disconnect();
    }
}

async function readSpecificChatExample(): Promise<void> {
    const client = new TelegramClient();
    
    try {
        await client.connect();
        
        // Read messages from a specific chat
        const chatId: string | number = 'username'; // or use numeric ID
        const messageCount = 20;
        
        const messages = await client.getMessages(chatId, messageCount);
        
        console.log(`Messages from chat ${chatId}:`);
        messages.forEach((msg, index) => {
            const date = new Date(msg.date * 1000).toISOString();
            console.log(`${index + 1}. [${date}] ${msg.message || '[Media]'}`);
        });
        
        // Mark messages as read
        await client.markAsRead(chatId);
        
    } catch (error) {
        console.error('Error reading chat:', error);
    } finally {
        await client.disconnect();
    }
}

// Export functions for use in other scripts
export { basicExample, sendMessageExample, readSpecificChatExample };

// Run basic example if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    basicExample().catch(console.error);
}
