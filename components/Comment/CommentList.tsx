import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CommentList({ comments }: { comments: any[] }) {
  if (comments.length === 0) {
    return <p className="text-gray-400">Nenhum comentário ainda. Seja o primeiro!</p>;
  }

  return (
    <div className="space-y-4 max-h-[400px] overflow-y-auto">
      {comments.map((comment) => (
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
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <p className="text-white">{comment.text}</p>
        </div>
      ))}
    </div>
  );
}