// ─── Entidades principais ────────────────────────────────────────────────────

export interface User {
  id: string
  name: string
  birthDate: string     // formato YYYY-MM-DD — usado para autenticação
  isAdmin: boolean
  deviceId?: string
  createdAt: string     // ISO string
}

export interface Category {
  id: string
  name: string
  description?: string
  isActive: boolean
  votingOpen: boolean
  maxVotesPerUser: number
  createdAt: string
}

export interface Vote {
  id: string
  voterId: string
  votedUserId: string
  categoryId: string
  deviceId: string
  voteHash: string      // SHA-256(voterId+categoryId+deviceId+timestamp)
  votedAt: string
  synced: boolean
}

export interface CategoryEligibility {
  id: string
  categoryId: string
  userId: string        // quem pode ser votado nessa categoria
}

export interface Device {
  id: string
  fingerprint: string   // identificador único do browser/dispositivo
  platform: string      // 'web-mobile' | 'web-desktop'
  registeredAt: string
  lastVoteAt?: string
}

export interface AuditLog {
  id: string
  action: AuditAction
  userId?: string
  deviceId?: string
  payloadHash: string
  createdAt: string
}

// ─── Enums e tipos auxiliares ────────────────────────────────────────────────

export type AuditAction =
  | 'vote_cast'
  | 'user_login'
  | 'admin_login'
  | 'voting_opened'
  | 'voting_closed'
  | 'results_exported'

export interface VoteResult {
  userId: string
  userName: string
  categoryId: string
  count: number
}

export interface CategoryWithVoteStatus extends Category {
  hasVoted: boolean
  eligibleCount: number
}