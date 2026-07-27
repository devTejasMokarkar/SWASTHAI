import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, handleError } from './_lib/apiResponse'
import { validateBody, waterSchema, actionToggleSchema } from './_lib/validate'

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

const fieldMap: Record<string, string> = {
  vitaminD: 'vitamin_d_taken',
  breathing: 'breathing_done',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)

  try {
    const { userId } = await authenticate(req)

    // GET /api/metrics/water?today=true
    if (sub === '/water' && req.method === 'GET') {
      const today = new Date().toISOString().split('T')[0]
      const { data } = await supabaseAdmin
        .from('daily_actions')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()
      return ok(res, data || { water_logged_ml: 0, vitamin_d_taken: false, breathing_done: false })
    }

    // POST /api/metrics/water
    if (sub === '/water' && req.method === 'POST') {
      const body = validateBody(req.body, waterSchema, res)
      if (!body) return

      const today = new Date().toISOString().split('T')[0]
      const { data: existing } = await supabaseAdmin
        .from('daily_actions')
        .select('id, water_logged_ml')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        const { data, error } = await supabaseAdmin
          .from('daily_actions')
          .update({ water_logged_ml: (existing.water_logged_ml || 0) + body.amount })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw { status: 400, message: error.message }
        return ok(res, data)
      }

      const { data, error } = await supabaseAdmin
        .from('daily_actions')
        .insert({ user_id: userId, date: today, water_logged_ml: body.amount })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return ok(res, data)
    }

    // POST /api/metrics/action
    if (sub === '/action' && req.method === 'POST') {
      const body = validateBody(req.body, actionToggleSchema, res)
      if (!body) return

      const today = new Date().toISOString().split('T')[0]
      const column = fieldMap[body.action]

      const { data: existing } = await supabaseAdmin
        .from('daily_actions')
        .select('id, *')
        .eq('user_id', userId)
        .eq('date', today)
        .maybeSingle()

      if (existing) {
        const currentVal = Boolean((existing as any)[column])
        const { data, error } = await supabaseAdmin
          .from('daily_actions')
          .update({ [column]: !currentVal })
          .eq('id', existing.id)
          .select()
          .single()
        if (error) throw { status: 400, message: error.message }
        return ok(res, data)
      }

      const defaults: Record<string, any> = { user_id: userId, date: today, water_logged_ml: 0, vitamin_d_taken: false, breathing_done: false }
      defaults[column] = true
      const { data, error } = await supabaseAdmin
        .from('daily_actions')
        .insert(defaults)
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return ok(res, data)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
