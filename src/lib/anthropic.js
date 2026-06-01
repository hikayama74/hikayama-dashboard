// Anthropic SDK 連携（ブラウザ実行）
// 雑入力テキスト → タスク/予定/メモの構造化データに変換する。
// ⚠️ APIキーはフロントに置くため公開サイトに露出する（当面の運用方針）。
//    将来は Cloud Functions 経由に移して隠す想定。
// 既定エントリ（@anthropic-ai/sdk）は Node 専用の agent-toolset を巻き込みブラウザビルドで失敗するため、
// クライアントのみを持つ /client サブパスを使う。
import { Anthropic } from '@anthropic-ai/sdk/client'

const MODEL = 'claude-sonnet-4-6'

let _client = null
function getClient() {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      'VITE_ANTHROPIC_API_KEY が未設定です。.env に設定してください。',
    )
  }
  if (!_client) {
    _client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  }
  return _client
}

// 構造化出力用ツール。tool_choice で強制し、input をそのまま構造データとして受け取る。
const REGISTER_TOOL = {
  name: 'register_items',
  description:
    '入力から抽出したタスク・予定・メモを登録する。該当しない種別は空配列にする。',
  input_schema: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: 'やるべき作業・TODO',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'タスク名' },
            status: {
              type: 'string',
              enum: ['todo', 'in_progress', 'done'],
              description: '不明なら todo',
            },
            deadline: {
              type: ['string', 'null'],
              description: '締切。ISO8601（例 2026-06-03T15:00:00）。なければ null',
            },
            assignee: { type: ['string', 'null'], description: '担当者名' },
            notes: { type: ['string', 'null'], description: '補足メモ' },
            tags: { type: 'array', items: { type: 'string' } },
          },
          required: ['title'],
        },
      },
      events: {
        type: 'array',
        description: '日時のある予定・MTG・シフトなど',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string', description: '予定名' },
            type: {
              type: 'string',
              enum: ['work', 'private', 'shift'],
              description: '仕事/プライベート/シフト。不明なら work',
            },
            startAt: {
              type: 'string',
              description: '開始日時。ISO8601（例 2026-06-03T15:00:00）',
            },
            endAt: {
              type: ['string', 'null'],
              description: '終了日時。ISO8601。なければ null',
            },
            allDay: { type: 'boolean', description: '終日予定なら true' },
            location: { type: ['string', 'null'], description: '場所' },
            notes: { type: ['string', 'null'], description: '補足メモ' },
          },
          required: ['title', 'startAt'],
        },
      },
      memos: {
        type: 'array',
        description: 'タスクでも予定でもない覚え書き・アイデア',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'メモ本文' },
            category: {
              type: 'string',
              enum: ['work', 'private', 'idea'],
              description: '仕事/プライベート/アイデア。不明なら work',
            },
          },
          required: ['content'],
        },
      },
    },
    required: ['tasks', 'events', 'memos'],
  },
}

// 安定プレフィックス（システムプロンプト）。ヒカヤマさんの業務文脈を含め解析精度を上げる。
// ※ 現在日時はここに入れない（キャッシュを壊すため）。user 側で渡す。
const SYSTEM_PROMPT = `あなたは山本輝（ヒカヤマ）さんのパーソナルアシスタントです。merone株式会社セールス部アクセラチームのリーダーで、チームの業務管理・シフト管理・OKR推進・ProLine集計ダッシュボードの開発運用を担当しています。

ユーザーが雑に投げたテキストから、タスク・予定・メモを抽出し register_items ツールで登録してください。

判定の指針:
- 「やる/対応する/締切」など作業は tasks。日時が明確な集まり（MTG・面談・シフト・予定）は events。それ以外の覚え書き・アイデアは memos。
- 関係者の例: くみこさん(代表)、清水さん(COO)、岡本さん(チームメンバー)、ラウイさん(セールスMGR)、ちひろさん(神野智尋・営業管理)。これらが担当者として登場することがある。
- 相対的な日付表現（「来週火曜」「明日」「今週中」など）は、ユーザーメッセージ先頭に示す現在日時を基準に絶対日時へ変換する。
- 時刻が不明な予定は終日(allDay=true)として扱う。
- 推測で項目を増やさない。不明なフィールドは null にする。
- 1つの入力に複数の項目が含まれることがある。`

// 入力テキストを解析して { tasks, events, memos } を返す。
// nowISO は省略時に呼び出し側で現在時刻を渡す（テスト容易性のため引数化）。
export async function parseQuickInput(text, nowISO) {
  const now = nowISO ?? new Date().toISOString()
  const client = getClient()

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    // 安定プレフィックスをキャッシュ対象に（プロンプトが十分長くなれば cache が効く）
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    tools: [REGISTER_TOOL],
    tool_choice: { type: 'tool', name: 'register_items' },
    messages: [
      {
        role: 'user',
        // Vision 拡張時はここに { type: 'image', source: {...} } を足せる構造
        content: [
          { type: 'text', text: `現在日時: ${now}\n\n入力:\n${text}` },
        ],
      },
    ],
  })

  const toolUse = response.content.find((b) => b.type === 'tool_use')
  if (!toolUse) {
    throw new Error('解析結果を取得できませんでした。')
  }
  const { tasks = [], events = [], memos = [] } = toolUse.input
  return { tasks, events, memos }
}
