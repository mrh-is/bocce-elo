<script lang="ts">
  type Theme = "light" | "dark" | "system";

  const THEMES: Theme[] = ["light", "dark", "system"];

  function isTheme(value: string | null): value is Theme {
    return THEMES.includes(value as Theme);
  }

  const storedTheme =
    typeof localStorage !== "undefined" ? localStorage.getItem("theme") : null;

  let theme = $state<Theme>(isTheme(storedTheme) ? storedTheme : "system");

  function set(t: Theme) {
    theme = t;
    localStorage.setItem("theme", t);
    const root = document.documentElement;
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
  }
</script>

<div class="switcher" role="group" aria-label="Color theme">
  <button
    class:active={theme === "light"}
    onclick={() => set("light")}
    title="Light mode"
    aria-pressed={theme === "light"}
  >
    ☀️
  </button>
  <button
    class:active={theme === "system"}
    onclick={() => set("system")}
    title="Match device"
    aria-pressed={theme === "system"}
  >
    💻
  </button>
  <button
    class:active={theme === "dark"}
    onclick={() => set("dark")}
    title="Dark mode"
    aria-pressed={theme === "dark"}
  >
    🌙
  </button>
</div>

<style>
  .switcher {
    display: flex;
    gap: 2px;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 100px;
    padding: 3px;
  }
  button {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1;
    padding: 0.25rem 0.4rem;
    border-radius: 100px;
    opacity: 0.55;
    transition:
      opacity 0.15s,
      background 0.15s;
  }
  button:hover {
    opacity: 0.85;
  }
  button.active {
    background: rgba(255, 255, 255, 0.2);
    opacity: 1;
  }
</style>
