export interface CliOptions {
    action: string;
    chatIndex?: number;
    chatIndices?: number[];
    messageLimit?: number;
    includeOutgoing?: boolean;
    includeMedia?: boolean;
    parentPageId?: string;
    databaseTitle?: string;
    help?: boolean;
    // Topic-related options
    topicId?: number;
    topicIds?: number[];
    listTopics?: boolean;
}

export interface TopicInfo {
  id: number;
  title: string;
  messageCount: number;
  lastMessageDate?: Date;
  iconColor?: number;
  iconEmojiId?: string;
}
export interface DialogInfo {
  id: string | number;
  title: string;
  isUser: boolean;
  isGroup: boolean;
  isChannel: boolean;
  unreadCount: number;
}

export interface MessageInfo {
  id: number;
  message?: string;
  date: number;
  fromId?: string | number;
  sender?: any;
  isOutgoing: boolean;
  media?: {
    type: string;
    hasMedia: true;
  } | null;
  // Topic/Thread information for forum groups
  replyToMsgId?: number;  // For normal replies and topic messages
  topicId?: number;       // Specific topic ID if this is a forum group
  threadId?: number;      // Thread ID for threaded messages
}

export interface UserInfo {
  id: string | number;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  isBot: boolean;
}

export interface SendMessageResult {
  id: number;
  message: string;
  date: number;
  chatId: string | number;
  success: boolean;
}

export interface ChatInfo {
  id: string | number;
  title: string;
  username?: string;
  type: string;
}

export interface SearchResult {
  chats: ChatInfo[];
  users: UserInfo[];
}

export interface TelegramClientConfig {
  apiId: number;
  apiHash: string;
  phoneNumber: string;
  sessionName: string;
}

// Re-export Notion types for convenience
export type { NotionMessage, NotionClientConfig } from './NotionClient';
export type { ExtractionOptions, ExtractionResult } from './TelegramToNotionService';
