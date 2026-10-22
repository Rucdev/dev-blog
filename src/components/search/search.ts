export interface SearchPost {
  slug: string;
  title: string;
  excerpt: string;
  tags: string[];
  dateDisplay: string;
  readingTime: number;
}

export interface HighlightChunk {
  text: string;
  mark: boolean;
}

/** タグごとの記事数を、多い順に返す */
export function countTags(posts: SearchPost[]): [string, number][] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * タグ(null は全件)で絞り込んだうえで、タイトル・抜粋・タグに query を含む記事を返す。
 * bodyHits(本文検索でヒットした slug。関連度順)にしか含まれない記事は、その後ろに並べる。
 */
export function filterPosts(
  posts: SearchPost[],
  query: string,
  tag: string | null,
  bodyHits: ReadonlyMap<string, unknown> = new Map(),
): SearchPost[] {
  const q = query.trim().toLowerCase();
  const inTag =
    tag === null ? posts : posts.filter((post) => post.tags.includes(tag));
  if (!q) return inTag;

  const metaMatches = inTag.filter(
    (post) =>
      post.title.toLowerCase().includes(q) ||
      post.excerpt.toLowerCase().includes(q) ||
      post.tags.some((t) => t.toLowerCase().includes(q)),
  );
  const matched = new Set(metaMatches.map((post) => post.slug));
  const bySlug = new Map(inTag.map((post) => [post.slug, post]));
  const bodyOnly = [...bodyHits.keys()]
    .filter((slug) => !matched.has(slug))
    .flatMap((slug) => bySlug.get(slug) ?? []);
  return [...metaMatches, ...bodyOnly];
}

/** text 中で最初に query に一致した箇所を mark: true として分割する */
export function splitHighlight(text: string, query: string): HighlightChunk[] {
  const q = query.trim();
  if (!q) return [{ text, mark: false }];
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return [{ text, mark: false }];
  return [
    { text: text.slice(0, idx), mark: false },
    { text: text.slice(idx, idx + q.length), mark: true },
    { text: text.slice(idx + q.length), mark: false },
  ];
}

export function postHref(post: SearchPost): string {
  return `/posts/${post.slug}/`;
}
