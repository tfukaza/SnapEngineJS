<script lang="ts">
  import Canvas from "../../../../svelte/src/lib/Canvas.svelte";
  import CameraControl from "../../../../svelte/src/lib/CameraControl.svelte";
  import ControlPanel from "./components/ControlPanel.svelte";
  import CameraControlNodeDemo from "./components/CameraControlNodeDemo.svelte";
  import HorizontalDragDrop from "./components/HorizontalDragDrop.svelte";
  import MultiRowDragDemo from "./components/MultiRowDragDemo.svelte";
  import VerticalDragDrop from "./components/VerticalDragDrop.svelte";
  import InputEngineDragDemo from "./components/InputEngineDragDemo.svelte";
  import AnimationControlDemo from "./components/AnimationControlDemo.svelte";

  // import Menu from "./Menu.svelte";
  // import NodeUIDemo from "./node_ui_demo/NodeUIDemo.svelte";
  // import DragDropDemo from "./drag_drop_demo/DragDropDemo.svelte";
  // import Stub from "./Stub.svelte";

  // let currentDemo = $state(0);
  let debugEnabled = $state(false);
  let canvas: Canvas | undefined;

  function toggleDebug() {
    if (!canvas) return;
    debugEnabled = !debugEnabled;
    if (debugEnabled) {
      canvas.enableDebug();
    } else {
      canvas.disableDebug();
    }
  }
</script>

<section class="page-width" id="landing" style="height: 80vh; position: relative">
  <div class="hero-grid">
    <!-- Hero text in center -->
    <div class="card hero-text" style="grid-column: 3 / 7; grid-row: 3 / 5;">
      <h1>Interactivity<br> Engine<br> for the Web</h1>
    </div>
    
    <!-- Top row -->
    <div class="slot" style="grid-column: 1 / 3; grid-row: 1 / 3;">
  <ControlPanel />
    </div>
    <div class="slot" style="grid-column: 3 / 6; grid-row: 1 / 2;">
      <HorizontalDragDrop />
    </div>
    <div class="slot" style="grid-column: 6 / 7; grid-row: 1 / 2;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot camera-control" style="grid-column: 7 / 9; grid-row: 1 / 3;">
      <CameraControlNodeDemo />
    </div>
    
    <!-- Second row -->
    <div class="slot" style="grid-column: 3 / 6; grid-row: 2 / 3;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot" style="grid-column: 6 / 7; grid-row: 2 / 3;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    
    <!-- Third row (left and right of hero) -->
    <div class="slot" style="grid-column: 1 / 2; grid-row: 3 / 4;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot vertical-drag-and-drop" style="grid-column: 2 / 3; grid-row: 3 / 5;">
        <VerticalDragDrop />
    </div>
    <!-- Hero occupies 3-7, 3-5 -->
    <!-- <div class="slot input-engine" style="grid-column: 7 / 9; grid-row: 3 / 5;">
      <InputEngineDragDemo />
    </div> -->
    <div class="slot multi-row-drag" style="grid-column: 7 / 9; grid-row: 3 / 5;">
      <MultiRowDragDemo />
    </div>
    
    <!-- Fourth row -->
    <div class="slot" style="grid-column: 1 / 2; grid-row: 4 / 5;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    
    <!-- Fifth row -->
    <div class="slot" style="grid-column: 1 / 2; grid-row: 5 / 6;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot input-engine" style="grid-column: 2 / 4; grid-row: 5 / 7;">
      <InputEngineDragDemo />
    </div>
    <div class="slot" style="grid-column: 4 / 7; grid-row: 5 / 6;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot" style="grid-column: 7 / 8; grid-row: 5 / 6;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot" style="grid-column: 8 / 9; grid-row: 5 / 6;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    
    <!-- Bottom row -->
    <div class="slot" style="grid-column: 1 / 2; grid-row: 6 / 7;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
    <div class="slot animation-control" style="grid-column: 4 / 7; grid-row: 6 / 7;">
      <AnimationControlDemo />
    </div>
    <div class="slot" style="grid-column: 7 / 9; grid-row: 6 / 7;">
      <p class="coming-soon">Demo coming soon</p>
    </div>
  </div>
</section>

<style lang="scss">
  #landing {
    // background-color: var(--color-background);
    // overflow: hidden;
    border-radius: var(--size-12);
  }

  .hero-grid {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 1rem;
  }

  .hero-text {
    grid-column: 3 / 7; 
    grid-row: 3 / 5; 
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    z-index: 10;
  }

  .slot {
    padding: 1px;
    overflow: hidden;
  }

  .coming-soon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    font-size: 0.75rem;
    color: #afa49c;
    text-align: center;
  }

  .card:not(.hero-text) {
    height:100%;
    box-sizing: border-box;
    border-radius: calc(var(--ui-radius) - 2px);
  }
 
</style>
