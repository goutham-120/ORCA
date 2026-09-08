import { api } from './api'

const authorized = (token) => ({ Authorization: `Bearer ${token}` })

export const authService = {
  register: (payload) => api('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload }),
  me: (token) => api('/auth/me', { headers: authorized(token) }),
  updateProfile: (token, payload) => api('/auth/profile', { method: 'PUT', body: payload, headers: authorized(token) }),
}
