// 新しい記事の雛形を src/content/blog/<slug>/index.md に作成する
// 使い方: bun run new <slug>
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const BLOG_DIR = join(import.meta.dir, "..", "src", "content", "blog");

const slug = process.argv[2];

if (!slug) {
  console.error("使い方: bun run new <slug>");
  process.exit(1);
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
  console.error(`slug は英小文字・数字・ハイフンのみ使えます: ${slug}`);
  process.exit(1);
}

const postDir = join(BLOG_DIR, slug);

if (existsSync(postDir)) {
  console.error(`すでに存在します: ${postDir}`);
  process.exit(1);
}

// ローカルタイムゾーンのオフセット付き ISO 文字列 (例: 2026-10-11T09:30:00+09:00)
function toLocalISOString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  );
}

const template = `---
title: ""
description: ""
pubDate: ${toLocalISOString(new Date())}
tags: []
---

##
`;

await mkdir(postDir, { recursive: true });
await writeFile(join(postDir, "index.md"), template);

console.log(`作成しました: src/content/blog/${slug}/index.md`);
