// タスクの Firestore CRUD ヘルパー
// パス: /users/{userId}/tasks/{taskId}（CLAUDE.md §3 スキーマ準拠）
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
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// ステータス定義（表示順・ラベル）
export const TASK_STATUSES = [
  { value: 'todo', label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done', label: '完了' },
]

export function statusLabel(value) {
  return TASK_STATUSES.find((s) => s.value === value)?.label ?? value
}

function tasksCol(uid) {
  return collection(db, 'users', uid, 'tasks')
}

// リアルタイム購読。createdAt 降順で取得し、解除関数を返す。
export function subscribeTasks(uid, onData, onError) {
  const q = query(tasksCol(uid), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
      const tasks = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData(tasks)
    },
    onError,
  )
}

// JS Date | null を Firestore Timestamp | null に変換
function toTimestamp(date) {
  return date ? Timestamp.fromDate(date) : null
}

// 新規作成。input: { title, status, deadline(Date|null), assignee, notes, tags[] }
export function createTask(uid, input) {
  return addDoc(tasksCol(uid), {
    title: input.title,
    status: input.status ?? 'todo',
    deadline: toTimestamp(input.deadline),
    assignee: input.assignee ?? '',
    notes: input.notes ?? '',
    tags: input.tags ?? [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// 更新。渡されたフィールドのみ更新（deadline が含まれる場合は Timestamp 変換）
export function updateTask(uid, taskId, input) {
  const patch = { ...input, updatedAt: serverTimestamp() }
  if ('deadline' in input) {
    patch.deadline = toTimestamp(input.deadline)
  }
  return updateDoc(doc(db, 'users', uid, 'tasks', taskId), patch)
}

export function deleteTask(uid, taskId) {
  return deleteDoc(doc(db, 'users', uid, 'tasks', taskId))
}
