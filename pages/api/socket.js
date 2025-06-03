import { Server } from 'socket.io';

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket já está rodando');
    res.end();
    return;
  }

  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    console.log('Novo cliente conectado');

    socket.on('newPost', () => {
      io.emit('newPostNotification');
    });

    socket.on('postLiked', (post) => {
      io.emit('postUpdated', post);
    });

    socket.on('commentAdded', (post) => {
      io.emit('postUpdated', post);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });

  console.log('Socket.io inicializado');
  res.end();
}