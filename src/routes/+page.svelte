<script lang="ts">
  import type { PageData } from "./$types.js";
  import PageHeader from "$lib/components/PageHeader.svelte";
  import SearchBar from "$lib/components/SearchBar.svelte";
  import LeaderboardTable from "$lib/components/LeaderboardTable.svelte";

  const { data }: { data: PageData } = $props();

  let search = $state("");

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
</script>

<svelte:head>
  <title>{data.seasonLabel} · Stonewall Bocce ELO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="layout">
  <PageHeader seasonLabel={data.seasonLabel} />
  <SearchBar bind:value={search} />
  <LeaderboardTable
    entries={filtered}
    {hasUpcoming}
    emptyMessage={`No teams match "${search}" 🤷`}
  />
  <footer>
    <p>
      <span class="elo-better">Green ELO #</span> = ELO ranks higher than
      official · <span class="elo-worse">Red ELO #</span> = ELO ranks lower · ELO
      accounts for score margins
    </p>
    <p>
      Updated {new Date(data.lastUpdated).toLocaleString()} ·
      <a href={data.sheetUrl} target="_blank" rel="noopener noreferrer"
        >Source Spreadsheet ↗</a
      >
    </p>
  </footer>
</div>

<style>
  footer {
    flex-shrink: 0;
    text-align: center;
    color: #3a5a3a;
    font-size: 0.72rem;
    padding: 0.5rem 0 0.75rem;
    line-height: 1.7;
  }
  footer p {
    margin: 0;
  }
  footer a {
    color: #d4a843;
    text-decoration: none;
  }
  footer a:hover {
    text-decoration: underline;
  }
  .elo-better {
    color: #4fc9a0;
  }
  .elo-worse {
    color: #c05040;
  }
</style>
