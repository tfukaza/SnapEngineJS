<script lang="ts">
  import Canvas from "../lib/Canvas.svelte";
  import CameraControl from "../lib/CameraControl.svelte";
  import Background from "./Background.svelte";

  // Animation demos
  import ArrayDemo from "../demo/animation/Array.svelte";
  import BasicDemo from "../demo/animation/Basic.svelte";
  import GalleryDemo from "../demo/animation/Gallery.svelte";
  import SequenceDemo from "../demo/animation/Sequence.svelte";
  import TimeControlDemo from "../demo/animation/TimeControl.svelte";
  import VariableDemo from "../demo/animation/Variable.svelte";

  // Input demos
  import DragDemo from "../demo/input/Drag.svelte";
  import InputDemo from "../demo/input/Input.svelte";
  import MouseDemo from "../demo/input/Mouse.svelte";

  type DemoOption = {
    label: string;
    value: string;
    category: string;
  };

  const demoOptions: DemoOption[] = [
    { label: "Welcome Background", value: "welcome", category: "Welcome" },
    { label: "Basic Animation", value: "basic", category: "Animation" },
    { label: "Array Animation", value: "array", category: "Animation" },
    { label: "Gallery", value: "gallery", category: "Animation" },
    { label: "Sequence", value: "sequence", category: "Animation" },
    { label: "Time Control", value: "timecontrol", category: "Animation" },
    { label: "Variable", value: "variable", category: "Animation" },
    { label: "Drag", value: "drag", category: "Input" },
    { label: "Input", value: "input", category: "Input" },
    { label: "Mouse", value: "mouse", category: "Input" },
  ];

  let selectedDemo = $state("welcome");
  let debugEnabled = $state(false);
  let canvas: Canvas;

  function toggleDebug() {
    debugEnabled = !debugEnabled;
    if (debugEnabled) {
      canvas.enableDebug();
    } else {
      canvas.disableDebug();
    }
  }
</script>

<div class="landing-container">
  <div class="demo-selector">
    <label for="demo-select">Select Demo:</label>
    <select id="demo-select" bind:value={selectedDemo}>
      {#each ["Welcome", "Animation", "Input"] as category}
        <optgroup label={category}>
          {#each demoOptions.filter(opt => opt.category === category) as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </optgroup>
      {/each}
    </select>

    <label class="debug-toggle">
      <input type="checkbox" onchange={toggleDebug} />
      <span>Debug Mode</span>
    </label>
  </div>

  <div class="demo-content">
    <Canvas id="welcome-canvas" bind:this={canvas}>
      <CameraControl>
        {#if selectedDemo === "welcome"}
          <Background />
        {:else if selectedDemo === "basic"}
          <BasicDemo />
        {:else if selectedDemo === "array"}
          <ArrayDemo />
        {:else if selectedDemo === "gallery"}
          <GalleryDemo />
        {:else if selectedDemo === "sequence"}
          <SequenceDemo />
        {:else if selectedDemo === "timecontrol"}
          <TimeControlDemo />
        {:else if selectedDemo === "variable"}
          <VariableDemo />
        {:else if selectedDemo === "drag"}
          <DragDemo />
        {:else if selectedDemo === "input"}
          <InputDemo />
        {:else if selectedDemo === "mouse"}
          <MouseDemo />
        {/if}
      </CameraControl>
    </Canvas>
  </div>
</div>

<style>
  .landing-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .demo-selector {
    padding: 12px 16px;
    background-color: #1a1a2e;
    border-bottom: 1px solid #333;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 100;
  }

  .demo-selector label {
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
  }

  .demo-selector select {
    padding: 8px 12px;
    font-size: 14px;
    border-radius: 6px;
    border: 1px solid #444;
    background-color: #2a2a3e;
    color: #fff;
    cursor: pointer;
    min-width: 200px;
  }

  .demo-selector select:hover {
    border-color: #666;
  }

  .demo-selector select:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
  }

  .debug-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: auto;
    cursor: pointer;
    color: #fff;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
  }

  .debug-toggle input[type="checkbox"] {
    width: 16px;
    height: 16px;
    cursor: pointer;
  }

  .demo-content {
    flex: 1;
    overflow: hidden;
  }
</style>
