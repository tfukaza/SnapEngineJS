<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Action } from "svelte/action";
  import {
    Engine,
    ElementObject,
    BaseObject,
  } from "../../../../../../../src/index";
  import { AnimationObject } from "../../../../../../../src/animation";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { debugState } from "../../debugState.svelte";

  type OperationType = "read" | "write";
  type Operation = {
    id: string;
    label: string;
    type: OperationType;
    batchId: string;
  };

  type TimelineBlock = {
    id: string;
    label: string;
    type: OperationType | "reflow";
    opId?: string;
  };

  const operations: Operation[] = [
    {
      id: "r1",
      label: "getBoundingClientRect",
      type: "read",
      batchId: "read-a",
    },
    { id: "w1", label: "style.width = ...", type: "write", batchId: "write-a" },
    { id: "r2", label: "getComputedStyle", type: "read", batchId: "read-a" },
    {
      id: "w2",
      label: "style.height = ...",
      type: "write",
      batchId: "write-a",
    },
    { id: "r3", label: "offsetWidth", type: "read", batchId: "read-b" },
    { id: "w3", label: "classList.add", type: "write", batchId: "write-b" },
  ];

  const numReflows = operations.filter((op) => op.type === "read").length;
  const timelineBlocks: TimelineBlock[] = [];

  operations.forEach((op) => {
    timelineBlocks.push({
      id: `block-${op.id}`,
      label: op.label,
      type: op.type,
      opId: op.id,
    });
  });

  for (let i = 0; i < numReflows; i++) {
    timelineBlocks.push({
      id: `reflow-${i}`,
      label: "Reflow",
      type: "reflow",
    });
  }

  let optimize = $state(false);
  const engine = new Engine();
  const controller = new BaseObject(engine, null);
  let timelineContainer: HTMLElement | null = null;
  let connectorHost: HTMLElement | null = null;

  // Map to store our engine objects
  const blockObjects: Record<string, TimelineBlockObject> = {};
  const lineObjects: Record<string, ConnectorLineObject> = {};
  const opObjects: Record<string, OperationObject> = {};
  let hostObject: HostObject | null = null;

  class OperationObject extends ElementObject {
    id: string;
    constructor(
      engine: Engine,
      parent: BaseObject | null,
      element: HTMLElement,
      id: string,
    ) {
      super(engine, parent);
      this.element = element;
      this.id = id;
    }
  }

  class HostObject extends ElementObject {
    constructor(
      engine: Engine,
      parent: BaseObject | null,
      element: HTMLElement,
    ) {
      super(engine, parent);
      this.element = element;
    }
  }

  class TimelineBlockObject extends ElementObject {
    id: string;
    isVisible: boolean = true;

    constructor(
      engine: Engine,
      parent: BaseObject | null,
      element: HTMLElement,
      id: string,
    ) {
      super(engine, parent);
      this.element = element;
      this.id = id;
    }

    readDom(
      accountTransform: boolean = false,
      stage: "READ_1" | "READ_2" | "READ_3" | null = null,
    ) {
      super.readDom(accountTransform, stage);
      if (this.element) {
        this.isVisible = this.element.style.display !== "none";
      }
    }
  }

  class ConnectorLineObject extends ElementObject {
    id: string;
    startOpId: string;
    endBlockId: string;

    x1: number = 0;
    y1: number = 0;
    x2: number = 0;
    y2: number = 0;
    visible: boolean = true;

    constructor(
      engine: Engine,
      parent: BaseObject | null,
      element: SVGLineElement,
      id: string,
      startOpId: string,
      endBlockId: string,
    ) {
      super(engine, parent);
      this.element = element as unknown as HTMLElement;
      this.id = id;
      this.startOpId = startOpId;
      this.endBlockId = endBlockId;
    }

    updatePosition(stage: "READ_1" | "READ_2" | "READ_3" = "READ_1") {
      if (!hostObject) return;
      const startObj = opObjects[this.startOpId];
      const endObj = blockObjects[this.endBlockId];

      if (!startObj || !endObj || !endObj.element) return;

      const hostProp = hostObject.getDomProperty(stage);
      const startProp = startObj.getDomProperty(stage);
      const endProp = endObj.getDomProperty(stage);

      if (!endObj.isVisible) {
        this.visible = false;
      } else {
        this.visible = true;
        this.x1 = startProp.x + startProp.width - hostProp.x;
        this.y1 = startProp.y - hostProp.y + startProp.height / 2;
        this.x2 = endProp.x - hostProp.x;
        this.y2 = endProp.y - hostProp.y + endProp.height / 2;
      }
    }

    writeDom() {
      if (!this.element) return;
      if (!this.visible) {
        this.element.style.display = "none";
        return;
      }
      this.element.style.display = "block";
      this.element.setAttribute("x1", String(this.x1));
      this.element.setAttribute("y1", String(this.y1));
      this.element.setAttribute("x2", String(this.x2));
      this.element.setAttribute("y2", String(this.y2));
    }
  }

  const operationRef: Action<HTMLElement, string> = (node, opId) => {
    if (!engine) return;
    const obj = new OperationObject(engine, controller, node, opId);
    opObjects[opId] = obj;
    return {
      destroy() {
        obj.destroy();
        delete opObjects[opId];
      },
    };
  };

  const timelineBlockRef: Action<HTMLElement, string> = (node, blockId) => {
    if (!engine) return;
    const obj = new TimelineBlockObject(engine, controller, node, blockId);
    blockObjects[blockId] = obj;
    return {
      destroy() {
        obj.destroy();
        delete blockObjects[blockId];
      },
    };
  };

  const connectorLineRef: Action<
    SVGLineElement,
    { id: string; startOpId: string; endBlockId: string }
  > = (node, { id, startOpId, endBlockId }) => {
    if (!engine) return;
    const obj = new ConnectorLineObject(
      engine,
      controller,
      node,
      id,
      startOpId,
      endBlockId,
    );
    lineObjects[id] = obj;
    return {
      destroy() {
        obj.destroy();
        delete lineObjects[id];
      },
    };
  };

  type BlockOrderResult = {
    order: string[];
    visibleReflows: Set<string>;
  };

  const getBlockOrder = (isOptimized: boolean): BlockOrderResult => {
    const order: string[] = [];
    const visibleReflows = new Set<string>();
    let reflowIndex = 0;

    if (!isOptimized) {
      operations.forEach((op, i) => {
        order.push(`block-${op.id}`);
        const nextOp = operations[i + 1];
        if (op.type === "read" && nextOp && nextOp.type === "write") {
          const reflowId = `reflow-${reflowIndex++}`;
          order.push(reflowId);
          visibleReflows.add(reflowId);
        }
      });

      for (let i = reflowIndex; i < numReflows; i++) {
        order.push(`reflow-${i}`);
      }
    } else {
      const reads = operations.filter((op) => op.type === "read");
      const writes = operations.filter((op) => op.type === "write");

      reads.forEach((op) => order.push(`block-${op.id}`));

      if (reads.length && writes.length) {
        const reflowId = `reflow-${reflowIndex++}`;
        order.push(reflowId);
        visibleReflows.add(reflowId);
      }

      writes.forEach((op) => order.push(`block-${op.id}`));

      for (let i = reflowIndex; i < numReflows; i++) {
        order.push(`reflow-${i}`);
      }
    }

    return { order, visibleReflows };
  };

  const animateBlocks = (isOptimized: boolean) => {
    if (!controller || !timelineContainer) return;

    const { order, visibleReflows } = getBlockOrder(isOptimized);
    const visibleBlocks = new Set(
      order.filter((id) => {
        if (id.startsWith("reflow-")) {
          return visibleReflows.has(id);
        }
        return true;
      }),
    );

    // READ_1: Read current positions before any DOM changes
    // Also save to READ_3 so lines can reference the starting position
    controller.queueUpdate(
      "READ_1",
      () => {
        Object.values(blockObjects).forEach((obj) => {
          obj.readDom(false, "READ_1");
          obj.readDom(false, "READ_3"); // Save starting position for lines
        });
        // Also read host and ops for lines
        hostObject?.readDom(false, "READ_3");
        Object.values(opObjects).forEach((obj) => obj.readDom(false, "READ_3"));
      },
      "animate-read-1",
    );

    // WRITE_1: Reorder DOM elements and update visibility
    controller.queueUpdate(
      "WRITE_1",
      () => {
        order.forEach((id) => {
          const obj = blockObjects[id];
          if (obj && obj.element) {
            timelineContainer!.appendChild(obj.element);
            if (visibleBlocks.has(id)) {
              obj.element.style.display = "block";
              obj.element.style.opacity = "1";
            } else {
              obj.element.style.display = "none";
              obj.element.style.opacity = "0";
            }
          }
        });
      },
      "animate-write-1",
    );

    // READ_2: Read new positions after DOM reorder
    controller.queueUpdate(
      "READ_2",
      () => {
        Object.values(blockObjects).forEach((obj) =>
          obj.readDom(false, "READ_2"),
        );
      },
      "animate-read-2",
    );

    // WRITE_2: Apply FLIP animations based on position delta
    controller.queueUpdate(
      "WRITE_2",
      () => {
        Object.values(blockObjects).forEach(async (obj) => {
          if (!visibleBlocks.has(obj.id)) return;

          const prev = obj.getDomProperty("READ_1");
          const curr = obj.getDomProperty("READ_2");

          const dx = prev.x - curr.x;
          const dy = prev.y - curr.y;

          if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) {
            const isReflow = obj.id.startsWith("reflow-");
            const keyframes = isReflow
              ? { opacity: [0, 1] }
              : {
                  transform: [`translate(${dx}px, ${dy}px)`, `translate(0, 0)`],
                };

            const anim = new AnimationObject(obj.element, keyframes, {
              duration: 350,
              easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              delay: isReflow ? 200 : 0,
              // Update READ_3 positions on each animation frame so lines can track
              // getBoundingClientRect() returns the visual position including CSS transforms
              tick: () => {
                obj.readDom(false, "READ_3");
              },
            });
            await obj.addAnimation(anim);
            anim.play();
          }
        });
      },
      "animate-write-2",
    );
  };

  let shouldUpdateLines = true;

  const updateLines = () => {
    if (!controller || !shouldUpdateLines) return;

    //   // Read all positions
    //   controller.queueUpdate("READ_3", () => {
    //     // hostObject?.readDom(false, "READ_3");
    //     // Object.values(opObjects).forEach(obj => obj.readDom(false, "READ_3"));
    //     // Object.values(blockObjects).forEach(obj => obj.readDom(false, "READ_3"));
    //   },
    //   "line-update-read"
    // );

    // Calculate and write line positions
    controller.queueUpdate(
      "WRITE_3",
      () => {
        Object.values(lineObjects).forEach((line) => {
          line.updatePosition("READ_3");
          line.writeDom();
        });

        // Re-queue for next frame
        // TODO: Add an engine API to queue updates for the next frame instead of using setTimeout
        if (shouldUpdateLines) {
          setTimeout(() => updateLines(), 0);
        }
      },
      "line-update-write",
    );
  };

  onMount(() => {
    updateLines();

    if (timelineContainer) {
      animateBlocks(optimize);
    }
  });

  $effect(() => {
    if (connectorHost && engine && !hostObject) {
      hostObject = new HostObject(engine, controller, connectorHost);
    }
    return () => {
      if (hostObject) {
        hostObject.destroy();
        hostObject = null;
      }
    };
  });

  $effect(() => {
    if (controller) {
      animateBlocks(optimize);
    }
  });

  onDestroy(() => {
    shouldUpdateLines = false;
    controller.destroy();
    engine.destroy();
  });
