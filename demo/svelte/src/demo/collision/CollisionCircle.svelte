<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import { CircleCollider } from "../../../../../src/collision";
  import type { Engine } from "../../../../../src/index";
  import type { ElementObject } from "../../../../../src/index";
  import Drag from "../../lib/Drag.svelte";

  let { initialX = 0, initialY = 0, radius = 50 } = $props();

  // Convert radius to width/height to match box
  let width = radius * 2;
  let height = radius * 2;

  let element: HTMLElement;
  let engine: Engine = getContext("engine");
  let object: ElementObject | undefined = $state(undefined);
  let collider: CircleCollider;

  let isDragging = $state(false);

  onMount(() => {
    // Ensure global select array exists
    if (!engine.global.data.select) {
        engine.global.data.select = [];
    }

    if (!object) return;
    
    // Add circle collider at center
    collider = new CircleCollider(engine.global, object, radius, radius, radius);
    object.addCollider(collider);

    // Collision events
    collider.event.collider.onBeginContact = () => {
        element.style.borderColor = "red";
    };

    collider.event.collider.onEndContact = () => {
        element.style.borderColor = "black";
    };
  });

  onDestroy(() => {
    if (object) object.destroy();
  });
</script>

<Drag 
  {initialX} 
  {initialY}
  bind:object
  onDragStart={() => isDragging = true}
  onDragEnd={() => isDragging = false}
>
  <div
    bind:this={element}
    class="collision-box card {isDragging ? 'float' : ''}"
    style="width: {width}px; height: {height}px;"
  >
    <!-- Content removed to keep DOM size equal to collider size -->
  </div>
</Drag>

<style>
  .collision-box {
    position: absolute;
    cursor: grab;
    user-select: none;
    touch-action: none;
    padding: 0px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    /* border: 2px solid black; */
    border-radius: 50%;
    transition: border-color 0.2s;
    overflow: hidden;
  }
  
  .collision-box:active {
    cursor: grabbing;
  }
</style>

