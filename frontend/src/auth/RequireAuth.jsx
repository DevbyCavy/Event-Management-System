import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function RequireAuth({ roles, children }) {
  const { user, loading, hasRole } = useAuth()
  const location = useLocation()

  if (loading) return null
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />

  return children
}
