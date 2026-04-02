import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, BarChart2, Download, LogOut, ToggleLeft, ToggleRight, Flame, Database} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { db } from '../../db/database'
import type { Category } from '../../types'
import { Settings } from 'lucide-react'

export default function Dashboard() {
  const { logout } = useAuthStore()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ users: 0, totalVotes: 0, pending: 0 })
  const [categories, setCategories] = useState<Category[]>([])
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [users, votes, cats] = await Promise.all([
      db.users.filter(u => !u.isAdmin).count(),
      db.votes.count(),
      db.categories.toArray(),
    ])
    const pending = users - (await db.votes
      .orderBy('voterId').uniqueKeys()).length
    setStats({ users, totalVotes: votes, pending: Math.max(0, pending) })
    setCategories(cats)
  }

  const toggleVoting = async (cat: Category) => {
    setToggling(cat.id)
    await db.categories.update(cat.id, { votingOpen: !cat.votingOpen })
    await db.auditLog.add({
      id: crypto.randomUUID(),
      action: cat.votingOpen ? 'voting_closed' : 'voting_opened',
      payloadHash: cat.id,
      createdAt: new Date().toISOString(),
    })
    await loadData()
    setToggling(null)
  }

  const nav = [
    { icon: Users,      label: 'Participantes', path: '/admin/participantes' },
    { icon: BarChart2,  label: 'Resultados',    path: '/admin/resultados' },
    { icon: Download,   label: 'Exportar',       path: '/admin/exportar' },
    { icon: Settings,   label: 'Configurações',  path: '/admin/setup' },
    { icon: Database,   label: 'Banco de Dados',  path: '/debug' }
  ]

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      <nav className="nav">
        <span className="nav-logo"><Flame size={16} style={{ display:'inline', marginRight:4 }} />Admin</span>
        <button onClick={() => { logout(); navigate('/login') }} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6, fontSize: '.85rem'
        }}>
          <LogOut size={16} /> Sair
        </button>
      </nav>

      <div className="page-full">

        {/* Stats */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28 }}>
          {[
            { label: 'Participantes', value: stats.users, color: 'var(--text)' },
            { label: 'Votos totais',  value: stats.totalVotes, color: 'var(--fire)' },
            { label: 'Pendentes',     value: stats.pending, color: stats.pending > 0 ? '#facc15' : 'var(--green)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 12px', textAlign: 'center'
            }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color }}>
                {s.value}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '.75rem', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick nav */}
        <div className="fade-up" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 28, animationDelay: '.05s' }}>
          {nav.map(n => (
            <button key={n.path} onClick={() => navigate(n.path)} style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 8px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
              color: 'var(--text)', transition: 'border-color .15s, background .15s'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--fire)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <n.icon size={22} color="var(--fire)" />
              <span style={{ fontSize: '.8rem', fontWeight: 500 }}>{n.label}</span>
            </button>
          ))}
        </div>

        {/* Categories toggle */}
        <div className="fade-up" style={{ animationDelay: '.1s' }}>
          <h3 style={{ marginBottom: 14 }}>Controle de votação</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {categories.map(cat => (
              <div key={cat.id} className="card" style={{
                display: 'flex', alignItems: 'center', gap: 14
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{cat.name}</div>
                  <span className={`badge ${cat.votingOpen ? 'badge-open' : 'badge-closed'}`}>
                    {cat.votingOpen ? 'Aberta' : 'Fechada'}
                  </span>
                </div>
                <button
                  onClick={() => toggleVoting(cat)}
                  disabled={toggling === cat.id}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: cat.votingOpen ? 'var(--green)' : 'var(--muted)', transition: 'color .2s' }}
                >
                  {cat.votingOpen
                    ? <ToggleRight size={34} />
                    : <ToggleLeft size={34} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}