import { db } from '../db/database'
import { sha256 } from '../utils/hash'
import type { User } from '../types'

const ADMIN_PIN_HASH_KEY = 'campvote_admin_pin_hash'
const SESSION_KEY = 'campvote_session'

// Normaliza nome: minúsculas, sem espaços duplos, sem acentos
function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, ' ')            // colapsa espaços
}

export class AuthService {

  /**
   * Login do participante: nome completo + data de nascimento.
   * Busca todos os usuários e compara nome normalizado + birthDate.
   */
  async loginWithNameAndBirth(name: string, birthDate: string): Promise<User> {
    if (!name.trim()) throw new Error('Informe seu nome completo.')
    if (!birthDate)   throw new Error('Informe sua data de nascimento.')

    const normalizedInput = normalizeName(name)

    const allUsers = await db.users.filter(u => !u.isAdmin).toArray()

    const user = allUsers.find(u =>
      normalizeName(u.name) === normalizedInput &&
      u.birthDate === birthDate
    )

    if (!user) throw new Error('Nome ou data de nascimento incorretos.')

    this.saveSession(user)

    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: 'user_login',
      userId: user.id,
      payloadHash: await sha256(user.id + Date.now()),
      createdAt: new Date().toISOString(),
    })

    return user
  }

  /** Login do admin com PIN numérico */
  async loginAdmin(pin: string): Promise<User> {
    const storedHash = localStorage.getItem(ADMIN_PIN_HASH_KEY)
    if (!storedHash) throw new Error('PIN de admin não configurado. Acesse o Setup primeiro.')

    const inputHash = await sha256(pin)
    if (inputHash !== storedHash) throw new Error('PIN incorreto.')

    const admin = await db.users.filter(u => u.isAdmin).first()
    if (!admin) throw new Error('Usuário admin não encontrado.')

    this.saveSession(admin)

    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: 'admin_login',
      userId: admin.id,
      payloadHash: await sha256(admin.id + Date.now()),
      createdAt: new Date().toISOString(),
    })

    return admin
  }

  /** Configura o PIN do admin */
  async setAdminPin(pin: string): Promise<void> {
    const hash = await sha256(pin)
    localStorage.setItem(ADMIN_PIN_HASH_KEY, hash)
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