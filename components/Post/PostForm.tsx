import { useState, useRef, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { Post } from '../../models/Post';

const themes = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const uploadImage = async (file: File): Promise<string> => {
  const base64 = await toBase64(file);
  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mime: file.type }),
  });
  if (!res.ok) throw new Error('Erro ao fazer upload da imagem');
  const data = await res.json();
  return data.url as string;
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
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
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

    try {
      // Step 1 – upload source image
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
          duration: 5, // Kling free tier supports 5s; adjust as needed
        }),
      });

      if (!klingRes.ok) {
        const errData = await klingRes.json().catch(() => ({}));
        throw new Error(errData?.error || `Erro ${klingRes.status} ao gerar vídeo`);
      }

      const klingData = await klingRes.json();
      const generatedVideoUrl: string = klingData.videoUrl;

      setVideoUrl(generatedVideoUrl);
      setVideoGenStep('done');
    } catch (err) {
      setVideoGenStep('error');
      setVideoError(err instanceof Error ? err.message : 'Erro desconhecido ao gerar vídeo');
    } finally {
      setIsGeneratingVideo(false);
    }
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
      // Upload source image (will reuse if already uploaded during video gen)
      const imageUrl = await uploadImage(image);

      const newPost: Omit<Post, '_id'> = {
        caption,
        imageUrl,
        ...(videoUrl ? { videoUrl, videoPrompt } : {}),
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

      if (!response.ok) throw new Error('Erro ao criar publicação');

      // Reset
      setCaption('');
      setImage(null);
      setImagePreview(null);
      setVideoUrl(null);
      setVideoPrompt('');
      setVideoGenStep('idle');
      setVideoError('');
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-2xl mx-auto border border-gray-700">
      <h2 className="text-xl font-bold mb-1 text-white flex items-center gap-2">
        🎬 Criar Nova Publicação
      </h2>
      <p className="text-gray-400 text-sm mb-5">
        Carregue uma foto, descreva o comportamento e gere um vídeo animado via Kling.ai.
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