import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages はリポジトリ名のサブパス配信のため base を指定
// https://hikayama74.github.io/hikayama-dashboard/
export default defineConfig({
  plugins: [react()],
  base: '/hikayama-dashboard/',
})
