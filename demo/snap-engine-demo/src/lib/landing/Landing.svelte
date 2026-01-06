<script lang="ts">
  import type { Component, SvelteComponent } from "svelte";
  import ControlPanel from "./components/ControlPanel.svelte";
  import CameraControlNodeDemo from "./components/CameraControlNodeDemo.svelte";
  import HorizontalDragDrop from "./components/HorizontalDragDrop.svelte";
  import MultiRowDragDemo from "./components/MultiRowDragDemo.svelte";
  import VerticalDragDrop from "./components/VerticalDragDrop.svelte";
  import InputEngineDragDemo from "./components/InputEngineDragDemo.svelte";
  import AnimationControlDemo from "./components/AnimationControlDemo.svelte";
  import InputHandlingCard from "./components/highlights/InputHandlingCard.svelte";
  import AnimationCard from "./components/highlights/AnimationCard.svelte";
  import CameraControlCard from "./components/highlights/CameraControlCard.svelte";
  import DomOptimizationCard from "./components/highlights/DomOptimizationCard.svelte";
  import CollisionCard from "./components/highlights/CollisionCard.svelte";
  import VisualDebuggerCard from "./components/highlights/VisualDebuggerCard.svelte";

  type DebuggableComponent = SvelteComponent & {
    enableDebug?: () => void;
    disableDebug?: () => void;
  };

  type GridSlot = {
    id: string;
    label: string;
    column: string;
    row: string;
    component?: Component;
    className?: string;
    placeholder?: string;
    type?: "hero" | "slot";
    supportsDebug?: boolean;
    ref?: DebuggableComponent | null;
  };

  const gridSlots: GridSlot[] = [
    {
      id: "control-panel",
      label: "Control Panel",
      column: "1 / 3",
      row: "1 / 3",
      component: ControlPanel,
      className: "control-panel"
    },
    {
      id: "horizontal-drag",
      label: "Horizontal Drag Drop",
      column: "3 / 6",
      row: "1 / 2",
      component: HorizontalDragDrop,
      supportsDebug: true
    },
    {
      id: "top-coming-soon",
      label: "Coming Soon",
      column: "6 / 7",
      row: "1 / 2",
      placeholder: "Demo coming soon"
    },
    {
      id: "camera-control",
      label: "Camera Control",
      column: "7 / 9",
      row: "1 / 3",
      component: CameraControlNodeDemo,
      className: "camera-control",
      supportsDebug: true
    },
    {
      id: "second-row-left",
      label: "Coming Soon",
      column: "3 / 6",
      row: "2 / 3",
      placeholder: "Demo coming soon"
    },
    {
      id: "second-row-right",
      label: "Coming Soon",
      column: "6 / 7",
      row: "2 / 3",
      placeholder: "Demo coming soon"
    },
    {
      id: "third-row-left",
      label: "Coming Soon",
      column: "1 / 2",
      row: "3 / 4",
      placeholder: "Demo coming soon"
    },
    {
      id: "vertical-drag",
      label: "Vertical Drag Drop",
      column: "2 / 3",
      row: "3 / 5",
      component: VerticalDragDrop,
      className: "vertical-drag-and-drop",
      supportsDebug: true
    },
    {
      id: "hero",
      label: "Hero",
      column: "3 / 7",
      row: "3 / 5",
      type: "hero"
    },
    {
      id: "multi-row-drag",
      label: "Multi Row Drag",
      column: "7 / 9",
      row: "3 / 5",
      component: MultiRowDragDemo,
      className: "multi-row-drag",
      supportsDebug: true
    },
    {
      id: "fourth-row",
      label: "Coming Soon",
      column: "1 / 2",
      row: "4 / 5",
      placeholder: "Demo coming soon"
    },
    {
      id: "fifth-row-left",
      label: "Coming Soon",
      column: "1 / 2",
      row: "5 / 6",
      placeholder: "Demo coming soon"
    },
    {
      id: "input-engine",
      label: "Input Engine",
      column: "2 / 4",
      row: "5 / 7",
      component: InputEngineDragDemo,
      className: "input-engine",
      supportsDebug: true
    },
    {
      id: "fifth-row-center",
      label: "Coming Soon",
      column: "4 / 7",
      row: "5 / 6",
      placeholder: "Demo coming soon"
    },
    {
      id: "fifth-row-right-a",
      label: "Coming Soon",
      column: "7 / 8",
      row: "5 / 6",
      placeholder: "Demo coming soon"
    },
    {
      id: "fifth-row-right-b",
      label: "Coming Soon",
      column: "8 / 9",
      row: "5 / 6",
      placeholder: "Demo coming soon"
    },
    {
      id: "bottom-left",
      label: "Coming Soon",
      column: "1 / 2",
      row: "6 / 7",
      placeholder: "Demo coming soon"
    },
    {
      id: "animation-control",
      label: "Animation Control",
      column: "4 / 7",
      row: "6 / 7",
      component: AnimationControlDemo,
      className: "animation-control",
      supportsDebug: true
    },
    {
      id: "bottom-right",
      label: "Coming Soon",
      column: "7 / 9",
      row: "6 / 7",
      placeholder: "Demo coming soon"
    }
  ];

  let debugStates: Record<string, boolean> = $state({});

  function handleDebugToggle(slotId: string, enabled: boolean) {
    const slot = gridSlots.find((item) => item.id === slotId);
    if (!slot?.supportsDebug) {
      return;
    }
    debugStates = { ...debugStates, [slotId]: enabled };
    if (enabled) {
      slot.ref?.enableDebug?.();
    } else {
      slot.ref?.disableDebug?.();
    }
  }

  $effect(() => {
    for (const slot of gridSlots) {
      if (!slot.supportsDebug || !slot.ref) {
        continue;
      }
      if (debugStates[slot.id]) {
        slot.ref.enableDebug?.();
      } else {
        slot.ref.disableDebug?.();
      }
    }
  });
