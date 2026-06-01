import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { useMemos } from '../../hooks/useMemos'
import { createMemo, MEMO_CATEGORIES } from '../../lib/memos'
import MemoItem from './MemoItem'

// メモ・状況報告パネル（右ペイン）。インライン作成＋カテゴリフィルタ＋一覧。
function MemoPanel() {
  const { user } = useAuth()
  const { memos, loading, error } = useMemos()
  const [draft, setDraft] = useState('')
  const [draftCategory, setDraftCategory] = useState('work')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)

  const filtered = useMemo(() => {
    if (filter === 'all') return memos
    return memos.filter((m) => m.category === filter)
  }, [memos, filter])

  const handleAdd = async () => {
    if (!draft.trim()) return
    setAdding(true)
    try {
      await createMemo(user.uid, {
        content: draft.trim(),
        category: draftCategory,
      })
      setDraft('')
    } catch (err) {
      console.error('[MemoPanel] 作成失敗', err)
    } finally {
      setAdding(false)
    }
  }

  return (
    <section>
      <h2 style={styles.title}>メモ・状況報告</h2>

      {/* 作成欄 */}
      <div style={styles.composer}>
        <textarea
          style={styles.draftArea}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="メモを書く…"
        />
        <div style={styles.composerRow}>
          <select
            value={draftCategory}
            onChange={(e) => setDraftCategory(e.target.value)}
            style={styles.catSelect}
          >
            {MEMO_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <button
            style={styles.addBtn}
            onClick={handleAdd}
            disabled={adding || !draft.trim()}
          >
            {adding ? '追加中…' : '追加'}
          </button>
        </div>
      </div>

      {/* フィルタ */}
      <div style={styles.filters}>
        <button
          onClick={() => setFilter('all')}
          style={{
            ...styles.filterChip,
            ...(filter === 'all' ? styles.filterChipActive : {}),
          }}
        >
          すべて
        </button>
        {MEMO_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            style={{
              ...styles.filterChip,
              ...(filter === c.value
                ? { ...styles.filterChipActive, background: c.color, borderColor: c.color }
                : {}),
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading && <p style={styles.muted}>読み込み中…</p>}
      {error && <p style={styles.error}>読み込みに失敗しました。</p>}
      {!loading && !error && filtered.length === 0 && (
        <p style={styles.muted}>
          {memos.length === 0
            ? 'メモはまだありません。上の欄から追加できます。'
            : 'この分類のメモはありません。'}
        </p>
      )}

      <ul style={styles.list}>
        {filtered.map((memo) => (
          <MemoItem key={memo.id} memo={memo} />
        ))}
      </ul>
    </section>
  )
}

const styles = {
  title: { margin: '0 0 0.6rem', fontSize: '1.05rem' },
  composer: {
    background: '#fff',
    border: '1px solid #e5e9f0',
    borderRadius: '10px',
    padding: '0.6rem',
    marginBottom: '0.75rem',
  },
  draftArea: {
    width: '100%',
    minHeight: '3.5rem',
    padding: '0.5rem',
    fontSize: '0.9rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  composerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
    gap: '0.5rem',
  },
  catSelect: {
    padding: '0.35rem 0.5rem',
    fontSize: '0.85rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#fff',
  },
  addBtn: {
    padding: '0.4rem 1.1rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  filters: { display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' },
  filterChip: {
    padding: '0.3rem 0.7rem',
    fontSize: '0.8rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '999px',
    color: '#64748b',
  },
  filterChipActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
    fontWeight: 600,
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  muted: { color: '#94a3b8', fontSize: '0.85rem' },
  error: { color: '#dc2626', fontSize: '0.85rem' },
}

export default MemoPanel
