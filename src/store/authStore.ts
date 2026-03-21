import { create } from 'zustand'
import { authService } from '../services/AuthService'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isLoading: boolean
  error: string | null

  // Actions
  loginWithNameAndBirth: (name: string, birthDate: string) => Promise<void>
  loginAdmin: (pin: string) => Promise<void>
  logout: () => void
  clearError: () => void
  restoreSession: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  restoreSession: () => {
    const user = authService.getSession()
    set({ user })
  },

  loginWithNameAndBirth: async (name, birthDate) => {
    set({ isLoading: true, error: null })
    try {
      const user = await authService.loginWithNameAndBirth(name, birthDate)
      set({ user, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  loginAdmin: async (pin) => {
    set({ isLoading: true, error: null })
    try {
      const user = await authService.loginAdmin(pin)
      set({ user, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  logout: () => {
    authService.logout()
    set({ user: null, error: null })
  },

  clearError: () => set({ error: null }),
}))