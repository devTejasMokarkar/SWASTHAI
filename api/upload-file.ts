import type { VercelRequest, VercelResponse } from '@vercel/node'
import { authenticate } from './_lib/authenticate'
import { supabaseAdmin } from './_lib/supabaseAdmin'
import { created, badRequest, handleError } from './_lib/apiResponse'
import crypto from 'crypto'

export const config = { api: { bodyParser: false } }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  try {
    const { userId } = await authenticate(req)

    const busboy = (await import('busboy')).default
    const bb = busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } })

    let fileName = 'file'
    let fileBuffer: Buffer | null = null
    let mimeType = 'application/octet-stream'

    bb.on('file', (fieldname: string, stream: any, info: { filename: string; encoding: string; mimeType: string }) => {
      fileName = info.filename
      mimeType = info.mimeType
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', () => { fileBuffer = Buffer.concat(chunks) })
    })

    bb.on('finish', async () => {
      if (!fileBuffer) return badRequest(res, 'No file uploaded')

      const ext = fileName.split('.').pop() || 'bin'
      const storagePath = `${userId}/${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('health-files')
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

      if (uploadError) return badRequest(res, uploadError.message)

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('health-files')
        .getPublicUrl(storagePath)

      const { data, error } = await supabaseAdmin
        .from('files')
        .insert({
          user_id: userId,
          name: fileName,
          type: mimeType,
          storage_path: storagePath,
          url: publicUrl,
          size: formatSize(fileBuffer.length),
        })
        .select()
        .single()

      if (error) return badRequest(res, error.message)
      return created(res, data)
    })

    bb.on('error', (err: Error) => {
      return badRequest(res, err.message)
    })

    req.pipe(bb)
  } catch (err) { return handleError(res, err) }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
