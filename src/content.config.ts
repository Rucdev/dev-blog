import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { normalizeTags } from "./utils/tags";

const posts = defineCollection({
  // Load Markdown and MDX files in the `src/content/posts/` directory.
  loader: glob({ base: "./src/content/posts", pattern: "**/index.{md,mdx}" }),
  // Type-check frontmatter using a schema
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      // Transform string to Date object
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      heroImage: z.optional(image()),
      tags: z.array(z.string()).default([]).transform(normalizeTags),
    }),
});

const canvasGames = defineCollection({
  // 1 ゲーム 1 ディレクトリ。ゲーム本体は同じディレクトリの game.ts(GameCanvas.astro が読み込む)
  loader: glob({
    base: "./src/content/canvas-games",
    pattern: "**/index.{md,mdx}",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      // 一覧のカードと OG 画像に使う。OG では 1200x630 に切り抜くので、その比率で撮っておく
      thumbnail: image(),
    }),
});

export const collections = { posts, canvasGames };
