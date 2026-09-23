import { api } from './api'

const authorized = (token) => ({ Authorization: `Bearer ${token}` })

export const authService = {
  register: (payload) => api('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload }),
  adminLogin: (payload) => api('/auth/admin/login', { method: 'POST', body: payload }),
  me: (token) => api('/auth/me', { headers: authorized(token) }),
  logout: (token) => api('/auth/logout', { method: 'POST', headers: authorized(token) }),
  getPendingUsers: (token) => api('/auth/pending-users', { headers: authorized(token) }),
  approveUser: (token, userId) => api(`/auth/approve/${userId}`, { method: 'POST', headers: authorized(token) }),
  rejectUser: (token, userId) => api(`/auth/reject/${userId}`, { method: 'POST', headers: authorized(token) }),
  updateProfile: (token, payload) => api('/auth/profile', { method: 'PUT', body: payload, headers: authorized(token) }),
  getLoginActivity: (token, { role, status, date } = {}) => {
    const params = new URLSearchParams()
    if (role && role !== 'all') params.append('role', role)
    if (status && status !== 'all') params.append('status', status)
    if (date && date.trim()) params.append('date', date.trim())
    const query = params.toString() ? `?${params.toString()}` : ''
    return api(`/auth/admin/login-activity${query}`, { headers: authorized(token) })
  },
}
