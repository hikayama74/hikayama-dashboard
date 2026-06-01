import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages はリポジトリ名のサブパス配信のため base を指定
// https://hikayama74.github.io/hikayama-dashboard/
export default defineConfig({
  plugins: [react()],
  base: '/hikayama-dashboard/',
  resolve: {
    // Anthropic SDK の Node 専用経路が名前付きインポートする node ビルトインを
    // ブラウザ用スタブに差し替える（messages.create では未実行のため安全）。
    // node:stream は完全一致にする（node:stream/promises を前方一致で拾わないため）。
    alias: [
      {
        find: /^node:crypto$/,
        replacement: fileURLToPath(new URL('./src/shims/node-crypto.js', import.meta.url)),
      },
      {
        find: /^node:child_process$/,
        replacement: fileURLToPath(
          new URL('./src/shims/node-child_process.js', import.meta.url),
        ),
      },
      {
        find: /^node:stream$/,
        replacement: fileURLToPath(new URL('./src/shims/node-stream.js', import.meta.url)),
      },
      {
        find: /^node:stream\/promises$/,
        replacement: fileURLToPath(
          new URL('./src/shims/node-stream-promises.js', import.meta.url),
        ),
      },
      {
        find: /^node:util$/,
        replacement: fileURLToPath(new URL('./src/shims/node-util.js', import.meta.url)),
      },
    ],
  },
})
