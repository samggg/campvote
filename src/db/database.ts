import Dexie, { type Table } from 'dexie'
import type {
  User, Category, Vote,
  CategoryEligibility, Device, AuditLog, Settings
} from '../types'

export class CampVoteDB extends Dexie {
  users!:                Table<User>
  categories!:           Table<Category>
  votes!:                Table<Vote>
  categoryEligibility!:  Table<CategoryEligibility>
  devices!:              Table<Device>
  auditLog!:             Table<AuditLog>
  settings!:             Table<Settings>

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

    // v2 — adiciona tabela settings
    this.version(2).stores({
      users:               '&id, isAdmin',
      categories:          '&id, isActive, votingOpen',
      votes:               '&id, &voteHash, voterId, categoryId, deviceId, [voterId+categoryId]',
      categoryEligibility: '&id, categoryId, userId, [categoryId+userId]',
      devices:             '&id, &fingerprint',
      auditLog:            '&id, action, userId, createdAt',
      settings:            '&id, &key',
    })
  }
}

// Singleton exportado para uso em toda a aplicação
export const db = new CampVoteDB()