</script>

<HighlightCardShell
  className="dom-optimization-card theme-secondary-2"
  title="DOM Optimization"
  description="Batch DOM reads and writes to avoid layout thrash."
>
  <div class="optimization-demo" bind:this={connectorHost}>
    <!-- <label slot="headingAside" class="opt-toggle"> -->
     <div class="opt-toggle">
      <label>Optimize
      <input
        type="checkbox"
        bind:checked={optimize}
        aria-label="Toggle DOM optimization"
      >
      <span/>
    </label>
    </div>
    <!-- </label> -->
    <div class="operations-column">
      <p class="column-label">Queue</p>
      <ul>
        {#each operations as op}
          <li class={`operation-item ${op.type}`} use:operationRef={op.id}>
            <span class="pill">{op.type === "read" ? "R" : "W"}</span>
            <span class="op-label">{op.label}</span>
          </li>
        {/each}
      </ul>
    </div>

    <div class="timeline-column">
      <p class="column-label">Timeline</p>
      <div class="timeline" bind:this={timelineContainer}>
        {#each timelineBlocks as block (block.id)}
          <div
            class={`timeline-block ${block.type === "reflow" ? "card" : ""} ${block.type}`}
            use:timelineBlockRef={block.id}
          >
            {#if block.type === "reflow"}
              <span class="reflow-label">Reflow</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <svg class="connector-layer" aria-hidden="true">
      {#each operations as op}
        <line
          class="connector"
          use:connectorLineRef={{
            id: `line-${op.id}`,
            startOpId: op.id,
            endBlockId: `block-${op.id}`,
          }}
        />
      {/each}
    </svg>
  </div>
</HighlightCardShell>

<style lang="scss">
  .dom-optimization-card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .opt-toggle {
    grid-column: span 2;
    display: flex;
    align-items: center;
    justify-content: center;
  }



  .optimization-demo {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    row-gap: 2rem;
    column-gap: 4rem;
    padding: var(--size-24);
    // border-radius: 0.7rem;
    background: var(--color-background-tint);
    // box-shadow: inset 0 0 0 1px rgba(47, 31, 26, 0.12);
    overflow: hidden;
    height: 100%;
    box-sizing: border-box;
  }

  .operations-column ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .column-label {
    margin: 0 0 0.25rem;
    font-size: 0.55rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: rgba(47, 31, 26, 0.6);
  }

  .operation-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.35rem;
    border-radius: 0.45rem;
    background: white;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    border: 1px solid rgba(47, 31, 26, 0.08);
    position: relative;
  }

  .operation-item .pill {
    width: 1.1rem;
    height: 1.1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-size: 0.5rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .operation-item.read .pill {
    background: color-mix(in srgb, var(--color-secondary-3) 20%, transparent);
    color: var(--color-secondary-4);
  }

  .operation-item.write .pill {
    background: color-mix(in srgb, var(--color-secondary-2) 20%, transparent);
    color: var(--color-secondary-2);
  }

  .operation-item .op-label {
    font-size: 0.62rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .timeline-column {
    position: relative;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .timeline-block {
    border-radius: var(--ui-radius);
    // background: white;
    // border: 1px solid rgba(47, 31, 26, 0.08);
    padding: 2px;
    height: 12px;
    
    &.read {
      background: color-mix(in srgb, var(--color-secondary-3) 50%, transparent);
    }

    &.write {
      background: color-mix(in srgb, var(--color-secondary-2) 50%, transparent);
    }

    &.reflow {
      background-color: var(--color-secondary-1);
      height: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 10px;  
      
      .reflow-label {
        font-size: 0.55rem;
        color: #fff;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }
    }
}



  .connector-layer {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: visible;
    width: 100%;
    height: 100%;
  }

  .connector {
    stroke: rgba(47, 31, 26, 0.2);
    stroke-width: 1.4;
    stroke-linecap: round;
    fill: none;
  }

  // @media (max-width: 720px) {
  //   .optimization-demo {
  //     grid-template-columns: 1fr;
  //   }

  //   .connector-layer {
  //     display: none;
  //   }
  // }
</style>
