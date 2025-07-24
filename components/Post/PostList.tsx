import { useState, useEffect } from 'react';
import { Post } from '../../models/Post';
import PostCard from './PostCard';

export default function PostList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [postsToShow, setPostsToShow] = useState<number>(2);

  const themes = ['Gramática', 'Cultura', 'Gastronomia', 'Tecnologia', 'Ditados', 'Natureza', 'Turismo', 'Pensamentos'];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await fetch(`/api/posts/get?search=${searchTerm}&theme=${filterTheme}`);
        if (!response.ok) throw new Error('Erro ao carregar publicações');
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('Ocorreu um erro desconhecido');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [searchTerm, filterTheme]);

  const handleDelete = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/delete?id=${postId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erro ao deletar publicação');

      setPosts(posts.filter((post) => post._id?.toString() !== postId));
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocorreu um erro desconhecido');
      }
    }
  };

  if (loading) return <div className="text-white text-center py-10">Carregando...</div>;
  if (error) return <div className="text-red-500 text-center py-10">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Buscar publicações..."
          className="px-4 py-2 bg-gray-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow "
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          className="px-4 py-2 bg-gray-700 border border-e-lightblue hover:border-green text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          value={filterTheme}
          onChange={(e) => setFilterTheme(e.target.value)}
        >
          <option value="">Todos os temas</option>
          {themes.map((theme) => (
            <option key={theme} value={theme}>
              {theme}
            </option>
          ))}
        </select>
        <select
          className="px-4 py-2 bg-gray-700 border border-e-lightblue hover:border-green text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          value={postsToShow}
          onChange={(e) => setPostsToShow(Number(e.target.value))}
        >
          <option value={2}>2 posts</option>
          <option value={4}>4 posts</option>
          <option value={6}>6 posts</option>
          <option value={10}>10 posts</option>
          <option value={0}>Todos os posts</option>
        </select>
      </div>

      {posts.length === 0 ? (
        <div className="text-white text-center py-10">Nenhuma publicação encontrada</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts
            .slice(0, postsToShow === 0 ? posts.length : postsToShow)
            .map((post) => (
              <PostCard
                key={post._id?.toString()}
                post={post}
                onDelete={handleDelete}
                isAdmin={true}
              />
          ))}
        </div>
      )}
    </div>
  );
}