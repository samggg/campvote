import Dexie, { type Table } from 'dexie'
import type {
  User, Category, Vote,
  CategoryEligibility, Device, AuditLog
} from '../types'

export class CampVoteDB extends Dexie {
  users!:                Table<User>
  categories!:           Table<Category>
  votes!:                Table<Vote>
  categoryEligibility!:  Table<CategoryEligibility>
  devices!:              Table<Device>
  auditLog!:             Table<AuditLog>

  constructor() {
    super('campvote')

    // v1 — schema inicial
    // &campo = chave primária  |  campo = índice  |  [a+b] = índice composto
    this.version(1).stores({
      users:               '&id, isAdmin',
      categories:          '&id, isActive, votingOpen',
      votes:               '&id, &voteHash, voterId, categoryId, deviceId, [voterId+categoryId]',
      categoryEligibility: '&id, categoryId, userId, [categoryId+userId]',
      devices:             '&id, &fingerprint',
      auditLog:            '&id, action, userId, createdAt',
    })
  }
}

// Singleton exportado para uso em toda a aplicação
export const db = new CampVoteDB()