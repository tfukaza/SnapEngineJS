<script lang="ts">
  import type { Engine as SnapEngine } from "@snap-engine/core";
  import CoreShowcase from "./components/CoreShowcase.svelte";
  import DebugLayoutOverlay from "./components/DebugLayoutOverlay.svelte";
  import SnapSortHero from "./components/SnapSortHero.svelte";
  import { debugLayoutFooterControl } from "$lib/stores/debugLayoutFooter";
  import {
    collectDebugRects,
    type DebugOverlayRect,
  } from "./components/debugLayout";
  import "./components/snapsort-page.scss";

  let heroEngine: SnapEngine | null = $state(null);
  let examplesEngine: SnapEngine | null = $state(null);
  let debugLayout = $state(false);
  let debugRects: DebugOverlayRect[] = $state([]);

  function configureInput(engine: SnapEngine | null) {
    if (engine) {
      engine.input.config.maxSimultaneousDrags = 1;
    }
  }

  $effect(() => {
    configureInput(heroEngine);
    configureInput(examplesEngine);
  });

  $effect(() => {
    if (!debugLayout || typeof requestAnimationFrame === "undefined") {
      debugRects = [];
      return;
    }

    let frameId = 0;
    const updateDebugOverlay = () => {
      debugRects = collectDebugRects([
        { engine: heroEngine, id: "hero" },
        { engine: examplesEngine, id: "examples" },
      ]);
      frameId = requestAnimationFrame(updateDebugOverlay);
    };

    frameId = requestAnimationFrame(updateDebugOverlay);

    return () => {
      cancelAnimationFrame(frameId);
      debugRects = [];
    };
  });

  function toggleDebugLayout() {
    debugLayout = !debugLayout;
  }

  $effect(() => {
    debugLayoutFooterControl.set({ debugLayout, onToggle: toggleDebugLayout });

    return () => {
      debugLayoutFooterControl.set(null);
    };
  });
</script>

<DebugLayoutOverlay {debugLayout} rects={debugRects} />
<SnapSortHero {debugLayout} bind:engine={heroEngine} />
<CoreShowcase {debugLayout} bind:engine={examplesEngine} />
