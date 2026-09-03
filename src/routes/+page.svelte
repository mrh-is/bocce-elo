<script lang="ts">
  import { browser } from "$app/env";
  import type { PageData } from "./$types.js";
  import PageHeader from "#lib/components/PageHeader.svelte";
  import SearchBar from "#lib/components/SearchBar.svelte";
  import TeamPicker from "#lib/components/TeamPicker.svelte";
  import LeaderboardTable from "#lib/components/LeaderboardTable.svelte";
  const { data }: { data: PageData } = $props();

  let search = $state("");

  let selectedTeam = $state<string | null>(null);

  if (browser) {
    try {
      const stored = localStorage.getItem("myTeam");
      if (stored) {
        selectedTeam = stored;
      }
    } catch {
      /* localStorage unavailable */
    }
  }

  function onTeamSelect(team: string | null) {
    selectedTeam = team;
    try {
      if (team) {
        localStorage.setItem("myTeam", team);
      } else {
        localStorage.removeItem("myTeam");
      }
    } catch {
      /* localStorage unavailable */
    }
  }

  const filtered = $derived(
    search.trim() === ""
      ? data.leaderboard
      : data.leaderboard.filter((t) =>
          t.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
  );

  const hasUpcoming = $derived(
    data.leaderboard.some((t) => t.upcoming.length > 0),
  );

  const allTeamNames = $derived(
    data.leaderboard.map((t) => t.name).sort((a, b) => a.localeCompare(b)),
  );
</script>

<svelte:head>
  <title>{data.seasonLabel} · Stonewall Bocce ELO</title>
</svelte:head>

<PageHeader
  seasonLabel={data.seasonLabel}
  lastUpdated={data.lastUpdated}
  sheetUrl={data.sheetUrl}
/>
<div class="controls">
  <SearchBar bind:value={search} />
  <TeamPicker
    teams={allTeamNames}
    selected={selectedTeam}
    onSelect={onTeamSelect}
  />
</div>
<LeaderboardTable
  entries={filtered}
  {hasUpcoming}
  myTeam={selectedTeam}
  emptyMessage={`No teams match "${search}" 🤷`}
/>

<style>
  .controls {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
    margin: 0 0 0.5rem;
  }
  .controls :global(.search-wrap) {
    flex: 1;
    margin: 0;
  }
  .controls :global(.picker-wrap) {
    flex: 0 0 auto;
    min-width: 0;
    max-width: 50%;
  }
  @media (max-width: 500px) {
    .controls {
      flex-direction: column;
    }
    .controls :global(.picker-wrap) {
      max-width: 100%;
    }
  }
</style>
