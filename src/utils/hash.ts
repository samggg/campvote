// ─── hash.ts ─────────────────────────────────────────────────────────────────
// SHA-256 usando Web Crypto API (disponível em todos os browsers modernos, offline)

export async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Gera o hash único de um voto.
 * Garante que o mesmo voto não pode ser inserido duas vezes,
 * mesmo que o banco seja manipulado manualmente.
 */
export async function generateVoteHash(
  voterId: string,
  categoryId: string,
  deviceId: string,
  timestamp: string
): Promise<string> {
  return sha256(`${voterId}:${categoryId}:${deviceId}:${timestamp}`)
}