import { db } from '../db/database'
import { generateVoteHash } from '../utils/hash'
import { getDeviceId, getPlatform } from '../utils/device'
import type { Vote, Device } from '../types'

// IDs gerados no browser com crypto.randomUUID()
const uid = () => crypto.randomUUID()

export class VoteService {

  /**
   * Registra um voto. Aplica todas as regras de negócio antes de persistir.
   * Lança erro descritivo se alguma regra for violada.
   */
  async castVote(voterId: string, votedUserId: string, categoryId: string): Promise<Vote> {

    // ── 1. Busca a categoria ────────────────────────────────────────────────
    const category = await db.categories.get(categoryId)
    if (!category) throw new Error('Categoria não encontrada.')
    if (!category.votingOpen) throw new Error('A votação desta categoria está encerrada.')

    // ── 2. Não pode votar em si mesmo ───────────────────────────────────────
    if (voterId === votedUserId) throw new Error('Você não pode votar em si mesmo.')

    // ── 3. Verifica se o candidato é elegível nesta categoria ───────────────
    const eligible = await db.categoryEligibility
      .where({ categoryId, userId: votedUserId })
      .first()
    if (!eligible) throw new Error('Este participante não é elegível nesta categoria.')

    // ── 4. Verifica voto duplicado por usuário ──────────────────────────────
    const existingVote = await db.votes
      .where({ voterId, categoryId })
      .first()
    if (existingVote) throw new Error('Você já votou nesta categoria.')

    // ── 5. Registra ou recupera o device ────────────────────────────────────
    const deviceId = await this.ensureDevice()

    // ── 6. Verifica voto duplicado por dispositivo ───────────────────────────
    const deviceVote = await db.votes
      .where({ deviceId, categoryId })
      .first()
    if (deviceVote) throw new Error('Este dispositivo já registrou um voto nesta categoria.')

    // ── 7. Gera hash único do voto ───────────────────────────────────────────
    const votedAt = new Date().toISOString()
    const voteHash = await generateVoteHash(voterId, categoryId, deviceId, votedAt)

    // ── 8. Verifica colisão de hash (praticamente impossível, mas defensivo) ─
    const hashExists = await db.votes.where({ voteHash }).first()
    if (hashExists) throw new Error('Hash de voto duplicado. Tente novamente.')

    // ── 9. Persiste o voto ───────────────────────────────────────────────────
    const vote: Vote = {
      id: uid(),
      voterId,
      votedUserId,
      categoryId,
      deviceId,
      voteHash,
      votedAt,
      synced: false,
    }

    await db.transaction('rw', db.votes, db.auditLog, async () => {
      await db.votes.add(vote)
      await db.auditLog.add({
        id: uid(),
        action: 'vote_cast',
        userId: voterId,
        deviceId,
        payloadHash: voteHash,
        createdAt: votedAt,
      })
    })

    return vote
  }

  /** Verifica se o usuário já votou em uma categoria */
  async hasVoted(voterId: string, categoryId: string): Promise<boolean> {
    const vote = await db.votes.where({ voterId, categoryId }).first()
    return !!vote
  }

  /** Contagem de votos por categoria (para resultados do admin) */
  async getResults(categoryId: string) {
    const votes = await db.votes.where({ categoryId }).toArray()

    // Agrupa por votedUserId
    const counts = new Map<string, number>()
    for (const vote of votes) {
      counts.set(vote.votedUserId, (counts.get(vote.votedUserId) ?? 0) + 1)
    }

    // Enriquece com nome dos usuários
    const results = await Promise.all(
      Array.from(counts.entries()).map(async ([userId, count]) => {
        const user = await db.users.get(userId)
        return { userId, userName: user?.name ?? 'Desconhecido', count }
      })
    )

    // Ordena do mais votado para o menos
    return results.sort((a, b) => b.count - a.count)
  }

  // ── Privado ───────────────────────────────────────────────────────────────

  private async ensureDevice(): Promise<string> {
    const fingerprint = await getDeviceId()
    const existing = await db.devices.where({ fingerprint }).first()
    if (existing) return existing.id

    const device: Device = {
      id: uid(),
      fingerprint,
      platform: getPlatform(),
      registeredAt: new Date().toISOString(),
    }
    await db.devices.add(device)
    return device.id
  }
}

export const voteService = new VoteService()