import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, User, Calendar } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function Login() {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const { loginWithNameAndBirth, isLoading, error, clearError, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate(user.isAdmin ? '/admin/dashboard' : '/categorias', { replace: true })
  }, [user, navigate])

  const handleSubmit = async () => {
    if (!name.trim() || !birthDate) return
    await loginWithNameAndBirth(name, birthDate)
  }

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>

      {/* Logo */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 48 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 72, height: 72, borderRadius: 20,
          background: 'var(--fire-glow)', border: '1.5px solid var(--fire)',
          marginBottom: 20, animation: 'pulse-fire 2.5s ease-in-out infinite',
        }}>
          <Flame size={36} color="var(--fire)" />
        </div>
        <h1 style={{ marginBottom: 8 }}>
          Camp<span style={{ color: 'var(--fire)' }}>Vote</span>
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '.95rem' }}>
          Entre com seu nome e data de nascimento
        </p>
      </div>

      {/* Form */}
      <div className="fade-up" style={{ animationDelay: '.1s', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Nome */}
        <div>
          <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <User size={13} /> Nome completo
          </label>
          <input
            className="input"
            placeholder="Ex: Maria Clara Santos"
            value={name}
            onChange={e => { clearError(); setName(e.target.value) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
            autoComplete="name"
            style={{ fontSize: '1rem' }}
          />
        </div>

        {/* Data de nascimento */}
        <div>
          <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
            <Calendar size={13} /> Data de nascimento
          </label>
          <input
            className="input"
            type="date"
            value={birthDate}
            onChange={e => { clearError(); setBirthDate(e.target.value) }}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            style={{
              fontSize: '1rem',
              colorScheme: 'dark', // mantém o date picker no tema escuro
            }}
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="pop-in" style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
            color: '#fca5a5', fontSize: '.9rem', textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        <button
          className="btn btn-fire"
          onClick={handleSubmit}
          disabled={isLoading || !name.trim() || !birthDate}
          style={{ marginTop: 4 }}
        >
          {isLoading ? 'Verificando...' : 'Entrar e votar →'}
        </button>
      </div>

      {/* Link admin */}
      <div className="fade-up" style={{ animationDelay: '.2s', textAlign: 'center', marginTop: 40 }}>
        <button
          onClick={() => navigate('/admin/login')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '.85rem' }}
        >
          Acesso de organizador
        </button>
      </div>
    </div>
  )
}