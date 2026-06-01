// 予定のリアルタイム購読フック
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { subscribeEvents } from '../lib/events'

export function useEvents() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setEvents([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeEvents(
      user.uid,
      (data) => {
        setEvents(data)
        setLoading(false)
      },
      (e) => {
        console.error('[useEvents] 購読エラー', e)
        setError(e)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  return { events, loading, error }
}
