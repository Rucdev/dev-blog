# ブログサイト設計ドキュメント

Astro + Svelte で作るブログサイト。マークダウンを描画する形式で、Cloudflare 上にホスティングする。
自作のブラウザゲーム(Godot 4 製)もプレイできるようにする。
Astro / Svelte を自分で書く練習を兼ねるため、段階的に進める。

## 全体アーキテクチャ

```
[閲覧者]
   │
   ▼
Cloudflare Workers (Astroをデプロイ)
   ├─ ブログ: Markdown → Astroがページ描画
   ├─ Svelteアイランド: 検索・目次・テーマ切替など動きのある部分だけ
   └─ ゲームページ: ゲーム紹介 + games.rucdev.com へのリンク
              │
              ▼
        Cloudflare R2 (Godot HTML5エクスポート一式、画像などのアセット)
```

- **Astro**: ページの骨格・ルーティング・Markdown 描画。基本は静的生成(SSG)。
- **Svelte**: 「本当にインタラクティブな部分」だけアイランドとして載せる。
  Islands Architecture の線引き自体を練習題材にする。
- **Cloudflare**: Workers(静的アセット対応)にデプロイ。`@astrojs/cloudflare` アダプタを使用。

## ドメイン設計(rucdev.com)

| ホスト | 役割 | 配信元 |
|---|---|---|
| `blog.rucdev.com` | ブログ本体(Astro) | Workers |
| `games.rucdev.com` | Godot エクスポート配信 | R2 + 前段 Worker(ヘッダ付与) |

ゲームをサブドメインに分離する理由: Godot 4 の Web エクスポートに必要な
COOP/COEP ヘッダを `games.rucdev.com` だけに閉じ込めるため。
ブログ側は外部埋め込み(YouTube、OGP 画像など)が自由なまま保てる。

## Markdown の置き場所(段階的に移行)

Astro の Content Collections はビルド時にリポジトリ内のファイルを読む設計で、
ここが Astro 学習の中心になるため、最初から外部ストレージにはしない。

| フェーズ | 置き場所 | 仕組み |
|---|---|---|
| 1 | リポジトリ内 `src/content/blog/` | Content Collections + SSG。git push で再デプロイ=公開 |
| 2 | R2 | Content Layer API のカスタムローダーでビルド時に R2 から取得 |
| 3(任意) | R2 + SSR | 記事ページだけオンデマンド描画。再ビルド不要で即時公開 |

- フェーズ 1 で frontmatter のスキーマ定義(zod)、タグ・一覧・RSS まで作り切る。
- フェーズ 2 は「記事の管理をリポジトリから分離したい」動機が実際に生まれてから。
  カスタムローダーで取得元だけ差し替え、ページ側のコードはそのまま使えるようにする。
- D1 を使う場合は記事本文ではなく、閲覧数やコメントなどのメタデータ用途。

## Godot ゲーム配信(games.rucdev.com)

### 前提: COOP/COEP ヘッダが必須

Godot 4 の Web エクスポートは SharedArrayBuffer を要求するため、
配信側で以下のヘッダが必要:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### 構成

```
games.rucdev.com (Worker)
  ├─ R2バケットから静的ファイルを返す(env.BUCKET.get(key))
  └─ 全レスポンスに COOP/COEP ヘッダを付与
```

- R2 のカスタムドメイン機能だけでは任意ヘッダを付けられないため、
  数十行の小さな Worker を前段に置く(Workers の練習も兼ねる)。
- パス設計は `games.rucdev.com/<ゲームID>/index.html` の 1 ゲーム= 1 プレフィックス。
- アップロードは `wrangler r2 object put` を叩くデプロイスクリプトを用意。
  ゲーム追加が「エクスポート → スクリプト実行 → ブログの一覧に 1 行追加」で完結する。
- Content-Type に注意: `.wasm` → `application/wasm`、`.pck` → `application/octet-stream`。
  化けるとロードが黙って失敗する。

### ブログ側からの見せ方

COEP は iframe の親ページ側にも制約が波及するため、最初は埋め込まない:

1. `blog.rucdev.com/games/<id>` にゲーム紹介ページ(スクショ、説明、操作方法)
2. 「プレイする」ボタンで `games.rucdev.com/<id>/` へ遷移(全画面でプレイ)

iframe 埋め込み(`credentialless` 属性など)はブラウザ対応が揃いきっていないため、
動くものができた後の発展課題とする。

## リポジトリ構成の目安

```
blog_kit/
├── src/
│   ├── content/
│   │   └── blog/           # フェーズ1のMarkdown置き場
│   ├── content.config.ts   # コレクションのスキーマ定義(zod)
│   ├── layouts/            # BaseLayout, BlogPostLayout
│   ├── components/
│   │   ├── astro/          # 静的なもの(Header, Cardなど)
│   │   └── svelte/         # インタラクティブなもの
│   ├── pages/
│   │   ├── index.astro
│   │   ├── blog/[...slug].astro
│   │   ├── games/index.astro      # ゲーム一覧
│   │   └── games/[id].astro       # 各ゲームの紹介・起動ページ
│   └── data/games.ts       # ゲームのメタ情報(R2上のURL等)
├── astro.config.mjs
└── wrangler.jsonc
```

## 進め方(学習ロードマップ)

各フェーズの終わりに「デプロイされて動いている」状態になるよう区切る。
途中で止まっても常に完動品が残る。

1. **Astro 素振り**: `npm create astro@latest` → レイアウト・ページ・Content Collections で
   ブログ一覧と記事ページ。まだ Svelte も Cloudflare も入れない。
2. **スタイルと記事機能**: タグ、日付ソート、draft 対応、コードハイライト(Shiki 内蔵)、
   RSS、OGP。
3. **Svelte アイランド導入**: `@astrojs/svelte` を追加し、テーマ切替 → 記事検索
   (ビルド時に JSON インデックス生成 + クライアント検索)。
   `client:load` / `client:visible` の違いを体感するのが目的。
4. **Cloudflare デプロイ**: `@astrojs/cloudflare` + wrangler で Workers へ。
   `blog.rucdev.com` をカスタムドメインとして紐付け。
   GitHub 連携で自動デプロイまで。
5. **Godot 配信**: R2 バケット作成 → ヘッダ付与 Worker を書いて `games.rucdev.com` に紐付け →
   Godot エクスポートを 1 本アップロードして動作確認 → ブログに紹介ページ追加。
6. **(必要になったら)R2 移行**: Content Layer カスタムローダーで記事取得を R2 に差し替え。

## 決定事項

- ドメインは `rucdev.com` を使用。ブログは `blog.rucdev.com`、ゲームは `games.rucdev.com` にサブドメインで分離(2026-10-13 にブログを apex からサブドメインへ変更)。
- Godot は最新(4 系)を使用 → COOP/COEP ヘッダ対応は必須ルート。
- 実装は自分で書く(学習目的)。Claude はレビュー・設計の深掘りで支援。
