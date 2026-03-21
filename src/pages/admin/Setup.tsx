import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Plus, Trash2, CheckCircle2, AlertCircle, Download, RefreshCw, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import { db } from '../../db/database'
import { authService } from '../../services/AuthService'
import type { Category, User } from '../../types'

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedParticipant { name: string; birthDate: string; valid: boolean; error?: string }
type Tab = 'participants' | 'categories' | 'pin' | 'danger'

// ─── Helpers ─────────────────────────────────────────────────────────────────
const uid = () => crypto.randomUUID()

function parseCSV(text: string): ParsedParticipant[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  const usedCodes = new Set<string>()

  return lines.map(line => {
    // Suporta separador vírgula ou ponto-e-vírgula
    const sep = line.includes(';') ? ';' : ','
    const parts = line.split(sep).map(p => p.trim().replace(/^"|"$/g, ''))
    const name = parts[0] ?? ''
    const rawBirth = (parts[1] ?? '').trim()

    if (!name) return { name, birthDate: rawBirth, valid: false, error: 'Nome vazio' }
    if (!rawBirth) return { name, birthDate: rawBirth, valid: false, error: 'Data vazia' }

    // Aceita DD/MM/YYYY ou YYYY-MM-DD
    let normalizedDate = rawBirth
    const brFormat = rawBirth.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
    if (brFormat) normalizedDate = `${brFormat[3]}-${brFormat[2]}-${brFormat[1]}`
    const valid = /^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)
    if (!valid) return { name, birthDate: rawBirth, valid: false, error: 'Data inválida (use DD/MM/AAAA)' }

    const key = name.trim().toLowerCase() + normalizedDate
    if (usedCodes.has(key)) return { name, birthDate: normalizedDate, valid: false, error: 'Participante duplicado' }

    usedCodes.add(key)
    return { name, birthDate: normalizedDate, valid: true }
  })
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function Setup() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('participants')

  // Participants state
  const [parsed, setParsed] = useState<ParsedParticipant[]>([])
  const [importing, setImporting] = useState(false)
  const [importDone, setImportDone] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [existingUsers, setExistingUsers] = useState<User[]>([])

  // Categories state
  const [categories, setCategories] = useState<Category[]>([])
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [addingCat, setAddingCat] = useState(false)

  // Danger state
  const [resetting, setResetting] = useState(false)

  // PIN state
  const [pinCurrent, setPinCurrent] = useState('')
  const [pinNew, setPinNew] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSuccess, setPinSuccess] = useState(false)
  const [pinError, setPinError] = useState<string | null>(null)
  const [showPin, setShowPin] = useState(false)
  const [pinConfigured, setPinConfigured] = useState(false)

  useEffect(() => { loadData(); checkPinConfigured() }, [])

  const checkPinConfigured = () => {
    const stored = localStorage.getItem('campvote_admin_pin_hash')
    setPinConfigured(!!stored)
  }

  const loadData = async () => {
    const [users, cats] = await Promise.all([
      db.users.filter(u => !u.isAdmin).toArray(),
      db.categories.toArray(),
    ])
    setExistingUsers(users.sort((a, b) => a.name.localeCompare(b.name)))
    setCategories(cats)
  }

  // ── CSV Parsing ─────────────────────────────────────────────────────────────
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      setParsed(parseCSV(text))
      setImportDone(false)
      setImportError(null)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    const valid = parsed.filter(p => p.valid)
    if (valid.length === 0) return
    setImporting(true)
    setImportError(null)

    try {
      // Verifica conflitos com banco
      const existingKeys = new Set(existingUsers.map(u => u.name.trim().toLowerCase() + u.birthDate))
      const conflicts = valid.filter(p => existingKeys.has(p.name.trim().toLowerCase() + p.birthDate))
      if (conflicts.length > 0) {
        setImportError(`Participantes já cadastrados: ${conflicts.map(c => c.name).join(', ')}.`)
        setImporting(false)
        return
      }

      const now = new Date().toISOString()
      const cats = await db.categories.toArray()

      await db.transaction('rw', db.users, db.categoryEligibility, async () => {
        for (const p of valid) {
          const userId = uid()
          await db.users.add({
            id: userId, name: p.name, birthDate: p.birthDate,
            isAdmin: false, createdAt: now,
          })
          // Adiciona como elegível em todas as categorias existentes
          for (const cat of cats) {
            await db.categoryEligibility.add({
              id: uid(), categoryId: cat.id, userId,
            })
          }
        }
      })

      setImportDone(true)
      setParsed([])
      if (fileRef.current) fileRef.current.value = ''
      await loadData()
    } catch (e) {
      setImportError((e as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const removeUser = async (id: string) => {
    await db.transaction('rw', db.users, db.categoryEligibility, async () => {
      await db.categoryEligibility.where({ userId: id }).delete()
      await db.users.delete(id)
    })
    await loadData()
  }

  // ── Categories ──────────────────────────────────────────────────────────────
  const addCategory = async () => {
    if (!newCatName.trim()) return
    setAddingCat(true)
    try {
      const catId = uid()
      const now = new Date().toISOString()
      await db.categories.add({
        id: catId, name: newCatName.trim(),
        description: newCatDesc.trim() || undefined,
        isActive: true, votingOpen: false,
        maxVotesPerUser: 1, createdAt: now,
      })
      // Adiciona todos os participantes existentes como elegíveis
      const users = await db.users.filter(u => !u.isAdmin).toArray()
      for (const user of users) {
        await db.categoryEligibility.add({ id: uid(), categoryId: catId, userId: user.id })
      }
      setNewCatName(''); setNewCatDesc('')
      await loadData()
    } finally {
      setAddingCat(false)
    }
  }

  const removeCategory = async (id: string) => {
    if (!confirm('Remover categoria? Votos associados serão excluídos.')) return
    await db.transaction('rw', db.categories, db.categoryEligibility, db.votes, async () => {
      await db.votes.where({ categoryId: id }).delete()
      await db.categoryEligibility.where({ categoryId: id }).delete()
      await db.categories.delete(id)
    })
    await loadData()
  }

  // ── Danger zone ─────────────────────────────────────────────────────────────
  const resetAll = async () => {
    if (!confirm('ATENÇÃO: isso apaga TODOS os votos, participantes e categorias. Tem certeza?')) return
    if (!confirm('Última chance — confirmar reset completo?')) return
    setResetting(true)
    await db.votes.clear()
    await db.categoryEligibility.clear()
    await db.categories.clear()
    await db.users.filter(u => !u.isAdmin).delete()
    await db.auditLog.clear()
    setResetting(false)
    await loadData()
    setParsed([])
  }

  const savePin = async () => {
    setPinError(null)
    if (pinNew.length < 4) { setPinError('PIN deve ter pelo menos 4 dígitos.'); return }
    if (pinNew !== pinConfirm) { setPinError('Os PINs não coincidem.'); return }
    if (pinConfigured && !pinCurrent) { setPinError('Informe o PIN atual para alterá-lo.'); return }

    // Se já tem PIN, valida o atual antes de trocar
    if (pinConfigured) {
      try { await authService.loginAdmin(pinCurrent) }
      catch { setPinError('PIN atual incorreto.'); return }
    }

    setPinSaving(true)
    try {
      await authService.setAdminPin(pinNew)
      setPinSuccess(true)
      setPinCurrent(''); setPinNew(''); setPinConfirm('')
      checkPinConfigured()
      setTimeout(() => setPinSuccess(false), 3000)
    } catch (e) {
      setPinError((e as Error).message)
    } finally {
      setPinSaving(false)
    }
  }

  const resetVotes = async () => {
    if (!confirm('Apagar todos os votos registrados? Participantes e categorias serão mantidos.')) return
    await db.votes.clear()
    alert('Votos apagados.')
  }

  // ── Download template CSV ────────────────────────────────────────────────────
  const downloadTemplate = () => {
    const content = 'Nome,DataNascimento\nAna Silva,15/03/2000\nBruno Costa,22/07/1998\nCarla Mendes,08/11/2001'
    const blob = new Blob([content], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'participantes-modelo.csv'

    a.click()
  }

  const validCount  = parsed.filter(p => p.valid).length
  const invalidCount = parsed.filter(p => !p.valid).length

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>

      {/* Nav */}
      <nav className="nav">
        <button onClick={() => navigate('/admin/dashboard')} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ArrowLeft size={18} /> Dashboard
        </button>
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Configuração</span>
      </nav>

      {/* Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', position: 'sticky', top: 57, zIndex: 9,
      }}>
        {([
          { key: 'participants', label: `Participantes (${existingUsers.length})` },
          { key: 'categories',   label: `Categorias (${categories.length})` },
          { key: 'pin',          label: 'PIN admin' },
          { key: 'danger',       label: 'Resetar' },
        ] as { key: Tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '14px 8px', background: 'none',
            border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--fire)' : 'transparent'}`,
            color: tab === t.key ? 'var(--fire)' : 'var(--muted)',
            fontFamily: 'var(--font-body)', fontSize: '.85rem', fontWeight: 500,
            cursor: 'pointer', transition: 'color .15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="page-full" style={{ paddingTop: 24 }}>

        {/* ── TAB: PARTICIPANTS ─────────────────────────────────────── */}
        {tab === 'participants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Import card */}
            <div className="card fade-up">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <h3 style={{ marginBottom: 4 }}>Importar via CSV</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '.82rem' }}>
                    Formato: <code style={{ color: 'var(--fire)' }}>Nome,DataNascimento</code> — data em DD/MM/AAAA
                  </p>
                </div>
                <button onClick={downloadTemplate} style={{
                  background: 'none', border: '1px solid var(--border)', borderRadius: 8,
                  color: 'var(--muted)', cursor: 'pointer', padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: 5, fontSize: '.78rem',
                }}>
                  <Download size={13} /> Modelo
                </button>
              </div>

              {/* Drop zone */}
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 10, padding: '28px 20px', borderRadius: 12, cursor: 'pointer',
                border: '2px dashed var(--border)', background: 'var(--bg3)',
                transition: 'border-color .2s',
              }}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--fire)' }}
                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.style.borderColor = 'var(--border)'
                  const file = e.dataTransfer.files[0]
                  if (file) {
                    const reader = new FileReader()
                    reader.onload = ev => setParsed(parseCSV(ev.target?.result as string))
                    reader.readAsText(file, 'UTF-8')
                  }
                }}
              >
                <Upload size={28} color="var(--muted)" />
                <span style={{ color: 'var(--muted)', fontSize: '.9rem' }}>
                  Arraste o .csv ou <span style={{ color: 'var(--fire)', textDecoration: 'underline' }}>clique para selecionar</span>
                </span>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} style={{ display: 'none' }} />
              </label>

              {/* Preview */}
              {parsed.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span className="badge badge-open">{validCount} válidos</span>
                    {invalidCount > 0 && <span className="badge badge-closed">{invalidCount} com erro</span>}
                  </div>

                  <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {parsed.map((p, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', borderRadius: 8,
                        background: p.valid ? 'rgba(34,197,94,.06)' : 'rgba(239,68,68,.08)',
                        border: `1px solid ${p.valid ? 'rgba(34,197,94,.2)' : 'rgba(239,68,68,.25)'}`,
                      }}>
                        {p.valid
                          ? <CheckCircle2 size={15} color="var(--green)" />
                          : <AlertCircle size={15} color="var(--red)" />}
                        <span style={{ flex: 1, fontSize: '.85rem' }}>{p.name}</span>
                        <code style={{ fontSize: '.8rem', color: p.valid ? 'var(--fire)' : 'var(--red)', letterSpacing: '.05em' }}>{p.birthDate}</code>
                        {!p.valid && <span style={{ fontSize: '.75rem', color: 'var(--red)' }}>{p.error}</span>}
                      </div>
                    ))}
                  </div>

                  {importError && (
                    <div style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                      color: '#fca5a5', fontSize: '.85rem',
                    }}>
                      {importError}
                    </div>
                  )}

                  {importDone && (
                    <div className="pop-in" style={{
                      marginTop: 12, padding: '10px 14px', borderRadius: 10,
                      background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
                      color: 'var(--green)', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <CheckCircle2 size={16} /> Importados com sucesso!
                    </div>
                  )}

                  {validCount > 0 && !importDone && (
                    <button className="btn btn-fire" onClick={handleImport} disabled={importing} style={{ marginTop: 12 }}>
                      {importing ? 'Importando...' : `Importar ${validCount} participante${validCount > 1 ? 's' : ''}`}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Existing list */}
            {existingUsers.length > 0 && (
              <div className="fade-up" style={{ animationDelay: '.08s' }}>
                <h3 style={{ marginBottom: 12 }}>Cadastrados ({existingUsers.length})</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 380, overflowY: 'auto' }}>
                  {existingUsers.map((u, i) => (
                    <div key={u.id} className="card" style={{
                      padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                      animationDelay: `${i * .02}s`,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--bg3)', fontFamily: 'var(--font-display)',
                        fontWeight: 700, fontSize: '.8rem', color: 'var(--fire)',
                      }}>
                        {u.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '.9rem', fontWeight: 500 }}>{u.name}</div>
                        <code style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                  {new Date(u.birthDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                </code>
                      </div>
                      <button onClick={() => removeUser(u.id)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--muted)', padding: 6, borderRadius: 6, transition: 'color .15s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: CATEGORIES ──────────────────────────────────────── */}
        {tab === 'categories' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Add form */}
            <div className="card fade-up">
              <h3 style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={17} color="var(--fire)" /> Nova categoria
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input
                  className="input"
                  placeholder="Ex: Pessoa mais animada"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCategory()}
                />
                <input
                  className="input"
                  placeholder="Descrição (opcional)"
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                  style={{ fontSize: '.95rem' }}
                />
                <button
                  className="btn btn-fire"
                  onClick={addCategory}
                  disabled={addingCat || !newCatName.trim()}
                >
                  {addingCat ? 'Adicionando...' : 'Adicionar categoria'}
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {categories.map((cat, i) => (
                <div key={cat.id} className={`card fade-up`} style={{
                  animationDelay: `${i * .05}s`,
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: 3 }}>{cat.name}</div>
                    {cat.description && (
                      <div style={{ color: 'var(--muted)', fontSize: '.8rem' }}>{cat.description}</div>
                    )}
                  </div>
                  <span className={`badge ${cat.votingOpen ? 'badge-open' : 'badge-closed'}`}>
                    {cat.votingOpen ? 'Aberta' : 'Fechada'}
                  </span>
                  <button onClick={() => removeCategory(cat.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--muted)', padding: 6, borderRadius: 6, transition: 'color .15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--red)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {categories.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 30, fontSize: '.9rem' }}>
                  Nenhuma categoria cadastrada.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB: PIN ────────────────────────────────────────────── */}
        {tab === 'pin' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-up">

            {/* Status atual */}
            <div style={{
              padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
              background: pinConfigured ? 'rgba(34,197,94,.08)' : 'rgba(249,115,22,.08)',
              border: `1px solid ${pinConfigured ? 'rgba(34,197,94,.25)' : 'rgba(249,115,22,.25)'}`,
            }}>
              <ShieldCheck size={18} color={pinConfigured ? 'var(--green)' : 'var(--fire)'} />
              <span style={{ fontSize: '.85rem', color: pinConfigured ? 'var(--green)' : 'var(--fire)' }}>
                {pinConfigured ? 'PIN configurado — você pode alterá-lo abaixo.' : 'Nenhum PIN configurado. Defina um antes do acampamento.'}
              </span>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={17} color="var(--fire)" />
                {pinConfigured ? 'Alterar PIN' : 'Definir PIN do admin'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* PIN atual — só mostra se já tem PIN */}
                {pinConfigured && (
                  <div>
                    <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                      PIN atual
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="input input-code"
                        type={showPin ? 'text' : 'password'}
                        placeholder="••••"
                        value={pinCurrent}
                        onChange={e => { setPinCurrent(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinError(null) }}
                        style={{ fontSize: '1.4rem', paddingRight: 48 }}
                      />
                      <button onClick={() => setShowPin(p => !p)} style={{
                        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
                      }}>
                        {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Novo PIN */}
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    {pinConfigured ? 'Novo PIN' : 'PIN'} (mínimo 4 dígitos)
                  </label>
                  <input
                    className="input input-code"
                    type={showPin ? 'text' : 'password'}
                    placeholder="••••"
                    value={pinNew}
                    onChange={e => { setPinNew(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinError(null) }}
                    style={{ fontSize: '1.4rem' }}
                  />
                </div>

                {/* Confirmar PIN */}
                <div>
                  <label style={{ fontSize: '.8rem', color: 'var(--muted)', display: 'block', marginBottom: 5 }}>
                    Confirmar {pinConfigured ? 'novo ' : ''}PIN
                  </label>
                  <input
                    className="input input-code"
                    type={showPin ? 'text' : 'password'}
                    placeholder="••••"
                    value={pinConfirm}
                    onChange={e => { setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 8)); setPinError(null) }}
                    style={{ fontSize: '1.4rem' }}
                  />
                </div>

                {/* Mostrar/ocultar toggle */}
                <button onClick={() => setShowPin(p => !p)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--muted)', fontSize: '.82rem',
                  display: 'flex', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
                }}>
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                  {showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                </button>

                {/* Erro */}
                {pinError && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
                    color: '#fca5a5', fontSize: '.85rem',
                  }}>
                    {pinError}
                  </div>
                )}

                {/* Sucesso */}
                {pinSuccess && (
                  <div className="pop-in" style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)',
                    color: 'var(--green)', fontSize: '.85rem', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <CheckCircle2 size={16} /> PIN salvo com sucesso!
                  </div>
                )}

                <button
                  className="btn btn-fire"
                  onClick={savePin}
                  disabled={pinSaving || pinNew.length < 4 || pinConfirm.length < 4}
                >
                  {pinSaving ? 'Salvando...' : pinConfigured ? 'Alterar PIN' : 'Definir PIN'}
                </button>
              </div>
            </div>

            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--bg3)', fontSize: '.8rem', color: 'var(--muted)', lineHeight: 1.7,
            }}>
              O PIN fica salvo neste dispositivo (localStorage). Se trocar de computador, precisará definir novamente.
            </div>
          </div>
        )}

        {/* ── TAB: DANGER ZONE ─────────────────────────────────────── */}
        {tab === 'danger' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade-up">

            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)',
              color: '#fca5a5', fontSize: '.85rem', lineHeight: 1.6,
            }}>
              Ações desta aba são irreversíveis. Use apenas antes do acampamento ou para corrigir erros graves.
            </div>

            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <h3 style={{ marginBottom: 4 }}>Apagar apenas os votos</h3>
                <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 12 }}>
                  Mantém participantes e categorias. Útil para fazer um teste antes do evento real.
                </p>
                <button className="btn btn-outline" onClick={resetVotes} style={{ borderColor: 'rgba(239,68,68,.4)', color: 'var(--red)' }}>
                  Apagar votos
                </button>
              </div>

              <div className="divider" />

              <div>
                <h3 style={{ marginBottom: 4 }}>Reset completo</h3>
                <p style={{ color: 'var(--muted)', fontSize: '.82rem', marginBottom: 12 }}>
                  Apaga votos, participantes, categorias e elegibilidades. O admin é mantido.
                </p>
                <button
                  className="btn btn-danger"
                  onClick={resetAll}
                  disabled={resetting}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <RefreshCw size={17} />
                  {resetting ? 'Resetando...' : 'Reset completo'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}