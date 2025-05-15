import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../../types/chat';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';

interface Props {
  userId: string;
  userName?: string;
  messages: Message[];
  onSendMessage: (recipientId: string, message: string) => void;
  onTyping: (recipientId: string, isTyping: boolean) => void;
  isTyping: boolean;
  onClose: (userId: string) => void;
}

const ChatWindow: React.FC<Props> = ({
  userId,
  userName = 'Usuário',
  messages,
  onSendMessage,
  onTyping,
  isTyping,
  onClose,
}) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isUserTyping, setIsUserTyping] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (message: string) => {
    onSendMessage(userId, message);
    setNewMessage('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    onTyping(userId, e.target.value.length > 0);
  };

  const handleBlur = () => {
    onTyping(userId, false);
    setIsUserTyping(false);
  };

  const handleFocus = () => {
    setIsUserTyping(true);
  };

  return (
    <div className="fixed bottom-0 right-4 bg-white shadow-md rounded-md border border-gray-200 w-96 max-h-[400px] flex flex-col z-50">
      <div className="bg-gray-100 py-2 px-4 border-b border-gray-200 flex justify-between items-center">
        <span className="font-semibold">{userName}</span>
        <button onClick={() => onClose(userId)} className="text-gray-500 hover:text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <div className="overflow-y-auto p-4 flex-grow">
        {messages.map((msg, index) => (
            <ChatBubble key={index} message={msg.message} isMe={msg.senderId === 'admin'} />
        ))}
        <div ref={messagesEndRef} />
        </div>
      <div className="p-2 border-t border-gray-200">
        {isTyping && <div className="text-gray-500 italic text-sm">Digitando...</div>}
        <ChatInput
          value={newMessage}
          onChange={handleInputChange}
          onSendMessage={handleSendMessage}
          onBlur={handleBlur}
          onFocus={handleFocus}
        />
      </div>
    </div>
  );
};

export default ChatWindow;