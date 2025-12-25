<script lang="ts">
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "../../../../src/index";
  import type { Engine } from "../../../../src/index";
  import type { dragProp, dragStartProp, dragEndProp } from "../../../../src/input";

  let { 
    children, 
    initialX = 0, 
    initialY = 0,
    object = $bindable<ElementObject | undefined>(undefined),
    onDragStart = null,
    onDrag = null,
    onDragEnd = null
  }: { 
    children: any; 
    initialX?: number; 
    initialY?: number;
    object?: ElementObject;
    onDragStart?: (() => void) | null;
    onDrag?: (() => void) | null;
    onDragEnd?: (() => void) | null;
  } = $props();

  let element: HTMLElement;
  let engine: Engine = getContext("engine");

  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let mouseDownX = 0;
  let mouseDownY = 0;

  onMount(() => {
    object = new ElementObject(engine, null);
    object.element = element;
    
    // Set initial position
    object.transform.x = initialX;
    object.transform.y = initialY;
    
    // Set up DOM transform mode
    object.transformMode = "direct";
    object.style = {
      willChange: "transform",
      position: "absolute",
      transformOrigin: "top left",
    };
    
    object.requestWrite();

    // Drag event handlers
    object.event.input.dragStart = (prop: dragStartProp) => {
      if (!object) return;
      isDragging = true;
      dragStartX = object.transform.x;
      dragStartY = object.transform.y;
      mouseDownX = prop.start.x;
      mouseDownY = prop.start.y;
      
      if (onDragStart) {
        onDragStart();
      }
    };

    object.event.input.drag = (prop: dragProp) => {
      if (!object) return;
      const dx = prop.position.x - mouseDownX;
      const dy = prop.position.y - mouseDownY;
      
      object.worldPosition = [dragStartX + dx, dragStartY + dy];
      object.requestTransform();
      
      if (onDrag) {
        onDrag();
      }
    };

    object.event.input.dragEnd = (_: dragEndProp) => {
      isDragging = false;
      
      if (onDragEnd) {
        onDragEnd();
      }
    };
  });

  onDestroy(() => {
    if (object) object.destroy();
  });
</script>

<div
  bind:this={element}
  class="drag-wrapper {isDragging ? 'dragging' : ''}"
>
  {@render children()}
</div>

<style>
  .drag-wrapper {
    cursor: grab;
    user-select: none;
    touch-action: none;
  }
  
  .drag-wrapper.dragging {
    cursor: grabbing;
  }
</style>
