<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import Canvas from "../../../../../../svelte/src/lib/Canvas.svelte";
  import SvgLine from "../../../SvgLine.svelte";
  import { ElementObject } from "../../../../../../../src/object";
  import type { Engine } from "../../../../../../../src/index";
  import type {
    pointerDownProp,
    pointerMoveProp,
    pointerUpProp,
    dragStartProp,
    dragProp,
    dragEndProp
  } from "../../../../../../../src/input";
  import mouseIconSvg from "../../../assets/icons/mouse.svg?raw";
  import penIconSvg from "../../../assets/icons/vector-pen.svg?raw";
  import handIconSvg from "../../../assets/icons/hand-index.svg?raw";

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
    { id: "mouse", label: "Mouse", helper: "Desktop cursor + wheel", accent: "var(--color-secondary-1)" },
    { id: "pen", label: "Pen", helper: "Pressure + tilt aware", accent: "var(--color-secondary-4)" },
    { id: "touch", label: "Touch", helper: "Gestures + inertia", accent: "var(--color-secondary-3)" }
  ];

  const PANEL_ICONS: Record<PanelId, string> = {
    mouse: mouseIconSvg,
    pen: penIconSvg,
    touch: handIconSvg
  };

  type EventLine = {
    id: PanelId;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    x3: number;
    y3: number;
    x4: number;
    y4: number;
    stroke: string;
  };

  const EVENT_LINE_VIEWPORT = { minX: 0, minY: 0, width: 300, height: 140 } as const;

  const EVENT_LINES: EventLine[] = [
    {
      id: "mouse",
      x1: 30,
      y1: 15,
      x2: 30,
      y2: 80,
      x3: 150,
      y3: 80,
      x4: 150,
      y4: 125,
      stroke: "var(--color-secondary-7)"
    },
    {
      id: "pen",
      x1: 150,
      y1: 15,
      x2: 210,
      y2: 35,
      x3: 170,
      y3: 90,
      x4: 150,
      y4: 125,
      stroke: "var(--color-secondary-6)"
    },
    {
      id: "touch",
      x1: 270,
      y1: 15,
      x2: 270,
      y2: 85,
      x3: 150,
      y3: 85,
      x4: 150,
      y4: 125,
      stroke: "var(--color-secondary-3)"
    }
  ];

  let panels: PanelInstance[] = PANEL_PRESETS.map((panel) => ({ ...panel, element: null, object: null }));
  let engine: Engine | null = $state(null);
  let canvasComponent: Canvas | null = null;
  let pointer = $state({ x: 0.5, y: 0.5 });
  let activePanel: PanelId | null = $state(null);
  let isInteracting = $state(false);
  let demoInitialized = $state(false);
  let panelElementsVersion = $state(0);
  type EventKind = "pointerDown" | "pointerMove" | "pointerUp" | "dragStart" | "drag" | "dragEnd";
  let lastEvent = $state<string | null>(null);
  let dragActive = $state(false);

  function clamp(value: number, min = 0, max = 1) {
    return Math.max(min, Math.min(max, value));
  }

  function updatePointerFromScreen(panel: PanelInstance, screenX: number, screenY: number) {
    const rect = panel.element?.getBoundingClientRect();
    if (!rect) return;
    pointer = {
      x: clamp((screenX - rect.left) / rect.width),
      y: clamp((screenY - rect.top) / rect.height)
    };
    activePanel = panel.id;
    isInteracting = true;
  }

  function recordEvent(kind: EventKind, panel: PanelInstance, button: number, x: number, y: number) {
    if (kind === "dragStart") {
      dragActive = true;
    } else if (kind === "dragEnd") {
      dragActive = false;
    }
    if (dragActive && kind === "pointerMove") {
      return;
    }
    lastEvent = `${kind}(x = ${x.toFixed(1)}, y = ${y.toFixed(1)}, btn = ${button})`;
  }

  function handlePointerDown(panel: PanelInstance, prop: pointerDownProp) {
    updatePointerFromScreen(panel, prop.position.screenX, prop.position.screenY);
    recordEvent("pointerDown", panel, prop.button, prop.position.x, prop.position.y);
  }

  function handlePointerMove(panel: PanelInstance, prop: pointerMoveProp) {
    updatePointerFromScreen(panel, prop.position.screenX, prop.position.screenY);
    recordEvent("pointerMove", panel, prop.button, prop.position.x, prop.position.y);
  }

  function handlePointerUp(panel: PanelInstance, prop: pointerUpProp) {
    isInteracting = false;
    dragActive = false;
    recordEvent("pointerUp", panel, prop.button, prop.position.x, prop.position.y);
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

  function attachPanel(panel: PanelInstance, currentEngine: Engine) {
    if (panel.object || !panel.element) return;
    panel.object = new ElementObject(currentEngine, null);
    panel.object.element = panel.element;
    panel.object.event.input.pointerDown = (prop: pointerDownProp) => handlePointerDown(panel, prop);
    panel.object.event.input.pointerMove = (prop: pointerMoveProp) => handlePointerMove(panel, prop);
    panel.object.event.input.pointerUp = (prop: pointerUpProp) => handlePointerUp(panel, prop);
    panel.object.event.input.dragStart = (prop: dragStartProp) => handleDragStart(panel, prop);
    panel.object.event.input.drag = (prop: dragProp) => handleDrag(panel, prop);
    panel.object.event.input.dragEnd = (prop: dragEndProp) => handleDragEnd(panel, prop);
  }

  function initializeDemo(currentEngine: Engine) {
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
  });

  function registerPanel(node: HTMLElement, panel: PanelInstance) {
    panel.element = node as HTMLDivElement;
    panelElementsVersion += 1;
    return {
      destroy() {
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
      }
    };
  }
