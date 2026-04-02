import { useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react'
import { db } from '../db/database'

type TableName = 'users' | 'categories' | 'votes' | 'devices' | 'auditLog' | 'categoryEligibility' | 'settings'

export default function Debug() {
  const [selectedTable, setSelectedTable] = useState<TableName>('users')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const tables: { name: TableName; label: string }[] = [
    { name: 'users', label: 'Usuários' },
    { name: 'categories', label: 'Categorias' },
    { name: 'votes', label: 'Votos' },
    { name: 'categoryEligibility', label: 'Elegibilidade' },
    { name: 'devices', label: 'Dispositivos' },
    { name: 'auditLog', label: 'Auditoria' },
    { name: 'settings', label: 'Configurações' },
  ]

  const loadTable = async (table: TableName) => {
    setLoading(true)
    try {
      let result: any[] = []
      switch (table) {
        case 'users':
          result = await db.users.toArray()
          break
        case 'categories':
          result = await db.categories.toArray()
          break
        case 'votes':
          result = await db.votes.toArray()
          break
        case 'devices':
          result = await db.devices.toArray()
          break
        case 'auditLog':
          result = await db.auditLog.toArray()
          break
        case 'categoryEligibility':
          result = await db.categoryEligibility.toArray()
          break
        case 'settings':
          result = await db.settings.toArray()
          break
      }
      setData(result)
    } catch (e) {
      console.error('Erro ao carregar tabela:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTable(selectedTable)
  }, [selectedTable])

  const handleTableChange = (table: TableName) => {
    setSelectedTable(table)
  }

  const clearAllData = async () => {
    if (!confirm('Tem certeza que quer apagar TUDO (inclusive PIN admin)?')) return
    try {
      await db.users.clear()
      await db.categories.clear()
      await db.votes.clear()
      await db.devices.clear()
      await db.auditLog.clear()
      await db.categoryEligibility.clear()
      await db.settings.clear()
      localStorage.removeItem('campvote_admin_pin_hash') // fallback
      alert('Banco de dados e PIN admin foram limpos!')
      setData([])
    } catch (e) {
      alert('Erro: ' + (e as Error).message)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <nav className="nav">
        <button onClick={() => window.history.back()} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ArrowLeft size={18} /> Voltar
        </button>
        <span style={{ color: 'var(--muted)', fontSize: '.85rem' }}>Debug — Banco de Dados</span>
      </nav>

      <div className="page-full" style={{ paddingTop: 24 }}>
        {/* Controles */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {tables.map(t => (
            <button
              key={t.name}
              onClick={() => handleTableChange(t.name)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `2px solid ${selectedTable === t.name ? 'var(--fire)' : 'var(--border)'}`,
                background: selectedTable === t.name ? 'rgba(239,68,68,.1)' : 'var(--bg2)',
                color: selectedTable === t.name ? 'var(--fire)' : 'var(--text)',
                cursor: 'pointer',
                fontSize: '.85rem',
                fontWeight: 500,
                transition: 'all .2s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Info */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 16, padding: '12px 14px', background: 'var(--bg2)', borderRadius: 10,
        }}>
          <span style={{ fontSize: '.9rem', color: 'var(--muted)' }}>
            <strong>{data.length}</strong> registro{data.length !== 1 ? 's' : ''} encontrado{data.length !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => loadTable(selectedTable)} disabled={loading} style={{
              background: 'none', border: '1px solid var(--border)', borderRadius: 6,
              color: loading ? 'var(--muted)' : 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer', padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: '.8rem',
              opacity: loading ? 0.6 : 1
            }}>
              <RefreshCw size={13} /> {loading ? 'Carregando...' : 'Recarregar'}
            </button>
            <button onClick={clearAllData} style={{
              background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
              borderRadius: 6, color: 'var(--red)', cursor: 'pointer', padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: 5, fontSize: '.8rem',
            }}>
              <Trash2 size={13} /> Limpar tudo
            </button>
          </div>
        </div>

        {/* Tabela */}
        {data.length > 0 ? (
          <div style={{
            overflowX: 'auto',
            background: 'var(--bg2)',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '.8rem',
            }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {Object.keys(data[0] || {}).map(key => (
                    <th key={key} style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: 'var(--fire)',
                      background: 'rgba(239,68,68,.05)',
                    }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.02)',
                  }}>
                    {Object.entries(row).map(([key, value]) => (
                      <td key={`${i}-${key}`} style={{
                        padding: '8px 12px',
                        color: 'var(--text)',
                        maxWidth: 300,
                        overflow: 'auto',
                        wordBreak: 'break-word',
                      }}>
                        {typeof value === 'boolean' ? (
                          <span style={{ color: value ? 'var(--green)' : 'var(--red)' }}>
                            {value ? '✓' : '✗'}
                          </span>
                        ) : typeof value === 'object' ? (
                          <code style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                            {JSON.stringify(value).slice(0, 50)}...
                          </code>
                        ) : (
                          <code style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                            {String(value).slice(0, 100)}
                          </code>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: 40,
            color: 'var(--muted)', fontSize: '.9rem',
          }}>
            Nenhum registro encontrado nesta tabela
          </div>
        )}
      </div>
    </div>
  )
}
