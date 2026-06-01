// タスクのリアルタイム購読フック
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { subscribeTasks } from '../lib/tasks'

export function useTasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setTasks([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeTasks(
      user.uid,
      (data) => {
        setTasks(data)
        setLoading(false)
      },
      (e) => {
        console.error('[useTasks] 購読エラー', e)
        setError(e)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  return { tasks, loading, error }
}
