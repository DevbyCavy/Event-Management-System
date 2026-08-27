import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api, { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      const res = await api.get('/auth/me/')
      setUser(res.data)
    } catch {
      tokenStore.clear()
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = useCallback(
    async (username, password) => {
      const res = await api.post('/auth/token/', { username, password })
      tokenStore.set(res.data.access, res.data.refresh)
      await loadUser()
    },
    [loadUser]
  )

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const hasRole = useCallback(
    (...roles) => {
      if (!user) return false
      if (user.is_superuser) return true
      return roles.some((role) => user.groups.includes(role))
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
