import { sha256 } from './hash'

const DEVICE_KEY = 'campvote_device_id'

/**
 * Retorna um ID único e persistente para este browser/dispositivo.
 * Gerado uma vez e salvo no localStorage — estável entre sessões.
 *
 * Combina características do browser para criar uma impressão digital.
 * Não é 100% inquebrável, mas é suficiente para evitar votos duplicados
 * num contexto de acampamento onde os participantes não são atacantes sofisticados.
 */
export async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem(DEVICE_KEY)
  if (stored) return stored

  const fingerprint = await buildFingerprint()
  localStorage.setItem(DEVICE_KEY, fingerprint)
  return fingerprint
}

async function buildFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width.toString(),
    screen.height.toString(),
    screen.colorDepth.toString(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Timestamp de primeira visita como salt
    Date.now().toString(),
  ]

  return sha256(components.join('|'))
}

export function getPlatform(): string {
  const ua = navigator.userAgent.toLowerCase()
  const isMobile = /android|iphone|ipad|ipod|mobile/.test(ua)
  return isMobile ? 'web-mobile' : 'web-desktop'
}