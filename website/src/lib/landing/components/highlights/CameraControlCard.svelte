<script lang="ts">
  import { Engine, Camera as CameraControlComponent } from "@snap-engine/base-svelte";
  import type { CameraControl as CameraControlApi } from "@snap-engine/base";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";
  import { onMount } from "svelte";

  let cameraControl: CameraControlApi | null = null;
  let canvasComponent: Engine | null = null;
  const ZOOM_STEP = 0.12;

  function zoom(delta: number) {
    if (!cameraControl) return;
    cameraControl.zoomBy(delta);
  }

  const zoomIn = () => zoom(ZOOM_STEP);
  const zoomOut = () => zoom(-ZOOM_STEP);

  onMount(() => {
    cameraControl?.setCameraCenterPosition(1500, 1500);
  });
</script>

<HighlightCardShell
  className="camera-control-card theme-secondary-7"
  title="Camera Control"
  description="Zoom and pan any DOM element."
>
  <div class="camera-card slot shallow">
        <Engine id="camera-control-highlight" bind:this={canvasComponent} debug={debugState.enabled}>
          <CameraControlComponent bind:cameraControl>
            <div class="dot-grid-background"></div>
            <div class="image-stage">
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/0/04/NYC_subway-4D.svg"
                alt="NYC Subway Map"
                class="stage-image"
                draggable="false"
              />
            </div>
          </CameraControlComponent>
        </Engine>
  </div>

  <div class="zoom-controls card" aria-label="Zoom controls">
    <button type="button" class="zoom-button" on:click={zoomIn} aria-label="Zoom in">
      +
    </button>
    <button type="button" class="zoom-button" on:click={zoomOut} aria-label="Zoom out">
      −
    </button>
  </div>

  <div class="photo-credit">
    <p>Source:</p>
    <a href="https://en.wikipedia.org/wiki/File:NYC_subway-4D.svg" target="_blank" rel="noreferrer">
      Wikipedia
    </a>
  </div>
</HighlightCardShell>

<style lang="scss">
  .camera-card {
    background-color: var(--color-background-tint);
    border: 1px solid #d4d4d4;
    height: 100%;
    position: relative;
    overflow: hidden;
    touch-action: none;
    // margin-top: 20px;

    @media (max-width: 720px) {
      height: 300px;
    }
  }

  .dot-grid-background {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 1000px;
    height: 1000px;
    transform: translate(-50%, -50%);
    background-image: radial-gradient(circle, rgba(47, 31, 26, 0.15) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
  }



  .zoom-controls {
    display: inline-flex;
    gap: var(--size-8);
    position: absolute;
    bottom: var(--size-24);
    left: 50%;
    transform: translateX(-50%);
    background-color: #ffffff5e;
    backdrop-filter: blur(2px);
    padding: var(--size-8);

    button {
      --button-color: #ffffff75;
    }
  }

  // .zoom-button {
  //   width: 2rem;
  //   height: 2rem;
  //   border-radius: 999px;
  //   border: 1px solid color-mix(in srgb, #ffffff 60%, var(--card-accent, rgba(26, 20, 16, 0.85)));
  //   background: color-mix(in srgb, #ffffff 12%, var(--card-accent, rgba(26, 20, 16, 0.85)));
  //   color: #ffffff;
  //   font-size: 1.2rem;
  //   line-height: 1;
  //   cursor: pointer;
  //   transition: border-color 0.2s ease, background 0.2s ease;
  // }

  // .zoom-button:hover {
  //   border-color: color-mix(in srgb, #ffffff 75%, var(--card-accent, rgba(26, 20, 16, 0.85)));
  //   background: color-mix(in srgb, #ffffff 28%, var(--card-accent, rgba(26, 20, 16, 0.85)));
  // }

  .camera-stage {
    // border-radius: 1rem;
    // overflow: hidden;
    // box-shadow: inset 0 0 0 1px rgba(47, 31, 26, 0.12);
    // background: radial-gradient(circle at top, rgba(255, 255, 255, 0.25), transparent 65%);
    // height: 320px;
  }

  .canvas-wrapper {
    width: 100%;
    height: 100%;
  }

  .canvas-wrapper :global(#snap-canvas) {
    height: 100% !important;
  }

  .image-stage {
    width: 3000px;
    position: relative;
    // pointer-events: none;
    overflow: hidden;
    border-radius: 16px;
    cursor: grab;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .photo-credit {
    position: absolute;
    bottom: -20px;
    left: 2px;
    z-index: 10;
    // padding: 0.35rem 0.65rem;
    // border-radius: 999px;
    // background: rgba(0, 0, 0, 0.6);
    // color: white;
    // font-size: 0.5rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;

    p {
      font-size: 0.7rem;
    }

    a {
      font-size: 0.7rem;
      text-decoration: underline;
    }
  }

  .photo-credit a {
    // color: white;

  }

  // .stage-image {
  //   width: 100%;
  //   height: 100%;
  //   object-fit: cover;
  //   filter: saturate(0.9);
  // }

  @media (max-width: 720px) {
    .zoom-controls {
      align-self: flex-end;
    }
  }
</style>
