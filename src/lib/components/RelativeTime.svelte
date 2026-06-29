<script lang="ts">
  const { date }: { date: Date } = $props();

  const exactTimestamp = $derived(date.toLocaleString());

  function relativeTime(from: Date, now: number): string {
    const diff = Math.floor((now - from.getTime()) / 1000);
    if (!Number.isFinite(diff)) {
      return "unknown";
    }
    if (diff < 0) {
      return "just now";
    }
    if (diff < 60) {
      return `${diff} second${diff === 1 ? "" : "s"} ago`;
    }
    const mins = Math.floor(diff / 60);
    if (mins < 60) {
      return `${mins} minute${mins === 1 ? "" : "s"} ago`;
    }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) {
      return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    }
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  let now = $state(Date.now());
  const text = $derived(relativeTime(date, now));

  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now();
    }, 10_000);
    return () => clearInterval(interval);
  });
</script>

<span class="relative-time" title={exactTimestamp}>{text}</span>

<style>
  .relative-time {
    border-bottom: 1px dashed var(--text-dim);
    cursor: help;
  }
</style>
