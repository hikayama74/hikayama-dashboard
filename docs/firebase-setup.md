# Firebase セットアップ手順書（ヒカヤマさん作業用）

コード側（`src/lib/firebase.js` など）は実装済みです。
このドキュメントに沿って **Firebase コンソール側の作業** と **`.env` への記入** を行ってください。
所要時間 10〜15 分ほどです。

---

## 1. Firebase プロジェクトを新規作成

1. https://console.firebase.google.com/ を開く（`h.yamamoto@merone.co.jp` でログイン）
2. 「プロジェクトを追加」をクリック
3. プロジェクト名：`hikayama-dashboard`
4. Google アナリティクス：**オフでOK**（個人利用のため）
5. 「プロジェクトを作成」

> ⚠️ proline-dashboard とは**別プロジェクト**にすること（CLAUDE.md の方針）。

---

## 2. Web アプリを登録して設定値を取得

1. プロジェクトのトップ画面で **`</>`（ウェブ）アイコン** をクリック
2. アプリのニックネーム：`hikayama-dashboard-web`
3. 「Firebase Hosting も設定」は**チェック不要**（GitHub Pages を使うため）
4. 「アプリを登録」
5. 表示される `firebaseConfig` の値をメモする（次の手順で `.env` に転記）

```js
const firebaseConfig = {
  apiKey: "AIza...",              // → VITE_FIREBASE_API_KEY
  authDomain: "xxx.firebaseapp.com",   // → VITE_FIREBASE_AUTH_DOMAIN
  projectId: "hikayama-dashboard",     // → VITE_FIREBASE_PROJECT_ID
  storageBucket: "xxx.appspot.com",    // → VITE_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "1234567890",     // → VITE_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:1234:web:abcd",            // → VITE_FIREBASE_APP_ID
};
```

---

## 3. `.env` ファイルを作成（ローカル）

プロジェクト直下の `.env.example` をコピーして `.env` を作り、上の値を記入します。
ターミナルで：

```bash
cp .env.example .env
```

その後 `.env` を編集して各値を貼り付けてください。
（`.env` は `.gitignore` 済みなので Git には commit されません＝安全）

---

## 4. Authentication（Google ログイン）を有効化

1. 左メニュー **「構築 > Authentication」** → 「始める」
2. 「Sign-in method」タブ
3. プロバイダ一覧から **「Google」** を選択 → 「有効にする」
4. プロジェクトのサポートメール：`h.yamamoto@merone.co.jp` を選択
5. 「保存」

### 承認済みドメインの追加（重要）

「Authentication > Settings > 承認済みドメイン」に以下を追加：

- `localhost`（ローカル開発用。最初から入っているはず）
- `hikayama74.github.io`（GitHub Pages 本番用）

> これがないと本番でログインポップアップがブロックされます。

---

## 5. Firestore Database を作成

1. 左メニュー **「構築 > Firestore Database」** → 「データベースを作成」
2. ロケーション：**`asia-northeast1`（東京）**（CLAUDE.md 準拠）
3. モード：**「本番環境モード」** で開始（ルールは後でコードから反映）
4. 「作成」

### セキュリティルールの反映

リポジトリに `firestore.rules`（本人のみ読み書き可）を用意済みです。
反映方法は2通り：

**(A) コンソールに手動貼り付け（簡単）**
「Firestore > ルール」タブを開き、`firestore.rules` の中身をコピペして「公開」。

**(B) Firebase CLI（推奨・後で楽）**
```bash
npm install -g firebase-tools
firebase login
firebase use hikayama-dashboard
firebase deploy --only firestore:rules
```

---

## 6. 動作確認

`.env` を記入したらローカルで起動：

```bash
npm run dev
```

ブラウザで表示し、ステップ4のログイン画面実装後に Google ログインが動けば成功です。

---

## 完了チェックリスト

- [ ] Firebase プロジェクト `hikayama-dashboard` を作成した
- [ ] Web アプリを登録し `firebaseConfig` を取得した
- [ ] `.env` に6つの値を記入した
- [ ] Authentication で Google ログインを有効化した
- [ ] 承認済みドメインに `hikayama74.github.io` を追加した
- [ ] Firestore を `asia-northeast1` で作成した
- [ ] セキュリティルールを反映した
