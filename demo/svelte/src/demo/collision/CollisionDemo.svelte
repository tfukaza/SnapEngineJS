<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import CollisionBox from "./CollisionBox.svelte";
  import { BaseObject } from "../../../../../src/object";
  import { RectCollider } from "../../../../../src/collision";
  import type { Engine } from "../../../../../src/index";

  let engine: Engine = getContext("engine");
  let boundaryObjects: BaseObject[] = [];

  // Boundary dimensions
  const BOUNDARY_WIDTH = 500;
  const BOUNDARY_HEIGHT = 400;
  const WALL_THICKNESS = 20;

  // Calculate centered position
  let boundaryLeft = $state(0);
  let boundaryTop = $state(0);

  onMount(() => {
    // Center the boundary on the screen
    boundaryLeft = (window.innerWidth - BOUNDARY_WIDTH) / 2;
    boundaryTop = (window.innerHeight - BOUNDARY_HEIGHT) / 2;

    // Create 4 wall objects around the boundary
    // Top wall
    const topWall = new BaseObject(engine, null);
    topWall.transform.x = boundaryLeft;
    topWall.transform.y = boundaryTop - WALL_THICKNESS;
    const topCollider = new RectCollider(engine.global, topWall, 0, 0, BOUNDARY_WIDTH, WALL_THICKNESS);
    topWall.addCollider(topCollider);
    boundaryObjects.push(topWall);

    // Bottom wall
    const bottomWall = new BaseObject(engine, null);
    bottomWall.transform.x = boundaryLeft;
    bottomWall.transform.y = boundaryTop + BOUNDARY_HEIGHT;
    const bottomCollider = new RectCollider(engine.global, bottomWall, 0, 0, BOUNDARY_WIDTH, WALL_THICKNESS);
    bottomWall.addCollider(bottomCollider);
    boundaryObjects.push(bottomWall);

    // Left wall
    const leftWall = new BaseObject(engine, null);
    leftWall.transform.x = boundaryLeft - WALL_THICKNESS;
    leftWall.transform.y = boundaryTop - WALL_THICKNESS;
    const leftCollider = new RectCollider(engine.global, leftWall, 0, 0, WALL_THICKNESS, BOUNDARY_HEIGHT + 2 * WALL_THICKNESS);
    leftWall.addCollider(leftCollider);
    boundaryObjects.push(leftWall);

    // Right wall
    const rightWall = new BaseObject(engine, null);
    rightWall.transform.x = boundaryLeft + BOUNDARY_WIDTH;
    rightWall.transform.y = boundaryTop - WALL_THICKNESS;
    const rightCollider = new RectCollider(engine.global, rightWall, 0, 0, WALL_THICKNESS, BOUNDARY_HEIGHT + 2 * WALL_THICKNESS);
    rightWall.addCollider(rightCollider);
    boundaryObjects.push(rightWall);
  });

  onDestroy(() => {
    for (const obj of boundaryObjects) {
      obj.destroy();
    }
  });
</script>

<div id="collision-demo">
  <CollisionBox title="Box A" initialX={boundaryLeft + 50} initialY={boundaryTop + 50} />
  <CollisionBox title="Box B" initialX={boundaryLeft + 200} initialY={boundaryTop + 100} />
  <CollisionBox title="Box C" initialX={boundaryLeft + 100} initialY={boundaryTop + 200} />
  <CollisionBox title="Box D" initialX={boundaryLeft + 300} initialY={boundaryTop + 200} />
  <div class="slot boundary" style="left: {boundaryLeft}px; top: {boundaryTop}px;"></div>
</div>

<style>
  @import "../../../../app.scss";
  #collision-demo {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
  }

  .boundary {
      position: absolute;
      width: 500px;
      height: 400px;
      box-sizing: border-box;
      pointer-events: auto;
  }
  
  :global(.collision-box) {
      pointer-events: auto;
  }
</style>
