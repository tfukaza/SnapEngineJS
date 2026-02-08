<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "snap-engine";
  import { PointCollider } from "snap-engine/collision";
  import type { Engine } from "snap-engine";
  import type { dragProp, dragStartProp, dragEndProp } from "snap-engine";

  let { title = "Line", initialX1 = 0, initialY1 = 0, initialX2 = 100, initialY2 = 100 } = $props();

  let point1Element: HTMLElement;
  let point2Element: HTMLElement;
  let engine: Engine = getContext("engine");
  
  let point1Object: ElementObject;
  let point2Object: ElementObject;
  let collider1: PointCollider;
  let collider2: PointCollider;

  let isDraggingPoint1 = $state(false);
  let isDraggingPoint2 = $state(false);
  let logs: string[] = $state([]);
  
  // Line endpoints
  let x1 = $state(initialX1);
  let y1 = $state(initialY1);
  let x2 = $state(initialX2);
  let y2 = $state(initialY2);

  function addLog(message: string) {
    logs = [message, ...logs].slice(0, 5);
  }

  onMount(() => {
    // Ensure global select array exists
    if (!engine.global.data.select) {
        engine.global.data.select = [];
    }

    // Create point 1 object with element for dragging
    point1Object = new ElementObject(engine, null);
    point1Object.element = point1Element;
    point1Object.transform.x = x1;
    point1Object.transform.y = y1;

    // Create point 2 object with element for dragging
    point2Object = new ElementObject(engine, null);
    point2Object.element = point2Element;
    point2Object.transform.x = x2;
    point2Object.transform.y = y2;

    // Add point colliders
    collider1 = new PointCollider(engine.global, point1Object, 8, 8);
    point1Object.addCollider(collider1);

    collider2 = new PointCollider(engine.global, point2Object, 8, 8);
    point2Object.addCollider(collider2);

    // Collision events for point 1
    collider1.event.collider.onBeginContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`P1 Hit: ${otherId}`);
    };

    collider1.event.collider.onEndContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`P1 Left: ${otherId}`);
    };

    // Collision events for point 2
    collider2.event.collider.onBeginContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`P2 Hit: ${otherId}`);
    };

    collider2.event.collider.onEndContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`P2 Left: ${otherId}`);
    };

    // Drag events for point 1
    point1Object.event.input.dragStart = (_: dragStartProp) => {
        isDraggingPoint1 = true;
    };

    point1Object.event.input.drag = (prop: dragProp) => {
        x1 = prop.position.x;
        y1 = prop.position.y;
        point1Object.transform.x = x1;
        point1Object.transform.y = y1;
    };

    point1Object.event.input.dragEnd = (_: dragEndProp) => {
        isDraggingPoint1 = false;
    };

    // Drag events for point 2
    point2Object.event.input.dragStart = (_: dragStartProp) => {
        isDraggingPoint2 = true;
    };

    point2Object.event.input.drag = (prop: dragProp) => {
        x2 = prop.position.x;
        y2 = prop.position.y;
        point2Object.transform.x = x2;
        point2Object.transform.y = y2;
    };

    point2Object.event.input.dragEnd = (_: dragEndProp) => {
        isDraggingPoint2 = false;
    };
  });

  onDestroy(() => {
    if (point1Object) point1Object.destroy();
    if (point2Object) point2Object.destroy();
  });

  // Calculate line properties
  let midX = $derived((x1 + x2) / 2);
  let midY = $derived((y1 + y2) / 2);
</script>

<!-- Line -->
<svg class="line-svg" style="left: {x1}px; top: {y1}px;">
  <line
    x1="0"
    y1="0"
    x2={x2 - x1}
    y2={y2 - y1}
    stroke="black"
    stroke-width="3"
  />
</svg>

<!-- Label at midpoint -->
<div class="line-label card" style="left: {midX}px; top: {midY}px;">
  <h2>{title}</h2>
  <div class="log-list">
    {#each logs as log}
        <p class="log-entry">{log}</p>
    {/each}
  </div>
</div>

<!-- Point 1 handle -->
<div
  bind:this={point1Element}
  class="line-point {isDraggingPoint1 ? 'dragging' : ''}"
  style="left: {x1}px; top: {y1}px;"
>
  <div class="point-inner"></div>
</div>

<!-- Point 2 handle -->
<div
  bind:this={point2Element}
  class="line-point {isDraggingPoint2 ? 'dragging' : ''}"
  style="left: {x2}px; top: {y2}px;"
>
  <div class="point-inner"></div>
</div>

<style>
  .line-svg {
    position: absolute;
    overflow: visible;
    pointer-events: none;
    z-index: 1;
  }

  .line-label {
    position: absolute;
    padding: 8px;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 3;
    min-width: 100px;
  }

  h2 {
      font-size: 14px;
      font-weight: 800;
      margin: 0 0 4px 0;
  }

  .log-list {
      font-size: 10px;
      font-family: monospace;
  }

  .log-entry {
      margin: 2px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }

  .line-point {
    position: absolute;
    width: 16px;
    height: 16px;
    transform: translate(-50%, -50%);
    cursor: grab;
    user-select: none;
    touch-action: none;
    z-index: 5;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .line-point:active,
  .line-point.dragging {
    cursor: grabbing;
  }

  .point-inner {
    width: 12px;
    height: 12px;
    background-color: #4444ff;
    border: 2px solid #0000cc;
    border-radius: 50%;
    pointer-events: auto;
  }

  .line-point.dragging .point-inner {
    background-color: #6666ff;
    transform: scale(1.2);
  }
</style>
