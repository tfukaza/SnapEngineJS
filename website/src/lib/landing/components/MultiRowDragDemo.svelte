<script lang="ts">
  import Canvas from "@svelte-demo/lib/Canvas.svelte";
  import Item from "@svelte-demo/demo/drag_drop/Item.svelte";
  import Container from "@svelte-demo/demo/drag_drop/ItemContainer.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  type MathToken = {
    id: string;
    label: string;
    kind: "number" | "operator";
    color?: string;
    value?: number;
    arity?: number;
    fn?: (...args: number[]) => number;
  };

  const numberTokens: MathToken[] = [
    { id: "number-eq1-a", label: "18", kind: "number", value: 18 },
    { id: "number-eq1-b", label: "three", kind: "number", value: 3 },
    { id: "number-eq1-c", label: "twelve", kind: "number", value: 12 },
    { id: "number-eq2-a", label: "24", kind: "number", value: 24 },
    { id: "number-eq2-b", label: "13", kind: "number", value: 13 },
    { id: "number-eq2-c", label: "five", kind: "number", value: 5 },
    { id: "number-eq3-a", label: "84", kind: "number", value: 84 },
    { id: "number-eq3-b", label: "four", kind: "number", value: 4 },
    { id: "number-eq3-c", label: "21", kind: "number", value: 21 }
  ];

  const operatorTokens: MathToken[] = [
    {
      id: "operator-eq1-times",
      label: "×",
      kind: "operator",
      color: "#2563eb",
      arity: 2,
      fn: (a, b) => a * b
    },
    {
      id: "operator-eq1-minus",
      label: "−",
      kind: "operator",
      color: "#c2410c",
      arity: 2,
      fn: (a, b) => a - b
    },
    {
      id: "operator-eq2-plus-first",
      label: "+",
      kind: "operator",
      color: "#be185d",
      arity: 2,
      fn: (a, b) => a + b
    },
    {
      id: "operator-eq2-plus-second",
      label: "+",
      kind: "operator",
      color: "#be185d",
      arity: 2,
      fn: (a, b) => a + b
    },
    {
      id: "operator-eq3-divide",
      label: "÷",
      kind: "operator",
      color: "#059669",
      arity: 2,
      fn: (a, b) => a / b
    },
    {
      id: "operator-eq3-plus",
      label: "+",
      kind: "operator",
      color: "#be185d",
      arity: 2,
      fn: (a, b) => a + b
    }
  ];

  const availableTokens: MathToken[] = [...numberTokens, ...operatorTokens];

  let canvasComponent: Canvas | null = null;

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<Canvas id="multi-row-drag-demo" bind:this={canvasComponent} debug={debugState.enabled}>
  <div class="card multi-drop-demo">
    <div class="areas-wrapper">
      <div class="top-row">
        <div class="area slot top-area">
          <Container config={{ direction: "row", groupID: "multi-row-landing" }}>
            <p class="drop-placeholder">Drop here</p>
          </Container>
        </div>
        <span class="result-target">= 42</span>
      </div>

      <!-- <p class="drop-area-label">Available Parts </p> -->

      <div class="area bottom-area">
        <Container config={{ direction: "row", groupID: "multi-row-landing" }}>
          {#each availableTokens as item (item.id)}
            <Item className="rect-item card">
              <span
                class={`math-token ${item.kind === "operator" ? "math-token-operator" : ""}`}
                style={item.kind === "operator" && item.color ? `color: ${item.color};` : ""}
              >
                {item.label}
              </span>
            </Item>
          {/each}
        </Container>
      </div>
    </div>
  </div>
</Canvas>

<style lang="scss">
  /* svelte-ignore css-unused-selector */
  @import"../landing.scss";

  /* svelte-ignore css-unused-selector */
  :global(#landing) label,
  :global(#landing) p.panel-label,
  :global(#landing) label.panel-label {
    /* shared typography handled in landing.scss */
  }

  .multi-drop-demo {
    width: 100%;
    height: 100%;
    padding: 0.5rem 0.75rem;
    box-sizing: border-box;
  }

  .areas-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .area {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    border-radius: 8px;
  }

  .top-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .top-area {
    flex: 1 1 auto;
    min-height: 32px;
    height: 32px;
    max-height: 32px;
    padding: 0;
    background: transparent;
    border: none;
    overflow: hidden!important;
  }

  .result-target {
    font-family: "Tomorrow", sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-secondary);
    white-space: nowrap;
  }

  .bottom-area {
    flex: 1 1 auto;
    padding: 0.5rem 0.6rem;
    border-radius: 8px;
    border: 1px solid rgba(148, 163, 184, 0.4);
    background: transparent;

 
  }

  .drop-area-label {


    text-align: center;

  }

  .drop-placeholder {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    // display: flex;
    // align-items: center;
    // justify-content: center;
    // font-size: 0.7rem;
    color: #a89aa0;
  }

  :global(.bottom-area .container) {
    gap: 8px;
  }

  :global(.top-area .container) {
    gap: 0px;
  }

  :global(.multi-drop-demo .container) {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    // gap: 0.35rem;
    align-content: flex-start;
  }

  :global(.multi-drop-demo .item-wrapper) {
    height: 32px;
    min-width: 32px;
    width: auto;
  }

  :global(.rect-item.card) {
    box-shadow: 0px 4px 6px -1px rgba(0, 0, 0, 0.1), 0px 2px 4px -1px rgba(0, 0, 0, 0.06);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
  }

  .math-token {
    font-family: "IBM Plex Mono", monospace;
    font-size: 0.9rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-align: center;
    white-space: nowrap;
  }

  .math-token-operator {
    font-weight: 800;
  }


</style>
