<script lang="ts">
import {
  type HighlightChunk,
  postHref,
  type SearchPost,
  splitHighlight,
} from "./search";

interface Props {
  id: string;
  post: SearchPost;
  query: string;
  /** 本文検索でヒットしたときの抜粋 */
  bodyExcerpt?: HighlightChunk[];
  selected: boolean;
  onhover: () => void;
}

let { id, post, query, bodyExcerpt, selected, onhover }: Props = $props();

// selected になったら一覧のスクロール位置を追従させる
function scrollWhenSelected(node: HTMLElement) {
  if (selected) node.scrollIntoView({ block: "nearest" });
}
</script>

{#snippet chunks(
  list: HighlightChunk[],
)}
  {#each list as chunk}
    {#if chunk.mark}
      <mark>{chunk.text}</mark>
    {:else}
      {chunk.text}
    {/if}
  {/each}
{/snippet}

{#snippet highlighted(
  text: string,
)}
  {@render chunks(splitHighlight(text, query))}
{/snippet}

<a
  {id}
  class="result"
  class:selected
  href={postHref(post)}
  role="option"
  aria-selected={selected}
  onmousemove={onhover}
  {@attach scrollWhenSelected}
>
  <div class="result-meta">
    <span>{post.dateDisplay}</span>
    {#if post.tags[0]}
      <span>#{post.tags[0]}</span>
    {/if}
    <span>{post.readingTime} min</span>
  </div>
  <p class="result-title">{@render highlighted(post.title)}</p>
  <p class="result-excerpt">{@render highlighted(post.excerpt)}</p>
  {#if bodyExcerpt}
    <p class="result-body">…{@render chunks(bodyExcerpt)}…</p>
  {/if}
</a>

<style>
.result {
  display: block;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft);
  border-radius: 5px;
  text-decoration: none;
}
.result.selected {
  background: var(--surface);
  box-shadow: inset 2px 0 0 var(--accent);
}
.result-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
  font: 400 11px var(--font-mono);
  color: var(--faint);
}
.result-title {
  margin: 0 0 6px;
  font: 500 14.5px / 1.6 var(--font-sans);
  color: var(--ink);
}
.result-excerpt {
  margin: 0;
  font: 400 12px / 1.8 var(--font-sans);
  color: var(--muted);
}
.result-body {
  margin: 6px 0 0;
  padding-left: 10px;
  border-left: 2px solid var(--border-strong);
  font: 400 11.5px / 1.8 var(--font-sans);
  color: var(--faint);
}
mark {
  background: var(--mark-bg);
  color: var(--ink);
  padding: 0 2px;
  border-radius: 2px;
}
</style>
