/*'use client'*/

import { useEffect, useRef, useState } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'


type Player = {
  clientId: string
  name: string
}

type ShowNotification = {
  name: string
} | null


export default function Game() {
  
  const { data: session, status } = useSession()
  const router = useRouter()

  
  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [showNotification, setShowNotification] = useState<Player | null>(null)

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
 
  
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  
    
  useEffect(() => {
    if (!session) return
  
    const clientId = session.user?.email || Math.random().toString(36).substring(2, 9)
    const client = createAblyClient(clientId)
    setAblyClient(client)
  
    return () => {
      client.close()
    }
  }, [session])


  useEffect(() => {
    if (!ablyClient || !session) return
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const clientId = ablyClient.auth.clientId!
  
    const onConnected = () => {
      presenceChannel.presence.enter({ name })
  
      // Atualiza lista de quem está online
      const syncPresence = async () => {
        const members = await presenceChannel.presence.get()
        const players = members.map((member: any) => ({
          name: member.data.name,
          clientId: member.clientId,
        }))
        setPlayersOnline(players)
      }
  
      presenceChannel.presence.subscribe('enter', (member: any) => {
        const newPlayer = { name: member.data.name, clientId: member.clientId }
        if (member.clientId !== clientId) {
          setShowNotification(newPlayer)
          setTimeout(() => setShowNotification(null), 3000)
        }
        syncPresence()
      })
  
      presenceChannel.presence.subscribe('leave', syncPresence)
      syncPresence()
    }
  
    // Garante que o client está conectado
    ablyClient.connection.once('connected', onConnected)
  
    return () => {
      if (ablyClient.connection.state === 'connected') {
        presenceChannel.presence.leave()
      }
    
      presenceChannel.presence.unsubscribe()
      ablyClient.connection.off('connected', onConnected)
    }
  }, [ablyClient, session])
  
   
   

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl z-50"
          >
            🎮 {showNotification.name} entrou no jogo!
          </motion.div>
        )}
      </AnimatePresence>
            
}