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
    background: #101510;
    border: 1px solid #253025;
    border-radius: 8px;
    color: #f0ece4;
    font-size: 0.95rem;
    padding: 0.55rem 0.8rem;
    outline: none;
    font-family: inherit;
  }
  input[type="search"]:focus {
    border-color: #d4a843;
  }
</style>
