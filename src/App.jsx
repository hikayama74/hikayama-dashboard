import { AuthProvider } from './lib/AuthContext'
import RequireAuth from './components/RequireAuth'
import Header from './components/Header'

// 認証後のメイン画面。3ペイン構成は後続ステップで実装する。
function Dashboard() {
  return (
    <div>
      <Header />
      <main style={{ padding: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>ダッシュボード</h2>
        <p style={{ color: '#647186' }}>
          タスク・予定・メモの管理機能はこれから実装します（フェーズ1）。
        </p>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <Dashboard />
      </RequireAuth>
    </AuthProvider>
  )
}

export default App
