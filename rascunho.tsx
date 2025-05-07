/*interface GameProps {}

export default function Game({}: GameProps) {
    const [showNotification, setShowNotification] = useState<{
    name: string;
    type: "join" | "leave";
  } | null>(null);
  
  useEffect(() => {
    if (showNotification) {
      const timeout = setTimeout(() => setShowNotification(null), 3000);
      return () => clearTimeout(timeout);
    }
  }, [showNotification]);

    
  // Cria o Ably client assim que clientId estiver disponível
  useEffect(() => {
    if (!clientId) return;

    const client = createAblyClient(clientId);
    setAblyClient(client);

    return () => client.close();
  }, [clientId]);


  const hasEnteredRef = useRef(false);
  
  useEffect(() => {
    if (!ablyClient || !clientId || !playerName  || hasEnteredRef.current) return;
  
    const presenceChannel = ablyClient.channels.get("presence-chat");
            
    const avatarUrl = session?.user?.image ?? "";

    const handleEnter = (member: any) => {
      if (member.clientId !== clientId) {
        setPlayersOnline((prev) => {
          const alreadyExists = prev.some(p => p.clientId === member.clientId);
          if (alreadyExists) return prev;
          return [...prev, {
            clientId: member.clientId,
            name: member.data?.name ?? "Desconhecido",
            avatarUrl: member.data?.avatarUrl ?? "",
          }];
        });
        
        setShowNotification({ name: member.data?.name ?? "Desconhecido", type: 'join' });
        setNotificationCount((prev) => prev + 1);
        playEnterSound();
      }
    };

    const handleLeave = (member: any) => {
      if (member.clientId !== clientId) {
        setPlayersOnline((prev) => prev.filter(p => p.clientId !== member.clientId));
        setShowNotification({ name: member.data?.name ?? "Desconhecido", type: 'leave' });
        setNotificationCount((prev) => prev + 1);
      }
    };

    // Primeiro inscreve-se nos eventos
    presenceChannel.presence.subscribe("enter", handleEnter);
    presenceChannel.presence.subscribe("leave", handleLeave);

    // ✅ Aguarda a conexão com Ably antes de entrar no canal
    ablyClient.connection.once('connected', () => {
      presenceChannel.presence.enter({ name: playerName, avatarUrl }).then(() => {
        hasEnteredRef.current = true;

        presenceChannel.presence.get().then((members) => {
          //const alreadyPresent = members.some(m => m.clientId === clientId);
          const players: Player[] = members
            .filter(m => m.clientId !== clientId)
            .map((m) => ({
              clientId: m.clientId,
              name: m.data?.name ?? "Desconhecido",
              avatarUrl: m.data?.avatarUrl ?? "",
            }));
          setPlayersOnline(players);
        });
      });
    });
        
    return () => {
      presenceChannel.presence.leave();
      presenceChannel.presence.unsubscribe("enter", handleEnter);
      presenceChannel.presence.unsubscribe("leave", handleLeave);
      hasEnteredRef.current = false;
    };
  }, [ablyClient, clientId, playerName, session]);

  
  const playEnterSound = () => {
    const audio = new Audio('/sounds/login.mp3');
    audio.play().catch((err) => {
      console.warn('Failed to play sound:', err);
    });
  };
 

  const playRequestSound = () => {
    const audio = new Audio('/sounds/received_sound.mp3');
    audio.play().catch((err) => {
      console.warn('Failed to play request sound:', err);
    });
  };

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router]);

      
  useEffect(() => {
    if (!ablyClient || !showPlayersOnline) return;
    const channel = ablyClient.channels.get("presence-chat");
  
    const fetchOnlinePlayers = async () => {
      const members = await channel.presence.get();
      const players: Player[] = members.map((m) => ({
        clientId: m.clientId,
        name: m.data?.name ?? "Desconhecido",
        avatarUrl: m.data?.avatarUrl ?? "",
      }));
      setPlayersOnline(players);
    };
  
    fetchOnlinePlayers();
  }, [ablyClient, showPlayersOnline]);


  // Enviar chat request
  const sendChatRequest = (toPlayer: Player) => {
    // Checagem de integridade mínima
    if (!ablyClient || !clientId || !toPlayer?.clientId) return;
    
    const request: ChatRequest = {
      fromClientId: clientId!,
      fromName: playerName,
      fromAvatar: session?.user?.image || "",
      toClientId: toPlayer.clientId,
    };
  
    ablyClient?.channels.get("presence-chat").publish("chat-request", request);
  };


  useEffect(() => {
    if (!ablyClient || !clientId) return;

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


  const ChatBox = ({ clientId, chatPartner, channel }: ChatBoxProps) => {
    const [messages, setMessages] = useState<{ from: string; text: string }[]>([]);
    const [input, setInput] = useState("");
    const [isPartnerTyping, setIsPartnerTyping] = useState(false);
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  
    useEffect(() => {
      if (!channel || !clientId) return;

      const handler = (msg: any) => {
        setMessages((prev) => [...prev, msg.data]);
        new Audio("/sounds/message.mp3").play();
      };
      channel.subscribe("message", handler);
      return () => channel.unsubscribe("message", handler);
    }, [channel, clientId]);
  
    useEffect(() => {
      if (!channel || !clientId) return;

      const handler = (msg: any) => {
        if (msg.data.from !== clientId) {
          setIsPartnerTyping(msg.data.isTyping);
        }
      };
      channel.subscribe("typing", handler);
      return () => channel.unsubscribe("typing", handler);
    }, [channel, clientId]);
  
        
    useEffect(() => {
      if (!channel || !clientId || !input) return;
    
      channel?.publish("typing", { from: clientId, isTyping: true });
    
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    
      typingTimeout.current = setTimeout(() => {
        channel.publish("typing", { from: clientId, isTyping: false });
      }, 1000);
    
      return () => {
        if (typingTimeout.current) {
          clearTimeout(typingTimeout.current);
        }
      };
    }, [input, channel, clientId]);
  

    const sendMessage = () => {
      if (!input.trim()) return;
      const message = { from: clientId, text: input.trim() };
      channel.publish("message", message);
      setMessages((prev) => [...prev, message]);
      setInput("");
    };
}
}*/