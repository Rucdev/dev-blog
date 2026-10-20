<script lang="ts">
import { onMount } from "svelte";
import ResultItem from "./ResultItem.svelte";
import { countTags, filterPosts, postHref, type SearchPost } from "./search";
import TagChips from "./TagChips.svelte";

let { posts }: { posts: SearchPost[] } = $props();

const uid = $props.id();
const listboxId = `${uid}-results`;
const optionId = (index: number) => `${uid}-option-${index}`;

let input: HTMLInputElement;
let query = $state("");
let activeTag = $state<string | null>(null);

const tags = $derived(countTags(posts));
const results = $derived(filterPosts(posts, query, activeTag));

// 結果が変わるたびに先頭へ戻る。キー操作やホバーでの代入は次に結果が変わるまで有効(writable $derived)
let selectedIndex = $derived(results.length > 0 ? 0 : -1);

// URL の ?q= / ?tag= から検索条件を復元する(SSR 時は location が無いのでマウント後に読む)
onMount(() => {
  const params = new URLSearchParams(location.search);
  query = params.get("q") ?? "";
  const tag = params.get("tag");
  activeTag = tag !== null && tags.some(([t]) => t === tag) ? tag : null;
  input.focus();
});

// 検索条件を URL に書き戻す。履歴は増やさない
$effect(() => {
  const params = new URLSearchParams();
  const q = query.trim();
  if (q) params.set("q", q);
  if (activeTag !== null) params.set("tag", activeTag);
  const search = params.size > 0 ? `?${params}` : "";
  history.replaceState(history.state, "", `${location.pathname}${search}`);
});

function move(delta: number) {
  if (results.length === 0) return;
  selectedIndex = (selectedIndex + delta + results.length) % results.length;
}

function onInputKeydown(event: KeyboardEvent) {
  // 日本語入力の変換確定中の Enter / 矢印キーは IME に任せる
  if (event.isComposing) return;

  switch (event.key) {
    case "ArrowDown":
      event.preventDefault();
      move(1);
      break;
    case "ArrowUp":
      event.preventDefault();
      move(-1);
      break;
    case "Enter": {
      const post = results[selectedIndex];
      if (post) {
        event.preventDefault();
        location.assign(postHref(post));
      }
      break;
    }
    case "Escape":
      if (query) query = "";
      else activeTag = null;
      break;
  }
}

// ページのどこにいても / か ⌘K(Ctrl+K)で検索欄に戻る
function onWindowKeydown(event: KeyboardEvent) {
  if (event.target === input) return;
  const isShortcut =
    (event.key === "/" &&
      !(
        event.target instanceof HTMLElement && event.target.isContentEditable
      )) ||
    (event.key === "k" && (event.metaKey || event.ctrlKey));
  if (!isShortcut) return;
  event.preventDefault();
  input.focus();
  input.select();
}
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="search">
  <div class="input-row">
    <span class="prompt">/</span>
    <input
      bind:this={input}
      bind:value={query}
      onkeydown={onInputKeydown}
      type="text"
      placeholder="タイトル・抜粋・タグで検索"
      autocomplete="off"
      role="combobox"
      aria-label="記事を検索"
      aria-expanded="true"
      aria-controls={listboxId}
      aria-autocomplete="list"
      aria-activedescendant={selectedIndex >= 0
        ? optionId(selectedIndex)
        : undefined}
    >
  </div>

  <TagChips {tags} total={posts.length} bind:active={activeTag} />

  <div class="results" id={listboxId} role="listbox" aria-label="検索結果">
    {#each results as post, i (post.slug)}
      <ResultItem
        id={optionId(i)}
        {post}
        {query}
        selected={i === selectedIndex}
        onhover={() => (selectedIndex = i)}
      />
    {/each}
  </div>
  {#if results.length === 0}
    <p class="no-results">一致する記事が見つかりませんでした。</p>
  {/if}

  <p class="hint">
    {results.length}
    件 · <kbd>↑</kbd><kbd>↓</kbd>
    選択 · <kbd>Enter</kbd> 開く · <kbd>Esc</kbd> クリア
  </p>
</div>

<style>
.search {
  max-width: 720px;
  margin: 0 auto;
  padding: 26px 26px 30px;
}
.input-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 5px;
}
.input-row:focus-within {
  border-color: var(--accent);
}
.prompt {
  font: 500 13px var(--font-mono);
  color: var(--accent);
}
input {
  flex: 1;
  border: none;
  background: none;
  font: 400 14px var(--font-mono);
  color: var(--ink);
  outline: none;
}
.results {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.no-results {
  padding: 20px 4px;
  font: 400 13px var(--font-sans);
  color: var(--muted);
}
.hint {
  margin: 16px 2px 0;
  font: 400 10.5px var(--font-mono);
  color: var(--faint);
}
kbd {
  padding: 0 4px;
  margin: 0 1px;
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  font: inherit;
}
</style>
