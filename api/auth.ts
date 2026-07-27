import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, notFound, handleError } from './_lib/apiResponse'

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

function getIdFromPath(req: VercelRequest): string | undefined {
  const parts = (req.url || '').split('?')[0].split('/')
  return parts[parts.length - 1] || undefined
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)

  try {
    if (sub === '/profile' && req.method === 'GET') {
      const { userId } = await authenticate(req)
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      if (error || !data) return notFound(res, 'Profile not found')
      return ok(res, data)
    }

    if ((sub === '/profile/update' || sub === '/profile-update') && (req.method === 'PUT' || req.method === 'POST')) {
      const { userId } = await authenticate(req)
      const body = typeof req.body === 'object' ? req.body : {}
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(body)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return ok(res, data)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
