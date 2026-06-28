<script>
	/** @type {{ data: import('./$types').PageData }} */
	let { data } = $props();

	let search = $state('');

	const filtered = $derived(
		search.trim() === ''
			? data.leaderboard
			: data.leaderboard.filter((t) =>
					t.name.toLowerCase().includes(search.trim().toLowerCase())
				)
	);

	function formatDiff(n) {
		return n > 0 ? `+${n}` : `${n}`;
	}

	function trendIcon(trend) {
		if (trend === 'up') return '▲';
		if (trend === 'down') return '▼';
		return '—';
	}

	function trendClass(trend) {
		if (trend === 'up') return 'up';
		if (trend === 'down') return 'down';
		return 'flat';
	}
</script>

<svelte:head>
	<title>{data.seasonLabel} · Bocce ELO</title>
</svelte:head>

<main>
	<header>
		<h1>🎯 Bocce ELO</h1>
		<p class="season">{data.seasonLabel}</p>
	</header>

	<div class="search-wrap">
		<input
			type="search"
			placeholder="Search teams…"
			bind:value={search}
			aria-label="Search teams"
		/>
	</div>

	<div class="table-wrap">
		<table>
			<thead>
				<tr>
					<th class="num">#</th>
					<th class="name">Team</th>
					<th class="num">ELO</th>
					<th class="num">W</th>
					<th class="num">L</th>
					<th class="num">+/−</th>
					<th class="num">Trend</th>
				</tr>
			</thead>
			<tbody>
				{#each filtered as team (team.name)}
					<tr>
						<td class="num rank">{team.rank}</td>
						<td class="name">{team.name}</td>
						<td class="num elo">{team.elo}</td>
						<td class="num">{team.wins}</td>
						<td class="num">{team.losses}</td>
						<td class="num diff">{formatDiff(team.pointDiff)}</td>
						<td class="num trend {trendClass(team.trend)}">{trendIcon(team.trend)}</td>
					</tr>
				{/each}
				{#if filtered.length === 0}
					<tr><td colspan="7" class="empty">No teams match "{search}"</td></tr>
				{/if}
			</tbody>
		</table>
	</div>

	<footer>
		Updated {new Date(data.lastUpdated).toLocaleString()}
	</footer>
</main>

<style>
	:global(body) {
		margin: 0;
		background: #0f1117;
		color: #e8eaf0;
		font-family: system-ui, -apple-system, sans-serif;
	}

	main {
		max-width: 760px;
		margin: 0 auto;
		padding: 1.5rem 1rem 3rem;
	}

	header {
		text-align: center;
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 2rem;
		font-weight: 800;
		letter-spacing: -0.03em;
		margin: 0;
		color: #fff;
	}

	.season {
		margin: 0.25rem 0 0;
		color: #8b9db5;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.search-wrap {
		margin-bottom: 1rem;
	}

	input[type='search'] {
		width: 100%;
		box-sizing: border-box;
		background: #1c2030;
		border: 1px solid #2e3650;
		border-radius: 8px;
		color: #e8eaf0;
		font-size: 1rem;
		padding: 0.6rem 0.9rem;
		outline: none;
	}

	input[type='search']:focus {
		border-color: #5b7cf0;
	}

	.table-wrap {
		overflow-x: auto;
		border-radius: 10px;
		border: 1px solid #1e2540;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.95rem;
	}

	thead {
		background: #161c30;
	}

	th {
		padding: 0.7rem 0.8rem;
		text-align: left;
		color: #8b9db5;
		font-weight: 600;
		font-size: 0.78rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}

	th.num, td.num {
		text-align: right;
	}

	td {
		padding: 0.65rem 0.8rem;
		border-top: 1px solid #1e2540;
	}

	tbody tr:hover {
		background: #161c30;
	}

	.rank {
		color: #8b9db5;
		font-size: 0.85rem;
	}

	.name {
		font-weight: 600;
		color: #fff;
	}

	.elo {
		font-weight: 700;
		color: #a8c4ff;
		font-variant-numeric: tabular-nums;
	}

	.diff {
		font-variant-numeric: tabular-nums;
		color: #8b9db5;
	}

	.trend.up {
		color: #4caf7d;
	}

	.trend.down {
		color: #e05c5c;
	}

	.trend.flat {
		color: #555e7a;
	}

	.empty {
		text-align: center;
		color: #555e7a;
		padding: 2rem;
	}

	footer {
		margin-top: 1.5rem;
		text-align: center;
		color: #555e7a;
		font-size: 0.8rem;
	}
</style>
