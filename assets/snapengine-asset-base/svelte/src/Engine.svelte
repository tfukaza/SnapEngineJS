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

  const resolvedEngine = (engine ?? getEngine(id)) as Engine;
  engine = resolvedEngine;
  setContext("engine", resolvedEngine);

  resolvedEngine.setCollisionEngine(new CollisionEngine());

  onMount(() => {
    resolvedEngine.assignDom(canvas as HTMLElement);
    resolvedEngine.camera?.setCameraPosition(0, 0);
  });

  $effect(() => {
    if (debug) {
      resolvedEngine.setDebugRenderer(new DebugRenderer());
    } else {
      resolvedEngine.disableDebug();
    }
  });

  export function enableDebug() {
    resolvedEngine.setDebugRenderer(new DebugRenderer());
  }

  export function disableDebug() {
    resolvedEngine.disableDebug();
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
