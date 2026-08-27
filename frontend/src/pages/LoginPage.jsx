import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Calculator,
  ShieldCheck,
  UserCog,
  UserRound,
  UsersRound,
  Warehouse,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import * as roles from '../roles'
import logo from '../assets/doves-logo.png'

const ROLE_TILES = [
  { role: roles.ADMIN, label: 'Admin', icon: UserCog },
  { role: roles.EVENT_PLANNER, label: 'Event Planner', icon: UsersRound },
  { role: roles.STOREKEEPER, label: 'Storekeeper', icon: Warehouse },
  { role: roles.ACCOUNTS, label: 'Accounts', icon: Calculator },
  { role: roles.TEAM_LEADER, label: 'Team Leader', icon: ShieldCheck },
  { role: roles.VENDOR, label: 'Vendor', icon: Briefcase },
  { role: roles.CLIENT, label: 'Client', icon: UserRound },
]

export default function LoginPage() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedRole, setSelectedRole] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to={location.state?.from?.pathname ?? '/'} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate(location.state?.from?.pathname ?? '/', { replace: true })
    } catch {
      setError('Invalid username or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex justify-center">
          <img src={logo} alt="Doves" className="h-16 w-auto" />
        </div>

        {!selectedRole ? (
          <div key="step-1" className="animate-fade-slide-up">
            <h1 className="mb-1 text-center text-xl font-bold text-gray-900">Who's signing in?</h1>
            <p className="mb-8 text-center text-sm text-gray-500">Choose your role to continue</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {ROLE_TILES.map(({ role, label, icon: Icon }) => (
                <button
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  className="flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-all duration-150 ease-out hover:-translate-y-0.5 hover:scale-[1.02] hover:border-brand-300 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                    <Icon size={22} />
                  </span>
                  <span className="text-sm font-medium text-gray-800">{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div key="step-2" className="animate-fade-slide-up mx-auto w-full max-w-sm">
            <button
              onClick={() => setSelectedRole(null)}
              className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-brand-600"
            >
              <ArrowLeft size={15} />
              Back to roles
            </button>

            <form onSubmit={handleSubmit} className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                {ROLE_TILES.find((r) => r.role === selectedRole)?.label}
              </span>
              <h1 className="mb-6 text-xl font-bold text-gray-900">Sign in to Doves</h1>

              <label className="mb-1 block text-sm font-medium text-gray-700">Username</label>
              <input
                className="input mb-4"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />

              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                className="input mb-4"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
