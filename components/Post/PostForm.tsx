import { useState, useRef, ChangeEvent, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '../../models/Post';
import { uploadImage } from '../../lib/utils';

const themes = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];

// French narration templates based on theme and video prompt keywords
const getNarrationSuggestions = (prompt: string, theme: string): string[] => {
  const suggestions: Record<string, string[]> = {
    Natureza: [
      "Regardez comme la nature s'éveille doucement sous nos yeux émerveillés. Chaque mouvement, chaque geste raconte l'histoire silencieuse du monde vivant.",
      "La beauté sauvage de cet instant nous rappelle la puissance et la délicatesse de Mère Nature. Un spectacle à couper le souffle.",
      "Dans ce coin préservé, la vie suit son cours paisiblement. Observons avec respect ces merveilles qui nous entourent."
    ],
    Turismo: [
      "Bienvenue dans ce lieu emblématique où l'histoire et la modernité se rencontrent. Chaque coin de rue cache une merveille à découvrir.",
      "Découvrons ensemble les secrets bien gardés de cette destination unique. Préparez vos yeux et votre cœur pour l'aventure.",
      "Le voyage nous transforme. Laissez-vous porter par l'âme de cette région authentique et chaleureuse."
    ],
    Gastronomia: [
      "Les saveurs s'entremêlent dans une danse délicate. Chaque bouchée est une invitation au voyage gustatif.",
      "La cuisine, c'est l'art de transformer des ingrédients simples en émotions inoubliables. Regardez comme c'est beau.",
      "Entre tradition et créativité, ce plat raconte des générations de passionnés. Un véritable héritage culinaire."
    ],
    Cultura: [
      "La culture nous unit, nous élève et nous transforme. Ce que vous voyez est l'expression pure d'une identité riche et fière.",
      "Plongez au cœur de cette tradition ancestrale qui continue de vibrer aujourd'hui encore. Un héritage précieux.",
      "L'art et la culture sont les miroirs de l'âme humaine. Ce moment partagé est une fenêtre sur notre humanité."
    ],
    Tecnologia: [
      "La technologie repousse sans cesse les frontières du possible. Observez l'innovation prendre vie sous vos yeux.",
      "Le futur est déjà là. Chaque avancée technologique nous rapproche un peu plus de nos rêves les plus fous.",
      "Entre code et créativité, naissent des merveilles modernes. Regardez le monde se transformer en temps réel."
    ],
    Ditados: [
      "Comme dit le proverbe, une image vaut mille mots. Cette scène illustre parfaitement la sagesse populaire.",
      "Les anciens savaient. Leurs paroles résonnent encore dans chaque geste, chaque instant de vie capturé ici.",
      "Ce moment est une leçon de vie silencieuse. Écoutons ce qu'il a à nous apprendre."
    ],
    Pensamentos: [
      "Un instant de réflexion s'impose. Que voyez-vous ? Que ressentez-vous ? Laissez vos pensées vagabonder.",
      "Dans le silence de l'image, se cachent mille histoires. Prenez le temps d'écouter votre propre interprétation.",
      "Ce tableau vivant nous invite à la contemplation. Fermez les yeux un instant, puis ouvrez-les sur l'essentiel."
    ]
  };

  // Custom suggestion based on prompt keywords
  const customSuggestions: string[] = [];
  
  if (prompt.toLowerCase().includes('oiseau') || prompt.toLowerCase().includes('bird')) {
    customSuggestions.push("L'oiseau déploie ses ailes avec grâce, s'élevant vers le ciel comme une promesse de liberté. Un spectacle naturel d'une beauté rare.");
  }
  if (prompt.toLowerCase().includes('mer') || prompt.toLowerCase().includes('sea') || prompt.toLowerCase().includes('ocean')) {
    customSuggestions.push("Les vagues dansent au rythme des marées, un ballet éternel entre la terre et l'océan. La mer nous offre son plus beau spectacle.");
  }
  if (prompt.toLowerCase().includes('ville') || prompt.toLowerCase().includes('city')) {
    customSuggestions.push("La ville vibre d'énergie. Entre ombre et lumière, les rues racontent les histoires de ceux qui les traversent.");
  }
  if (prompt.toLowerCase().includes('fleur') || prompt.toLowerCase().includes('flower')) {
    customSuggestions.push("La fleur s'épanouit doucement, offrant sa beauté éphémère au monde qui l'entoure. Un moment de grâce pure.");
  }

  const themeSuggestions = suggestions[theme] || suggestions.Cultura;
  const allSuggestions = [...customSuggestions, ...themeSuggestions];
  
  return allSuggestions.slice(0, 3);
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function PostForm({ onPostCreated }: { onPostCreated: () => void }) {
  const { data: session } = useSession();

  // form fields
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [theme, setTheme] = useState(themes[0]);
  const [isPermanent, setIsPermanent] = useState(false);
  const [endDate, setEndDate] = useState('');

  // video generation
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoGenStep, setVideoGenStep] = useState<'idle' | 'uploading' | 'generating' | 'done' | 'error'>('idle');
  const [videoError, setVideoError] = useState('');
  const [videoCreatedLocally, setVideoCreatedLocally] = useState(false);

  // French narration
  const [frenchNarration, setFrenchNarration] = useState('');
  const [isGeneratingNarration, setIsGeneratingNarration] = useState(false);
  const [narrationAudioUrl, setNarrationAudioUrl] = useState<string | null>(null);
  const [narrationError, setNarrationError] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const narrationAudioRef = useRef<HTMLAudioElement>(null);

  // submit
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Image change ──────────────────────────────────────────────────────────
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setImage(file);
    setVideoUrl(null);
    setVideoGenStep('idle');
    setVideoError('');
    setVideoCreatedLocally(false);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const generateLocalVideoFallback = async (sourceUrl: string, promptText: string, duration = 5): Promise<string> => {
    if (typeof window === 'undefined') {
      throw new Error('Fallback de vídeo local só funciona no navegador.');
    }
    if (!('MediaRecorder' in window)) {
      throw new Error('Seu navegador não suporta MediaRecorder para gerar vídeo local.');
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = sourceUrl;
      image.onload = () => {
        const width = 640;
        const height = 480;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Falha ao inicializar o contexto de desenho.'));
          return;
        }

        const stream = canvas.captureStream(25);
        const recordedChunks: BlobPart[] = [];
        let recorder: MediaRecorder;

        try {
          recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
        } catch (err) {
          reject(new Error('Seu navegador não suporta gravação de vídeo WebM.'));
          return;
        }

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };
        recorder.onerror = () => reject(new Error('Falha na gravação do vídeo local.'));
        recorder.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          resolve(URL.createObjectURL(blob));
        };

        recorder.start();

        const frameCount = Math.max(1, Math.floor(duration * 20));
        let frame = 0;

        const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
          const words = text.split(' ');
          let line = '';
          for (const word of words) {
            const testLine = line ? `${line} ${word}` : word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth && line) {
              ctx.fillText(line, x, y);
              line = word;
              y += lineHeight;
            } else {
              line = testLine;
            }
          }
          if (line) ctx.fillText(line, x, y);
        };

        const drawFrame = () => {
          const progress = frame / frameCount;
          const zoom = 1 + 0.05 * Math.sin(progress * Math.PI * 2);
          const aspect = image.width / image.height;
          let drawWidth = width * zoom;
          let drawHeight = height * zoom;

          if (aspect > width / height) {
            drawHeight = drawWidth / aspect;
          } else {
            drawWidth = drawHeight * aspect;
          }

          const x = (width - drawWidth) / 2;
          const y = (height - drawHeight) / 2;

          ctx.clearRect(0, 0, width, height);
          ctx.fillStyle = '#121212';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(image, x, y, drawWidth, drawHeight);

          ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
          ctx.fillRect(0, height - 90, width, 90);
          ctx.fillStyle = '#fff';
          ctx.font = '16px sans-serif';
          ctx.textBaseline = 'top';
          wrapText(promptText.trim() || 'Animação gerada localmente', 16, height - 84, width - 32, 22);

          frame += 1;
          if (frame < frameCount) {
            window.requestAnimationFrame(drawFrame);
          } else {
            recorder.stop();
          }
        };

        drawFrame();
      };
      image.onerror = () => reject(new Error('Não foi possível carregar a imagem para o vídeo local.'));
    });
  };

  // ── Generate video with Kling.ai ─────────────────────────────────────────
  const handleGenerateVideo = async () => {
    if (!image || !videoPrompt.trim()) {
      setVideoError('Carregue uma imagem e descreva o vídeo primeiro.');
      return;
    }
    if (videoPrompt.trim().length < 10) {
      setVideoError('Descreva o vídeo com mais detalhes (mínimo 10 caracteres).');
      return;
    }

    setIsGeneratingVideo(true);
    setVideoError('');
    setVideoUrl(null);
    setVideoCreatedLocally(false);

    try {
      // Step 1 – upload source image via Cloudinary
      setVideoGenStep('uploading');
      const uploadedImageUrl = await uploadImage(image);

      // Step 2 – call Kling.ai generation endpoint
      setVideoGenStep('generating');
      const klingRes = await fetch('/api/kling-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: uploadedImageUrl,
          prompt: videoPrompt,
          duration: 5,
        }),
      });

      if (!klingRes.ok) {
        const errData = await klingRes.json().catch(() => ({}));
        throw new Error(errData?.error || `Erro ${klingRes.status} ao gerar vídeo`);
      }

      const klingData = await klingRes.json();
      const generatedVideoUrl: string = klingData.videoUrl;

      setVideoCreatedLocally(false);
      setVideoUrl(generatedVideoUrl);
      setVideoGenStep('done');
    } catch (err) {
      setVideoGenStep('error');
      const message = err instanceof Error ? err.message : 'Erro desconhecido ao gerar vídeo';
      const balanceError = /account balance not enough/i.test(message) || /balance.*not enough/i.test(message);

      if (balanceError && imagePreview) {
        try {
          setVideoError('Saldo Kling.ai insuficiente. Tentando gerar vídeo localmente...');
          const fallbackUrl = await generateLocalVideoFallback(imagePreview, videoPrompt, 5);
          setVideoCreatedLocally(true);
          setVideoUrl(fallbackUrl);
          setVideoGenStep('done');
          setVideoError('');
          return;
        } catch (fallbackErr) {
          const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : 'Erro no fallback de vídeo local.';
          setVideoError(`Kling.ai sem saldo e fallback local falhou: ${fallbackMessage}`);
          return;
        }
      }

      if (balanceError) {
        setVideoError('Saldo insuficiente na conta Kling.ai. Reponha créditos no painel Kling.ai ou tente novamente mais tarde.');
      } else {
        setVideoError(message);
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // ── Use Web Speech API for TTS preview ────────────────────────────────────
  const speakWithWebSpeech = (text: string) => {
    if (!window.speechSynthesis) {
      setNarrationError('Seu navegador não suporta síntese de voz.');
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    
    // Try to get a French voice if available
    const setFrenchVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const frenchVoice = voices.find(voice => voice.lang === 'fr-FR' || voice.lang === 'fr');
      if (frenchVoice) utterance.voice = frenchVoice;
    };
    
    if (window.speechSynthesis.getVoices().length > 0) {
      setFrenchVoice();
    } else {
      window.speechSynthesis.onvoiceschanged = setFrenchVoice;
    }
    
    window.speechSynthesis.speak(utterance);
    setNarrationAudioUrl('web-speech');
  };

  // ── Generate narration from suggestions (free, no API key) ─────────────
  const handleGenerateNarrationWithSuggestions = () => {
    const sourceText = videoPrompt.trim() || caption.trim();
    if (!sourceText) {
      setNarrationError('Preencha o prompt do vídeo ou a legenda antes de gerar sugestões.');
      return;
    }

    setIsGeneratingNarration(true);
    setNarrationError('');
    setNarrationAudioUrl(null);
    setShowSuggestions(false);

    try {
      const suggestions = getNarrationSuggestions(sourceText, theme);
      
      if (suggestions.length > 0) {
        // Use the first suggestion as the narration
        const selectedNarration = suggestions[0];
        setFrenchNarration(selectedNarration);
        setShowSuggestions(true);
        setNarrationError('Sugestão gerada! Você pode editar o texto ou usar outras sugestões.');
      } else {
        // Fallback generic narration
        const fallback = `Cette scène captivante nous invite à observer et à réfléchir. Chaque détail raconte une histoire unique, celle d'un monde en mouvement perpétuel. Prenez le temps d'apprécier ce moment précieux.`;
        setFrenchNarration(fallback);
        setShowSuggestions(true);
      }
    } catch (err) {
      setNarrationError('Erro ao gerar sugestão. Por favor, escreva manualmente.');
    } finally {
      setIsGeneratingNarration(false);
    }
  };

  // ── Use alternative suggestion ─────────────────────────────────────────
  const useAlternativeSuggestion = () => {
    const sourceText = videoPrompt.trim() || caption.trim();
    const suggestions = getNarrationSuggestions(sourceText, theme);
    
    // Cycle through suggestions
    const currentIndex = suggestions.findIndex(s => s === frenchNarration);
    const nextIndex = (currentIndex + 1) % suggestions.length;
    setFrenchNarration(suggestions[nextIndex]);
  };

  // ── Preview audio using Web Speech API ─────────────────────────────────
  const handlePreviewAudio = () => {
    if (!frenchNarration.trim()) {
      setNarrationError('Escreva ou gere uma narração primeiro.');
      return;
    }
    speakWithWebSpeech(frenchNarration);
    setNarrationAudioUrl('web-speech');
  };

  // ── Stop audio preview ────────────────────────────────────────────────
  const handleStopAudio = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setNarrationAudioUrl(null);
  };

  // ── Submit post ───────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    if (!caption.trim()) {
      setError('A legenda (descrição narrativa) é obrigatória.');
      setIsLoading(false);
      return;
    }
    if (!image) {
      setError('Carregue uma imagem base para a publicação.');
      setIsLoading(false);
      return;
    }
    if (!isPermanent && !endDate) {
      setError('Informe quantos dias a publicação ficará disponível.');
      setIsLoading(false);
      return;
    }

    try {
      // Upload source image via Cloudinary
      const imageUrl = await uploadImage(image);

      const newPost: Omit<Post, '_id'> = {
        caption,
        imageUrl,
        ...(videoUrl ? { videoUrl, videoPrompt } : {}),
        ...(frenchNarration.trim() ? { frenchNarration: frenchNarration.trim() } : {}),
        theme: theme as Post['theme'],
        startDate: new Date(),
        endDate: isPermanent
          ? null
          : new Date(Date.now() + parseInt(endDate) * 24 * 60 * 60 * 1000),
        likes: 0,
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.message || 'Erro ao criar publicação');
      }

      // Reset
      setCaption('');
      setImage(null);
      setImagePreview(null);
      setVideoUrl(null);
      setVideoPrompt('');
      setVideoGenStep('idle');
      setVideoError('');
      setFrenchNarration('');
      setNarrationAudioUrl(null);
      setNarrationError('');
      setShowSuggestions(false);
      setIsPermanent(false);
      setEndDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      onPostCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  // Cleanup speech on unmount
  const cleanupSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  
  // Component cleanup
  useEffect(() => {
    return cleanupSpeech;
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto border border-gray-700">
      <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
        🎬 Criar Nova Publicação
      </h2>
      <p className="text-gray-400 text-sm mb-5">
        Carregue uma foto, descreva o comportamento e gere um vídeo animado via Kling.ai com narração em francês.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-900/60 border border-red-500 text-red-200 rounded-lg text-sm">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-900/60 border border-green-500 text-green-200 rounded-lg text-sm">
          ✅ Publicação criada com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Tema ── */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">Tema</label>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer text-sm"
          >
            {themes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* ── Imagem base ── */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            📷 Imagem base <span className="text-gray-500">(a partir dela o vídeo será gerado)</span>
          </label>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-gray-400 text-sm
              file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-cyan-600
              file:bg-gray-900 file:text-cyan-300 file:text-sm file:font-medium
              hover:file:bg-cyan-900/30 cursor-pointer transition"
          />
          {imagePreview && (
            <div className="mt-3 relative">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-56 object-cover rounded-lg border border-gray-600"
              />
              <span className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md">
                Imagem selecionada
              </span>
            </div>
          )}
        </div>

        {/* ── Prompt do vídeo ── */}
        {image && (
          <div className="bg-gray-900/60 border border-cyan-800/50 rounded-xl p-4 space-y-3">
            <h3 className="text-cyan-300 font-semibold text-sm flex items-center gap-2">
              🎥 Animação com IA (Kling.ai)
            </h3>
            <div>
              <label className="block text-gray-300 text-sm mb-1.5">
                Descreva o vídeo <span className="text-gray-500">— como se fosse a sinopse de um filme</span>
              </label>
              <textarea
                rows={3}
                placeholder="Ex: O pássaro bate as asas lentamente e alça voo em direção ao horizonte dourado do pôr do sol..."
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none placeholder-gray-600"
              />
            </div>

            {/* Generate video button */}
            <button
              type="button"
              onClick={handleGenerateVideo}
              disabled={isGeneratingVideo || !videoPrompt.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-700 to-blue-700 hover:from-cyan-600 hover:to-blue-600
                text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 text-sm"
            >
              {isGeneratingVideo ? (
                <>
                  <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  {videoGenStep === 'uploading' ? 'Enviando imagem...' : 'Gerando vídeo com IA...'}
                </>
              ) : videoGenStep === 'done' ? (
                '✅ Vídeo gerado — gerar novamente'
              ) : (
                '✨ Gerar vídeo animado'
              )}
            </button>

            {videoError && (
              <p className="text-red-400 text-xs mt-1">⚠️ {videoError}</p>
            )}

            {videoCreatedLocally && videoUrl && (
              <p className="text-emerald-300 text-xs mt-1">🎬 Vídeo criado localmente com fallback gratuito.</p>
            )}

            {/* Video preview */}
            {videoUrl && videoGenStep === 'done' && (
              <div className="mt-3">
                <p className="text-green-400 text-xs mb-2 font-medium">✅ Vídeo gerado com sucesso! Preview:</p>
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  muted
                  loop
                  className="w-full rounded-lg border border-green-700/40 max-h-56 object-cover"
                />
              </div>
            )}

            <p className="text-gray-500 text-xs">
              💡 O vídeo substitui a imagem na publicação. Curtidas e comentários continuam funcionando normalmente.
            </p>
          </div>
        )}

        {/* ── Narração em Francês (Sem API paga!) ── */}
        <div className="bg-gray-900/60 border border-yellow-800/50 rounded-xl p-4 space-y-3">
          <h3 className="text-yellow-300 font-semibold text-sm flex items-center gap-2">
            🎙️ Narração em Francês
            <span className="text-gray-500 font-normal">(tocada automaticamente quando o vídeo for assistido)</span>
          </h3>

          <div className="text-xs text-emerald-400 bg-emerald-900/30 p-2 rounded-lg">
            💚 Sem custo extra! Usamos Web Speech API para voz em francês e sugestões pré-definidas.
          </div>

          <div>
            <label className="block text-gray-300 text-sm mb-1.5">
              Texto da narração em francês <span className="text-gray-500">— estilo documentário</span>
            </label>
            <textarea
              rows={4}
              placeholder="Ex: Un merle posé sur la branche observe le monde avec curiosité. Soudain, il déploie ses ailes et s'envole vers un autre arbre, portant avec lui la légèreté du matin..."
              value={frenchNarration}
              onChange={(e) => {
                setFrenchNarration(e.target.value);
                setNarrationAudioUrl(null);
              }}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-yellow-500 text-sm resize-none placeholder-gray-600"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {/* Generate suggestions button (FREE - no API key) */}
            <button
              type="button"
              onClick={handleGenerateNarrationWithSuggestions}
              disabled={isGeneratingNarration}
              className="flex-1 py-2 px-3 bg-yellow-800/50 hover:bg-yellow-700/60 border border-yellow-700/50
                text-yellow-300 font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 text-sm"
            >
              {isGeneratingNarration ? (
                <>
                  <span className="animate-spin inline-block w-3 h-3 border-2 border-yellow-300 border-t-transparent rounded-full"></span>
                  Gerando sugestão...
                </>
              ) : (
                '✨ Sugerir narração (grátis)'
              )}
            </button>

            {/* Alternative suggestion button */}
            {showSuggestions && frenchNarration && (
              <button
                type="button"
                onClick={useAlternativeSuggestion}
                className="py-2 px-3 bg-purple-800/50 hover:bg-purple-700/60 border border-purple-700/50
                  text-purple-300 font-medium rounded-lg text-sm transition"
              >
                🔄 Outra sugestão
              </button>
            )}

            {/* Preview audio button - Web Speech API */}
            {frenchNarration.trim() && (
              <button
                type="button"
                onClick={narrationAudioUrl === 'web-speech' ? handleStopAudio : handlePreviewAudio}
                className="py-2 px-3 bg-gray-700 hover:bg-gray-600 border border-gray-600
                  text-gray-300 rounded-lg text-sm transition flex items-center gap-1"
              >
                {narrationAudioUrl === 'web-speech' ? '⏹️ Parar áudio' : '🔊 Ouvir prévia (grátis)'}
              </button>
            )}
          </div>

          {narrationError && (
            <p className="text-orange-400 text-xs">ℹ️ {narrationError}</p>
          )}

          {narrationAudioUrl === 'web-speech' && (
            <div className="mt-2 p-2 bg-cyan-900/30 rounded-lg">
              <p className="text-green-400 text-xs mb-1.5 font-medium flex items-center gap-1">
                🎤 Áudio sendo reproduzido com Web Speech API:
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-cyan-400 animate-pulse rounded-full"></div>
                </div>
                <span className="text-xs text-gray-400">voz natural do navegador</span>
              </div>
            </div>
          )}

          <p className="text-gray-500 text-xs">
            💡 <strong>100% gratuito!</strong> As sugestões são geradas localmente baseadas no tema e descrição. 
            O áudio usa a Web Speech API do seu navegador (qualidade de voz depende do sistema). 
            Você também pode escrever ou editar manualmente o texto.
          </p>
        </div>

        {/* ── Legenda narrativa ── */}
        <div>
          <label className="block text-gray-300 text-sm font-medium mb-1.5">
            📝 Legenda narrativa <span className="text-gray-500">— descreva como se o usuário assistisse a um filme</span>
          </label>
          <textarea
            rows={3}
            placeholder="Ex: Nas ruas de Paris, um músico toca acordeão enquanto a Torre Eiffel brilha ao fundo..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg
              focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm resize-none placeholder-gray-600"
            required
          />
        </div>

        {/* ── Duração ── */}
        <div className="flex items-center gap-3">
          <label className="flex items-center text-gray-300 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 mr-2"
            />
            Publicação permanente
          </label>
        </div>

        {!isPermanent && (
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Dias disponíveis</label>
            <input
              type="number"
              min="1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-700 border border-gray-600 text-white rounded-lg
                focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              required={!isPermanent}
            />
          </div>
        )}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 px-4 bg-transparent border-2 border-cyan-500 hover:bg-cyan-900/30
            text-cyan-300 font-bold rounded-lg transition duration-200 disabled:opacity-50
            disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-300 border-t-transparent rounded-full"></span>
              Publicando...
            </>
          ) : (
            '🚀 Publicar'
          )}
        </button>
      </form>
    </div>
  );
}