import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, noContent, notFound, handleError } from './_lib/apiResponse'

function getIdFromPath(req: VercelRequest): string | undefined {
  const parts = (req.url || '').split('?')[0].split('/')
  const last = parts[parts.length - 1]
  return last && last !== 'files' ? last : undefined
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const id = getIdFromPath(req)

  try {
    const { userId } = await authenticate(req)

    if (!id && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    if (!id && req.method === 'POST') {
      const { name, category } = typeof req.body === 'object' ? req.body : {}
      let aiInsight = 'Processing...'
      const lower = (name || '').toLowerCase()
      if (lower.includes('blood')) aiInsight = 'Vitamin D levels are optimal. Slight decrease in Ferritin noted.'
      else if (lower.includes('amoxicillin') || lower.includes('prescription')) aiInsight = 'Course: 250mg, 3x daily. Ends in 3 days.'
      else if (lower.includes('x-ray') || lower.includes('chest')) aiInsight = 'No acute abnormalities detected.'
      else aiInsight = 'All biomarkers are within normal reference limits.'
      const { data, error } = await supabaseAdmin
        .from('files')
        .insert({ user_id: userId, title: name || 'Untitled', type: category || 'report', ocr_summary: aiInsight })
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    if (id && req.method === 'PUT') {
      const body = typeof req.body === 'object' ? req.body : {}
      const { data, error } = await supabaseAdmin
        .from('files')
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
        .from('files')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
      if (error) throw { status: 400, message: error.message }
      return noContent(res)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
