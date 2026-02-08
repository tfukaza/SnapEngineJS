<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Engine } from "@snap-engine/base-svelte";
  import { ElementObject } from "@snapline/object";
  import type { Engine as EngineType } from "@snapline/index";
  import type { dragProp, dragStartProp, dragEndProp } from "@snapline/input";
  import { debugState } from "$lib/landing/debugState.svelte";

  interface DragLine {
    id: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    color: string;
    finishedAt?: number;
  }
 
  interface AreaTemplate {
    name: string;
    color: string;
    gridArea: string;
  }

  interface AreaConfig extends AreaTemplate {
    element?: HTMLDivElement | null;
    object?: ElementObject | null;
  }

  const AREA_PRESETS: AreaTemplate[] = [

    { name: "North West", color: "#FE938C", gridArea: "1 / 1 / 2 / 2" },
    { name: "North East", color: "#F9C80E", gridArea: "1 / 2 / 2 / 3" },
    { name: "South West", color: "#55C1FF", gridArea: "2 / 1 / 3 / 2" },
    { name: "South East", color: "#BFA4FF", gridArea: "2 / 2 / 3 / 3" }
  ];

  let areas: AreaConfig[] = AREA_PRESETS.map((area) => ({ ...area }));

  let engine: EngineType | null = $state(null);
  let canvasComponent: Engine | null = null;
  let demoInitialized = $state(false);

  let activeLines: Record<string, DragLine> = $state({});
  let finishedLines: DragLine[] = $state([]);

  const FINISHED_LINE_LIFETIME = 4000;
  const MAX_FINISHED_LINES = 12;
  const BACKGROUND_LINE_COLOR = "#111111";

  let cleanupTimer: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let containerElement: HTMLDivElement | null = null;
  let backgroundObject: ElementObject | null = null;
  let overlayWidth = $state(0);
  let overlayHeight = $state(0);

  function round(value: number) {
    return Math.round(value * 10) / 10;
  }

  function attachArea(area: AreaConfig) {
    if (!area.object) return;
    area.object.event.input.dragStart = (prop: dragStartProp) => handleDragStart(area, prop);
    area.object.event.input.drag = (prop: dragProp) => handleDrag(prop);
    area.object.event.input.dragEnd = (prop: dragEndProp) => handleDragEnd(prop);
  }

  function handleDragStart(area: AreaConfig, prop: dragStartProp) {
    const line: DragLine = {
      id: prop.pointerId.toString(),
      startX: round(prop.start.x),
      startY: round(prop.start.y),
      currentX: round(prop.start.x),
      currentY: round(prop.start.y),
      color: area.color
    };
    activeLines[line.id] = line;
  }

  function handleDrag(prop: dragProp) {
    const line = activeLines[prop.pointerId];
    if (!line) return;
    line.currentX = round(prop.position.x);
    line.currentY = round(prop.position.y);
  }

  function handleDragEnd(prop: dragEndProp) {
    const line = activeLines[prop.pointerId];
    if (!line) return;
    line.currentX = round(prop.end.x);
    line.currentY = round(prop.end.y);
    line.finishedAt = Date.now();
    finishedLines = [...finishedLines.slice(-MAX_FINISHED_LINES + 1), line];
    delete activeLines[prop.pointerId];
  }

  function isPointInsideAnyArea(screenX: number, screenY: number) {
    for (const area of areas) {
      const rect = area.element?.getBoundingClientRect();
      if (!rect) continue;
      if (
        screenX >= rect.left &&
        screenX <= rect.right &&
        screenY >= rect.top &&
        screenY <= rect.bottom
      ) {
        return true;
      }
    }
    return false;
  }

  function handleBackgroundDragStart(prop: dragStartProp) {
    if (isPointInsideAnyArea(prop.start.screenX, prop.start.screenY)) {
      return;
    }
    const line: DragLine = {
      id: prop.pointerId.toString(),
      startX: round(prop.start.x),
      startY: round(prop.start.y),
      currentX: round(prop.start.x),
      currentY: round(prop.start.y),
      color: BACKGROUND_LINE_COLOR
    };
    activeLines[line.id] = line;
  }

  function initializeDemo(currentEngine: EngineType) {
    if (demoInitialized || !containerElement) return;

    for (const area of areas) {
      if (!area.element) continue;
      area.object = new ElementObject(currentEngine, null);
      area.object.element = area.element;
      attachArea(area);
    }

    backgroundObject = new ElementObject(currentEngine, null);
    backgroundObject.element = containerElement;
    backgroundObject.event.input.dragStart = handleBackgroundDragStart;
    backgroundObject.event.input.drag = handleDrag;
    backgroundObject.event.input.dragEnd = handleDragEnd;

    setupResizeObserver();
    cleanupTimer = window.setInterval(pruneFinishedLines, 800);
    demoInitialized = true;
  }

  function pruneFinishedLines() {
    const cutoff = Date.now() - FINISHED_LINE_LIFETIME;
    finishedLines = finishedLines.filter((line) => (line.finishedAt ?? 0) > cutoff);
  }

  function setupResizeObserver() {
    if (!containerElement) return;
    overlayWidth = containerElement.clientWidth;
    overlayHeight = containerElement.clientHeight;

    resizeObserver?.disconnect();
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        overlayWidth = entry.contentRect.width;
        overlayHeight = entry.contentRect.height;
      }
    });
    resizeObserver.observe(containerElement);
  }

  onMount(() => {
    if (engine && containerElement && !demoInitialized) {
      initializeDemo(engine);
    }
  });

  $effect(() => {
    if (engine && containerElement && !demoInitialized) {
      initializeDemo(engine);
    }
  });

  onDestroy(() => {
    resizeObserver?.disconnect();
    if (cleanupTimer) {
      window.clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
    for (const area of areas) {
      if (area.object) {
        area.object.event.input.dragStart = undefined as unknown as typeof area.object.event.input.dragStart;
        area.object.event.input.drag = undefined as unknown as typeof area.object.event.input.drag;
        area.object.event.input.dragEnd = undefined as unknown as typeof area.object.event.input.dragEnd;
        area.object = null;
      }
    }
    if (backgroundObject) {
      backgroundObject.event.input.dragStart = null;
      backgroundObject.event.input.drag = null;
      backgroundObject.event.input.dragEnd = null;
      backgroundObject = null;
    }
    demoInitialized = false;
  });

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<Engine id="input-engine-demo" bind:engine={engine} bind:this={canvasComponent} debug={debugState.enabled}>
  <div class="input-engine-demo card" bind:this={containerElement}>
    {#if overlayWidth && overlayHeight}
      <svg
        class="line-overlay"
        width={overlayWidth}
        height={overlayHeight}
        viewBox={`0 0 ${overlayWidth} ${overlayHeight}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {#each finishedLines as line (line.id + (line.finishedAt ?? 0))}
          <line
            x1={line.startX}
            y1={line.startY}
            x2={line.currentX}
            y2={line.currentY}
            class="line faded"
            style={`stroke: ${line.color};`}
          />
        {/each}
        {#each Object.values(activeLines) as line (line.id)}
          <line
            x1={line.startX}
            y1={line.startY}
            x2={line.currentX}
            y2={line.currentY}
            class="line active"
            style={`stroke: ${line.color};`}
          />
        {/each}
      </svg>
    {/if}



    <div class="area-grid">
      {#each areas as area (area.name)}
        <div
          class="area"
          style={`grid-area: ${area.gridArea};`}
          bind:this={area.element}
        >
          <span class="color-dot" style={`background-color: ${area.color};`}></span>
          <!-- <p>{area.name}</p> -->
        </div>
      {/each}
    </div>
  </div>
</Engine>

<style lang="scss">
  .input-engine-demo {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 100%;
    padding: 0;
  }

  .line-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }

  .line {
    stroke-width: 3;
    stroke-linecap: round;
  }

  .line.faded {
    opacity: 0.35;
  }

  .area-grid {
    position: relative;
    z-index: 2;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: clamp(1.25rem, 3vw, 2.5rem);
    padding: clamp(1.5rem, 4vw, 3rem);
    box-sizing: border-box;
  }

  .area {
    position: relative;
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: calc(var(--ui-radius) - 2px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(0.75rem, 1.5vw, 1.25rem);
    cursor: pointer;
    user-select: none;
    background: rgba(255, 255, 255, 0.9);


    p {
      margin: 0;
      font-size: 0.9rem;
      font-weight: 600;
      text-align: center;
      line-height: 1.4;
    }
  }

  .color-dot {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 50%;

  }

</style>
