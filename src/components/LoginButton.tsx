import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'

export function LoginButton() {
  const { signInWithGoogle } = useAuth()

  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (credentialResponse.credential) {
          const { error } = await signInWithGoogle(credentialResponse.credential)
          if (error) {
            console.error('Google sign-in failed:', error.message)
          }
        }
      }}
      onError={() => console.error('Google Login failed')}
      size="large"
      shape="pill"
      text="continue_with"
    />
  )
}
