<script lang="ts">
  import type { UpcomingGame } from "$lib/types.js";
  import GameLine from "./GameLine.svelte";

  const { games }: { games: UpcomingGame[] } = $props();
</script>

{#if games.length > 0}
  {#each games as game (game.opponent)}
    <GameLine court={game.court} opponent={game.opponent} prob={game.prob} />
  {/each}
{:else}
  <span class="muted">–</span>
{/if}

<style>
  .muted {
    color: var(--border-muted);
  }
</style>
