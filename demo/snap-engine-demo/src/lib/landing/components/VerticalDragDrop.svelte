<script lang="ts">
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  const items = [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4",
    "Option 5",
    "Option 6",
    "Option 7",
    "Option 8"
  ];

  const brailleChar = "⠿";
</script>

<Canvas id="vertical-drag-drop-canvas">
  <div class="vertical-drag-drop">
    <Container config={{ direction: "column", groupID: "vertical-landing" }}>
      {#each items as label (label)}
        <Item className="card">
          <div class="drag-item-content">
            <span class="drag-dots" aria-hidden="true">{brailleChar}</span>
            <p>{label}</p>
          </div>
        </Item>
      {/each}
    </Container>
  </div>
</Canvas>

<style lang="scss">
  .vertical-drag-drop {
    height: 100%;
  }

  :global(.vertical-drag-drop .container) {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    align-items: stretch;
    justify-content: flex-start;
  }

  :global(.vertical-drag-drop .item-wrapper) {
    width: 100%;
    height: 12.5%;
    box-shadow: none;
  }

  :global(.vertical-drag-drop .item) {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0.25rem 0.75rem;
    gap: 0.5rem;
  }

  .drag-item-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  :global(.vertical-drag-drop .item p) {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.03em;
    color: rgb(102, 99, 98);
  }

  .drag-dots {
    font-family: "Menlo", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.75rem;
    color: #9a9796;
    letter-spacing: 0.1em;
  }
</style>
