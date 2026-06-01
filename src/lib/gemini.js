// Gemini API 連携（ブラウザ実行）
// 雑入力テキスト → タスク/予定/メモの構造化データ変換、および「AIに聞く」応答。
// 無料枠あり・高速の gemini-2.5-flash を使用（gemini-1.5-flash は提供終了のため後継を採用）。
// ⚠️ APIキーはフロントに置くため公開サイトに露出する（当面の運用方針）。
//    将来は Cloud Functions 経由に移して隠す想定。
import { GoogleGenerativeAI } from '@google/generative-ai'

const MODEL = 'gemini-2.5-flash'

let _genAI = null
function getGenAI() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY が未設定です。.env に設定してください。',
    )
  }
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(apiKey)
  }
  return _genAI
}

// Firestore Timestamp | Date | null → ISO文字列 | null
function toISO(ts) {
  if (!ts) return null
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString()
  if (ts instanceof Date) return ts.toISOString()
  return null
}

// --- 雑入力の解析 -----------------------------------------------------------

const PARSE_SYSTEM = `あなたは山本輝（ヒカヤマ）さんのパーソナルアシスタントです。merone株式会社セールス部アクセラチームのリーダーで、チームの業務管理・シフト管理・OKR推進・ProLine集計ダッシュボードの開発運用を担当しています。

ユーザーが雑に投げたテキストから、タスク・予定・メモを抽出し、次のJSON形式**のみ**で返してください（前後に説明文やマークダウンを付けない）。

{
  "tasks": [
    { "title": string, "status": "todo"|"in_progress"|"done", "deadline": ISO8601文字列 or null, "assignee": string or null, "notes": string or null, "tags": string[] }
  ],
  "events": [
    { "title": string, "type": "work"|"private"|"shift", "startAt": ISO8601文字列, "endAt": ISO8601文字列 or null, "allDay": boolean, "location": string or null, "notes": string or null }
  ],
  "memos": [
    { "content": string, "category": "work"|"private"|"idea" }
  ]
}

判定の指針:
- 「やる/対応する/締切」など作業は tasks。日時が明確な集まり（MTG・面談・シフト・予定）は events。それ以外の覚え書き・アイデアは memos。
- 関係者の例: くみこさん(代表)、清水さん(COO)、岡本さん(チームメンバー)、ラウイさん(セールスMGR)、ちひろさん(神野智尋・営業管理)。これらが担当者として登場することがある。
- 相対的な日付表現（「来週火曜」「明日」「今週中」など）は、ユーザーメッセージ先頭に示す現在日時を基準に絶対日時へ変換する。
- 時刻が不明な予定は終日(allDay=true)として扱う。
- 推測で項目を増やさない。不明なフィールドは null（tags は []）にする。
- 該当する項目がない種別は空配列にする。
- 画像（スクリーンショット等）が添付された場合は、その内容（予定表・カレンダー・チャット・チラシ・メール等）も読み取って抽出する。テキストと画像の両方がある場合は両方を統合する。`

// 一時的な過負荷（503）・レート超過（429）はリトライする。
async function generateWithRetry(model, request, retries = 4) {
  let lastErr
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(request)
    } catch (e) {
      const s = e?.status ?? 0
      const msg = String(e?.message ?? '')
      const transient =
        s === 503 ||
        s === 429 ||
        /\b(503|429)\b|overloaded|high demand|UNAVAILABLE|RESOURCE_EXHAUSTED|quota/i.test(
          msg,
        )
      if (!transient || i === retries - 1) throw e
      lastErr = e
      // 1s, 2s, 4s, 8s のバックオフ
      await new Promise((r) => setTimeout(r, 1000 * 2 ** i))
    }
  }
  throw lastErr
}

// 例外をユーザー向けの分かりやすい文言に整形する。
export function describeError(e) {
  if (e?.message?.includes('VITE_GEMINI_API_KEY')) {
    return 'Gemini APIキーが未設定です（.env / GitHub Secrets を確認してください）。'
  }
  const s = e?.status ?? 0
  const msg = String(e?.message ?? '')
  if (s === 429 || /429|RESOURCE_EXHAUSTED|quota/i.test(msg)) {
    return 'Gemini無料枠のレート上限に達した可能性があります（1分あたり/1日あたりの上限）。1分ほど待って再度お試しください。'
  }
  if (s === 503 || /503|overloaded|high demand|UNAVAILABLE/i.test(msg)) {
    return 'Gemini側が一時的に混雑しています。少し待って再試行してください。'
  }
  if (s === 400) {
    return `リクエストが拒否されました（400）。${msg.slice(0, 160)}`
  }
  // それ以外は素のメッセージ末尾を見せて原因究明できるようにする
  return `失敗しました${s ? `（HTTP ${s}）` : ''}: ${msg.slice(0, 180) || '不明なエラー'}`
}

