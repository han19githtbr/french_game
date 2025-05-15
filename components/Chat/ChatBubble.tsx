import React from 'react';

interface Props {
  message: string;
  isMe?: boolean;
}

const ChatBubble: React.FC<Props> = ({ message, isMe }) => {
  return (
    <div className={`mb-2 p-2 rounded-md ${isMe ? 'bg-blue-200 text-blue-800 self-end' : 'bg-gray-200 text-gray-800 self-start'}`}>
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default ChatBubble;