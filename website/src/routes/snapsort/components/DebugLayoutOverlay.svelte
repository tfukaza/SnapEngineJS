<script lang="ts">
  import type { DebugOverlayRect } from "./debugLayout";

  let {
    debugLayout,
    rects,
  }: {
    debugLayout: boolean;
    rects: DebugOverlayRect[];
  } = $props();
</script>

{#if debugLayout}
  <div class="debug-layout-overlay" aria-hidden="true">
    {#each rects as rect (rect.id)}
      <div
        class={`debug-layout-rect ${rect.kind} ${rect.isContainer ? "container" : "item"}`}
        style={`left: ${rect.x}px; top: ${rect.y}px; width: ${rect.width}px; height: ${rect.height}px; --depth: ${rect.depth};`}
      >
        {#if rect.kind !== "live"}
          <span>{rect.label}</span>
        {/if}
      </div>
    {/each}
  </div>
{/if}
