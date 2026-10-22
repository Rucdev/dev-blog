import type { CollectionEntry } from "astro:content";

type Post = CollectionEntry<"posts">;

/**
 * 表記ゆれしやすいタグの正式名。キーは小文字で書く。
 * ここにないタグも大文字小文字違いは同じタグとして扱う(tagSlug で比較)。
 */
const TAG_ALIASES: Record<string, string> = {
  kubernetes: "Kubernetes",
  k8s: "Kubernetes",
  rstudio: "RStudio",
};

/** frontmatter のタグを正式名にそろえ、重複を除く */
export function normalizeTags(tags: string[]): string[] {
  const normalized = tags.map((tag) => {
    const trimmed = tag.trim();
    return TAG_ALIASES[trimmed.toLowerCase()] ?? trimmed;
  });
  return [...new Map(normalized.map((tag) => [tagSlug(tag), tag])).values()];
}

/** タグ名を URL 用のスラッグにする("NEC IX" → "nec-ix") */
export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function tagHref(tag: string): string {
  return `/tags/${tagSlug(tag)}/`;
}

export function hasTag(post: Post, tag: string): boolean {
  const slug = tagSlug(tag);
  return post.data.tags.some((t) => tagSlug(t) === slug);
}

/**
 * タグごとの記事数を、多い順(同数なら名前順)に返す。
 * 大文字小文字違いは 1 つにまとめ、最初に出てきた表記を使う。
 */
export function countTags(posts: Post[]): [string, number][] {
  const counts = new Map<string, [string, number]>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      const entry = counts.get(tagSlug(tag));
      if (entry) entry[1] += 1;
      else counts.set(tagSlug(tag), [tag, 1]);
    }
  }
  return [...counts.values()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
}

/** 共通するタグが多い順(同数なら新しい順)に関連記事を返す */
export function relatedPosts(post: Post, posts: Post[], limit = 3): Post[] {
  return posts
    .filter((other) => other.id !== post.id)
    .map((other) => ({
      other,
      shared: post.data.tags.filter((tag) => hasTag(other, tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.other.data.pubDate.valueOf() - a.other.data.pubDate.valueOf(),
    )
    .slice(0, limit)
    .map(({ other }) => other);
}
