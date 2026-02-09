<script lang="ts">
  import { onMount } from "svelte";
  import { Engine, Camera as CameraControlComponent } from "@snap-engine/base-svelte";
  import Drag from "@svelte-demo/lib/Drag.svelte";
  import type { ElementObject } from "@snapline/object";
  import type { CameraControl as CameraControlApi } from "@snap-engine/base";
  import { debugState } from "$lib/landing/debugState.svelte";

  export type NodePoint = {
    id: string;
    label: string;
    x: number;
    y: number;
    color: string;
  };

  type Connection = { from: string; to: string };

  const BASE_WIDTH = 256;
  const BASE_HEIGHT = 256;
  const ARROW_MARKER_ID = "pan-arrow-marker";
  const ORBIT_RADIUS = 90;

  let cameraControl: CameraControlApi | null = null;
  let nodeObjects: Record<string, ElementObject | undefined> = {};

  const CENTER_NODE_ID = "node-0";
  const CENTER_X = BASE_WIDTH / 2;
  const CENTER_Y = BASE_HEIGHT / 2;

  const SATELLITE_COUNT = 5;
  const NODE_COLORS = [
    "var(--color-secondary-1)",
    "var(--color-secondary-2)",
    "var(--color-secondary-3)",
    "var(--color-secondary-4)",
    "var(--color-secondary-5)"
  ];

  function generateInitialNodes(): NodePoint[] {
    const origin: NodePoint = {
      id: CENTER_NODE_ID,
      label: "0",
      x: CENTER_X,
      y: CENTER_Y,
      color: "var(--color-secondary-5)"
    };

    const satellites: NodePoint[] = Array.from({ length: SATELLITE_COUNT }, (_, i) => {
      const angle = ((2 * Math.PI) / SATELLITE_COUNT) * i - Math.PI / 2;
      return {
        id: `node-${i + 1}`,
        label: `${i + 1}`,
        x: CENTER_X + ORBIT_RADIUS * Math.cos(angle),
        y: CENTER_Y + ORBIT_RADIUS * Math.sin(angle),
        color: NODE_COLORS[i % NODE_COLORS.length]
      };
    });

    return [origin, ...satellites];
  }

  interface Props {
    getNodes?: () => NodePoint[];
  }

  let { getNodes = $bindable() }: Props = $props();

  // Internal node state - owned by this component
  let nodes: NodePoint[] = $state(generateInitialNodes());

  // Expose API for parent to get nodes
  getNodes = () => nodes;

  const connections: Connection[] = [
    { from: CENTER_NODE_ID, to: "node-1" },
    { from: "node-1", to: "node-2" },
    { from: "node-2", to: "node-3" },
    { from: "node-3", to: "node-4" },
    { from: "node-4", to: "node-5" },
    { from: "node-5", to: CENTER_NODE_ID }
  ];

  const clamp = (value: number, min: number, max: number) =>
    Math.max(min, Math.min(max, value));

  const NODE_RADIUS = 22;
  const ARROW_INSET = 20; // pixels short of target node center

  function findNode(id: string): NodePoint | undefined {
    return nodes?.find((node) => node.id === id);
  }

  function shortenedLine(
    from: NodePoint,
    to: NodePoint,
    inset: number
  ): { x1: number; y1: number; x2: number; y2: number } {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
    const ratio = (len - inset) / len;
    return {
      x1: from.x,
      y1: from.y,
      x2: from.x + dx * ratio,
      y2: from.y + dy * ratio
    };
  }

  function syncNodePosition(nodeId: string) {
    const object = nodeObjects[nodeId];
    if (!object || !nodes) return;

    const rawX = object.transform.x;
    const rawY = object.transform.y;
    const clampedX = clamp(rawX, NODE_RADIUS, BASE_WIDTH - NODE_RADIUS);
    const clampedY = clamp(rawY, NODE_RADIUS, BASE_HEIGHT - NODE_RADIUS);

    if (clampedX !== rawX || clampedY !== rawY) {
      object.worldPosition = [clampedX, clampedY];
      object.requestTransform();
    }

    nodes = nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            x: clampedX,
            y: clampedY
          }
        : node
    );
  }

  // onMount(() => {
  //   for (const node of nodes) {
  //     if (node.id !== CENTER_NODE_ID) {
  //       syncNodePosition(node.id);
  //     }
  //   }
  // });
</script>

