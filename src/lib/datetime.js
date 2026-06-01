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
