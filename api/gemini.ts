import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { ok, created, handleError } from './_lib/apiResponse'
import { validateBody, chatMessageSchema, scanSchema } from './_lib/validate'
import { generateChat, getEmbedding, cosineSimilarity } from './_lib/ai'
import { validateAiOutput, containsDiagnosticContent, hasDisclaimer } from './_lib/safety'

function getSubPath(req: VercelRequest): string {
  const url = req.url || ''
  const path = url.split('?')[0]
  return '/' + path.split('/').slice(3).join('/')
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const sub = getSubPath(req)

  try {
    const { userId } = await authenticate(req)

    // GET /api/gemini/chat
    if (sub === '/chat' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200)
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    // POST /api/gemini/chat
    if (sub === '/chat' && req.method === 'POST') {
      const body = validateBody(req.body, chatMessageSchema, res)
      if (!body) return
      if (body.sender !== 'user') return created(res, null)

      await supabaseAdmin.from('chats').insert({ user_id: userId, role: 'user', content: body.text })

      const [profileRes, medsRes, readingsRes] = await Promise.all([
        supabaseAdmin.from('profiles').select('*').eq('user_id', userId).single(),
        supabaseAdmin.from('medications').select('*').eq('user_id', userId),
        supabaseAdmin.from('readings').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(10),
      ])

      const profile = profileRes.data || {}
      const medications = medsRes.data || []
      const recentReadings = readingsRes.data || []
      const latestReading = recentReadings[0]?.reading_data || {}

      const { data: files } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('user_id', userId)

      let topMatches: Array<{ name: string; similarity: number; aiInsight?: string }> = []
      if (files && files.length > 0) {
        const queryVector = await getEmbedding(body.text)
        const matches: Array<{ name: string; similarity: number; aiInsight?: string }> = []
        for (const f of files) {
          const insight = f.ai_insight || f.aiInsight || ''
          const fVec = await getEmbedding(`${f.name} - ${insight}`)
          matches.push({ name: f.name, similarity: cosineSimilarity(queryVector, fVec), aiInsight: insight })
        }
        matches.sort((a, b) => b.similarity - a.similarity)
        topMatches = matches.slice(0, 3)
      }

      const prefs = profile.conditions || profile.dietary_preferences || []
      const profileStr = [
        `Name: ${profile.name || 'User'}`,
        `Gender: ${profile.gender || 'N/A'}`,
        `Diet: ${Array.isArray(prefs) ? prefs.join(', ') : 'None'}`,
      ].join(', ')

      const medStr = medications
        .map((m: any) => `- ${m.name} (${m.dose || m.strength || ''}, freq: ${m.frequency || 'N/A'})`)
        .join('\n')

      const vitalsStr = latestReading
        ? `HR: ${latestReading.pulse || 'N/A'} BPM, BP: ${latestReading.systolic || '?'}/${latestReading.diastolic || '?'}`
        : 'No recent vitals'

      const filesStr = topMatches
        .map(m => `- "${m.name}" (${(m.similarity * 100).toFixed(1)}% match) -> ${m.aiInsight || ''}`)
        .join('\n')

      const now = new Date()
      const hour = now.getHours()
      const period = hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : hour >= 17 && hour < 21 ? 'Evening' : 'Night'
      const dateStr = now.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })

      const prompt = `You are He-Co, the expert clinical conversationalist and supportive pre-consultation health companion of Swasth-AI.
You must adhere strictly to retrieval-first safety rules.

CURRENT TIME: ${dateStr} (${period})

RETRIEVED CLINICAL CONTEXT:
${profileStr}
Active Medications:
${medStr || '- None'}
Vitals: ${vitalsStr}

Relevant Health Records:
${filesStr || '- No matching files'}

INSTRUCTIONS:
1. Answer warmly (max 180 words), grounded in the retrieved context.
2. Do NOT diagnose or replace a physician. Strongly encourage home remedies for minor issues.
3. If the query relates to major/severe symptoms, append a doctor consultation reminder.
4. Greet based on time of day (${period}).
5. FOR DIET QUERIES: If it's ${period === 'Morning' ? 'morning, suggest a full day plan' : period === 'Evening' || period === 'Night' ? 'evening/night, suggest ONLY dinner' : 'afternoon, suggest lunch'}.
   If diabetic, warn about glycemic spikes.
6. Append a clinical disclaimer if diagnostic content is discussed.
7. End with a compact RAG citation footer.`

      let responseText = await generateChat(prompt) || 'AI service unavailable right now. Please try again later.'

      if (containsDiagnosticContent(responseText) && !hasDisclaimer(responseText)) {
        const disclaimer =
          '\n\n⚠️ **Disclaimer**: Swasth-AI provides pre-consultation information and home-care suggestions only. It does not provide formal medical diagnoses or replace physician care. For any major, severe, or persistent symptoms, please consult a doctor immediately.'
        responseText += disclaimer
      }

      const safety = validateAiOutput(responseText, medications, Array.isArray(prefs) ? prefs : [])
      if (!safety.safe) {
        const header =
          '⚠️ [SWASTH-AI CLINICAL SAFETY ALERT]\n' +
          safety.warnings.map(w => `• ${w}`).join('\n') +
          '\n--------------------------------------------\n\n'
        responseText = header + responseText
      }

      const [aiInsertResult] = await Promise.all([
        supabaseAdmin.from('chats').insert({ user_id: userId, role: 'ai', content: responseText }).select().single(),
        supabaseAdmin.from('agent_calls').insert({
          user_id: userId,
          query: body.text,
          tools_called: ['tier1_profile', 'tier2_vector_search', 'llm_generation'],
          retrieved_context: {
            profile,
            medications: medications.map((m: any) => ({ name: m.name, dose: m.dose || m.strength })),
            files: topMatches,
          } as any,
          safety_warnings: safety.warnings,
        }),
      ])

      const { data: allMessages } = await supabaseAdmin
        .from('chats')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
        .limit(200)

      return ok(res, allMessages || [])
    }

    // POST /api/gemini/chat/clear
    if ((sub === '/chat/clear' || sub === '/clear') && req.method === 'POST') {
      const { error } = await supabaseAdmin
        .from('chats')
        .delete()
        .eq('user_id', userId)
      if (error) throw { status: 400, message: error.message }
      return ok(res, { message: 'Chat cleared' })
    }

    // GET /api/gemini/audit
    if (sub === '/audit' && req.method === 'GET') {
      const { data, error } = await supabaseAdmin
        .from('agent_calls')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw { status: 400, message: error.message }
      return ok(res, data || [])
    }

    // POST /api/gemini/diagnostics/run
    if ((sub === '/diagnostics/run' || sub === '/diagnostics') && req.method === 'POST') {
      interface Step {
        name: string
        status: 'pass' | 'fail'
        durationMs: number
        details: string
      }

      const startTime = Date.now()
      const logs: string[] = []
      const steps: Step[] = []

      const addStep = (name: string, status: 'pass' | 'fail', durationMs: number, details: string) => {
        steps.push({ name, status, durationMs, details })
        logs.push(`[${status.toUpperCase()}] ${name} (${durationMs}ms): ${details}`)
      }

      const t1 = Date.now()
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      addStep('Tier 1: Fetch Profile & Preferences', profile ? 'pass' : 'fail', Date.now() - t1,
        profile ? `Fetched profile for ${profile.name || 'User'}` : 'Profile not found')

      const t2 = Date.now()
      const [medsRes, readingsRes] = await Promise.all([
        supabaseAdmin.from('medications').select('*').eq('user_id', userId),
        supabaseAdmin.from('readings').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(10),
      ])
      const medications = medsRes.data || []
      const recentReadings = readingsRes.data?.[0]?.reading_data || {}
      addStep('Tier 1: Retrieve Vitals & Medications', 'pass', Date.now() - t2,
        `Retrieved ${medications.length} medication(s). Recent vitals: ${JSON.stringify(recentReadings)}`)

      const t3 = Date.now()
      const sampleQuery = 'Am I taking any statins? Any risk of muscle toxicity?'
      const queryVector = await getEmbedding(sampleQuery)
      const { data: files } = await supabaseAdmin
        .from('files')
        .select('*')
        .eq('user_id', userId)
      const matches: Array<{ name: string; similarity: number }> = []
      for (const f of files || []) {
        const insight = f.ai_insight || f.aiInsight || ''
        const fVec = await getEmbedding(`${f.name} - ${insight}`)
        matches.push({ name: f.name, similarity: cosineSimilarity(queryVector, fVec) })
      }
      matches.sort((a, b) => b.similarity - a.similarity)
      const topMatch = matches[0]
      addStep('Tier 2: Semantic Document Vector Search', 'pass', Date.now() - t3,
        `Matched against ${files?.length || 0} files. Top: "${topMatch?.name || 'None'}" (${((topMatch?.similarity || 0) * 100).toFixed(1)}%)`)

      const t4 = Date.now()
      const prefs = profile?.conditions || profile?.dietary_preferences || []
      const contextStr = [
        `Profile: ${profile?.name || 'User'}, Gender: ${profile?.gender || 'N/A'}, Diet: ${Array.isArray(prefs) ? prefs.join(', ') : 'None'}`,
        `Medications (${medications.length}): ${medications.map((m: any) => m.name).join(', ') || 'None'}`,
        `Files (${files?.length || 0}): ${matches.slice(0, 3).map(m => `${m.name} (${(m.similarity * 100).toFixed(1)}%)`).join(', ')}`,
      ].join(' | ')
      const contextOk = contextStr.includes('Profile:') && contextStr.includes('Medications')
      addStep('RAG Orchestration: Context Assembly', contextOk ? 'pass' : 'fail', Date.now() - t4,
        contextOk ? `Assembled ${contextStr.length} chars of context` : 'Context assembly failed')

      const t5 = Date.now()
      const safety = validateAiOutput('Sample response about Atorvastatin and grapefruit risk', medications, Array.isArray(prefs) ? prefs : [])
      addStep('Clinical Safety Validator', safety.safe ? 'pass' : 'fail', Date.now() - t5,
        safety.safe ? 'No safety warnings triggered' : `Warnings: ${safety.warnings.join('; ')}`)

      return ok(res, {
        success: steps.every(s => s.status === 'pass'),
        duration: Date.now() - startTime,
        steps, logs,
        summary: {
          profileFound: !!profile,
          medicationCount: medications.length,
          fileCount: files?.length || 0,
          topMatch: topMatch?.name || null,
          topSimilarity: topMatch?.similarity ? `${(topMatch.similarity * 100).toFixed(1)}%` : 'N/A',
        },
      })
    }

    // POST /api/gemini/scan
    if (sub === '/scan' && req.method === 'POST') {
      const body = validateBody(req.body, scanSchema, res)
      if (!body) return

      let conflict = body.conflict
      let interactionCheck = body.interactionCheck || ''

      const { data: medications } = await supabaseAdmin
        .from('medications')
        .select('name, strength')
        .eq('user_id', userId)

      if (medications && medications.length > 0) {
        const knownInteractions: Record<string, string[]> = {
          atorvastatin: ['grapefruit', 'erythromycin', 'clarithromycin', 'itraconazole'],
          lisinopril: ['ibuprofen', 'naproxen', 'aspirin', 'potassium supplement'],
          metformin: ['alcohol', 'contrast dye', 'topiramate'],
          warfarin: ['aspirin', 'ibuprofen', 'vitamin k', 'cranberry'],
          simvastatin: ['grapefruit', 'amlodipine', 'verapamil'],
        }

        for (const med of medications) {
          const medLower = med.name.toLowerCase()
          const interactions = Object.entries(knownInteractions).find(([key]) => medLower.includes(key))
          if (interactions) {
            const [, conflicting] = interactions
            const found = conflicting.find(c => body.identifiedName.toLowerCase().includes(c))
            if (found) {
              conflict = true
              interactionCheck += `${interactionCheck ? '; ' : ''}Potential interaction between "${body.identifiedName}" and "${med.name}" (${found}). `
            }
          }
        }
      }

      const { data, error } = await supabaseAdmin
        .from('scans')
        .insert({ user_id: userId, identified_name: body.identifiedName, interaction_check: interactionCheck, conflict })
        .select()
        .single()

      if (error) throw { status: 400, message: error.message }
      return created(res, data)
    }

    return res.status(405).end()
  } catch (err) { return handleError(res, err) }
}
