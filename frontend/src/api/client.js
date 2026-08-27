import axios from 'axios'

const ACCESS_KEY = 'doves_access_token'
const REFRESH_KEY = 'doves_refresh_token'

export const tokenStore = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access, refresh) => {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error
    if (response?.status !== 401 || config._retried || !tokenStore.getRefresh()) {
      throw error
    }
    config._retried = true

    if (!refreshPromise) {
      refreshPromise = axios
        .post('/api/auth/token/refresh/', { refresh: tokenStore.getRefresh() })
        .then((res) => {
          tokenStore.set(res.data.access, res.data.refresh)
          return res.data.access
        })
        .catch((refreshError) => {
          tokenStore.clear()
          window.location.assign('/login')
          throw refreshError
        })
        .finally(() => {
          refreshPromise = null
        })
    }

    const newAccess = await refreshPromise
    config.headers.Authorization = `Bearer ${newAccess}`
    return api(config)
  }
)

export default api
