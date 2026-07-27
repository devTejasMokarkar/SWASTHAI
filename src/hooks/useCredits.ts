import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

export function useCredits() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await apiFetch('/api/credits/logs')
      if (data?.success) setLogs(data.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const deduct = useCallback(async (amount: number, feature: string) => {
    try {
      await apiFetch('/api/credits/deduct', {
        method: 'POST',
        body: JSON.stringify({ amount, feature }),
      })
      fetch()
    } catch { /* ignore */ }
  }, [fetch])

  const refill = useCallback(async (amount: number, feature: string) => {
    try {
      await apiFetch('/api/credits/refill', {
        method: 'POST',
        body: JSON.stringify({ amount, feature }),
      })
      fetch()
    } catch { /* ignore */ }
  }, [fetch])

  return { logs, loading, deduct, refill, refetch: fetch }
}
