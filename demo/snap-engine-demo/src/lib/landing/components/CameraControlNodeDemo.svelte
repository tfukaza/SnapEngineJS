<script lang="ts">
  import { onMount } from "svelte";
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import CameraControl from "../../../../../svelte/src/lib/CameraControl.svelte";
  import Node from "../../../../../svelte/src/lib/node_ui/Node.svelte";
  import Connector from "../../../../../svelte/src/lib/node_ui/Connector.svelte";
  import Line from "../../../../../svelte/src/lib/node_ui/Line.svelte";

  let nodeComponent: any = null;
  let stage: HTMLDivElement | null = null;
  let resizeObserver: ResizeObserver | null = null;

  function centerNode() {
    const nodeObject = nodeComponent?.getNodeObject?.();
    if (!stage || !nodeObject) return;

    const { width, height } = stage.getBoundingClientRect();
    const nodeWidth = 220;
    const nodeHeight = 130;

    nodeObject.worldPosition = [width / 2 - nodeWidth / 2, height / 2 - nodeHeight / 2];
    nodeObject.requestTransform("WRITE_2");
  }

  onMount(() => {
    centerNode();

    resizeObserver = new ResizeObserver(() => {
      centerNode();
    });

    if (stage) {
      resizeObserver.observe(stage);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  });
</script>

<Canvas id="camera-control-node-demo">
  <CameraControl>
    <div class="camera-node-stage" bind:this={stage}>
      <Node bind:this={nodeComponent} className="card node camera-node" LineSvelteComponent={Line}>
        <div class="node-header">
          <p class="eyebrow">placeholder</p>
          <h3>Camera node</h3>
        </div>
        <div class="node-body">
          <div class="row input">
            <div class="connector-wrapper">
              <Connector name="input" maxConnectors={1} allowDragOut={false} />
            </div>
            <span>Input stream</span>
          </div>
          <div class="row output">
            <span>Output stream</span>
            <div class="connector-wrapper">
              <Connector name="output" maxConnectors={-1} allowDragOut={true} />
            </div>
          </div>
        </div>
      </Node>

      <div class="overlay">
        <p>Drag the background to pan and scroll to zoom. Node stays interactive.</p>
      </div>
    </div>
  </CameraControl>
</Canvas>

<style lang="scss">
  :global(#camera-control-node-demo #snap-camera-control) {
    background: radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.08), transparent 60%),
      #080b14;
    border-radius: calc(var(--ui-radius) - 4px);
    border: 1px solid rgba(255, 255, 255, 0.08);
  }

  .camera-node-stage {
    width: 100%;
    height: 100%;
    position: relative;
    pointer-events: none;
    color: white;
    font-family: var(--font-sans, "Inter", "SF Pro Display", system-ui);
  }

  :global(.camera-node-stage .node) {
    pointer-events: auto;
    width: 220px;
    background: rgba(12, 14, 27, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.85rem;
    box-shadow: 0 10px 35px rgba(0, 0, 0, 0.4);
    color: white;
  }

  .node-header {
    padding: 0.85rem 1rem 0.25rem;
  }

  .eyebrow {
    margin: 0 0 0.35rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.55);
  }

  .node-header h3 {
    margin: 0;
    font-size: 1.05rem;
  }

  .node-body {
    padding: 0.75rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
  }

  .row.input {
    justify-content: flex-start;
  }

  .row.output {
    justify-content: flex-end;
  }

  .connector-wrapper {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.camera-node-stage .connector) {
    border: 1px solid rgba(255, 255, 255, 0.25);
    background: rgba(255, 255, 255, 0.1);
  }

  .overlay {
    position: absolute;
    bottom: 1rem;
    left: 50%;
    transform: translateX(-50%);
    padding: 0.4rem 0.8rem;
    border-radius: 999px;
    background: rgba(5, 8, 15, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    text-align: center;
    pointer-events: none;
    backdrop-filter: blur(6px);
  }
</style>
