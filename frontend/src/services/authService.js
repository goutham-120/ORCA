import { api } from './api'

export const authService = {
  register: (payload) => api('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => api('/auth/login', { method: 'POST', body: payload }),
  me: (email) => api('/auth/me', { headers: { 'X-ORCA-User': email } }),
}
