import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import type { Medication } from '../types'

export function useMedications() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const data = await apiFetch('/api/medications')
      if (data?.success) setMedications(data.data || [])
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(async (med: Partial<Medication>) => {
    const data = await apiFetch('/api/medications', {
      method: 'POST',
      body: JSON.stringify(med),
    })
    if (data?.success && data?.data) {
      setMedications(prev => [data.data, ...prev])
    }
    return data?.data
  }, [])

  const update = useCallback(async (id: string, updates: Partial<Medication>) => {
    const data = await apiFetch(`/api/medications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (data?.success && data?.data) {
      setMedications(prev => prev.map(m => (m.id === id ? { ...m, ...data.data } : m)))
    }
    return data?.data
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/medications/${id}`, { method: 'DELETE' })
      setMedications(prev => prev.filter(m => m.id !== id))
    } catch { /* ignore */ }
  }, [])

  const toggleTaken = useCallback(async (id: string) => {
    setMedications(prev => prev.map(m => (m.id === id ? { ...m, taken: !m.taken, loggedAt: !m.taken ? new Date().toLocaleTimeString() : null } : m)))
    try {
      await apiFetch(`/api/medications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ taken: true }),
      })
    } catch { /* rollback not critical */ }
  }, [])

  const toggleReminder = useCallback(async (id: string) => {
    setMedications(prev => prev.map(m => (m.id === id ? { ...m, reminderSet: !m.reminderSet } : m)))
    try {
      await apiFetch(`/api/medications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reminderSet: true }),
      })
    } catch { /* rollback not critical */ }
  }, [])

  return { medications, loading, add, update, remove, toggleTaken, toggleReminder, refetch: fetch }
}
