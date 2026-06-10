import { useState, useRef } from 'react';
import { Post } from '../../models/Post';
import { formatDate } from '../../lib/utils';
import Link from 'next/link';

export default function PostCard({
  post,
  onDelete,
  isAdmin,
}: {
  post: Post;
  onDelete?: (id: string) => void;
  isAdmin?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Modal curtidas
  const [showLikesModal, setShowLikesModal] = useState(false);
  const likesTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowLikes = () => setShowLikesModal(true);
  const handleCloseLikes = () => {
    likesTimeoutRef.current = setTimeout(() => setShowLikesModal(false), 200);
  };
  const handleLikesMouseEnter = () => {
    if (likesTimeoutRef.current) clearTimeout(likesTimeoutRef.current);
  };

  // Modal comentários
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const commentsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleShowComments = () => setShowCommentsModal(true);
  const handleCloseComments = () => {
    commentsTimeoutRef.current = setTimeout(() => setShowCommentsModal(false), 200);
  };
  const handleCommentsMouseEnter = () => {
    if (commentsTimeoutRef.current) clearTimeout(commentsTimeoutRef.current);
  };

  const handleEdit = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/posts/edit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: post._id, caption: editedCaption }),
      });
      if (!response.ok) throw new Error('Erro ao editar publicação');
      setIsEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVideo = () => {
    if (!videoRef.current) return;
    if (videoPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setVideoPlaying(!videoPlaying);
  };

  const hasVideo = Boolean(post.videoUrl);

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden shadow-lg transition-transform hover:scale-[1.02] border border-gray-700/50 hover:border-cyan-800/40">
      {/* ── Media ── */}
      <div className="relative group">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={post.videoUrl}
              poster={post.imageUrl}
              muted
              loop
              playsInline
              onPlay={() => setVideoPlaying(true)}
              onPause={() => setVideoPlaying(false)}
              className="w-full h-48 object-cover"
            />
            {/* Play/Pause overlay */}
            <button
              type="button"
              onClick={toggleVideo}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white text-xl">
                {videoPlaying ? '⏸' : '▶'}
              </span>
            </button>
            {/* Video badge */}
            <span className="absolute top-2 right-2 bg-cyan-600/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
              🎬 Vídeo IA
            </span>
          </>
        ) : (
          <img
            src={post.imageUrl}
            alt={post.caption}
            className="w-full h-48 object-cover"
          />
        )}

        {/* Theme badge */}
        <div className="absolute top-2 left-2 bg-blue-600/90 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
          {post.theme}
        </div>
      </div>

      <div className="p-4">
        {isEditing ? (
          <textarea
            className="w-full px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-2 text-sm"
            value={editedCaption}
            onChange={(e) => setEditedCaption(e.target.value)}
            rows={3}
          />
        ) : (
          <p className="text-gray-200 mb-2 text-sm text-justify leading-relaxed line-clamp-3">
            {post.caption}
          </p>
        )}

        <div className="flex justify-between items-center text-gray-500 text-xs mb-3">
          <span>📅 {formatDate(post.createdAt)}</span>
          {post.endDate ? (
            <span>⏳ Expira: {formatDate(post.endDate)}</span>
          ) : (
            <span className="text-green-400 font-medium">∞ Permanente</span>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>❤️</span>
            <button
              type="button"
              title="Ver quem curtiu"
              onClick={handleShowLikes}
              className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-green-400 font-semibold text-xs transition cursor-pointer"
            >
              {post.likes}
            </button>
            <span className="text-gray-600">|</span>
            <button
              type="button"
              title="Ver comentários"
              onClick={handleShowComments}
              className="px-2 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-cyan-400 font-semibold text-xs transition cursor-pointer"
            >
              💬 {post.comments.length}
            </button>
          </div>

          {/* ── Modals ── */}
          {showLikesModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
              onClick={handleCloseLikes}
              onMouseEnter={handleLikesMouseEnter}
              onMouseLeave={handleCloseLikes}
            >
              <div
                className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md relative border border-gray-700"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleLikesMouseEnter}
                onMouseLeave={handleCloseLikes}
              >
                <button
                  onClick={() => setShowLikesModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-400 text-xl cursor-pointer"
                >✕</button>
                <h2 className="text-lg font-bold mb-4 text-center text-white">❤️ Curtidas</h2>
                <ul className="space-y-2 max-h-72 overflow-y-auto">
                  {post.likedBy && post.likedBy.length > 0 ? (
                    post.likedBy.map((user, idx) => (
                      <li key={user.userId + idx} className="flex items-center gap-3 py-1">
                        {user.userImage && (
                          <img src={user.userImage} alt={user.userName} className="w-8 h-8 rounded-full" />
                        )}
                        <span className="text-gray-300 text-sm">{user.userName}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 text-center py-4">Ninguém curtiu ainda.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {showCommentsModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
              onClick={handleCloseComments}
              onMouseEnter={handleCommentsMouseEnter}
              onMouseLeave={handleCloseComments}
            >
              <div
                className="bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md relative border border-gray-700"
                onClick={(e) => e.stopPropagation()}
                onMouseEnter={handleCommentsMouseEnter}
                onMouseLeave={handleCloseComments}
              >
                <button
                  onClick={() => setShowCommentsModal(false)}
                  className="absolute top-3 right-3 text-gray-400 hover:text-red-400 text-xl cursor-pointer"
                >✕</button>
                <h2 className="text-lg font-bold mb-4 text-center text-white">💬 Comentários</h2>
                <ul className="space-y-3 max-h-72 overflow-y-auto">
                  {post.comments && post.comments.length > 0 ? (
                    post.comments.map((comment, idx) => (
                      <li key={comment._id?.toString() || idx} className="flex items-start gap-3 border-b border-gray-700/50 pb-3">
                        {comment.userImage && (
                          <img src={comment.userImage} alt={comment.userName} className="w-8 h-8 rounded-full mt-0.5 flex-shrink-0" />
                        )}
                        <div>
                          <span className="text-white text-sm font-semibold">{comment.userName}</span>
                          <p className="text-gray-300 text-sm mt-0.5">{comment.text}</p>
                          <span className="text-gray-500 text-xs">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400 text-center py-4">Nenhum comentário ainda.</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Admin controls */}
          {isAdmin && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    disabled={isLoading}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition disabled:opacity-50"
                  >
                    {isLoading ? 'Salvando...' : '✓ Salvar'}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setEditedCaption(post.caption); }}
                    className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-3 py-1 border border-cyan-600 text-cyan-300 rounded-lg text-xs hover:bg-cyan-900/30 transition cursor-pointer"
                >
                  ✏️ Editar
                </button>
              )}
              <button
                onClick={() => { if (onDelete && post._id) onDelete(post._id.toString()); }}
                className="px-3 py-1 border border-red-600 text-red-400 rounded-lg text-xs hover:bg-red-900/30 transition cursor-pointer"
              >
                🗑 Excluir
              </button>
            </div>
          )}
        </div>

        {error && <div className="mt-2 text-red-400 text-xs">{error}</div>}

        {!isAdmin && (
          <Link href={`/classes?postId=${post._id}`}>
            <button className="mt-3 w-full bg-blue-600/80 hover:bg-blue-600 text-white py-1.5 px-3 rounded-lg text-sm font-medium transition">
              Ver detalhes →
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
