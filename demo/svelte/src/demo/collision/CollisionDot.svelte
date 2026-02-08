<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import { BaseObject, ElementObject } from "snap-engine";
  import { PointCollider } from "snap-engine/collision";
  import type { Engine } from "snap-engine";
  import type { dragProp, dragStartProp, dragEndProp } from "snap-engine";

  let { title = "Dot", initialX = 0, initialY = 0, dotOffsetX = 80, dotOffsetY = 0 } = $props();

  let boxElement: HTMLElement;
  let engine: Engine = getContext("engine");
  let boxObject: ElementObject;
  let dotObject: BaseObject;
  let collider: PointCollider;

  let isDragging = $state(false);
  let logs: string[] = $state([]);
  
  // Dot position relative to box
  let dotX = $state(dotOffsetX);
  let dotY = $state(dotOffsetY);

  function addLog(message: string) {
    logs = [message, ...logs].slice(0, 5);
  }

  onMount(() => {
    // Ensure global select array exists
    if (!engine.global.data.select) {
        engine.global.data.select = [];
    }

    // Create box object (for dragging) - use ElementObject for inputEngine
    boxObject = new ElementObject(engine, null);
    boxObject.element = boxElement;
    boxObject.transform.x = initialX;
    boxObject.transform.y = initialY;

    // Create dot object (with collider)
    dotObject = new BaseObject(engine, null);
    dotObject.transform.x = initialX + dotX;
    dotObject.transform.y = initialY + dotY;

    // Add point collider at dot position
    collider = new PointCollider(engine.global, dotObject, 0, 0);
    dotObject.addCollider(collider);

    // Collision events
    collider.event.collider.onBeginContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`Hit: ${otherId}`);
    };

    collider.event.collider.onEndContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h2, h1')?.innerText || other.parent.gid;
        addLog(`Left: ${otherId}`);
    };

    // Set up drag on box element using input engine
    boxObject.event.input.dragStart = (_: dragStartProp) => {
        isDragging = true;
    };

    boxObject.event.input.drag = (prop: dragProp) => {
        boxObject.transform.x = prop.position.x - 75;
        boxObject.transform.y = prop.position.y - 37.5;
        
        // Update dot position
        dotObject.transform.x = boxObject.transform.x + dotX;
        dotObject.transform.y = boxObject.transform.y + dotY;
    };

    boxObject.event.input.dragEnd = (_: dragEndProp) => {
        isDragging = false;
    };
  });

  onDestroy(() => {
    if (boxObject) boxObject.destroy();
    if (dotObject) dotObject.destroy();
  });

  // Calculate line from box center to dot
  let lineAngle = $derived(Math.atan2(dotY, dotX) * 180 / Math.PI);
  let lineLength = $derived(Math.sqrt(dotX * dotX + dotY * dotY));
</script>

<div
  bind:this={boxElement}
  class="collision-dot-box card {isDragging ? 'float' : ''}"
  style="left: {initialX}px; top: {initialY}px;"
>
  <div class="box-content">
    <h2>{title}</h2>
    <div class="log-list">
      {#each logs as log}
          <p class="log-entry">{log}</p>
      {/each}
    </div>
  </div>
  
  <!-- Arrow line pointing to dot -->
  <div 
    class="arrow-line"
    style="
      width: {lineLength}px;
      transform: rotate({lineAngle}deg);
      transform-origin: 0 50%;
    "
  >
    <div class="arrowhead"></div>
  </div>
  
  <!-- Dot -->
  <div 
    class="dot"
    style="left: {dotX}px; top: {dotY}px;"
  ></div>
</div>

<style>
  .collision-dot-box {
    position: absolute;
    width: 150px;
    height: 75px;
    cursor: grab;
    user-select: none;
    touch-action: none;
    padding: 10px;
    display: flex;
    flex-direction: column;
    border: 2px solid black;
    overflow: visible;
  }
  
  .collision-dot-box:active {
    cursor: grabbing;
  }

  .box-content {
      position: relative;
      z-index: 2;
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

  .arrow-line {
      position: absolute;
      left: 50%;
      top: 50%;
      height: 2px;
      background-color: #666;
      pointer-events: none;
      z-index: 1;
  }

  .arrowhead {
      position: absolute;
      right: -6px;
      top: 50%;
      width: 0;
      height: 0;
      border-left: 8px solid #666;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      transform: translateY(-50%);
  }

  .dot {
      position: absolute;
      width: 12px;
      height: 12px;
      background-color: #ff4444;
      border: 2px solid #cc0000;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 3;
  }
</style>
