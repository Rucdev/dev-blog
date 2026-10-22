import type { HighlightChunk } from "./search";

// Pagefind が生成する dist/pagefind/pagefind.js のうち使う部分だけの型
interface PagefindResult {
  data(): Promise<{ url: string; excerpt: string }>;
}
interface Pagefind {
  options(options: { excerptLength?: number }): Promise<void>;
  init(): Promise<void>;
  debouncedSearch(
    query: string,
    options?: object,
    debounceMs?: number,
  ): Promise<{ results: PagefindResult[] } | null>;
}

/** 本文検索で拾う最大件数 */
const MAX_HITS = 20;

let loading: Promise<Pagefind | null> | undefined;

/**
 * Pagefind を読み込む。インデックスはビルド時にしか作られないので、
 * astro dev など読み込めない環境では null を返し、本文検索なしで動かす。
 */
export function loadPagefind(): Promise<Pagefind | null> {
  // 変数経由にして Vite にバンドル対象として解決させない
  const url = "/pagefind/pagefind.js";
  loading ??= import(/* @vite-ignore */ url)
    .then(async (pagefind: Pagefind) => {
      await pagefind.options({ excerptLength: 24 });
      await pagefind.init();
      return pagefind;
    })
    .catch(() => null);
  return loading;
}

/**
 * 記事本文を全文検索し、slug → 本文の抜粋 を関連度順の Map で返す。
 * 後続の検索に追い越された場合は null を返す。
 */
export async function searchBody(
  query: string,
): Promise<Map<string, HighlightChunk[]> | null> {
  const pagefind = await loadPagefind();
  if (!pagefind) return new Map();

  const search = await pagefind.debouncedSearch(query, {}, 150);
  if (!search) return null;

  const data = await Promise.all(
    search.results.slice(0, MAX_HITS).map((result) => result.data()),
  );
  const hits = new Map<string, HighlightChunk[]>();
  for (const { url, excerpt } of data) {
    const { pathname } = new URL(url, location.origin);
    const slug = pathname.match(/^\/posts\/(.+?)\/?$/)?.[1];
    if (slug) hits.set(decodeURIComponent(slug), parseExcerpt(excerpt));
  }
  return hits;
}

/** Pagefind の <mark> 付き抜粋 HTML を、{@html} を使わずに描画できる形に分解する */
function parseExcerpt(html: string): HighlightChunk[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return [...doc.body.childNodes].map((node) => ({
    text: node.textContent ?? "",
    mark: node.nodeName === "MARK",
  }));
}
