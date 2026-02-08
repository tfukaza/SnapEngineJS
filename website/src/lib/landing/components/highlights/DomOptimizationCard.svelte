<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import type { Action } from "svelte/action";
  import {
    Engine as EngineClass,
    ElementObject,
    BaseObject,
  } from "@snapline/index";
  import { AnimationObject } from "@snapline/animation";
  import HighlightCardShell from "./HighlightCardShell.svelte";
  import { Engine } from "@snapengine-asset-base/svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

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
  let engine = $state<EngineClass | null>(null);
  let controller = $state<BaseObject | null>(null);

  $effect(() => {
    if (engine && !controller) {
      controller = new BaseObject(engine, null);
    }
  });

  let timelineContainer: HTMLElement | null = null;
  let connectorHost: HTMLElement | null = null;

  // Map to store our engine objects
  const blockObjects: Record<string, ElementObject> = {};
  const lineObjects: Record<string, ConnectorLineObject> = {};
  const opObjects: Record<string, ElementObject> = {};
  let hostObject: ElementObject | null = null;

  // class OperationObject extends ElementObject {
  //   id: string;
  //   constructor(
  //     engine: Engine,
  //     parent: BaseObject | null,
  //     element: HTMLElement,
  //     id: string,
  //   ) {
  //     super(engine, parent);
  //     this.element = element;
  //     this.id = id;
  //   }
  // }

  // class HostObject extends ElementObject {
  //   constructor(
  //     engine: Engine,
  //     parent: BaseObject | null,
  //     element: HTMLElement,
  //   ) {
  //     super(engine, parent);
  //     this.element = element;
  //   }
  // }

  // class TimelineBlockObject extends ElementObject {
  //   id: string;
  //   isVisible: boolean = true;

  //   constructor(
  //     engine: Engine,
  //     parent: BaseObject | null,
  //     element: HTMLElement,
  //     id: string,
  //   ) {
  //     super(engine, parent);
  //     this.element = element;
  //     this.id = id;
  //   }

  //   readDom(
  //     accountTransform: boolean = false,
  //     stage: "READ_1" | "READ_2" | "READ_3" | null = null,
  //   ) {
  //     super.readDom(accountTransform, stage);
  //     if (this.element) {
  //       this.isVisible = this.element.style.display !== "none";
  //     }
  //   }
  // }

  class ConnectorLineObject extends ElementObject {
    id: string;
    startOpId: string;
    endBlockId: string;

    svg_dx: number = 0;
    svg_dy: number = 0;
    // visible: boolean = true;

    constructor(
      engine: EngineClass,
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
      // if (!hostObject) return;
      const startObj = opObjects[this.startOpId];
      const endObj = blockObjects[this.endBlockId];

      if (!startObj || !endObj || !endObj.element) return;

      // const hostProp = hostObject.getDomProperty(stage);
      const startProp = startObj.getDomProperty(stage);
      const endProp = endObj.getDomProperty(stage);

      this.transform.x = startProp.x + startProp.width;
      this.transform.y = startProp.y + startProp.height / 2;

      // if (!endObj.isVisible) {
      //   this.visible = false;
      // } else {
      //   this.visible = true;
        this.svg_dx = endProp.x - (startProp.x + startProp.width);
        this.svg_dy = (endProp.y + endProp.height / 2) - (startProp.y + startProp.height / 2);
      // }
    }

    writeDom() {
      if (!this.element) return;
      // if (!this.visible) {
      //   this.element.style.display = "none";
      //   return;
      // }
      // this.element.style.display = "block";
      this.element.setAttribute("x1", "0");
      this.element.setAttribute("y1", "0");
      this.element.setAttribute("x2", String(this.svg_dx));
      this.element.setAttribute("y2", String(this.svg_dy));
    }
  }

  type NodeDeps = { engine: EngineClass | null; controller: BaseObject | null };

  const operationRef: Action<
    HTMLElement,
    { id: string } & NodeDeps
  > = (node, { id, engine, controller }) => {
    let obj: ElementObject | null = null;

    const update = ({
      id,
      engine,
      controller,
    }: { id: string } & NodeDeps) => {
      if (obj && (obj.engine !== engine || !controller)) {
        obj.destroy();
        obj = null;
      }
      if (!obj && engine && controller) {
        obj = new ElementObject(engine, controller);
        obj.gid = id;
        obj.element = node;
        opObjects[id] = obj;
      }
    };

    update({ id, engine, controller });

    return {
      update,
      destroy() {
        if (obj) {
          obj.destroy();
          delete opObjects[id];
        }
      },
    };
  };

  const timelineBlockRef: Action<
    HTMLElement,
    { id: string } & NodeDeps
  > = (node, { id, engine, controller }) => {
    let obj: ElementObject | null = null;

    const update = ({
      id,
      engine,
      controller,
    }: { id: string } & NodeDeps) => {
      if (obj && (obj.engine !== engine || !controller)) {
        obj.destroy();
        obj = null;
      }
      if (!obj && engine && controller) {
        obj = new ElementObject(engine, controller);
        obj.gid = id;
        obj.element = node;
        blockObjects[id] = obj;
      }
    };

    update({ id, engine, controller });
    return {
      update,
      destroy() {
        if (obj) {
          obj.destroy();
          delete blockObjects[id];
        }
      },
    };
  };

  const connectorLineRef: Action<
    SVGLineElement,
    { id: string; startOpId: string; endBlockId: string } & NodeDeps
  > = (node, { id, startOpId, endBlockId, engine, controller }) => {
    let obj: ConnectorLineObject | null = null;

    const update = ({
      id,
      startOpId,
      endBlockId,
      engine,
      controller,
    }: { id: string; startOpId: string; endBlockId: string } & NodeDeps) => {
      if (obj && (obj.engine !== engine || !controller)) {
        obj.destroy();
        obj = null;
      }

      if (!obj && engine && controller) {
        obj = new ConnectorLineObject(
          engine,
          controller,
          node,
          id,
          startOpId,
          endBlockId,
        );
        lineObjects[id] = obj;
      }
    };

    update({ id, startOpId, endBlockId, engine, controller });

    return {
      update,
      destroy() {
        if (obj) {
          obj.destroy();
          delete lineObjects[id];
        }
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
          obj.copyDomProperty("READ_1", "READ_3");
        });
        // Also read host and ops for lines
        // hostObject?.readDom(false, "READ_3");
        Object.values(opObjects).forEach((obj) => {
          obj.readDom(false, "READ_3");
          obj.copyDomProperty("READ_3", "READ_2");
        });
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

    // controller.queueUpdate(
    //   "WRITE_2",
    //   () => {
    //     updateLines();
    //   },
    //   "animate-update-lines",
    // );

    // WRITE_2: Apply FLIP animations based on position delta
    controller.queueUpdate(
      "WRITE_2",
      () => {
        Object.values(blockObjects).forEach(async (obj) => {
          if (!visibleBlocks.has(obj.gid)) return;

          const prev = obj.getDomProperty("READ_1");
          const curr = obj.getDomProperty("READ_2");

          const dx = prev.x - curr.x;
          const dy = prev.y - curr.y;

          // if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) {
            const isReflow = obj.gid.startsWith("reflow-");
            const keyframes = isReflow
              ? { opacity: [0, 1] }
              : {
                  transform: [`translate(${dx}px, ${dy}px)`, `translate(0, 0)`],
                };

            const anim = new AnimationObject(obj.element, keyframes, {
              duration: 350,
              easing: "cubic-bezier(0.4, 0, 0.2, 1)",
              delay: isReflow ? 200 : 0,
              persist: isReflow,
              // Update READ_3 positions on each animation frame so lines can track
              // getBoundingClientRect() returns the visual position including CSS transforms
              tick: () => {
                obj.queueUpdate("READ_3", () => {
                  obj.readDom(false, "READ_3");
                  const line = Object.values(lineObjects).find(
                    (l) => l.endBlockId === obj.gid,
                  );
                  if (line) {
                    line.updatePosition("READ_3");
                    line.writeDom();
                    line.writeTransform();
                  }
                });

              },
            });
            await obj.addAnimation(anim);
            anim.play();
          // }
        });
      },
      "animate-write-2",
    );
  };

  // let shouldUpdateLines = true;

  // const updateLines = () => {
  // //   if (!controller || !shouldUpdateLines) return;

  // //   // Calculate and write line positions
  // //   controller.queueUpdate(
  // //     "WRITE_3",
  // //     () => {
  //       Object.values(lineObjects).forEach((line) => {
  //         line.updatePosition("READ_2");
  //         line.writeDom();
  //         line.writeTransform();
  //       });

  //       // Re-queue for next frame
  //       // TODO: Add an engine API to queue updates for the next frame instead of using setTimeout
  //   //     if (shouldUpdateLines) {
  //   //       setTimeout(() => updateLines(), 0);
  //   //     }
  //   //   },
  //   //   "line-update-write",
  //   // );
  // };

  onDestroy(() => {
    // shouldUpdateLines = false;
    if (controller) controller.destroy();
    // if (hostObject) hostObject.destroy();
    // engine.destroy(); // Managed by Canvas
  });

  // $effect(() => {
  //   if (connectorHost && engine && controller && !hostObject) {
  //     hostObject = new HostObject(engine, controller, connectorHost);
  //   }
  //   // Cleanup handled in unrelated onDestroy or explicit null check?
  //   // The previous code had a return cleanup in $effect.
  //   return () => {
  //       if (hostObject) {
  //           hostObject.destroy();
  //           hostObject = null;
  //       }
  //   }
  // });

  $effect(() => {
    // if (controller) {
      animateBlocks(optimize);
    // }
  });

  // onMount(() => {
    // updateLines();
  // });

</script>

<HighlightCardShell
  className="dom-optimization-card theme-secondary-2"
  title="DOM Optimization"
  description="Batch DOM reads and writes to avoid layout thrash."
>
  <Engine
    bind:engine 
    id="dom-optimization-highlight" 
    debug={debugState.enabled}
    style={{ height: '100%' }}
  >
  <div class="optimization-demo" bind:this={connectorHost}>
    <!-- <label slot="headingAside" class="opt-toggle"> -->
     <div class="opt-toggle">
      <label>Optimize
      <input
        class="toggle"
        type="checkbox"
        bind:checked={optimize}
        aria-label="Toggle DOM optimization"
      >
      <span></span>
    </label>
    </div>
    <!-- </label> -->
    <div class="operations-column">
      <p class="column-label">Queue</p>
      <ul>
        {#each operations as op}
          <li class={`operation-item ${op.type}`} use:operationRef={{ id: op.id, engine, controller }}>
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
            use:timelineBlockRef={{ id: block.id, engine, controller }}
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
            engine,
            controller
          }}
        />
      {/each}
    </svg>
  </div>
  </Engine>
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
