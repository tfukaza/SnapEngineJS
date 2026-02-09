<script lang="ts">
  import { onMount } from "svelte";
  import { setContext } from "svelte";
  import { getEngine } from "./engineState.svelte";
  import type { Engine } from "@snap-engine/core";
  import { DebugRenderer } from "@snap-engine/core/debug";
  import { CollisionEngine } from "@snap-engine/core/collision";

  let {
    id,
    children,
    engine = $bindable<Engine | null>(null),
    debug = false,
  }: {
    id: string;
    style?: Record<string, string>;
    children: any;
    engine?: Engine | null;
    debug?: boolean;
  } = $props();
  let canvas: HTMLDivElement | null = null;
  let mounted = $state(false);
  let pendingDebugEnable = $state(false);

  const resolvedEngine = (engine ?? getEngine(id)) as Engine;
  engine = resolvedEngine;
  setContext("engine", resolvedEngine);

  resolvedEngine.setCollisionEngine(new CollisionEngine());

  onMount(() => {
    resolvedEngine.assignDom(canvas as HTMLElement);
    resolvedEngine.camera?.setCameraPosition(0, 0);
    mounted = true;

    // Apply any debug state that was requested before mount
    if (pendingDebugEnable) {
      resolvedEngine.setDebugRenderer(new DebugRenderer());
      pendingDebugEnable = false;
    }
  });

  $effect(() => {
    if (debug) {
      if (mounted) {
        resolvedEngine.setDebugRenderer(new DebugRenderer());
      } else {
        pendingDebugEnable = true;
      }
    } else {
      resolvedEngine.disableDebug();
      pendingDebugEnable = false;
    }
  });

  export function enableDebug() {
    if (mounted) {
      resolvedEngine.setDebugRenderer(new DebugRenderer());
    } else {
      pendingDebugEnable = true;
    }
  }

  export function disableDebug() {
    resolvedEngine.disableDebug();
    pendingDebugEnable = false;
  }
</script>

<div
  id="snap-canvas"
  bind:this={canvas}
  style="height: 100%; overflow: hidden; position: relative;"
>
  {@render children()}
</div>

<style lang="scss">
</style>
