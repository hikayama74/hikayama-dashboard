import { AuthProvider } from './lib/AuthContext'
import RequireAuth from './components/RequireAuth'
import Header from './components/Header'
import TaskPanel from './components/tasks/TaskPanel'
import EventPanel from './components/events/EventPanel'

// 認証後のメイン画面。CLAUDE.md §4 の3ペイン構成を見据えたグリッド。
// 現状はタスクペインのみ。予定・メモは後続ステップで追加。
function Dashboard() {
  return (
    <div>
      <Header />
      <main style={styles.main}>
        <div style={styles.grid}>
          <div style={styles.pane}>
            <TaskPanel />
          </div>
          <div style={styles.pane}>
            <EventPanel />
          </div>
          <div style={styles.pane}>
            <p style={styles.placeholder}>メモ・状況報告 — 実装予定</p>
          </div>
        </div>
      </main>
    </div>
  )
}

const styles = {
  main: { padding: '1.25rem', maxWidth: '1400px', margin: '0 auto' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    alignItems: 'start',
  },
  pane: {
    background: '#f8fafc',
    border: '1px solid #e5e9f0',
    borderRadius: '12px',
    padding: '1rem',
  },
  placeholder: { color: '#94a3b8', fontSize: '0.9rem', margin: 0 },
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
