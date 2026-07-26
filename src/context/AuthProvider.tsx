import { createContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, AuthError } from '@supabase/supabase-js'
import type { Profile } from '../types/auth'

export interface AuthContextType {
  session: Session | null
  user: Session['user'] | null
  profile: Profile | null
  loading: boolean
  signInWithGoogle: (credential: string) => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        fetchProfile(session.user.id)
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (session?.user) {
        await Promise.all([
          fetchProfile(session.user.id),
          savePendingProfile(session.user),
        ])
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single()
    if (data) {
      setProfile(data as Profile)
    }
  }

  async function savePendingProfile(user: { id: string; email?: string }) {
    const raw = sessionStorage.getItem('swasth_pending_profile')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const updates: Record<string, any> = {}
      if (data.fullName) updates.name = data.fullName
      if (data.dob) updates.age = calculateAge(data.dob)
      if (data.gender) updates.gender = data.gender
      if (data.weightKg != null) updates.weight_kg = data.weightKg
      if (data.heightCm != null) updates.height_cm = data.heightCm
      if (data.dietaryPreferences) updates.conditions = data.dietaryPreferences
      if (user.email) updates.email = user.email

      const extra: Record<string, any> = {}
      if (data.healthGoals?.length) extra.healthGoals = data.healthGoals
      if (data.activeDiseases?.length) extra.activeDiseases = data.activeDiseases
      if (data.medicalHistory) extra.medicalHistory = data.medicalHistory
      if (data.medications?.length) extra.medications = data.medications
      if (data.noMedication) extra.noMedication = true
      if (Object.keys(extra).length > 0) {
        updates.history_text = JSON.stringify(extra)
      }

      if (data.medications?.length) {
        updates.medications_text = JSON.stringify(data.medications)
      }

      await supabase.from('profiles').upsert(
        { user_id: user.id, ...updates },
        { onConflict: 'user_id' }
      )
      sessionStorage.removeItem('swasth_pending_profile')
    } catch (err) {
      console.error('Failed to save pending profile:', err)
    }
  }

  function calculateAge(dob: string): number | null {
    if (!dob) return null
    const birth = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
    return age
  }

  const signInWithGoogle = async (credential: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchProfile(session.user.id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
