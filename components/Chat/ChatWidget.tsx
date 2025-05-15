import React, { useState, useEffect, useCallback, useRef } from 'react';
import useSocket from '../../hooks/useSocket';
import { Message } from '../../types/chat';
import ChatWindow from './ChatWindow';

interface ChatWindowState {
  userId: string;
  userName: string;
  messages: Message[];
  isTyping: boolean;
}

const ChatWidget = () => {
  const { socket, isConnected, sendMessage, sendTyping } = useSocket();
  const [openChats, setOpenChats] = useState<ChatWindowState[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const chatThumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('receiveMessage', ({ senderId, message }) => {
      setOpenChats((prevChats) => {
        const chatIndex = prevChats.findIndex((chat) => chat.userId === senderId);
        if (chatIndex > -1) {
          const updatedChats = [...prevChats];
          updatedChats[chatIndex].messages.push({ senderId, message, timestamp: new Date() });
          return updatedChats;
        } else {
          // Se não houver chat aberto, podemos criar um novo (opcionalmente)
          return [...prevChats, { userId: senderId, userName: senderId, messages: [{ senderId, message, timestamp: new Date() }], isTyping: false }];
        }
      });
    });

    socket.on('typing', ({ senderId, isTyping }) => {
      setOpenChats((prevChats) => {
        return prevChats.map((chat) =>
          chat.userId === senderId ? { ...chat, isTyping } : chat
        );
      });
      setTypingUsers((prevTyping) => ({ ...prevTyping, [senderId]: isTyping }));
    });

    socket.on('onlineUsers', (users: string[]) => {
      setOnlineUsers(users);
    });

    socket.on('userConnected', (userId: string) => {
      setOnlineUsers((prevUsers) => [...prevUsers, userId]);
    });

    socket.on('userDisconnected', (userId: string) => {
      setOnlineUsers((prevUsers) => prevUsers.filter((id) => id !== userId));
      // Opcionalmente, fechar o chat com o usuário desconectado
      setOpenChats((prevChats) => prevChats.filter((chat) => chat.userId !== userId));
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('typing');
      socket.off('onlineUsers');
      socket.off('userConnected');
      socket.off('userDisconnected');
    };
  }, [socket]);

  const openChat = useCallback((userId: string) => {
    const isChatOpen = openChats.some((chat) => chat.userId === userId);
    if (!isChatOpen) {
      setOpenChats((prevChats) => [...prevChats, { userId, userName: userId, messages: [], isTyping: false }]);
    }
  }, [openChats]);

  const closeChat = useCallback((userId: string) => {
    setOpenChats((prevChats) => prevChats.filter((chat) => chat.userId !== userId));
  }, []);

  const handleSendMessage = useCallback((recipientId: string, message: string) => {
    sendMessage(recipientId, message);
    setOpenChats((prevChats) => {
      return prevChats.map((chat) =>
        chat.userId === recipientId ? { ...chat, messages: [...chat.messages, { senderId: 'admin', message, timestamp: new Date() }] } : chat
      );
    });
  }, [sendMessage]);

  const handleTyping = useCallback((recipientId: string, isTyping: boolean) => {
    sendTyping(recipientId, isTyping);
  }, [sendTyping]);

  return (
    <div className="fixed top-4 right-4 flex flex-col items-end z-50">
      <div
        ref={chatThumbnailsRef}
        className="flex space-x-2 overflow-x-auto scroll-smooth"
      >
        {openChats.map((chat) => (
          <div
            key={chat.userId}
            className="bg-gray-300 text-gray-800 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer shadow-md hover:scale-105 transition-transform duration-200"
            onClick={() => {
              // Foco na janela de bate-papo se minimizada (implementar depois se necessário)
            }}
          >
            {chat.userName.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {openChats.map((chat) => (
        <ChatWindow
          key={chat.userId}
          userId={chat.userId}
          userName={chat.userName}
          messages={chat.messages}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          isTyping={typingUsers[chat.userId] || false}
          onClose={closeChat}
        />
      ))}

      {/* Lista de usuários online para iniciar um chat (apenas para o administrador) */}
      {/* Você pode renderizar isso em outro lugar da página se preferir */}
      <div className="mt-4 bg-white shadow-md rounded-md p-4 border border-gray-200">
        <h3 className="font-semibold mb-2">Usuários Online</h3>
        <ul>
          {onlineUsers.map((userId) => (
            <li key={userId} className="py-1 cursor-pointer hover:bg-gray-100 rounded-md px-2" onClick={() => openChat(userId)}>
              {userId}
            </li>
          ))}
          {onlineUsers.length === 0 && <li className="text-gray-400">Nenhum usuário online.</li>}
        </ul>
      </div>
    </div>
  );
};

export default ChatWidget;