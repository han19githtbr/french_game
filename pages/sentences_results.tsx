// pages/results.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash2 } from 'lucide-react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { motion , AnimatePresence} from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Check, X } from 'lucide-react'
//import { signOut, useSession } from 'next-auth/react'
import { FaMedal } from 'react-icons/fa';
import { DotLoader } from 'react-spinners';


interface Progress {
  round: number;
  correct_answer: number;
}

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

export default function ResultsPage() {
  //const [progress_phrases, setProgressPhrases] = useState<{ round: number, correct_phrase: number }[]>([])
  const [progress_answers, setProgressAnswers] = useState<Progress[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);
  //const { data: session } = useSession()
  const { data: session, status } = useSession()
  const router = useRouter()

  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);

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
  }, [status])

  useEffect(() => {
    const saved = localStorage.getItem('progress_answers')
    if (saved) {
      const parsed: Progress[] = JSON.parse(saved);
      setProgressAnswers(parsed);
      if (parsed.length > 0) {
        setCurrentProgress(parsed[parsed.length - 1].correct_answer);
        setIsFlashing(parsed[parsed.length - 1].correct_answer === 4);
      } else {
        setCurrentProgress(0);
        setIsFlashing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (progress_answers.length > 0) {
      const lastProgress = progress_answers[progress_answers.length - 1].correct_answer;
      setCurrentProgress(lastProgress);
      setIsFlashing(lastProgress === 4);
    } else {
      setCurrentProgress(0);
      setIsFlashing(false);
    }
  }, [progress_answers]);


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

  
    // Garante que o client está conectado
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

  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
    setIsLogoutVisible(true);
  };

  const handleMouseLeave = () => {
    // Define um timeout para esconder o logout após um pequeno atraso
    const timeoutId = setTimeout(() => {
      setIsLogoutVisible(false);
    }, 300); // Ajuste o valor do atraso (em milissegundos) conforme necessário
    setLogoutTimeoutId(timeoutId);
  }

  const handleLogoutMouseEnter = () => {
    // Se o mouse entrar no botão de logout, cancela o timeout de desaparecimento
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
  };


  const clearProgress = () => {
    localStorage.removeItem('progress_answers');
    setProgressAnswers([]);
    setCurrentProgress(0);
    setIsFlashing(false);
  };

  const bestRound = progress_answers.reduce((prev, curr) => (curr.correct_answer > prev.correct_answer ? curr : prev), { round: 0, correct_answer: 0 })

  const progressPercentage = (currentProgress / 4) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6">
        <button 
          onClick={() => router.push('/frases')} 
          className="fixed flex border border-blue items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-50 cursor-pointer">
          <ChevronLeft className="mr-2" color="blue" /> Voltar ao jogo
        </button>
        {/**{session?.user && (
          <div
            className="fixed right-4 z-50"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center gap-2 cursor-pointer mt-16">
              <span className="text-white font-medium hidden sm:inline">{session.user.name}</span>
              <img src={session.user.image || ''} alt="Avatar" className="w-8 h-8 rounded-full border border-white" />
            </div>
            <div
              className={`absolute border border-blue right-0 mt-2 text-black py-2 px-4 rounded shadow-lg z-10 ${
                isLogoutVisible ? 'block' : 'hidden'
              }`}
              onMouseEnter={handleLogoutMouseEnter} // Impede o desaparecimento ao entrar no botão
            >
              <button onClick={handleLogout} className="hover:text-red-600 cursor-pointer">Logout</button>
            </div>
          </div>
        )}**/}
      </div>      

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center justify-center relative mt-3 mb-3">
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
        {/* Outros elementos do seu componente */}
      </div>    

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

      <h1 className="text-3xl font-bold mt-30 mb-4 text-center">Seu Progresso</h1>
      
      {/* Barra de Progresso */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="bg-gray-800 rounded-full h-4 relative overflow-hidden">
          <div
            className={`bg-green h-full rounded-full transition-all duration-500 ease-out absolute left-0 top-0 ${
              isFlashing ? 'animate-progress-flash' : ''
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-sm font-semibold">
            {currentProgress} / 4
          </span>
        </div>
        <p className="text-sm text-gray-400 mt-1 text-center">Progresso para a Medalha de Ouro</p>
      </div>

      {progress_answers.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md mx-auto space-y-4 mb-8">
            {progress_answers.map((p, i) => (
              <div
              key={i}
              className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${p.correct_answer === bestRound.correct_answer ? 'border-2 border-yellow-400' : ''}`}
            >
              <span>Jogada {p.round}</span>
              <span>
                {p.correct_answer} acertos
                {p.correct_answer === 4 && <FaMedal color="gold" className="inline-block ml-2 medalha-brilho-ouro" />}
                {p.correct_answer === 3 && <FaMedal color="silver" className="inline-block ml-2 medalha-brilho-prata" />}
              </span>
            </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
              <button
                onClick={clearProgress}
                className="flex items-center border border-white bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 cursor-pointer"
              >
                <Trash2 className="mr-2" color="red" /> Limpar Jogadas
              </button>
          </div>

          <h2 className="text-2xl font-semibold text-center mb-4">Estatísticas de Acertos</h2>
          <div className="h-72 w-full max-w-3xl mx-auto">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progress_answers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="round" label={{ value: 'Jogada', position: 'insideBottomRight', offset: -5 }} />
                <YAxis label={{ value: 'Acertos', angle: -90, position: 'insideLeft' }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="correct_answer" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-8 text-lg">
            🏆 Melhor desempenho: <strong>{bestRound.correct_answer}</strong> acertos na jogada {bestRound.round}
          </div>
        </>

      )}
    </div>
  )
}


// Função para salvar progresso após cada rodada
export const saveProgress = (correct_answer: number) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('progress_answers')
    const parsed = saved ? JSON.parse(saved) : []
    const round = parsed.length + 1
    parsed.push({ round, correct_answer })
    localStorage.setItem('progress_answers', JSON.stringify(parsed))
}