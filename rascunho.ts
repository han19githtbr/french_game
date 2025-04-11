/*'use client'*/

import { useEffect, useState } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { io } from 'socket.io-client'

//import successSound from '/sounds/success.mp3';

const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

type Player = {
  clientId: string
  name: string
}

type ShowNotification = {
  name: string
} |null


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
    
    if (!ablyClient) return
    
    const presenceChannel = ablyClient.channels.get('game-room')
  
    const name = session?.user?.name || 'Anônimo'
    const clientId = ablyClient.auth.clientId!
    // Entra na presença
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
  
    // Escuta entrada de novos jogadores
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
  
    return () => {
      presenceChannel.presence.leave()
      presenceChannel.presence.unsubscribe()
    }
  }, [ablyClient, session])
}   