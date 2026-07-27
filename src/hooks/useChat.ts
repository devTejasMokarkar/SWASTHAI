import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import type { ChatMessage } from '../types'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiFetch('/api/gemini/chat')
      if (data?.success) {
        const msgs = (data.data || []).map((m: any) => ({
          sender: m.role as 'user' | 'ai',
          text: m.content,
          timestamp: m.created_at,
        }))
        setMessages(msgs)
      }
    } catch { /* ignore */ }
  }, [])

  const fetchAudit = useCallback(async () => {
    try {
      const data = await apiFetch('/api/gemini/audit')
      if (data?.success) setAuditLogs(data.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([fetchMessages(), fetchAudit()]).finally(() => setLoading(false))
  }, [fetchMessages, fetchAudit])

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { sender: 'user', text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])

    const data = await apiFetch('/api/gemini/chat', {
      method: 'POST',
      body: JSON.stringify({ text, sender: 'user' }),
    })
    if (data?.success && Array.isArray(data.data)) {
      const serverMsgs = data.data.map((m: any) => ({
        sender: m.role as 'user' | 'ai',
        text: m.content,
        timestamp: m.created_at,
      }))
      setMessages(serverMsgs)
    }
    return data
  }, [])

  const clearChat = useCallback(async () => {
    try {
      await apiFetch('/api/gemini/chat/clear', { method: 'POST' })
      setMessages([])
    } catch { /* ignore */ }
  }, [])

  return { messages, auditLogs, loading, sendMessage, clearChat, refetch: () => { fetchMessages(); fetchAudit() } }
}
