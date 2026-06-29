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
</svelte:head>

<PageHeader
  seasonLabel={data.seasonLabel}
  lastUpdated={data.lastUpdated}
  sheetUrl={data.sheetUrl}
/>
<SearchBar bind:value={search} />
<LeaderboardTable
  entries={filtered}
  {hasUpcoming}
  emptyMessage={`No teams match "${search}" 🤷`}
/>
