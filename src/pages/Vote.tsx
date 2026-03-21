import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, User as UserIcon } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { db } from '../db/database'
import { voteService } from '../services/VoteService'
import type { Category, User } from '../types'

export default function Vote() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const [category, setCategory] = useState<Category | null>(null)
  const [candidates, setCandidates] = useState<User[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!categoryId || !user) return
    loadData()
  }, [categoryId, user])

  const loadData = async () => {
    if (!categoryId || !user) return

    // Verifica se já votou
    const already = await voteService.hasVoted(user.id, categoryId)
    if (already) { navigate('/categorias', { replace: true }); return }

    const cat = await db.categories.get(categoryId)
    if (!cat || !cat.votingOpen) { navigate('/categorias', { replace: true }); return }
    setCategory(cat)

    // Carrega elegíveis (excluindo o próprio usuário)
    const eligibilities = await db.categoryEligibility
      .where({ categoryId }).toArray()

    const users = await Promise.all(
      eligibilities
        .filter(e => e.userId !== user.id)
        .map(e => db.users.get(e.userId))
    )

    setCandidates(users.filter(Boolean) as User[])
    setLoading(false)
  }

  const handleVote = async () => {
    if (!selected || !categoryId || !user) return
    setSubmitting(true)
    setError(null)
    try {
      await voteService.castVote(user.id, selected, categoryId)
      navigate('/sucesso', { state: { categoryName: category?.name } })
    } catch (e) {
      setError((e as Error).message)
      setShowConfirm(false)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedUser = candidates.find(c => c.id === selected)

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      Carregando...
    </div>
  )

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav className="nav">
        <button onClick={() => navigate('/categorias')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6
        }}>
          <ArrowLeft size={18} /> Voltar
        </button>
      </nav>

      <div className="page">

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: 28 }}>
          <p style={{ color: 'var(--fire)', fontSize: '.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
            Votando em
          </p>
          <h2>{category?.name}</h2>
          {category?.description && (
            <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginTop: 6 }}>{category.description}</p>
          )}
        </div>

        {/* Candidates */}
        <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 14 }}>
          Selecione uma pessoa:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {candidates.map((c, i) => (
            <button
              key={c.id}
              className={`card card-press fade-up ${selected === c.id ? 'selected' : ''}`}
              style={{ animationDelay: `${i * .05}s`, display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left' }}
              onClick={() => setSelected(c.id)}
            >
              {/* Avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: 14, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected === c.id ? 'var(--fire-glow)' : 'var(--bg3)',
                border: selected === c.id ? '1.5px solid var(--fire)' : '1.5px solid var(--border)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem',
                color: selected === c.id ? 'var(--fire)' : 'var(--muted)',
                transition: 'all .2s'
              }}>
                {c.name.split(' ').map(n => n[0]).slice(0,2).join('')}
              </div>

              <span style={{ fontWeight: 500, flex: 1 }}>{c.name}</span>

              {/* Check */}
              <div style={{
                width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected === c.id ? 'var(--fire)' : 'transparent',
                border: `2px solid ${selected === c.id ? 'var(--fire)' : 'var(--border)'}`,
                transition: 'all .2s'
              }}>
                {selected === c.id && <Check size={13} color="#fff" strokeWidth={3} />}
              </div>
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="pop-in" style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            color: '#fca5a5', fontSize: '.9rem', textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* CTA */}
        <button
          className="btn btn-fire"
          disabled={!selected}
          onClick={() => setShowConfirm(true)}
        >
          Confirmar voto →
        </button>

        <p style={{ color: 'var(--muted)', fontSize: '.78rem', textAlign: 'center', marginTop: 12 }}>
          Seu voto é secreto e não poderá ser alterado
        </p>
      </div>

      {/* Confirm Modal */}
      {showConfirm && selectedUser && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          padding: '0 0 0 0'
        }}
          onClick={() => !submitting && setShowConfirm(false)}
        >
          <div className="pop-in" onClick={e => e.stopPropagation()} style={{
            background: 'var(--bg2)', borderRadius: '24px 24px 0 0',
            border: '1px solid var(--border)', padding: '32px 24px 40px',
            width: '100%', maxWidth: 480
          }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--fire-glow)', border: '1.5px solid var(--fire)',
                fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.3rem', color: 'var(--fire)'
              }}>
                {selectedUser.name.split(' ').map(n => n[0]).slice(0,2).join('')}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '.9rem', marginBottom: 6 }}>Você está votando em</p>
              <h3 style={{ fontSize: '1.3rem' }}>{selectedUser.name}</h3>
              <p style={{ color: 'var(--muted)', fontSize: '.85rem', marginTop: 6 }}>
                para <strong style={{ color: 'var(--text)' }}>{category?.name}</strong>
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button className="btn btn-fire" onClick={handleVote} disabled={submitting}>
                {submitting ? 'Registrando...' : 'Sim, confirmar voto'}
              </button>
              <button className="btn btn-ghost" onClick={() => setShowConfirm(false)} disabled={submitting}>
                Cancelar
              </button>
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '.75rem', textAlign: 'center', marginTop: 14 }}>
              Esta ação não pode ser desfeita
            </p>
          </div>
        </div>
      )}
    </div>
  )
}