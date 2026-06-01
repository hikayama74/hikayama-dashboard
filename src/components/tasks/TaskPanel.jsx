import { useMemo, useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { TASK_STATUSES } from '../../lib/tasks'
import { tsToDate, isOverdue } from '../../lib/datetime'
import TaskItem from './TaskItem'
import TaskForm from './TaskForm'

// 締切フィルタの選択肢
const DEADLINE_FILTERS = [
  { value: 'all', label: 'すべて' },
  { value: 'overdue', label: '期限切れ' },
  { value: 'has', label: '締切あり' },
]

// タスク一覧パネル（ステータス・締切フィルタ＋追加）。CLAUDE.md §4 の左ペイン。
function TaskPanel() {
  const { tasks, loading, error } = useTasks()
  const [statusFilter, setStatusFilter] = useState('all')
  const [deadlineFilter, setDeadlineFilter] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false
      const d = tsToDate(t.deadline)
      if (deadlineFilter === 'has' && !d) return false
      if (deadlineFilter === 'overdue') {
        if (!(t.status !== 'done' && isOverdue(d))) return false
      }
      return true
    })
  }, [tasks, statusFilter, deadlineFilter])

  const openNew = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (task) => {
    setEditing(task)
    setFormOpen(true)
  }
  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>タスク</h2>
        <button style={styles.addBtn} onClick={openNew}>
          ＋ 追加
        </button>
      </div>

      <div style={styles.filters}>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="all">全ステータス</option>
          {TASK_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={deadlineFilter}
          onChange={(e) => setDeadlineFilter(e.target.value)}
          style={styles.filterSelect}
        >
          {DEADLINE_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p style={styles.muted}>読み込み中…</p>}
      {error && <p style={styles.error}>読み込みに失敗しました。</p>}
      {!loading && !error && filtered.length === 0 && (
        <p style={styles.muted}>
          {tasks.length === 0
            ? 'タスクはまだありません。「＋ 追加」から登録できます。'
            : '条件に合うタスクがありません。'}
        </p>
      )}

      <ul style={styles.list}>
        {filtered.map((task) => (
          <TaskItem key={task.id} task={task} onEdit={openEdit} />
        ))}
      </ul>

      {formOpen && <TaskForm task={editing} onClose={closeForm} />}
    </section>
  )
}

const styles = {
  panel: { display: 'flex', flexDirection: 'column', minHeight: 0 },
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
  filters: { display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' },
  filterSelect: {
    flex: 1,
    padding: '0.4rem 0.5rem',
    fontSize: '0.85rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#fff',
  },
  list: { listStyle: 'none', padding: 0, margin: 0, overflowY: 'auto' },
  muted: { color: '#94a3b8', fontSize: '0.85rem' },
  error: { color: '#dc2626', fontSize: '0.85rem' },
}

export default TaskPanel
