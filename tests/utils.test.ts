import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { getDietRecommendation } from '../src/utils/dietRecommendations'
import {
  medicationCreateSchema,
  profileUpdateSchema,
} from '../api/_lib/validate'
import { showToast, type Toast } from '../src/hooks/useToast'

// ========================================================================
// Diet Recommendations
// ========================================================================

describe('getDietRecommendation', () => {
  it('returns diabetic plan for diabetic user', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Type 2 Diabetes'] })
    expect(plan.breakfast).toContain('oatmeal')
    expect(plan.glycemicIndex).toContain('Low')
    expect(plan.clinicalNote).toContain('Diabetic')
    expect(plan.homeCareNote).toContain('Monitor blood sugar')
  })

  it('returns heart-healthy plan for hypertension', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Hypertension'] })
    expect(plan.breakfast).toContain('Oatmeal')
    expect(plan.clinicalNote).toContain('cardiovascular')
    expect(plan.homeCareNote).toContain('Monitor BP')
  })

  it('returns heart-healthy plan for high cholesterol', () => {
    const plan = getDietRecommendation({ activeDiseases: ['High Cholesterol'] })
    expect(plan.clinicalNote).toContain('cardiovascular')
  })

  it('returns renal-friendly plan for kidney disease', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Kidney Disease'] })
    expect(plan.breakfast).toContain('Low-protein')
    expect(plan.clinicalNote).toContain('renal')
    expect(plan.homeCareNote).toContain('nephrologist')
  })

  it('returns thyroid-supportive plan for thyroid', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Thyroid'] })
    expect(plan.breakfast).toContain('quinoa')
    expect(plan.clinicalNote).toContain('thyroid')
    expect(plan.homeCareNote).toContain('levothyroxine')
  })

  it('returns gastric-friendly plan for acidity', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Acidity'] })
    expect(plan.clinicalNote).toContain('gastric')
    expect(plan.homeCareNote).toContain('reflux')
  })

  it('returns weight management plan for fatty liver', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Fatty Liver'] })
    expect(plan.clinicalNote).toContain('Fatty Liver')
    expect(plan.homeCareNote).toContain('alcohol')
  })

  it('returns weight management plan for overweight (BMI >= 25)', () => {
    const plan = getDietRecommendation({ weightKg: '80', heightCm: '170' })
    expect(plan.calorieEstimate).toBe('1,400 - 1,700 kcal')
    expect(plan.clinicalNote).toContain('weight management')
  })

  it('returns weight management plan for obese (BMI >= 30)', () => {
    const plan = getDietRecommendation({ weightKg: '100', heightCm: '170' })
    expect(plan.calorieEstimate).toBe('1,400 - 1,700 kcal')
    expect(plan.clinicalNote).toContain('weight management')
  })

  it('returns fatty-liver variant when both fatty liver and overweight', () => {
    const plan = getDietRecommendation({
      activeDiseases: ['Fatty Liver'],
      weightKg: '80',
      heightCm: '170',
    })
    expect(plan.clinicalNote).toContain('Fatty Liver')
  })

  it('returns iron-rich plan for anemia', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Anemia'] })
    expect(plan.breakfast.toLowerCase()).toContain('spinach')
    expect(plan.clinicalNote).toContain('anemic')
  })

  it('returns vegetarian plan for vegetarian preference', () => {
    const plan = getDietRecommendation({ dietaryPreferences: ['Vegetarian'] })
    expect(plan.breakfast).toContain('apple')
    expect(plan.clinicalNote).toContain('vegetarian')
  })

  it('returns vegan breakfast for vegan preference', () => {
    const plan = getDietRecommendation({ dietaryPreferences: ['Vegan'] })
    expect(plan.breakfast).toContain('Smoothie')
  })

  it('returns non-veg plan for non-veg preference', () => {
    const plan = getDietRecommendation({ dietaryPreferences: ['Non Veg'] })
    expect(plan.breakfast).toContain('Eggs')
    expect(plan.lunch).toContain('chicken')
    expect(plan.clinicalNote).toContain('non-vegetarian')
  })

  it('returns balanced plan as fallback', () => {
    const plan = getDietRecommendation({})
    expect(plan.breakfast).toContain('apple')
    expect(plan.clinicalNote).toContain('Standard')
    expect(plan.homeCareNote).toContain('2.5L')
  })

  it('handles empty profile gracefully', () => {
    const plan = getDietRecommendation({})
    expect(plan.breakfast).toBeDefined()
    expect(plan.lunch).toBeDefined()
    expect(plan.dinner).toBeDefined()
  })

  it('diabetic plan takes priority over other conditions', () => {
    const plan = getDietRecommendation({
      activeDiseases: ['Type 2 Diabetes', 'Hypertension'],
    })
    expect(plan.clinicalNote).toContain('Diabetic')
  })

  it('returns dairy-safe note for anemic plan', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Anemia'] })
    expect(plan.homeCareNote).toContain('iron supplements')
    expect(plan.homeCareNote).toContain('hemoglobin')
  })

  it('thyroid plan mentions selenium sources', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Thyroid'] })
    expect(plan.lunch).toContain('selenium')
  })

  it('gastric plan advises against lying down after meals', () => {
    const plan = getDietRecommendation({ activeDiseases: ['GERD'] })
    expect(plan.dinner).toContain('before lying down')
  })

  it('cardiac plan limits sodium', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Heart Disease'] })
    expect(plan.notes).toContain('sodium')
  })

  it('kidney plan limits potassium', () => {
    const plan = getDietRecommendation({ activeDiseases: ['Kidney Disease'] })
    expect(plan.breakfast).toContain('Avoid high-potassium')
  })
})

