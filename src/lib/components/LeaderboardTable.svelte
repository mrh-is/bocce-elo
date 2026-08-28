<script lang="ts">
  import type { LeaderboardEntry } from "$lib/types.js";
  import TeamRow from "./TeamRow.svelte";

  const {
    entries,
    hasUpcoming,
    emptyMessage,
    myTeam = null,
  }: {
    entries: LeaderboardEntry[];
    hasUpcoming: boolean;
    emptyMessage: string;
    myTeam?: string | null;
  } = $props();

  type SortKey = "off" | "name" | "thisWeek" | "elo" | "rank" | "w" | "l" | "t";

  let sortKey = $state<SortKey>("off");
  let sortAsc = $state(true);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = key === "name";
    }
  }

  function courtNum(entry: LeaderboardEntry): number {
    const court = entry.upcoming[0]?.court;
    if (!court) {
      return Infinity;
    }
    const n = parseInt(court, 10);
    return isNaN(n) ? Infinity : n;
  }

  function cmp(a: LeaderboardEntry, b: LeaderboardEntry): number {
    let c = 0;
    switch (sortKey) {
      case "off": {
        const aR = a.officialRank ?? Infinity;
        const bR = b.officialRank ?? Infinity;
        c = aR - bR;
        break;
      }
      case "name":
        c = a.name.localeCompare(b.name);
        break;
      case "thisWeek":
        c = courtNum(a) - courtNum(b);
        break;
      case "elo":
        c = a.elo - b.elo;
        break;
      case "rank":
        c = a.rank - b.rank;
        break;
      case "w":
        c = a.wins - b.wins;
        break;
      case "l":
        c = a.losses - b.losses;
        break;
      case "t":
        c = a.ties - b.ties;
        break;
    }
    return sortAsc ? c : -c;
  }

  const sorted = $derived.by(() => {
    const pinned = myTeam ? entries.find((e) => e.name === myTeam) : null;
    const rest = myTeam ? entries.filter((e) => e.name !== myTeam) : entries;
    const sortedRest = [...rest].sort(cmp);
    return pinned ? [pinned, ...sortedRest] : sortedRest;
  });

  function arrow(key: SortKey): string {
    if (sortKey !== key) {
      return "";
    }
    return sortAsc ? " ▲" : " ▼";
  }
</script>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th
          class="num sortable"
          title="Official league standings rank"
          onclick={() => toggleSort("off")}
        >
          Off{arrow("off")}
        </th>
        <th class="name sortable" onclick={() => toggleSort("name")}>
          Team{arrow("name")}
        </th>
        {#if hasUpcoming}
          <th
            class="this-wk-head sortable"
            onclick={() => toggleSort("thisWeek")}
          >
            This Week{arrow("thisWeek")}
          </th>
        {/if}
        <th class="num sortable" onclick={() => toggleSort("elo")}>
          ELO{arrow("elo")}
        </th>
        <th
          class="num sortable"
          title="ELO-computed rank"
          onclick={() => toggleSort("rank")}
        >
          Rank{arrow("rank")}
        </th>
        <th class="num sortable" onclick={() => toggleSort("w")}>
          W{arrow("w")}
        </th>
        <th class="num sortable" onclick={() => toggleSort("l")}>
          L{arrow("l")}
        </th>
        <th class="num sortable" onclick={() => toggleSort("t")}>
          T{arrow("t")}
        </th>
      </tr>
    </thead>
    <tbody>
      {#each sorted as team (team.name)}
        <TeamRow {team} {hasUpcoming} isMyTeam={team.name === myTeam} />
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
    overscroll-behavior-x: none;
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
  th.sortable {
    cursor: pointer;
    user-select: none;
  }
  th.sortable:hover {
    color: var(--accent);
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
