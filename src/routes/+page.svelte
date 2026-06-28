<script>
  /** @type {{ data: import('./$types').PageData }} */
  const { data } = $props();

  let search = $state("");

  const filtered = $derived(
    search.trim() === ""
      ? data.leaderboard
      : data.leaderboard.filter((t) =>
          t.name.toLowerCase().includes(search.trim().toLowerCase()),
        ),
  );

  function rankDiffClass(diff) {
    if (diff === null || diff === 0) {
      return "";
    }
    return diff > 0 ? "elo-better" : "elo-worse";
  }

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
  <header>
    <div class="deco">◆ ◆ ◆</div>
    <h1>STONEWALL <span class="accent">BOCCE</span></h1>
    <p class="season-label">
      ELO Power Rankings · {data.seasonLabel} · Pittsburgh, PA
    </p>
    <div class="deco">◆ ◆ ◆</div>
  </header>

  <div class="search-wrap">
    <input
      type="search"
      placeholder="🔍 Search teams…"
      bind:value={search}
      aria-label="Search teams"
    />
  </div>

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
        {#each filtered as team (team.name)}
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
                {#if team.upcoming.length > 0}
                  {#each team.upcoming as game (game.opponent)}
                    <div class="game-line">
                      {#if game.court}
                        <span class="court">Ct {game.court}</span>
                      {:else}
                        <span class="court muted">–</span>
                      {/if}
                      <span class="opp">vs {game.opponent}</span>
                      <span
                        class:odds-fav={game.prob >= 50}
                        class:odds-dog={game.prob < 50}>{game.prob}%</span
                      >
                    </div>
                  {/each}
                {:else}
                  <span class="muted">–</span>
                {/if}
              </td>
            {/if}
          </tr>
        {/each}
        {#if filtered.length === 0}
          <tr
            ><td colspan={hasUpcoming ? 8 : 7} class="empty"
              >No teams match "{search}" 🤷</td
            ></tr
          >
        {/if}
      </tbody>
    </table>
  </div>

  <footer>
    <p>
      <span class="elo-better">Green ELO #</span> = ELO ranks higher than
      official ·
      <span class="elo-worse">Red ELO #</span> = ELO ranks lower · ELO accounts for
      score margins
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
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: #0b0e0b;
    color: #f0ece4;
    font-family: "Inter", system-ui, sans-serif;
    height: 100dvh;
    overflow: hidden;
  }

  /* ── FULL-HEIGHT FLEX LAYOUT ── */
  .layout {
    height: 100dvh;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 1rem;
    display: flex;
    flex-direction: column;
  }

  /* ── HEADER ── */
  header {
    flex-shrink: 0;
    text-align: center;
    padding: 1.25rem 0 0.75rem;
  }

  .deco {
    color: #d4a843;
    font-size: 0.72rem;
    letter-spacing: 0.6em;
    margin: 0.4rem 0;
  }

  h1 {
    font-family: "Playfair Display", serif;
    font-size: clamp(1.6rem, 6vw, 3rem);
    font-weight: 900;
    letter-spacing: 0.06em;
    margin: 0;
    color: #f5f0e8;
    text-transform: uppercase;
    line-height: 1;
  }

  .accent {
    color: #4fc9a0;
  }

  .season-label {
    margin: 0.4rem 0 0;
    color: #d4a843;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 500;
  }

  /* ── SEARCH ── */
  .search-wrap {
    flex-shrink: 0;
    margin: 0 0 0.4rem;
  }

  input[type="search"] {
    width: 100%;
    background: #101510;
    border: 1px solid #253025;
    border-radius: 8px;
    color: #f0ece4;
    font-size: 0.95rem;
    padding: 0.55rem 0.8rem;
    outline: none;
    font-family: inherit;
  }

  input[type="search"]:focus {
    border-color: #d4a843;
  }

  /* ── TABLE SCROLL CONTAINER ── */
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

  th.num,
  td.num {
    text-align: right;
  }

  th.this-wk-head {
    text-align: left;
    padding-left: 1rem;
  }

  td {
    padding: 0.55rem 0.7rem;
    border-top: 1px solid #111911;
    vertical-align: middle;
  }

  tbody tr:hover:not(.my-team) {
    background: #0d150d;
  }

  tr.my-team {
    background: #1a1500 !important;
    box-shadow: inset 3px 0 0 #d4a843;
  }

  tr.my-team td {
    border-top-color: #221d00;
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

  /* ── THIS WEEK CELL ── */
  .this-wk {
    padding-left: 1rem;
    min-width: 260px;
  }

  .game-line {
    display: grid;
    grid-template-columns: 2.8rem 1fr auto;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0;
  }

  .court {
    font-size: 0.7rem;
    color: #d4a843;
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .opp {
    font-size: 0.78rem;
    color: #7a9a7a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .odds-fav {
    color: #4fc9a0;
    font-weight: 700;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }

  .odds-dog {
    color: #5a7a5a;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }

  .muted {
    color: #253025;
  }

  .empty {
    text-align: center;
    color: #3a5a3a;
    padding: 2rem;
  }

  /* ── FOOTER ── */
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

  /* ── MOBILE: revert to page scroll, keep sticky thead ── */
  @media (max-width: 600px) {
    :global(body) {
      height: auto;
      overflow: auto;
    }

    .layout {
      height: auto;
      padding-bottom: 2rem;
    }

    .table-wrap {
      flex: none;
      overflow-y: visible;
    }

    .this-wk {
      min-width: 0;
    }
  }
</style>
