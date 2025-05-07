import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as HTTPServer } from 'http';
import type { Socket as NetSocket } from 'net';

interface User {
  socketId: string;
  clientId: string;
  playerName: string;
  avatarUrl: string;
}

// Estendendo o tipo do socket para incluir 'server.io'
interface SocketWithServer extends NetSocket {
  server: HTTPServer & {
    io?: Server;
  };
}

interface ResWithSocket extends NextApiResponse {
  socket: SocketWithServer;
}

const users: Record<string, User> = {};

const socketIoHandler = (req: NextApiRequest, res: ResWithSocket) => {
  if (res.socket) {
    if (res.socket.server.io) {
      console.log('Socket is already running');
      res.end();
      return;
    }

    const io = new Server(res.socket.server as any);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      const socketId = socket.id;
      console.log(`Client connected: ${socketId}`);

      socket.on('user-info', (data: { clientId: string; playerName: string; avatarUrl: string }) => {
        users[socketId] = { socketId, ...data };
        io.emit('user-joined', users[socketId]);
        io.emit('online-users', Object.values(users).filter(user => user.socketId !== socketId));
        socket.broadcast.emit('notification', { name: data.playerName, type: 'join' });
      });

      socket.on('get-online-users', () => {
        socket.emit('online-users', Object.values(users).filter(user => user.socketId !== socketId));
      });

      socket.on('send-chat-request', ({ toClientId, ...requestData }) => {
        const recipientSocketId = Object.values(users).find(user => user.clientId === toClientId)?.socketId;
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('chat-request', {
            ...requestData,
            fromClientId: users[socketId]?.clientId,
            fromName: users[socketId]?.playerName,
            fromAvatar: users[socketId]?.avatarUrl,
          });
        }
      });

      socket.on('join-private-room', (roomName: string) => {
        socket.join(roomName);
      });

      socket.on('private-message', ({ roomName, message }) => {
        io.to(roomName).emit('message', message);
      });

      socket.on('typing', ({ roomName, isTyping }) => {
        socket.to(roomName).emit('typing', {
          from: users[socketId]?.clientId,
          isTyping,
        });
      });

      socket.on('disconnect', () => {
        const leavingUser = users[socketId];
        delete users[socketId];
        if (leavingUser) {
          io.emit('user-left', leavingUser);
          socket.broadcast.emit('notification', { name: leavingUser.playerName, type: 'leave' });
        }
        console.log(`Client disconnected: ${socketId}`);
      });
    });

    console.log('Socket server started');
    res.end();
  } else {
    console.error('res.socket is null');
    res.status(500).send('Erro ao inicializar o Socket.IO');
  }
};

export default socketIoHandler;
