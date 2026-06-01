import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { createTask } from '../../lib/tasks'
import { createEvent } from '../../lib/events'
import { createMemo } from '../../lib/memos'
import { statusLabel } from '../../lib/tasks'
import { eventTypeMeta } from '../../lib/events'
import { memoCategoryMeta } from '../../lib/memos'
import { formatDeadline, formatDateTime } from '../../lib/datetime'

// ISO文字列 → Date | null
function toDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

// 「雑に投げてAIが整形する」雑入力モーダル（テキスト）。
// 解析 → 確認（チェックで選別） → 一括登録。
function QuickInputModal({ onClose }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('input') // input | review
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // 解析結果。各項目に _checked を付与して選別する。
  const [items, setItems] = useState({ tasks: [], events: [], memos: [] })

  const handleParse = async () => {
    if (!text.trim()) return
    setParsing(true)
    setError(null)
    try {
      // Anthropic SDK は重いので、解析時に動的importして初期バンドルから切り離す
      const { parseQuickInput } = await import('../../lib/anthropic')
      const result = await parseQuickInput(text.trim())
      setItems({
        tasks: result.tasks.map((t) => ({ ...t, _checked: true })),
        events: result.events.map((e) => ({ ...e, _checked: true })),
        memos: result.memos.map((m) => ({ ...m, _checked: true })),
      })
      setPhase('review')
    } catch (e) {
      console.error('[QuickInput] 解析失敗', e)
      setError(
        e?.message?.includes('VITE_ANTHROPIC_API_KEY')
          ? 'Anthropic APIキーが未設定です（.env を確認してください）。'
          : '解析に失敗しました。時間をおいて再度お試しください。',
      )
    } finally {
      setParsing(false)
    }
  }

  const toggle = (kind, idx) => {
    setItems((prev) => ({
      ...prev,
      [kind]: prev[kind].map((it, i) =>
        i === idx ? { ...it, _checked: !it._checked } : it,
      ),
    }))
  }

  const totalChecked =
    items.tasks.filter((t) => t._checked).length +
    items.events.filter((e) => e._checked).length +
    items.memos.filter((m) => m._checked).length

  const handleRegister = async () => {
    setSaving(true)
    setError(null)
    try {
      const ops = []
      for (const t of items.tasks) {
        if (!t._checked) continue
        ops.push(
          createTask(user.uid, {
            title: t.title,
            status: t.status ?? 'todo',
            deadline: toDate(t.deadline),
            assignee: t.assignee ?? '',
            notes: t.notes ?? '',
            tags: t.tags ?? [],
          }),
        )
      }
      for (const e of items.events) {
        if (!e._checked) continue
        ops.push(
          createEvent(user.uid, {
            title: e.title,
            type: e.type ?? 'work',
            startAt: toDate(e.startAt),
            endAt: toDate(e.endAt),
            allDay: e.allDay ?? false,
            location: e.location ?? '',
            notes: e.notes ?? '',
          }),
        )
      }
      for (const m of items.memos) {
        if (!m._checked) continue
        ops.push(
          createMemo(user.uid, {
            content: m.content,
            category: m.category ?? 'work',
          }),
        )
      }
      await Promise.all(ops)
      onClose()
    } catch (e) {
      console.error('[QuickInput] 登録失敗', e)
      setError('登録に失敗しました。')
      setSaving(false)
    }
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.heading}>雑に入力</h3>

        {phase === 'input' && (
          <>
            <p style={styles.hint}>
              予定・タスク・メモを自由に書いてください。AIが整形します。
              <br />
              例: 「来週火曜15時にくみこさんとMTG、議事録作成もタスクで」
            </p>
            <textarea
              style={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここに雑に入力…"
              autoFocus
            />
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.actions}>
              <button
                style={styles.cancel}
                onClick={onClose}
                disabled={parsing}
              >
                キャンセル
              </button>
              <button
                style={styles.primary}
                onClick={handleParse}
                disabled={parsing || !text.trim()}
              >
                {parsing ? '解析中…' : '解析する'}
              </button>
            </div>
          </>
        )}

        {phase === 'review' && (
          <>
            <p style={styles.hint}>
              登録する項目にチェックを入れてください。
            </p>
            <div style={styles.reviewArea}>
              {totalChecked === 0 &&
                items.tasks.length === 0 &&
                items.events.length === 0 &&
                items.memos.length === 0 && (
                  <p style={styles.muted}>抽出できる項目がありませんでした。</p>
                )}

              {items.tasks.length > 0 && (
                <Section title="タスク">
                  {items.tasks.map((t, i) => (
                    <Row
                      key={`t${i}`}
                      checked={t._checked}
                      onToggle={() => toggle('tasks', i)}
                    >
                      <strong>{t.title}</strong>
                      <span style={styles.sub}>
                        {statusLabel(t.status ?? 'todo')}
                        {toDate(t.deadline) &&
                          ` ・🕒 ${formatDeadline(toDate(t.deadline))}`}
                        {t.assignee && ` ・👤 ${t.assignee}`}
                        {t.tags?.length ? ` ・${t.tags.map((x) => `#${x}`).join(' ')}` : ''}
                      </span>
                    </Row>
                  ))}
                </Section>
              )}

              {items.events.length > 0 && (
                <Section title="予定">
                  {items.events.map((e, i) => (
                    <Row
                      key={`e${i}`}
                      checked={e._checked}
                      onToggle={() => toggle('events', i)}
                    >
                      <strong>{e.title}</strong>
                      <span style={styles.sub}>
                        {eventTypeMeta(e.type).label}
                        {e.allDay
                          ? ' ・終日'
                          : toDate(e.startAt) &&
                            ` ・${formatDateTime(toDate(e.startAt))}`}
                        {e.location && ` ・📍 ${e.location}`}
                      </span>
                    </Row>
                  ))}
                </Section>
              )}

              {items.memos.length > 0 && (
                <Section title="メモ">
                  {items.memos.map((m, i) => (
                    <Row
                      key={`m${i}`}
                      checked={m._checked}
                      onToggle={() => toggle('memos', i)}
                    >
                      <span style={styles.sub}>
                        [{memoCategoryMeta(m.category).label}]
                      </span>{' '}
                      {m.content}
                    </Row>
                  ))}
                </Section>
              )}
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.actions}>
              <button
                style={styles.cancel}
                onClick={() => setPhase('input')}
                disabled={saving}
              >
                戻る
              </button>
              <button
                style={styles.primary}
                onClick={handleRegister}
                disabled={saving || totalChecked === 0}
              >
                {saving ? '登録中…' : `登録する（${totalChecked}件）`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={styles.section}>
      <h4 style={styles.sectionTitle}>{title}</h4>
      {children}
    </div>
  )
}

function Row({ checked, onToggle, children }) {
  return (
    <label style={styles.row}>
      <input type="checkbox" checked={checked} onChange={onToggle} />
      <span style={styles.rowBody}>{children}</span>
    </label>
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
    maxWidth: '520px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
  },
  heading: { margin: '0 0 0.75rem', fontSize: '1.15rem' },
  hint: { fontSize: '0.82rem', color: '#647186', margin: '0 0 0.75rem' },
  textarea: {
    width: '100%',
    minHeight: '8rem',
    padding: '0.7rem',
    fontSize: '0.95rem',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  reviewArea: { maxHeight: '50vh', overflowY: 'auto', marginBottom: '0.5rem' },
  section: { marginBottom: '1rem' },
  sectionTitle: {
    margin: '0 0 0.4rem',
    fontSize: '0.8rem',
    color: '#475569',
    borderBottom: '1px solid #e5e9f0',
    paddingBottom: '0.2rem',
  },
  row: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'flex-start',
    padding: '0.45rem 0.3rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
  },
  rowBody: { display: 'flex', flexDirection: 'column', gap: '0.1rem' },
  sub: { fontSize: '0.78rem', color: '#64748b' },
  muted: { color: '#94a3b8', fontSize: '0.85rem' },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0.5rem 0' },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  cancel: {
    padding: '0.55rem 1.1rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#475569',
  },
  primary: {
    padding: '0.55rem 1.4rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
  },
}

export default QuickInputModal