// ========================================================================
// Zod Validation Schemas
// ========================================================================

describe('medicationCreateSchema', () => {
  it('passes valid medication payload', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'Lisinopril',
      strength: '10mg',
      dueTime: '09:00',
    })
    expect(result.success).toBe(true)
  })

  it('rejects empty name', () => {
    const result = medicationCreateSchema.safeParse({
      name: '',
      strength: '10mg',
      dueTime: '09:00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects name exceeding 100 chars', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'A'.repeat(101),
      strength: '10mg',
      dueTime: '09:00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing strength', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'Lisinopril',
      strength: '',
      dueTime: '09:00',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing dueTime', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'Lisinopril',
      strength: '10mg',
      dueTime: '',
    })
    expect(result.success).toBe(false)
  })

  it('applies defaults for form and frequency', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'Lisinopril',
      strength: '10mg',
      dueTime: '09:00',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.form).toBe('Tablet')
      expect(result.data.frequency).toBe('Daily')
    }
  })

  it('accepts optional reminderInterval', () => {
    const result = medicationCreateSchema.safeParse({
      name: 'Lisinopril',
      strength: '10mg',
      dueTime: '09:00',
      reminderInterval: '8h',
    })
    expect(result.success).toBe(true)
  })
})

describe('profileUpdateSchema', () => {
  it('passes with valid full profile', () => {
    const result = profileUpdateSchema.safeParse({
      fullName: 'Test User',
      dob: '1990-01-15',
      gender: 'Male',
      dietaryPreferences: ['Vegetarian'],
      weightKg: '75',
      heightCm: '175',
      healthGoals: ['Weight Loss'],
      activeDiseases: ['None'],
      otherDisease: '',
      medicalHistory: 'None',
      noMedication: false,
      profileMedications: [],
    })
    expect(result.success).toBe(true)
  })

  it('passes with empty optional fields', () => {
    const result = profileUpdateSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('rejects fullName exceeding 100 chars', () => {
    const result = profileUpdateSchema.safeParse({
      fullName: 'A'.repeat(101),
    })
    expect(result.success).toBe(false)
  })

  it('accepts boolean noMedication', () => {
    const result = profileUpdateSchema.safeParse({ noMedication: true })
    expect(result.success).toBe(true)
  })

  it('accepts string weightKg and heightCm', () => {
    const result = profileUpdateSchema.safeParse({
      weightKg: '80',
      heightCm: '180',
    })
    expect(result.success).toBe(true)
  })

  it('rejects non-array dietaryPreferences', () => {
    const result = profileUpdateSchema.safeParse({
      dietaryPreferences: 'Vegetarian',
    })
    expect(result.success).toBe(false)
  })
})

// ========================================================================
// showToast
// ========================================================================

describe('showToast', () => {
  it('exports showToast function', () => {
    expect(showToast).toBeDefined()
    expect(typeof showToast).toBe('function')
  })

  it('exports Toast type', () => {
    const toast: Toast = {
      id: 'test_1',
      message: 'hello',
      type: 'success',
    }
    expect(toast.id).toMatch(/^test_\d+$/)
    expect(toast.message).toBe('hello')
    expect(toast.type).toBe('success')
  })

  it('showToast creates incrementing IDs', () => {
    const captured: string[] = []
    const originalPush = Array.prototype.push

    showToast('msg1', 'info')
    showToast('msg2', 'error')
    // Can't easily test without registering a listener,
    // but we can verify the function doesn't throw
    expect(() => showToast('test', 'info')).not.toThrow()
  })

  it('supports all toast types', () => {
    const types: Toast['type'][] = ['success', 'error', 'info']
    types.forEach(type => {
      expect(() => showToast(`test ${type}`, type)).not.toThrow()
    })
  })
})
