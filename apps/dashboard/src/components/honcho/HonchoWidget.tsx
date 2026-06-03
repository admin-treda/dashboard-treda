import { useState, useRef, useEffect } from 'react'
import { X, Send, MessageSquare, Sparkles, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export function HonchoWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnread, setHasUnread] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  useEffect(() => {
    if (isOpen) {
      setHasUnread(false)
      inputRef.current?.focus()
    }
  }, [isOpen])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMsg: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await api.post('/honcho/chat', {
        query: userMsg.content,
        reasoning_level: 'low'
      })

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.content || 'Sin respuesta de Honcho',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
      if (!isOpen) setHasUnread(true)
    } catch (error: any) {
      const errorMsg: Message = {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || 'Honcho no disponible'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full',
          'flex items-center justify-center',
          'bg-gradient-to-br from-[#BF00FF] to-[#00F0FF]',
          'shadow-lg shadow-[#BF00FF]/30 hover:shadow-xl hover:shadow-[#BF00FF]/50',
          'transition-all duration-300 hover:scale-110',
          'border border-[#BF00FF]/30',
          isOpen && 'rotate-0'
        )}
        title="Honcho AI Assistant"
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-6 w-6 text-white" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#00F0FF] animate-pulse" />
            )}
          </div>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-24 right-6 z-50',
            'w-[380px] h-[520px] max-h-[70vh]',
            'rounded-xl overflow-hidden',
            'bg-[#0a0a1a]/95 backdrop-blur-xl',
            'border border-[#BF00FF]/30',
            'shadow-2xl shadow-[#BF00FF]/20',
            'flex flex-col',
            'animate-in fade-in slide-in-from-bottom-4 duration-300'
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[#BF00FF]/20 bg-gradient-to-r from-[#BF00FF]/10 to-[#00F0FF]/10">
            <div className="h-8 w-8 rounded-lg bg-[#BF00FF]/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-[#BF00FF]" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-bold text-white font-display">HONCHO</div>
              <div className="text-[10px] text-[#00F0FF]">AI Memory Assistant</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-full bg-[#BF00FF]/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="h-6 w-6 text-[#BF00FF]" />
                </div>
                <p className="text-sm text-muted-foreground font-display">
                  Pregúntale a Honcho sobre el proyecto
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Memoria persistente del dashboard
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-xl px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-[#BF00FF]/20 text-white border border-[#BF00FF]/30'
                      : 'bg-[#00F0FF]/10 text-gray-200 border border-[#00F0FF]/20'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                    {msg.content}
                  </div>
                  <div className="text-[10px] text-muted-foreground/50 mt-1">
                    {msg.timestamp.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl px-3 py-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-[#00F0FF] animate-spin" />
                  <span className="text-xs text-[#00F0FF]">Pensando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#BF00FF]/20 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregúntale a Honcho..."
                disabled={isLoading}
                className={cn(
                  'flex-1 bg-[#0a0a1a] border border-[#BF00FF]/20 rounded-lg',
                  'px-3 py-2 text-sm text-white placeholder-muted-foreground/50',
                  'focus:outline-none focus:border-[#BF00FF]/50 focus:ring-1 focus:ring-[#BF00FF]/30',
                  'transition-all duration-200'
                )}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={cn(
                  'h-9 w-9 rounded-lg flex items-center justify-center',
                  'bg-[#BF00FF] hover:bg-[#BF00FF]/80 disabled:opacity-30',
                  'transition-all duration-200'
                )}
              >
                <Send className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
