import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'

export interface DailyActions {
  waterLoggedMl: number
  waterGoalMl: number
  vitaminD: boolean
  breathing: boolean
}

export function useDailyActions() {
  const [actions, setActions] = useState<DailyActions>({
    waterLoggedMl: 0,
    waterGoalMl: 2500,
    vitaminD: false,
    breathing: false,
  })
  const [loading, setLoading] = useState(true)

  const fetchToday = useCallback(async () => {
    try {
      const data = await apiFetch('/api/metrics/water?today=true')
      if (data?.success && data?.data) {
        setActions(prev => ({
          ...prev,
          waterLoggedMl: data.data.water_logged_ml || 0,
          vitaminD: data.data.vitamin_d_taken || false,
          breathing: data.data.breathing_done || false,
        }))
      }
    } catch {
      // Defaults stay
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchToday() }, [fetchToday])

  const logWater = useCallback(async (amount: number) => {
    setActions(prev => ({ ...prev, waterLoggedMl: prev.waterLoggedMl + amount }))
    try {
      await apiFetch('/api/metrics/water', {
        method: 'POST',
        body: JSON.stringify({ amount }),
      })
    } catch { /* rollback not needed */ }
  }, [])

  const toggleAction = useCallback(async (action: 'vitaminD' | 'breathing') => {
    setActions(prev => ({ ...prev, [action]: !prev[action] }))
    try {
      await apiFetch('/api/metrics/action', {
        method: 'POST',
        body: JSON.stringify({ action }),
      })
    } catch { /* rollback not needed */ }
  }, [])

  return { actions, loading, logWater, toggleAction, refetch: fetchToday }
}
