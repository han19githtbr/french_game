/*'use client'*/
import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { createAblyClient } from './lib/ably'
import type * as Ably from 'ably'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import type { RealtimeChannel } from 'ably';


import dynamic from "next/dynamic";

const Picker = dynamic(() => import("@emoji-mart/react"), { ssr: false });


type Player = {
  clientId: string
  name: string
  avatarUrl?: string;
}

type ShowNotification =
  | {
      name: string;
      type: 'join' | 'leave';
    }
  | null;

interface ChatRequest {
  fromClientId: string;
  fromName: string;
  fromAvatar: string;
  toClientId: string;
}

type ChatBoxProps = {
  clientId: string;
  partner: Player;
  channel: RealtimeChannel;
};

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: number;
};

interface TypingEvent {
  from: string; // clientId
  isTyping: boolean;
}

interface OnlineNotificationsProps {
  playersOnline: Player[];
  handleRequestChat: (player: Player) => void;
  openChatBubble: (player: Player) => void;
}

export default function Game() {
    
  const { data: session, status } = useSession()
  const router = useRouter()
    
  const [playersOnline, setPlayersOnline] = useState<Player[]>([])
  const [showPlayersOnline, setShowPlayersOnline] = useState(false);
  
  const [showNotification, setShowNotification] = useState<ShowNotification | null>(null)
  
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);

  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null)
  const [clientId, setClientId] = useState<string | null>(null);
    
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [incomingRequest, setIncomingRequest] = useState<ChatRequest | null>(null);
  const [privateChannel, setPrivateChannel] = useState<RealtimeChannel | null>(null);
  const [chatPartner, setChatPartner] = useState<Player | null>(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  
  const playerName = session?.user?.name || 'Anônimo';

  
  const playEnterSound = () => {
    const audio = new Audio('/sounds/enter.mp3');
    audio.play().catch((err) => {
      console.warn('Failed to play sound:', err);
    });
  };
  

  const playRequestSound = () => {
    const audio = new Audio('/sounds/request.mp3');
    audio.play().catch((err) => {
      console.warn('Failed to play request sound:', err);
    });
  };

  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router]);
  

  useEffect(() => {
    if (!ablyClient) return;
    const channel = ablyClient.channels.get("presence-chat");
  
    const fetchOnlinePlayers = async () => {
      const members = await channel.presence.get();
      const players: Player[] = members.map((m) => ({
        clientId: m.clientId,
        name: m.data.name,
        avatarUrl: m.data.avatarUrl,
      }));
      setPlayersOnline(players);
    };
  
    if (showPlayersOnline) fetchOnlinePlayers();
  }, [ablyClient, showPlayersOnline]);


  useEffect(() => {
    if (!ablyClient || !clientId || !playerName) return;
  
    const presenceChannel = ablyClient.channels.get("presence-chat");
  
    presenceChannel.presence.enter({ name: playerName, avatarUrl: session?.user?.image });
  
    presenceChannel.presence.subscribe("enter", (member) => {
      if (member.clientId !== clientId) {
        setShowNotification({ name: member.data.name, type: 'join' });
        setNotificationCount((prev) => prev + 1);
        playEnterSound();
      }
    });
  
    presenceChannel.presence.subscribe("leave", (member) => {
      if (member.clientId !== clientId) {
        setShowNotification({ name: member.data.name, type: 'leave' });
        setNotificationCount((prev) => prev + 1);
      }
    });
  
    return () => {
      presenceChannel.presence.leave();
      presenceChannel.presence.unsubscribe();
    };
  }, [ablyClient, clientId, playerName]);
  

  useEffect(() => {
    if (showNotification) {
      const timeout = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showNotification]);
 
  // Enviar chat request
  const sendChatRequest = (toPlayer: Player) => {
    const request: ChatRequest = {
      fromClientId: clientId!,
      fromName: playerName,
      fromAvatar: session?.user?.image || "",
      toClientId: toPlayer.clientId,
    };
  
    ablyClient?.channels.get("presence-chat").publish("chat-request", request);
  };
  

  useEffect(() => {
    const channel = ablyClient?.channels.get("presence-chat");
  
    const handleRequest = (msg: any) => {
      const req: ChatRequest = msg.data;
      if (req.toClientId === clientId) {
        setIncomingRequest(req);
        playRequestSound();
      }
    };
  
    channel?.subscribe("chat-request", handleRequest);
  
    return () => {
      channel?.unsubscribe("chat-request", handleRequest);
    };
  }, [ablyClient, clientId]);
  

  const getPrivateChannelName = (id1: string, id2: string) =>
    `private-chat:${[id1, id2].sort().join("-")}`;
  

  const acceptRequest = (req: ChatRequest) => {
    const channelName = getPrivateChannelName(req.fromClientId, clientId!);
    const channel = ablyClient?.channels.get(channelName);
  
    if (!channel) return; // impede erro
  
    setChatPartner({
      clientId: req.fromClientId,
      name: req.fromName,
      avatarUrl: req.fromAvatar,
    });
    setPrivateChannel(channel);
    setIncomingRequest(null);
  };
  


  const ChatBox = ({ clientId, partner, channel }: ChatBoxProps) => {
    const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
    const [input, setInput] = useState("");
  
  useEffect(() => {
      channel.subscribe("message", (msg) => {
        setMessages((prev) => [...prev, msg.data]);
      });
  
      return () => {
        channel.unsubscribe("message");
      };
  }, [channel]);
  
  const sendMessage = () => {
      if (!input.trim()) return;
      const message = { from: clientId, text: input.trim() };
      channel.publish("message", message);
      setMessages((prev) => [...prev, message]);
      setInput("");
  };


  // Emitir Evento de Digitação no ChatBox
  useEffect(() => {
    if (!input) return;
  
    const typingEvent: TypingEvent = { from: clientId, isTyping: true };
    channel.publish("typing", typingEvent);
  
    const timeout = setTimeout(() => {
      channel.publish("typing", { from: clientId, isTyping: false });
    }, 1000); // Envia "parou de digitar" após 1 segundo sem digitar
  
    return () => clearTimeout(timeout);
  }, [input]);
  

  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.data.from !== clientId) {
        setIsPartnerTyping(msg.data.isTyping);
      }
    };
  
    channel.subscribe("typing", handler);
  
    return () => {
      channel.unsubscribe("typing", handler);
    };
  }, [channel]);


  useEffect(() => {
    const handler = (msg: any) => {
      setMessages((prev) => [...prev, msg.data]);
      new Audio("/sounds/message.mp3").play();
    };
  
    channel.subscribe("message", handler);
  
    return () => {
      channel.unsubscribe("message", handler);
    };
  }, [channel]);
  

  const playRequestSound = () => {
    new Audio("/sounds/notify.mp3").play();
  };

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
    
        {/* Notificação de jogadores online */}
        <div className="fixed top-4 left-4 z-50">
            <button
                onClick={() => {
                setShowPlayersOnline((prev) => !prev);
                setNotificationCount(0); // Zera as notificações
                }}
                className="relative border-2 border-lightblue hover:bg-lightblue text-white rounded-full p-2 shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer mt-4"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1h9v-1a6 6 0 01-12 0v-1c0-2.485-2.099-4.5-4-4s-4 2.015-4 4v1z" />
                </svg>
                {notificationCount > 0 && (
                <span className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-green-500 text-white text-xs rounded-full px-2 py-0.5">
                    {notificationCount}
                </span>
                )}
            </button>
        </div>

        {/* Exibição dos jogadores online */}
        {showPlayersOnline && (
            <div className="absolute top-16 left-4 bg-gray-900 rounded-xl shadow-lg p-4 w-72 z-50 border border-blue-400">
                <h3 className="text-white font-semibold mb-2">Jogadores online</h3>
                <ul className="space-y-2 max-h-64 overflow-y-auto">
                {playersOnline
                    .filter((p) => p.clientId !== clientId)
                    .map((player) => (
                    <li
                        key={player.clientId}
                        className="flex items-center justify-between bg-gray-800 px-3 py-2 rounded-lg hover:bg-gray-700 transition"
                    >
                        <div className="flex items-center space-x-2">
                        <img src={player.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full" />
                        <span className="text-white">{player.name}</span>
                        </div>
                        <button
                        onClick={() => sendChatRequest(player)}
                        className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded-full"
                        >
                        Bate-papo
                        </button>
                    </li>
                    ))}
                </ul>
            </div>
        )}

        {/* Notificação de solicitação de chat */}
        {incomingRequest && (
            <div className="fixed bottom-4 right-4 bg-gray-800 border border-blue-500 rounded-xl p-4 shadow-xl z-50 animate-bounce-in">
                <div className="flex items-center gap-3 mb-3">
                <img src={incomingRequest.fromAvatar} className="w-10 h-10 rounded-full" />
                <span className="text-white font-semibold">
                    {incomingRequest.fromName} quer bater papo!
                </span>
                </div>
                <div className="flex justify-end gap-2">
                <button
                    className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
                    onClick={() => acceptRequest(incomingRequest)}
                >
                    Aceitar
                </button>
                <button
                    className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600"
                    onClick={() => setIncomingRequest(null)}
                >
                    Recusar
                </button>
                </div>
            </div>
        )}

        {/* Caixa de bate-papo privado */}
        {chatPartner && privateChannel && (
        <ChatBox
            clientId={clientId!}
            partner={chatPartner}
            channel={privateChannel}
        />
        )}

        {/* Área de chat com o parceiro */}
        <div className="fixed bottom-4 right-4 bg-gray-900 rounded-xl border border-blue-500 shadow-xl w-80 z-50">
            <div className="bg-blue-800 text-white p-2 rounded-t-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                <img src={partner.avatarUrl} className="w-8 h-8 rounded-full" />
                <span>{partner.name}</span>
                </div>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto space-y-1 text-white text-sm">
                {messages.map((msg, i) => (
                <div
                    key={i}
                    className={`p-2 rounded-md ${
                    msg.from === clientId ? "bg-blue-600 ml-auto text-right" : "bg-gray-700"
                    }`}
                >
                    {msg.text}
                </div>
                ))}
            </div>
            <div className="p-2 flex gap-2">
                {/* Botão de emojis */}
                <button
                onClick={() => setShowPicker(!showPicker)}
                type="button"
                className="text-white text-lg px-2 hover:scale-110"
                >
                😊
                </button>

                {/* Input de mensagem */}
                <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-800 rounded px-2 py-1 text-white"
                placeholder="Digite..."
                />
                <button
                onClick={sendMessage}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 rounded"
                >
                Enviar
                </button>

                {/* Seletor de emojis */}
                {showPicker && (
                <div className="absolute bottom-14 right-2 z-50">
                    <Picker
                    theme="dark"
                    onSelect={(emoji: any) => {
                        setInput((prev) => prev + emoji.native);
                        setShowPicker(false);
                    }}
                    />
                </div>
                )}
            </div>
        </div>

        {/* Indicador de digitação do parceiro */}
        {isPartnerTyping && (
        <div className="text-xs text-gray-300 px-3 py-1 animate-pulse">
            {partner.name} está digitando...
        </div>
        )}
    </div>
  )
}
}