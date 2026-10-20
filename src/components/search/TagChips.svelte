<script lang="ts">
interface Props {
  tags: [string, number][];
  total: number;
  /** 選択中のタグ。null は「すべて」 */
  active: string | null;
}

let { tags, total, active = $bindable() }: Props = $props();
</script>

<div class="chips" role="group" aria-label="タグで絞り込み">
  <button
    type="button"
    aria-pressed={active === null}
    onclick={() => (active = null)}
  >
    すべて {total}
  </button>
  {#each tags as [tag, count] (tag)}
    <button
      type="button"
      aria-pressed={active === tag}
      onclick={() => (active = tag)}
    >
      #{tag} {count}
    </button>
  {/each}
</div>

<style>
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
button {
  padding: 4px 9px;
  background: var(--surface);
  border: 1px solid var(--border-strong);
  border-radius: 3px;
  font: 400 11px var(--font-mono);
  color: var(--muted);
  cursor: pointer;
}
button[aria-pressed="true"] {
  background: var(--header-bg);
  border-color: var(--header-bg);
  color: var(--header-fg);
}
</style>
