// pages/results.tsx
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { ChevronLeft, Trash } from 'lucide-react'
import { createAblyClient } from '../lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { motion , AnimatePresence} from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Check, X } from 'lucide-react'
//import { signOut, useSession } from 'next-auth/react'
import { FaChartBar, FaMedal } from 'react-icons/fa';
import { DotLoader } from 'react-spinners';
import { Realtime, Message } from 'ably'


interface Progress {
  round: number;
  correct_proverb: number;
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
  const [hiddenPlayers, setHiddenPlayers] = useState<string[]>([]);

  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)

  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [clientId, setClientId] = useState<string | null>(null);

  const [chatRequestsSent, setChatRequestsSent] = useState<{ toClientId: string, toName: string }[]>([]);

  const [chatRequestsReceived, setChatRequestsReceived] = useState<ChatRequest[]>([]);
  const [activeChats, setActiveChats] = useState<{ [clientId: string]: ChatMessage[] }>({});
  const [isChatBubbleOpen, setIsChatBubbleOpen] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatPartnerName, setChatPartnerName] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingHandlersRef = useRef<Record<string, (msg: Ably.Message) => void>>({});
  const [typingIndicator, setTypingIndicator] = useState<{ [clientId: string]: boolean }>({});
  const enterSoundRef = useRef<HTMLAudioElement | null>(null);
  const chatRequestReceivedSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de pedido recebido
  const chatRequestResponseSoundRef = useRef<HTMLAudioElement | null>(null); // Referência para o som de resposta ao pedido
  const chatHandlersRef = useRef<Record<string, (message: Ably.Message) => void>>({});

  const boxRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // canto superior esquerdo
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  //const clientId = ablyClient?.auth.clientId;
  const playerName = session?.user?.name || 'Anônimo';

  const handleHidePlayer = (clientId: string) => {
    setHiddenPlayers((prev) => [...prev, clientId]);
  };

  const handleShowPlayer = (clientId: string) => {
    setHiddenPlayers((prev) => prev.filter((id) => id !== clientId));
  };

  const showToast = (message: string, type: 'info' | 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 3000); // Exibir por 3 segundos
  };


  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status])

  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => setDragging(false);

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => setDragging(false);
    const handleTouchCancel = () => setDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchCancel);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [dragging, offset]);

  const handleMove = (clientX: number, clientY: number) => {
    if (!dragging || !boxRef.current) return;

    const newX = clientX - offset.x;
    const newY = clientY - offset.y;

    const box = boxRef.current;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const boxWidth = box.offsetWidth;
    const boxHeight = box.offsetHeight;

    const clampedX = Math.max(0, Math.min(newX, windowWidth - boxWidth));
    const clampedY = Math.max(0, Math.min(newY, windowHeight - boxHeight));

    setPosition({ x: clampedX, y: clampedY });
  };

  const handleStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!boxRef.current) return;
    setDragging(true);
    let clientX: number | undefined;
    let clientY: number | undefined;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else if (e instanceof TouchEvent && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    if (clientX !== undefined && clientY !== undefined) {
      setOffset({
        x: clientX - boxRef.current.offsetLeft,
        y: clientY - boxRef.current.offsetTop,
      });
    }
  };

  
  useEffect(() => {
    const saved = localStorage.getItem('progress_answers')
    if (saved) {
      const parsed: Progress[] = JSON.parse(saved);
      setProgressAnswers(parsed);
      if (parsed.length > 0) {
        setCurrentProgress(parsed[parsed.length - 1].correct_proverb);
        setIsFlashing(parsed[parsed.length - 1].correct_proverb === 4);
      } else {
        setCurrentProgress(0);
        setIsFlashing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (progress_answers.length > 0) {
      const lastProgress = progress_answers[progress_answers.length - 1].correct_proverb;
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
    setClientId(generatedClientId);
  
    return () => {
      client.close()
    }
  }, [session]);

  // [ACRESCENTADO] Função para gerar um nome de canal de chat único para um par de usuários
  const getChatChannelName = (clientId1: string, clientId2: string) => {
    const sortedIds = [clientId1, clientId2].sort();
    return `chat:${sortedIds[0]}-${sortedIds[1]}`;
  };

  // [ACRESCENTADO] Função para gerar um nome de canal de digitação único para um par de usuários
  const getTypingChannelName = (clientId1: string, clientId2: string) => {
    const sortedIds = [clientId1, clientId2].sort();
    return `typing:${sortedIds[0]}-${sortedIds[1]}`;
  };

  // Move as declarações das funções para fora do useEffect
  const handleChatMessage = (message: Ably.Message, channelName: string) => {
      const { sender, text, timestamp } = message.data;
      //const channelName = message.name; // [CORRIGIDO] O nome do canal contém os IDs dos participantes
      const otherClientId = channelName?.split(':')[1]?.split('-')?.find(id => id !== clientId);
      const otherUserName = playersOnline.find(player => player.clientId === otherClientId)?.name || 'Usuário Desconhecido';
  
      // Evita duplicar mensagens com mesmo sender + timestamp
      const alreadyExists = activeChats[channelName]?.some(msg =>
        msg.sender === sender && msg.timestamp === timestamp
      );
      if (alreadyExists) return;

      if (channelName && otherClientId) {
        setActiveChats((prev) => ({
          ...prev,
          [channelName]: [...(prev[channelName] || []), { sender, text, timestamp }],
        }));
  
        // Abrir a caixa de diálogo automaticamente se estiver fechada ou se for uma nova conversa
        if (isChatBubbleOpen !== channelName) {
          setIsChatBubbleOpen(channelName);
          setChatPartnerName(sender === playerName ? otherUserName : sender); // Define o nome do parceiro correto
        }
      }
  };

  const handleTypingStatus = (message: Ably.Message) => {
    const isUserTyping = message.data.isTyping;
    const otherClientId = message.clientId;
    // [CORRIGIDO] Verifica se otherClientId é definido antes de usá-lo
    if (otherClientId && isChatBubbleOpen && isChatBubbleOpen.includes(otherClientId) && clientId !== otherClientId) {
      setTypingIndicator((prev) => ({ ...prev, [otherClientId]: isUserTyping }));
    }
  };

  
  useEffect(() => {
    if (!ablyClient || !session || !clientId) return;
  
    const presenceChannel = ablyClient.channels.get('game-room')
    const name = session.user?.name || 'Anônimo'
    const currentClientId = clientId!
    
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
    
      const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`);
      chatRequestChannel.subscribe('request', (message: Ably.Message) => {
        const request: ChatRequest = message.data;
        setChatRequestsReceived((prev) => [...prev, request]);
        chatRequestReceivedSoundRef.current?.play();
      });
  
      chatRequestChannel.subscribe('response', (message: Ably.Message) => {
        const { accepted, fromClientId, fromName } = message.data;
        chatRequestResponseSoundRef.current?.play();
        if (accepted) {
          //alert(`🤝 ${fromName} aceitou seu pedido de bate-papo!`);
          showToast(`🤝 ${fromName} aceitou seu pedido de bate-papo!`, 'info');      
          const chatChannelName = getChatChannelName(currentClientId, fromClientId);
          setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
          setIsChatBubbleOpen(chatChannelName);
          setChatPartnerName(fromName);
          // [ACRESCENTADO] Inscrever-se no canal de mensagens quando o chat é aceito
          
          const chatMessageHandler = (message: Ably.Message) => {
            handleChatMessage(message, chatChannelName);
          };
          
          ablyClient.channels.get(chatChannelName).subscribe('message', chatMessageHandler);
          
          // [ACRESCENTADO] Inscrever-se no canal de digitação quando o chat é aceito
          ablyClient.channels.get(getTypingChannelName(currentClientId, fromClientId)).subscribe('typing', handleTypingStatus);
        } else {
          //alert(`❌ ${fromName} negou seu pedido de bate-papo.`);
          showToast(`❌ ${fromName} negou seu pedido de bate-papo.`, 'info');
        }
      });
          
    };

  
    // Garante que o client está conectado
    ablyClient.connection.once('connected', onConnected)
  
    return () => {
      if (ablyClient?.connection?.state === 'connected') {
        presenceChannel.presence.leave();
      }
      presenceChannel.presence.unsubscribe();
      const chatRequestChannel = ablyClient.channels.get(`chat-requests:${currentClientId}`);
      chatRequestChannel?.unsubscribe('request');
      chatRequestChannel?.unsubscribe('response');
      // [CORRIGIDO] Cancelar a inscrição de todos os canais de chat ativos ao desmontar
      for (const channelName in activeChats) {
        ablyClient?.channels.get(channelName)?.unsubscribe('message', chatHandlersRef.current[channelName]);
        // [ACRESCENTADO] Extrai os clientIds do nome do canal para cancelar a inscrição do canal de digitação
        const ids = channelName.split(':')[1]?.split('-');
        if (ids && ids.length === 2) {
          const typingChannelName = getTypingChannelName(ids[0], ids[1]);
          ablyClient?.channels.get(typingChannelName)?.unsubscribe('typing', handleTypingStatus);
        }
      }
      ablyClient.connection.off('connected', onConnected);
    };
  }, [ablyClient, session, clientId]);


  // Atualiza lista de quem está online
  const syncPresence = async () => {
    if (!ablyClient) return;
    const presenceChannel = ablyClient.channels.get('game-room');
    const members = await presenceChannel.presence.get();
    const currentClientId = clientId!;
    const players = members
      .map((member: any) => ({
        name: member.data.name,
        clientId: member.clientId,
      }))
      .filter((player) => player.clientId !== currentClientId);
    setPlayersOnline(players);
  };

  const handleRequestChat = (otherPlayer: Player) => {
    if (!ablyClient || !clientId) return;
    
    // ✅ Verifica se já foi enviado um pedido para este jogador
    const alreadySent = chatRequestsSent.some(
      (req) => req.toClientId === otherPlayer.clientId
    );

    if (alreadySent) {
      showToast(`⚠️ Você já enviou um pedido para ${otherPlayer.name}. Aguarde a resposta.`, 'info');
      return;
    }
    
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    
    // ✅ Armazena o pedido enviado
    setChatRequestsSent((prev) => [
      ...prev,
      { toClientId: otherPlayer.clientId, toName: otherPlayer.name },
    ]);

    showToast(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`, 'info');
  };
  
  const subscribeToChatChannel = (
        ablyClient: Realtime,
        channelName: string,
        handler: (msg: Ably.Message) => void,
        handlersRef: React.MutableRefObject<Record<string, (msg: Ably.Message) => void>>
      ) => {
        const channel = ablyClient.channels.get(channelName);
      
        // Remove qualquer handler antigo
        if (handlersRef.current[channelName]) {
          channel.unsubscribe('message', handlersRef.current[channelName]);
        }
      
        // Adiciona o novo handler
        channel.subscribe('message', handler);
      
        // Salva referência
        handlersRef.current[channelName] = handler;
  };


  const handleAcceptChatRequest = (request: ChatRequest) => {
      if (!ablyClient || !clientId) return;
      const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
      responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
      const chatChannelName = getChatChannelName(clientId, request.fromClientId);
      setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
      setIsChatBubbleOpen(chatChannelName);
      setChatPartnerName(request.fromName);
      
      // ✅ Remove o pedido da lista de recebidos
      setChatRequestsReceived((prev) =>
        prev.filter((req) => req.fromClientId !== request.fromClientId)
      );
  
      // ✅ Remove o pedido da lista de enviados
      setChatRequestsSent((prev) =>
        prev.filter((req) => req.toClientId !== request.fromClientId)
      );
      
      //setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
      
      // [CORREÇÃO] Inscrever-se nos canais de mensagens e digitação AQUI para o receptor
      // ⚠️ Verifica se já tem handler antes de criar novo
      if (!chatHandlersRef.current[chatChannelName]) {
        const chatMessageHandler = (message: Ably.Message) => {
          handleChatMessage(message, chatChannelName);
        };
      
        subscribeToChatChannel(ablyClient, chatChannelName, chatMessageHandler, chatHandlersRef);
      }
          
      
      const typingChannelName = getTypingChannelName(clientId, request.fromClientId);
      if (!typingHandlersRef.current[typingChannelName]) {
        ablyClient.channels
          .get(typingChannelName)
          .subscribe('typing', handleTypingStatus);
        typingHandlersRef.current[typingChannelName] = handleTypingStatus;
      }
      
      // [ACRESCENTADO] Abrir a bolha de chat após a aceitação
      openChatBubble({ clientId: request.fromClientId, name: request.fromName });
      // A inscrição nos canais de mensagens e digitação agora é feita dentro de openChatBubble
      chatRequestResponseSoundRef.current?.play();
  };

  const handleRejectChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: false, fromClientId: clientId, fromName: playerName });
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
    chatRequestResponseSoundRef.current?.play();
  };

  const openChatBubble = (player: Player) => {
    if (!clientId || !ablyClient) { // [CORRIGIDO] Verifica se clientId e ablyClient são null
      return;
    }
    const chatChannelName = getChatChannelName(clientId, player.clientId);
    setActiveChats((prev) => prev[chatChannelName] ? prev : { ...prev, [chatChannelName]: [] });
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(player.name);
    
  };

  const closeChatBubble = () => {
    setIsChatBubbleOpen(null);
    setChatPartnerName(null);
    setTypingIndicator({}); // Limpar o indicador de digitação ao fechar o chat
  };

  const handleSendMessage = () => {
    if (!ablyClient || !isChatBubbleOpen || !chatInput.trim() || !clientId) return;
    const chatChannel = ablyClient.channels.get(isChatBubbleOpen);
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
    //publishTypingStatus(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (e.target.value.trim() && !isTyping) {
      setIsTyping(true);
      publishTypingStatus(true);
      setTimeout(() => {
        if (isTyping && e.target.value === chatInput) {
          setIsTyping(false);
          publishTypingStatus(false);
        }
      }, 1500);
    } else if (!e.target.value.trim() && isTyping) {
      setIsTyping(false);
      publishTypingStatus(false);
    }
  };

  const publishTypingStatus = (typing: boolean) => {
    if (!ablyClient || !isChatBubbleOpen || !clientId) return;
    // [CORRIGIDO] Envia o status de digitação para o canal correto baseado no chat aberto
    const otherClientId = isChatBubbleOpen.split(':')[1]?.split('-')?.find(id => id !== clientId);
    if (otherClientId) {
      const typingChannel = ablyClient.channels.get(getTypingChannelName(clientId, otherClientId));
      typingChannel.publish('typing', { isTyping: typing });
    }
  };

  // [ACRESCENTADO] Estado para armazenar o clientId assim que estiver disponível
  useEffect(() => {
    if (ablyClient) {
      setClientId(ablyClient.auth.clientId);
    }
  }, [ablyClient]);


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

  const bestRound = progress_answers.reduce((prev, curr) => (curr.correct_proverb > prev.correct_proverb ? curr : prev), { round: 0, correct_proverb: 0 })

  const progressPercentage = (currentProgress / 4) * 100;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* Header com perfil */}
      <div className="flex justify-between items-center mb-6 mt-5">
        <button 
          onClick={() => router.push('/proverbs')} 
          className="absolute flex border border-blue text-gray-300 items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 mt-50 cursor-pointer">
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

      {/*<div className="flex justify-center w-full mt-4">
        
        <ul className="space-y-3 max-w-md w-full">
          {playersOnline
            .filter((player) => !hiddenPlayers.includes(player.clientId))
            .map((player) => (
              <li
                key={player.clientId}
                className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 flex items-center justify-between shadow-md border border-gray-600 transition duration-300 ease-in-out transform hover:scale-105"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-2 h-2 rounded-full bg-green mr-1 animate-pulse shrink-0" />
                  <span className="font-bold text-lg text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {player.name}
                  </span>
                </div>

                <div className="flex items-center shrink-0">
                  <button
                    onClick={() => handleHidePlayer(player.clientId)}
                    className="bg-blue hover:bg-gray-700 text-white font-bold py-2 px-2 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-gray-500 mr-2 cursor-pointer"
                    title="Ocultar Jogador"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a10.06 10.06 0 012.19-3.368M6.423 6.423A9.967 9.967 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.05 10.05 0 01-4.128 5.14M15 12a3 3 0 11-6 0 3 3 0 016 0zm-9 9l18-18" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      handleRequestChat(player);
                      openChatBubble(player);
                    }}
                    className="bg-gradient-to-br from-blue to-purple hover:from-blue hover:to-purple text-white whitespace-nowrap font-bold py-2 px-4 rounded-full shadow-md transition duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Solicitar Bate-papo
                  </button>
                </div>
              </li>
            ))}
        </ul>
      </div>*/}


      {/* Caixinha de miniaturas arrastável */}
      {/*<div
        ref={boxRef}
        onMouseDown={handleStart}
        onTouchStart={handleStart}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 'auto',
          maxWidth: '90vw',
          maxHeight: '90vh',
          minWidth: '220px',
          zIndex: 9999,
        }}
        className="bg-gray-800 text-white p-3 rounded-md shadow-lg border border-blue"
      >
        <div className="font-bold mb-2 select-none text-blue">Pode arrastar</div>
        <div className="font-bold mb-2 select-none text-green">Jogadores Online</div>

        <div
          className="bg-gray-900 border border-green rounded p-2 overflow-x-auto"
          style={{
            minHeight: 'calc(17vh - 60px)',
            whiteSpace: 'nowrap',
          }}
        >
          <ul className="space-x-3 w-full max-w-none flex flex-row">
            {playersOnline.map((player) => (
              <li
                key={player.clientId}
                className={`bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-4 flex items-center justify-between shadow-md border border-gray-600 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer ${hiddenPlayers.includes(player.clientId) ? 'opacity-50' : ''}`}
                style={{ display: 'inline-block', minWidth: '200px' }}
                onClick={() => handleShowPlayer(player.clientId)} // Adicionando a função para reexibir
                title={hiddenPlayers.includes(player.clientId) ? 'Mostrar Jogador' : ''}
              >
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green mr-1 animate-pulse shrink-0" />
                  <span className="font-bold text-lg text-white truncate max-w-[140px] sm:max-w-[180px]">
                    {player.name}
                  </span>
                </div>
                
              </li>
            ))}
          </ul>
        </div>
      </div>*/}    


      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            className="fixed top-5 left-5 bg-gradient-to-r from-blue to-purple text-white px-6 py-3 rounded-2xl shadow-xl z-50"
          >
          {showNotification.type === 'join' ? (
            <>🎮 {showNotification.name} entrou no jogo!</>
          ) : (
            <>⚡ {showNotification.name} saiu do jogo.</>
          )}
          </motion.div>
        )}
      </AnimatePresence>

      <>
        <audio ref={enterSoundRef} src="/sounds/accepted_sound.mp3" preload="auto" />
        <audio ref={chatRequestReceivedSoundRef} src="/sounds/received_sound.mp3" preload="auto" />
        <audio ref={chatRequestResponseSoundRef} src="/sounds/refuse_sound.mp3" preload="auto" />
        {/*{chatRequestsReceived.length > 0 && (
          <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 flex justify-center items-center z-50 backdrop-blur-sm">
            <div className="bg-gradient-to-br from-gray-800 to-gray-700 rounded-xl p-8 max-w-md w-full shadow-lg border-2 border-gray-600 animate__animated animate__fadeIn">
              <h2 className="text-xl font-bold text-yellow mb-6 glow-text">🕹️ Pedidos de Bate-papo Recebidos!</h2>
              <ul className="space-y-4">
                {chatRequestsReceived.map((request) => (
                  <li
                    key={request.fromClientId}
                    className="bg-gray-900 rounded-md p-4 flex items-center justify-between border-b border-gray-700"
                  >
                    <span className="text-white font-semibold">{request.fromName}</span>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleAcceptChatRequest(request)}
                        className="flex items-center justify-center whitespace-nowrap bg-blue hover:bg-blue text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue"
                      >
                        <Check className="h-5 w-5 mr-2 shrink-0" /> Aceitar
                      </button>
                      <button
                        onClick={() => handleRejectChatRequest(request)}
                        className="flex items-center justify-center whitespace-nowrap bg-red hover:bg-red text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red"
                      >
                        <X className="h-5 w-5 mr-2 shrink-0" /> Recusar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}*/}
      </>
      {isChatBubbleOpen && (
        <div
            className={`fixed bottom-0 left-1/2 -translate-x-1/2 z-50
              w-full max-w-[calc(100vw-16px)] sm:max-w-md
              flex flex-col shadow-lg rounded-t-lg bg-gradient-to-br from-gray-800 to-gray-700
              border-t-2 border-gray-600
              animate__animated animate__slideInUp
              rounded-bl-none rounded-br-none
              px-2 sm:px-0
            `}
        >
          <div className="bg-gray-900 p-3 rounded-t-lg flex justify-between items-center border-b border-gray-700">
            <span className="font-bold text-gray-900 glow-text">{chatPartnerName}</span>
            <button onClick={closeChatBubble} className="text-gray-400 hover:text-gray-300 focus:outline-none">
              <X className="h-5 w-5 cursor-pointer" />
            </button>
          </div>
          <div className="p-3 overflow-y-auto h-64 flex-grow">
            {activeChats[isChatBubbleOpen]?.map((msg, index) => (
              <div
                key={index}
                className={`mb-2 p-3 rounded-md ${
                  msg.sender === playerName
                    ? 'bg-gray-800 text-right text-white self-end shadow-md'
                    : 'bg-gray-800 text-left text-white shadow-md'
                }`}
              >
                <span className="text-xs italic text-gray-900">{msg.sender}:</span>
                <p className="font-medium">{msg.text}</p>
              </div>
            ))}
            {typingIndicator[isChatBubbleOpen] && (
              <div className="text-left italic text-gray-400">
                <DotLoader color="#a0aec0" size={15} /> <span className="ml-1">Digitando...</span>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-700 flex items-center">
            <input
              type="text"
              className="bg-gray-900 text-white rounded-md px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-cyan-400 shadow-inner"
              placeholder="Enviar mensagem..."
              value={chatInput}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded-md ml-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold text-gray-300 mt-40 mb-4 text-center">Seu Progresso</h1>
      
      {/* Barra de Progresso */}
      <div className="mb-6 max-w-md mx-auto">
        <div className="bg-gray-800 rounded-full h-4 relative overflow-hidden animate-pulse-slow">
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
        <p className="text-sm text-gray-400 mt-3 text-center">Progresso para a Medalha de Ouro</p>
      </div>

      {progress_answers.length === 0 ? (
        <p className="text-center text-gray-400">Você ainda não fez nenhuma jogada.</p>
      ) : (
        <>
          <div className="max-w-md mx-auto space-y-4 mb-8">
            {progress_answers.map((p, i) => (
              <div
              key={i}
              className={`bg-white text-black p-4 rounded-xl shadow-md flex justify-between items-center ${p.correct_proverb === bestRound.correct_proverb ? 'border-2 border-green ' : ''}`}
            >
              <span>Jogada {p.round}</span>
              <span>
                {p.correct_proverb} acertos
                {p.correct_proverb === 4 && <FaMedal color="gold" className="inline-block ml-2 medalha-brilho-ouro" />}
                {p.correct_proverb === 3 && <FaMedal color="silver" className="inline-block ml-2 medalha-brilho-prata" />}
              </span>
            </div>
            ))}
          </div>

          <div className="flex justify-center mb-8">
              <button
                onClick={clearProgress}
                className="flex items-center border border-red bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-75 cursor-pointer"
              >
                <Trash className="mr-2" color="red" /> Limpar Jogadas
              </button>
          </div>

          <h2 className="text-3xl font-bold text-center text-indigo-600 flex items-center justify-center gap-2 mb-6">
              <FaChartBar className="text-blue text-2xl mt-1" />
              Estatísticas de Acertos
          </h2>
                    
          <div className="h-80 w-full max-w-4xl mx-auto rounded-2xl bg-white shadow-xl p-4 dark:bg-zinc-900 dark:shadow-none">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={progress_answers}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                          dataKey="round" 
                          label={{ value: 'Jogada', position: 'insideBottomRight', offset: -5 }}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                      />
                      <YAxis 
                          label={{ value: 'Acertos', angle: -90, position: 'insideLeft' }}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: '#d1d5db' }}
                          allowDecimals={false}
                      />
                      <Tooltip
                          contentStyle={{ backgroundColor: "#fff", borderColor: "#d1d5db", borderRadius: "8px", padding: "10px" }}
                          labelStyle={{ color: "#4b5563", fontWeight: "bold" }}
                      />
                      <Bar 
                          dataKey="correct_proverb"
                          fill="#6366f1"
                          radius={[6, 6, 0, 0]}
                          animationDuration={800}
                      />
                      <defs>
                          <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="#a5b4fc" stopOpacity={0.5} />
                          </linearGradient>
                      </defs>
                  </BarChart>
              </ResponsiveContainer>
          </div>
                    
          <div className="text-center mt-10 text-lg text-zinc-700 dark:text-zinc-300">
            🏆 Melhor desempenho: <strong className="text-green dark:text-blue">{bestRound.correct_proverb}</strong> acertos na jogada <strong className='text-green'>{bestRound.round}</strong>
          </div>
        </>

      )}
    </div>
  )
}


// Função para salvar progresso após cada rodada
export const saveProgress = (correct_proverb: number) => {
    if (typeof window === 'undefined') return
    const saved = localStorage.getItem('progress_answers')
    const parsed = saved ? JSON.parse(saved) : []
    const round = parsed.length + 1
    parsed.push({ round, correct_proverb })
    localStorage.setItem('progress_answers', JSON.stringify(parsed))
}