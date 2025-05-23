import { Server } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';

// Este type é opcional, mas ajuda na clareza
interface User {
  id: string;
  name: string;
  image?: { url: string };
  socketId: string;
}

const usersOnline: User[] = [];

const SocketHandler = (req: NextApiRequest, res: NextApiResponse & { socket: any }) => {
  if (res.socket.server.io) {
    console.log('Socket já está rodando');
    res.end();
    return;
  }

  const io = new Server(res.socket.server, {
    path: '/api/socket', // Caminho customizado para o socket.io
    addTrailingSlash: false,
  });

  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('Novo usuário conectado:', socket.id);

    socket.on('userConnected', (userData: { id: string; name: string; image?: { url: string } }) => {
      console.log('Dados do usuário recebidos em userConnected:', userData);
      
      const existingUserIndex = usersOnline.findIndex(user => user.id === userData.id);
      if (existingUserIndex === -1) {
        const newUser: User = { ...userData, socketId: socket.id };
        usersOnline.push(newUser);
        console.log(`Usuário ${userData.name} adicionado. Online:`, usersOnline.map(u => u.name));
        io.emit('usersOnlineUpdate', usersOnline); // Avisa a todos sobre a atualização
      } else {
        // Atualiza o socketId se o usuário já estiver na lista (ex: reconexão)
        const oldSocketId = usersOnline[existingUserIndex].socketId;
        usersOnline[existingUserIndex].socketId = socket.id;
        io.emit('usersOnlineUpdate', usersOnline);
      }
    });

    socket.on('sendMessage', (data: { senderId: string; receiverId: string; message: string; senderName: string }) => {
      const receiver = usersOnline.find(user => user.id === data.receiverId);
      if (receiver) {
        io.to(receiver.socketId).emit('receiveMessage', {
          senderId: data.senderId,
          senderName: data.senderName,
          message: data.message,
        });
        // Opcional: Enviar para o próprio remetente para confirmar o envio na UI dele
        io.to(socket.id).emit('messageSentConfirmation', {
          receiverId: data.receiverId,
          message: data.message,
        });
      } else {
        console.warn(`Usuário ${data.receiverId} não encontrado para enviar mensagem.`);
      }
    });

    socket.on('disconnect', () => {
      const index = usersOnline.findIndex(user => user.socketId === socket.id);
      if (index !== -1) {
        const disconnectedUser = usersOnline.splice(index, 1)[0];
        console.log(`Usuário ${disconnectedUser.name} (ID: ${disconnectedUser.id}) DESCONECTADO (Socket ${socket.id}). Lista online atual:`, usersOnline.map(u => u.name));
        io.emit('usersOnlineUpdate', usersOnline); // Avisa a todos sobre a atualização
      } else {
        console.log(`Socket ${socket.id} desconectado, mas não encontrado na lista de usuários online.`);
      }
      
    });
  });

  console.log('Configurando Socket');
  res.end();
};

export default SocketHandler;