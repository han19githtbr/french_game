/*'use client'*/

/*import { useEffect, useRef, useState } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X } from 'lucide-react'
import { motion , AnimatePresence} from 'framer-motion'
import { io } from 'socket.io-client'
import { DotLoader } from 'react-spinners';


type Player = {
  clientId: string
  name: string
}

type ShowNotification =
  | {
      name: string;
      type: 'join' | 'leave';
    }
  | null;

type ChatRequest = {
  fromClientId: string;
  fromName: string;
};

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: number;
};


export default function Game() {
   
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)

  const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<{ [clientId: string]: ChatMessage[] }>({});
  const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
 
  const clientId = ablyClient?.auth.clientId;
  const playerName = session?.user?.name || 'Anônimo';
  
    
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router]);

    
  useEffect(() => {
    if (!session) return
  
    const generatedClientId = session.user?.email || Math.random().toString(36).substring(2, 9)
    const client = createAblyClient(generatedClientId)
    setAblyClient(client);
  
    return () => {
      client.close()
    }
  }, [session]);

  // Move as declarações das funções para fora do useEffect
  const handleChatMessage = (message: Ably.Message) => {
    const { sender, text, timestamp } = message.data;
    const chatId = message.name?.split(':')[1];
    if (chatId && activeChats[chatId]) {
      setActiveChats((prev) => ({
        ...prev,
        [chatId]: [...(prev[chatId] || []), { sender, text, timestamp }],
      }));
    }
  };

  const handleTypingStatus = (message: Ably.Message) => {
    const isUserTyping = message.data.isTyping;
    const otherClientId = message.clientId;
    if (otherClientId && isChatBubbleOpen === otherClientId) {
      setTypingIndicator((prev) => ({ ...prev, [otherClientId]: isUserTyping }));
    }
  };

  useEffect(() => {
    if (!ablyClient || !session) return;
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const currentClientId = ablyClient.auth.clientId!
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`)
    const chatChannelPrefix = 'chat:';
    const typingChannelPrefix = 'typing:';

    const onConnected = async () => {
      await presenceChannel.presence.enter({ name });
      await syncPresence();
    
      // ▶️ Quando alguém entra
      presenceChannel.presence.subscribe('enter', (member: any) => {
        const newPlayer = { name: member.data.name, clientId: member.clientId }
        if (member.clientId !== currentClientId) {
          setShowNotification({ name: newPlayer.name, type: 'join' })
          setTimeout(() => setShowNotification(null), 6000)
        }
        syncPresence()
      });
        
      // ⚡ Quando alguém sai
      presenceChannel.presence.subscribe('leave', (member: any) => {
        const leavingPlayer = { name: member.data.name, clientId: member.clientId }
    
        if (leavingPlayer.clientId !== currentClientId) {
          setShowNotification({ name: leavingPlayer.name, type: 'leave' })
          setTimeout(() => setShowNotification(null), 6000)
        }
    
        syncPresence();
      });
    
      chatRequestChannel.subscribe('request', (message: Ably.Message) => {
        const request: ChatRequest = message.data;
        setChatRequestsReceived((prev) => [...prev, request]);
      });
  
      chatRequestChannel.subscribe('response', (message: Ably.Message) => {
        const { accepted, fromClientId, fromName } = message.data;
        if (accepted) {
          alert(`🤝 ${fromName} aceitou seu pedido de bate-papo!`);
          setActiveChats((prev) => ({ ...prev, [fromClientId]: [] }));
          setIsChatBubbleOpen(fromClientId);
          setChatPartnerName(fromName);
        } else {
          alert(`❌ ${fromName} negou seu pedido de bate-papo.`);
        }
      });
              
      for (const chatId in activeChats) {
        ablyClient.channels.get(`<span class="math-inline">\{chatChannelPrefix\}</span>{chatId}`).subscribe('message', handleChatMessage);
        const otherClientId = chatId;
        ablyClient.channels.get(`<span class="math-inline">\{typingChannelPrefix\}</span>{otherClientId}`).subscribe('typing', handleTypingStatus);
      }
    };

    ablyClient.connection.once('connected', onConnected);

    return () => {
      if (ablyClient.connection.state === 'connected') {
        presenceChannel.presence.leave();
      }
      presenceChannel.presence.unsubscribe();
      chatRequestChannel.unsubscribe('request');
      chatRequestChannel.unsubscribe('response');
      for (const chatId in activeChats) {
        ablyClient.channels.get(`<span class="math-inline">\{chatChannelPrefix\}</span>{chatId}`).unsubscribe('message', handleChatMessage);
        const otherClientId = chatId;
        ablyClient.channels.get(`<span class="math-inline">\{typingChannelPrefix\}</span>{otherClientId}`).unsubscribe('typing', handleTypingStatus);
      }
      ablyClient.connection.off('connected', onConnected);
    };
  }, [ablyClient, session, activeChats, isChatBubbleOpen]);
    
  // Atualiza lista de quem está online
  const syncPresence = async () => {
      if (!ablyClient) return;
      const presenceChannel = ablyClient.channels.get('game-room');
      const members = await presenceChannel.presence.get();
      const currentClientId = ablyClient.auth.clientId!;
      const players = members
        .map((member: any) => ({
          name: member.data.name,
          clientId: member.clientId,
        }))
        .filter((player) => player.clientId !== currentClientId);
      setPlayersOnline(players);
  };
        
      
  //syncPresence()
  
  const handleRequestChat = (otherPlayer: Player) => {
    if (!ablyClient) return;
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    alert(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`);
  };
  
  const handleAcceptChatRequest = (request: ChatRequest) => {
    if (!ablyClient) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
    setActiveChats((prev) => ({ ...prev, [request.fromClientId]: [] }));
    setIsChatBubbleOpen(request.fromClientId);
    setChatPartnerName(request.fromName);
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
  };

  const handleRejectChatRequest = (request: ChatRequest) => {
    if (!ablyClient) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: false, fromClientId: clientId, fromName: playerName });
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
  };

  const openChatBubble = (player: Player) => {
    setActiveChats((prev) => prev[player.clientId] ? prev : { ...prev, [player.clientId]: [] });
    setIsChatBubbleOpen(player.clientId);
    setChatPartnerName(player.name);
  };

  const closeChatBubble = () => {
    setIsChatBubbleOpen(null);
    setChatPartnerName(null);
    setTypingIndicator({}); // Limpar o indicador de digitação ao fechar o chat
  };

  const handleSendMessage = () => {
    if (!ablyClient || !isChatBubbleOpen || !chatInput.trim()) return;
    const chatChannel = ablyClient.channels.get(`chat:${isChatBubbleOpen}`);
    chatChannel.publish('message', { sender: playerName, text: chatInput, timestamp: Date.now() });
    setActiveChats((prev) => ({
      ...prev,
      [isChatBubbleOpen]: [
        ...(prev[isChatBubbleOpen] || []),
        { sender: playerName, text: chatInput, timestamp: Date.now() },
      ],
    }));
    setChatInput('');
    setIsTyping(false);
    publishTypingStatus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
      publishTypingStatus(true);
      // Defina um timeout para parar de mostrar "digitando" se o usuário parar de digitar por um tempo
      setTimeout(() => {
        if (isTyping && e.target.value === chatInput) {
          setIsTyping(false);
          publishTypingStatus(false);
        }
      }, 1500); // Tempo em milissegundos para considerar que parou de digitar
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
      publishTypingStatus(false);
    }
  };

  const publishTypingStatus = (typing: boolean) => {
    if (!ablyClient || !isChatBubbleOpen) return;
    const typingChannel = ablyClient.channels.get(`typing:${isChatBubbleOpen}`);
    typingChannel.publish('typing', { isTyping: typing });
  };
 
}*/  
  