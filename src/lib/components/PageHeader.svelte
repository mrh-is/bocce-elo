<script lang="ts">
  const { seasonLabel }: { seasonLabel: string } = $props();
</script>

<header>
  <div class="deco">◆ ◆ ◆</div>
  <h1>STONEWALL <span class="accent">BOCCE</span></h1>
  <p class="season-label">
    ELO Power Rankings · {seasonLabel} · Pittsburgh, PA
  </p>
  <div class="deco">◆ ◆ ◆</div>
</header>

<style>
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
</style>
