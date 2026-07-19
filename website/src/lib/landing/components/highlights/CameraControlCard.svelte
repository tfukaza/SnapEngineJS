<script lang="ts">
  import { onMount } from "svelte";
  import ClientDemoFrame from "$lib/components/ClientDemoFrame.svelte";
  import { Engine, Camera as CameraControlComponent } from "@snap-engine/asset-base-svelte";
  import type { CameraControl as CameraControlApi } from "@snap-engine/asset-base";
  import { debugState } from "$lib/landing/debugState.svelte";

  const ZOOM_STEP = 0.12;
  const topoColumns = 148;
  const topoRows = 86;
  const topoFillCharacters = [" ", ".", ",", "`"] as const;
  const topoRowsText = Array.from({ length: topoRows }, (_, row) =>
    Array.from({ length: topoColumns }, (_, column) => topoCharacter(column, row)).join(""),
  );
  let cameraControl = $state<CameraControlApi | null>(null);
  let cameraInitialized = $state(false);

  function terrainHeight(x: number, y: number) {
    const ridge =
      Math.sin(x * 0.16 + y * 0.08) * 0.42 +
      Math.sin(x * 0.055 - y * 0.19 + 1.7) * 0.31 +
      Math.cos(Math.hypot(x - 34, y + 18) * 0.18) * 0.38 +
      Math.sin(Math.hypot(x + 72, y - 46) * 0.15 + 1.1) * 0.24;

    return ridge;
  }

  function isInsideMap(column: number, row: number) {
    const normalizedX = (column - topoColumns / 2) / (topoColumns * 0.48);
    const normalizedY = (row - topoRows / 2) / (topoRows * 0.48);
    return normalizedX * normalizedX + normalizedY * normalizedY <= 1;
  }

  function isInsideCenterClearing(column: number, row: number) {
    const normalizedX = (column - topoColumns / 2) / (topoColumns * 0.18);
    const normalizedY = (row - topoRows / 2) / (topoRows * 0.16);
    return normalizedX * normalizedX + normalizedY * normalizedY < 1;
  }

  function topoCharacter(column: number, row: number) {
    if (!isInsideMap(column, row) || isInsideCenterClearing(column, row)) return " ";

    const worldColumn = column - topoColumns / 2;
    const worldRow = row - topoRows / 2;
    const height = terrainHeight(worldColumn, worldRow);
    const contour = Math.abs(height * 5.4 - Math.round(height * 5.4));
    const fineContour = Math.abs(height * 10.8 - Math.round(height * 10.8));
    const dither = Math.sin(worldColumn * 12.9898 + worldRow * 78.233) * 43758.5453;
    const fillIndex = Math.abs(Math.floor(dither)) % topoFillCharacters.length;

    if (contour < 0.055) return "#";
    if (contour < 0.095) return "=";
    if (fineContour < 0.04) return "-";
    if (height > 0.62) return "+";
    if (height < -0.72) return ":";
    return topoFillCharacters[fillIndex];
  }

  function initializeCamera() {
    if (!cameraControl || cameraInitialized) {
      return;
    }
    if (!cameraControl.camera) {
      requestAnimationFrame(initializeCamera);
      return;
    }

    cameraInitialized = true;
    cameraControl.setCameraPosition(0, 0);
  }

  function zoom(delta: number) {
    cameraControl?.zoomBy(delta);
  }

  function resetOrientation() {
    if (!cameraControl) {
      return;
    }

    const currentZoom = cameraControl.camera?.zoom ?? 1;
    if (currentZoom < 1) {
      cameraControl.zoomBy(1 - currentZoom);
    }
    cameraControl.setCameraPosition(0, 0);
  }

  function stopControlPointer(event: PointerEvent | MouseEvent) {
    event.stopPropagation();
  }

  $effect(() => {
    initializeCamera();
  });

  onMount(initializeCamera);
</script>

