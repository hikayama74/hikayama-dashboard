// 予定の Firestore CRUD ヘルパー
// パス: /users/{userId}/events/{eventId}（CLAUDE.md §3 スキーマ準拠）
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

// 予定タイプ（仕事 / プライベート / シフト）
export const EVENT_TYPES = [
  { value: 'work', label: '仕事', color: '#2563eb' },
  { value: 'private', label: 'プライベート', color: '#16a34a' },
  { value: 'shift', label: 'シフト', color: '#d97706' },
]

export function eventTypeMeta(value) {
  return EVENT_TYPES.find((t) => t.value === value) ?? EVENT_TYPES[0]
}

function eventsCol(uid) {
  return collection(db, 'users', uid, 'events')
}

// リアルタイム購読。startAt 昇順で取得し、解除関数を返す。
export function subscribeEvents(uid, onData, onError) {
  const q = query(eventsCol(uid), orderBy('startAt', 'asc'))
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      onData(events)
    },
    onError,
  )
}

function toTimestamp(date) {
  return date ? Timestamp.fromDate(date) : null
}

// 新規作成。input: { title, type, startAt(Date), endAt(Date|null), allDay, location, notes, syncToGcal }
export function createEvent(uid, input) {
  return addDoc(eventsCol(uid), {
    title: input.title,
    type: input.type ?? 'work',
    startAt: toTimestamp(input.startAt),
    endAt: toTimestamp(input.endAt),
    allDay: input.allDay ?? false,
    location: input.location ?? '',
    notes: input.notes ?? '',
    syncToGcal: input.syncToGcal ?? false, // フェーズ2用
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// 更新。startAt / endAt が含まれる場合は Timestamp 変換。
export function updateEvent(uid, eventId, input) {
  const patch = { ...input, updatedAt: serverTimestamp() }
  if ('startAt' in input) patch.startAt = toTimestamp(input.startAt)
  if ('endAt' in input) patch.endAt = toTimestamp(input.endAt)
  return updateDoc(doc(db, 'users', uid, 'events', eventId), patch)
}

export function deleteEvent(uid, eventId) {
  return deleteDoc(doc(db, 'users', uid, 'events', eventId))
}
