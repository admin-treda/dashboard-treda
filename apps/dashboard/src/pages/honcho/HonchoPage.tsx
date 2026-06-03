import { useState, useRef, useEffect } from 'react'
import { Send, Sparkles, Brain, Search, Loader2, Database, MessageSquare } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface HonchoContext {
  peer: any
  card: any
  summary: any
}

export function HonchoPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [context, setContext] = useState<HonchoContext | null>(null)
  const [activeTab, setActiveTab] = useState<'chat' | 'context' | 'search'>('chat')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadContext()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadContext = async () => {
    try {
      const res = await api.get('/honcho/context')
      setContext(res.data)
    } catch {}
  }

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
        reasoning_level: 'medium'
      })

      const assistantMsg: Message = {
        role: 'assistant',
        content: res.data.content || 'Sin respuesta',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || 'Honcho no disponible'}`,
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const searchMemory = async () => {
    if (!searchQuery.trim() || isSearching) return
    setIsSearching(true)
    try {
      const res = await api.post('/honcho/search', {
        query: searchQuery,
        max_tokens: 1500
      })
      setSearchResults(res.data.excerpts || [])
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#BF00FF]/20 to-[#00F0FF]/20 flex items-center justify-center border border-[#BF00FF]/30">
            <Brain className="h-5 w-5 text-[#BF00FF]" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display neon-text">HONCHO</h1>
            <p className="text-xs text-muted-foreground">AI Memory Assistant — Memoria Persistente</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#0a0a1a] rounded-lg p-1 border border-border">
          {[
            { id: 'chat' as const, label: 'Chat', icon: MessageSquare },
            { id: 'context' as const, label: 'Contexto', icon: Database },
            { id: 'search' as const, label: 'Búsqueda', icon: Search },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-[#BF00FF]/20 text-[#BF00FF] border border-[#BF00FF]/30'
                  : 'text-muted-foreground hover:text-white'
              )}
            >
              <tab.icon className="h-3 w-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 rounded-xl border border-border bg-card overflow-hidden flex">
        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="h-16 w-16 rounded-2xl bg-[#BF00FF]/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-[#BF00FF]" />
                  </div>
                  <h3 className="text-lg font-bold text-white font-display mb-2">
                    Pregúntale a Honcho
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Honcho tiene acceso a toda la memoria del proyecto: configuración,
                    decisiones, preferencias, errores resueltos, y más.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 mt-6">
                    {[
                      '¿Qué sabe del proyecto?',
                      '¿Quién es el usuario?',
                      '¿Qué stack usa?',
                      '¿Cuáles son las reglas?',
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); }}
                        className="text-xs px-3 py-1.5 rounded-full border border-[#BF00FF]/20 text-[#BF00FF] hover:bg-[#BF00FF]/10 transition-all"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[70%] rounded-xl px-4 py-3',
                    msg.role === 'user'
                      ? 'bg-[#BF00FF]/15 text-white border border-[#BF00FF]/30'
                      : 'bg-[#00F0FF]/10 text-gray-200 border border-[#00F0FF]/20'
                  )}>
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-3 w-3 text-[#00F0FF]" />
                        <span className="text-[10px] font-bold text-[#00F0FF]">HONCHO</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {msg.content}
                    </div>
                    <div className="text-[10px] text-muted-foreground/40 mt-2">
                      {msg.timestamp.toLocaleTimeString('es-CO')}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-[#00F0FF]/10 border border-[#00F0FF]/20 rounded-xl px-4 py-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-[#00F0FF] animate-spin" />
                    <span className="text-sm text-[#00F0FF]">Honcho está pensando...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu pregunta a Honcho..."
                  disabled={isLoading}
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-sm text-white placeholder-muted-foreground/50 focus:outline-none focus:border-[#BF00FF]/50 focus:ring-1 focus:ring-[#BF00FF]/30"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={cn(
                    'h-12 w-12 rounded-xl flex items-center justify-center',
                    'bg-gradient-to-r from-[#BF00FF] to-[#00F0FF]',
                    'hover:opacity-90 disabled:opacity-30',
                    'transition-all duration-200 shadow-lg shadow-[#BF00FF]/20'
                  )}
                >
                  <Send className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Context Tab */}
        {activeTab === 'context' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Database className="h-4 w-4 text-[#BF00FF]" />
              Contexto de Honcho
            </h3>
            {context ? (
              <pre className="text-xs text-gray-300 bg-[#0a0a1a] rounded-lg p-4 overflow-auto border border-border">
                {JSON.stringify(context, null, 2)}
              </pre>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 text-[#BF00FF] animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Cargando contexto...</p>
              </div>
            )}
          </div>
        )}

        {/* Search Tab */}
        {activeTab === 'search' && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') searchMemory() }}
                placeholder="Buscar en la memoria de Honcho..."
                className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-sm text-white placeholder-muted-foreground/50 focus:outline-none focus:border-[#BF00FF]/50"
              />
              <button
                onClick={searchMemory}
                disabled={!searchQuery.trim() || isSearching}
                className="px-4 py-2 rounded-lg bg-[#BF00FF] text-white text-sm font-medium hover:bg-[#BF00FF]/80 disabled:opacity-30 transition-all"
              >
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                {searchResults.map((r: any, i: number) => (
                  <div key={i} className="bg-[#0a0a1a] rounded-lg p-4 border border-border">
                    <div className="text-sm text-gray-300">{r.excerpt || JSON.stringify(r)}</div>
                    {r.score && (
                      <div className="text-[10px] text-muted-foreground mt-2">
                        Relevancia: {(r.score * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Escribe una consulta para buscar en la memoria
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
