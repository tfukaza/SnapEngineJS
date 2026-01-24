<script lang="ts">
  import Canvas from "@svelte-demo/lib/Canvas.svelte";
  import CameraControlComponent from "@svelte-demo/lib/CameraControl.svelte";
  import type { CameraControl as CameraControlApi } from "@snapline/asset/cameraControl";
  import { debugState } from "$lib/landing/debugState.svelte";

  let cameraControl: CameraControlApi | null = null;
  const ZOOM_STEP = 0.12;
  let canvasComponent: Canvas | null = null;

  function zoom(delta: number) {
    if (!cameraControl) return;
    cameraControl.zoomBy(delta);
  }

  function zoomIn() {
    zoom(ZOOM_STEP);
  }

  function zoomOut() {
    zoom(-ZOOM_STEP);
  }

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<p class="panel-label">▼ Camera Pan and Zoom v0.1</p>
<div id="camera-control-demo">
  <Canvas id="camera-control-node-demo" bind:this={canvasComponent} debug={debugState.enabled}>
    <CameraControlComponent bind:cameraControl>
      <div class="image-stage">
        <div class="photo-credit">
          <p>Photo by</p>
          <a
            href="https://unsplash.com/@molliesivaram"
            target="_blank"
            rel="noreferrer"
          >
            Mollie Sivaram
          </a>
        </div>
        <img
          src="https://images.unsplash.com/photo-1557089289-57d5c9f4f0c4?q=80"
          alt="Scenic landscape"
          class="stage-image"
          draggable="false"
        />
      </div>
    </CameraControlComponent>
  </Canvas>
  <div class="card zoom-controls" aria-label="Zoom controls">
    <button
      type="button"
      class="zoom-button small"
      on:click={zoomIn}
      aria-label="Zoom in">+</button
    >
    <button
      type="button"
      class="zoom-button small"
      on:click={zoomOut}
      aria-label="Zoom out">−</button
    >
  </div>
</div>

<style lang="scss">
  @import "../landing.scss";

  #camera-control-demo {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: 1fr auto;
  }

  .image-stage {
    width: 512px;
    height: 512px;
    // width: 100%;
    // height: 100%;
    position: relative;
    pointer-events: none;
    overflow: hidden;
    border-radius: calc(var(--ui-radius, 18px) - 4px);
  }

  .photo-credit {
    position: absolute;
    top: 0.75rem;
    left: 0.75rem;
    z-index: 10;
    padding: 0.25rem 0.5rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    font-size: 0.65rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    pointer-events: auto;
    p {
      color: white;
    }
    a {
      color: white;
      text-decoration: underline;
    }
  }

  .stage-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.9);
  }

  .zoom-controls {
    // position: absolute;
    // top: 1rem;
    // right: 1rem;
    // display: flex;
    // flex-direction: column;
    // gap: 0.35rem;
    // pointer-events: auto;
    padding: 8px 8px;
    display: flex;
    flex-direction: row-reverse;
    gap: 4px;
  }

  .zoom-controls,
  .zoom-controls::after,
  .zoom-controls::before {
        border-radius: 0px 0px var(--ui-radius) var(--ui-radius);
  }

  .zoom-button {
    margin: 0px 4px;
    // width: 2.25rem;
    // height: 2.25rem;
    // border-radius: 999px;
    // border: 1px solid rgba(255, 255, 255, 0.15);
    // background: rgba(8, 11, 20, 0.85);
    // color: white;
    // font-size: 1.25rem;
    // line-height: 1;
    // cursor: pointer;
    // transition: border-color 0.2s ease, background 0.2s ease;
    // box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  }

  .zoom-button:hover {
    // border-color: rgba(255, 255, 255, 0.35);
    // background: rgba(12, 15, 28, 0.9);
  }

  .zoom-button:active {
    // transform: translateY(1px);
  }
</style>
