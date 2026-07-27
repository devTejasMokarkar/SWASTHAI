import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../lib/api'
import type { User } from '../types'

export function useUserProfile(initial: User) {
  const [profile, setProfile] = useState<User>(initial)

  const fetch = useCallback(async () => {
    try {
      const data = await apiFetch('/api/auth/profile')
      if (data?.success && data?.data) {
        const p = data.data
        setProfile(prev => ({
          ...prev,
          fullName: p.name || prev.fullName,
          email: p.email || prev.email,
          gender: p.gender || prev.gender,
          dietaryPreferences: p.conditions || p.dietary_preferences || prev.dietaryPreferences,
          weightKg: p.weight_kg?.toString() || prev.weightKg,
          healthGoals: p.health_goals || prev.healthGoals,
          activeDiseases: p.active_diseases || prev.activeDiseases,
          medicalHistory: p.medical_history || prev.medicalHistory,
          dob: p.dob || prev.dob,
        }))
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const update = useCallback(async (updates: Partial<User>) => {
    setProfile(prev => ({ ...prev, ...updates }))
    try {
      await apiFetch('/api/auth/profile/update', {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    } catch { /* rollback not needed */ }
  }, [])

  return { profile, update, refetch: fetch }
}
