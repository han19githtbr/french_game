import { useState, useRef } from 'react';
import { Post } from '../../models/Post';
import { formatDate } from '../../lib/utils';
import Link from 'next/link';
import { ObjectId } from 'mongodb';
//import { EyeIcon } from 'lucide-react';


export default function PostCard({ post, onDelete, isAdmin }: { post: Post; onDelete?: (id: string) => void; isAdmin?: boolean }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Modal para mostrar quem curtiu
  const [showLikesModal, setShowLikesModal] = useState(false);
  const likesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowLikes = () => {
    setShowLikesModal(true);
  };
  const handleCloseLikes = () => {
    likesTimeoutRef.current = setTimeout(() => setShowLikesModal(false), 200);
  };
  const handleLikesModalMouseEnter = () => {
    if (likesTimeoutRef.current) clearTimeout(likesTimeoutRef.current);
  };

  // Modal para mostrar quem comentou
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const commentsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowComments = () => {
    setShowCommentsModal(true);
  };
  const handleCloseComments = () => {
    commentsTimeoutRef.current = setTimeout(() => setShowCommentsModal(false), 200);
  };
  const handleCommentsModalMouseEnter = () => {
    if (commentsTimeoutRef.current) clearTimeout(commentsTimeoutRef.current);
  };

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
        {/*<div className="absolute top-2 right-2 bg-gray-900 bg-opacity-70 text-white px-2 py-1 rounded flex items-center">
          <span className="mr-1 text-green"><EyeIcon /></span>
          <span>{post.views}</span>
        </div>*/}
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
          <p className="text-white mb-2 text-justify">{post.caption}</p>
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
          <div className="flex items-center gap-2">
            <span className="text-yellow mr-1">❤️</span>
            <button
              type="button"
              title="Ver quem curtiu"
              onClick={handleShowLikes}
              className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-800 text-green font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-green-400 transition cursor-pointer"
            >
              {post.likes}
            </button>
            <span className="text-white">|</span>
            <button
              type="button"
              title="Ver comentários"
              onClick={handleShowComments}
              className="px-2 py-1 rounded bg-gray-700 hover:bg-gray-800 text-blue font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer"
            >
              {post.comments.length} comentários
            </button>
          </div>
        {/* Modal de curtidas */}
        {showLikesModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-60 "
            onClick={handleCloseLikes}
            onMouseEnter={handleLikesModalMouseEnter}
            onMouseLeave={handleCloseLikes}
          >
            <div
              className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md relative"
              onClick={e => e.stopPropagation()}
              onMouseEnter={handleLikesModalMouseEnter}
              onMouseLeave={handleCloseLikes}
            >
              <button onClick={() => { setShowLikesModal(false); }} className="absolute top-2 right-2 text-gray-200 hover:text-red text-xl font-bol cursor-pointer">✕</button>
              <h2 className="text-lg font-bold mb-4 text-center text-gray-200">Quem curtiu</h2>
              <ul className="space-y-2 max-h-80 overflow-y-auto">
                {post.likedBy && post.likedBy.length > 0 ? (
                  post.likedBy.map((user, idx) => (
                    <li key={user.userId+idx} className="flex items-center space-x-2">
                      {user.userImage && <img src={user.userImage} alt={user.userName} className="w-8 h-8 rounded-full" />}
                      <span className="text-gray-300 font-medium">{user.userName}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-200 text-center">Ninguém curtiu ainda.</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {/* Modal de comentários */}
        {showCommentsModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-60"
            onClick={handleCloseComments}
            onMouseEnter={handleCommentsModalMouseEnter}
            onMouseLeave={handleCloseComments}
          >
            <div
              className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md relative"
              onClick={e => e.stopPropagation()}
              onMouseEnter={handleCommentsModalMouseEnter}
              onMouseLeave={handleCloseComments}
            >
              <button onClick={() => { setShowCommentsModal(false); }} className="absolute top-2 right-2 text-gray-200 hover:text-red text-xl font-bold cursor-pointer">✕</button>
              <h2 className="text-lg font-bold mb-4 text-center text-gray-200">Comentários</h2>
              <ul className="space-y-4 max-h-80 overflow-y-auto">
                {post.comments && post.comments.length > 0 ? (
                  post.comments.map((comment, idx) => (
                    <li key={comment._id?.toString() || idx} className="flex items-start space-x-3 border-b pb-2">
                      {comment.userImage && <img src={comment.userImage} alt={comment.userName} className="w-8 h-8 rounded-full mt-1" />}
                      <div>
                        <span className="text-gray-100 font-semibold">{comment.userName}</span>
                        <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
                        <span className="text-gray-300 text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
                      </div>
                    </li>
                  ))
                ) : (
                  <li className="text-gray-200 text-center">Nenhum comentário ainda.</li>
                )}
              </ul>
            </div>
          </div>
        )}

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
