<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Engine } from "@snapengine-asset-base/svelte";
  import SvgLine from "$lib/SvgLine.svelte";
  import { ElementObject } from "@snapline/object";
  import type { Engine as EngineType } from "@snapline/index";
  import type {
    pointerDownProp,
    pointerMoveProp,
    pointerUpProp,
    dragStartProp,
    dragProp,
    dragEndProp,
  } from "@snapline/input";
  import mouseIconSvg from "$lib/assets/icons/mouse.svg?raw";
  import penIconSvg from "$lib/assets/icons/vector-pen.svg?raw";
  import handIconSvg from "$lib/assets/icons/hand-index.svg?raw";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  type PanelId = "mouse" | "pen" | "touch";

  type PanelTemplate = {
    id: PanelId;
    label: string;
    helper: string;
    accent: string;
  };

  type PanelInstance = PanelTemplate & {
    element: HTMLDivElement | null;
    object: ElementObject | null;
  };

  const PANEL_PRESETS: PanelTemplate[] = [
    {
      id: "mouse",
      label: "Mouse",
      helper: "Desktop cursor + wheel",
      accent: "var(--color-secondary-1)",
    },
    {
      id: "pen",
      label: "Pen",
      helper: "Pressure + tilt aware",
      accent: "var(--color-secondary-4)",
    },
    {
      id: "touch",
      label: "Touch",
      helper: "Gestures + inertia",
      accent: "var(--color-secondary-3)",
    },
  ];

  const PANEL_ICONS: Record<PanelId, string> = {
    mouse: mouseIconSvg,
    pen: penIconSvg,
    touch: handIconSvg,
  };

  type Viewport = { minX: number; minY: number; width: number; height: number };

  const EVENT_LINE_VIEWPORT_FALLBACK: Viewport = {
    minX: 0,
    minY: 0,
    width: 300,
    height: 140,
  };

  type EventLineConfig = {
    id: PanelId;
    fixedRatio: number;
    fallbackRatio: number;
  };

  type EventLine = {
    id: PanelId;
    stroke: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
  };

  const EVENT_LINE_COLOR = "#AAAAAA";

  const EVENT_LINE_CONFIG: EventLineConfig[] = [
    {
      id: "mouse",
      fixedRatio: 0.165,
      fallbackRatio: 0.12,
    },
    {
      id: "pen",
      fixedRatio: 0.5,
      fallbackRatio: 0.5,
    },
    {
      id: "touch",
      fixedRatio: 0.835,
      fallbackRatio: 0.88,
    },
  ];

  let eventLineViewport = $state<Viewport>(EVENT_LINE_VIEWPORT_FALLBACK);
  let eventLines = $state<EventLine[]>(createDefaultLines());
  let eventArrowsRef: HTMLDivElement | null = null;
  let eventPanelRef: HTMLDivElement | null = null;
  let panelGridRef: HTMLDivElement | null = null;
  let panelGridObserver: ResizeObserver | null = null;

  let panels: PanelInstance[] = PANEL_PRESETS.map((panel) => ({
    ...panel,
    element: null,
    object: null,
  }));
  let engine: EngineType | null = $state(null);
  let canvasComponent: Engine | null = null;
  let pointer = $state({ x: 0.5, y: 0.5 });
  let activePanel: PanelId | null = $state(null);
  let isInteracting = $state(false);
  let demoInitialized = $state(false);
  let panelElementsVersion = $state(0);
  type EventKind =
    | "pointerDown"
    | "pointerMove"
    | "pointerUp"
    | "dragStart"
    | "drag"
    | "dragEnd";
  let lastEvent = $state<string | null>(null);
  let dragActive = $state(false);
  let linesGlowing = $state(false);
  let glowTimeout: ReturnType<typeof setTimeout> | null = null;

  function clamp(value: number, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function updatePointerFromScreen(
    panel: PanelInstance,
    screenX: number,
    screenY: number,
  ) {
    const rect = panel.element?.getBoundingClientRect();
    if (!rect) return;
    pointer = {
      x: clamp((screenX - rect.left) / rect.width),
      y: clamp((screenY - rect.top) / rect.height),
    };
    activePanel = panel.id;
    // isInteracting = true;
  }

  function triggerLineGlow() {
    linesGlowing = true;
    if (glowTimeout) {
      clearTimeout(glowTimeout);
    }
    glowTimeout = setTimeout(() => {
      linesGlowing = false;
      glowTimeout = null;
    }, 200);
  }

  function recordEvent(
    kind: EventKind,
    panel: PanelInstance,
    button: number,
    x: number,
    y: number,
  ) {
    if (kind === "dragStart") {
      dragActive = true;
    } else if (kind === "dragEnd") {
      dragActive = false;
    }
    if (dragActive && kind === "pointerMove") {
      return;
    }
    lastEvent = `${kind}(x = ${x.toFixed(1)}, y = ${y.toFixed(1)}, btn = ${button})`;
    triggerLineGlow();
  }

  function handlePointerDown(panel: PanelInstance, prop: pointerDownProp) {
    isInteracting = true;
    updatePointerFromScreen(
      panel,
      prop.position.screenX,
      prop.position.screenY,
    );
    recordEvent(
      "pointerDown",
      panel,
      prop.button,
      prop.position.x,
      prop.position.y,
    );
  }

  function handlePointerMove(panel: PanelInstance, prop: pointerMoveProp) {
    updatePointerFromScreen(
      panel,
      prop.position.screenX,
      prop.position.screenY,
    );
    recordEvent(
      "pointerMove",
      panel,
      prop.button,
      prop.position.x,
      prop.position.y,
    );
  }

  function handlePointerUp(panel: PanelInstance, prop: pointerUpProp) {
    isInteracting = false;
    dragActive = false;
    recordEvent(
      "pointerUp",
      panel,
      prop.button,
      prop.position.x,
      prop.position.y,
    );
  }

  function handleDragStart(panel: PanelInstance, prop: dragStartProp) {
    recordEvent("dragStart", panel, prop.button, prop.start.x, prop.start.y);
  }

  function handleDrag(panel: PanelInstance, prop: dragProp) {
    recordEvent("drag", panel, prop.button, prop.position.x, prop.position.y);
  }

  function handleDragEnd(panel: PanelInstance, prop: dragEndProp) {
    recordEvent("dragEnd", panel, prop.button, prop.end.x, prop.end.y);
  }

  function handlePointerLeave() {
    // When cursor leaves the panels, move cursor to vertical center
    pointer = { x: 0.5, y: 0.5 };
    isInteracting = false;
    activePanel = null;
  }

  function attachPanel(panel: PanelInstance, currentEngine: EngineType) {
    if (panel.object || !panel.element) return;
    panel.object = new ElementObject(currentEngine, null);
    panel.object.element = panel.element;
    panel.object.event.input.pointerDown = (prop: pointerDownProp) =>
      handlePointerDown(panel, prop);
    panel.object.event.input.pointerMove = (prop: pointerMoveProp) =>
      handlePointerMove(panel, prop);
    panel.object.event.input.pointerUp = (prop: pointerUpProp) =>
      handlePointerUp(panel, prop);
    panel.object.event.input.dragStart = (prop: dragStartProp) =>
      handleDragStart(panel, prop);
    panel.object.event.input.drag = (prop: dragProp) => handleDrag(panel, prop);
    panel.object.event.input.dragEnd = (prop: dragEndProp) =>
      handleDragEnd(panel, prop);
  }

  function initializeDemo(currentEngine: EngineType) {
    if (demoInitialized) return;
    const ready = panels.every((panel) => panel.element);
    if (!ready) return;
    for (const panel of panels) {
      attachPanel(panel, currentEngine);
    }
    demoInitialized = true;
  }

  onMount(() => {
    if (engine && !demoInitialized) {
      initializeDemo(engine);
    }
  });

  $effect(() => {
    panelElementsVersion;
    if (engine && !demoInitialized) {
      initializeDemo(engine);
    }
  });

  onDestroy(() => {
    for (const panel of panels) {
      if (panel.object) {
        panel.object.event.input.pointerDown = null;
        panel.object.event.input.pointerMove = null;
        panel.object.event.input.pointerUp = null;
        panel.object.event.input.dragStart = null;
        panel.object.event.input.drag = null;
        panel.object.event.input.dragEnd = null;
        panel.object = null;
      }
      panel.element = null;
    }
    cleanupPanelGridObserver();
    if (glowTimeout) {
      clearTimeout(glowTimeout);
      glowTimeout = null;
    }
  });

  function registerPanel(node: HTMLElement, panel: PanelInstance) {
    panel.element = node as HTMLDivElement;
    panelElementsVersion += 1;
    
    // Add pointerleave listener to handle cursor leaving the panel
    const onPointerLeave = () => handlePointerLeave();
    node.addEventListener("pointerleave", onPointerLeave);
    
    return {
      destroy() {
        node.removeEventListener("pointerleave", onPointerLeave);
        if (panel.object) {
          panel.object.event.input.pointerDown = null;
          panel.object.event.input.pointerMove = null;
          panel.object.event.input.pointerUp = null;
          panel.object.event.input.dragStart = null;
          panel.object.event.input.drag = null;
          panel.object.event.input.dragEnd = null;
          panel.object = null;
        }
        panel.element = null;
        panelElementsVersion += 1;
      },
    };
  }

  function buildLine(
    config: EventLineConfig,
    startRatio: number,
    targetRatio: number,
    viewport = eventLineViewport,
  ): EventLine {
    const width = Math.max(1, viewport.width);
    const height = Math.max(1, viewport.height);
    const startX = startRatio * width;
    const targetX = targetRatio * width;
    const elbowBase = height * 0.6;
    const elbowY = clamp(elbowBase, 0, height);

    return {
      id: config.id,
      stroke: EVENT_LINE_COLOR,
      x1: startX,
      y1: 0,
      x2: startX,
      y2: elbowY,
      x3: targetX,
      y3: elbowY,
      x4: targetX,
      y4: height,
    };
  }

  function createDefaultLines(
    targetRatio = 0.5,
    viewport = EVENT_LINE_VIEWPORT_FALLBACK,
  ) {
    return EVENT_LINE_CONFIG.map((config) =>
      buildLine(
        config,
        config.fixedRatio ?? config.fallbackRatio,
        targetRatio,
        viewport,
      ),
    );
  }

  function resolveStartRatio(
    config: EventLineConfig,
    arrowsRect: DOMRect,
    panelGridRect?: DOMRect,
  ) {
    const fallback = config.fixedRatio ?? config.fallbackRatio;
    if (!panelGridRect || !panelGridRect.width) {
      return fallback;
    }

    const normalizedRatio = clamp(fallback, 0, 1);
    const panelOffset = panelGridRect.left - arrowsRect.left;
    const absoluteStartX = panelOffset + panelGridRect.width * normalizedRatio;
    if (!arrowsRect.width) {
      return fallback;
    }
    return clamp(absoluteStartX / arrowsRect.width, 0, 1);
  }

  function updateEventLines() {
    if (typeof window === "undefined") {
      eventLines = createDefaultLines();
      return;
    }

    if (!eventArrowsRef) {
      eventLineViewport = EVENT_LINE_VIEWPORT_FALLBACK;
      eventLines = createDefaultLines();
      return;
    }

    const arrowsRect = eventArrowsRef.getBoundingClientRect();
    if (!arrowsRect.width || !arrowsRect.height) {
      eventLineViewport = EVENT_LINE_VIEWPORT_FALLBACK;
      eventLines = createDefaultLines();
      return;
    }

    const viewport = {
      minX: 0,
      minY: 0,
      width: arrowsRect.width,
      height: arrowsRect.height,
    } as const;
    eventLineViewport = viewport;

    const panelGridRect = panelGridRef?.getBoundingClientRect();
    const eventPanelRect = eventPanelRef?.getBoundingClientRect();
    const eventPanelCenter = eventPanelRect
      ? eventPanelRect.left + eventPanelRect.width / 2
      : arrowsRect.left + arrowsRect.width / 2;
    const eventPanelRatio = clamp(
      (eventPanelCenter - arrowsRect.left) / arrowsRect.width,
    );

    eventLines = EVENT_LINE_CONFIG.map((config) => {
      const startRatio = resolveStartRatio(config, arrowsRect, panelGridRect);
      return buildLine(config, startRatio, eventPanelRatio, viewport);
    });
  }

  onMount(() => {
    const handleResize = () => updateEventLines();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
    }
    updateEventLines();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  });

  $effect(() => {
    panelElementsVersion;
    updateEventLines();
  });

  function cleanupPanelGridObserver() {
    if (panelGridObserver) {
      panelGridObserver.disconnect();
      panelGridObserver = null;
    }
  }

  $effect(() => {
    eventArrowsRef;
    eventPanelRef;
    updateEventLines();
  });

  $effect(() => {
    const node = panelGridRef;
    cleanupPanelGridObserver();
    if (!node || typeof ResizeObserver === "undefined") {
      updateEventLines();
      return;
    }

    const observer = new ResizeObserver(() => updateEventLines());
    panelGridObserver = observer;
    observer.observe(node);
    updateEventLines();

    return () => {
      observer.disconnect();
      if (panelGridObserver === observer) {
        panelGridObserver = null;
      }
    };
  });
