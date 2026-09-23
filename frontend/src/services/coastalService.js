import { api } from './api'

export const coastalService = {
  // 1. Hazards
  async fetchHazards(region) {
    const query = region ? `?region=${encodeURIComponent(region)}` : ''
    try {
      return await api(`/api/coastal/hazards${query}`)
    } catch (err) {
      console.warn('API error fetching hazards, returning empty fallback', err)
      return []
    }
  },

  async submitHazard(hazardData) {
    try {
      return await api('/api/coastal/hazards', {
        method: 'POST',
        body: hazardData,
      })
    } catch (err) {
      console.error('Failed to submit hazard report to API', err)
      throw err
    }
  },

  async acknowledgeHazard(hazardId) {
    try {
      return await api(`/api/coastal/hazards/${hazardId}/acknowledge`, {
        method: 'POST',
      })
    } catch (err) {
      console.error('Failed to acknowledge hazard', err)
      throw err
    }
  },

  // 2. Complaints & Messages
  async fetchComplaints(region, senderEmail) {
    const params = new URLSearchParams()
    if (region) params.append('region', region)
    if (senderEmail) params.append('sender_email', senderEmail)
    const query = params.toString() ? `?${params.toString()}` : ''
    try {
      return await api(`/api/coastal/complaints${query}`)
    } catch (err) {
      console.warn('API error fetching complaints, returning empty fallback', err)
      return []
    }
  },

  async fetchMyComplaints() {
    try {
      return await api('/api/coastal/complaints/my')
    } catch (err) {
      console.warn('API error fetching my complaints', err)
      return []
    }
  },

  async submitComplaint(complaintData) {
    try {
      return await api('/api/coastal/complaints', {
        method: 'POST',
        body: complaintData,
      })
    } catch (err) {
      console.error('Failed to submit complaint', err)
      throw err
    }
  },

  async respondComplaint(complaintId, responseText) {
    try {
      return await api(`/api/coastal/complaints/${complaintId}/respond`, {
        method: 'POST',
        body: { response: responseText },
      })
    } catch (err) {
      console.error('Failed to respond to complaint', err)
      throw err
    }
  },

  // 3. Announcements
  async fetchAnnouncements(region, targetAudience) {
    const params = new URLSearchParams()
    if (region) params.append('region', region)
    if (targetAudience) params.append('target_audience', targetAudience)
    const query = params.toString() ? `?${params.toString()}` : ''
    try {
      return await api(`/api/coastal/announcements${query}`)
    } catch (err) {
      console.warn('API error fetching announcements', err)
      return []
    }
  },

  async publishAnnouncement(announcementData) {
    try {
      return await api('/api/coastal/announcements', {
        method: 'POST',
        body: announcementData,
      })
    } catch (err) {
      console.error('Failed to publish announcement', err)
      throw err
    }
  },
}
