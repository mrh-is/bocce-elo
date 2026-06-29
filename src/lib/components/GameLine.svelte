<script lang="ts">
  const {
    court,
    opponent,
    prob,
  }: { court: string | null; opponent: string; prob: number } = $props();
</script>

<div class="game-line">
  {#if court}
    <span class="court">Ct {court}</span>
  {:else}
    <span class="court muted">–</span>
  {/if}
  <span class="opp">vs {opponent}</span>
  <span class="odds" class:odds-fav={prob >= 50} class:odds-dog={prob < 50}>
    {prob}%
  </span>
</div>

<style>
  .game-line {
    display: grid;
    grid-template-columns: 2.8rem 1fr auto;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0;
    font-family: "Nunito", sans-serif;
  }
  .court {
    font-size: 0.7rem;
    color: var(--accent);
    font-weight: 700;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .opp {
    font-size: 0.78rem;
    color: var(--text-mid);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .odds {
    font-family: "Space Mono", monospace;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
    border-radius: 5px;
    padding: 0.1rem 0.35rem;
    white-space: nowrap;
  }
  .odds-fav {
    color: var(--win);
    font-weight: 700;
    background: color-mix(in oklch, var(--win) 14%, transparent);
  }
  .odds-dog {
    color: var(--loss);
    opacity: 0.65;
    background: color-mix(in oklch, var(--loss) 8%, transparent);
  }
  .muted {
    color: var(--border-muted);
  }
</style>
