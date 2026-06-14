<script lang="ts">
  // Animation demos
  import GalleryDemo from "./demo/animation/Gallery.svelte";

  // Input demos
  import DragDemo from "./demo/input/Drag.svelte";
  
  // New demos
  import NodeUIDemo from "./demo/node_ui_demo/NodeUIDemo.svelte";
  import DropSnapNestedDemo from "./demo/drop_snap_nested/DropSnapNestedDemo.svelte";
  import SnapSortComponentsDemo from "./demo/snapsort_components/SnapSortComponentsDemo.svelte";
  import CollisionDemo from "./demo/collision/CollisionDemo.svelte";
  import CameraControlDemo from "./demo/camera_control/CameraControlDemo.svelte";

  type DemoOption = {
    label: string;
    value: string;
  };

  const demoOptions: DemoOption[] = [
    { label: "Gallery", value: "gallery" },
    { label: "Drag", value: "drag" },
    { label: "CameraControlDemo", value: "camera_control" },
    { label: "NodeUIDemo", value: "node_ui" },
    { label: "DropSnapNestedDemo", value: "drop_snap_nested" },
    { label: "SnapSortComponentsDemo", value: "snapsort_components" },
    { label: "CollisionDemo", value: "collision" },
  ];

  function getDemoFromUrl() {
    if (typeof window === "undefined") return demoOptions[0].value;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get("demo");
    if (demo === "welcome") {
      return demoOptions[0].value;
    }
    if (demo === "drag_drop" || demo === "nested_items") {
      return "drop_snap_nested";
    }
    if (demo && demoOptions.some((o) => o.value === demo)) {
      return demo;
    }
    return demoOptions[0].value;
  }

  let selectedDemo = $state(getDemoFromUrl());
  let debugEnabled = $state(false);
  let dragDemoRef: DragDemo | null = $state(null);
  let dropSnapNestedDemoRef: DropSnapNestedDemo | null = $state(null);

  const debugSupportedDemos = ["drag", "drop_snap_nested"];

  $effect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("demo") !== selectedDemo) {
        url.searchParams.set("demo", selectedDemo);
        window.history.pushState({}, "", url);
      }
    }
  });

  $effect(() => {
    const handlePopState = () => {
      selectedDemo = getDemoFromUrl();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  });

  function toggleDebug(event: Event) {
    if (!debugSupportedDemos.includes(selectedDemo)) {
      return;
    }
    const target = event.currentTarget as HTMLInputElement;
    debugEnabled = target.checked;
    dragDemoRef?.setDebug(debugEnabled);
    dropSnapNestedDemoRef?.setDebug(debugEnabled);
  }

  $effect(() => {
    if (!debugSupportedDemos.includes(selectedDemo) && debugEnabled) {
      debugEnabled = false;
      dragDemoRef?.setDebug(false);
      dropSnapNestedDemoRef?.setDebug(false);
    }
  });
</script>

<div class="landing-container">
  <div class="demo-selector" class:dev-navbar={selectedDemo === "drop_snap_nested" || selectedDemo === "snapsort_components"}>
    <label for="demo-select">Select Demo:</label>
    <select id="demo-select" bind:value={selectedDemo}>
      {#each demoOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>

    <label class="debug-toggle" class:disabled={!debugSupportedDemos.includes(selectedDemo)}>
      <input
        type="checkbox"
        onchange={toggleDebug}
        checked={debugEnabled}
        disabled={!debugSupportedDemos.includes(selectedDemo)}
      />
      <span></span>
      Debug Mode
    </label>
  </div>

  <div class="demo-content">
    {#if selectedDemo === "gallery"}
      <GalleryDemo />
    {:else if selectedDemo === "drag"}
      <DragDemo bind:this={dragDemoRef} />
    {:else if selectedDemo === "camera_control"}
      <CameraControlDemo />
    {:else if selectedDemo === "node_ui"}
      <NodeUIDemo />
    {:else if selectedDemo === "drop_snap_nested"}
      <DropSnapNestedDemo bind:this={dropSnapNestedDemoRef} />
    {:else if selectedDemo === "snapsort_components"}
      <SnapSortComponentsDemo />
    {:else if selectedDemo === "collision"}
      <CollisionDemo />
    {/if}
  </div>
</div>

<style lang="scss">
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
    width: 100%;
    box-sizing: border-box;
    margin-bottom: var(--size-32);
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

    background-color: var(--color-background-tint);
    position: relative;
  }

  .debug-toggle.disabled {
    opacity: 0.4;
  }

  .demo-selector.dev-navbar {
    background: #fff;
    border-bottom: 2px solid #000;
    box-shadow: none;
    margin-bottom: 0;

    label,
    select {
      font-family: "Geist", sans-serif;
      color: #000;
    }

    select {
      background: #fff;
      border: 2px solid #000;
      border-radius: 0;
      box-shadow: none;
      font-size: 1rem;
    }

    select:focus {
      border-color: #000;
      box-shadow: none;
    }

    :global(input[type="checkbox"] + span) {
      background: #fff;
      border: 2px solid #000;
      border-radius: 0;
      box-shadow: none;
    }

    :global(input[type="checkbox"] + span::before),
    :global(input[type="checkbox"] + span::after) {
      box-shadow: none;
      border-radius: 0;
    }
  }
</style>
