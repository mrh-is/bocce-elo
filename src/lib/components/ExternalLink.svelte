<script lang="ts">
  import type { Snippet } from "svelte";

  const { href, children }: { href: string; children: Snippet } = $props();
</script>

<a {href} target="_blank" rel="noopener noreferrer">
  {@render children()}
  <span class="arrow">↗</span>
</a>

<style>
  a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 700;
  }
  a:hover {
    text-decoration: underline;
  }
  .arrow {
    font-family: "Space Mono", monospace;
    margin-left: 0.2em;
  }
</style>
