/*export default function Game() {
    
  // Move as declarações das funções para fora do useEffect
  const handleChatMessage = (message: Ably.Message) => {
    const { sender, text, timestamp } = message.data;
    const channelName = message.name; // [CORRIGIDO] O nome do canal contém os IDs dos participantes
    const otherClientId = channelName?.split(':')[1]?.split('-')?.find(id => id !== clientId);
    const otherUserName = playersOnline.find(player => player.clientId === otherClientId)?.name || 'Usuário Desconhecido';

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
        // Reproduzir som ao receber um pedido de bate-papo
        chatRequestReceivedSoundRef.current?.play();
      });
  
      chatRequestChannel.subscribe('response', (message: Ably.Message) => {
        const { accepted, fromClientId, fromName } = message.data;
        if (accepted) {
          // Reproduzir som ao receber uma resposta (aceitar ou recusar)
          chatRequestResponseSoundRef.current?.play();
          //alert(`🤝 ${fromName} aceitou seu pedido de bate-papo!`);
          showToast(`🤝 ${fromName} aceitou seu pedido de bate-papo!`, 'info');
          const chatChannelName = getChatChannelName(currentClientId, fromClientId);
          setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
          setIsChatBubbleOpen(chatChannelName);
          setChatPartnerName(fromName);
          // [ACRESCENTADO] Inscrever-se no canal de mensagens quando o chat é aceito
          ablyClient.channels.get(chatChannelName).subscribe('message', handleChatMessage);
          // [ACRESCENTADO] Inscrever-se no canal de digitação quando o chat é aceito
          ablyClient.channels.get(getTypingChannelName(currentClientId, fromClientId)).subscribe('typing', handleTypingStatus);
        } else {
          //alert(`❌ ${fromName} negou seu pedido de bate-papo.`);
          showToast(`❌ ${fromName} negou seu pedido de bate-papo.`, 'info');
        }
      });
        
    };

    ablyClient.connection.once('connected', onConnected);

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
        ablyClient?.channels.get(channelName)?.unsubscribe('message', handleChatMessage);
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
   
  
  const handleRequestChat = (otherPlayer: Player) => {
    if (!ablyClient || !clientId) return;
    const chatRequestChannel = ablyClient.channels.get(`chat-requests:${otherPlayer.clientId}`);
    chatRequestChannel.publish('request', { fromClientId: clientId, fromName: playerName });
    //alert(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`);
    showToast(`⏳ Pedido de bate-papo enviado para ${otherPlayer.name}. Aguardando resposta...`, 'info');
  };
  
  const handleAcceptChatRequest = (request: ChatRequest) => {
    if (!ablyClient || !clientId) return;
    const responseChannel = ablyClient.channels.get(`chat-requests:${request.fromClientId}`);
    responseChannel.publish('response', { accepted: true, fromClientId: clientId, fromName: playerName });
    const chatChannelName = getChatChannelName(clientId, request.fromClientId);
    setActiveChats((prev) => ({ ...prev, [chatChannelName]: [] }));
    setIsChatBubbleOpen(chatChannelName);
    setChatPartnerName(request.fromName);
    setChatRequestsReceived((prev) => prev.filter((req) => req.fromClientId !== request.fromClientId));
    
    // [CORREÇÃO] Inscrever-se nos canais de mensagens e digitação AQUI para o receptor
    ablyClient.channels.get(chatChannelName).subscribe('message', handleChatMessage);
    const typingChannelName = getTypingChannelName(clientId, request.fromClientId);
    ablyClient.channels.get(typingChannelName).subscribe('typing', handleTypingStatus);
    
    // [ACRESCENTADO] Abrir a bolha de chat após a aceitação
    openChatBubble({ clientId: request.fromClientId, name: request.fromName });
    // Reproduzir som ao aceitar um pedido
    chatRequestResponseSoundRef.current?.play();
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
  
}*/
  