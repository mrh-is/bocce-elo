<script lang="ts">
  const { lastUpdated, sheetUrl }: { lastUpdated: Date; sheetUrl: string } =
    $props();

  const repoUrl = "https://github.com/mrh-is/bocce-elo";
</script>

<footer>
  <p class="legend">
    <span class="elo-better">Green Rank</span>
    = ELO ranks higher than official ·
    <span class="elo-worse">Red Rank</span>
    = ELO ranks lower · ELO accounts for score margins
  </p>
  <p class="meta">
    Updated {lastUpdated.toLocaleString()} ·
    <a href={sheetUrl} target="_blank" rel="noopener noreferrer">
      Source Spreadsheet <span class="arrow">↗</span>
    </a>
    ·
    <a href={repoUrl} target="_blank" rel="noopener noreferrer">
      GitHub <span class="arrow">↗</span>
    </a>
  </p>
</footer>

<style>
  footer {
    flex-shrink: 0;
    text-align: center;
    color: var(--text-mid);
    font-family: "Nunito", sans-serif;
    font-size: 0.72rem;
    padding: 0.5rem 0 0.75rem;
    line-height: 1.7;
  }
  footer p {
    margin: 0;
  }
  footer a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 700;
    white-space: nowrap;
  }
  footer a:hover {
    text-decoration: underline;
  }
  .arrow {
    font-family: "Space Mono", monospace;
  }
  .elo-better {
    color: var(--win);
    font-weight: 700;
  }
  .elo-worse {
    color: var(--loss);
    font-weight: 700;
  }
  @media (max-width: 600px) {
    .legend {
      display: none;
    }
  }
</style>
