<script lang="ts">
  import Canvas from "../../../../../../svelte/src/lib/Canvas.svelte";
  import CollisionBox from "../../../../../../svelte/src/demo/collision/CollisionBox.svelte";
  import CollisionCircle from "../../../../../../svelte/src/demo/collision/CollisionCircle.svelte";
  import type { Engine } from "../../../../../../../src/index";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "../../debugState.svelte";

  let engine: Engine | null = $state(null);
  let collisionCount = $state(0);
  let isColliding = $state(false);

  const BOX_X = 30;
  const BOX_Y = 40;
  const BOX_SIZE = 70;
  const HERO_CIRCLE_X = 180;
  const HERO_CIRCLE_Y = 55;
  const HERO_CIRCLE_RADIUS = 35;

  const GRID_DIMENSION = 16;
  const CIRCLE_RADIUS = 8;
  const CIRCLE_GAP = 6;
  const STAGE_WIDTH = 360;
  const STAGE_HEIGHT = 360;
  const STEP = CIRCLE_RADIUS * 2 + CIRCLE_GAP;
  const GRID_WIDTH = CIRCLE_RADIUS * 2 + (GRID_DIMENSION - 1) * STEP;
  const GRID_HEIGHT = CIRCLE_RADIUS * 2 + (GRID_DIMENSION - 1) * STEP;
  const GRID_MARGIN_X = (STAGE_WIDTH - GRID_WIDTH) / 2;
  const GRID_MARGIN_Y = (STAGE_HEIGHT - GRID_HEIGHT) / 2;

  const collisionCircles = Array.from(
    { length: GRID_DIMENSION * GRID_DIMENSION },
    (_, index) => {
      const row = Math.floor(index / GRID_DIMENSION);
      const col = index % GRID_DIMENSION;
      return {
        id: index,
        initialX: GRID_MARGIN_X + col * STEP,
        initialY: GRID_MARGIN_Y + row * STEP,
      };
    },
  );

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
    <div class="dot-grid-background"></div>
    <Canvas id="collision-card-canvas" bind:engine={engine} debug={debugState.enabled}>
      <div class="collision-demo">
       
        <div class="collision-grid">
          {#each collisionCircles as circle (circle.id)}
            <CollisionCircle
              title={`Circle ${circle.id + 1}`}
              initialX={circle.initialX}
              initialY={circle.initialY}
              radius={CIRCLE_RADIUS}
              onCollisionBegin={handleCollisionBegin}
              onCollisionEnd={handleCollisionEnd}
            />
          {/each}
        </div> <CollisionBox
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
          initialX={HERO_CIRCLE_X}
          initialY={HERO_CIRCLE_Y}
          radius={HERO_CIRCLE_RADIUS}
          onCollisionBegin={handleCollisionBegin}
          onCollisionEnd={handleCollisionEnd}
        />
        <!-- <p class="hint">Hero objects + 256 live colliders — drag to disturb the grid</p> -->
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
    height: 360px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;

    :global(#snap-canvas) {
      width: 100%;  
    }
  }

  .dot-grid-background {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 400%;
    height: 400%;
    transform: translate(-50%, -50%);
    background-image: radial-gradient(circle, rgba(47, 31, 26, 0.15) 1px, transparent 1px);
    background-size: 16px 16px;
    pointer-events: none;
  }

  .collision-demo {
    position: relative;
    margin: 0 auto;
  }

  .collision-grid {
    pointer-events: none;

    :global(.collision-box) {
      cursor: default;
    }
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

  @media (max-width: 480px) {
    .collision-demo-container {
      height: 300px;
    }

    .collision-demo {
      transform: scale(0.85);
      transform-origin: center;
    }
  }

  /* Override collision component styles for the card */
  :global(.collision-card .collision-box.card) {
    border: 1px solid #d3d3d3;
    box-shadow: none;
  }
  :global(.collision-card .collision-box.card.colliding) {
    border-color: red;
  }

  :global(.collision-card .collision-box.card .box-header) {
    display: none;
  }

  :global(.collision-card .collision-box.card .box-content) {
    display: none;
  }

</style>