<article class="camera-control-card theme-secondary-7">
  <div class="camera-viewport">
    <ClientDemoFrame>
      {#snippet fallback()}
        <div class="camera-scene camera-skeleton" aria-hidden="true">
          <div class="camera-topo-map">
            {#each topoRowsText.slice(0, 28) as row}
              <span>{row}</span>
            {/each}
          </div>
        </div>
      {/snippet}
      <Engine id="camera-control-highlight" debug={debugState.enabled}>
      <CameraControlComponent bind:cameraControl>
        <div class="camera-scene">
          <div class="camera-topo-map" aria-hidden="true">
            {#each topoRowsText as row}
              <span>{row}</span>
            {/each}
          </div>

          <div class="camera-card-heading">
            <h3>Camera<br />Control</h3>
            <p>Zoom and pan any DOM element.<br> Gesture support on mobile devices.</p>
          </div>
        </div>
      </CameraControlComponent>
      </Engine>
    </ClientDemoFrame>
  </div>

  <div class="camera-controls card" aria-label="Camera controls">
    <button type="button" aria-label="Zoom in" onpointerdown={stopControlPointer} onclick={() => zoom(ZOOM_STEP)}>
      <span class="material-symbols-rounded" aria-hidden="true">zoom_in</span>
    </button>
    <button type="button" aria-label="Zoom out" onpointerdown={stopControlPointer} onclick={() => zoom(-ZOOM_STEP)}>
      <span class="material-symbols-rounded" aria-hidden="true">zoom_out</span>
    </button>
    <button type="button" aria-label="Reset orientation" onpointerdown={stopControlPointer} onclick={resetOrientation}>
      <span class="material-symbols-rounded" aria-hidden="true">screen_rotation</span>
    </button>
  </div>
</article>

<style lang="scss">
  .camera-control-card {
    --card-padding: var(--size-48);
    --card-top-padding: var(--card-padding);
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--size-32);
    min-height: 520px;
    height: auto;
    box-sizing: border-box;
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;
    isolation: isolate;
    overscroll-behavior: contain;
    touch-action: none;

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      --card-top-padding: var(--highlight-card-mobile-top-padding);
      grid-column: span 2;
    }
  }

  .camera-viewport {
    position: absolute;
    inset: 0;
    z-index: 0;
    cursor: grab;
    overscroll-behavior: contain;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;

    &:active {
      cursor: grabbing;
    }
  }

  .camera-viewport :global(.snap-engine-canvas) {
    width: 100%;
    height: 100%;
    background: transparent;
    overscroll-behavior: contain;
    touch-action: inherit;
    user-select: inherit;
    -webkit-user-select: inherit;
  }

  .camera-viewport :global(#snap-camera-control) {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    height: 100% !important;
    background: transparent;
    overscroll-behavior: contain;
    touch-action: inherit;
    transform-origin: 0 0;
    user-select: inherit;
    -webkit-user-select: inherit;
  }

  .camera-scene {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    overflow: visible;
  }

  .camera-skeleton {
    overflow: hidden;
    background: color-mix(in srgb, var(--color-background-tint) 92%, #000 4%);
  }

  .camera-topo-map {
    position: absolute;
    top: 50%;
    left: 50%;
    z-index: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    color: rgba(0, 0, 0, 0.105);
    font-family: "Geist Mono", "Courier New", monospace;
    font-size: 39px;
    font-weight: 300;
    letter-spacing: 0;
    line-height: 0.92;
    margin: 0;
    transform: translate(-50%, -50%);
    pointer-events: none;
    user-select: none;
    white-space: pre;
  }

  .camera-topo-map span {
    display: block;
    color: inherit;
    font: inherit;
    line-height: inherit;
    margin: 0;
  }

  .camera-card-heading {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-12);
    padding: var(--card-top-padding) var(--card-padding) var(--card-padding);
    box-sizing: border-box;
    text-align: center;

    h3 {
      margin: 0;
      font-family: "Geist Pixel Circle", "Doto", sans-serif;
      font-size: var(--highlight-card-heading-size);
      line-height: 0.88;
    }

    p {
      margin: 0;
    }

    @media (max-width: 720px) {
      gap: var(--size-12);
    }
  }

  .camera-controls {
    position: absolute;
    left: 50%;
    bottom: var(--card-padding);
    z-index: 1;
    display: flex;
    gap: var(--size-4);
    padding: var(--size-4);
    background-color: rgba(255, 255, 255, 0.68);
    backdrop-filter: blur(3px);
    transform: translateX(-50%);
  }

  .camera-controls button {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    border-radius: var(--ui-radius);
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition:
      transform 0.16s ease;
  }

  .camera-controls button:hover,
  .camera-controls button:focus-visible {
    background: transparent;
    outline: none;
  }

  .camera-controls button:active {
    transform: translateY(1px);
  }

  .camera-controls button:hover .material-symbols-rounded,
  .camera-controls button:focus-visible .material-symbols-rounded {
    color: var(--color-primary);
  }

  .camera-controls button:active .material-symbols-rounded {
    color: var(--color-secondary-1);
  }

  .material-symbols-rounded {
    font-family: "Material Symbols Rounded";
    font-weight: normal;
    font-style: normal;
    font-size: 20px;
    line-height: 1;
    letter-spacing: 0;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "liga";
    transition: color 0.16s ease;
  }
</style>
