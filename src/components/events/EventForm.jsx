import { useMemo, useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { createEvent, updateEvent, EVENT_TYPES } from '../../lib/events'
import {
  tsToDate,
  dateToDateInput,
  combineDateTime,
  timeOptions,
  addMinutesToTime,
  formatTime,
  startOfDay,
  endOfDay,
} from '../../lib/datetime'

// 新規予定の初期時刻（次のキリのよい時刻）。例: 14:23 → 15:00
function defaultStartTime() {
  const now = new Date()
  const h = now.getMinutes() > 0 ? now.getHours() + 1 : now.getHours()
  const hh = Math.min(h, 23)
  return `${String(hh).padStart(2, '0')}:00`
}

// 予定の新規作成 / 編集フォーム（モーダル, Google カレンダー風）。
// 終日ON: 開始日〜終了日の範囲指定（複数日可）。終日OFF: 同日内で開始/終了時刻。
function EventForm({ event, onClose }) {
  const { user } = useAuth()
  const isEdit = Boolean(event)
  const TIME_OPTS = useMemo(() => timeOptions(15), [])

  const initStart = tsToDate(event?.startAt)
  const initEnd = tsToDate(event?.endAt)
  const initStartTime = initStart ? formatTime(initStart) : defaultStartTime()

  const [title, setTitle] = useState(event?.title ?? '')
  const [type, setType] = useState(event?.type ?? 'work')
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [startDate, setStartDate] = useState(
    dateToDateInput(initStart ?? new Date()),
  )
  // 終了日は終日予定の範囲指定用。既定は開始日と同じ。
  const [endDate, setEndDate] = useState(
    dateToDateInput(initEnd ?? initStart ?? new Date()),
  )
  const [startTime, setStartTime] = useState(initStartTime)
  const [endTime, setEndTime] = useState(
    initEnd ? formatTime(initEnd) : addMinutesToTime(initStartTime, 60),
  )
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [syncToGcal, setSyncToGcal] = useState(event?.syncToGcal ?? false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // 開始日を変えたら、終了日が前なら開始日に合わせる
  const handleStartDateChange = (e) => {
    const v = e.target.value
    setStartDate(v)
    if (endDate < v) setEndDate(v)
  }

  // 開始時刻を変えたら、終了を「開始＋1時間」に追従させる（Google 風）
  const handleStartTimeChange = (e) => {
    const v = e.target.value
    setStartTime(v)
    setEndTime(addMinutesToTime(v, 60))
  }

  // 終了時刻の選択肢に「開始からの所要時間」を併記
  const endOptions = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number)
    const startMin = sh * 60 + sm
    return TIME_OPTS.map((o) => {
      const [eh, em] = o.value.split(':').map(Number)
      const diff = eh * 60 + em - startMin
      let suffix = ''
      if (diff > 0) {
        const h = Math.floor(diff / 60)
        const m = diff % 60
        suffix = ` (${h ? `${h}時間` : ''}${m ? `${m}分` : ''})`
      }
      return { value: o.value, label: o.label + suffix, disabled: diff <= 0 }
    })
  }, [TIME_OPTS, startTime])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('予定名を入力してください。')
      return
    }
    if (!startDate) {
      setError('日付を選択してください。')
      return
    }

    let start
    let end
    if (allDay) {
      // 開始日 00:00 〜 終了日 23:59（複数日可）
      const sd = combineDateTime(startDate, '00:00')
      const ed = combineDateTime(endDate || startDate, '00:00')
      if (startOfDay(ed).getTime() < startOfDay(sd).getTime()) {
        setError('終了日は開始日以降にしてください。')
        return
      }
      start = startOfDay(sd)
      end = endOfDay(ed)
    } else {
      start = combineDateTime(startDate, startTime)
      end = combineDateTime(startDate, endTime)
      if (end.getTime() <= start.getTime()) {
        setError('終了時刻は開始時刻より後にしてください。')
        return
      }
    }

    setSaving(true)
    setError(null)
    const payload = {
      title: title.trim(),
      type,
      startAt: start,
      endAt: end,
      allDay,
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

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            終日（ONで複数日にまたがる予定も登録できます）
          </label>

          {allDay ? (
            <div style={styles.row}>
              <label style={{ ...styles.label, flex: 1 }}>
                開始日 <span style={styles.req}>*</span>
                <input
                  type="date"
                  style={styles.input}
                  value={startDate}
                  onChange={handleStartDateChange}
                />
              </label>
              <label style={{ ...styles.label, flex: 1 }}>
                終了日
                <input
                  type="date"
                  style={styles.input}
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <label style={styles.label}>
                日付 <span style={styles.req}>*</span>
                <input
                  type="date"
                  style={styles.input}
                  value={startDate}
                  onChange={handleStartDateChange}
                />
              </label>
              <div style={styles.row}>
                <label style={{ ...styles.label, flex: 1 }}>
                  開始
                  <select
                    style={styles.input}
                    value={startTime}
                    onChange={handleStartTimeChange}
                  >
                    {TIME_OPTS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ ...styles.label, flex: 1 }}>
                  終了
                  <select
                    style={styles.input}
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  >
                    {endOptions.map((o) => (
                      <option
                        key={o.value}
                        value={o.value}
                        disabled={o.disabled}
                      >
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}

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
