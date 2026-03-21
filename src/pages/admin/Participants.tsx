import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, UserCheck } from 'lucide-react'
import { db } from '../../db/database'
import type { User } from '../../types'

export default function Participants() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const all = await db.users.filter(u => !u.isAdmin).toArray()
    setUsers(all.sort((a, b) => a.name.localeCompare(b.name)))
  }

  const addUser = async () => {
    if (!name.trim() || !code.trim()) return
    setError(null); setAdding(true)
    try {
      const exists = await db.users
        .filter(u => u.name.trim().toLowerCase() === name.trim().toLowerCase() && u.birthDate === code)
        .first()
      if (exists) throw new Error('Participante já cadastrado com este nome e data.')

      await db.users.add({
        id: crypto.randomUUID(),
        name: name.trim(),
        birthDate: code,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      })
      setName(''); setCode('')
      await loadUsers()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(false)
    }
  }

  const removeUser = async (id: string) => {
    if (!confirm('Remover participante? Votos associados serão mantidos.')) return
    await db.users.delete(id)
    await loadUsers()
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
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Participantes ({users.length})</span>
      </nav>

      <div className="page-full">

        {/* Add form */}
        <div className="card fade-up" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} color="var(--fire)" /> Adicionar participante
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              className="input"
              placeholder="Nome completo"
              value={name}
              onChange={e => { setName(e.target.value); setError(null) }}
            />
            <input
              className="input"
              type="date"
              value={code}
              onChange={e => { setCode(e.target.value); setError(null) }}
              style={{ colorScheme: 'dark' }}
            />
            {error && (
              <div style={{ color: '#fca5a5', fontSize: '.85rem', textAlign: 'center' }}>{error}</div>
            )}
            <button
              className="btn btn-fire"
              onClick={addUser}
              disabled={adding || !name.trim() || !code.trim()}
            >
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {users.map((u, i) => (
            <div key={u.id} className={`card fade-up`} style={{
              animationDelay: `${i * .04}s`,
              display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg3)',
                fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.85rem', color: 'var(--fire)'
              }}>
                {u.name.split(' ').map(n => n[0]).slice(0,2).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{u.name}</div>
                <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{new Date(u.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
              </div>
              <button onClick={() => removeUser(u.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                padding: 8, borderRadius: 8, transition: 'color .15s'
              }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}

          {users.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 40 }}>
              <UserCheck size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: .4 }} />
              Nenhum participante cadastrado ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}