import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { createTask } from '../../lib/tasks'
import { createEvent } from '../../lib/events'
import { createMemo } from '../../lib/memos'
import { statusLabel } from '../../lib/tasks'
import { eventTypeMeta } from '../../lib/events'
import { memoCategoryMeta } from '../../lib/memos'
import { formatIsoLocal } from '../../lib/datetime'

// ISO文字列 → Date | null
function toDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

// File → { mimeType, data(base64・プレフィックスなし), previewUrl, name }
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result // "data:image/png;base64,XXXX"
      const data = String(dataUrl).split(',')[1] ?? ''
      resolve({ mimeType: file.type, data, previewUrl: dataUrl, name: file.name })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const MAX_IMAGES = 5

// 項目ごとの安定キー採番（解析/再解析のたびに新IDを振り、Reactのリコンサイルを確実にする）
let _seq = 0
const nextId = () => `it${_seq++}`

// 「雑に投げてAIが整形する」雑入力モーダル（テキスト＋画像/スクショ）。
// 解析 → 確認（チェックで選別） → 一括登録。
function QuickInputModal({ onClose }) {
  const { user } = useAuth()
  const [text, setText] = useState('')
  const [images, setImages] = useState([]) // [{ mimeType, data, previewUrl, name }]
  const [dragOver, setDragOver] = useState(false)
  const [phase, setPhase] = useState('input') // input | review
  const [parsing, setParsing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  // 解析結果。各項目に _checked を付与して選別する。
  const [items, setItems] = useState({ tasks: [], events: [], memos: [] })
  // 修正ループ用
  const [feedback, setFeedback] = useState('')
  const [refining, setRefining] = useState(false)
  // applyResult のたびに増やし、確認領域を強制再マウントして確実に再描画する
  const [applyCount, setApplyCount] = useState(0)

  const addFiles = async (fileList) => {
    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/'),
    )
    if (imageFiles.length === 0) return
    const room = MAX_IMAGES - images.length
    const converted = await Promise.all(
      imageFiles.slice(0, room).map(fileToImage),
    )
    setImages((prev) => [...prev, ...converted])
  }

  const removeImage = (idx) =>
    setImages((prev) => prev.filter((_, i) => i !== idx))

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const handleParse = async () => {
    if (!text.trim() && images.length === 0) return
    setParsing(true)
    setError(null)
    try {
      // SDK は重いので、解析時に動的importして初期バンドルから切り離す
      const { parseQuickInput } = await import('../../lib/gemini')
      const result = await parseQuickInput(
        text.trim(),
        images.map((img) => ({ mimeType: img.mimeType, data: img.data })),
      )
      applyResult(result)
      setPhase('review')
    } catch (e) {
      console.error('[QuickInput] 解析失敗', e)
      const { describeError } = await import('../../lib/gemini')
      setError('解析に失敗。' + describeError(e))
    } finally {
      setParsing(false)
    }
  }

  // 解析/再解析の結果を選別用 state に反映。
  // prev を渡すと、種別ごとに同じ位置の項目のチェック状態を引き継ぐ
  // （再解析で項目が増えた分は既定でチェック）。prev なしは全件チェック。
  const applyResult = (result, prev) => {
    const merge = (arr, prevArr) =>
      arr.map((it, i) => ({
        ...it,
        _id: nextId(), // 毎回新しいキー → React が確実に新しい行として描画
        _checked: prevArr ? (prevArr[i]?._checked ?? true) : true,
      }))
    const next = {
      tasks: merge(result.tasks, prev?.tasks),
      events: merge(result.events, prev?.events),
      memos: merge(result.memos, prev?.memos),
    }
    console.log(
      '[QuickInput] applyResult → setItems events.startAt:',
      next.events.map((e) => e.startAt),
    )
    setItems(next)
    setApplyCount((c) => c + 1)
  }

  // _checked を除いた現在の結果を取り出す（再解析でAIに渡す用）
  const stripChecked = () => {
    // _checked と _id（UI内部用）は除いてAIに渡す
    const strip = (arr) => arr.map(({ _checked, _id, ...rest }) => rest) // eslint-disable-line no-unused-vars
    return {
      tasks: strip(items.tasks),
      events: strip(items.events),
      memos: strip(items.memos),
    }
  }

  // 「ここは違う」の修正指示でAIに再解析させる
  const handleRefine = async () => {
    if (!feedback.trim()) return
    setRefining(true)
    setError(null)
    try {
      const { refineQuickInput } = await import('../../lib/gemini')
      const prev = items // 現在のチェック状態を引き継ぐ
      const current = stripChecked()
      console.log('[QuickInput] 修正リクエスト:', { feedback: feedback.trim(), current })
      const result = await refineQuickInput(text.trim(), current, feedback.trim())
      console.log('[QuickInput] 修正結果を反映:', result)
      applyResult(result, prev)
      setFeedback('')
    } catch (e) {
      console.error('[QuickInput] 再解析失敗', e)
      const { describeError } = await import('../../lib/gemini')
      setError('再解析に失敗。' + describeError(e))
    } finally {
      setRefining(false)
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

  // 描画時に items の実値を出力（state が描画へ反映されているか確認用）
  if (phase === 'review') {
    console.log(
      '[QuickInput] render(review) events.startAt:',
      items.events.map((e) => e.startAt),
    )
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.heading}>雑に入力</h3>

        {phase === 'input' && (
          <>
            <p style={styles.hint}>
              予定・タスク・メモを自由に書く、または画像・スクショを添付してください。
              <strong>画像と詳細テキストは一緒に送れます</strong>（例: シフト表の画像＋「来週分です」）。
              入力後に「解析する」を押すとAIが整形します。
            </p>
            <textarea
              style={styles.textarea}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="ここに詳細・補足を入力…（画像だけでもOK / 画像＋テキスト併用OK）"
              autoFocus
            />

            {/* 画像アップロード（ドラッグ&ドロップ＋ファイル選択） */}
            <label
              style={{
                ...styles.dropzone,
                ...(dragOver ? styles.dropzoneActive : {}),
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = '' // 同じファイルを再選択できるように
                }}
                disabled={images.length >= MAX_IMAGES}
              />
              📷 画像・スクショをドロップ、またはクリックして選択
              {images.length > 0 && `（${images.length}/${MAX_IMAGES}）`}
            </label>

            {images.length > 0 && (
              <div style={styles.thumbs}>
                {images.map((img, i) => (
                  <div key={i} style={styles.thumbWrap}>
                    <img src={img.previewUrl} alt={img.name} style={styles.thumb} />
                    <button
                      type="button"
                      style={styles.thumbRemove}
                      onClick={() => removeImage(i)}
                      aria-label="削除"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

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
                disabled={parsing || (!text.trim() && images.length === 0)}
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
            <div style={styles.reviewArea} key={`rev-${applyCount}`}>
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
                      key={t._id ?? `t${i}`}
                      checked={t._checked}
                      onToggle={() => toggle('tasks', i)}
                    >
                      <strong>{t.title}</strong>
                      <span style={styles.sub}>
                        {statusLabel(t.status ?? 'todo')}
                        {t.deadline && ` ・🕒 ${formatIsoLocal(t.deadline)}`}
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
                      key={e._id ?? `e${i}`}
                      checked={e._checked}
                      onToggle={() => toggle('events', i)}
                    >
                      <strong>{e.title}</strong>
                      <span style={styles.sub}>
                        {eventTypeMeta(e.type).label}
                        {e.allDay
                          ? ' ・終日'
                          : e.startAt && ` ・${formatIsoLocal(e.startAt)}`}
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
                      key={m._id ?? `m${i}`}
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

            {/* 「ここは違う」修正ループ */}
            <div style={styles.refineBox}>
              <p style={styles.refineLabel}>
                結果が違う場合はAIに修正を指示できます
              </p>
              <div style={styles.refineRow}>
                <input
                  style={styles.refineInput}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing)
                      handleRefine()
                  }}
                  placeholder="例: MTGは火曜じゃなく水曜 / 担当は清水さん / 歯医者は不要"
                  disabled={refining}
                />
                <button
                  style={styles.refineBtn}
                  onClick={handleRefine}
                  disabled={refining || !feedback.trim()}
                >
                  {refining ? '修正中…' : 'AIで修正'}
                </button>
              </div>
              <p style={styles.refineHint}>
                ※ 細かい調整は、登録後に各カードの「編集」からも行えます。
              </p>
            </div>

            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.actions}>
              <button
                style={styles.cancel}
                onClick={() => setPhase('input')}
                disabled={saving || refining}
              >
                戻る
              </button>
              <button
                style={styles.primary}
                onClick={handleRegister}
                disabled={saving || refining || totalChecked === 0}
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
  dropzone: {
    display: 'block',
    marginTop: '0.6rem',
    padding: '0.8rem',
    border: '1.5px dashed #cbd5e1',
    borderRadius: '10px',
    textAlign: 'center',
    fontSize: '0.82rem',
    color: '#64748b',
    cursor: 'pointer',
    background: '#f8fafc',
  },
  dropzoneActive: { borderColor: '#2563eb', background: '#eff6ff' },
  thumbs: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginTop: '0.6rem',
  },
  thumbWrap: { position: 'relative' },
  thumb: {
    width: 72,
    height: 72,
    objectFit: 'cover',
    borderRadius: '8px',
    border: '1px solid #e5e9f0',
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: 'none',
    background: '#1f2933',
    color: '#fff',
    fontSize: '0.8rem',
    lineHeight: 1,
    cursor: 'pointer',
  },
  reviewArea: { maxHeight: '42vh', overflowY: 'auto', marginBottom: '0.5rem' },
  refineBox: {
    background: '#f8fafc',
    border: '1px solid #e5e9f0',
    borderRadius: '10px',
    padding: '0.6rem 0.7rem',
    margin: '0.25rem 0 0.5rem',
  },
  refineLabel: { margin: '0 0 0.4rem', fontSize: '0.8rem', color: '#475569', fontWeight: 600 },
  refineRow: { display: 'flex', gap: '0.5rem' },
  refineInput: {
    flex: 1,
    padding: '0.45rem 0.6rem',
    fontSize: '0.88rem',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
  },
  refineBtn: {
    padding: '0.45rem 1rem',
    background: '#0ea5e9',
    border: 'none',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: 600,
    fontSize: '0.85rem',
    whiteSpace: 'nowrap',
  },
  refineHint: { margin: '0.4rem 0 0', fontSize: '0.72rem', color: '#94a3b8' },
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
