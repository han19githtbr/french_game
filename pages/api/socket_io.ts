import { Server } from 'socket.io'

const users = new Map()

export default function handler(req: any, res:any) {
  if (!res.socket.server.io) {
    console.log('Socket.io: criando servidor...')
    const io = new Server(res.socket.server, {
      path: '/api/socket_io',
      addTrailingSlash: false,
    })

    io.on('connection', (socket) => {
      console.log('Novo usuário conectado', socket.id)

      socket.on('join', (user) => {
        socket.join(user.email)
        users.set(socket.id, user)
        console.log(`${user.name} entrou na sala ${user.email}`)

        // Enviar lista de usuários online para todos
        io.emit('online-users', Array.from(users.values()))
      })

      socket.on('private-message', ({ to, message, from }) => {
        io.to(to).emit('private-message', { message, from })
      })

      socket.on('typing', ({ to, from }) => {
        io.to(to).emit('typing', { from })
      })

      socket.on('stop-typing', ({ to, from }) => {
        io.to(to).emit('stop-typing', { from })
      })
    
    
      // Ao desconectar, remover do Map e atualizar lista
      socket.on('disconnect', () => {
        const user = users.get(socket.id)
        if (user) {
          console.log(`${user.name} (${user.email}) desconectou`)
          users.delete(socket.id)
          io.emit('online-users', Array.from(users.values()))
        }
      })
    
    })
  
    res.socket.server.io = io
  
  }
  res.end()
}