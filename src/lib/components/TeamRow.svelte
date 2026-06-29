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
</script>

<tr class:my-team={team.isMyTeam}>
  <td class="num official">{team.officialRank ?? "–"}</td>
  <td
    class="num rank {rankDiffClass(team.rankDiff)}"
    title={hoverText(team.rankDiff)}
  >
    {team.rank}
  </td>
  <td class="name">
    {#if team.isMyTeam}🐕{/if}
    {team.name}
  </td>
  <td class="num elo">{team.elo}</td>
  <td class="num">{team.wins}</td>
  <td class="num">{team.losses}</td>
  <td class="num ties">{team.ties || "–"}</td>
  {#if hasUpcoming}
    <td class="this-wk">
      <UpcomingGames games={team.upcoming} />
    </td>
  {/if}
</tr>

<style>
  tr:hover {
    background: var(--surface-1);
  }
  tr.my-team {
    background: var(--surface-my-team) !important;
    box-shadow: inset 3px 0 0 var(--accent);
  }
  td {
    padding: 0.55rem 0.7rem;
    border-top: 1px solid var(--border-subtle);
    vertical-align: middle;
  }
  tr.my-team td {
    border-top-color: var(--border-my-team);
  }
  .num {
    text-align: right;
  }
  .rank {
    color: var(--text-dim);
    font-size: 0.82rem;
  }
  .rank.elo-better {
    color: var(--win);
    font-weight: 600;
  }
  .rank.elo-worse {
    color: var(--loss);
    font-weight: 600;
  }
  .name {
    font-weight: 600;
    color: var(--text-sub);
  }
  tr.my-team .name {
    color: var(--accent);
  }
  .elo {
    font-weight: 700;
    color: var(--win);
    font-variant-numeric: tabular-nums;
  }
  .ties {
    color: var(--text-dim);
  }
  .official {
    font-variant-numeric: tabular-nums;
    color: var(--text-mid);
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
