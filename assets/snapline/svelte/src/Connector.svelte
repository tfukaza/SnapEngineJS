<script lang="ts">
  import {
    NodeComponent,
    ConnectorComponent,
  } from "@snapline/core";
  import type { Engine } from "snap-engine";
  import { getContext, onDestroy } from "svelte";

  let {
    name,
    maxConnectors = 1,
    allowDragOut = true,
  }: {
    name: string;
    maxConnectors?: number;
    allowDragOut?: boolean;
  } = $props();

  let engine: Engine = getContext("engine");
  let nodeObject: NodeComponent = getContext("nodeObject");
  let connector = new ConnectorComponent(engine, nodeObject, {
    name: name,
    maxConnectors: maxConnectors,
    allowDragOut: allowDragOut,
  });

  nodeObject.addConnectorObject(connector);

  export function object(): ConnectorComponent {
    return connector;
  }

  onDestroy(() => {
    connector.destroy();
  });
</script>

<div class="connector" bind:this={connector.element}></div>

<style>
</style>
