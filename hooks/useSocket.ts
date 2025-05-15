import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io({ path: '/api/socket' });

    newSocket.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.disconnect();
    };
  }, []);

  const sendMessage = useCallback((recipientId: string, message: string) => {
    socket?.emit('sendMessage', { recipientId, message });
  }, [socket]);

  const sendTyping = useCallback((recipientId: string, isTyping: boolean) => {
    socket?.emit('typing', { recipientId, isTyping });
  }, [socket]);

  return { socket, isConnected, sendMessage, sendTyping };
};

export default useSocket;