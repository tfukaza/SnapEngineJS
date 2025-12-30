<script lang="ts">
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  const items = [
    "Item A",
    "Item B",
    "Item C",
    "Item D",
    "Item E",
    "Item F",
    "Item G",
    "Item H"
  ];

  const brailleChar = "⠿";

  let canvasComponent: Canvas | null = null;

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<Canvas id="horizontal-drag-drop-canvas" bind:this={canvasComponent}>
  <div class="horizontal-drag-drop">
    <Container config={{ direction: "row", groupID: "horizontal-landing" }}>
      {#each items as label (label)}
        <Item className="card">
          <div class="drag-item-content">
            <p>{label}</p>
            <span class="drag-dots" aria-hidden="true">{brailleChar}</span>
          </div>
        </Item>
      {/each}
    </Container>
  </div>
</Canvas>

<style lang="scss">

  @import "../landing.scss";

  .horizontal-drag-drop {
    height: 100%;
  }

  :global(.horizontal-drag-drop .container) {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  :global(.horizontal-drag-drop .item-wrapper) {
    height: 100%;
    width: 12.5%;
    box-shadow: none;
    --ui-radius: 6px;
  }

  :global(.horizontal-drag-drop .item) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0.5rem 0;
  }

  .drag-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    height: 100%;
  }

  :global(.horizontal-drag-drop .item p) {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    margin: 0;
  }

  .drag-dots {
    font-family: "Menlo", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.75rem;
    color: #9a9796;
    letter-spacing: 0.1em;
  }
</style>
