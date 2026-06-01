import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { updateTask, deleteTask, TASK_STATUSES } from '../../lib/tasks'
import { tsToDate, formatDeadline, isOverdue } from '../../lib/datetime'

const STATUS_COLORS = {
  todo: '#64748b',
  in_progress: '#2563eb',
  done: '#16a34a',
}

// 1件のタスク表示行。ステータス変更・編集・削除に対応。
function TaskItem({ task, onEdit }) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)

  const deadlineDate = tsToDate(task.deadline)
  const overdue =
    task.status !== 'done' && isOverdue(deadlineDate)
  const isDone = task.status === 'done'

  const handleStatusChange = async (e) => {
    setBusy(true)
    try {
      await updateTask(user.uid, task.id, { status: e.target.value })
    } catch (err) {
      console.error('[TaskItem] ステータス更新失敗', err)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`「${task.title}」を削除しますか？`)) return
    setBusy(true)
    try {
      await deleteTask(user.uid, task.id)
    } catch (err) {
      console.error('[TaskItem] 削除失敗', err)
      setBusy(false)
    }
  }

  return (
    <li style={{ ...styles.item, opacity: busy ? 0.5 : 1 }}>
      <div style={styles.main}>
        <span
          style={{
            ...styles.title,
            textDecoration: isDone ? 'line-through' : 'none',
            color: isDone ? '#94a3b8' : '#1f2933',
          }}
        >
          {task.title}
        </span>
        <div style={styles.meta}>
          {deadlineDate && (
            <span style={{ color: overdue ? '#dc2626' : '#64748b' }}>
              🕒 {formatDeadline(deadlineDate)}
              {overdue && ' (期限切れ)'}
            </span>
          )}
          {task.assignee && <span>👤 {task.assignee}</span>}
          {task.tags?.map((t) => (
            <span key={t} style={styles.tag}>
              #{t}
            </span>
          ))}
        </div>
        {task.notes && <p style={styles.notes}>{task.notes}</p>}
      </div>

      <div style={styles.controls}>
        <select
          value={task.status}
          onChange={handleStatusChange}
          disabled={busy}
          style={{
            ...styles.statusSelect,
            color: STATUS_COLORS[task.status] ?? '#64748b',
            borderColor: STATUS_COLORS[task.status] ?? '#cbd5e1',
          }}
        >
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button style={styles.iconBtn} onClick={() => onEdit(task)} disabled={busy}>
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
    padding: '0.75rem 0.9rem',
    marginBottom: '0.6rem',
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
  },
  main: { flex: 1, minWidth: 0 },
  title: { fontWeight: 600, fontSize: '0.95rem', wordBreak: 'break-word' },
  meta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.6rem',
    fontSize: '0.78rem',
    color: '#64748b',
    marginTop: '0.35rem',
  },
  tag: {
    background: '#eef2ff',
    color: '#4338ca',
    borderRadius: '6px',
    padding: '0.05rem 0.4rem',
  },
  notes: {
    margin: '0.5rem 0 0',
    fontSize: '0.82rem',
    color: '#475569',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  controls: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.35rem',
    flexShrink: 0,
  },
  statusSelect: {
    fontSize: '0.78rem',
    padding: '0.25rem 0.4rem',
    border: '1px solid',
    borderRadius: '6px',
    background: '#fff',
    fontWeight: 600,
  },
  iconBtn: {
    fontSize: '0.78rem',
    padding: '0.2rem 0.5rem',
    background: 'transparent',
    border: 'none',
    color: '#475569',
  },
}

export default TaskItem