</script>

<HighlightCardShell
  className="input-handling-card theme-secondary-5"
  title="Input Handling"
  description="Common API for multiple types of input devices."
>
  <div class="pointer-demo-wrapper">
    <Engine id="input-handling-sync" bind:engine bind:this={canvasComponent} debug={debugState.enabled}>
      <div class="pointer-surface">
        <div
          class="panel-grid"
          aria-label="Synced input devices"
          bind:this={panelGridRef}
        >
          {#each panels as panel (panel.id)}
            <div class="pointer-slot slot">
              <div
                class={`pointer-panel card ${panel.id} ${activePanel === panel.id ? "active" : ""}`}
                style={`--panel-accent: ${panel.accent};`}
                use:registerPanel={panel}
              >
                <header>
                  <span class="panel-label">{panel.label}</span>
                  <!-- <span class="panel-helper">{panel.helper}</span> -->
                </header>

                <div
                  class={`cursor ${isInteracting ? "live" : ""}`}
                  style={`left: ${pointer.x * 100}%; top: ${pointer.y * 100}%;`}
                  aria-hidden="true"
                >
                  <span class="cursor-icon" aria-hidden="true">
                    {@html PANEL_ICONS[panel.id]}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
        <div class="event-arrows" aria-hidden="true" bind:this={eventArrowsRef}>
          {#each eventLines as line (line.id)}
            <SvgLine
              className={`event-line ${line.id} ${linesGlowing ? "glow" : ""}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              x3={line.x3}
              y3={line.y3}
              x4={line.x4}
              y4={line.y4}
              stroke={line.stroke}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              padding={0}
              cornerRadius={18}
              viewport={eventLineViewport}
              ariaHidden={true}
              ariaLabel={`${line.id} input event path`}
            />
          {/each}
        </div>
        <div
          class="card ground event-panel"
          aria-live="polite"
          bind:this={eventPanelRef}
        >
          {#if lastEvent}
            <p class="event-line">{lastEvent}</p>
          {:else}
            <p class="empty">Interact with any panel to stream events.</p>
          {/if}
        </div>
      </div>
    </Engine>
  </div>
</HighlightCardShell>

<style lang="scss">
  .pointer-demo-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0;
    align-items: stretch;
    padding: var(--size-24);
  }

  :global(.pointer-demo-wrapper #snap-canvas) {
    overflow: visible !important;
  }

  .pointer-surface {
    width: 100%;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--size-16);
  }

  .pointer-slot {
    overflow: hidden;
  }

  .pointer-panel {
    position: relative;
    min-height: 150px;
    padding: var(--size-24);
    cursor: none;
  }

  .pointer-panel header {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(58, 42, 34, 0.78);
  }

  .panel-label {
    font-weight: 600;
    color: #a3a1a0;
    letter-spacing: 2px;
    font-size: 0.7rem;
  }

  .panel-helper {
    font-size: 0.65rem;
    color: rgba(58, 42, 34, 0.65);
  }

  .cursor {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    color: var(--panel-accent);
    filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15));
    
    &.live {
      transform: translate(-50%, -50%) scale(0.9);
    }
  }

  .cursor-icon {
    display: block;
    line-height: 0;
  }

  .cursor-icon :global(svg) {
    width: 20px;
    height: 20px;
    display: block;
  }

  .event-arrows {
    position: relative;
    width: 100%;
    max-width: 100%;
    height: 80px;
    align-self: stretch;
    margin: 0;
    pointer-events: none;
  }

  .event-arrows :global(.event-line) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.95;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.08));
    transition:
      filter 0.25s ease,
      opacity 0.3s ease;
  }

  // .event-arrows :global(.event-line.glow) {
  //   filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.4))
  //     drop-shadow(0 0 18px rgba(0, 0, 0, 0.25));
  //   animation: event-line-glow 0.2s ease-out;
  // }

  .event-panel {
    align-self: center;
    // background: #fff;
    --card-color: #181a1d;

    p {
      margin: 0;
      font-family: "Geist Pixel Circle", "Doto", monospace;
      font-weight: 900;
      font-size: 12px;
      color: #ffffff;
      white-space: nowrap;
      max-width: clamp(220px, 60vw, 360px);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @keyframes event-line-glow {
    0% {
      opacity: 1;
    }
    30% {
      opacity: 1;
    }
    100% {
      opacity: 0.55;
    }
  }

  @media (max-width: 720px) {
    // .panel-grid {
    //   grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    //   gap: 0.4rem;
    // }

    .pointer-demo-wrapper {
      padding: var(--size-24);
    }

    .pointer-panel {
      min-height: 125px;
      padding: 0.55rem;
    }

    .event-arrows {
      height: 70px;
      width: 100%;
    }

    .event-panel {
      padding: 0.5rem 0.9rem;
      flex-direction: column;
      text-align: center;
      gap: 0.35rem;
      margin-top: 0.65rem;
    }

    .event-panel .event-line,
    .event-panel .empty {
      max-width: 100%;
      white-space: normal;
    }
  }
</style>
