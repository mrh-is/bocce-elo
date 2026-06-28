<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import TeamRow from "./TeamRow.svelte";

  const {
    entries,
    hasUpcoming,
    emptyMessage,
  }: {
    entries: LeaderboardEntry[];
    hasUpcoming: boolean;
    emptyMessage: string;
  } = $props();
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th class="num" title="Official league standings rank">Off.</th>
        <th class="num">ELO #</th>
        <th class="name">Team</th>
        <th class="num">ELO</th>
        <th class="num">W</th>
        <th class="num">L</th>
        <th class="num">T</th>
        {#if hasUpcoming}<th class="this-wk-head">This Week</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each entries as team (team.name)}
        <TeamRow {team} {hasUpcoming} />
      {/each}
      {#if entries.length === 0}
        <tr>
          <td colspan={hasUpcoming ? 8 : 7} class="empty">{emptyMessage}</td>
        </tr>
      {/if}
    </tbody>
  </table>
</div>

<style>
  .table-wrap {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    border-radius: 10px;
    border: 1px solid #1a271a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  thead {
    background: #0d150d;
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: #0d150d;
  }
  th {
    padding: 0.6rem 0.7rem;
    text-align: left;
    color: #d4a843;
    font-weight: 600;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
  }
  th.num {
    text-align: right;
  }
  th.this-wk-head {
    text-align: left;
    padding-left: 1rem;
  }
  .empty {
    text-align: center;
    color: #3a5a3a;
    padding: 2rem;
    border-top: 1px solid #111911;
    vertical-align: middle;
  }
  @media (max-width: 600px) {
    .table-wrap {
      flex: none;
      overflow-y: visible;
      overflow-x: auto;
    }
  }
</style>
