import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, UserCheck } from 'lucide-react'
import { db } from '../../db/database'
import type { User, Category } from '../../types'

export default function Participants() {
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [eligibilityMap, setEligibilityMap] = useState<Record<string, Set<string>>>({})
  const [expandedUser, setExpandedUser] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const [all, cats, eligibilities] = await Promise.all([
      db.users.filter(u => !u.isAdmin).toArray(),
      db.categories.toArray(),
      db.categoryEligibility.toArray(),
    ])

    const map: Record<string, Set<string>> = {}
    eligibilities.forEach(e => {
      if (!map[e.userId]) map[e.userId] = new Set()
      map[e.userId].add(e.categoryId)
    })

    setUsers(all.sort((a, b) => a.name.localeCompare(b.name)))
    setCategories(cats)
    setEligibilityMap(map)
  }

  const addUser = async () => {
    if (!name.trim() || !code.trim()) return
    setError(null); setAdding(true)
    try {
      const exists = await db.users
        .filter(u => u.name.trim().toLowerCase() === name.trim().toLowerCase() && u.birthDate === code)
        .first()
      if (exists) throw new Error('Participante já cadastrado com este nome e data.')

      const userId = crypto.randomUUID()
      await db.users.add({
        id: userId,
        name: name.trim(),
        birthDate: code,
        isAdmin: false,
        createdAt: new Date().toISOString(),
      })

      const allCats = await db.categories.toArray()
      for (const cat of allCats) {
        await db.categoryEligibility.add({
          id: crypto.randomUUID(),
          categoryId: cat.id,
          userId,
        })
      }

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
    await db.categoryEligibility.where({ userId: id }).delete()
    await db.users.delete(id)
    await loadUsers()
  }

  const toggleCategory = async (userId: string, categoryId: string) => {
    const has = eligibilityMap[userId]?.has(categoryId)
    if (has) {
      await db.categoryEligibility.where({ userId, categoryId }).delete()
    } else {
      await db.categoryEligibility.add({
        id: crypto.randomUUID(),
        userId,
        categoryId,
      })
    }
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
            <>
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
                <button onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)} style={{
                  background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--muted)',
                  padding: '6px 8px', borderRadius: 8, marginRight: 8, transition: 'color .15s', fontSize: '.8rem'
                }}>
                  {expandedUser === u.id ? 'Fechar categorias' : 'Editar categorias'}
                </button>
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
              {expandedUser === u.id && (
                <div style={{
                  padding: '10px 14px', background: 'var(--bg3)', borderRadius: 10,
                  border: '1px solid var(--border)', marginBottom: 10,
                }}>
                  <div style={{ marginBottom: 8, fontSize: '.83rem', color: 'var(--muted)' }}>
                    Marque categorias em que este participante pode ser votado:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {categories.length
                      ? categories.map(cat => {
                          const checked = eligibilityMap[u.id]?.has(cat.id)
                          return (
                            <label key={cat.id} style={{
                              display: 'flex', alignItems: 'center', gap: 4,
                              background: checked ? 'rgba(34,197,94,.1)' : 'var(--bg2)',
                              border: `1px solid ${checked ? 'rgba(34,197,94,.3)' : 'var(--border)'}`,
                              borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: '.8rem'
                            }}>
                              <input
                                type="checkbox"
                                checked={!!checked}
                                onChange={() => toggleCategory(u.id, cat.id)}
                              />
                              <span>{cat.name}</span>
                            </label>
                          )
                        })
                      : <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Nenhuma categoria cadastrada.</div>
                    }
                  </div>
                </div>
              )}
            </>
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