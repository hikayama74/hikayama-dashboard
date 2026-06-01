import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

// 未ログイン時に表示する Google ログイン画面
function Login() {
  const { signInWithGoogle } = useAuth()
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSignIn = async () => {
    setError(null)
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (e) {
      // ポップアップを閉じただけのキャンセルはエラー表示しない
      if (e?.code === 'auth/popup-closed-by-user') {
        return
      }
      console.error('[login] サインイン失敗', e)
      setError('ログインに失敗しました。時間をおいて再度お試しください。')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <h1 style={styles.title}>ヒカヤマ ダッシュボード</h1>
        <p style={styles.subtitle}>仕事とプライベートを一元管理</p>
        <button
          style={styles.button}
          onClick={handleSignIn}
          disabled={submitting}
        >
          {submitting ? 'ログイン中…' : 'Google でログイン'}
        </button>
        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  )
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
    textAlign: 'center',
    maxWidth: '360px',
    width: '100%',
  },
  title: { margin: '0 0 0.25rem', fontSize: '1.4rem' },
  subtitle: { margin: '0 0 1.75rem', color: '#647186', fontSize: '0.9rem' },
  button: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '10px',
  },
  error: { color: '#dc2626', fontSize: '0.85rem', marginTop: '1rem' },
}

export default Login
