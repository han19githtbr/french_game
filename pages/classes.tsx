import { useEffect, useRef, useState, RefObject, useCallback } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/router'
import { Check, X, Minus, Lock, ChevronDown, ChevronLeft, ChevronRight, Pause, Play, FlagIcon, Clock, Bell, BellOff, ChevronUp, EyeIcon } from 'lucide-react'
import { motion , AnimatePresence, useMotionValue, useTransform, animate, MotionValue} from 'framer-motion'
import { Post } from '../models/Post';
import TypingEffect from '../components/TypingEffect';
import ThemeSelector from '../components/ThemeSelector';
import CommentList from '../components/Comment/CommentList';
import CommentForm from '../components/Comment/CommentForm';
import { useSocket } from '../lib/socket';


export default function Classes() {
  const { data: session, status } = useSession()
  const router = useRouter()  
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [logoutTimeoutId, setLogoutTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [currentPost, setCurrentPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const socket = useSocket();

  const themes = ['Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];

  // Adicione no início do seu componente (com os outros hooks)
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const viewCounted = useRef(new Map<string, boolean>());
  // Adicione estas variáveis no início do seu componente, antes do return
  const totalPosts = posts.length; // ou busque do seu banco de dados
  const totalThemes = themes.length;
  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);

  // Buscar posts quando o tema muda
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const themeParam = selectedTheme || router.query.theme || '';
        const response = await fetch(`/api/posts/get?theme=${themeParam}`);
        
        if (!response.ok) throw new Error('Erro ao buscar posts');
        
        const data = await response.json();
        setPosts(data);
        setCurrentIndex(0); // Resetar para o primeiro post do novo tema

        // Inicializa likedPosts baseado no usuário logado e no campo likedBy de cada post
        if (session && session.user) {
          const userId = session.user.id || session.user.email || '';
          const liked = data
            .filter((post: any) => Array.isArray(post.likedBy) && post.likedBy.some((u: any) => u.userId === userId))
            .map((post: any) => post._id?.toString());
          setLikedPosts(liked);
        } else {
          setLikedPosts([]);
        }
      } catch (error) {
        console.error('Erro:', error);
      }
    };

    fetchPosts();
  }, [selectedTheme, router.query.theme, session]);


  useEffect(() => {
    if (posts.length > 0 && currentIndex < posts.length) {
      setCurrentPost(posts[currentIndex]);
    } else {
      setCurrentPost(null);
    }
  }, [posts, currentIndex]);


  useEffect(() => {
    if (!socket) return;

    socket.on('postUpdated', (updatedPost: Post) => {
      setPosts(prev => prev.map(post => post._id === updatedPost._id ? updatedPost : post));
    });

    return () => {
      socket.off('postUpdated');
    };
  }, [socket]);

  const incrementViews = async (postId: string) => {
    if (!session || !session.user) return;
    const userId = session.user.id || session.user.email || '';
    try {
      await fetch(`/api/posts/view?id=${postId}&userId=${userId}`, {
        method: 'PUT',
      });
    } catch (err) {
      console.error('Erro ao incrementar visualizações:', err);
    }
  };

  const handleLike = async (postId: string) => {
    if (!session) return;

    try {
      // Verifica se o post já foi curtido
      const isLiked = likedPosts.includes(postId);

      const response = await fetch(`/api/posts/like?id=${postId}&action=${isLiked ? 'unlike' : 'like'}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id || session.user.email || '',
          userName: session.user.name || '',
          userImage: session.user.image || '',
        }),
      });

      if (!response.ok) throw new Error('Erro ao curtir publicação');

      const updatedPost = await response.json();

      // Atualiza o estado de likes
      setLikedPosts(prev =>
        isLiked
          ? prev.filter(id => id !== postId) // Remove o like
          : [...prev, postId] // Adiciona o like
      );

      // Atualizações de estado com verificação segura
      setCurrentPost(prev =>
        prev?._id?.toString() === postId ? updatedPost : prev
      );

      setPosts(prev => prev.map(p =>
        p._id?.toString() === postId ? updatedPost : p
      ));

    } catch (error) {
      console.error('Erro ao curtir:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < posts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setLiked(false);
    }
  };

  
  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme);
  };
  
  const handleCommentAdded = (updatedPost: Post) => {
    setCurrentPost(updatedPost);
    if (socket) {
      socket.emit('commentAdded', updatedPost);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
                
    } else if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);  


  const handleMouseEnter = () => {
    clearTimeout(logoutTimeoutId as NodeJS.Timeout); // Limpa qualquer timeout pendente
    setIsLogoutVisible(true);
  };
  
  
  const handleMouseLeave = () => {
    // Define um timeout para esconder o logout após um pequeno atraso
    const timeoutId = setTimeout(() => {
      setIsLogoutVisible(false);
    }, 300); // Ajuste o valor do atraso (em milissegundos) conforme necessário
    setLogoutTimeoutId(timeoutId);
  };
  
  const handleLogoutMouseEnter = () => {
    // Se o mouse entrar no botão de logout, cancela o timeout de desaparecimento
    clearTimeout(logoutTimeoutId as NodeJS.Timeout);
  };
 

  return (
    <div className="min-h-screen bg-gray-900 from-slate-800 to-slate-900 text-white flex flex-col items-center p-4 relative mb-6">
      <div className="absolute top-10 left-4 z-30">
        <button
            onClick={() => router.push('/game')}
            className="flex border border-blue text-gray-300 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-md shadow-md transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 cursor-pointer"
        >
            <ChevronLeft className="mr-2" color="blue" /> Voltar para tela principal
        </button>
      </div>
      {session?.user && (
        <div 
          className="fixed top-4 right-4 z-50 group"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="flex items-center gap-2 cursor-pointer mt-4">
            <span className="text-gray-300 font-medium hidden sm:inline">
              {session && session.user && session.user.name
                ? session.user.name.length > 20
                  ? session.user.name.substring(0, 17) + '....'
                  : session.user.name
                : '' // Ou algum outro valor padrão que faça sentido para o seu caso
              }
            </span>
            <img src={session.user.image || ''} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-blue" />
          </div>
          <div
            className={`absolute border border-blue right-0 mt-2 text-black py-2 px-4 rounded shadow-lg z-10 ${
              isLogoutVisible ? 'block' : 'hidden'
            }`}
            onMouseEnter={handleLogoutMouseEnter} // Impede o desaparecimento ao entrar no botão
          >
            <button onClick={() => signOut()} className="hover:text-red-600 cursor-pointer">Logout</button>
          </div>
          {/* Adicionando um pequeno "espaço invisível" para manter o hover ativo */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none group-hover:block"></div>
        </div>
      )}
    

      {/*<div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <ThemeSelector themes={themes} onSelectTheme={handleThemeSelect} selectedTheme={selectedTheme} />
        </div>

        {currentPost && currentPost._id ? (
          <div className="flex flex-col lg:flex-row gap-8" key={currentPost._id.toString()}>
            <div className="lg:w-1/3">
              <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
                <div className="w-full overflow-hidden">
                  <img
                    src={currentPost.imageUrl}
                    alt={currentPost.caption}
                    className="w-full h-auto max-h-[70vh] object-cover"  // Mudei de object-contain para object-cover
                    onLoad={() => {
                      const postId = currentPost._id?.toString();
                      if (postId && !viewCounted.current.get(postId)) {
                        incrementViews(postId);
                        viewCounted.current.set(postId, true);
                      }
                    }}
                  />
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-lightblue text-white px-6 py-1 rounded-xl text-sm font-semibold">
                      {currentPost.theme}
                    </span>
                    <div className="flex items-center border-2 border-b-lightblue pr-3 pl-3 rounded-xl text-gray-400 ">
                      <span className="mr-1 text-green"><EyeIcon /></span>
                      <span>{currentPost.views}</span>
                    </div>
                  </div>
                  
                  <div className="mb-6 min-h-20">
                    <TypingEffect 
                      text={currentPost.caption} 
                      speed={65} // Mais lento
                      key={currentPost._id.toString()} // Força recriação ao mudar de post
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        if (!currentPost?._id) return;
                        
                        // Converter ObjectId para string de forma segura
                        const postId = typeof currentPost._id === 'string' 
                          ? currentPost._id 
                          : currentPost._id.toHexString();
                        
                        handleLike(postId);
                      }}
                      //disabled={!currentPost._id || likedPosts.includes(currentPost._id.toString()) || !session}
                      className={`flex items-center px-6 py-1 rounded-xl ${
                        currentPost._id && likedPosts.includes(currentPost._id.toString()) 
                          ? 'bg-red' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      } transition-colors`}
                    >
                      <span className="mr-4 cursor-pointer">❤️</span>
                      <span>{currentPost.likes}</span>
                    </button>

                    {posts.length > 1 && (
                      <button
                        onClick={handleNext}
                        className="border border-e-yellow hover:bg-blue text-white px-6 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Ver mais ({currentIndex + 1}/{posts.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
            </div>

            <div className="lg:w-1/3">
              <div className="bg-gray-800 rounded-lg p-6 shadow-xl sticky top-4">
                <h3 className="text-xl font-semibold mb-4">Comentários ({currentPost.comments.length})</h3>
                {session ? (
                  <>
                    {currentPost._id && (
                      <CommentForm 
                        postId={currentPost._id.toString()} 
                        onCommentAdded={handleCommentAdded} 
                      />
                    )}
                    <CommentList comments={currentPost.comments} />
                  </>
                ) : (
                  <p className="text-gray-400">Faça login para comentar</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl mb-4">Nenhuma publicação encontrada</h2>
            <p className="text-gray-400">Selecione outro tema ou tente novamente mais tarde</p>
          </div>
        )}
      </div>*/}


      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <ThemeSelector themes={themes} onSelectTheme={handleThemeSelect} selectedTheme={selectedTheme} />
        </div>

        {/* Estado inicial - Mostra estatísticas antes de selecionar um tema */}
        {!selectedTheme ? (
          <div className="text-center py-12">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-2xl mx-auto shadow-2xl border border-gray-700">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-white mb-2">📚 Biblioteca de Conteúdo</h2>
                <p className="text-gray-400 text-lg">Explore nossas publicações organizadas por temas</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="text-4xl font-bold text-lightblue mb-2">{totalPosts}</div>
                  <div className="text-gray-300 font-medium">Publicações</div>
                  <div className="text-sm text-gray-500 mt-2">Conteúdos disponíveis</div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="text-4xl font-bold text-green mb-2">{totalThemes}</div>
                  <div className="text-gray-300 font-medium">Temas</div>
                  <div className="text-sm text-gray-500 mt-2">Categorias diferentes</div>
                </div>
                
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="text-4xl font-bold text-yellow mb-2">{totalViews}</div>
                  <div className="text-gray-300 font-medium">Visualizações</div>
                  <div className="text-sm text-gray-500 mt-2">Total de acessos</div>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-xl p-6 border border-dashed border-gray-600">
                <h3 className="text-xl font-semibold text-white mb-3">🎯 Como usar</h3>
                <ul className="text-gray-400 text-left space-y-2">
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-lightblue rounded-full mr-3"></span>
                    Selecione um tema na barra acima
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-green rounded-full mr-3"></span>
                    Visualize as publicações do tema escolhido
                  </li>
                  <li className="flex items-center">
                    <span className="w-2 h-2 bg-yellow rounded-full mr-3"></span>
                    Interaja curtindo e comentando
                  </li>
                </ul>
              </div>
              
              <div className="mt-8 text-gray-500 text-sm">
                💡 Clique em um tema para começar a explorar
              </div>
            </div>
          </div>
        ) : currentPost && currentPost._id ? (
          // Estado quando um tema está selecionado - Mostra as postagens
          <div className="flex flex-col lg:flex-row gap-8" key={currentPost._id.toString()}>
            <div className="lg:w-1/3">
              <div className="bg-gray-900 rounded-lg overflow-hidden shadow-xl">
                <div className="w-full overflow-hidden">
                  <img
                    src={currentPost.imageUrl}
                    alt={currentPost.caption}
                    className="w-full h-auto max-h-[70vh] object-cover"
                    onLoad={() => {
                      const postId = currentPost._id?.toString();
                      if (postId && !viewCounted.current.get(postId)) {
                        incrementViews(postId);
                        viewCounted.current.set(postId, true);
                      }
                    }}
                  />
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="bg-lightblue text-white px-6 py-1 rounded-xl text-sm font-semibold">
                      {currentPost.theme}
                    </span>
                    <div className="flex items-center border-2 border-b-lightblue pr-3 pl-3 rounded-xl text-gray-400 ">
                      <span className="mr-1 text-green"><EyeIcon /></span>
                      <span>{currentPost.views}</span>
                    </div>
                  </div>
                  
                  <div className="mb-6 min-h-20">
                    <TypingEffect 
                      text={currentPost.caption} 
                      speed={65}
                      key={currentPost._id.toString()}
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button
                      onClick={() => {
                        if (!currentPost?._id) return;
                        
                        const postId = typeof currentPost._id === 'string' 
                          ? currentPost._id 
                          : currentPost._id.toHexString();
                        
                        handleLike(postId);
                      }}
                      className={`flex items-center px-6 py-1 rounded-xl ${
                        currentPost._id && likedPosts.includes(currentPost._id.toString()) 
                          ? 'bg-red' 
                          : 'bg-gray-700 hover:bg-gray-600'
                      } transition-colors`}
                    >
                      <span className="mr-4 cursor-pointer">❤️</span>
                      <span>{currentPost.likes}</span>
                    </button>

                    {posts.length > 1 && (
                      <button
                        onClick={handleNext}
                        className="border border-e-yellow hover:bg-blue text-white px-6 py-2 rounded-xl transition-colors cursor-pointer"
                      >
                        Ver mais ({currentIndex + 1}/{posts.length})
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-1/3">
              <div className="bg-gray-800 rounded-lg p-6 shadow-xl sticky top-4">
                <h3 className="text-xl font-semibold mb-4">Comentários ({currentPost.comments.length})</h3>
                {session ? (
                  <>
                    {currentPost._id && (
                      <CommentForm 
                        postId={currentPost._id.toString()} 
                        onCommentAdded={handleCommentAdded} 
                      />
                    )}
                    <CommentList comments={currentPost.comments} />
                  </>
                ) : (
                  <p className="text-gray-400">Faça login para comentar</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Estado quando um tema foi selecionado mas não há postagens
          <div className="text-center py-20">
            <div className="bg-gray-900 rounded-2xl p-8 max-w-md mx-auto">
              <div className="text-6xl mb-4">📭</div>
              <h2 className="text-2xl font-bold mb-4">Nenhuma publicação encontrada</h2>
              <p className="text-gray-400 mb-6">Não há publicações para o tema "{selectedTheme}"</p>
              <button
                onClick={() => handleThemeSelect('')}
                className="bg-lightblue hover:bg-blue text-white px-6 py-2 rounded-xl transition-colors"
              >
                Voltar para todos os temas
              </button>
            </div>
          </div>
        )}
      </div>  

    </div>
  )
}