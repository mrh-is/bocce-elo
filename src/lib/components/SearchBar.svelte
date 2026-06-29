<script lang="ts">
  let { value = $bindable() }: { value: string } = $props();
</script>

<div class="search-wrap">
  <input
    type="search"
    placeholder="🔍 Search teams…"
    bind:value
    aria-label="Search teams"
  />
</div>

<style>
  .search-wrap {
    flex-shrink: 0;
    margin: 0 0 0.4rem;
  }
  input[type="search"] {
    width: 100%;
    background: var(--surface-2);
    border: 1px solid var(--border-muted);
    border-radius: 8px;
    color: var(--text);
    font-size: 0.95rem;
    padding: 0.55rem 0.8rem;
    outline: none;
    font-family: inherit;
  }
  input[type="search"]:focus {
    border-color: var(--accent);
  }
</style>
