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

export function startOfMonth(date) {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}

export function endOfMonth(date) {
  const d = startOfDay(date)
  d.setMonth(d.getMonth() + 1, 1) // 翌月1日
  d.setDate(0) // 当月末日
  return endOfDay(d)
}

// 日付(YYYY-MM-DD) と 時刻(HH:mm) を結合して Date を作る
export function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T${timeStr || '00:00'}`)
  return isNaN(d.getTime()) ? null : d
}

// Date → 日付部分のみ "YYYY-MM-DD"
export function dateToDateInput(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// 時刻ドロップダウン用の選択肢を生成（既定15分刻み）。
// 返り値: [{ value: "09:30", label: "9:30" }, ...]
export function timeOptions(stepMinutes = 15) {
  const opts = []
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const h = Math.floor(m / 60)
    const min = m % 60
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    opts.push({ value, label: `${h}:${String(min).padStart(2, '0')}` })
  }
  return opts
}

// "HH:mm" に分を加算して "HH:mm" を返す（24h を超えたら 23:45 に丸める）
export function addMinutesToTime(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number)
  let total = h * 60 + m + minutes
  if (total >= 24 * 60) total = 23 * 60 + 45
  if (total < 0) total = 0
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
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

// 日時の表示（例: "6/3 15:00"）。メモの作成日時など。
export function formatDateTime(date) {
  if (!date) return ''
  return `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`
}

// ISO風文字列（"2026-06-03T13:00:00" などTZなし）を「壁時計そのまま」のローカル Date に変換する。
// new Date(文字列) はブラウザによってTZなしISOをUTC扱いし±時差ぶんズレるため、
// 文字列から年月日時分を取り出して new Date(y, m-1, d, h, min)（常にローカル）で組み立てる。
// 保存（Firestore Timestamp）時にこれを使うと、表示(formatIsoLocal)と一致した壁時計で保存される。
export function isoLocalToDate(iso) {
  if (!iso) return null
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/)
  if (m) {
    const y = Number(m[1])
    const mo = Number(m[2])
    const da = Number(m[3])
    const hh = m[4] != null ? Number(m[4]) : 0
    const mm = m[5] != null ? Number(m[5]) : 0
    return new Date(y, mo - 1, da, hh, mm, 0, 0)
  }
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

// ISO風文字列（"2026-06-03T13:00:00" などTZなし）から壁時計の値をそのまま取り出して
// "M/D HH:mm" で表示する。Date を経由しないためタイムゾーン変換の影響を受けない。
// （Gemini はローカル壁時計の予定時刻をTZなしISOで返すため、表示もその値をそのまま使う）
export function formatIsoLocal(iso) {
  if (!iso) return ''
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (m) {
    const [, , mo, da, hh, mm] = m
    return `${Number(mo)}/${Number(da)} ${hh}:${mm}`
  }
  // フォールバック（想定外フォーマット時）
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : formatDateTime(d)
}

// 短縮日付（例: "6/10"）
export function formatDateShort(date) {
  if (!date) return ''
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// from〜to（両端含む）の各日の startOfDay 配列を返す。
// 暴走防止に最大日数を上限とする（既定 366 日）。
export function eachDayInRange(from, to, maxDays = 366) {
  const days = []
  let cur = startOfDay(from)
  const last = startOfDay(to)
  let guard = 0
  while (cur.getTime() <= last.getTime() && guard < maxDays) {
    days.push(new Date(cur))
    cur = new Date(cur)
    cur.setDate(cur.getDate() + 1)
    guard++
  }
  return days
}
