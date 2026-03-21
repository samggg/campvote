import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Trophy, Medal } from 'lucide-react'
import { db } from '../../db/database'
import { voteService } from '../../services/VoteService'
import type { Category } from '../../types'

interface Result { userId: string; userName: string; count: number }

export default function Results() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [results, setResults] = useState<Record<string, Result[]>>({})
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const cats = await db.categories.toArray()
    setCategories(cats)
    const res: Record<string, Result[]> = {}
    for (const cat of cats) {
      res[cat.id] = await voteService.getResults(cat.id)
    }
    setResults(res)
    if (cats.length > 0) setExpanded(cats[0].id)
    setLoading(false)
  }

  const medal = (i: number) => {
    if (i === 0) return { icon: Trophy, color: '#fbbf24' }
    if (i === 1) return { icon: Medal, color: '#94a3b8' }
    if (i === 2) return { icon: Medal, color: '#cd7c3c' }
    return null
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
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Resultados</span>
      </nav>

      <div className="page-full">
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categories.map((cat, ci) => {
              const res = results[cat.id] ?? []
              const isOpen = expanded === cat.id
              const totalVotes = res.reduce((s, r) => s + r.count, 0)
              const winner = res[0]

              return (
                <div key={cat.id} className={`card fade-up`} style={{ animationDelay: `${ci * .06}s`, overflow: 'hidden' }}>

                  {/* Header */}
                  <button
                    onClick={() => setExpanded(isOpen ? null : cat.id)}
                    style={{
                      width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: 0
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>{cat.name}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '.82rem' }}>
                        {totalVotes} votos
                        {winner && <> · Líder: <strong style={{ color: 'var(--fire)' }}>{winner.userName}</strong></>}
                      </div>
                    </div>
                    <span style={{ color: 'var(--muted)', fontSize: '1.2rem', transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                      ›
                    </span>
                  </button>

                  {/* Expanded results */}
                  {isOpen && res.length > 0 && (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {res.map((r, i) => {
                        const m = medal(i)
                        const pct = totalVotes > 0 ? Math.round((r.count / totalVotes) * 100) : 0
                        return (
                          <div key={r.userId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {/* Rank */}
                            <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                              {m ? <m.icon size={18} color={m.color} /> : (
                                <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>#{i+1}</span>
                              )}
                            </div>
                            {/* Name + bar */}
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: '.9rem', fontWeight: i === 0 ? 600 : 400 }}>{r.userName}</span>
                                <span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{r.count} ({pct}%)</span>
                              </div>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{
                                  width: `${pct}%`,
                                  background: i === 0 ? 'var(--fire)' : i === 1 ? '#94a3b8' : 'var(--bg3)',
                                  transition: 'width .6s ease'
                                }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {isOpen && res.length === 0 && (
                    <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 12, textAlign: 'center' }}>
                      Nenhum voto registrado ainda.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}