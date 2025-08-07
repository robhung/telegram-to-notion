import { TelegramClient } from './TelegramClient.js';

export { TelegramClient };

// If this file is run directly, provide a simple CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
    async function main(): Promise<void> {
        const client = new TelegramClient();
        
        try {
            // Connect to Telegram
            const connected = await client.connect();
            if (!connected) {
                console.error('Failed to connect to Telegram');
                process.exit(1);
            }

            // Get user info
            const me = await client.getMe();
            console.log('Logged in as:', me.firstName, me.lastName, `(@${me.username})`);

            // Get dialogs
            console.log('\nFetching recent chats...');
            const dialogs = await client.getDialogs();
            console.log(`Found ${dialogs.length} chats:`);
            
            dialogs.slice(0, 5).forEach((dialog, index) => {
                console.log(`${index + 1}. ${dialog.title} (${dialog.isUser ? 'User' : dialog.isGroup ? 'Group' : 'Channel'})`);
            });

            // Example: Get messages from the first chat
            if (dialogs.length > 0) {
                const firstChat = dialogs[0];
                console.log(`\nGetting recent messages from "${firstChat.title}":`);
                
                const messages = await client.getMessages(firstChat.id, 5);
                messages.forEach((msg, index) => {
                    const date = new Date(msg.date * 1000).toLocaleString();
                    console.log(`${index + 1}. [${date}] ${msg.message || '[Media]'}`);
                });
            }

        } catch (error) {
            console.error('Error:', error);
        } finally {
            await client.disconnect();
        }
    }

    main().catch(console.error);
}
