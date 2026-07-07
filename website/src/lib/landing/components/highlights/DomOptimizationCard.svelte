<script lang="ts">
  import { onDestroy, tick } from "svelte";
  import ClientDemoFrame from "$lib/components/ClientDemoFrame.svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { AnimationObject } from "@snapline/animation";
  import type { Engine as EngineType } from "@snapline/index";
  import { debugState } from "$lib/landing/debugState.svelte";

  type OperationType = "read" | "write" | "reflow";

  type Operation = {
    id: string;
    type: OperationType;
    label: string;
    meta: string;
  };

  type OperationRect = {
    x: number;
    y: number;
  };

  const TRANSITION_DURATION = 520;
  const baselineOperations: Operation[] = [
    {
      id: "read-bounds",
      type: "read",
      label: "getBoundingClientRect",
      meta: "R",
    },
    {
      id: "write-width",
      type: "write",
      label: "style.width = ...",
      meta: "W",
    },
    {
      id: "baseline-reflow-width",
      type: "reflow",
      label: "forced reflow",
      meta: "layout",
    },
    {
      id: "read-style",
      type: "read",
      label: "getComputedStyle",
      meta: "R",
    },
    {
      id: "write-height",
      type: "write",
      label: "style.height = ...",
      meta: "W",
    },
    {
      id: "baseline-reflow-height",
      type: "reflow",
      label: "forced reflow",
      meta: "layout",
    },
    {
      id: "read-width",
      type: "read",
      label: "offsetWidth",
      meta: "R",
    },
    {
      id: "write-class",
      type: "write",
      label: "classList.add",
      meta: "W",
    },
    {
      id: "baseline-reflow-class",
      type: "reflow",
      label: "forced reflow",
      meta: "layout",
    },
  ];
  const optimizedOperations: Operation[] = [
    {
      id: "read-bounds",
      type: "read",
      label: "getBoundingClientRect",
      meta: "R",
    },
    {
      id: "read-style",
      type: "read",
      label: "getComputedStyle",
      meta: "R",
    },
    {
      id: "read-width",
      type: "read",
      label: "offsetWidth",
      meta: "R",
    },
    {
      id: "optimized-reflow",
      type: "reflow",
      label: "single reflow",
      meta: "layout",
    },
    {
      id: "write-width",
      type: "write",
      label: "style.width = ...",
      meta: "W",
    },
    {
      id: "write-height",
      type: "write",
      label: "style.height = ...",
      meta: "W",
    },
    {
      id: "write-class",
      type: "write",
      label: "classList.add",
      meta: "W",
    },
  ];

  let optimize = $state(false);
  let engine: EngineType | null = $state(null);
  let visualRef: HTMLDivElement | null = $state(null);
  let operationAnimations: Array<InstanceType<typeof AnimationObject>> = [];
  let pendingOperationRects: Map<string, OperationRect> | null = null;
  let runKey = "";

  const operations = $derived(
    optimize ? optimizedOperations : baselineOperations,
  );

  $effect(() => {
    if (!engine || !visualRef) {
      return;
    }

    const nextRunKey = `${optimize ? "optimized" : "baseline"}:${operations.length}`;
    if (nextRunKey === runKey) {
      return;
    }

    runKey = nextRunKey;
    setupTimeline();
  });

  onDestroy(() => {
    stopTimeline();
  });

  async function toggleOptimize() {
    pendingOperationRects = collectOperationRects();
    optimize = !optimize;
    await tick();
  }

  function setupTimeline() {
    if (!engine || !visualRef) {
      return;
    }

    stopTimeline();

    const previousRects = pendingOperationRects;
    pendingOperationRects = null;

    animateOperationObjects(previousRects);
  }

  function stopTimeline() {
    for (const animation of operationAnimations) {
      animation.cancel();
    }
    operationAnimations = [];
  }

  function animateOperationObjects(
    previousRects: Map<string, OperationRect> | null,
  ) {
    operations.forEach((operation) => {
      const element = visualRef?.querySelector<HTMLElement>(
        `[data-operation-id="${operation.id}"]`,
      );
      if (!element) {
        return;
      }

      const currentRect = element.getBoundingClientRect();
      const previousRect = previousRects?.get(operation.id);
      const dx = previousRect ? previousRect.x - currentRect.x : 0;
      const dy = previousRect ? previousRect.y - currentRect.y : 0;
      const isMoving = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
      const isEntering = !previousRect;

      element.style.setProperty(
        "--operation-pulse",
        operation.type === "reflow" ? "0.8" : "0",
      );

      if (!isMoving && !isEntering) {
        element.style.opacity = "1";
        element.style.transform = "";
        return;
      }

      const animation = new AnimationObject(
        element,
        {
          opacity: isEntering ? [0, 1] : [1, 1],
          transform: isMoving
            ? [`translate(${dx}px, ${dy}px)`, "translate(0px, 0px)"]
            : ["translate(0px, 0px)", "translate(0px, 0px)"],
        },
        {
          duration: TRANSITION_DURATION,
          easing: "cubic-bezier(0.4, 0, 0.2, 1)",
          finish: () => {
            element.style.opacity = "1";
            element.style.transform = "";
          },
        },
      );

      operationAnimations.push(animation);
      animation.play();
    });
  }

  function collectOperationRects() {
    const rects = new Map<string, OperationRect>();
    if (!visualRef) {
      return rects;
    }

    for (const element of visualRef.querySelectorAll<HTMLElement>(
      "[data-operation-id]",
    )) {
      const id = element.dataset.operationId;
      if (!id) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      rects.set(id, { x: rect.x, y: rect.y });
    }

    return rects;
  }

