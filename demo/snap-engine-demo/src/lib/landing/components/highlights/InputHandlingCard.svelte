<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import Canvas from "../../../../../../svelte/src/lib/Canvas.svelte";
  import { ElementObject } from "../../../../../../../src/object";
  import type { Engine } from "../../../../../../../src/index";
  import type {
    pointerDownProp,
    pointerMoveProp,
    pointerUpProp,
    dragStartProp,
    dragProp,
    dragEndProp,
    mouseWheelProp
  } from "../../../../../../../src/input";

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
    { id: "mouse", label: "Mouse", helper: "Desktop cursor + wheel", accent: "#7b5bf2" },
    { id: "pen", label: "Pen", helper: "Pressure + tilt aware", accent: "#ff7a18" },
    { id: "touch", label: "Touch", helper: "Gestures + inertia", accent: "#10b981" }
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
  let lastWheelEvent = $state<string | null>(null);
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
    lastEvent = `${panel.label} ${kind} → x:${x.toFixed(1)} y:${y.toFixed(1)} btn:${button}`;
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

  function handleMouseWheel(panel: PanelInstance, prop: mouseWheelProp) {
    if (panel.id !== "mouse") return;
    const { position, event } = prop;
    lastWheelEvent = `Wheel Δx:${event.deltaX.toFixed(0)} Δy:${event.deltaY.toFixed(0)} x:${position.x.toFixed(1)} y:${position.y.toFixed(1)}`;
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
    panel.object.event.input.mouseWheel =
      panel.id === "mouse" ? (prop: mouseWheelProp) => handleMouseWheel(panel, prop) : null;
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
        panel.object.event.input.mouseWheel = null;
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
          panel.object.event.input.mouseWheel = null;
          panel.object = null;
        }
        panel.element = null;
        panelElementsVersion += 1;
      }
    };
  }
</script>

<HighlightCardShell className="input-handling-card">
  <h3>Input Handling</h3>
  <p>
    Common API for user input; no need to juggle mousedown, pointerdown, and touchstart.
  </p>

  <div class="pointer-demo-wrapper">
    <Canvas id="input-handling-sync" bind:engine={engine} bind:this={canvasComponent}>
      <div class="pointer-surface">
        <div class="panel-grid" aria-label="Synced input devices">
          {#each panels as panel (panel.id)}
            <div
              class={`pointer-panel ${panel.id} ${activePanel === panel.id ? "active" : ""}`}
              style={`--panel-accent: ${panel.accent};`}
              use:registerPanel={panel}
            >
              <header>
                <span class="panel-label">{panel.label}</span>
                <span class="panel-helper">{panel.helper}</span>
              </header>

              {#if panel.id === "mouse"}
                <div class="wheel-log" aria-live="polite">
                  {#if lastWheelEvent}
                    <span>{lastWheelEvent}</span>
                  {:else}
                    <span class="empty">Scroll to surface wheel events.</span>
                  {/if}
                </div>
              {/if}

              <div
                class={`cursor ${isInteracting ? "live" : ""}`}
                style={`left: ${pointer.x * 100}%; top: ${pointer.y * 100}%;`}
                aria-hidden="true"
              >
                {#if panel.id === "mouse"}
                  <svg viewBox="0 0 32 32" role="img">
                    <path
                      d="M8 2v24l5.5-5.5 3.8 8 4.2-2-3.8-8H24z"
                      fill="currentColor"
                      stroke="white"
                      stroke-width="1.5"
                      stroke-linejoin="round"
                    />
                  </svg>
                {:else if panel.id === "pen"}
                  <svg viewBox="0 0 32 32" role="img">
                    <path
                      d="M6 25l3.5 3.5 8.5-4.5 8-16-4-4-16 8.5z"
                      fill="white"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linejoin="round"
                    />
                    <path d="M21 5l4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                  </svg>
                {:else}
                  <svg viewBox="0 0 32 32" role="img">
                    <path
                      d="M14 4c-1.1 0-2 .9-2 2v10.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V11c0-1.1-.9-2-2-2s-2 .9-2 2v6.8c0 .3-.2.6-.5.7-.5.2-1-.1-1-.6V16c0-1.1-.9-2-2-2s-2 .9-2 2v5c0 3.9 2.3 7.5 5.8 9.1L14 32h6c4.4 0 8-3.6 8-8v-9c0-1.7-1.3-3-3-3-1.2 0-2.2.7-2.7 1.7-.4-.9-1.3-1.7-2.3-1.7-1 0-1.9.6-2.3 1.5V6c0-1.1-.9-2-2-2z"
                      fill="currentColor"
                    />
                  </svg>
                {/if}
              </div>
            </div>
          {/each}
        </div>
        <div class="event-panel" aria-live="polite">
          <header>
            <span>Input Engine stream</span>
            <small>pointer / drag events</small>
          </header>
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

  .pointer-surface {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  .panel-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.15rem;
  }

  .pointer-panel {
    position: relative;
    min-height: 150px;
    padding: 0.65rem;
    border-radius: 0.65rem;
    background: #f6f4f1;
    border: 1px solid rgba(58, 42, 34, 0.14);
    overflow: hidden;
    cursor: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }

  .event-panel {
    background: #f6f4f1;
    border: 1px solid rgba(58, 42, 34, 0.14);
    border-radius: 0.65rem;
    padding: 0.75rem;
    min-height: 110px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .event-panel header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(58, 42, 34, 0.7);
  }

  .event-panel .event-line {
    margin: 0;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    font-size: 0.85rem;
    color: #433832;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .event-panel .empty {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(58, 42, 34, 0.6);
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
    color: var(--panel-accent);
  }

  .panel-helper {
    font-size: 0.65rem;
    color: rgba(58, 42, 34, 0.65);
  }

  .wheel-log {
    position: absolute;
    left: 0.65rem;
    right: 0.65rem;
    bottom: 0.65rem;
    padding: 0.35rem 0.5rem;
    border-radius: 0.45rem;
    background: rgba(255, 255, 255, 0.85);
    border: 1px solid rgba(58, 42, 34, 0.1);
    font-size: 0.72rem;
    font-family: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
    color: #3a2a22;
    display: flex;
    justify-content: space-between;
    gap: 0.25rem;
    pointer-events: none;
  }

  .wheel-log .empty {
    color: rgba(58, 42, 34, 0.6);
  }

  .cursor {
    --cursor-size: 36px;
    position: absolute;
    width: var(--cursor-size);
    height: var(--cursor-size);
    border-radius: 999px;
    border: 2px solid var(--panel-accent);
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
    transform: translate(-50%, -50%) scale(0.88);
    // transition: left 90ms ease, top 90ms ease, transform 160ms ease;
    display: grid;
    place-items: center;
    pointer-events: none;
    color: var(--panel-accent);
  }

  .cursor.live {
    transform: translate(-50%, -50%) scale(1);
  }

  .cursor svg {
    width: 18px;
    height: 18px;
  }

  @media (max-width: 720px) {
    .panel-grid {
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 0.2rem;
    }

    .pointer-panel {
      min-height: 125px;
      padding: 0.55rem;
    }

    .event-panel {
      padding: 0.6rem;
    }

    .cursor {
      --cursor-size: 30px;
    }
  }
</style>
