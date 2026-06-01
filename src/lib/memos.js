// メモの Firestore CRUD ヘルパー
// パス: /users/{userId}/memos/{memoId}（CLAUDE.md §3 スキーマ準拠）
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// カテゴリ（仕事 / プライベート / アイデア）
export const MEMO_CATEGORIES = [
  { value: 'work', label: '仕事', color: '#2563eb' },
  { value: 'private', label: 'プライベート', color: '#16a34a' },
  { value: 'idea', label: 'アイデア', color: '#d97706' },
]

export function memoCategoryMeta(value) {
  return MEMO_CATEGORIES.find((c) => c.value === value) ?? MEMO_CATEGORIES[0]
}

function memosCol(uid) {
  return collection(db, 'users', uid, 'memos')
}

// リアルタイム購読。createdAt 降順（新しい順）で取得し、解除関数を返す。
export function subscribeMemos(uid, onData, onError) {
  const q = query(memosCol(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const memos = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData(memos)
    },
    onError,
  )
}

// 新規作成。input: { content, category }
export function createMemo(uid, input) {
  return addDoc(memosCol(uid), {
    content: input.content,
    category: input.category ?? 'work',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function updateMemo(uid, memoId, input) {
  return updateDoc(doc(db, 'users', uid, 'memos', memoId), {
    ...input,
    updatedAt: serverTimestamp(),
  })
}

export function deleteMemo(uid, memoId) {
  return deleteDoc(doc(db, 'users', uid, 'memos', memoId))
}
