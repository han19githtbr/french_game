export interface Message {
  senderId: string;
  message: string;
  timestamp?: Date;
}

export interface ChatWindowState {
  userId: string;
  messages: Message[];
  isTyping: boolean;
}