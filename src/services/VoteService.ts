import { apiService } from './ApiService'
import type { Vote } from '../types'

export class VoteService {

  /**
   * Registra um voto. Aplica todas as regras de negócio antes de persistir.
   * Lança erro descritivo se alguma regra for violada.
   */
  async castVote(voterId: string, votedUserId: string, categoryId: string): Promise<Vote> {
    return await apiService.castVote(voterId, votedUserId, categoryId) as Vote
  }

  /** Verifica se o usuário já votou em uma categoria */
  async hasVoted(voterId: string, categoryId: string): Promise<boolean> {
    return await apiService.hasVoted(voterId, categoryId) as boolean
  }

  /** Contagem de votos por categoria (para resultados do admin) */
  async getResults(categoryId: string) {
    return await apiService.getResults(categoryId) as { userId: string, userName: string, count: number }[]
  }
}

export const voteService = new VoteService()