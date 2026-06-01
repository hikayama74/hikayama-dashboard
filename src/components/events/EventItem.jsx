import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { deleteEvent, eventTypeMeta } from '../../lib/events'
import {
  tsToDate,
  formatTimeRange,
  formatDateShort,
  formatDateTime,
  dateKey,
} from '../../lib/datetime'

// 1件の予定表示行（時刻・種別カラーバー・編集・削除）。
function EventItem({ event, onEdit }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const meta = eventTypeMeta(event.type)
  const start = tsToDate(event.startAt)
  const end = tsToDate(event.endAt)
  // 複数日にまたがる予定か（開始日と終了日が異なる）
  const multiDay = start && end && dateKey(start) !== dateKey(end)

  // 時刻/日付表示の文言
  let timeText
  if (event.allDay) {
    timeText = multiDay
      ? `終日 · ${formatDateShort(start)}–${formatDateShort(end)}`
      : '終日'
  } else if (multiDay) {
    // 時刻あり日跨ぎ：両端に日付を併記（例: 5/1 22:00 – 5/2 4:00）
    timeText = `${formatDateTime(start)} – ${formatDateTime(end)}`
  } else {
    timeText = formatTimeRange(start, end)
  }

  const handleDelete = async () => {
    if (!window.confirm(`「${event.title}」を削除しますか？`)) return
    setBusy(true)
    try {
      await deleteEvent(user.uid, event.id)
    } catch (err) {
      console.error('[EventItem] 削除失敗', err)
      setBusy(false)
    }
  }

  return (
    <li style={{ ...styles.item, opacity: busy ? 0.5 : 1 }}>
      <span style={{ ...styles.bar, background: meta.color }} />
      <div style={styles.body}>
        <div style={styles.topRow}>
          <span style={styles.time}>{timeText}</span>
          <span style={{ ...styles.typeBadge, color: meta.color }}>
            {meta.label}
          </span>
          {event.syncToGcal && <span style={styles.gcal}>📅同期</span>}
        </div>
        <span style={styles.title}>{event.title}</span>
        <div style={styles.meta}>
          {event.location && <span>📍 {event.location}</span>}
        </div>
        {event.notes && <p style={styles.notes}>{event.notes}</p>}
      </div>
      <div style={styles.controls}>
        <button style={styles.iconBtn} onClick={() => onEdit(event)} disabled={busy}>
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
    borderRadius: '10px',
    padding: '0.6rem 0.75rem',
    marginBottom: '0.5rem',
    display: 'flex',
    gap: '0.6rem',
  },
  bar: { width: 4, borderRadius: 4, flexShrink: 0 },
  body: { flex: 1, minWidth: 0 },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.78rem',
  },
  time: { fontWeight: 700, color: '#1f2933' },
  typeBadge: { fontWeight: 600 },
  gcal: { color: '#94a3b8' },
  title: {
    display: 'block',
    fontWeight: 600,
    fontSize: '0.92rem',
    marginTop: '0.15rem',
    wordBreak: 'break-word',
  },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '0.25rem',
  },
  notes: {
    margin: '0.4rem 0 0',
    fontSize: '0.8rem',
    color: '#475569',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  controls: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 },
  iconBtn: {
    fontSize: '0.78rem',
    padding: '0.2rem 0.5rem',
    background: 'transparent',
    border: 'none',
    color: '#475569',
  },
}

export default EventItem
