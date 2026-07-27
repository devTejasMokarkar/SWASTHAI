import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import type { VitalReading } from '../types'

export function useVitals() {
  const [readings, setReadings] = useState<VitalReading[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetchReadings = useCallback(async () => {
    try {
      const data = await apiFetch('/api/vitals/readings')
      if (data?.success) setReadings(data.data || [])
    } catch { /* ignore */ }
  }, [])

  const fetchReminders = useCallback(async () => {
    try {
      const data = await apiFetch('/api/vitals/reminders')
      if (data?.success) setReminders(data.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    Promise.all([fetchReadings(), fetchReminders()]).finally(() => setLoading(false))
  }, [fetchReadings, fetchReminders])

  const addReading = useCallback(async (reading: any) => {
    const data = await apiFetch('/api/vitals/readings', {
      method: 'POST',
      body: JSON.stringify(reading),
    })
    if (data?.success && data?.data) {
      setReadings(prev => [data.data, ...prev])
    }
    return data
  }, [])

  const addReminder = useCallback(async (reminder: any) => {
    const data = await apiFetch('/api/vitals/reminders', {
      method: 'POST',
      body: JSON.stringify(reminder),
    })
    if (data?.success && data?.data) {
      setReminders(prev => [data.data, ...prev])
    }
    return data
  }, [])

  const toggleReminder = useCallback(async (id: string) => {
    try {
      const data = await apiFetch(`/api/vitals/reminders/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: true }),
      })
      if (data?.success) {
        setReminders(prev => prev.map(r => (r.id === id ? { ...r, completed: true } : r)))
      }
    } catch { /* ignore */ }
  }, [])

  const deleteReminder = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/vitals/reminders/${id}`, { method: 'DELETE' })
      setReminders(prev => prev.filter(r => r.id !== id))
    } catch { /* ignore */ }
  }, [])

  return {
    readings,
    reminders,
    loading,
    addReading,
    addReminder,
    toggleReminder,
    deleteReminder,
    refetch: () => { fetchReadings(); fetchReminders() },
  }
}
