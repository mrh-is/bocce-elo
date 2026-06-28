<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import UpcomingGames from "./UpcomingGames.svelte";

  const {
    team,
    hasUpcoming,
  }: { team: LeaderboardEntry; hasUpcoming: boolean } = $props();

  function rankDiffClass(diff: number | null): string {
    if (diff === null || diff === 0) {
      return "";
    }
    return diff > 0 ? "elo-better" : "elo-worse";
  }
</script>

<tr class:my-team={team.isMyTeam}>
  <td class="num official">{team.officialRank ?? "–"}</td>
  <td
    class="num rank {rankDiffClass(team.rankDiff)}"
    title={team.rankDiff !== null && team.rankDiff !== 0
      ? team.rankDiff > 0
        ? `ELO ranks ${team.rankDiff} spots higher than official`
        : `ELO ranks ${Math.abs(team.rankDiff)} spots lower than official`
      : ""}>{team.rank}</td
  >
  <td class="name"
    >{#if team.isMyTeam}🐕
    {/if}{team.name}</td
  >
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
    background: #0d150d;
  }
  tr.my-team {
    background: #1a1500 !important;
    box-shadow: inset 3px 0 0 #d4a843;
  }
  td {
    padding: 0.55rem 0.7rem;
    border-top: 1px solid #111911;
    vertical-align: middle;
  }
  tr.my-team td {
    border-top-color: #221d00;
  }
  .num {
    text-align: right;
  }
  .rank {
    color: #3a5a3a;
    font-size: 0.82rem;
  }
  .rank.elo-better {
    color: #4fc9a0;
    font-weight: 600;
  }
  .rank.elo-worse {
    color: #c05040;
    font-weight: 600;
  }
  .name {
    font-weight: 600;
    color: #ddd8d0;
  }
  tr.my-team .name {
    color: #d4a843;
  }
  .elo {
    font-weight: 700;
    color: #4fc9a0;
    font-variant-numeric: tabular-nums;
  }
  .ties {
    color: #3a5a3a;
  }
  .official {
    font-variant-numeric: tabular-nums;
    color: #5a7a5a;
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
