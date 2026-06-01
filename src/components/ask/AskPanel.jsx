import { useState } from 'react'
import { useTasks } from '../../hooks/useTasks'
import { useEvents } from '../../hooks/useEvents'
import { useMemos } from '../../hooks/useMemos'

// 「AIに聞く」パネル（下部・開閉式、CLAUDE.md §4）。Gemini で実装。
// 完了済みタスク・過去の予定も含めた全データを文脈として渡す。
function AskPanel({ open, onClose }) {
  // hooks は絞り込みなしの全件を返す（完了済み・過去分も含む）
  const { tasks } = useTasks()
  const { events } = useEvents()
  const { memos } = useMemos()

  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleAsk = async () => {
    if (!question.trim()) return
    setLoading(true)
    setError(null)
    setAnswer('')
    try {
      const { askAI } = await import('../../lib/gemini')
      const res = await askAI(question.trim(), { tasks, events, memos })
      setAnswer(res)
    } catch (e) {
      console.error('[AskPanel] 応答失敗', e)
      const { describeError } = await import('../../lib/gemini')
      setError('応答の取得に失敗。' + describeError(e))
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    // Cmd/Ctrl+Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAsk()
  }

  if (!open) return null

  const dataCount = `タスク${tasks.length}・予定${events.length}・メモ${memos.length}件を参照`

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>🤖 AIに聞く</span>
        <span style={styles.dataCount}>{dataCount}</span>
        <button style={styles.close} onClick={onClose}>
          閉じる
        </button>
      </div>

      <div style={styles.body}>
        {answer && <div style={styles.answer}>{answer}</div>}
        {error && <p style={styles.error}>{error}</p>}
        {loading && <p style={styles.muted}>考え中…</p>}
      </div>

      <div style={styles.composer}>
        <textarea
          style={styles.input}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="例: 今週の優先順位は？ / 遅れているタスクは？ / 明日の予定は？（⌘+Enterで送信）"
          rows={2}
        />
        <button
          style={styles.send}
          onClick={handleAsk}
          disabled={loading || !question.trim()}
        >
          {loading ? '…' : '送信'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    background: '#fff',
    borderTop: '1px solid #e5e9f0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    zIndex: 90,
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.6rem 1rem',
    borderBottom: '1px solid #eef2f6',
  },
  title: { fontWeight: 700, fontSize: '0.95rem' },
  dataCount: { fontSize: '0.75rem', color: '#94a3b8', flex: 1 },
  close: {
    fontSize: '0.8rem',
    padding: '0.3rem 0.7rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#475569',
  },
  body: {
    padding: '0.75rem 1rem',
    overflowY: 'auto',
    flex: 1,
    minHeight: '3rem',
  },
  answer: {
    whiteSpace: 'pre-wrap',
    fontSize: '0.9rem',
    color: '#1f2933',
    lineHeight: 1.7,
  },
  error: { color: '#dc2626', fontSize: '0.85rem' },
  muted: { color: '#94a3b8', fontSize: '0.85rem' },
  composer: {
    display: 'flex',
    gap: '0.5rem',
    padding: '0.6rem 1rem 0.9rem',
    borderTop: '1px solid #eef2f6',
  },
  input: {
    flex: 1,
    padding: '0.5rem 0.7rem',
    fontSize: '0.9rem',
    border: '1px solid #cbd5e1',
    borderRadius: '10px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  send: {
    padding: '0.5rem 1.3rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    fontWeight: 600,
    alignSelf: 'stretch',
  },
}

export default AskPanel
