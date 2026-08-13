import { GoogleGenAI } from '@google/genai'

const geminiKey = process.env.GEMINI_API_KEY
const cohereKey = process.env.COHERE_API_KEY

const hasKey = (v?: string) => Boolean(v && v.trim() && !v.includes('YOUR_'))

let ai: GoogleGenAI | null = null
if (hasKey(geminiKey)) {
  ai = new GoogleGenAI({ apiKey: geminiKey })
}

const useCohere = hasKey(cohereKey)

export async function generateChat(prompt: string): Promise<string> {
  if (useCohere) {
    try {
      return await generateCohereChat(prompt)
    } catch (e) {
      console.error('[Swasth-AI] Cohere failed, falling back to Gemini:', e)
    }
  }

  if (ai) {
    try {
      const result = await generateContentWithRetry({ model: 'gemini-2.0-flash', contents: prompt })
      return (result as any)?.text || ''
    } catch (e) {
      console.error('[Swasth-AI] Gemini failed:', e)
    }
  }

  return ''
}

async function generateCohereChat(prompt: string): Promise<string> {
  const res = await fetch('https://api.cohere.ai/v1/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cohereKey}`,
      'X-Client-Name': 'SwasthAI',
    },
    body: JSON.stringify({
      stream: false,
      model: 'command-r-plus-08-2024',
      message: prompt,
      temperature: 0.4,
      max_tokens: 450,
    }),
  })

  if (!res.ok) throw new Error(`Cohere request failed: ${res.status}`)
  const data: any = await res.json()
  return data.text || ''
}

async function generateContentWithRetry(params: any, maxRetries = 3, delayMs = 1500): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await ai!.models.generateContent(params)
    } catch (err: any) {
      if (attempt < maxRetries && (err?.status === 429 || err?.status >= 500)) {
        await new Promise(r => setTimeout(r, delayMs * attempt))
        continue
      }
      throw err
    }
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (!ai) {
    throw new Error('Embedding API key is required for dynamic vector search')
  }

  try {
    const response: any = await ai.models.embedContent({
      model: 'gemini-embedding-2-preview',
      contents: text,
    })
    if (response.embedding?.values) return response.embedding.values
    throw new Error('No embedding values')
  } catch {
    throw new Error('Embedding request failed')
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0
  let dp = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dp += a[i] * b[i]
    magA += a[i] * a[i]
    magB += b[i] * b[i]
  }
  magA = Math.sqrt(magA)
  magB = Math.sqrt(magB)
  if (magA === 0 || magB === 0) return 0
  return dp / (magA * magB)
}
