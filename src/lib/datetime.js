// 日時の表示・入力変換ユーティリティ

// Firestore Timestamp | null → JS Date | null
export function tsToDate(ts) {
  if (!ts) return null
  // Firestore Timestamp は toDate() を持つ。念のため Date もそのまま許容。
  return typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts)
}

// Date | null → <input type="datetime-local"> 用の文字列（ローカルtz, "YYYY-MM-DDTHH:mm"）
export function dateToInputValue(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const h = pad(date.getHours())
  const min = pad(date.getMinutes())
  return `${y}-${m}-${d}T${h}:${min}`
}

// datetime-local の文字列 → Date | null
export function inputValueToDate(value) {
  if (!value) return null
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// Date | null → 表示用文字列（例: "6/3(火) 15:00"）
const WD = ['日', '月', '火', '水', '木', '金', '土']
export function formatDeadline(date) {
  if (!date) return ''
  const m = date.getMonth() + 1
  const d = date.getDate()
  const wd = WD[date.getDay()]
  const pad = (n) => String(n).padStart(2, '0')
  return `${m}/${d}(${wd}) ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 締切が過ぎているか（done 判定は呼び出し側で）
export function isOverdue(date) {
  if (!date) return false
  return date.getTime() < Date.now()
}

// --- 範囲・グルーピング系（予定カレンダー用） ---

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

// 週の開始（月曜始まり）
export function startOfWeek(date) {
  const d = startOfDay(date)
  const day = d.getDay() // 0=日
  const diff = (day + 6) % 7 // 月曜までの戻り日数
  d.setDate(d.getDate() - diff)
  return d
}

export function endOfWeek(date) {
  const s = startOfWeek(date)
  const e = new Date(s)
  e.setDate(s.getDate() + 6)
  return endOfDay(e)
}

// 時刻のみ（例: "15:00"）
export function formatTime(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

// 開始〜終了の時刻表示（例: "15:00–16:00" / 終了なしは "15:00"）
export function formatTimeRange(start, end) {
  if (!start) return ''
  return end ? `${formatTime(start)}–${formatTime(end)}` : formatTime(start)
}

// 日付見出し（例: "6/3(火)"）。今日なら "今日" を前置。
export function formatDateHeader(date) {
  if (!date) return ''
  const m = date.getMonth() + 1
  const d = date.getDate()
  const wd = WD[date.getDay()]
  const today = startOfDay(new Date()).getTime() === startOfDay(date).getTime()
  return `${today ? '今日 ' : ''}${m}/${d}(${wd})`
}

// YYYY-MM-DD のキー（日単位グルーピング用）
export function dateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