</script>

<section class="page-width" id="landing" style="height: 80vh; position: relative">
  <div class="hero-grid">
    {#each gridSlots as slot (slot.id)}
      {#if slot.type === "hero"}
        <div
          class="card hero-text"
          style={`grid-column: ${slot.column}; grid-row: ${slot.row};`}
        >
          <h1>Interactivity<br /> Engine<br /> for the Web</h1>
        </div>
      {:else}
        <div
          class={`slot ${slot.className ?? ""}`}
          style={`grid-column: ${slot.column}; grid-row: ${slot.row};`}
        >
          {#if slot.id === "control-panel"}
            <ControlPanel
              slots={gridSlots}
              debugStates={debugStates}
              onToggleDebug={handleDebugToggle}
            />
          {:else if slot.component}
            {@const DemoComponent = slot.component}
            <DemoComponent bind:this={slot.ref} />
          {:else}
            <div class="card coming-soon"><p>{slot.placeholder ?? "Demo coming soon"}</p></div>
          {/if}
        </div>
      {/if}
    {/each}
  </div>
</section>

<section class="two-column interactivity-explainer">
<div class="interactivity-intro">
  <h2>…what’s an “Interactivity Engine”?</h2>
  <p>It’s a collection of utilities for adding interactive elements to web apps.</p>
</div>

      <InputHandlingCard />
      <AnimationCard />
      <CameraControlCard />
      <DomOptimizationCard />
      <CollisionCard />
      <VisualDebuggerCard />

</section>

<section class="page-width assets-showcase">
  <div class="explainer-surface">
    <h2 class="eyebrow">Assets</h2>
    <p class="subhead">Projects built on top of SnapEngine.</p>

    <div class="assets-grid">
      <div class="asset-card">
        <h3>SnapZap</h3>
        <p>Zoom and pan any DOM element.</p>
      </div>
      <a href="/dropandsnap" class="asset-card">
        <h3>DropAndSnap</h3>
        <p>Sortable lists and items.</p>
      </a>
      <div class="asset-card">
        <h3>SnapLine</h3>
        <p>Node based UI.</p>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  @use "./landing.scss";
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

    h1 {
      font-size: clamp(2.5rem, 4vw, 3rem);
      line-height: 1.1;
      margin: 0;
    }
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

  .interactivity-explainer {
    margin-top: clamp(3rem, 6vw, 6rem);
  }

  .interactivity-intro {
    grid-column: 1 / -1;
    text-align: center;
    // max-width: clamp(32rem, 80%, 48rem);
    margin: clamp(20px, 20vh, 300px) auto;

    h2 {
      font-size: clamp(2rem, 4vw, 2.75rem);
      margin-bottom: 0.75rem;
    }

    p {
      font-size: 1rem;
      line-height: 1.6;
    }
  }

  .explainer-surface {
    background: transparent;
    border-radius: 0;
    padding: clamp(1.5rem, 4vw, 3rem);
    // box-shadow: 0 20px 60px rgba(27, 16, 10, 0.08);
    text-align: center;
  }

  .eyebrow {
    font-size: clamp(1.5rem, 3vw, 2.25rem);
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #3a2a22;
  }

  .subhead {
    color: #5e4d44;
    font-size: 1rem;
    max-width: 32rem;
    margin: 0 auto clamp(2rem, 4vw, 3rem);
    line-height: 1.6;
  }

  .highlight-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(180px, 1fr));
    gap: 1.25rem;
    margin-bottom: clamp(1.5rem, 3vw, 2.5rem);
  }

  .divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-bottom: clamp(2rem, 4vw, 3rem);
    color: #7d6a5f;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .divider::before,
  .divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(125, 106, 95, 0.4);
  }
 
  .assets-showcase {
    margin-top: clamp(3rem, 6vw, 6rem);
    margin-bottom: clamp(3rem, 6vw, 6rem);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    text-align: left;
    margin-top: 2rem;
  }

  .asset-card {
    background: rgba(255, 255, 255, 0.4);
    border: 1px solid rgba(125, 106, 95, 0.1);
    border-radius: var(--size-4);
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: block;
    text-decoration: none;
    color: inherit;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      background: rgba(255, 255, 255, 0.6);
    }

    h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.25rem;
      color: #3a2a22;
    }

    p {
      margin: 0;
      font-size: 0.95rem;
      color: #5e4d44;
      line-height: 1.5;
    }
  }
</style>
