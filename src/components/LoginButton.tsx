import { useRef, useState } from 'react'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { showToast } from '../hooks/useToast'
import { Loader2 } from 'lucide-react'

interface Props {
  size?: 'small' | 'medium' | 'large'
  shape?: 'pill' | 'rectangular'
  text?: string
}

function decodeJWT(token: string): { email?: string } {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    return { email: JSON.parse(atob(parts[1])).email }
  } catch {
    return {}
  }
}

export function LoginButton({ size = 'large', shape = 'pill' }: Props) {
  const { signInWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [checkingProfile, setCheckingProfile] = useState(false)
  const googleWrapRef = useRef<HTMLDivElement>(null)

  const busy = isLoading || checkingProfile

  const handleCredential = async (credential: string) => {
    const { email } = decodeJWT(credential)
    if (!email) {
      showToast('Unable to verify your email. Please try again.', 'error')
      return
    }

    setCheckingProfile(true)
    try {
      const { data: existingProfile, error } = await supabase
        .from('profiles')
        .select('user_id, email')
        .ilike('email', email)
        .maybeSingle()

      setCheckingProfile(false)

      if (error) {
        showToast('Could not verify account. Please try again.', 'error')
        return
      }
      if (!existingProfile) {
        showToast(`No account found for ${email}. Please register first!`, 'error')
        return
      }

      setIsLoading(true)
      showToast('Signing in...', 'info')
      const { error: signInError } = await signInWithGoogle(credential)
      if (signInError) {
        setIsLoading(false)
        showToast('Sign in failed. Please try again.', 'error')
      } else {
        showToast('Login successful!', 'success')
      }
    } catch {
      setIsLoading(false)
      setCheckingProfile(false)
      showToast('An error occurred. Please try again.', 'error')
    }
  }

  const triggerGoogleLogin = () => {
    if (busy) return
    // Click the real Google button that's hidden behind our custom one
    const btn = googleWrapRef.current?.querySelector<HTMLElement>('[role="button"], button, div[tabindex]')
    btn?.click()
  }

  const height = size === 'small' ? '32px' : size === 'medium' ? '38px' : '44px'
  const fontSize = size === 'small' ? '12px' : size === 'medium' ? '13px' : '14px'
  const radius = shape === 'pill' ? '9999px' : '10px'
  const minWidth = size === 'medium' ? '160px' : '200px'
  const label = checkingProfile ? 'Checking account…' : isLoading ? 'Signing in…' : 'Sign in with Google'

  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {/* Real Google button — invisible, sits underneath, handles the OAuth popup */}
      <div
        ref={googleWrapRef}
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: busy ? 'none' : 'auto',
          overflow: 'hidden',
          borderRadius: radius,
          zIndex: 0,
        }}
        aria-hidden="true"
      >
        <GoogleLogin
          onSuccess={async (res) => {
            if (res.credential) await handleCredential(res.credential)
          }}
          onError={() => showToast('Google sign in was cancelled or failed.', 'error')}
          size={size === 'small' ? 'small' : size === 'medium' ? 'medium' : 'large'}
          shape={shape === 'pill' ? 'pill' : 'rectangular'}
          useOneTap={false}
          auto_select={false}
        />
      </div>

      {/* Our custom button on top — purely visual, click delegates to Google button */}
      <button
        type="button"
        onClick={triggerGoogleLogin}
        disabled={busy}
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          height,
          minWidth,
          padding: '0 18px',
          background: '#fff',
          border: '1.5px solid #dadce0',
          borderRadius: radius,
          fontSize,
          fontFamily: 'Manrope, system-ui, sans-serif',
          fontWeight: 600,
          color: '#3c4043',
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.7 : 1,
          transition: 'box-shadow 0.15s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!busy) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.14)' }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)' }}
      >
        {busy ? (
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite', flexShrink: 0, color: '#5f6368' }} />
        ) : (
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
        )}
        {label}
      </button>
    </div>
  )
}
