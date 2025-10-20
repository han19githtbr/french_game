import { useState, useRef, ChangeEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { uploadImage } from '../../lib/utils';
import { Post } from '../../models/Post';

const themes = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];

export default function PostForm({ onPostCreated }: { onPostCreated: () => void }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [caption, setCaption] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [theme, setTheme] = useState(themes[0]);
  const [isPermanent, setIsPermanent] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (!caption || !image) {
      setError('Por favor, preencha todos os campos');
      setIsLoading(false);
      return;
    }

    try {
      // Upload da imagem
      const imageUrl = await uploadImage(image);

      // Criar post no banco de dados
      const newPost: Omit<Post, '_id'> = {
        caption,
        imageUrl,
        theme: theme as Post['theme'],
        startDate: new Date(),
        endDate: isPermanent ? null : new Date(new Date().getTime() + parseInt(endDate) * 24 * 60 * 60 * 1000),
        likes: 0,
        //views: 0,
        comments: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = await fetch('/api/posts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPost),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar publicação');
      }

      // Limpar formulário
      setCaption('');
      setImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsPermanent(false);
      setEndDate('');

      // Notificar o componente pai
      onPostCreated();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido');
      }  
      
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-4 text-white">Criar Nova Publicação</h2>
      {error && <div className="mb-4 p-2 bg-red text-white rounded">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-300 mb-2" htmlFor="caption">
            Legenda
          </label>
          <textarea
            id="caption"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue"
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
          />
        </div>

        <div className="mb-4 ">
          <label className="block text-gray-300 mb-2" htmlFor="image">
            Imagem
          </label>
          <input
            type="file"
            id="image"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageChange}
            className="block w-full text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:text-sm file:font-semibold file:border border-e-lightblue file:text-white hover:file:border-lightblue cursor-pointer"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-300 mb-2" htmlFor="theme">
            Tema
          </label>
          <select
            id="theme"
            className="w-full px-3 py-2 bg-gray-700 border border-e-lightblue text-white rounded focus:outline-none focus:ring-2 focus:ring-blue cursor-pointer"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
          >
            {themes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="flex items-center text-gray-300">
            <input
              type="checkbox"
              className="form-checkbox h-5 w-5 text-blue rounded focus:ring-blue"
              checked={isPermanent}
              onChange={(e) => setIsPermanent(e.target.checked)}
            />
            <span className="ml-2">Publicação permanente</span>
          </label>
        </div>

        {!isPermanent && (
          <div className="mb-4">
            <label className="block text-gray-300 mb-2" htmlFor="endDate">
              Dias disponíveis
            </label>
            <input
              type="number"
              id="endDate"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue"
              min="1"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required={!isPermanent}
            />
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-transparent border border-e-lightblue hover:bg-blue text-white font-bold py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-200 disabled:opacity-50 cursor-pointer"
          disabled={isLoading}
        >
          {isLoading ? 'Publicando...' : 'Publicar'}
        </button>
      </form>
    </div>
  );
}