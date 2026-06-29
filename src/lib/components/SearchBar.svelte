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
    margin: 0 0 0.5rem;
  }
  input[type="search"] {
    width: 100%;
    background: var(--surface-card);
    border: 2px solid var(--border);
    border-radius: 100px;
    color: var(--text);
    font-size: 0.95rem;
    font-family: "Nunito", sans-serif;
    padding: 0.5rem 1.1rem;
    outline: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  input[type="search"]:focus {
    border-color: var(--accent);
    box-shadow: 0 2px 10px rgba(255, 77, 139, 0.18);
  }
  input[type="search"]::placeholder {
    color: var(--text-dim);
  }
</style>
