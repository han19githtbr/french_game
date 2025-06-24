import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';

export default function CommentList({ comments }: { comments: any[] }) {
  const [visibleComments, setVisibleComments] = useState(2);
  const [expanded, setExpanded] = useState(false);
  
  if (comments.length === 0) {
    return <p className="text-gray-400">Nenhum comentário ainda. Seja o primeiro!</p>;
  }

  // Mostra todos os comentários se expanded for true, ou apenas os visíveis se false
  const commentsToShow = expanded ? comments : comments.slice(0, visibleComments);
  
  const showMore = () => {
    setVisibleComments(prev => Math.min(prev + 2, comments.length));
  };

  const showLess = () => {
    setVisibleComments(prev => Math.max(2, prev - 5));
  };

  return (
    <div className="space-y-4">
      <div className="max-h-[400px] overflow-y-auto space-y-4">
        {commentsToShow.map((comment) => (
          <div key={comment._id} className="bg-gray-700 p-4 rounded-lg">
            <div className="flex items-start mb-2">
              <img
                src={comment.userImage || '/default-avatar.png'}
                alt={comment.userName}
                className="w-10 h-10 rounded-full mr-3"
              />
              <div>
                <h4 className="font-medium">{comment.userName}</h4>
                <p className="text-gray-400 text-sm">
                  {formatDistanceToNow(new Date(comment.createdAt), { 
                    addSuffix: true, 
                    locale: ptBR 
                  })}
                </p>
              </div>
            </div>
            <p className="text-white">{comment.text}</p>
          </div>
        ))}
      </div>

      {/* Controles de exibição */}
      {comments.length > 2 && (
        <div className="flex justify-center gap-4">
          {!expanded && visibleComments < comments.length && (
            <button
              onClick={showMore}
              className="text-blue hover:text-gray-100 text-sm font-medium cursor-pointer"
            >
              Mostrar mais
            </button>
          )}
          
          {!expanded && visibleComments > 2 && (
            <button
              onClick={showLess}
              className="text-white hover:text-blue text-sm font-medium cursor-pointer"
            >
              Mostrar menos
            </button>
          )}
                    
        </div>
      )}
    </div>
  );
}