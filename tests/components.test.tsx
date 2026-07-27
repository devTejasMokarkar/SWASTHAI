// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('motion/react', () => {
  const htmlTags = [
    'div', 'p', 'span', 'button', 'section', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'li', 'ol', 'a', 'img', 'input', 'label', 'select', 'option',
    'table', 'tr', 'td', 'th', 'tbody', 'thead',
    'header', 'footer', 'nav', 'main', 'aside', 'article',
  ]
  const motion: Record<string, string> = {}
  for (const tag of htmlTags) {
    motion[tag] = tag
  }
  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  }
})

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ size, shape, text }: any) => (
    <button data-testid="google-login" data-size={size} data-shape={shape} data-text={text}>
      Sign in with Google
    </button>
  ),
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useGoogleOneTapLogin: vi.fn(),
}))

vi.mock('../src/hooks/useAuth', () => ({
  useAuth: () => ({
    signInWithGoogle: vi.fn(),
    session: null,
    user: null,
    profile: null,
    loading: false,
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}))

vi.mock('../src/components/ui/StepIndicator', () => ({
  StepIndicator: ({ currentStep, totalSteps }: any) => (
    <div data-testid="step-indicator">{currentStep}/{totalSteps}</div>
  ),
}))

vi.mock('../src/components/onboarding/Step1PersonalProfile', () => ({
  Step1PersonalProfile: ({ data }: any) => (
    <div data-testid="step1-personal">
      <input data-testid="input-name" defaultValue={data.fullName} />
    </div>
  ),
}))

vi.mock('../src/components/onboarding/Step2MedicalInfo', () => ({
  Step2MedicalInfo: () => <div data-testid="step2-medical" />,
}))

// NOTE: OnboardingWizard imports LoginButton from "../LoginButton",
// which renders <GoogleLogin> from @react-oauth/google (mocked above).
// No separate LoginButton mock needed.

// Polyfill Notification for jsdom
vi.stubGlobal('Notification', {
  permission: 'granted',
  requestPermission: vi.fn(),
})

// Mock WellnessHydrationModal used by Dashboard
vi.mock('../src/components/WellnessHydrationModal', () => ({
  default: () => null,
}))

// ── Tests ──────────────────────────────────────────────────────────

describe('OnboardingWizard — sign-in button', () => {
  async function renderOnboarding() {
    const { OnboardingWizard } = await import('../src/components/onboarding/OnboardingWizard')
    return render(<OnboardingWizard />)
  }

  it('shows "Already registered?" and Google sign-in on step 1', async () => {
    await renderOnboarding()
    expect(screen.getByText('Already registered?')).toBeTruthy()
    expect(screen.getByTestId('google-login')).toBeTruthy()
  })

  it('passes size=medium and text=signin_with to Google button', async () => {
    await renderOnboarding()
    const btn = screen.getByTestId('google-login')
    expect(btn.getAttribute('data-size')).toBe('medium')
    expect(btn.getAttribute('data-text')).toBe('signin_with')
  })

  it('renders step 1 by default', async () => {
    await renderOnboarding()
    expect(screen.getByTestId('step1-personal')).toBeTruthy()
  })
})

describe('LoginButton', () => {
  it('renders GoogleLogin with default large size', async () => {
    const { LoginButton } = await import('../src/components/LoginButton')
    render(<LoginButton />)
    const btn = screen.getByTestId('google-login')
    expect(btn.getAttribute('data-size')).toBe('large')
    expect(btn.getAttribute('data-shape')).toBe('pill')
  })
})

describe('ToastContainer', () => {
  it('renders nothing when toasts array is empty', async () => {
    const { ToastContainer } = await import('../src/hooks/useToast')
    const { container } = render(<ToastContainer toasts={[]} dismiss={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders toast messages', async () => {
    const { ToastContainer } = await import('../src/hooks/useToast')
    const toasts = [
      { id: '1', message: 'Success!', type: 'success' as const },
      { id: '2', message: 'Error!', type: 'error' as const },
    ]
    render(<ToastContainer toasts={toasts} dismiss={vi.fn()} />)
    expect(screen.getByText('Success!')).toBeTruthy()
    expect(screen.getByText('Error!')).toBeTruthy()
  })

  it('calls dismiss when close button is clicked', async () => {
    const { ToastContainer } = await import('../src/hooks/useToast')
    const dismiss = vi.fn()
    const toasts = [{ id: '1', message: 'Test', type: 'info' as const }]
    render(<ToastContainer toasts={toasts} dismiss={dismiss} />)
    const closeBtn = screen.getByText('×')
    closeBtn.click()
    expect(dismiss).toHaveBeenCalledWith('1')
  })
})

describe('Dashboard — loading skeleton', () => {
  it('renders skeleton placeholders when loading is true', async () => {
    vi.mock('../src/utils/dietRecommendations', () => ({
      getDietRecommendation: () => ({
        breakfast: 'Oatmeal',
        lunch: 'Rice',
        dinner: 'Soup',
        glycemicIndex: 'Low',
        calorieEstimate: '1800',
        notes: 'Test',
        clinicalNote: 'Test',
        homeCareNote: 'Test',
      }),
    }))

    const { default: Dashboard } = await import('../src/components/Dashboard')

    const { container } = render(
      <Dashboard
        user={{ id: '1', email: 't@t.com' } as any}
        smartActions={{ waterLoggedMl: 500, waterGoalMl: 2000, vitaminD: false, breathing: false }}
        vitals={{ heartRate: 72, steps: 5000, sleep: '7h', calories: 1800, activityTrends: [] }}
        onUpdateWater={vi.fn()}
        onToggleAction={vi.fn()}
        onUpdateVitals={vi.fn()}
        loading={true}
      />,
    )

    const skeletons = container.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Medications — mg dropdown', () => {
  it('strength unit select includes mg option', async () => {
    vi.mock('../src/utils/smartDefaults', () => ({
      getSmartDefaults: () => [],
    }))

    const { default: Medications } = await import('../src/components/Medications')
    const { container } = render(
      <Medications
        medications={[]}
        onAddMedication={vi.fn() as any}
        onToggleTaken={vi.fn()}
        onToggleReminder={vi.fn()}
        onDeleteMedication={vi.fn()}
        token={null}
      />,
    )

    const addBtn = screen.getByText('Add New')
    fireEvent.click(addBtn)

    const strengthUnitSelect = container.querySelector('select')
    expect(strengthUnitSelect).toBeTruthy()
    const options = strengthUnitSelect ? Array.from(strengthUnitSelect.querySelectorAll('option')) : []
    const values = options.map(o => (o as HTMLOptionElement).value)
    expect(values).toContain('mg')
    expect(values).toContain('mcg')
    expect(values).toContain('g')
    expect(values).toContain('ml')
    expect(values).toContain('IU')
    expect(values).toContain('%')
  })
})
