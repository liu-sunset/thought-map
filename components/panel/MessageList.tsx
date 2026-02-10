'use client'

import { ScrollArea } from '@/components/ui/scroll-area'
import { getMessages, postMessage } from '@/lib/actions'
import { useEffect, useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Search, Loader2 } from 'lucide-react'

interface Message {
  id: string
  content: string
  createdAt: Date
}

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) {
    return <span>{text}</span>
  }
  const regex = new RegExp(`(${highlight})`, 'gi')
  const parts = text.split(regex)
  return (
    <span>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <span key={i} className="text-yellow-500 font-bold bg-yellow-500/10 rounded px-0.5">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  )
}

export function MessageList({ provinceName, canPost }: { provinceName: string, canPost: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  const fetchMessages = async () => {
    const msgs = await getMessages(provinceName)
    setMessages(msgs)
  }

  useEffect(() => {
    fetchMessages()
    setSearchQuery('')
    setDebouncedQuery('')
  }, [provinceName])

  // Debounce search
  useEffect(() => {
    setIsSearching(true)
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const filteredMessages = useMemo(() => {
    if (!debouncedQuery.trim()) return messages
    const lowerQ = debouncedQuery.toLowerCase()
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(lowerQ)
    )
  }, [messages, debouncedQuery])

  const handleSend = async () => {
    if (!input.trim()) return
    setLoading(true)
    const res = await postMessage(provinceName, input)
    setLoading(false)
    if (res.success) {
      toast.success('Message sent')
      setInput('')
      fetchMessages()
    } else {
      toast.error(res.message || res.error)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <h2 className="text-2xl font-bold text-white mb-2">{provinceName} Messages</h2>
      
      {/* Search Bar */}
      <div className="relative w-[96%] mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
        <Input 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索该省份留言…" 
          className="h-9 pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500 focus-visible:ring-zinc-700"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-zinc-500" />
        )}
      </div>

      <ScrollArea className="flex-1 rounded-md border border-zinc-800 p-4 bg-zinc-900/30">
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
             debouncedQuery ? (
               <div className="flex flex-col items-center justify-center py-10 text-zinc-500 space-y-2">
                 <div className="text-4xl">🔍</div>
                 <p>暂无相关留言</p>
               </div>
             ) : (
               <div className="text-zinc-500 text-center py-10">No messages yet. Be the first!</div>
             )
          ) : (
            filteredMessages.map((msg) => (
              <div key={msg.id} className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <p className="text-zinc-200 text-sm break-all">
                  <HighlightText text={msg.content} highlight={debouncedQuery} />
                </p>
                <span className="text-xs text-zinc-500 mt-2 block">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      
      {canPost ? (
        <div className="flex gap-2 mt-4 w-[96%] mx-auto">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Say something..." 
            className="h-8 bg-zinc-900 border-zinc-700 text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button onClick={handleSend} disabled={loading} className="h-8 bg-green-600 hover:bg-green-700">
            Send
          </Button>
        </div>
      ) : (
        <div className="text-center text-zinc-500 text-sm p-2 bg-zinc-900/50 rounded">
          You are not in {provinceName}, so you can only read.
        </div>
      )}
    </div>
  )
}