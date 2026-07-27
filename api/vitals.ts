import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, noContent, notFound, badRequest, handleError } from './_lib/apiResponse'
import { validateBody, paginationSchema, paginationMeta, vitalReadingSchema, vitalReminderSchema, vitalReminderUpdateSchema } from './_lib/validate'

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

function getIdFromPath(req: VercelRequest): string | undefined {
  const parts = (req.url || '').split('?')[0].split('/')
  const last = parts[parts.length - 1]
  return last
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)
  const id = getIdFromPath(req)

  try {
    const { userId } = await authenticate(req)

    // GET /api/vitals/readings
    if (sub === '/readings' && req.method === 'GET') {
      const { page, limit } = validateBody(req.query, paginationSchema, res) || { page: 1, limit: 20 }
      const offset = (page - 1) * limit

      const { count } = await supabaseAdmin
        .from('readings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      const { data, error } = await supabaseAdmin
        .from('readings')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [], paginationMeta(page, limit, count || 0))
    }

    // POST /api/vitals/readings
    if (sub === '/readings' && req.method === 'POST') {
      const body = validateBody(req.body, vitalReadingSchema, res)
      if (!body) return

      const { data, error } = await supabaseAdmin
        .from('readings')
        .insert({
          user_id: userId,
          type: body.type,
          reading_data: body,
          recorded_at: body.overrideTimestamp
            ? new Date(body.overrideTimestamp).toISOString()
            : new Date().toISOString(),
        })
        .select()
        .single()

      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    // GET /api/vitals/reminders
    if (sub === '/reminders' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('vitals_reminders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    // POST /api/vitals/reminders
    if (sub === '/reminders' && req.method === 'POST') {
      const body = validateBody(req.body, vitalReminderSchema, res)
      if (!body) return
      const { data, error } = await supabaseAdmin
        .from('vitals_reminders')
        .insert({ user_id: userId, ...body })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    // PATCH|PUT|DELETE /api/vitals/reminders/:id
    if (sub.startsWith('/reminders/') && id) {
      if (req.method === 'PATCH' || req.method === 'PUT') {
        const body = validateBody(req.body, vitalReminderUpdateSchema, res)
        if (!body) return
        const { data, error } = await supabaseAdmin
          .from('vitals_reminders')
          .update(body)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single()
        if (error) throw { status: 400, message: error.message }
        if (!data) return notFound(res)
        return ok(res, data)
      }

      if (req.method === 'DELETE') {
        const { error } = await supabaseAdmin
          .from('vitals_reminders')
          .delete()
          .eq('id', id)
          .eq('user_id', userId)
        if (error) throw { status: 400, message: error.message }
        return noContent(res)
      }
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
