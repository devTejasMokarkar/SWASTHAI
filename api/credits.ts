import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, handleError } from './_lib/apiResponse'
import { validateBody, creditActionSchema } from './_lib/validate'

const INITIAL_CREDITS = 120

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)

  try {
    const { userId } = await authenticate(req)

    if (sub === '/balance' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('credit_usage')
        .select('cost_estimate')
        .eq('user_id', userId)
      if (error) throw { status: 400, message: error.message }

      const totalUsed = (data || []).reduce((sum, row) => sum + (row.cost_estimate || 0), 0)
      return ok(res, { balance: Math.max(0, INITIAL_CREDITS - totalUsed), used: totalUsed, total: INITIAL_CREDITS })
    }

    if (sub === '/logs' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('credit_usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    if (sub === '/deduct' && req.method === 'POST') {
      const body = validateBody(req.body, creditActionSchema, res)
      if (!body) return
      const { data, error } = await supabaseAdmin
        .from('credit_usage')
        .insert({ user_id: userId, feature: body.feature, tokens_used: body.tokensUsed || null, cost_estimate: body.amount })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    if (sub === '/refill' && req.method === 'POST') {
      const body = validateBody(req.body, creditActionSchema, res)
      if (!body) return
      const { data, error } = await supabaseAdmin
        .from('credit_usage')
        .insert({ user_id: userId, feature: `refill:${body.feature}`, tokens_used: body.tokensUsed || null, cost_estimate: body.amount * -1 })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
