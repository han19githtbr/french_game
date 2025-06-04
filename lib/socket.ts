import { useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

let socket: Socket;

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
        path: '/api/socket',
      });

      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });
    }

    return () => {
      if (socket) {
        socket.off('connect');
        socket.off('disconnect');
      }
    };
  }, []);

  return socket;
}