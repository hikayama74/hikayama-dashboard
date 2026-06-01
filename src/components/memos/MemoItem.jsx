import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import {
  updateMemo,
  deleteMemo,
  memoCategoryMeta,
  MEMO_CATEGORIES,
} from '../../lib/memos'
import { tsToDate, formatDateTime } from '../../lib/datetime'

// 1件のメモカード。インライン編集・削除に対応。
function MemoItem({ memo }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [content, setContent] = useState(memo.content)
  const [category, setCategory] = useState(memo.category)
  const [busy, setBusy] = useState(false)

  const meta = memoCategoryMeta(memo.category)
  const created = tsToDate(memo.createdAt)

  const startEdit = () => {
    setContent(memo.content)
    setCategory(memo.category)
    setEditing(true)
  }

  const handleSave = async () => {
    if (!content.trim()) return
    setBusy(true)
    try {
      await updateMemo(user.uid, memo.id, {
        content: content.trim(),
        category,
      })
      setEditing(false)
    } catch (err) {
      console.error('[MemoItem] 更新失敗', err)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('このメモを削除しますか？')) return
    setBusy(true)
    try {
      await deleteMemo(user.uid, memo.id)
    } catch (err) {
      console.error('[MemoItem] 削除失敗', err)
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <li style={{ ...styles.item, borderLeftColor: meta.color }}>
        <textarea
          style={styles.editArea}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoFocus
        />
        <div style={styles.editRow}>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={styles.catSelect}
          >
            {MEMO_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <div style={styles.editActions}>
            <button
              style={styles.iconBtn}
              onClick={() => setEditing(false)}
              disabled={busy}
            >
              キャンセル
            </button>
            <button style={styles.saveBtn} onClick={handleSave} disabled={busy}>
              保存
            </button>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li
      style={{
        ...styles.item,
        borderLeftColor: meta.color,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <div style={styles.topRow}>
        <span style={{ ...styles.badge, color: meta.color }}>{meta.label}</span>
        <span style={styles.date}>{formatDateTime(created)}</span>
      </div>
      <p style={styles.content}>{memo.content}</p>
      <div style={styles.controls}>
        <button style={styles.iconBtn} onClick={startEdit} disabled={busy}>
          編集
        </button>
        <button
          style={{ ...styles.iconBtn, color: '#dc2626' }}
          onClick={handleDelete}
          disabled={busy}
        >
          削除
        </button>
      </div>
    </li>
  )
}

const styles = {
  item: {
    listStyle: 'none',
    background: '#fff',
    border: '1px solid #e5e9f0',
    borderLeft: '4px solid #2563eb',
    borderRadius: '10px',
    padding: '0.7rem 0.85rem',
    marginBottom: '0.5rem',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '0.75rem',
  },
  badge: { fontWeight: 700 },
  date: { color: '#94a3b8' },
  content: {
    margin: '0.4rem 0 0.5rem',
    fontSize: '0.9rem',
    color: '#1f2933',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  controls: { display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' },
  iconBtn: {
    fontSize: '0.78rem',
    padding: '0.2rem 0.5rem',
    background: 'transparent',
    border: 'none',
    color: '#475569',
  },
  editArea: {
    width: '100%',
    minHeight: '4rem',
    padding: '0.5rem',
    fontSize: '0.9rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  editRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '0.5rem',
    gap: '0.5rem',
  },
  catSelect: {
    padding: '0.3rem 0.4rem',
    fontSize: '0.8rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    background: '#fff',
  },
  editActions: { display: 'flex', gap: '0.25rem' },
  saveBtn: {
    fontSize: '0.8rem',
    padding: '0.3rem 0.9rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    color: '#fff',
    fontWeight: 600,
  },
}

export default MemoItem
