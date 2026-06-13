<script lang="ts">
  import { onMount } from "svelte";
  import { Engine, Camera as CameraControlComponent } from "@snap-engine/asset-base-svelte";
  import type { CameraControl as CameraControlApi } from "@snap-engine/asset-base";
  import { debugState } from "$lib/landing/debugState.svelte";

  const plusCells = Array.from({ length: 180 }, (_, index) => index);
  const ZOOM_STEP = 0.12;
  let cameraControl: CameraControlApi | null = null;

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

  onMount(() => {
    cameraControl?.setCameraPosition(0, 0);
  });
</script>

<article class="camera-control-card theme-secondary-7">
  <div class="camera-viewport">
    <Engine id="camera-control-highlight" debug={debugState.enabled}>
      <CameraControlComponent bind:cameraControl>
        <div class="camera-scene">
          <div class="camera-plus-grid" aria-hidden="true">
            {#each plusCells as cell (cell)}
              <span>+</span>
            {/each}
          </div>

          <div class="camera-card-heading">
            <h3>Camera<br />Control</h3>
            <p>Zoom and pan any DOM element.</p>
          </div>
        </div>
      </CameraControlComponent>
    </Engine>
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
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--size-32);
    height: 100%;
    box-sizing: border-box;
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;
    isolation: isolate;

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      grid-column: span 2;
    }
  }

  .camera-viewport {
    position: absolute;
    inset: 0;
    z-index: 0;
    cursor: grab;

    &:active {
      cursor: grabbing;
    }
  }

  .camera-viewport :global(#snap-canvas) {
    width: 100%;
    height: 100%;
    background: transparent;
  }

  .camera-viewport :global(#snap-camera-control) {
    position: relative !important;
    top: auto !important;
    left: auto !important;
    width: 100% !important;
    height: 100% !important;
    background: transparent;
  }

  .camera-scene {
    position: relative;
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    overflow: hidden;
  }

  .camera-plus-grid {
    position: absolute;
    inset: 10px;
    z-index: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    grid-auto-rows: 36px;
    overflow: hidden;
    pointer-events: none;
    color: rgba(0, 0, 0, 0.08);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 10px;
    font-weight: 300;
    line-height: 1;
    place-items: center;
    user-select: none;
  }

  .camera-plus-grid span {
    color: inherit;
    margin: 0;
  }

  .camera-card-heading {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--size-12);
    padding: var(--card-padding);
    box-sizing: border-box;
    text-align: center;

    h3 {
      margin: 0;
      font-family: "Geist Pixel Circle", "Doto", sans-serif;
      font-size: 58px;
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
