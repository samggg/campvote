import { apiService } from './ApiService'
import type { User } from '../types'

const SESSION_KEY = 'campvote_session'

export class AuthService {

  /**
   * Login do participante: nome completo + data de nascimento.
   * Busca todos os usuários e compara nome normalizado + birthDate.
   */
  async loginWithNameAndBirth(name: string, birthDate: string): Promise<User> {
    if (!name.trim()) throw new Error('Informe seu nome completo.')
    if (!birthDate)   throw new Error('Informe sua data de nascimento.')

    const user = await apiService.loginWithNameAndBirth(name, birthDate) as User

    this.saveSession(user)

    return user
  }

  /** Login do admin com PIN numérico */
  async loginAdmin(pin: string): Promise<User> {
    const admin = await apiService.loginAdmin(pin) as User

    this.saveSession(admin)

    return admin
  }

  /** Configura o PIN do admin */
  async setAdminPin(pin: string): Promise<void> {
    await apiService.setAdminPin(pin)
  }

  getSession(): User | null {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    try { return JSON.parse(raw) as User } catch { return null }
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_KEY)
  }

  private saveSession(user: User): void {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  }
}

export const authService = new AuthService()