import { useAuth } from '../lib/AuthContext'

// アプリ共通ヘッダー。雑入力 / AIに聞く ボタン＋ユーザー情報。
function Header({ onQuickInput, onAsk }) {
  const { user, signOut } = useAuth()

  return (
    <header style={styles.header}>
      <span style={styles.appName}>ヒカヤマ ダッシュボード</span>
      <div style={styles.right}>
        {user && (
          <>
            <button style={styles.quickInput} onClick={onQuickInput}>
              ✏️ 雑に入力
            </button>
            <button style={styles.ask} onClick={onAsk}>
              🤖 AIに聞く
            </button>
            {user.photoURL && (
              <img src={user.photoURL} alt="" style={styles.avatar} />
            )}
            <span style={styles.userName}>
              {user.displayName ?? user.email}
            </span>
            <button style={styles.signOut} onClick={() => signOut()}>
              ログアウト
            </button>
          </>
        )}
      </div>
    </header>
  )
}

const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.75rem 1.25rem',
    background: '#fff',
    borderBottom: '1px solid #e5e9f0',
  },
  appName: { fontWeight: 700, fontSize: '1.05rem' },
  right: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  quickInput: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#fff',
    background: '#2563eb',
    border: 'none',
    borderRadius: '8px',
  },
  ask: {
    padding: '0.4rem 0.9rem',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#2563eb',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
  },
  avatar: { width: 28, height: 28, borderRadius: '50%' },
  userName: { fontSize: '0.9rem', color: '#1f2933' },
  signOut: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.85rem',
    color: '#475569',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
}

export default Header
