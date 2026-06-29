<script lang="ts">
  import "../app.css";
  const { children } = $props();
</script>

<div class="layout">
  {@render children()}
</div>
