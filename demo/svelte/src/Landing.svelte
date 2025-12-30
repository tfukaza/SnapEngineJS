<script lang="ts">
  // Animation demos
  import GalleryDemo from "./demo/animation/Gallery.svelte";

  // Input demos
  import DragDemo from "./demo/input/Drag.svelte";
  
  // New demos
  import NodeUIDemo from "./demo/node_ui_demo/NodeUIDemo.svelte";
  import DragDropDemo from "./demo/drag_drop/DragDropDemo.svelte";
  import CollisionDemo from "./demo/collision/CollisionDemo.svelte";
  import CSSShowcase from "./demo/css_showcase/CSSShowcase.svelte";

  type DemoOption = {
    label: string;
    value: string;
  };

  const demoOptions: DemoOption[] = [
    { label: "Welcome Background", value: "welcome" },
    { label: "CSS Showcase", value: "css_showcase" },
    { label: "Gallery", value: "gallery" },
    { label: "Drag", value: "drag" },
    { label: "Node UI", value: "node_ui" },
    { label: "Drag & Drop", value: "drag_drop" },
    { label: "Collision", value: "collision" },
  ];

  let selectedDemo = $state("welcome");
  let debugEnabled = $state(false);
  let dragDemoRef: DragDemo | null = $state(null);

  function toggleDebug(event: Event) {
    if (selectedDemo !== "drag") {
      return;
    }
    const target = event.currentTarget as HTMLInputElement;
    debugEnabled = target.checked;
    dragDemoRef?.setDebug(debugEnabled);
  }

  $effect(() => {
    if (selectedDemo !== "drag" && debugEnabled) {
      debugEnabled = false;
      dragDemoRef?.setDebug(false);
    }
  });
</script>

<div class="landing-container">
  <div class="demo-selector">
    <label for="demo-select">Select Demo:</label>
    <select id="demo-select" bind:value={selectedDemo}>
      {#each demoOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <label class="debug-toggle" class:disabled={selectedDemo !== "drag"}>
      <input
        type="checkbox"
        onchange={toggleDebug}
        checked={debugEnabled}
        disabled={selectedDemo !== "drag"}
      />
      <span></span>
      Debug Mode
    </label>
  </div>

  <div class="demo-content">
    {#if selectedDemo === "welcome"}
      <div class="welcome-placeholder">
        <p>Select a demo from the dropdown to begin.</p>
      </div>
    {:else if selectedDemo === "css_showcase"}
      <CSSShowcase />
    {:else if selectedDemo === "gallery"}
      <GalleryDemo />
    {:else if selectedDemo === "drag"}
      <DragDemo bind:this={dragDemoRef} />
    {:else if selectedDemo === "node_ui"}
      <NodeUIDemo />
    {:else if selectedDemo === "drag_drop"}
      <DragDropDemo />
    {:else if selectedDemo === "collision"}
      <CollisionDemo />
    {/if}
  </div>
</div>

<style lang="scss">
  @import "../../app.scss";

  .landing-container {
    width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    background-color: var(--color-background);
  }

  .demo-selector {
    padding: var(--size-12) var(--size-16);
    background-color: var(--color-background);
    border-bottom: 1px solid var(--color-background-dark);
    display: flex;
    align-items: center;
    gap: var(--size-12);
    z-index: 100;
    box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 0.05);
    position: absolute;
    width: 100%;
    box-sizing: border-box;
    top: 0;
  }

  .demo-selector label {
    color: var(--color-text);
  }

  .demo-selector select {
    padding: var(--size-8) var(--size-12);
    font-size: 14px;
    border-radius: var(--ui-radius);
    background-color: var(--color-background-tint);
    color: var(--color-text);
    cursor: pointer;
    min-width: 200px;
    font-family: "IBM Plex Mono", monospace;
  }

  .demo-selector select:hover {
    border-color: var(--color-accent);
  }

  .demo-selector select:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px rgba(255, 117, 58, 0.25);
  }

  .debug-toggle {
    margin-left: auto;
  }

  .demo-content {
    flex: 1;
    overflow: hidden;
    background-color: var(--color-background-tint);
    position: relative;
  }

  .welcome-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-muted, var(--color-text));
    opacity: 0.6;
    font-size: 14px;
  }

  .debug-toggle.disabled {
    opacity: 0.4;
  }
</style>
