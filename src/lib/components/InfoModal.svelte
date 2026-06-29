<script lang="ts">
  import ExternalLink from "./ExternalLink.svelte";
  import RelativeTime from "./RelativeTime.svelte";

  let {
    open = $bindable(false),
    lastUpdated,
    sheetUrl,
  }: { open: boolean; lastUpdated: Date; sheetUrl: string } = $props();

  const issuesUrl = "https://github.com/mrh-is/bocce-elo/issues/new";

  let closeButton = $state<HTMLButtonElement | undefined>(undefined);
  let previouslyFocused: HTMLElement | null = null;

  function focusableElements(): HTMLElement[] {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        ".modal button, .modal a[href], .modal [tabindex]:not([tabindex='-1'])",
      ),
    ).filter((element) => !element.hasAttribute("disabled"));
  }

  $effect(() => {
    if (!open) {
      return;
    }

    previouslyFocused = document.activeElement as HTMLElement | null;
    closeButton?.focus();

    return () => {
      previouslyFocused?.focus();
      previouslyFocused = null;
    };
  });

  function close() {
    open = false;
  }

  function onKeydown(e: KeyboardEvent) {
    if (!open) {
      return;
    }

    if (e.key === "Escape") {
      close();
      return;
    }

    if (e.key !== "Tab") {
      return;
    }

    const focusable = focusableElements();
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <div
    class="backdrop"
    role="button"
    tabindex="-1"
    aria-label="Close modal"
    onclick={close}
    onkeydown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        close();
      }
    }}
  >
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="How to read this"
      tabindex="-1"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
    >
      <button
        bind:this={closeButton}
        class="close-btn"
        onclick={close}
        aria-label="Close"
      >
        ✕
      </button>

      <h2>How to read this</h2>

      <section>
        <h3>Columns</h3>
        <dl>
          <div>
            <dt>Off</dt>
            <dd>Official league standings rank</dd>
          </div>
          <div>
            <dt>Rank</dt>
            <dd>ELO-computed rank — may differ from official</dd>
          </div>
          <div>
            <dt>ELO</dt>
            <dd>ELO rating score (higher = stronger record)</dd>
          </div>
          <div>
            <dt>W / L / T</dt>
            <dd>Wins, Losses, Ties</dd>
          </div>
          <div>
            <dt>This Week</dt>
            <dd>Upcoming matchups with ELO win probability</dd>
          </div>
        </dl>
      </section>

      <section>
        <h3>ELO Rank colors</h3>
        <p>
          <span class="elo-rank elo-better">Green Rank</span>
          — ELO places team higher than official
        </p>
        <p>
          <span class="elo-rank elo-worse">Red Rank</span>
          — ELO places team lower than official
        </p>
        <p class="note">
          ELO accounts for score margins, not just wins and losses.
        </p>
        <p class="note">
          Learn about ELO:
          <ExternalLink href="https://en.wikipedia.org/wiki/Elo_rating_system">
            Wikipedia
          </ExternalLink>
          <span class="sep">·</span>
          <ExternalLink href="https://www.youtube.com/watch?v=inXUp5j107I">
            Explainer video
          </ExternalLink>
        </p>
      </section>

      <footer>
        <p class="footer-line">
          Questions, comments, suggestions, praise, curiosity?
          <ExternalLink href={issuesUrl}>Add an issue on GitHub</ExternalLink>
        </p>
        <p class="footer-line">
          Data last updated <RelativeTime date={lastUpdated} /> from
          <ExternalLink href={sheetUrl}>the official source</ExternalLink>
        </p>
      </footer>
    </div>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    backdrop-filter: blur(3px);
  }
  .modal {
    background: var(--surface-card);
    border: 2px solid var(--border);
    border-radius: 16px;
    padding: 1.5rem 1.75rem 1.25rem;
    max-width: 420px;
    width: 100%;
    position: relative;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }
  .close-btn {
    position: absolute;
    top: 0.75rem;
    right: 0.85rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    color: var(--text-dim);
    line-height: 1;
    padding: 0.25rem 0.4rem;
    border-radius: 6px;
  }
  .close-btn:hover {
    color: var(--text);
    background: var(--surface-1);
  }
  h2 {
    font-family: "Fraunces", serif;
    font-variation-settings: "opsz" 40;
    font-weight: 900;
    font-size: 1.4rem;
    color: var(--text);
    margin: 0 0 1rem;
    line-height: 1.1;
  }
  h3 {
    font-family: "Nunito", sans-serif;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-mid);
    margin: 0 0 0.5rem;
  }
  section {
    margin-bottom: 1rem;
  }
  dl {
    margin: 0;
  }
  dl div {
    display: grid;
    grid-template-columns: 5rem 1fr;
    gap: 0.25rem 0.75rem;
    padding: 0.2rem 0;
    border-top: 1px solid var(--border-subtle);
    font-size: 0.85rem;
    font-family: "Nunito", sans-serif;
  }
  dt {
    font-family: "Space Mono", monospace;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent);
    align-self: center;
  }
  dd {
    margin: 0;
    color: var(--text-sub);
    align-self: center;
  }
  p {
    font-family: "Nunito", sans-serif;
    font-size: 0.85rem;
    color: var(--text-sub);
    margin: 0.2rem 0;
  }
  .note {
    font-size: 0.78rem;
    color: var(--text-dim);
    margin-top: 0.4rem;
  }
  .sep {
    margin: 0 0.25rem;
    color: var(--text-dim);
  }
  .elo-rank {
    font-weight: 700;
    font-family: "Space Mono", monospace;
    font-size: 0.8rem;
  }
  .elo-better {
    color: var(--win);
  }
  .elo-worse {
    color: var(--loss);
  }
  footer {
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-subtle);
    font-size: 0.75rem;
    font-family: "Nunito", sans-serif;
    color: var(--text-dim);
  }
  .footer-line {
    margin: 0.25rem 0;
  }
</style>
