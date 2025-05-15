'use client'

import { useEffect, useState, useRef } from 'react'
import socket from '../lib/socket'
import { motion } from 'framer-motion'


interface User {
  email: string
  name: string
}


interface ChatBox {
  user: User
  messages: Message[]
  minimized: boolean
  hasNewMessage: boolean  
}


interface Message {
  content: string
  sender: 'me' | 'them'
  timestamp: number
}


export default function ChatManager({ currentUser }: { currentUser: any }) {
  const [chatBoxes, setChatBoxes] = useState<ChatBox[]>([])
  const [typingUser, setTypingUser] = useState<string | null>(null)
  const [onlineUsers, setOnlineUsers] = useState<User[]>([])


  useEffect(() => {
    socket.emit('join', currentUser)

    socket.on('private-message', ({ message, from }) => {
      openOrUpdateChat(from, message)
    })

    socket.on('typing', ({ from }) => {
      setTypingUser(from.email)
    })

    socket.on('stop-typing', () => {
      setTypingUser(null)
    })

    socket.on('online-users', (users: User[]) => {
      const others = users.filter(u => u.email !== currentUser.email)
      setOnlineUsers(others)
    })

    return () => {
      socket.off('private-message')
      socket.off('typing')
      socket.off('stop-typing')
      socket.off('online-users')
    }
  }, [])


  const openOrUpdateChat = (user: User, content: string) => {
    setChatBoxes(prev => {
      const existing = prev.find(c => c.user.email === user.email)
      if (existing) {
        return prev.map(c =>
          c.user.email === user.email
            ? {
                ...c,
                messages: content
                  ? [...c.messages, { content, sender: 'them', timestamp: Date.now() }]
                  : [...c.messages],
                minimized: false,
                hasNewMessage: true,
              }
            : c
        )
      } else {
        return [
          ...prev,
           {
            user,
            messages: content
              ? [{ content, sender: 'them', timestamp: Date.now() }]
              : [],
            minimized: false,
            hasNewMessage: Boolean(content),
          },
        ]
      }
    })
  }


  const handleSendMessage = (user: User, content: string) => {
    socket.emit('private-message', { to: user.email, message: content })
    setChatBoxes(prev =>
      prev.map(c =>
        c.user.email === user.email
          ? {
              ...c,
              messages: [...c.messages, { content, sender: 'me', timestamp: Date.now() }],
              hasNewMessage: false,  
            }
          : c
      )
    )
  }

  const handleTyping = (to: string) => {
    socket.emit('typing', { to, from: currentUser })
    setTimeout(() => {
      socket.emit('stop-typing', { to, from: currentUser })  
    }, 2000)
  }


  const toggleMinimize = (email: string) => {
    setChatBoxes(prev =>
      prev.map(c =>
        c.user.email === email ? { ...c, minimized: !c.minimized, hasNewMessage: false } : c
      )
    )
  }


  
  return (
    <>
        {/* Botão de notificações - canto superior esquerdo */}
        {chatBoxes.some(c => c.hasNewMessage) && (
            <div className="fixed top-24 left-2 z-50 bg-blue text-white rounded-full px-4 py-2 shadow-lg">
            🔔 {chatBoxes.filter(c => c.hasNewMessage).length}
            </div>
        )}

        {/* Lista de usuários online - canto superior direito */}
        <div className="absolute top-[120px] right-2 bg-white border border-gray-300 shadow-lg rounded-lg p-2 w-64 z-40">
            <p className="font-semibold text-gray-200 text-sm mb-1">Usuários online:</p>
            <ul className="space-y-1">
            {onlineUsers.map(user => (
                <li
                key={user.email}
                className="cursor-pointer hover:text-blue"
                onClick={() => openOrUpdateChat(user, '')}
                >
                {user.name}
                </li>
            ))}
            </ul>
        </div>

        {/* Janelas de Chat - lado esquerdo */}
        <div className="fixed top-0 left-0 flex gap-2 p-2 z-50">
            {chatBoxes.map(chat => {
            const messagesEndRef = useRef<HTMLDivElement>(null)
            useEffect(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
            }, [chat.messages.length])

            return (
                <motion.div
                    drag
                    dragConstraints={{ left: 0, top: 0 }}
                    key={chat.user.email}
                    className={`w-64 bg-white text-black rounded-xl shadow-2xl overflow-hidden border-2 transition-all duration-300 ${
                        chat.hasNewMessage && !chat.minimized
                        ? 'border-yellow animate-pulse'
                        : 'border-transparent'
                    } ${chat.minimized ? 'h-10' : 'h-80'}`}
                >
                <div
                    className="bg-blue text-white p-2 flex justify-between items-center cursor-pointer"
                    onClick={() => toggleMinimize(chat.user.email)}
                >
                    <span className="font-semibold flex items-center gap-2">
                    {chat.user.name}
                    {chat.hasNewMessage && !chat.minimized && (
                        <span className="animate-bounce text-yellow">💬</span>
                    )}
                    </span>
                    <button className="text-white text-lg">_</button>
                </div>
                {!chat.minimized && (
                    <div className="flex flex-col h-[calc(100%-2rem)]">
                    <div className="flex-1 p-2 overflow-y-auto space-y-1">
                        {chat.messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`text-sm p-2 rounded max-w-[90%] break-words ${
                            msg.sender === 'me' ? 'bg-blue self-end' : 'bg-gray-200 self-start'
                            }`}
                        >
                            {msg.content}
                        </div>
                        ))}
                        {typingUser === chat.user.email && (
                        <div className="flex items-center gap-1 text-xs italic text-gray-400 animate-pulse">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                        </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                    <ChatInput
                        onSend={msg => handleSendMessage(chat.user, msg)}
                        onTyping={() => handleTyping(chat.user.email)}
                    />
                    </div>
                )}
                </motion.div>
            )
            })}
        </div>
    </>

  )
}



function ChatInput({
    onSend,
    onTyping,
}: {
    onSend: (msg: string) => void
    onTyping: () => void
}) {
    const [text, setText] = useState('')

    const handleSend = () => {
        if (text.trim()) {
          onSend(text.trim())
          setText('')
        }
    }

    return (
        <div className="p-2 border-t border-gray-300 flex">
            <input
                type="text"
                value={text}
                onChange={e => {
                  setText(e.target.value)
                  onTyping()
                }}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Digite sua mensagem..."
                className="flex-1 p-1 border rounded mr-2"
            />
            <button
                onClick={handleSend}
                className="bg-blue text-white px-2 py-1 rounded hover:bg-lightblue"
            >
                Enviar
            </button>
        </div>
    )
}