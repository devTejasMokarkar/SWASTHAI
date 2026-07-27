import { useState, useCallback } from 'react'
import { apiFetch } from '../lib/api'

export function useSessions() {
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/sessions')
      if (data?.success) setSessions(data.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  const start = useCallback(async () => {
    try {
      await apiFetch('/api/sessions/start', {
        method: 'POST',
        body: JSON.stringify({
          userAgent: navigator.userAgent,
          deviceInfo: { platform: navigator.platform, language: navigator.language },
        }),
      })
    } catch { /* ignore */ }
  }, [])

  const end = useCallback(async () => {
    try {
      await apiFetch('/api/sessions/end', { method: 'POST' })
    } catch { /* ignore */ }
  }, [])

  return { sessions, loading, fetch, start, end }
}
