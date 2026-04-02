import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, ArrowLeft } from 'lucide-react'
import { useAuthStore } from '../store/authStore'

export default function AdminLogin() {
  const [pin, setPin] = useState('')
  const { loginAdmin, isLoading, error, clearError, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.isAdmin) navigate('/admin/dashboard', { replace: true })
  }, [user, navigate])

  const handleDigit = (d: string) => {
    clearError()
    if (pin.length < 6) setPin(p => p + d)
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  const handleSubmit = async () => {
    if (pin.length < 4) return
    await loginAdmin(pin)
  }

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫']

  return (
    <div className="page" style={{ justifyContent: 'center', minHeight: '100dvh' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/login')}
        style={{
          position: 'absolute', top: 20, left: 20,
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6
        }}
      >
        <ArrowLeft size={18} /> Voltar
      </button>

      {/* Header */}
      <div className="fade-up" style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: 18,
          background: 'rgba(34,197,94,.1)', border: '1.5px solid rgba(34,197,94,.3)',
          marginBottom: 16
        }}>
          <ShieldCheck size={30} color="var(--green)" />
        </div>
        <h2 style={{ marginBottom: 6 }}>Acesso admin</h2>
        <p style={{ color: 'var(--muted)', fontSize: '.9rem' }}>Digite o PIN do organizador</p>
      </div>

      {/* PIN dots */}
      <div className="fade-up" style={{
        display: 'flex', justifyContent: 'center', gap: 14, marginBottom: 36,
        animationDelay: '.05s'
      }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: 18, height: 18, borderRadius: '50%',
            background: i < pin.length ? 'var(--green)' : 'var(--bg3)',
            border: `2px solid ${i < pin.length ? 'var(--green)' : 'var(--border)'}`,
            transition: 'all .2s'
          }} />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="pop-in" style={{
          display: 'flex', flexDirection: 'column', gap: 10,
          padding: '10px 16px', borderRadius: 10, marginBottom: 20,
          background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
          color: '#fca5a5', fontSize: '.9rem', textAlign: 'center'
        }}>
          <div>{error}</div>
          {error.includes('PIN de admin não configurado') && (
            <button
              onClick={() => navigate('/admin/setup')}
              style={{
                background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)',
                color: '#fca5a5', borderRadius: 6, padding: '6px 10px',
                fontSize: '.85rem', cursor: 'pointer', transition: 'background .2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,.2)')}
            >
              Ir para Setup →
            </button>
          )}
        </div>
      )}

      {/* Keypad */}
      <div className="fade-up" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
        animationDelay: '.1s'
      }}>
        {digits.map((d, i) => (
          <button
            key={i}
            onClick={() => d === '⌫' ? handleDelete() : d ? handleDigit(d) : null}
            disabled={!d}
            style={{
              padding: '18px 0',
              background: d === '⌫' ? 'var(--bg3)' : 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 12, cursor: d ? 'pointer' : 'default',
              color: d === '⌫' ? 'var(--muted)' : 'var(--text)',
              fontSize: d === '⌫' ? '1.2rem' : '1.4rem',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              transition: 'background .15s, transform .1s',
              opacity: d ? 1 : 0,
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(.95)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            {d}
          </button>
        ))}
      </div>

      <button
        className="btn btn-green"
        onClick={handleSubmit}
        disabled={isLoading || pin.length < 4}
        style={{ marginTop: 24 }}
      >
        {isLoading ? 'Verificando...' : 'Entrar →'}
      </button>
    </div>
  )
}