</script>

<article class="dom-optimization-card theme-secondary-2">
  <div class="dom-optimization-inner">
    <div class="dom-optimization-copy">
      <h3>
        <span class="dom-title-line">DOM</span>
        <span class="dom-title-line dom-title-desktop-line">Optimization</span>
        <span class="dom-title-line dom-title-mobile-line">Optimization</span>
      </h3>
      <p>Batch DOM work to avoid layout thrash.</p>
    </div>

    <div class="dom-optimization-visual-column">
      <div
        class="dom-optimization-visual card"
        bind:this={visualRef}
      >
        <div
          class="optimize-control"
          onclick={toggleOptimize}
          onkeydown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              toggleOptimize();
            }
          }}
          role="switch"
          aria-checked={optimize}
          tabindex="0"
        >
          <span class={`optimize-label optimize-label-left ${!optimize ? "is-active" : ""}`}>
            <span class="optimize-label-icon material-symbols-outlined" aria-label="Unoptimized">traffic_jam</span>
          </span>
          <div
            class="mini-toggle-switch slot"
            class:enabled={optimize}
          >
            <div class="mini-toggle-knob disk"></div>
          </div>
          <span class={`optimize-label optimize-label-right ${optimize ? "is-active" : ""}`}>
            <span class="optimize-label-icon material-symbols-outlined" aria-label="Optimized">bolt</span>
          </span>
        </div>

        <ClientDemoFrame>
          {#snippet fallback()}
            <div class="operation-stack dom-optimization-skeleton" aria-hidden="true">
              {#each baselineOperations as operation (operation.id)}
                <div class={`operation-pill ${operation.type}`}>
                  <span>{operation.meta}</span>
                  <strong>{operation.label}</strong>
                </div>
              {/each}
            </div>
          {/snippet}
          <Engine id="dom-optimization-highlight" bind:engine debug={debugState.enabled}>
          <div class:optimized={optimize} class="operation-stack" aria-hidden="true">
            {#each operations as operation (operation.id)}
              <div
                class={`operation-pill ${operation.type}`}
                data-operation-id={operation.id}
              >
                <span>{operation.meta}</span>
                <strong>{operation.label}</strong>
              </div>
            {/each}
          </div>
          </Engine>
        </ClientDemoFrame>
      </div>
    </div>
  </div>
</article>

<style lang="scss">
  .dom-optimization-card {
    --card-padding: 40px;
    --card-top-padding: var(--card-padding);
    --operation-card-height: 23.35rem;
    container-type: inline-size;
    container-name: dom-optimization-card;
    position: relative;
    height: 100%;
    min-height: 0;
    box-sizing: border-box;
    padding: var(--card-top-padding) var(--card-padding) var(--card-padding);
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      --card-top-padding: var(--highlight-card-mobile-top-padding);
      grid-column: span 2;
    }
  }

  .dom-optimization-inner {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    align-items: end;
    gap: var(--size-48);
    width: 100%;
    height: 100%;

    @media (max-width: 720px) {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: var(--size-24);
    }

    @container dom-optimization-card (max-width: 450px) {
      grid-template-columns: 1fr;
      align-items: start;
      gap: var(--size-24);
    }
  }

  .dom-optimization-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    align-self: start;
    max-width: 14rem;
    min-width: 0;
    text-align: left;
  }

  .dom-optimization-copy h3 {
    width: min-content;
    margin: 0;
    font-family: "Geist Pixel", sans-serif;
    font-size: var(--highlight-card-heading-size);
    line-height: 0.9;
  }

  .dom-title-line {
    display: block;
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
  }

  .dom-title-mobile-line {
    display: none;
  }

  @container dom-optimization-card (max-width: 450px) {
    .dom-optimization-copy h3 {
      width: max-content;
    }

    .dom-title-desktop-line {
      display: none;
    }

    .dom-title-mobile-line {
      display: block;
    }
  }

  .dom-optimization-copy p {
    margin: var(--size-12) 0 0;
    font-size: 0.92rem;
    line-height: 1.35;
  }

  .optimize-control {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
    align-items: center;
    gap: var(--size-12);
    width: 100%;
    min-width: 0;
    color: #202426;
    cursor: pointer;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.92rem;
    font-weight: 450;
    line-height: 1;
    user-select: none;
  }

  .optimize-control:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 3px;
  }

  .optimize-label {
    display: inline-flex;
    align-items: center;
    min-width: 0;
    font-family: "Bitcount Grid Single", monospace;
    font-optical-sizing: auto;
    font-style: normal;
    letter-spacing: 0;
    text-transform: lowercase;
  }

  .optimize-label-icon {
    display: inline-block;
    font-family: "Material Symbols Outlined";
    font-size: 1.15rem;
    font-style: normal;
    font-weight: 500;
    line-height: 1;
    color: rgba(0, 0, 0, 0.8);
    transition:
      color 0.18s ease,
      filter 0.18s ease;
    font-variation-settings:
      "FILL" 0,
      "wght" 500,
      "GRAD" 0,
      "opsz" 24;
  }

  .optimize-label.is-active .optimize-label-icon {
    color: var(--color-primary);
    filter: drop-shadow(0 0 6px rgba(255, 117, 58, 0.58));
  }

  .optimize-label-left {
    justify-content: flex-end;
    text-align: right;
  }

  .optimize-label-right {
    justify-content: flex-start;
    text-align: left;
  }

  .mini-toggle-switch {
    position: relative;
    width: 36px;
    height: 22px;
    flex: 0 0 auto;
    border-radius: 999px;
    --ui-radius: 999px;
    cursor: pointer;
    overflow: hidden;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.08);
    }

    &.enabled {
      background-color: var(--color-primary);
    }
  }

  .mini-toggle-knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    padding: 0;
    --ui-radius: 999px;
    --card-color: rgb(29, 29, 29);
    background-color: var(--color-primary);
    transition:
      transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
      background-color 0.3s ease;
  }

  .mini-toggle-switch.enabled .mini-toggle-knob {
    transform: translateX(14px);
    background-color: white;
  }

  .dom-optimization-visual-column {
    display: flex;
    flex-direction: column;
    align-self: end;
    justify-self: stretch;
    width: 100%;
    min-width: 0;

    @container dom-optimization-card (max-width: 450px) {
      align-self: stretch;
    }
  }

  .dom-optimization-visual {
    container-type: inline-size;
    container-name: dom-optimization-visual;
    position: relative;
    box-sizing: border-box;
    width: 100%;
    padding: var(--size-16);
    height: var(--operation-card-height);
    max-width: 100%;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--size-16);
  }

  .dom-optimization-visual :global(#snap-canvas) {
    width: 100%;
    flex: 1;
    min-height: 0;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .operation-stack {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    width: 100%;
    justify-content: center;
  }

  .operation-stack.optimized {
    gap: var(--size-8);
  }

  .dom-optimization-skeleton {
    opacity: 0.72;
  }

  .operation-pill {
    --operation-pulse: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    padding: 0.32rem 0.5rem;
    border-radius: var(--size-4);
    background:
      linear-gradient(
        90deg,
        rgba(255, 255, 255, calc(0.5 + var(--operation-pulse) * 0.32)),
        rgba(255, 255, 255, 0.55)
      );
    border: 1px solid rgba(0, 0, 0, 0.08);
    box-shadow: 0 0 0 calc(var(--operation-pulse) * 3px)
      rgba(255, 255, 255, 0.35);
    transform-origin: center;
    will-change: opacity, transform;
  }

  .operation-pill.read,
  .operation-pill.write {
    flex-direction: row;
    align-items: center;
    gap: var(--size-8);
    padding: 0.22rem 0.45rem;
  }

  .operation-pill.reflow {
    background: var(--color-secondary-1);
    border-color: transparent;
    box-shadow: none;
  }

  .operation-pill span {
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.58rem;
    line-height: 1;
    text-transform: uppercase;
  }

  .operation-pill.read span,
  .operation-pill.write span {
    display: inline-flex;
    width: 0.9rem;
    height: 0.9rem;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    border-radius: var(--size-4);
    background: rgba(255, 255, 255, 0.68);
    font-size: 0.58rem;
  }

  .operation-pill strong {
    min-width: 0;
    overflow: hidden;
    color: #222628;
    font-family: "Bitcount Grid Single", monospace;
    font-optical-sizing: auto;
    font-size: clamp(0.54rem, 1.2vw, 0.64rem);
    font-style: normal;
    font-weight: 360;
    letter-spacing: 0;
    line-height: 1.1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .operation-pill.read span {
    color: var(--color-secondary-4);
  }

  .operation-pill.write span {
    color: var(--color-secondary-2);
  }

  .operation-pill.reflow span,
  .operation-pill.reflow strong {
    color: #ffffff;
  }
</style>
