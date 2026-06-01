// メモのリアルタイム購読フック
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { subscribeMemos } from '../lib/memos'

export function useMemos() {
  const { user } = useAuth()
  const [memos, setMemos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) {
      setMemos([])
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = subscribeMemos(
      user.uid,
      (data) => {
        setMemos(data)
        setLoading(false)
      },
      (e) => {
        console.error('[useMemos] 購読エラー', e)
        setError(e)
        setLoading(false)
      },
    )
    return unsubscribe
  }, [user])

  return { memos, loading, error }
}
