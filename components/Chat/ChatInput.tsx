import React, { useState } from 'react';

interface Props {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendMessage: (message: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
}

const ChatInput: React.FC<Props> = ({ value, onChange, onSendMessage, onBlur, onFocus }) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    onChange(e);
  };

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="flex items-center">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Digite sua mensagem..."
        className="flex-grow rounded-md border border-gray-300 px-3 py-2 mr-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onBlur={onBlur}
        onFocus={onFocus}
      />
      <button
        onClick={handleSend}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline"
      >
        Enviar
      </button>
    </div>
  );
};

export default ChatInput;