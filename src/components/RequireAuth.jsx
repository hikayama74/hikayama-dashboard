import { useAuth } from '../lib/AuthContext'
import Login from './Login'

// ログイン済みの場合のみ children を表示する認証ガード。
// 未ログインなら Login 画面、判定中はローディングを表示。
function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={styles.center}>
        <p>読み込み中…</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return children
}

const styles = {
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#647186',
  },
}

export default RequireAuth
