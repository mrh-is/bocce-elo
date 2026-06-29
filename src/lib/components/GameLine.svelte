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
  <span class:odds-fav={prob >= 50} class:odds-dog={prob < 50}>{prob}%</span>
</div>

<style>
  .game-line {
    display: grid;
    grid-template-columns: 2.8rem 1fr auto;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0;
  }
  .court {
    font-size: 0.7rem;
    color: var(--accent);
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .opp {
    font-size: 0.78rem;
    color: var(--text-light);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .odds-fav {
    color: var(--win);
    font-weight: 700;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
  .odds-dog {
    color: var(--text-mid);
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }
  .muted {
    color: var(--border-muted);
  }
</style>
