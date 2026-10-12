# デプロイ手順(Cloudflare Workers)

`blog.rucdev.com` を Cloudflare Workers に静的アセットとして配信する。
GitHub Actions(`.github/workflows/deploy.yml`)で `main` への push ごとに自動ビルド・デプロイする。

## 構成

デプロイには Cloudflare CLI(`cf`、beta)を使う。`cf` は `wrangler.jsonc` を読まないため、設定は `cloudflare.config.ts` に置く。

| ファイル | 役割 |
|---|---|
| `astro.config.mjs` | `@astrojs/cloudflare` アダプタ。`imageService: 'compile'` でビルド時に画像を webp 化 |
| `cloudflare.config.ts` | Worker 名(`rucdev-blog`)・互換日付・バインディング・カスタムドメイン |
| `.cloudflare/output/v0/` | `cf build` の成果物(Build Output)。コミット不要 |

全ページ静的生成のため Worker 本体は生成されず、アセット配信のみ。
`SESSION` KV バインディングはアダプタが自動で付けるが未使用(初回デプロイ時に空の KV が作られるだけ)。

### バージョンの制約

`cf` は Cloudflare Vite プラグイン 2.0 beta を前提にしているため、以下をすべて beta で揃えている(2026-10 時点)。
どれかだけ stable に戻すとビルドが通らない。

- `astro` 7.4.0-beta.1
- `@astrojs/cloudflare` 15.0.0-beta.1(v14 だと Build Output が出力されず `cf build` が失敗する)
- `@cloudflare/vite-plugin` 2.0.0-beta.sha-52b0dc0e9(アダプタが固定しているものと同じ版)
- `cf` 1.0.0-beta.14

`cf` は Bun ランタイムでは動かない(Node 22.18 以上が必要)。`bun run` / `bunx` 経由なら
シバンで Node が使われるので問題ない。`bun --bun` は付けないこと。

## ローカル確認

```sh
bun run build          # cf build。.cloudflare/output/v0 に出力
bun run deploy         # cf deploy。ビルドして手元からデプロイ(要 cf auth login)
bunx cf deploy --prebuilt --mode production --dry-run   # アップロードせずに検証
```

`cf` は wrangler のログインを使い回さないので、手元からデプロイするなら最初に `bunx cf auth login` が必要。
ライブログ(`wrangler tail`)は `cf` 未対応なので `bunx wrangler tail rucdev-blog` を使う。

## GitHub Actions の設定(初回のみ)

1. Cloudflare ダッシュボード → My Profile → API Tokens → Create Token
   - テンプレート **Edit Cloudflare Workers** を使う
   - Account Resources / Zone Resources は自分のアカウント・`rucdev.com` に絞る
   - カスタムドメインの紐付けで DNS レコードを作るため、Zone → DNS → Edit も追加する
2. GitHub リポジトリの Settings → Secrets and variables → Actions に登録
   - `CLOUDFLARE_API_TOKEN`: 上で作ったトークン
   - `CLOUDFLARE_ACCOUNT_ID`: ダッシュボードの Workers & Pages 右側に表示される Account ID
3. Cloudflare の Git 連携(Workers Builds)を設定済みなら外す(二重デプロイになるため)
4. 手動で流したいときは Actions タブ → Deploy → Run workflow

## カスタムドメイン

`cloudflare.config.ts` の `worker.domains` に `blog.rucdev.com` を書いてあり、`cf deploy` のたびに
Worker へ紐付けられる(DNS レコードも Cloudflare が自動で作る)。ダッシュボードでの設定は不要。
`rucdev.com` の zone が同じ Cloudflare アカウントにあることが前提。

ドメインを変えるときは `astro.config.mjs` の `site` も合わせる(canonical・sitemap・RSS の URL に使われる)。

## 記事を公開するとき

記事は `src/content/blog/<slug>/index.md` に置く(画像は同じディレクトリ内)。
`main` に push すれば自動でビルド・公開される。

記事は元々 `Rucdev/tech-blog` リポジトリで管理していたが、`git subtree` で履歴ごと取り込んだ。
tech-blog 側はもう更新しない。

## 今後の課題

- 404 ページ: `src/pages/404.astro` を作り、`cloudflare.config.ts` の `worker.assets.notFoundHandling` を `"404-page"` にする
- `games.rucdev.com`(R2 + ヘッダ付与 Worker)は別 Worker として `docs/design.md` のフェーズ 5 で扱う
