// @ts-check

import { fileURLToPath } from "node:url";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import { defineConfig, fontProviders } from "astro/config";
import expressiveCode from "astro-expressive-code";
import * as pagefind from "pagefind";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

/**
 * ビルド後の dist/ から Pagefind の全文検索インデックス(dist/pagefind/)を生成する。
 * 記事本文(data-pagefind-body)だけが索引対象になる。
 * @returns {import("astro").AstroIntegration}
 */
function pagefindIndex() {
  return {
    name: "pagefind-index",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        const { index } = await pagefind.createIndex();
        if (!index)
          throw new Error("Pagefind のインデックス作成に失敗しました");
        const { page_count } = await index.addDirectory({ path: outDir });
        await index.writeFiles({ outputPath: `${outDir}/pagefind` });
        await pagefind.close();
        logger.info(`${page_count} ページを索引しました`);
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  site: "https://blog.rucdev.com",
  markdown: {
    rehypePlugins: [
      // autolink は id のある見出しにしか効かないので、Astro の id 付与を先に走らせる
      rehypeHeadingIds,
      [
        // 見出しの後ろに # のリンクを付ける(押すと URL をコピー。BlogPost.astro)
        rehypeAutolinkHeadings,
        {
          behavior: "append",
          test: ["h2", "h3", "h4"],
          properties: {
            class: "heading-anchor",
            ariaLabel: "この見出しへのリンク",
            dataPagefindIgnore: "",
          },
          content: { type: "text", value: "#" },
        },
      ],
    ],
  },
  integrations: [
    // mdx より前に置く必要がある
    expressiveCode({
      themes: ["github-dark-dimmed"],
      // 既存記事の大文字始まりの言語名を拾う
      shiki: { langAlias: { Dockerfile: "dockerfile" } },
      styleOverrides: {
        borderRadius: "6px",
        borderColor: "var(--border)",
        codeFontFamily: "var(--font-mono)",
        codeFontSize: "12.5px",
        codeLineHeight: "1.85",
        uiFontFamily: "var(--font-mono)",
        frames: {
          frameBoxShadowCssValue: "none",
        },
      },
    }),
    mdx(),
    sitemap(),
    svelte(),
    pagefindIndex(),
  ],
  fonts: [
    {
      provider: fontProviders.google(),
      name: "JetBrains Mono",
      cssVariable: "--font-jetbrains-mono",
      fallbacks: ["ui-monospace", "monospace"],
      weights: [400, 500, 700],
    },
    {
      provider: fontProviders.google(),
      name: "Noto Sans JP",
      cssVariable: "--font-noto-sans-jp",
      fallbacks: ["system-ui", "sans-serif"],
      weights: [400, 500, 700],
    },
  ],
});