<div class="seq-two-pannable slot shallow">
  <Engine id="seq-two-pan-demo" debug={debugState.enabled}>
    <CameraControlComponent bind:cameraControl>
      <!-- <div class="pan-stage"> -->
  <div class="pan-grid" aria-hidden="true"></div>
        <svg class="pan-lines" viewBox="0 0 {BASE_WIDTH} {BASE_HEIGHT}" role="presentation" aria-hidden="true">
          <defs>
            <marker
              id={ARROW_MARKER_ID}
              viewBox="0 0 8 8"
              refX="6"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path d="M0 0 L8 4 L0 8 z" fill="currentColor" />
            </marker>
          </defs>
          {#each connections as connection (connection.from + connection.to)}
            {@const from = findNode(connection.from)}
            {@const to = findNode(connection.to)}
            {#if from && to}
              {@const line = shortenedLine(from, to, ARROW_INSET)}
              <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} marker-end={`url(#${ARROW_MARKER_ID})`} />
            {/if}
          {/each}
        </svg>
        {#each nodes as node (node.id)}
          {#if node.id === CENTER_NODE_ID}
            <div
              class="pan-node card origin"
              style={`--node-color: ${node.color}; left: ${node.x}px; top: ${node.y}px;`}
              aria-hidden="true"
            >
              <span>{node.label}</span>
            </div>
          {:else}
            <Drag
              initialX={node.x}
              initialY={node.y}
              bind:object={nodeObjects[node.id]}
              onDrag={() => syncNodePosition(node.id)}
              onDragStart={() => syncNodePosition(node.id)}
            >
              <div
                class="pan-node card"
                style={`--node-color: ${node.color};`}
                role="button"
                aria-label={`Drag node ${node.label}`}
              >
                <span>{node.label}</span>
              </div>
            </Drag>
          {/if}
        {/each}
        <!-- <div class="pan-focus-card">
          <p>Pan · zoom · drag nodes 1–5</p>
        </div> -->
      <!-- </div> -->
    </CameraControlComponent>
  </Engine>
  <!-- <div class="pan-hint">Middle-drag to pan · Scroll to zoom</div> -->
</div>

<style lang="scss">
  .seq-two-pannable {
    height: 100%;
    width: 100%;
    border-radius: var(--ui-radius);
    overflow: hidden;
    background-color: var(--color-background-tint);
    padding: 0;
  }

  :global(#seq-two-pan-demo) {
    display: block;
    height: 100%;
    width: 100%;
    border-radius: calc(var(--ui-radius));
    overflow: hidden;
  }

  // .pan-stage {
  //   width: 720px;
  //   height: 360px;
  //   position: relative;
  //   // border-radius: calc(var(--ui-radius));
  //   background: radial-gradient(circle at top, rgba(255, 255, 255, 0.15), transparent 45%),
  //     var(--color-background-tint, #f5f6fb);
  //   box-shadow: inset 0 0 0 1px rgba(12, 13, 23, 0.08);
  // }

  .pan-grid {
    position: absolute;
    width: 256px;
    height: 256px;
    inset: 0;
    --grid-line-color: rgb(229, 229, 229);
    background-image: linear-gradient(transparent 0%, transparent 49%, var(--grid-line-color) 49%, var(--grid-line-color) 51%, transparent 51% 100%),
      linear-gradient(90deg, transparent 0%, transparent 49%, var(--grid-line-color) 49%, var(--grid-line-color) 51%, transparent 51% 100%);
    background-size: 32px 32px;
    background-position: center center;
    // mask-image: radial-gradient(circle at center, rgba(0, 0, 0, 0.8), transparent 70%);
    pointer-events: none;
  }

  .pan-grid::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 100%;
    height: 1px;
    background: rgba(15, 23, 42, 0.4);
    transform: translateY(-0.5px);
    pointer-events: none;
  }

  .pan-grid::after {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    width: 1px;
    height: 100%;
    background: rgba(15, 23, 42, 0.4);
    transform: translateX(-0.5px);
    pointer-events: none;
  }

  .pan-lines {
    position: absolute;
    inset: 0;
    width: 256px;
    height: 256px;
    stroke: rgba(15, 23, 42, 0.25);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .pan-node {
    position: absolute;
    transform: translate(-50%, -50%);
    width: 25px;
    height: 25px;
    // border-radius: 999px;
    background: rgb(255, 255, 255);
    padding: var(--size-4);
    // border: 2px solid var(--node-color, #818cf8);
    // box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    cursor: grab;
    user-select: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  // .pan-node::before {
  //   content: "";
  //   position: absolute;
  //   width: 60px;
  //   height: 60px;
  //   border-radius: 999px;
  //   background: radial-gradient(circle, rgba(255, 255, 255, 0.6), transparent 65%);
  //   z-index: -1;
  // }

  .pan-node:active {
    cursor: grabbing;
    transform: translate(-50%, -50%) scale(0.96);
    box-shadow: 0 4px 10px rgba(15, 23, 42, 0.25);
  }

  .pan-node.origin {
    width: 28px;
    height: 28px;
    background: rgb(15, 23, 42);
    color: #fff;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
    pointer-events: none;

    span {
      color: #fff;
    }
  }

  .pan-lines line {
    stroke: rgba(15, 23, 42, 0.3);
  }
</style>
