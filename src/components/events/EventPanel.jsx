import { useMemo, useState } from 'react'
import { useEvents } from '../../hooks/useEvents'
import { EVENT_TYPES } from '../../lib/events'
import {
  tsToDate,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  formatDateHeader,
  dateKey,
} from '../../lib/datetime'
import EventItem from './EventItem'
import EventForm from './EventForm'

// 表示範囲（今日 / 今週）
const RANGES = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
]

// カレンダービュー（中央ペイン）。仕事・シフト・プライベートを統合表示。
function EventPanel() {
  const { events, loading, error } = useEvents()
  const [range, setRange] = useState('today')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // 範囲内 & 種別フィルタを適用し、日付ごとにグルーピング
  const groups = useMemo(() => {
    const now = new Date()
    const from = range === 'today' ? startOfDay(now) : startOfWeek(now)
    const to = range === 'today' ? endOfDay(now) : endOfWeek(now)

    const inRange = events.filter((ev) => {
      const start = tsToDate(ev.startAt)
      if (!start) return false
      if (start < from || start > to) return false
      if (typeFilter !== 'all' && ev.type !== typeFilter) return false
      return true
    })

    // 日付キーごとにまとめる（events は startAt 昇順で購読済み）
    const map = new Map()
    for (const ev of inRange) {
      const key = dateKey(tsToDate(ev.startAt))
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(ev)
    }
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      date: tsToDate(items[0].startAt),
      items,
    }))
  }, [events, range, typeFilter])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (ev) => {
    setEditing(ev)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const isEmpty = !loading && !error && groups.length === 0

  return (
    <section>
      <div style={styles.header}>
        <h2 style={styles.title}>予定</h2>
        <button style={styles.addBtn} onClick={openNew}>
          ＋ 追加
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.rangeTabs}>
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              style={{
                ...styles.rangeTab,
                ...(range === r.value ? styles.rangeTabActive : {}),
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={styles.typeSelect}
        >
          <option value="all">全種別</option>
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p style={styles.muted}>読み込み中…</p>}
      {error && <p style={styles.error}>読み込みに失敗しました。</p>}
      {isEmpty && (
        <p style={styles.muted}>
          {range === 'today' ? '今日' : '今週'}の予定はありません。
        </p>
      )}

      {groups.map((g) => (
        <div key={g.key} style={styles.group}>
          <h3 style={styles.dateHeader}>{formatDateHeader(g.date)}</h3>
          <ul style={styles.list}>
            {g.items.map((ev) => (
              <EventItem key={ev.id} event={ev} onEdit={openEdit} />
            ))}
          </ul>
        </div>
      ))}

      {formOpen && <EventForm event={editing} onClose={closeForm} />}
    </section>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.6rem',
  },
  title: { margin: 0, fontSize: '1.05rem' },
  addBtn: {
    padding: '0.4rem 0.8rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    marginBottom: '0.75rem',
  },
  rangeTabs: { display: 'flex', gap: '0.25rem' },
  rangeTab: {
    padding: '0.35rem 0.85rem',
    fontSize: '0.85rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    color: '#64748b',
  },
  rangeTabActive: {
    background: '#2563eb',
    borderColor: '#2563eb',
    color: '#fff',
    fontWeight: 600,
  },
  typeSelect: {
    padding: '0.4rem 0.5rem',
    fontSize: '0.85rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#fff',
  },
  group: { marginBottom: '1rem' },
  dateHeader: {
    margin: '0 0 0.4rem',
    fontSize: '0.85rem',
    color: '#475569',
    borderBottom: '1px solid #e5e9f0',
    paddingBottom: '0.25rem',
  },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  muted: { color: '#94a3b8', fontSize: '0.85rem' },
  error: { color: '#dc2626', fontSize: '0.85rem' },
}

export default EventPanel
