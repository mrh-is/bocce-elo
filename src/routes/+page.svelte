<script lang="ts">
  import { browser } from "$app/env";
  import type { PageData } from "#lib/types.js";
  import PageHeader from "#lib/components/PageHeader.svelte";
  import SearchBar from "#lib/components/SearchBar.svelte";
  import TeamPicker from "#lib/components/TeamPicker.svelte";
  import LeaderboardTable from "#lib/components/LeaderboardTable.svelte";
  import { getLeagueData } from "./data.remote.js";

  const league = getLeagueData();
  const { data: initialData }: { data: PageData } = $props();
  const data = $derived(league.current ?? initialData);

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
      ? (data?.leaderboard ?? [])
      : (data?.leaderboard ?? []).filter((team) =>
          team.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
  );

  const hasUpcoming = $derived(
    data?.leaderboard.some((team) => team.upcoming.length > 0) ?? false,
  );

  const allTeamNames = $derived(
    (data?.leaderboard ?? [])
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b)),
  );

  async function refreshLeagueData() {
    await league.refresh().catch(() => undefined);
  }
</script>

<svelte:head>
  <title>{data ? `${data.seasonLabel} · ` : ""}Stonewall Bocce ELO</title>
</svelte:head>

{#if data}
  <PageHeader
    seasonLabel={data.seasonLabel}
    lastUpdated={data.lastUpdated}
    sheetUrl={data.sheetUrl}
  />
  <div class="query-status">
    <button
      class="refresh-btn"
      type="button"
      onclick={refreshLeagueData}
      disabled={league.loading}
      aria-busy={league.loading}
    >
      {league.loading ? "Refreshing…" : "Refresh data"}
    </button>
    {#if league.error}
      <p role="alert">Refresh failed. Showing the most recent league data.</p>
    {:else if league.loading}
      <p role="status">Checking for updated league data…</p>
    {/if}
  </div>
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
{:else}
  <section class="load-error" role="alert">
    <h1>Couldn’t load the league data</h1>
    <p>The Google Sheet may be temporarily unavailable.</p>
    <button type="button" onclick={refreshLeagueData} disabled={league.loading}>
      {league.loading ? "Trying again…" : "Try again"}
    </button>
  </section>
{/if}

<style>
  .query-status {
    min-height: 1.75rem;
    margin: -0.15rem 0 0.35rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.65rem;
    color: var(--text-mid);
    font-size: 0.75rem;
  }
  .query-status p {
    margin: 0;
  }
  .refresh-btn,
  .load-error button {
    border: 1px solid var(--border-muted);
    border-radius: 999px;
    background: var(--surface-card);
    color: var(--text-sub);
    cursor: pointer;
    font:
      700 0.75rem "Nunito",
      sans-serif;
    padding: 0.3rem 0.7rem;
  }
  .refresh-btn:disabled,
  .load-error button:disabled {
    cursor: wait;
    opacity: 0.65;
  }
  .load-error {
    margin: auto;
    max-width: 32rem;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--surface-card);
    padding: 2rem;
    text-align: center;
  }
  .load-error h1 {
    margin: 0 0 0.5rem;
    font:
      800 1.5rem "Fraunces",
      serif;
  }
  .load-error p {
    margin: 0 0 1rem;
    color: var(--text-mid);
  }
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
    .query-status {
      align-items: flex-end;
      flex-direction: column;
    }
    .controls {
      flex-direction: column;
    }
    .controls :global(.picker-wrap) {
      max-width: 100%;
    }
  }
</style>
