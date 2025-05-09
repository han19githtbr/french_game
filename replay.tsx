/*const themes = ['família', 'natureza', 'turismo', 'animais', 'tecnologia', 'gastronomia']

interface GameProps {}


export default function Game({}: GameProps) {
  
  const toggleShowWins = () => {
    setShowWins(!showWins);
    setShowConquestCarousel(!showConquestCarousel);
    //setHasNewConquest(false);
    setNewConquestCount(0); // Resetar o contador ao abrir o carrossel
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
      setReplayIntervalId(null);
      setReplayIndex(0);
    } else if (publishedConquests.length > 0 && !showConquestCarousel) {
      startAutomaticReplay(publishedConquests[selectedConquestIndex].plays);
    } else if (showConquestCarousel) {
      stopAutomaticReplay();
    }
  };
 

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
    const storedConquests = localStorage.getItem('conquests');
    if (storedConquests) {
      const parsedConquests: Conquest[] = JSON.parse(storedConquests);
      // Filtrar as conquistas para manter apenas as do dia atual
      const currentDate = getFormattedDate();
      const filteredConquests = parsedConquests.filter((conquest: Conquest) => conquest.date === currentDate); // Use a interface Conquest no filtro
      setPublishedConquests(filteredConquests);

    }
  }, [status, router]);


  // Salvar as conquistas no localStorage sempre que publishedConquests mudar
  useEffect(() => {
    // Adicionar a data atual a cada conquista antes de salvar
    const conquestsWithDate = publishedConquests.map(conquest => ({ ...conquest, date: getFormattedDate() }));
    localStorage.setItem('conquests', JSON.stringify(conquestsWithDate));
  }, [publishedConquests]);

  
  const checkAnswer = (index: number, userAnswer: string) => {
    playAnimalSound(images[index].title)
      
    const correct_word = images[index].title.toLowerCase() === userAnswer.toLowerCase()
    const alreadyCorrect = results[index]?.correct_word
      
    if (correct_word && !alreadyCorrect && correctSound) correctSound.play()
    if (!correct_word && wrongSound) wrongSound.play()
      
    const newResults = [...results]; // agora é um array!
    newResults[index] = { correct_word, selected: userAnswer };  
  
    setResults(newResults);
       
    // Armazenar a jogada atual para a gravação
    setCurrentRoundPlays(prev => [...prev, { image: images[index], answer: userAnswer, correct: correct_word }]);


    // ⏬ Scroll para a próxima imagem ainda não respondida (com pequeno delay)
    setTimeout(() => {
      const nextUnansweredIndex = newResults.findIndex((res, i) => !res && i > index)
      const nextRef = imageRefs.current[nextUnansweredIndex]
      if (nextUnansweredIndex !== -1 && nextRef) {
        nextRef.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 300)
        
    const currentCorrectCount = Object.values(newResults).filter((r) => r?.correct_word).length;
    setCorrectAnswersCount(currentCorrectCount);
    const totalCount = images.length
    const hasWrong = Object.values(newResults).some(r => r && !r.correct_word)
  
    //saveProgress(correctCount);
  
    saveProgress(currentCorrectCount);
      
    // Se errou alguma imagem, mostra botão para recomeçar
    if (hasWrong) {
      setShowRestart(true)
    }
      
    if (currentCorrectCount === totalCount) {
      setShowCongrats(true)
      setShowPublishButton(true); // Mostrar o botão de publicação

      // Salvar progresso no localStorage
      const prevProgress = JSON.parse(localStorage.getItem('progress') || '[]')
      localStorage.setItem('progress', JSON.stringify([...prevProgress, { round, correct: currentCorrectCount }]))
          
      // Adiciona os acertos da rodada ao histórico de revisão
      const currentRoundCorrect = images.filter((_, i) => newResults[i]?.correct_word).map(img => ({
        url: img.url,
        title: img.title,
      }));
      if (currentRoundCorrect.length > 0) {
        setReviewHistory(prev => [...prev, ...currentRoundCorrect]);
        setAvailableReviews(prev => prev + currentRoundCorrect.length);
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 2000);
      }

      setTimeout(() => {
        const nextTheme = themes.filter(t => t !== theme)[Math.floor(Math.random() * (themes.length - 1))]
        setTheme(nextTheme)
        setRound(r => r + 1)
        setShowCongrats(false);
        setShowPublishButton(false); // Esconder o botão após a transição
      }, 10000);
  
      if (successSound) {
        successSound.play();
      }
    }
  };
  

  const handlePublishConquest = () => {
    const videoData: Conquest = {
      user: session?.user?.name || 'Anônimo',
      plays: currentRoundPlays,
      views: 0,
      timestamp: new Date(),
      date: getFormattedDate(),

    };
    setPublishedConquests(prev => [...prev, videoData]);
    setNewConquestCount(prev => prev + 1);
    toast.success('Conquista publicada com sucesso!', {
      position: "top-right", // Onde a notificação aparecerá
      autoClose: 3000, // Tempo em milissegundos para fechar automaticamente
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light", // Ou "dark", se preferir
    });
    setShowPublishButton(false);
    setCurrentRoundPlays([]);
  };


  const startAutomaticReplay = (plays: any[]) => {
    setReplayPlays(plays);
    setReplayIndex(0);
    stopAutomaticReplay();
    const intervalId = setInterval(() => {
      setReplayIndex(prev => {
        if (prev < plays.length - 1) {
          return prev + 1;
        } else {
          clearInterval(intervalId);
          setReplayIntervalId(null);
          return prev;
        }
      });
    }, 6000); // Ajuste o tempo (em ms) entre as jogadas
    setReplayIntervalId(intervalId);
  };

  
  const stopAutomaticReplay = () => {
    if (replayIntervalId) {
      clearInterval(replayIntervalId);
      setReplayIntervalId(null);
      setReplayIndex(0);
    }
  };

  const closeConquestCarousel = () => {
    setShowConquestCarousel(false);
    stopAutomaticReplay();
  };
 

  const handleSelectConquest = (index: number) => {
    setSelectedConquestIndex(index);
    startAutomaticReplay(publishedConquests[index].plays);
  };

  // Função para incrementar o contador de visualizações
  const incrementViewCount = (index: number) => {
    const updatedConquests = [...publishedConquests];
    updatedConquests[index].views += 1;
    setPublishedConquests(updatedConquests);
  };


  const currentReplayPlay = replayPlays[replayIndex];
  const currentConquest = publishedConquests[selectedConquestIndex];
  

  const handleOpenReview = () => {
    if (isReviewUnlocked) {
      setShowReviewModal(true);
      setCurrentReviewIndex(0);
      startReviewVideo();
      setAvailableReviews(0); // Marca as revisões como assistidas
      setIsReviewPaused(false); // Inicializa como não pausado ao abrir
    } else {
      setShowLockMessage(true);
      setTimeout(() => {
        setShowLockMessage(false);
      }, 2000);
    }
  };

  const handleCloseReview = () => {
    setShowReviewModal(false);
    stopReviewVideo();
    setIsReviewPaused(false); // Reseta o estado de pausa ao fechar
  };

  const startReviewVideo = () => {
    stopReviewVideo();
    reviewIntervalRef.current = setInterval(() => {
      setCurrentReviewIndex(prev => (prev + 1) % reviewHistory.length);
    }, 5000); // Ajuste a velocidade do "vídeo" aqui (ms)
    setIsReviewPaused(false); // Atualiza o estado para não pausado
  };

  const stopReviewVideo = () => {
    if (reviewIntervalRef.current) {
      clearInterval(reviewIntervalRef.current);
      reviewIntervalRef.current = null;
      setIsReviewPaused(true); // Atualiza o estado para pausado
    }
  };

  const handlePauseResumeReview = () => {
    if (reviewIntervalRef.current) {
      stopReviewVideo();
    } else {
      startReviewVideo();
    }
  };

  const isReviewAvailable = availableReviews > 0;

}*/ 