import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, QrCode, Share2, CheckCircle2 } from 'lucide-react'
import { db } from '../../db/database'
import { voteService } from '../../services/VoteService'

export default function Export() {
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [qrData, setQrData] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [summary, setSummary] = useState<{ categories: number; votes: number; users: number } | null>(null)

  useEffect(() => { loadSummary() }, [])

  const loadSummary = async () => {
    const [categories, votes, users] = await Promise.all([
      db.categories.count(),
      db.votes.count(),
      db.users.filter(u => !u.isAdmin).count(),
    ])
    setSummary({ categories, votes, users })
  }

  const buildExportData = async () => {
    const cats = await db.categories.toArray()
    const results = await Promise.all(
      cats.map(async cat => ({
        category: cat.name,
        votingOpen: cat.votingOpen,
        results: await voteService.getResults(cat.id),
      }))
    )
    return {
      exportedAt: new Date().toISOString(),
      summary: summary,
      results,
    }
  }

  const handleDownload = async () => {
    setExporting(true)
    try {
      const data = await buildExportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `campvote-resultados-${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`
      a.click()
      URL.revokeObjectURL(url)
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } finally {
      setExporting(false)
    }
  }

  const handleShare = async () => {
    const data = await buildExportData()
    const text = JSON.stringify(data)
    if (navigator.share) {
      await navigator.share({ title: 'CampVote Resultados', text })
    } else {
      await navigator.clipboard.writeText(text)
      alert('Dados copiados para a área de transferência!')
    }
  }

  const handleQR = async () => {
    const data = await buildExportData()
    // Apenas resumo no QR (JSON completo pode ser grande demais)
    const summary = data.results.map(r => ({
      cat: r.category.substring(0, 20),
      winner: r.results[0]?.userName ?? '—',
      votes: r.results[0]?.count ?? 0,
    }))
    setQrData(JSON.stringify(summary))
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <button onClick={() => navigate('/admin/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6
        }}>
          <ArrowLeft size={18} /> Dashboard
        </button>
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Exportar</span>
      </nav>

      <div className="page">

        {/* Summary */}
        {summary && (
          <div className="card fade-up" style={{ marginBottom: 28 }}>
            <h3 style={{ marginBottom: 14 }}>Resumo atual</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, textAlign: 'center' }}>
              {[
                { label: 'Categorias', val: summary.categories },
                { label: 'Votos', val: summary.votes },
                { label: 'Participantes', val: summary.users },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 8px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--fire)' }}>{s.val}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '.75rem' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 12, animationDelay: '.08s' }}>

          <button className="btn btn-fire" onClick={handleDownload} disabled={exporting} style={{ gap: 10 }}>
            {done
              ? <><CheckCircle2 size={20} /> Baixado!</>
              : <><Download size={20} /> Baixar JSON</>}
          </button>

          <button className="btn btn-ghost" onClick={handleShare} style={{ gap: 10 }}>
            <Share2 size={20} /> Compartilhar via app
          </button>

          <button className="btn btn-outline" onClick={handleQR} style={{ gap: 10 }}>
            <QrCode size={20} /> Gerar QR Code do resumo
          </button>
        </div>

        {/* QR Code */}
        {qrData && (
          <div className="pop-in card" style={{
            marginTop: 28, textAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14
          }}>
            <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
              Escaneie para ver o resumo dos vencedores
            </p>
            {/* QR Code via API pública offline-safe */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}&bgcolor=18181c&color=f97316`}
              alt="QR Code dos resultados"
              style={{ borderRadius: 12, border: '1px solid var(--border)' }}
              width={220} height={220}
            />
            <p style={{ color: 'var(--muted)', fontSize: '.75rem' }}>
              Contém: categoria · vencedor · votos
            </p>
            <button className="btn btn-ghost" onClick={() => setQrData(null)} style={{ width: 'auto', padding: '10px 20px' }}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}