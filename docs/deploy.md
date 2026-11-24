# デプロイ手順(Cloudflare Workers)

`blog.rucdev.com` を Cloudflare Workers に静的アセットとして配信する。
Cloudflare の Git 連携(Workers Builds)で `main` への push ごとに自動ビルド・デプロイする。

## 構成

Cloudflare 公式ガイド(https://developers.cloudflare.com/workers/framework-guides/web-apps/astro/)の
「静的サイト」の構成に合わせている。アダプタ(`@astrojs/cloudflare`)は使わず、`astro build` の出力 `dist/` を
`cf deploy ./dist` で assets-only の Worker としてアップロードするだけ。
デプロイには Cloudflare の `cf` CLI(devDependency)を使う。wrangler からは `cf migrate` で移行した。

| ファイル | 役割 |
|---|---|
| `cloudflare.config.ts` | Worker 名(`rucdev-blog`)・互換日付・カスタムドメイン・observability |
| `dist/` | `astro build` の成果物。コミット不要 |

画像は Astro 標準の sharp でビルド時に webp 化される。

SSR(`export const prerender = false` のページや API ルート)が必要になったら、ガイドの
「On-Demand Rendering」の手順でアダプタを入れ、`cloudflare.config.ts` に `entrypoint` などを足す。

## ローカル確認

```sh
bun run build                  # astro build。dist/ に出力
bun run preview                # ビルドして astro preview で確認
npx cf deploy ./dist --dry-run # アップロードせずに検証
bun run deploy                 # ビルドして手元からデプロイ(要 npx cf auth login)
```

## Workers Builds の設定(初回のみ)

Cloudflare ダッシュボード → Workers & Pages → `rucdev-blog` → Settings → Builds → Connect で
`Rucdev/dev-blog` を接続する。API トークンは Cloudflare 側が用意するので GitHub に Secrets は不要。

| 項目 | 値 |
|---|---|
| Production branch | `main` |
| Build command | `bun run build` |
| Deploy command | `npx cf deploy ./dist` |
| Build variables | `BUN_VERSION=1.4.2` |

Workers Builds は `cloudflare.config.ts` の `worker.name` と接続先の Worker 名が一致している必要がある。

## カスタムドメイン

`cloudflare.config.ts` の `worker.domains` に `blog.rucdev.com` を書いてあり、デプロイのたびに
Worker へ紐付けられる(DNS レコードも Cloudflare が自動で作る)。ダッシュボードでの設定は不要。
`rucdev.com` の zone が同じ Cloudflare アカウントにあることが前提。

ドメインを変えるときは `astro.config.mjs` の `site` も合わせる(canonical・sitemap・RSS の URL に使われる)。

## 記事を公開するとき

記事は `src/content/posts/<slug>/index.md` に置く(画像は同じディレクトリ内)。
`main` に push すれば自動でビルド・公開される。

記事は元々 `Rucdev/tech-blog` リポジトリで管理していたが、`git subtree` で履歴ごと取り込んだ。
tech-blog 側はもう更新しない。

## 今後の課題

- 404 ページ: `src/pages/404.astro` を作り、`cloudflare.config.ts` の `worker.assets` に `notFoundHandling: "404-page"` を足す
- `games.rucdev.com`(R2 + ヘッダ付与 Worker)は別 Worker として `docs/design.md` のフェーズ 5 で扱う
