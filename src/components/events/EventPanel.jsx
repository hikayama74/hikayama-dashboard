import { useMemo, useState } from 'react'
import { useEvents } from '../../hooks/useEvents'
import { EVENT_TYPES } from '../../lib/events'
import {
  tsToDate,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  formatDateHeader,
  dateKey,
  eachDayInRange,
} from '../../lib/datetime'
import EventItem from './EventItem'
import EventForm from './EventForm'

// 表示範囲（今日 / 今週 / 今月 / すべて）
const RANGES = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'all', label: 'すべて' },
]

// 範囲に応じた [from, to]。'all' は null（範囲フィルタなし）。
function rangeBounds(range, now) {
  switch (range) {
    case 'today':
      return [startOfDay(now), endOfDay(now)]
    case 'week':
      return [startOfWeek(now), endOfWeek(now)]
    case 'month':
      return [startOfMonth(now), endOfMonth(now)]
    case 'all':
    default:
      return null
  }
}

// カレンダービュー（中央ペイン）。仕事・シフト・プライベートを統合表示。
function EventPanel() {
  const { events, loading, error } = useEvents()
  const [range, setRange] = useState('today')
  const [typeFilter, setTypeFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  // 範囲内 & 種別フィルタを適用し、日付ごとにグルーピング。
  // 複数日にまたがる予定は、範囲内の各日に表示する。
  const groups = useMemo(() => {
    const now = new Date()
    const bounds = rangeBounds(range, now)
    const map = new Map() // dateKey -> events[]

    for (const ev of events) {
      const start = tsToDate(ev.startAt)
      if (!start) continue
      if (typeFilter !== 'all' && ev.type !== typeFilter) continue
      const end = tsToDate(ev.endAt) ?? start

      // この予定が占める日範囲（startの日〜endの日）
      let spanFrom = startOfDay(start)
      let spanTo = startOfDay(end)

      // 表示範囲でクリップ（'all' は bounds=null）
      if (bounds) {
        if (spanTo < bounds[0] || spanFrom > bounds[1]) continue
        if (spanFrom < startOfDay(bounds[0])) spanFrom = startOfDay(bounds[0])
        if (spanTo > startOfDay(bounds[1])) spanTo = startOfDay(bounds[1])
      }

      for (const day of eachDayInRange(spanFrom, spanTo)) {
        const key = dateKey(day)
        if (!map.has(key)) map.set(key, { date: day, items: [] })
        map.get(key).items.push(ev)
      }
    }

    // 日付昇順に並べて返す
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, { date, items }]) => ({ key, date, items }))
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
          {range === 'all'
            ? '予定はまだありません。'
            : `${RANGES.find((r) => r.value === range)?.label ?? ''}の予定はありません。`}
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
    flexWrap: 'wrap',
  },
  rangeTabs: { display: 'flex', gap: '0.25rem', flexWrap: 'wrap' },
  rangeTab: {
    padding: '0.35rem 0.7rem',
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
