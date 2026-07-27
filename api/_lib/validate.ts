import { z } from 'zod'
import type { VercelResponse } from '@vercel/node'
import { badRequest } from './apiResponse'

export function validateBody<T extends z.ZodTypeAny>(
  body: unknown,
  schema: T,
  res: VercelResponse,
): z.infer<T> | null {
  const result = schema.safeParse(body)
  if (!result.success) {
    badRequest(res, result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '))
    return null
  }
  return result.data
}

// ---- Shared Schemas ----

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const waterSchema = z.object({
  amount: z.number().int().min(1).max(10000),
})

export const actionToggleSchema = z.object({
  action: z.enum(['vitaminD', 'breathing']),
})

export const vitalReadingSchema = z.object({
  type: z.enum(['blood_sugar', 'blood_pressure', 'temperature', 'spo2']),
  sugarValue: z.number().optional(),
  sugarUnit: z.enum(['mg/dL', 'mmol/L']).optional(),
  sugarContext: z.enum(['Fasting', 'Post-meal', 'Random', 'Bedtime']).optional(),
  systolic: z.number().int().optional(),
  diastolic: z.number().int().optional(),
  pulse: z.number().int().optional(),
  tempValue: z.number().optional(),
  tempUnit: z.enum(['F', 'C']).optional(),
  spo2Value: z.number().int().min(0).max(100).optional(),
  overrideTimestamp: z.number().optional(),
})

export const vitalReminderSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  time: z.string().optional(),
  frequency: z.string().default('daily'),
  repeatDays: z.array(z.string()).default([]),
})

export const vitalReminderUpdateSchema = vitalReminderSchema.partial().extend({
  completed: z.boolean().optional(),
})

export const chatMessageSchema = z.object({
  text: z.string().min(1).max(10000),
  sender: z.enum(['user', 'ai']).default('user'),
})

export const scanSchema = z.object({
  identifiedName: z.string().min(1),
  interactionCheck: z.string().optional(),
  conflict: z.boolean().default(false),
})

export const creditActionSchema = z.object({
  amount: z.number().int().positive(),
  feature: z.string().min(1),
  tokensUsed: z.number().int().optional(),
})

export const sessionStartSchema = z.object({
  userAgent: z.string().optional(),
  deviceInfo: z.record(z.string(), z.any()).optional(),
})

export const paginationMeta = (page: number, limit: number, total: number) => ({ page, limit, total })
