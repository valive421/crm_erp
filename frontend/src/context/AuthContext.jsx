import { createContext, useContext, useEffect, useState } from 'react'
import { authApi, tokenStore } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      // On first load we rehydrate the session from the stored access token.
      if (!tokenStore.access) {
        setLoading(false)
        return
      }
      try {
        const response = await authApi.me()
        if (mounted) {
          setUser(response.data)
          localStorage.setItem('user', JSON.stringify(response.data))
        }
      } catch {
        tokenStore.clear()
        if (mounted) setUser(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const login = async (username, password) => {
    // Login returns both tokens and the normalized user object.
    const response = await authApi.login({ username, password })
    tokenStore.setTokens(response.data.access, response.data.refresh)
    setUser(response.data.user)
    localStorage.setItem('user', JSON.stringify(response.data.user))
    return response.data.user
  }

  const logout = async () => {
    try {
      if (tokenStore.refresh) {
        await authApi.logout(tokenStore.refresh)
      }
    } finally {
      tokenStore.clear()
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
