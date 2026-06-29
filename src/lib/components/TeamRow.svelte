<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import UpcomingGames from "./UpcomingGames.svelte";

  const {
    team,
    hasUpcoming,
  }: { team: LeaderboardEntry; hasUpcoming: boolean } = $props();

  function compareDiff(
    diff: number | null,
    greaterText: string,
    lessText: string,
  ): string {
    if (diff === null || diff === 0) {
      return "";
    }
    return diff > 0 ? greaterText : lessText;
  }

  function rankDiffClass(diff: number | null): string {
    return compareDiff(diff, "elo-better", "elo-worse");
  }

  function hoverText(diff: number | null): string {
    return compareDiff(
      diff,
      `ELO ranks ${diff} spots higher than official`,
      `ELO ranks ${Math.abs(diff!)} spots lower than official`,
    );
  }

  const medals: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
</script>

<tr class:my-team={team.isMyTeam}>
  <td class="num official">
    {#if medals[team.officialRank ?? -1]}
      <span class="medal">{medals[team.officialRank ?? -1]}</span>
    {:else}
      {team.officialRank ?? "–"}
    {/if}
  </td>
  <td
    class="num rank {rankDiffClass(team.rankDiff)}"
    title={hoverText(team.rankDiff)}
  >
    {team.rank}
  </td>
  <td class="name">
    {#if team.isMyTeam}<span class="dog">🐕</span>{/if}
    {team.name}
  </td>
  <td class="num elo">{team.elo}</td>
  <td class="num wins">{team.wins}</td>
  <td class="num losses">{team.losses}</td>
  <td class="num ties">{team.ties || "–"}</td>
  {#if hasUpcoming}
    <td class="this-wk">
      <UpcomingGames games={team.upcoming} />
    </td>
  {/if}
</tr>

<style>
  tr:hover {
    background: color-mix(in oklch, var(--accent) 10%, var(--surface-card));
  }
  tr:nth-child(even) {
    background: color-mix(in oklch, var(--surface-0) 40%, var(--surface-card));
  }
  tr:nth-child(even):hover {
    background: color-mix(in oklch, var(--accent) 10%, var(--surface-card));
  }
  tr.my-team,
  tr.my-team:nth-child(even) {
    background: linear-gradient(
      90deg,
      color-mix(in oklch, var(--accent) 18%, var(--surface-card)) 0%,
      color-mix(in oklch, var(--pallino) 16%, var(--surface-card)) 50%,
      color-mix(in oklch, var(--accent) 18%, var(--surface-card)) 100%
    );
    background-size: 200% 100%;
    animation: my-team-shimmer 4s ease-in-out infinite;
    box-shadow: inset 6px 0 0 var(--accent);
  }
  @keyframes my-team-shimmer {
    0%,
    100% {
      background-position: 0% 0%;
    }
    50% {
      background-position: 100% 0%;
    }
  }
  td {
    padding: 0.55rem 0.75rem;
    border-top: 1px solid var(--border-subtle);
    vertical-align: middle;
    font-family: "Nunito", sans-serif;
    color: var(--text);
    transition: background 0.2s;
  }
  tr.my-team td {
    border-top-color: color-mix(in oklch, var(--pallino) 40%, transparent);
  }
  .num {
    text-align: right;
    font-family: "Space Mono", monospace;
    font-size: 0.82rem;
  }
  .rank {
    color: var(--text-dim);
  }
  .rank.elo-better {
    color: var(--win);
    font-weight: 700;
  }
  .rank.elo-worse {
    color: var(--loss);
    font-weight: 700;
  }
  .medal {
    font-size: 1.1rem;
    font-family: inherit;
    line-height: 1;
  }
  .official {
    color: var(--text-mid);
  }
  .name {
    font-weight: 700;
    color: var(--text-sub);
    font-family: "Nunito", sans-serif;
  }
  tr.my-team .name {
    color: var(--accent);
    font-weight: 800;
  }
  .dog {
    margin-right: 0.25rem;
  }
  .elo {
    font-weight: 700;
    color: var(--win);
    font-family: "Space Mono", monospace;
  }
  .wins {
    color: var(--win);
    font-weight: 700;
  }
  .losses {
    color: var(--loss);
    font-weight: 700;
  }
  .ties {
    color: var(--text-dim);
  }
  .this-wk {
    padding-left: 1rem;
    min-width: 260px;
  }
  @media (max-width: 600px) {
    .this-wk {
      min-width: 0;
    }
  }
</style>
