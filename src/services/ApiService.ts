const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiService {
  private async request<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add auth token if available
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    const response = await fetch(url, config)
    if (!response.ok) {
      const error = await response.text()
      throw new Error(error || `HTTP error! status: ${response.status}`)
    }
    return response.json()
  }

  // Auth endpoints
  async loginWithNameAndBirth(name: string, birthDate: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name, birthDate }),
    })
  }

  async loginAdmin(pin: string) {
    return this.request('/auth/admin-login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    })
  }

  async setAdminPin(pin: string) {
    return this.request('/auth/set-admin-pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    })
  }

  // Vote endpoints
  async castVote(voterId: string, votedUserId: string, categoryId: string) {
    return this.request('/votes', {
      method: 'POST',
      body: JSON.stringify({ voterId, votedUserId, categoryId }),
    })
  }

  async hasVoted(voterId: string, categoryId: string) {
    return this.request(`/votes/has-voted/${voterId}/${categoryId}`)
  }

  async getResults(categoryId: string) {
    return this.request(`/votes/results/${categoryId}`)
  }

  // Categories
  async getCategories() {
    return this.request('/categories')
  }

  async getCategoryWithCandidates(categoryId: string) {
    return this.request(`/categories/${categoryId}/candidates`)
  }

  // Users
  async getUsers() {
    return this.request('/users')
  }

  // Setup endpoints
  async importParticipants(participants: { name: string; birthDate: string }[]) {
    return this.request('/setup/import-participants', {
      method: 'POST',
      body: JSON.stringify({ participants }),
    })
  }

  async deleteParticipant(userId: string) {
    return this.request(`/setup/participants/${userId}`, {
      method: 'DELETE',
    })
  }

  async addCategory(name: string, description: string) {
    return this.request('/setup/categories', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    })
  }

  async deleteCategory(categoryId: string) {
    return this.request(`/setup/categories/${categoryId}`, {
      method: 'DELETE',
    })
  }

  async resetAllData() {
    return this.request('/setup/reset', {
      method: 'POST',
    })
  }

  async getDashboardStats() {
    return this.request('/admin/dashboard/stats')
  }

  async toggleVoting(categoryId: string) {
    return this.request(`/admin/categories/${categoryId}/toggle-voting`, {
      method: 'POST',
    })
  }
}

export const apiService = new ApiService()