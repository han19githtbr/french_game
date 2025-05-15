import { Server } from 'socket.io';
import { NextApiRequest, NextApiResponse } from 'next';
import { Session, getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Importe suas opções de autenticação

interface UserSession extends Session {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    id?: string; // Adicione um ID único para o usuário, se disponível
  };
}

const SocketHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (res.socket) { // Garante que res.socket não é null
    if ((res.socket as any).server?.io) { // Type casting para acessar a propriedade 'io' e verifica se server existe
      console.log('Socket is already running');
    } else {
      console.log('Socket is initializing');
      const io = new Server((res.socket as any).server, { // Type casting para acessar a propriedade 'server'
        path: '/api/socket',
      });
      (res.socket as any).server.io = io; // Type casting para atribuir 'io'

      const userSockets = new Map<string, string>(); // userId -> socketId

      io.on('connection', async (socket) => {
        const session = (await getServerSession(req, res, authOptions)) as UserSession | null;

        if (!session?.user?.email) {
          console.log('Usuário não autenticado tentando conectar ao socket.');
          socket.disconnect(true);
          return;
        }

        const userId = session.user.email; // Usando o email como ID único por enquanto
        console.log(`Usuário conectado: ${userId} (Socket ID: ${socket.id})`);
        userSockets.set(userId, socket.id);

        // Envia a lista de usuários online para o administrador (se conectado)
        const adminSocketId = userSockets.get('milliance23@gmail.com');
        if (adminSocketId) {
          const onlineUsers = Array.from(userSockets.keys()).filter(id => id !== 'milliance23@gmail.com');
          io.to(adminSocketId).emit('onlineUsers', onlineUsers);
        }

        // Informa ao administrador sobre o novo usuário online
        if (userId !== 'milliance23@gmail.com') {
          const adminSocketId = userSockets.get('milliance23@gmail.com');
          if (adminSocketId) {
            io.to(adminSocketId).emit('userConnected', userId);
          }
        }

        socket.on('sendMessage', ({ recipientId, message }) => {
          const senderId = userId;
          const recipientSocketId = userSockets.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('receiveMessage', { senderId, message });
            // Envia também para o remetente para exibir na própria tela
            socket.emit('receiveMessage', { senderId, message });
          }
        });

        socket.on('typing', ({ recipientId, isTyping }) => {
          const senderId = userId;
          const recipientSocketId = userSockets.get(recipientId);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('typing', { senderId, isTyping });
          }
        });

        socket.on('disconnect', () => {
          console.log(`Usuário desconectado: ${userId} (Socket ID: ${socket.id})`);
          userSockets.delete(userId);

          // Informa ao administrador sobre o usuário offline
          if (userId !== 'milliance23@gmail.com') {
            const adminSocketId = userSockets.get('milliance23@gmail.com');
            if (adminSocketId) {
              io.to(adminSocketId).emit('userDisconnected', userId);
            }
          } else {
            // Se o administrador desconectar, informa todos os usuários
            io.emit('adminDisconnected');
          }
        });
      });
    }
  } else {
    console.error('res.socket não está definido.');
    res.status(500).send('Erro ao inicializar o Socket.IO.');
    return;
  }
  res.end();
};

export default SocketHandler;