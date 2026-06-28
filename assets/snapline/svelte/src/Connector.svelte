<script lang="ts">
  import {
    NodeComponent,
    ConnectorComponent,
  } from "@snap-engine/snapline";
  import type { Engine } from "@snap-engine/core";
  import { getContext, onDestroy, onMount } from "svelte";

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
  let connectorDOM: HTMLDivElement | null = null;

  export function object(): ConnectorComponent {
    return connector;
  }

  onMount(() => {
    connector.element = connectorDOM as HTMLElement;
  });

  onDestroy(() => {
    connector.destroy();
  });
</script>

<div
  bind:this={connectorDOM}
  data-snapline-type="connector"
  data-snapline-name={name}
  class={`connector ${allowDragOut ? "right" : "left"}`}
></div>

<style>
  .connector {
    width: 14px;
    height: 14px;
    border: 2px solid #ffffff;
    border-radius: 999px;
    background: #4f46e5;
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.25);
    cursor: crosshair;
    pointer-events: auto;
  }
</style>
