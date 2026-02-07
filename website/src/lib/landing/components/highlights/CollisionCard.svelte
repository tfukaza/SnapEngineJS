<script lang="ts">
  import Canvas from "@svelte-demo/lib/Canvas.svelte";
  import CollisionBox from "@svelte-demo/demo/collision/CollisionBox.svelte";
  import CollisionCircle from "@svelte-demo/demo/collision/CollisionCircle.svelte";
  import type { Engine } from "@snapline/index";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  let engine: Engine | null = $state(null);
  let collisionCount = $state(0);
  let isColliding = $state(false);
  let containerEl: HTMLDivElement | null = $state(null);
  let containerWidth = $state(360);
  let containerHeight = $state(360);

  const BOX_SIZE = 70;
  const HERO_CIRCLE_RADIUS = 35;
  const CIRCLE_RADIUS = 8;
  const CIRCLE_GAP = 6;
  const STEP = CIRCLE_RADIUS * 2 + CIRCLE_GAP;
  const GRID_MARGIN = 16; // Margin from container edges

  // Calculate grid dimensions based on container size
  let gridCols = $derived(Math.max(1, Math.floor((containerWidth - GRID_MARGIN * 2) / STEP)));
  let gridRows = $derived(Math.max(1, Math.floor((containerHeight - GRID_MARGIN * 2) / STEP)));

  // Calculate actual grid size and centering margins
  let gridWidth = $derived((gridCols - 1) * STEP + CIRCLE_RADIUS * 2);
  let gridHeight = $derived((gridRows - 1) * STEP + CIRCLE_RADIUS * 2);
  let gridMarginX = $derived((containerWidth - gridWidth) / 2 - CIRCLE_RADIUS);
  let gridMarginY = $derived((containerHeight - gridHeight) / 2 - CIRCLE_RADIUS);

  // Hero object positions (relative to container)
  let boxX = $derived(Math.max(10, gridMarginX - BOX_SIZE / 2));
  let boxY = $derived(Math.max(10, gridMarginY - BOX_SIZE / 2));
  let heroCircleX = $derived(Math.min(containerWidth - HERO_CIRCLE_RADIUS - 10, containerWidth - gridMarginX - HERO_CIRCLE_RADIUS));
  let heroCircleY = $derived(Math.max(HERO_CIRCLE_RADIUS + 10, gridMarginY));

  // Generate collision circles based on dynamic grid
  let collisionCircles = $derived.by(() => {
    const cols = gridCols;
    const rows = gridRows;
    const marginX = gridMarginX;
    const marginY = gridMarginY;
    
    return Array.from(
      { length: cols * rows },
      (_, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        return {
          id: `${row}-${col}`,
          initialX: marginX + col * STEP + CIRCLE_RADIUS,
          initialY: marginY + row * STEP + CIRCLE_RADIUS,
        };
      },
    );
  });

  function handleCollisionBegin() {
    collisionCount++;
    isColliding = true;
  }

  function handleCollisionEnd() {
    isColliding = false;
  }

  $effect(() => {
    if (!containerEl) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth = entry.contentRect.width;
        containerHeight = entry.contentRect.height;
      }
    });

    resizeObserver.observe(containerEl);

    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<HighlightCardShell
  className="collision-card theme-secondary-1"
  title="Collision Detection"
  description="Built-in collision engine to detect overlaps and contacts."
>


  <div class="collision-demo-container" bind:this={containerEl}>
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
          initialX={boxX}
          initialY={boxY}
          width={BOX_SIZE}
          height={BOX_SIZE}
          onCollisionBegin={handleCollisionBegin}
          onCollisionEnd={handleCollisionEnd}
        />
        <CollisionCircle
          title="Circle"
          initialX={heroCircleX}
          initialY={heroCircleY}
          radius={HERO_CIRCLE_RADIUS}
          onCollisionBegin={handleCollisionBegin}
          onCollisionEnd={handleCollisionEnd}
        />
      </div>
    </Canvas>
  </div>
    <div class="collision-counter card" class:active={isColliding}>
    <span class="count pixel-font">{collisionCount}</span>
    <span class="label pixel-font">collisions</span>
  </div>
</HighlightCardShell>

<style lang="scss">
  .collision-counter {
    --card-color: #222628;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.7rem;
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);

    span {
      color: #fff;
    }
  }

  .collision-counter .count {
    font-size: 1.2rem;
    font-weight: 700;
    line-height: 1;
  }

  .collision-counter .label {
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
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
    width: 100%;
    height: 100%;
  }

  .collision-grid {
    pointer-events: none;

    :global(.collision-box) {
      cursor: default;
    }
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
