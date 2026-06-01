import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { createTask, updateTask, TASK_STATUSES } from '../../lib/tasks'
import {
  tsToDate,
  dateToInputValue,
  inputValueToDate,
} from '../../lib/datetime'

// タスクの新規作成 / 編集フォーム（モーダル）。
// task を渡せば編集、null なら新規作成。
function TaskForm({ task, onClose }) {
  const { user } = useAuth()
  const isEdit = Boolean(task)

  const [title, setTitle] = useState(task?.title ?? '')
  const [status, setStatus] = useState(task?.status ?? 'todo')
  const [deadline, setDeadline] = useState(
    dateToInputValue(tsToDate(task?.deadline)),
  )
  const [assignee, setAssignee] = useState(task?.assignee ?? '')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [tagsText, setTagsText] = useState((task?.tags ?? []).join(', '))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('タスク名を入力してください。')
      return
    }
    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      status,
      deadline: inputValueToDate(deadline),
      assignee: assignee.trim(),
      notes: notes.trim(),
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }
    try {
      if (isEdit) {
        await updateTask(user.uid, task.id, payload)
      } else {
        await createTask(user.uid, payload)
      }
      onClose()
    } catch (err) {
      console.error('[TaskForm] 保存失敗', err)
      setError('保存に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.heading}>
          {isEdit ? 'タスクを編集' : 'タスクを追加'}
        </h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            タスク名 <span style={styles.req}>*</span>
            <input
              style={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>

          <div style={styles.row}>
            <label style={{ ...styles.label, flex: 1 }}>
              ステータス
              <select
                style={styles.input}
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              締切
              <input
                type="datetime-local"
                style={styles.input}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </label>
          </div>

          <label style={styles.label}>
            担当者
            <input
              style={styles.input}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="例: 岡本さん"
            />
          </label>

          <label style={styles.label}>
            タグ（カンマ区切り）
            <input
              style={styles.input}
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="例: シフト, OKR"
            />
          </label>

          <label style={styles.label}>
            メモ
            <textarea
              style={{ ...styles.input, minHeight: '4rem', resize: 'vertical' }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.actions}>
            <button
              type="button"
              style={styles.cancel}
              onClick={onClose}
              disabled={saving}
            >
              キャンセル
            </button>
            <button type="submit" style={styles.save} disabled={saving}>
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    zIndex: 100,
  },
  modal: {
    background: '#fff',
    borderRadius: '14px',
    padding: '1.5rem',
    width: '100%',
    maxWidth: '460px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
  heading: { margin: '0 0 1rem', fontSize: '1.15rem' },
  label: {
    display: 'block',
    marginBottom: '0.85rem',
    fontSize: '0.85rem',
    color: '#475569',
    fontWeight: 600,
  },
  req: { color: '#dc2626' },
  input: {
    display: 'block',
    width: '100%',
    marginTop: '0.3rem',
    padding: '0.5rem 0.6rem',
    fontSize: '0.95rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    fontWeight: 400,
    color: '#1f2933',
  },
  row: { display: 'flex', gap: '0.75rem' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0 0 0.75rem' },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.5rem',
  },
  cancel: {
    padding: '0.55rem 1.1rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#475569',
  },
  save: {
    padding: '0.55rem 1.4rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
  },
}

export default TaskForm
