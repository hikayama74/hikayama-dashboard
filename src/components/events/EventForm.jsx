import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { createEvent, updateEvent, EVENT_TYPES } from '../../lib/events'
import {
  tsToDate,
  dateToInputValue,
  inputValueToDate,
} from '../../lib/datetime'

// 予定の新規作成 / 編集フォーム（モーダル）。
// event を渡せば編集、null なら新規作成。
function EventForm({ event, onClose }) {
  const { user } = useAuth()
  const isEdit = Boolean(event)

  const [title, setTitle] = useState(event?.title ?? '')
  const [type, setType] = useState(event?.type ?? 'work')
  const [startAt, setStartAt] = useState(
    dateToInputValue(tsToDate(event?.startAt)),
  )
  const [endAt, setEndAt] = useState(dateToInputValue(tsToDate(event?.endAt)))
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [syncToGcal, setSyncToGcal] = useState(event?.syncToGcal ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('予定名を入力してください。')
      return
    }
    const start = inputValueToDate(startAt)
    if (!start) {
      setError('開始日時を入力してください。')
      return
    }
    const end = inputValueToDate(endAt)
    if (end && end.getTime() < start.getTime()) {
      setError('終了日時は開始日時より後にしてください。')
      return
    }

    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      type,
      startAt: start,
      endAt: end,
      location: location.trim(),
      notes: notes.trim(),
      syncToGcal,
    }
    try {
      if (isEdit) {
        await updateEvent(user.uid, event.id, payload)
      } else {
        await createEvent(user.uid, payload)
      }
      onClose()
    } catch (err) {
      console.error('[EventForm] 保存失敗', err)
      setError('保存に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.heading}>{isEdit ? '予定を編集' : '予定を追加'}</h3>
        <form onSubmit={handleSubmit}>
          <label style={styles.label}>
            予定名 <span style={styles.req}>*</span>
            <input
              style={styles.input}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </label>

          <label style={styles.label}>
            種別
            <select
              style={styles.input}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <div style={styles.row}>
            <label style={{ ...styles.label, flex: 1 }}>
              開始 <span style={styles.req}>*</span>
              <input
                type="datetime-local"
                style={styles.input}
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </label>
            <label style={{ ...styles.label, flex: 1 }}>
              終了
              <input
                type="datetime-local"
                style={styles.input}
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </label>
          </div>

          <label style={styles.label}>
            場所
            <input
              style={styles.input}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例: オンライン / 会議室A"
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

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={syncToGcal}
              onChange={(e) => setSyncToGcal(e.target.checked)}
            />
            Google カレンダーに同期する（フェーズ2で連携）
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
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.82rem',
    color: '#475569',
    marginBottom: '1rem',
  },
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

export default EventForm
