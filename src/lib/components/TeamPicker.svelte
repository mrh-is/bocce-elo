<script lang="ts">
  const {
    teams,
    selected,
    onSelect,
  }: {
    teams: string[];
    selected: string | null;
    onSelect: (team: string | null) => void;
  } = $props();

  function handleChange(e: Event) {
    const value = (e.target as HTMLSelectElement).value;
    onSelect(value || null);
  }
</script>

<div class="picker-wrap">
  <select
    value={selected ?? ""}
    onchange={handleChange}
    aria-label="Select your team"
  >
    <option value="">Select your team…</option>
    {#each teams as name (name)}
      <option value={name}>{name}</option>
    {/each}
  </select>
</div>

<style>
  .picker-wrap {
    flex-shrink: 0;
  }
  select {
    width: 100%;
    background: var(--surface-card);
    border: 2px solid var(--border);
    border-radius: 100px;
    color: var(--text);
    font-size: 0.88rem;
    font-family: "Nunito", sans-serif;
    padding: 0.45rem 2rem 0.45rem 1.1rem;
    outline: none;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%237a9e7e' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.9rem center;
    transition:
      border-color 0.15s,
      box-shadow 0.15s;
  }
  select:focus {
    border-color: var(--accent);
    box-shadow: 0 2px 10px rgba(255, 77, 139, 0.18);
  }
</style>
