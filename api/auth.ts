import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, notFound, handleError } from './_lib/apiResponse'
import { validateBody, profileUpdateSchema } from './_lib/validate'

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
      const body = validateBody(req.body, profileUpdateSchema, res)
      if (!body) return
      const dbUpdate: Record<string, any> = {}
      if (body.fullName) dbUpdate.name = body.fullName
      if (body.dob) dbUpdate.dob = body.dob
      if (body.gender) dbUpdate.gender = body.gender
      if (body.dietaryPreferences) dbUpdate.conditions = body.dietaryPreferences
      if (body.weightKg) dbUpdate.weight_kg = parseFloat(body.weightKg)
      if (body.heightCm) dbUpdate.height_cm = parseFloat(body.heightCm)
      if (body.healthGoals) dbUpdate.health_goals = body.healthGoals
      if (body.activeDiseases) dbUpdate.active_diseases = body.activeDiseases
      if (body.otherDisease) dbUpdate.other_disease = body.otherDisease
      if (body.medicalHistory !== undefined) dbUpdate.medical_history = body.medicalHistory
      if (body.noMedication !== undefined) dbUpdate.no_medication = body.noMedication
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update(dbUpdate)
        .eq('user_id', userId)
        .select()
        .single()
      if (error) throw { status: 400, message: error.message }
      return ok(res, data)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
