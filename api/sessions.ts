import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, handleError } from './_lib/apiResponse'
import { validateBody, sessionStartSchema } from './_lib/validate'

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)

  try {
    const { userId } = await authenticate(req)

    if ((sub === '/' || sub === '') && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('logged_in_at', { ascending: false })
        .limit(20)
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    if (sub === '/start' && req.method === 'POST') {
      const body = validateBody(req.body, sessionStartSchema, res)
      if (!body) return

      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket.remoteAddress || null

      const { data, error } = await supabaseAdmin
        .from('sessions')
        .insert({ user_id: userId, ip_address: ipAddress, user_agent: body.userAgent || null, device_info: body.deviceInfo || {}, login_method: 'google' })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    if (sub === '/end' && req.method === 'POST') {
      const { sessionId } = typeof req.body === 'object' ? req.body : {}

      if (sessionId) {
        await supabaseAdmin
          .from('sessions')
          .update({ is_active: false })
          .eq('id', sessionId)
          .eq('user_id', userId)
      } else {
        await supabaseAdmin
          .from('sessions')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('is_active', true)
      }

      return ok(res, { message: 'Session ended' })
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
