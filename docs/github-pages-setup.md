# GitHub Pages 自動デプロイ手順書（ヒカヤマさん作業用）

`.github/workflows/deploy.yml` を用意済みです。
`main` ブランチに push すると **自動でビルド → GitHub Pages へデプロイ** されます。
このドキュメントに沿って、GitHub 側の初期設定を行ってください。

公開 URL（設定後）：**https://hikayama74.github.io/hikayama-dashboard/**

---

## 1. GitHub Pages を「GitHub Actions」モードにする

1. リポジトリ https://github.com/hikayama74/hikayama-dashboard を開く
2. **Settings > Pages**
3. 「Build and deployment」の **Source** を **「GitHub Actions」** に変更
   （「Deploy from a branch」ではない点に注意）

> これでワークフローがデプロイ先として認識されます。

---

## 2. Firebase 設定値を GitHub Secrets に登録

ビルド時に Firebase 設定が必要なため、`.env` の6つの値を Secrets に登録します。
（Secrets は暗号化され、ログにも出ません＝安全）

1. **Settings > Secrets and variables > Actions**
2. 「New repository secret」から、以下の **6つ** を1つずつ登録：

| Secret 名 | 値（`.env` と同じ） |
|-----------|---------------------|
| `VITE_FIREBASE_API_KEY` | `.env` の API キー |
| `VITE_FIREBASE_AUTH_DOMAIN` | `xxx.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `hikayama-dashboard` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `xxx.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | 数字の ID |
| `VITE_FIREBASE_APP_ID` | `1:...:web:...` |
| `VITE_ANTHROPIC_API_KEY` | Anthropic APIキー（雑入力で使用） |

> 名前は **完全一致**させること（ワークフローがこの名前で参照します）。
> ⚠️ `VITE_ANTHROPIC_API_KEY` はビルド成果物（公開サイト）に埋め込まれ第三者に露出します（当面の運用方針）。
> 値の前後に余分なスペースや引用符を入れないこと。

### CLI でまとめて登録する場合（任意）

`gh` CLI が使えるなら、`.env` 記入後に以下でも登録できます：

```bash
gh secret set VITE_FIREBASE_API_KEY --body "値"
gh secret set VITE_FIREBASE_AUTH_DOMAIN --body "値"
# ... 残り4つも同様
```

---

## 3. デプロイの実行

Secrets 登録後、`main` に push すれば自動デプロイされます。
手動で動かす場合は **Actions タブ > 「Deploy to GitHub Pages」 > Run workflow**。

進捗は **Actions タブ** で確認できます（緑のチェックで成功）。

---

## 完了チェックリスト

- [ ] Settings > Pages の Source を「GitHub Actions」にした
- [ ] Firebase の6つの値を Secrets に登録した
- [ ] push（または手動実行）でデプロイが成功した
- [ ] https://hikayama74.github.io/hikayama-dashboard/ が表示された
- [ ] （Firebase 手順書）承認済みドメインに `hikayama74.github.io` を追加済み

> ⚠️ 本番でログインするには、Firebase 側の「承認済みドメイン」に
> `hikayama74.github.io` が入っている必要があります（docs/firebase-setup.md 手順4）。
