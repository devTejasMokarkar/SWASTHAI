import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, noContent, notFound, handleError } from './_lib/apiResponse'

function getIdFromPath(req: VercelRequest): string | undefined {
  const parts = (req.url || '').split('?')[0].split('/')
  const last = parts[parts.length - 1]
  return last && last !== 'medications' ? last : undefined
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getIdFromPath(req)

  try {
    const { userId } = await authenticate(req)

    if (!id && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('medications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    if (!id && req.method === 'POST') {
      const body = typeof req.body === 'object' ? req.body : {}
      const { data, error } = await supabaseAdmin
        .from('medications')
        .insert({ user_id: userId, ...body })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    if (id && (req.method === 'PUT' || req.method === 'PATCH')) {
      const body = typeof req.body === 'object' ? req.body : {}
      const { data, error } = await supabaseAdmin
        .from('medications')
        .update(body)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      if (!data) return notFound(res)
      return ok(res, data)
    }

    if (id && req.method === 'DELETE') {
      const { error } = await supabaseAdmin
        .from('medications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw { status: 400, message: error.message }
      return noContent(res)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
