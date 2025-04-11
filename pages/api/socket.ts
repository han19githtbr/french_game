// pages/api/socket.ts
/*import { Server as IOServer } from 'socket.io'
import type { NextApiRequest } from 'next'
import type { Server as HTTPServer } from 'http'
import type { Socket as NetSocket } from 'net'

type NextApiResponseWithSocket = {
  socket: NetSocket & {
    server: HTTPServer & {
      io?: IOServer
    }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    const io = new IOServer(res.socket.server as any, {
      path: '/api/socketio',
      addTrailingSlash: false,
    })

    io.on('connection', socket => {
      socket.on('userJoined', (name: string) => {
        socket.broadcast.emit('userJoined', name)
      })
    })

    res.socket.server.io = io
  }

  res.end()
}

export const config = {
  api: {
    bodyParser: false,
  },
}*/
