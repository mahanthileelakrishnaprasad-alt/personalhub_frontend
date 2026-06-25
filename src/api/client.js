import axios from 'axios'

// In dev, Vite proxy forwards /api → http://127.0.0.1:8000/api
// In production, set VITE_API_BASE to your backend URL (e.g. https://your-backend.onrender.com)
const BASE = import.meta.env.VITE_API_BASE || ''

const api = axios.create({
  baseURL: `${BASE}/api/`,
})

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers['Authorization'] = `Token ${token}`
  return config
})

// On 401, clear token and reload to login
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
