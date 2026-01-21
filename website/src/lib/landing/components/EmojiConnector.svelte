<script lang="ts">
  import {
    Engine,
    NodeComponent,
    ConnectorComponent
  } from "@snapline/index";
  import { getContext, onDestroy, onMount } from "svelte";

  let {
    name,
    maxConnectors = 1,
    allowDragOut = true,
    size = 28,
    colliderRadius = 30,
    color = "var(--color-primary)"
  }: {
    name: string;
    maxConnectors?: number;
    allowDragOut?: boolean;
    size?: number;
    colliderRadius?: number;
    color?: string;
  } = $props();

  const engine: Engine = getContext("engine");
  const nodeObject: NodeComponent = getContext("nodeObject");
  let connector: ConnectorComponent | null = null;
  let connectorElement: HTMLElement | null = null;

  onMount(() => {
    connector = new ConnectorComponent(engine, nodeObject, {
      name,
      maxConnectors,
      allowDragOut,
      colliderRadius
    });
    // Store color on connector for line to access
    (connector as any).lineColor = color;
    if (connectorElement) {
      connector.element = connectorElement;
    }
    nodeObject.addConnectorObject(connector);
  });

  export function object(): ConnectorComponent | null {
    return connector;
  }

  onDestroy(() => {
    connector?.destroy();
  });
</script>

<div
  class="emoji-connector"
  bind:this={connectorElement}
></div>

<style>
  .emoji-connector {
    --specular-angle: 130deg;
    width: calc(var(--connector-radius) * 2);
    height: calc(var(--connector-radius) * 2);
    border-radius: 50%;
    position: relative;
    cursor: pointer;
    background: radial-gradient(var(--color-primary, #fe620d) 0%,
          hsl(from var(--color-primary, #fe620d) h s calc(l + 5)) 50%,
          hsl(from var(--color-primary, #fe620d) h s l / 0) 58%,
          hsl(from var(--color-primary, #fe620d) h s l / 0) 65%,
          hsl(from var(--color-primary, #fe620d) h s calc(l - 5) / 0.4) 72%),
        conic-gradient(from var(--specular-angle) at center,
          hsl(from var(--color-primary, #fe620d) h calc(s + 20) calc(l + 5) / 0.1) 43%,
          #fff 57%,
          hsl(from var(--color-primary, #fe620d) h calc(s + 20) calc(l + 5) / 0.1) 70%),
        conic-gradient(from 120deg at center,
          hsl(from var(--color-primary, #fe620d) h calc(s - 5) calc(l - 10)) 0%,
          hsl(from var(--color-primary, #fe620d) calc(h + 10) calc(s + 10) calc(l + 10)) 50%,
          hsl(from var(--color-primary, #fe620d) h calc(s - 5) calc(l - 10)) 100%);
    box-shadow:
      2px 2px 2px 0px rgba(4, 14, 48, 0.096),
      4px 4px 4px -3px rgba(7, 20, 53, 0.142),
      6px 6px 6px -4px rgba(6, 21, 40, 0.422);
  }

  .emoji-connector:focus-visible {
    outline: 2px solid var(--color-secondary-3, #8b5cf6);
    outline-offset: 2px;
  }
</style>
