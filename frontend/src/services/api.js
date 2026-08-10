import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const tokenStore = {
  get access() {
    return localStorage.getItem('access_token')
  },
  get refresh() {
    return localStorage.getItem('refresh_token')
  },
  setTokens(access, refresh) {
    localStorage.setItem('access_token', access)
    localStorage.setItem('refresh_token', refresh)
  },
  clear() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
  },
}

export const api = axios.create({
  baseURL,
})

api.interceptors.request.use((config) => {
  // Every request carries the active access token when one is available.
  const access = tokenStore.access
  if (access) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    // Failed requests get one refresh retry before the user is redirected.
    if (error.response?.status === 401 && !originalRequest._retry && tokenStore.refresh) {
      originalRequest._retry = true
      try {
        const refreshResponse = await axios.post(`${baseURL}/auth/refresh/`, { refresh: tokenStore.refresh })
        tokenStore.setTokens(refreshResponse.data.access, refreshResponse.data.refresh || tokenStore.refresh)
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access}`
        return api(originalRequest)
      } catch {
        tokenStore.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export const authApi = {
  login: (payload) => api.post('/auth/login/', payload),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
}
