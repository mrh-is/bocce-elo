<script lang="ts">
  import "../app.css";
  import BocceBackground from "$lib/components/BocceBackground.svelte";
  const { children } = $props();
</script>

<div class="layout">
  <BocceBackground />
  {@render children()}
</div>
