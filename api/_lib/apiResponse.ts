import type { VercelResponse } from '@vercel/node'

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: { code: string; message: string }
  meta?: { page: number; limit: number; total: number }
}

export function ok<T>(res: VercelResponse, data: T, meta?: ApiResponse['meta']) {
  return res.status(200).json({ success: true, data, meta } satisfies ApiResponse<T>)
}

export function created<T>(res: VercelResponse, data: T) {
  return res.status(201).json({ success: true, data } satisfies ApiResponse<T>)
}

export function noContent(res: VercelResponse) {
  return res.status(204).end()
}

export function badRequest(res: VercelResponse, message: string, code = 'BAD_REQUEST') {
  return res.status(400).json({ success: false, error: { code, message } } satisfies ApiResponse)
}

export function notFound(res: VercelResponse, message = 'Resource not found') {
  return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message } } satisfies ApiResponse)
}

export function serverError(res: VercelResponse, error: unknown) {
  console.error(error)
  return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } } satisfies ApiResponse)
}

export function handleError(res: VercelResponse, error: unknown) {
  if (error && typeof error === 'object' && 'status' in error) {
    const e = error as { status: number; message: string }
    return res.status(e.status).json({ success: false, error: { code: 'ERROR', message: e.message } } satisfies ApiResponse)
  }
  return serverError(res, error)
}
