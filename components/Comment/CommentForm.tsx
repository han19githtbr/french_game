import { useState } from 'react';
import { useSession } from 'next-auth/react';

export default function CommentForm({ postId, onCommentAdded }: { postId: string; onCommentAdded: (post: any) => void }) {
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { data: session } = useSession();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/comments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          text: comment,
          userId: session?.user?.id,
          userName: session?.user?.name,
          userImage: session?.user?.image,
        }),
      });

      if (!response.ok) throw new Error('Erro ao adicionar comentário');

      const updatedPost = await response.json();
      onCommentAdded(updatedPost);
      setComment('');
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
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="mb-4">
        <textarea
          className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Adicione um comentário..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Enviando...' : 'Enviar Comentário'}
      </button>
      {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
    </form>
  );
}