/*'use client'*/

import { useEffect, useRef, useState } from 'react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X } from 'lucide-react'
import { motion , AnimatePresence} from 'framer-motion'
import { saveProgress } from './results'
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { io } from 'socket.io-client'
import { DotLoader } from 'react-spinners';

type Player = {
  clientId: string
  name: string
}

type ShowNotification = {
  name: string
  type: 'join' | 'leave'
} | null

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
  }, [session])


  useEffect(() => {
    if (!ablyClient || !session) return
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const currentClientId = ablyClient.auth.clientId!
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`)
    const chatChannelPrefix = 'chat:';
    const typingChannelPrefix = 'typing:';

    const onConnected = async () => {
      presenceChannel.presence.enter({ name });
      syncPresence();
    };
      
    // Atualiza lista de quem está online
    const syncPresence = async () => {
      const members = await presenceChannel.presence.get()
      const players = members
        .map((member: any) => ({
          name: member.data.name,
          clientId: member.clientId,
        }))
        .filter((player) => player.clientId !== currentClientId);
      setPlayersOnline(players);
    };
  
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


    for (const chatId in activeChats) {
      ablyClient.channels.get(`<span class="math-inline">\{chatChannelPrefix\}</span>{chatId}`).subscribe('message', handleChatMessage);
      const otherClientId = chatId;
      ablyClient.channels.get(`<span class="math-inline">\{typingChannelPrefix\}</span>{otherClientId}`).subscribe('typing', handleTypingStatus);
    }
    
    ablyClient.connection.once('connected', onConnected)
    
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
 

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      
      <h1 className="text-2xl font-bold mb-4">Jogadores Online</h1>
      <ul className="space-y-2 w-full max-w-md">
        {playersOnline.map((player) => (
          <li
            key={player.clientId}
            className="bg-slate-700 rounded-md p-3 flex items-center justify-between"
          >
            <span className="font-semibold">{player.name}</span>
            <button
              onClick={() => handleRequestChat(player)}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Bate-papo
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-2xl shadow-xl z-50"
          >
          {showNotification.type === 'join' ? (
            <>🎮 {showNotification.name} entrou no jogo!</>
          ) : (
            <>⚡ {showNotification.name} saiu do jogo.</>
          )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Modal de Pedido de Bate-papo */}
      {chatRequestsReceived.length > 0 && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-slate-800 rounded-md p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4">Pedidos de Bate-papo</h2>
            <ul className="space-y-2">
              {chatRequestsReceived.map((request) => (
                <li
                  key={request.fromClientId}
                  className="bg-slate-700 rounded-md p-3 flex items-center justify-between"
                >
                  <span>{request.fromName} quer conversar com você!</span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleAcceptChatRequest(request)}
                      className="bg-green-500 hover:bg-green-600 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRejectChatRequest(request)}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Bolha de Bate-papo */}
      {isChatBubbleOpen && (
        <div className="fixed bottom-6 right-6 bg-slate-700 rounded-lg shadow-md max-w-sm w-full flex flex-col z-50">
          <div className="bg-slate-800 p-3 rounded-t-lg flex justify-between items-center">
            <span className="font-semibold">{chatPartnerName}</span>
            <button onClick={closeChatBubble} className="text-gray-400 hover:text-gray-300 focus:outline-none">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3 overflow-y-auto h-64 flex-grow">
            {activeChats[isChatBubbleOpen]?.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-2 rounded-md ${
                  msg.sender === playerName ? 'bg-blue-600 text-right text-white self-end' : 'bg-slate-600 text-left'
                }`}
              >
                <span className="text-xs italic">{msg.sender}:</span>
                <p>{msg.text}</p>
              </div>
            ))}
            {typingIndicator[isChatBubbleOpen] && (
              <div className="text-left italic text-gray-400">
                <DotLoader color="#a0aec0" size={15} />
              </div>
            )}
          </div>
          <div className="p-3 border-t border-slate-600 flex items-center">
            <input
              type="text"
              className="bg-slate-800 text-white rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="Mensagem..."
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 hover:bg-blue-600 text-white rounded-md px-3 py-2 ml-2 focus:outline-none focus:ring-2 focus:focus:ring-blue-400"
            >
                Enviar
            </button>
          </div>
        </div>
      )}
          

    </div>
  )
}