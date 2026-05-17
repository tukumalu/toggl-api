import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

type LocationState = {
  from?: {
    pathname?: string
  }
}

export default function LoginPage() {
  const { isAuthenticated, isDemoMode, signInWithPassword } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const state = location.state as LocationState | null
  const destination = state?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate replace to={destination} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    if (isDemoMode) {
      navigate(destination, { replace: true })
      return
    }

    const result = await signInWithPassword(email, password)

    if (result.error) {
      setError(result.error.message)
      setSubmitting(false)
      return
    }

    navigate(destination, { replace: true })
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-icon">{'⏱️'}</div>
        <div className="login-title">TIME JOURNAL</div>
        <div className="login-divider" />
        <div className="login-tagline">YOUR TOGGL DATA &middot; VISUALIZED</div>

        {isDemoMode ? (
          <div className="login-form">
            <button onClick={() => navigate(destination, { replace: true })}>
              {'→'} Access Dashboard
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              type="email"
              value={email}
              placeholder="Email"
            />
            <input
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              value={password}
              placeholder="Password"
            />
            <button disabled={submitting} type="submit">
              {submitting ? 'Signing in...' : '→ Access Dashboard'}
            </button>
          </form>
        )}
        {error && <p className="error-text" style={{ marginTop: '1rem' }}>{error}</p>}
      </div>
    </div>
  )
}
