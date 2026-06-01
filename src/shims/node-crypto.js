// ブラウザ向け node:crypto スタブ。
// Anthropic SDK の Node 専用ツールセットが randomUUID を名前付きインポートするためのもの。
// 実際に呼ばれるのは Node 環境のツール実行経路のみで、ブラウザの messages.create では未使用。
export function randomUUID() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // フォールバック（呼ばれない想定）
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export default { randomUUID }
