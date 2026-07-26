import { useGoogleOneTapLogin } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'

export function GoogleOneTap() {
  const { signInWithGoogle, session } = useAuth()

  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      if (credentialResponse.credential) {
        const { error } = await signInWithGoogle(credentialResponse.credential)
        if (error) {
          console.error('Google One Tap sign-in failed:', error.message)
        }
      }
    },
    onError: () => console.error('Google One Tap error'),
    disabled: !!session,
  })

  return null
}
