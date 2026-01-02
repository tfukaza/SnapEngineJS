<script lang="ts">
  import { onMount, setContext } from "svelte";
  import { getEngine } from "./engine.svelte";
  import type { Engine } from "../../../../src/index";

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

  resolvedEngine.enableCollisionEngine();

  onMount(() => {
    resolvedEngine.assignDom(canvas as HTMLElement);
    resolvedEngine.camera?.setCameraPosition(0, 0);
    if (debug) {
      resolvedEngine.enableDebug();
    }
  });

  export function enableDebug() {
    resolvedEngine.enableDebug();
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
