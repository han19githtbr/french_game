import { useEffect, useRef, useState, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
// @ts-ignore
import { ChevronLeft, ChevronRight, Heart, MessageCircle, LogOut, User } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Post } from '../models/Post'
import TypingEffect from '../components/TypingEffect'
import ThemeSelector from '../components/ThemeSelector'
import CommentList from '../components/Comment/CommentList'
import CommentForm from '../components/Comment/CommentForm'
import { useSocket } from '../lib/socket'

// ── Theme icons for a richer feel ──────────────────────────────────────────
const themeIcons: Record<string, string> = {
  Cultura: '🗼', Gastronomia: '🥐', Tecnologia: '💻', Ditados: '📜',
  Natureza: '🌿', Turismo: '✈️', Pensamentos: '💭', Gramática: '📖',
};

export default function Classes() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const socket = useSocket()

  const [posts, setPosts] = useState<Post[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [likedPosts, setLikedPosts] = useState<string[]>([])
  const [selectedTheme, setSelectedTheme] = useState('')
  const [loading, setLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [direction, setDirection] = useState(1)

  const videoRef = useRef<HTMLVideoElement>(null)

  const themes = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos']
  const currentPost = posts[currentIndex] ?? null
  const totalPosts = posts.length
  const hasNext = currentIndex < totalPosts - 1
  const hasPrev = currentIndex > 0

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/')
  }, [status, router])

  // ── Fetch posts ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true)
      try {
        const themeParam = selectedTheme || router.query.theme || ''
        const res = await fetch(`/api/posts/get?theme=${themeParam}`)
        if (!res.ok) throw new Error('Erro ao buscar posts')
        const data: Post[] = await res.json()
        setPosts(data)
        setCurrentIndex(0)
        setShowComments(false)

        if (session?.user) {
          const uid = session.user.id || session.user.email || ''
          const liked = data
            .filter((p: any) => Array.isArray(p.likedBy) && p.likedBy.some((u: any) => u.userId === uid))
            .map((p: any) => p._id?.toString())
          setLikedPosts(liked)
        } else {
          setLikedPosts([])
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchPosts()
  }, [selectedTheme, router.query.theme, session])

  // ── Socket sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return
    socket.on('postUpdated', (updated: Post) => {
      setPosts(prev => prev.map(p => p._id === updated._id ? updated : p))
    })
    return () => { socket.off('postUpdated') }
  }, [socket])

  // ── Auto-play video on card change ───────────────────────────────────────
  useEffect(() => {
    if (videoRef.current && currentPost?.videoUrl) {
      videoRef.current.load()
      videoRef.current.play().catch(() => undefined)
    }
  }, [currentIndex, currentPost?.videoUrl])

  // ── Like ─────────────────────────────────────────────────────────────────
  const handleLike = async () => {
    if (!session || !currentPost?._id) return
    const postId = currentPost._id.toString()
    const isLiked = likedPosts.includes(postId)
    try {
      const res = await fetch(`/api/posts/like?id=${postId}&action=${isLiked ? 'unlike' : 'like'}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id || session.user.email || '',
          userName: session.user.name || '',
          userImage: session.user.image || '',
        }),
      })
      if (!res.ok) throw new Error()
      const updated: Post = await res.json()
      setLikedPosts(prev => isLiked ? prev.filter(id => id !== postId) : [...prev, postId])
      setPosts(prev => prev.map(p => p._id?.toString() === postId ? updated : p))
    } catch { /* silent */ }
  }

  // ── Navigate ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (!hasNext) return
    setDirection(1)
    setCurrentIndex(i => i + 1)
    setShowComments(false)
  }
  const goPrev = () => {
    if (!hasPrev) return
    setDirection(-1)
    setCurrentIndex(i => i - 1)
    setShowComments(false)
  }

  const handleCommentAdded = (updated: Post) => {
    setPosts(prev => prev.map(p => p._id?.toString() === updated._id?.toString() ? updated : p))
    if (socket) socket.emit('commentAdded', updated)
  }

  const isLiked = currentPost?._id ? likedPosts.includes(currentPost._id.toString()) : false

  // ── Slide variants ───────────────────────────────────────────────────────
  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white relative overflow-hidden">

      {/* Ambient gradient blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-900/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-40 w-80 h-80 bg-blue-900/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-900/15 rounded-full blur-3xl" />
      </div>

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-white/5 backdrop-blur-sm bg-black/20">
        <button
          onClick={() => router.push('/game')}
          className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition text-sm font-medium"
        >
          <ChevronLeft size={18} />
          Voltar
        </button>

        <span className="text-cyan-400 font-semibold text-sm tracking-wide">
          📚 Quero me Aprofundar
        </span>

        {/* User avatar / menu */}
        {session?.user && (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(o => !o)}
              className="flex items-center gap-2 cursor-pointer"
            >
              {session.user.image ? (
                <img src={session.user.image} alt="Avatar" className="w-8 h-8 rounded-full border border-cyan-600/50" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-cyan-800 flex items-center justify-center">
                  <User size={16} className="text-cyan-200" />
                </div>
              )}
            </button>
            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-40 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
                >
                  <div className="px-3 py-2 border-b border-gray-800">
                    <p className="text-xs text-gray-300 truncate font-medium">{session.user.name}</p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-900/20 transition cursor-pointer"
                  >
                    <LogOut size={14} /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-5xl">

        {/* ── Theme selector ─────────────────────────────────────────────── */}
        <div className="mb-6">
          <ThemeSelector
            themes={themes}
            onSelectTheme={(t) => setSelectedTheme(t)}
            selectedTheme={selectedTheme}
          />
        </div>

        {/* ── No theme selected: welcome screen ─────────────────────────── */}
        {!selectedTheme ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <div className="bg-gray-900/60 backdrop-blur-md rounded-2xl p-10 max-w-xl mx-auto border border-white/5 shadow-2xl">
              <div className="text-5xl mb-5">🇫🇷</div>
              <h2 className="text-2xl font-bold text-white mb-2">Explore o Conteúdo</h2>
              <p className="text-gray-400 mb-8 text-sm">Escolha um tema acima e mergulhe na cultura francesa através de publicações, vídeos e histórias.</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <div className="text-3xl font-bold text-cyan-400 mb-1">{themes.length}</div>
                  <div className="text-gray-400 text-sm">Temas</div>
                </div>
                <div className="bg-white/5 rounded-xl p-5 border border-white/5">
                  <div className="text-3xl font-bold text-green-400 mb-1">🎬</div>
                  <div className="text-gray-400 text-sm">Publicações em vídeo</div>
                </div>
              </div>

              {/* Theme grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {themes.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTheme(t)}
                    className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-cyan-900/30 border border-white/5 hover:border-cyan-700/50
                      text-sm text-gray-300 hover:text-cyan-300 transition font-medium cursor-pointer"
                  >
                    {themeIcons[t] || '📂'} {t}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : loading ? (
          // Loading skeleton
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Carregando publicações...</p>
          </div>
        ) : posts.length === 0 ? (
          // No posts
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="bg-gray-900/60 rounded-2xl p-8 max-w-md mx-auto border border-white/5">
              <div className="text-5xl mb-4">📭</div>
              <h2 className="text-xl font-bold mb-2">Nenhuma publicação</h2>
              <p className="text-gray-400 text-sm mb-6">Não há publicações para o tema &quot;{selectedTheme}&quot; ainda.</p>
              <button
                onClick={() => setSelectedTheme('')}
                className="bg-cyan-700 hover:bg-cyan-600 text-white px-5 py-2 rounded-xl text-sm transition"
              >
                Ver outros temas
              </button>
            </div>
          </motion.div>
        ) : (
          // ── Main content ───────────────────────────────────────────────
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ── Left: Media card ──────────────────────────────────────── */}
            <div>
              <AnimatePresence mode="wait" custom={direction}>
                {currentPost && (
                  <motion.div
                    key={currentPost._id?.toString() || currentIndex}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="bg-gray-900/70 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 shadow-2xl">

                      {/* Media */}
                      <div className="relative">
                        {currentPost.videoUrl ? (
                          <video
                            ref={videoRef}
                            src={currentPost.videoUrl}
                            poster={currentPost.imageUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full max-h-[60vh] object-cover"
                          />
                        ) : (
                          <img
                            src={currentPost.imageUrl}
                            alt={currentPost.caption}
                            className="w-full max-h-[60vh] object-cover"
                          />
                        )}

                        {/* Gradient overlay at bottom */}
                        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-gray-900/80 to-transparent pointer-events-none" />

                        {/* Theme badge */}
                        <div className="absolute top-3 left-3 bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                          {themeIcons[currentPost.theme] || '📂'} {currentPost.theme}
                        </div>

                        {/* Video badge */}
                        {currentPost.videoUrl && (
                          <div className="absolute top-3 right-3 bg-cyan-600/90 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold">
                            🎬 IA
                          </div>
                        )}

                        {/* Post counter */}
                        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                          {currentIndex + 1} / {totalPosts}
                        </div>
                      </div>

                      {/* Caption with TypingEffect */}
                      <div className="p-5">
                        <div className="text-gray-200 text-sm leading-relaxed text-justify min-h-[3.5rem]">
                          <TypingEffect
                            text={currentPost.caption}
                            speed={60}
                            key={currentPost._id?.toString()}
                          />
                        </div>

                        {/* Like + nav row */}
                        <div className="flex items-center justify-between mt-5">
                          <button
                            onClick={handleLike}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer ${
                              isLiked
                                ? 'bg-red-600/30 text-red-400 border border-red-600/50'
                                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <Heart size={16} className={isLiked ? 'fill-red-400' : ''} />
                            <span>{currentPost.likes}</span>
                          </button>

                          {/* Comment toggle */}
                          <button
                            onClick={() => setShowComments(s => !s)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10 transition cursor-pointer"
                          >
                            <MessageCircle size={16} />
                            <span>{currentPost.comments.length} comentários</span>
                          </button>

                          {/* Navigation arrows */}
                          <div className="flex gap-2">
                            <button
                              onClick={goPrev}
                              disabled={!hasPrev}
                              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <button
                              onClick={goNext}
                              disabled={!hasNext}
                              className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Progress dots */}
              {totalPosts > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {posts.slice(0, Math.min(totalPosts, 10)).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); setShowComments(false); }}
                      className={`h-1.5 rounded-full transition-all cursor-pointer ${
                        i === currentIndex ? 'w-5 bg-cyan-400' : 'w-1.5 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  ))}
                  {totalPosts > 10 && <span className="text-gray-600 text-xs self-center">+{totalPosts - 10}</span>}
                </div>
              )}
            </div>

            {/* ── Right: Comments panel ─────────────────────────────────── */}
            <AnimatePresence>
              {(showComments || window?.innerWidth >= 1024) && currentPost && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-gray-900/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl p-5 flex flex-col gap-4"
                >
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <MessageCircle size={16} className="text-cyan-400" />
                    Comentários ({currentPost.comments.length})
                  </h3>

                  {session ? (
                    <>
                      {currentPost._id && (
                        <CommentForm
                          postId={currentPost._id.toString()}
                          onCommentAdded={handleCommentAdded}
                        />
                      )}
                      <div className="overflow-y-auto max-h-96 pr-1">
                        <CommentList comments={currentPost.comments} />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-400 text-sm mb-3">Faça login para comentar</p>
                      <button
                        onClick={() => router.push('/')}
                        className="bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl text-sm transition"
                      >
                        Entrar
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Click outside to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
      )}
    </div>
  )
}
