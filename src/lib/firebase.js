// Firebase 初期化
// 設定値は .env（VITE_ プレフィックス）から読み込む。
// 値は Firebase コンソール > プロジェクト設定 > マイアプリ から取得する。
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// .env 未設定のまま起動した場合に気づけるよう警告を出す
if (!firebaseConfig.apiKey) {
  console.warn(
    '[firebase] VITE_FIREBASE_* が未設定です。.env を作成してください（.env.example 参照）。',
  )
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

export default app
