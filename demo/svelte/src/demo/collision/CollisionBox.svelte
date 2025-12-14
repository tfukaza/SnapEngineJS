<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import { NodeComponent } from "../../../../../src/index";
  import { RectCollider } from "../../../../../src/collision";
  import type { Engine } from "../../../../../src/index";
//   import type { dragStartProp, dragEndProp } from "../../../../../src/input";

  let { title = "Box", initialX = 0, initialY = 0, width = 150, height = 150, color = "#f6f6f6" } = $props();

  let element: HTMLElement;
  let engine: Engine = getContext("engine");
  let object: NodeComponent;
  let collider: RectCollider;

  let isDragging = $state(false);
  let logs: string[] = $state([]);

  function addLog(message: string) {
    logs = [message, ...logs].slice(0, 5);
  }

  onMount(() => {
    // Ensure global select array exists
    if (!engine.global.data.select) {
        engine.global.data.select = [];
    }

    object = new NodeComponent(engine, null);
    object.element = element;
    
    // Set initial position
    object.transform.x = initialX;
    object.transform.y = initialY;
    object.requestTransform();
    object.requestWrite(); // Apply initial styles (position: absolute, etc.)

    // Add collider
    collider = new RectCollider(engine.global, object, 0, 0, width, height);
    object.addCollider(collider);

    // Collision events
    collider.event.collider.onBeginContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h1')?.innerText || other.parent.gid;
        addLog(`Begin: ${otherId}`);
        element.style.borderColor = "red";
    };

    collider.event.collider.onEndContact = (_, other) => {
        const otherId = (other.parent as any).element?.querySelector('h1')?.innerText || other.parent.gid;
        addLog(`End: ${otherId}`);
        element.style.borderColor = "black";
    };

    // // Hook into drag events to update UI state
    // // We preserve NodeComponent's handlers by calling them
    // const originalDragStart = object.event.input.dragStart;
    // object.event.input.dragStart = (prop: dragStartProp) => {
    //     if (originalDragStart) originalDragStart.call(object, prop);
    //     isDragging = true;
    // };

    // const originalDragEnd = object.event.input.dragEnd;
    // object.event.input.dragEnd = (prop: dragEndProp) => {
    //     if (originalDragEnd) originalDragEnd.call(object, prop);
    //     isDragging = false;
    // };
  });

  onDestroy(() => {
    if (object) object.destroy();
  });
</script>

<div
  bind:this={element}
  class="collision-box card {isDragging ? 'float' : ''}"
  style="width: {width}px; height: {height}px; background-color: {color};"
>
  <div class="box-header">
    <h1>{title}</h1>
  </div>
  <div class="box-content">
    {#each logs as log}
        <p class="log-entry">{log}</p>
    {/each}
  </div>
</div>

<style>
  .collision-box {
    position: absolute;
    cursor: grab;
    user-select: none;
    touch-action: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    border: 2px solid black;
    transition: border-color 0.2s;
    overflow: hidden;
  }
  
  .collision-box:active {
    cursor: grabbing;
  }

  .box-header {
      padding: 10px;
      background-color: rgba(0,0,0,0.05);
      border-bottom: 1px solid rgba(0,0,0,0.1);
  }

  h1 {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
  }

  .box-content {
      flex: 1;
      padding: 10px;
      overflow: hidden;
      font-size: 10px;
      font-family: monospace;
  }

  .log-entry {
      margin: 2px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
  }
</style>
