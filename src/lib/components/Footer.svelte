<script lang="ts">
  const { lastUpdated, sheetUrl }: { lastUpdated: string; sheetUrl: string } =
    $props();

  const repoUrl = "https://github.com/mrh-is/bocce-elo";
</script>

<footer>
  <p>
    <span class="elo-better">Green ELO #</span> = ELO ranks higher than official
    · <span class="elo-worse">Red ELO #</span> = ELO ranks lower · ELO accounts for
    score margins
  </p>
  <p>
    Updated {new Date(lastUpdated).toLocaleString()} ·
    <a href={sheetUrl} target="_blank" rel="noopener noreferrer"
      >Source Spreadsheet ↗</a
    >
    ·
    <a href={repoUrl} target="_blank" rel="noopener noreferrer">GitHub Repo ↗</a
    >
  </p>
</footer>

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