// JSON テキストからオブジェクトを取り出す（まれに ```json フェンスが付く場合に対応）
function extractJson(text) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return JSON.parse(fenced ? fenced[1] : trimmed)
}

// 入力テキスト（と任意の画像）を解析して { tasks, events, memos } を返す。
// images: [{ mimeType: 'image/png', data: '<base64(プレフィックスなし)>' }, ...]
export async function parseQuickInput(text, images = [], nowISO) {
  const now = nowISO ?? new Date().toISOString()
  const model = getGenAI().getGenerativeModel({
    model: MODEL,
    systemInstruction: PARSE_SYSTEM,
    // thinkingBudget:0 で思考をオフ（高速化・無料枠節約）
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const promptText = `現在日時: ${now}\n\n入力:\n${text || '(テキストなし。画像から抽出してください)'}`
  // テキスト＋画像の content parts を組み立てる（Vision）
  const parts = [
    { text: promptText },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
  ]

  const result = await generateWithRetry(model, parts)
  const parsed = extractJson(result.response.text())
  const { tasks = [], events = [], memos = [] } = parsed
  return { tasks, events, memos }
}

// 直前の抽出結果を、ユーザーの修正指示（「ここは違う」等）に従って再解析する。
// current: { tasks, events, memos }（_checked等の余分なキーは含めない）, feedback: 修正指示の文章
export async function refineQuickInput(
  text,
  images = [],
  current,
  feedback,
  nowISO,
) {
  const now = nowISO ?? new Date().toISOString()
  const model = getGenAI().getGenerativeModel({
    model: MODEL,
    systemInstruction: PARSE_SYSTEM,
    generationConfig: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingBudget: 0 },
    },
  })

  const promptText = `現在日時: ${now}

これは再解析（修正）です。下記「現在の抽出結果」を、ユーザーの修正指示に従って直し、同じJSON形式で**全件**返してください。修正指示に関係ない項目はそのまま残してください。元の入力・画像も参考にしてください。

元の入力テキスト:
${text || '(テキストなし)'}

現在の抽出結果(JSON):
${JSON.stringify(current)}

修正指示:
${feedback}`

  const parts = [
    { text: promptText },
    ...images.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.data },
    })),
  ]

  const result = await generateWithRetry(model, parts)
  const parsed = extractJson(result.response.text())
  const { tasks = [], events = [], memos = [] } = parsed
  return { tasks, events, memos }
}

// --- 「AIに聞く」 -----------------------------------------------------------

const ASK_SYSTEM = `あなたはヒカヤマさん（merone社セールス部アクセラチームリーダー）のパーソナルアシスタントです。
渡されるタスク・予定・メモの全データ（完了済みや過去分も含む）を参照し、日本語で簡潔に質問へ答えてください。
締切や日時に言及するときは具体的な日付を示し、根拠となる項目があれば添えてください。`

// 全データをプロンプト用に整形（完了済みタスク・過去の予定も含める）
function buildContext(tasks, events, memos) {
  const t = tasks.map((x) => ({
    title: x.title,
    status: x.status,
    deadline: toISO(x.deadline),
    assignee: x.assignee || null,
    tags: x.tags || [],
    notes: x.notes || null,
  }))
  const e = events.map((x) => ({
    title: x.title,
    type: x.type,
    startAt: toISO(x.startAt),
    endAt: toISO(x.endAt),
    allDay: !!x.allDay,
    location: x.location || null,
    notes: x.notes || null,
  }))
  const m = memos.map((x) => ({
    content: x.content,
    category: x.category,
    createdAt: toISO(x.createdAt),
  }))
  return { tasks: t, events: e, memos: m }
}

// 質問に対し、全データを文脈に与えて回答テキストを返す。
export async function askAI(question, { tasks, events, memos }, nowISO) {
  const now = nowISO ?? new Date().toISOString()
  const model = getGenAI().getGenerativeModel({
    model: MODEL,
    systemInstruction: ASK_SYSTEM,
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
  })

  const ctx = buildContext(tasks, events, memos)
  const prompt = `現在日時: ${now}

【タスク一覧（完了済み含む）】
${JSON.stringify(ctx.tasks, null, 2)}

【予定（過去・未来すべて）】
${JSON.stringify(ctx.events, null, 2)}

【メモ】
${JSON.stringify(ctx.memos, null, 2)}

質問: ${question}`

  const result = await generateWithRetry(model, prompt)
  return result.response.text()
}
