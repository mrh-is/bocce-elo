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
        <th class="num" title="Official league standings rank">Off</th>
        <th class="num" title="ELO-computed rank">Rank</th>
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
    border-radius: 14px;
    border: 2px solid var(--border);
    margin-bottom: 0.75rem;
    background: var(--surface-card);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transition:
      background 0.2s,
      border-color 0.2s;

    /* Firefox scrollbar */
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
  }
  /* Webkit scrollbar */
  .table-wrap::-webkit-scrollbar {
    width: 7px;
  }
  .table-wrap::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
    border-radius: 0 12px 12px 0;
  }
  .table-wrap::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 10px;
    border: 2px solid var(--surface-card);
  }
  .table-wrap::-webkit-scrollbar-thumb:hover {
    background: var(--accent);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }
  thead {
    background: var(--surface-0);
    transition: background 0.2s;
  }
  thead th {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--surface-0);
    transition: background 0.2s;
  }
  th {
    padding: 0.65rem 0.75rem;
    text-align: left;
    color: var(--text-mid);
    font-family: "Nunito", sans-serif;
    font-weight: 700;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    white-space: nowrap;
    border-bottom: 2px solid var(--border);
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
    color: var(--text-dim);
    padding: 2.5rem;
    font-family: "Nunito", sans-serif;
    font-size: 1rem;
    border-top: 1px solid var(--border-subtle);
    vertical-align: middle;
  }
  @media (max-width: 600px) {
    .table-wrap {
      overflow-x: auto;
    }
  }
</style>
