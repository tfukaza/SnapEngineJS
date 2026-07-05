<script lang="ts">
  let {
    debugLayout,
    onToggle,
  }: {
    debugLayout: boolean;
    onToggle: () => void;
  } = $props();
</script>

<div class="debug-layout-toolbar">
  <button
    class:enabled={debugLayout}
    type="button"
    role="switch"
    aria-checked={debugLayout}
    onclick={onToggle}
  >
    <span class="debug-layout-switch" aria-hidden="true">
      <span></span>
    </span>
    <span>Debug layout</span>
  </button>

  {#if debugLayout}
    <div class="debug-layout-legend" aria-hidden="true">
      <span><i class="snapshot"></i>Engine</span>
      <span><i class="content"></i>Content</span>
      <span><i class="live"></i>DOM</span>
      <span><i class="candidate"></i>Top 3</span>
      <span><i class="distance"></i>Distance</span>
    </div>
  {/if}
</div>
