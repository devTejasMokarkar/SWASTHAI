import { supabaseAdmin } from './supabaseAdmin'
import type { VercelRequest } from '@vercel/node'

export interface AuthInfo {
  userId: string
  email?: string
}

export async function authenticate(req: VercelRequest): Promise<AuthInfo> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    throw { status: 401, message: 'Missing or invalid Authorization header' }
  }

  const token = authHeader.slice(7)
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    throw { status: 401, message: error?.message || 'Invalid token' }
  }

  return {
    userId: user.id,
    email: user.email,
  }
}
