import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut, CheckCircle2, Lock, Flame } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { apiService } from '../services/ApiService'
import { voteService } from '../services/VoteService'
import type { Category } from '../types'

interface CategoryItem extends Category {
  hasVoted: boolean
}

export default function Categories() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadCategories()
  }, [user])

  const loadCategories = async () => {
    if (!user) return

    const allCats = await apiService.getCategories() as Category[]
    const activeCats = allCats.filter(c => c.isActive)

    const items: CategoryItem[] = await Promise.all(
      activeCats.map(async cat => ({
        ...cat,
        hasVoted: await voteService.hasVoted(user.id, cat.id),
      }))
    )

    setCategories(items)
    setLoading(false)
  }

  const voted = categories.filter(c => c.hasVoted).length
  const total = categories.length
  const progress = total > 0 ? (voted / total) * 100 : 0
  const allDone = total > 0 && voted === total

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <nav className="nav">
        <span className="nav-logo">
          <Flame size={16} style={{ display: 'inline', marginRight: 4 }} />
          CampVote
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>
            Olá, {user?.name.split(' ')[0]}
          </span>
          <button
            onClick={() => { logout(); navigate('/login') }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="page" style={{ paddingTop: 28 }}>
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <h2 style={{ marginBottom: 6 }}>Categorias</h2>
          <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 16 }}>
            {loading ? 'Carregando...'
              : allDone ? 'Você votou em todas as categorias!'
              : total === 0 ? 'Nenhuma categoria disponível ainda.'
              : `${voted} de ${total} categorias votadas`}
          </p>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {allDone && (
          <div className="pop-in card" style={{
            marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12,
            background: 'rgba(34,197,94,.08)', borderColor: 'rgba(34,197,94,.3)',
          }}>
            <CheckCircle2 size={24} color="var(--green)" />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--green)', marginBottom: 2 }}>Participação completa!</p>
              <p style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Seus votos foram registrados com segurança.</p>
            </div>
          </div>
        )}

        {!loading && total === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 40 }}>
            <Flame size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: .3 }} />
            <p style={{ fontSize: '.9rem' }}>O organizador ainda não liberou as categorias.</p>
            <button onClick={loadCategories} style={{
              marginTop: 16, background: 'none', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--muted)', padding: '8px 16px',
              cursor: 'pointer', fontSize: '.85rem',
            }}>
              Atualizar
            </button>
          </div>
        )}

        {!loading && total > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {categories.map((cat, i) => (
              <button
                key={cat.id}
                className={`card card-press fade-up ${cat.hasVoted ? 'selected' : ''}`}
                style={{
                  animationDelay: `${i * .06}s`,
                  display: 'flex', alignItems: 'center', gap: 14,
                  textAlign: 'left', width: '100%',
                  opacity: !cat.votingOpen && !cat.hasVoted ? .55 : 1,
                  cursor: cat.votingOpen && !cat.hasVoted ? 'pointer' : 'default',
                }}
                onClick={() => cat.votingOpen && !cat.hasVoted && navigate(`/votar/${cat.id}`)}
                disabled={!cat.votingOpen || cat.hasVoted}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: cat.hasVoted ? 'rgba(34,197,94,.15)' : cat.votingOpen ? 'var(--fire-glow)' : 'var(--bg3)',
                }}>
                  {cat.hasVoted
                    ? <CheckCircle2 size={22} color="var(--green)" />
                    : cat.votingOpen
                      ? <Flame size={22} color="var(--fire)" />
                      : <Lock size={20} color="var(--muted)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>{cat.name}</div>
                  {cat.description && (
                    <div style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{cat.description}</div>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className={`badge ${cat.hasVoted ? 'badge-voted' : cat.votingOpen ? 'badge-open' : 'badge-closed'}`}>
                    {cat.hasVoted ? 'Votado' : cat.votingOpen ? 'Aberto' : 'Fechado'}
                  </span>
                  {cat.votingOpen && !cat.hasVoted && <ChevronRight size={18} color="var(--muted)" />}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}