</script>

<HighlightCardShell className="input-handling-card theme-secondary-5">
  <h3>Input Handling</h3>
  <p>
    Common API for multiple types of input devices.
  </p>

  <div class="pointer-demo-wrapper">
    <Canvas id="input-handling-sync" bind:engine={engine} bind:this={canvasComponent}>
      <div class="pointer-surface">
        <div class="panel-grid" aria-label="Synced input devices">
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
            </div></div>
          {/each}
        </div>
        <div class="event-arrows" aria-hidden="true">
          {#each EVENT_LINES as line (line.id)}
            <SvgLine
              className={`event-line ${line.id}`}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              x3={line.x3}
              y3={line.y3}
              x4={line.x4}
              y4={line.y4}
              stroke={line.stroke}
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              padding={0}
              cornerRadius={18}
              viewport={EVENT_LINE_VIEWPORT}
              ariaHidden={true}
              ariaLabel={`${line.id} input event path`}
            />
          {/each}
        </div>
        <div class="card event-panel" aria-live="polite">
         
          {#if lastEvent}
            <p class="event-line">{lastEvent}</p>
          {:else}
            <p class="empty">Interact with any panel to stream events.</p>
          {/if}
        </div>
      </div>
    </Canvas>
  </div>
</HighlightCardShell>

<style lang="scss">
  .pointer-demo-wrapper {
    margin-top: 1rem;
  }

  :global(.pointer-demo-wrapper #snap-canvas) {
    overflow: visible!important;
  }

  .pointer-surface {
    border: 1px solid #e6e3e2;
    background-color: var(--color-background);
    border-radius: var(--ui-radius);
    display: flex;
    flex-direction: column;
    gap: var(--size-12);
    align-items: stretch;
    padding: clamp(1rem, 2.5vw, 1.5rem);
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
    padding: 0.65rem;
    border-radius: var(--ui-radius);
    // background: #ffffff;
    border: 1px solid rgba(58, 42, 34, 0.14);
    // overflow: hidden;
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
    // color: var(--panel-accent);
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
  }

  .cursor.live {
    transform: translate(-50%, -50%) scale(1.05);
  }

  .cursor-icon {
    display: block;
    line-height: 0;
  }

  .cursor-icon :global(svg) {
    width: 28px;
    height: 28px;
    display: block;
  }

  .event-arrows {
    position: relative;
    width: clamp(260px, 80%, 420px);
    height: 90px;
    align-self: center;
    margin: -0.35rem 0 -0.25rem;
    pointer-events: none;
  }

  .event-arrows :global(.event-line) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0.95;
    filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.08));
  }

  .event-panel {
    align-self: center;
    background: #fff;
   
  }

  .event-panel .event-line {
    margin: 0;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.85rem;
    color: #433832;
    white-space: nowrap;
    max-width: clamp(220px, 60vw, 360px);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-panel .empty {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(58, 42, 34, 0.6);
    white-space: nowrap;
  }

  @media (max-width: 720px) {
    .panel-grid {
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.4rem;
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
    }

    .event-panel .event-line,
    .event-panel .empty {
      max-width: 100%;
      white-space: normal;
    }

  }
</style>
