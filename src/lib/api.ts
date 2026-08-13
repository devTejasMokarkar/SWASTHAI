import { supabase } from './supabase'

export async function apiFetch(url: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export async function logUserActivity(action: string, details: Record<string, any> = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return
  
  try {
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      action,
      details,
    })
  } catch (err) {
    console.error('Failed to log activity:', err)
  }
}
