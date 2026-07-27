import { GoogleLogin, type GoogleLoginProps } from '@react-oauth/google'
import { useAuth } from '../hooks/useAuth'

type Props = Pick<GoogleLoginProps, 'size' | 'shape' | 'text'>

export function LoginButton({ size = 'large', shape = 'pill', text = 'continue_with' }: Props) {
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
      size={size}
      shape={shape}
      text={text}
    />
  )
}
