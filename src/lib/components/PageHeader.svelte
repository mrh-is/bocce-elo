<script lang="ts">
  import ThemeSwitcher from "./ThemeSwitcher.svelte";
  import InfoModal from "./InfoModal.svelte";

  const {
    seasonLabel,
    lastUpdated,
    sheetUrl,
  }: { seasonLabel: string; lastUpdated: Date; sheetUrl: string } = $props();

  let infoOpen = $state(false);
</script>

<header>
  <button
    class="info-btn"
    onclick={() => (infoOpen = true)}
    aria-label="How to read this"
    title="How to read this"
  >
    ?
  </button>
  <div class="theme-controls">
    <ThemeSwitcher />
  </div>
  <h1>Stonewall Bocce</h1>
  <p class="season-label">
    ELO Power Rankings · {seasonLabel} · Pittsburgh, PA
  </p>
</header>

<InfoModal bind:open={infoOpen} {lastUpdated} {sheetUrl} />

<style>
  header {
    flex-shrink: 0;
    text-align: center;
    padding: 1.4rem 1.5rem 1.2rem;
    background: var(--header-bg);
    border-radius: 14px;
    margin: 0.75rem 0 0.5rem;
    box-shadow: var(--header-shadow);
    position: relative;
    transition:
      background 0.2s,
      box-shadow 0.2s;
  }
  .theme-controls {
    position: absolute;
    top: 0.65rem;
    right: 0.85rem;
    display: flex;
    align-items: center;
  }
  .info-btn {
    position: absolute;
    top: 0.65rem;
    left: 0.85rem;
    background: rgba(0, 0, 0, 0.25);
    border: none;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.75);
    font-family: "Space Mono", monospace;
    font-size: 0.8rem;
    font-weight: 700;
    width: 1.65rem;
    height: 1.65rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
      background 0.15s,
      color 0.15s;
    line-height: 1;
  }
  .info-btn:hover {
    background: rgba(0, 0, 0, 0.4);
    color: #ffffff;
  }
  h1 {
    font-family: "Fraunces", serif;
    font-optical-sizing: auto;
    font-variation-settings: "opsz" 80;
    font-size: clamp(2rem, 8vw, 3.8rem);
    font-weight: 900;
    letter-spacing: -0.01em;
    margin: 0;
    color: #ffffff;
    line-height: 1;
  }
  @media (max-width: 650px) {
    h1 {
      margin-top: 1.2rem;
    }
  }
  .season-label {
    margin: 0.45rem 0 0;
    color: var(--pallino);
    font-family: "Nunito", sans-serif;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 700;
  }
</style>
