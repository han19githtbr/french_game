import { useState } from 'react';
import { Post } from '../../models/Post';
import { formatDate } from '../../lib/utils';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
import { EyeIcon } from 'lucide-react';


export default function PostCard({ post, onDelete, isAdmin }: { post: Post; onDelete?: (id: string) => void; isAdmin?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEdit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/posts/edit', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: post._id,
          caption: editedCaption,
        }),
      });

      if (!response.ok) throw new Error('Erro ao editar publicação');

      setIsEditing(false);
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
    <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg transition-transform hover:scale-105">
      <div className="relative">
        <img
          src={post.imageUrl}
          alt={post.caption}
          className="w-full h-48 object-cover"
        />
        <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white px-2 py-1 rounded flex items-center">
          <span className="mr-1"><EyeIcon /></span>
          <span>{post.views}</span>
        </div>
        <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-sm">
          {post.theme}
        </div>
      </div>

      <div className="p-4">
        {isEditing ? (
          <textarea
            className="w-full px-3 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            value={editedCaption}
            onChange={(e) => setEditedCaption(e.target.value)}
            rows={3}
          />
        ) : (
          <p className="text-white mb-2">{post.caption}</p>
        )}

        <div className="flex justify-between items-center text-gray-400 text-sm mb-2">
          <span>Criado em: {formatDate(post.createdAt)}</span>
          {post.endDate ? (
            <span>Expira em: {formatDate(post.endDate)}</span>
          ) : (
            <span className="text-green">Permanente</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-yellow-400 mr-1">❤️</span>
            <span className="text-white">{post.likes}</span>
            <span className="text-white mx-2">|</span>
            <span className="text-blue-400">{post.comments.length} comentários</span>
          </div>

          {isAdmin && (
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green text-white rounded text-sm hover:bg-blue disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedCaption(post.caption);
                    }}
                    className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 border border-e-lightblue text-white rounded text-sm hover:bg-blue-700 cursor-pointer"
                >
                  Editar
                </button>
              )}
              <button
                onClick={() => {
                    if (onDelete && post._id) {
                        onDelete(post._id.toString());
                    }
                }}
                className="px-3 py-1 border border-e-red text-white rounded text-sm hover:bg-red-700 cursor-pointer"
              >
                Excluir
              </button>
            </div>
          )}
        </div>

        {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}

        {!isAdmin && (
          <Link href={`/classes?postId=${post._id}`}>
            <button className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white py-1 px-3 rounded text-sm">
              Ver detalhes
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}