<script lang="ts">
  import type { LineComponent } from "../../../../../../src/index";
  import { onMount } from "svelte";
  import SvgLine from "../../SvgLine.svelte";

  let { line }: { line: LineComponent } = $props();

  let style = $state(
    "position: absolute; overflow: visible; pointer-events: none; will-change: transform; transform: translate3d(0px, 0px, 0);"
  );
  let dx = $state(0);
  let dy = $state(0);
  let x0 = $state(0);
  let y0 = $state(0);

  // Get color from source connector
  let strokeColor = $derived((line.start as any).lineColor || "var(--color-primary)");

  let elbowX = $derived(dx / 2 + dy / 8);

  function renderLine() {
    const thisLine: LineComponent = line;
    x0 = thisLine.transform.x;
    y0 = thisLine.transform.y;
    style = `position: absolute; overflow: visible; pointer-events: none; will-change: transform; transform: translate3d(${x0}px, ${y0}px, 0);`;
    dx = thisLine.endWorldX - thisLine.transform.x;
    dy = thisLine.endWorldY - thisLine.transform.y;
  }

  let lineDOM: HTMLElement | null = null;

  onMount(() => {
    line.element = lineDOM as HTMLElement;
    line.callback.afterWrite2 = renderLine;
  });
</script>

<div
  data-snapline-type="emoji-connector-line"
  style={style}
  bind:this={lineDOM}
  class="emoji-line-wrapper"
>
  <SvgLine
    x1={0}
    y1={0}
    x2={elbowX}
    y2={0}
    x3={elbowX}
    y3={dy}
    x4={dx}
    y4={dy}
    stroke={strokeColor}
    strokeWidth={3}
    cornerRadius={3}
  />
</div>

<style>
  .emoji-line-wrapper {
    z-index: 1000;
    transform:translateX(-5px) !important;
    /* z-index: -1; */
  }

  .emoji-line-wrapper :global(svg) {
    overflow: visible;
    position: absolute;
    transform: none !important;
    top: 50%;
    /* z-index: -1; */

  }
</style>
