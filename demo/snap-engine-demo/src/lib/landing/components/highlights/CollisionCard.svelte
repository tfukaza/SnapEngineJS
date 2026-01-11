<script lang="ts">
  import Canvas from "../../../../../../svelte/src/lib/Canvas.svelte";
  import CollisionBox from "../../../../../../svelte/src/demo/collision/CollisionBox.svelte";
  import CollisionCircle from "../../../../../../svelte/src/demo/collision/CollisionCircle.svelte";
  import type { Engine } from "../../../../../../../src/index";
  import HighlightCardShell from "./HighlightCardShell.svelte";

  let engine: Engine | null = $state(null);
  let collisionCount = $state(0);
  let isColliding = $state(false);

  // Position constants for the demo area
  const BOX_X = 30;
  const BOX_Y = 40;
  const CIRCLE_X = 140;
  const CIRCLE_Y = 35;
  const BOX_SIZE = 70;
  const CIRCLE_RADIUS = 35;

  function handleCollisionBegin() {
    collisionCount++;
    isColliding = true;
  }

  function handleCollisionEnd() {
    isColliding = false;
  }
</script>

<HighlightCardShell
  className="collision-card theme-secondary-1"
  title="Collision Detection"
  description="Built-in collision engine to detect overlaps and contacts."
>


  <div class="collision-demo-container slot">
    <Canvas id="collision-card-canvas" bind:engine={engine}>
      <div class="collision-demo">
        <CollisionBox 
          title="Box" 
          initialX={BOX_X} 
          initialY={BOX_Y} 
          width={BOX_SIZE} 
          height={BOX_SIZE}
          onCollisionBegin={handleCollisionBegin}
          onCollisionEnd={handleCollisionEnd}
        />
        <CollisionCircle 
          title="Circle" 
          initialX={CIRCLE_X} 
          initialY={CIRCLE_Y} 
          radius={CIRCLE_RADIUS}
        />
        <p class="hint">Drag shapes to collide</p>
      </div>
    </Canvas>
  </div>
    <div class="collision-counter card" class:active={isColliding}>
    <span class="count">{collisionCount}</span>
    <span class="label">collisions</span>
  </div>
</HighlightCardShell>

<style lang="scss">
  .collision-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.7rem;
    border-radius: 0.5rem;
    // background: rgba(47, 31, 26, 0.06);
    transition: background 0.2s, transform 0.15s;
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);

    &.active {
      // background: color-mix(in srgb, var(--color-secondary-1) 20%, transparent);
      transform: translateX(-50%) scale(1.05);
    }
  }

  .collision-counter .count {
    font-size: 1.2rem;
    font-weight: 700;
    color: #3a2a22;
    line-height: 1;
  }

  .collision-counter .label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(47, 31, 26, 0.6);
  }

  .collision-demo-container {
    height: 300px;
    // background-color: var(--color-background-tint);
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    // border-radius: 0.7rem;
    // background: #f9f7f4;
    // box-shadow: inset 0 0 0 1px rgba(47, 31, 26, 0.12);
    // overflow: hidden;
    // position: relative;
  }

  .collision-demo {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .collision-shape {
    cursor: grab;
    user-select: none;
    touch-action: none;
    transition: box-shadow 0.2s, border-color 0.2s;

    &:active {
      cursor: grabbing;
    }
  }

  .box {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-secondary-5) 18%, transparent),
      color-mix(in srgb, var(--color-secondary-5) 6%, transparent)
    );
    border: 2px solid color-mix(in srgb, var(--color-secondary-5) 55%, transparent);
    border-radius: 0.4rem;
  }

  .circle {
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-secondary-4) 20%, transparent),
      color-mix(in srgb, var(--color-secondary-4) 6%, transparent)
    );
    border: 2px solid color-mix(in srgb, var(--color-secondary-4) 55%, transparent);
    border-radius: 50%;
  }

  .hint {
    position: absolute;
    top: 0.5rem;
    left: 50%;
    transform: translateX(-50%);
    margin: 0;
    font-size: 0.6rem;
    color: rgba(47, 31, 26, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    pointer-events: none;
  }

  /* Override collision component styles for the card */
  :global(.collision-card .collision-box.card) {
    border: 2px solid color-mix(in srgb, var(--color-secondary-5) 55%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-secondary-5) 18%, transparent),
      color-mix(in srgb, var(--color-secondary-5) 6%, transparent)
    );
    box-shadow: none;
  }

  :global(.collision-card .collision-box.card .box-header) {
    display: none;
  }

  :global(.collision-card .collision-box.card .box-content) {
    display: none;
  }

  :global(.collision-card .collision-box:not(.card)) {
    border: 2px solid color-mix(in srgb, var(--color-secondary-4) 55%, transparent);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-secondary-4) 20%, transparent),
      color-mix(in srgb, var(--color-secondary-4) 6%, transparent)
    );
  }
</style>
