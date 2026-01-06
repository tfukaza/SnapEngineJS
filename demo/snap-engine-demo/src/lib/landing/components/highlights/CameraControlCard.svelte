<script lang="ts">
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import Canvas from "../../../../../../svelte/src/lib/Canvas.svelte";
  import CameraControlComponent from "../../../../../../svelte/src/lib/CameraControl.svelte";
  import type { CameraControl as CameraControlApi } from "../../../../../../../src/asset/cameraControl";

  let cameraControl: CameraControlApi | null = null;
  let canvasComponent: Canvas | null = null;
  const ZOOM_STEP = 0.12;

  function zoom(delta: number) {
    if (!cameraControl) return;
    cameraControl.zoomBy(delta);
  }

  const zoomIn = () => zoom(ZOOM_STEP);
  const zoomOut = () => zoom(-ZOOM_STEP);
</script>

<HighlightCardShell className="camera-control-card theme-secondary-7">
  <div class="camera-card">
    <div class="card-heading">
      <div>
        <h3>Camera Control</h3>
        <p>Control pan and zoom of any DOM element.</p>
      </div>
      <div class="zoom-controls" aria-label="Zoom controls">
        <button type="button" class="zoom-button" on:click={zoomIn} aria-label="Zoom in">
          +
        </button>
        <button type="button" class="zoom-button" on:click={zoomOut} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>

    <div class="camera-stage">
      <div class="canvas-wrapper">
  <Canvas id="camera-control-highlight" bind:this={canvasComponent}>
          <CameraControlComponent bind:cameraControl>
            <div class="image-stage">
              <div class="photo-credit">
                <p>Photo by</p>
                <a href="https://unsplash.com/@molliesivaram" target="_blank" rel="noreferrer">
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
      </div>
    </div>
  </div>
</HighlightCardShell>

<style lang="scss">
  .camera-card {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .card-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .card-heading h3 {
    margin: 0;
  }

  .card-heading p {
    margin: 0.25rem 0 0;
    color: rgba(47, 31, 26, 0.7);
  }

  .zoom-controls {
    display: inline-flex;
    background: var(--card-accent, rgba(26, 20, 16, 0.85));
    border-radius: 999px;
    padding: 0.2rem;
    gap: 0.2rem;
    box-shadow: 0 10px 30px color-mix(in srgb, var(--card-accent, #000) 45%, rgba(0, 0, 0, 0.25));
  }

  .zoom-button {
    width: 2rem;
    height: 2rem;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, #ffffff 60%, var(--card-accent, rgba(26, 20, 16, 0.85)));
    background: color-mix(in srgb, #ffffff 12%, var(--card-accent, rgba(26, 20, 16, 0.85)));
    color: #ffffff;
    font-size: 1.2rem;
    line-height: 1;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
  }

  .zoom-button:hover {
    border-color: color-mix(in srgb, #ffffff 75%, var(--card-accent, rgba(26, 20, 16, 0.85)));
    background: color-mix(in srgb, #ffffff 28%, var(--card-accent, rgba(26, 20, 16, 0.85)));
  }

  .camera-stage {
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: inset 0 0 0 1px rgba(47, 31, 26, 0.12);
    background: radial-gradient(circle at top, rgba(255, 255, 255, 0.25), transparent 65%);
    height: 320px;
  }

  .canvas-wrapper {
    width: 100%;
    height: 100%;
  }

  .canvas-wrapper :global(#snap-canvas) {
    height: 100% !important;
  }

  .image-stage {
    width: 100%;
    height: 100%;
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
    padding: 0.35rem 0.65rem;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 0.7rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }

  .photo-credit a {
    color: white;
    text-decoration: underline;
  }

  .stage-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    filter: saturate(0.9);
  }

  @media (max-width: 720px) {
    .zoom-controls {
      align-self: flex-end;
    }
  }
</style>
