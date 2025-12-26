<script lang="ts">
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  type Tile = {
    label: string;
    span: "span-1" | "span-2" | "span-3" | "span-4";
    accent: string;
    muted?: boolean;
  };

  const tiles: Tile[] = [
    { label: "Physics", span: "span-1", accent: "#67e8f9" },
    { label: "Nodes", span: "span-2", accent: "#fca5a5" },
    { label: "Materials", span: "span-3", accent: "#c4b5fd" },
    { label: "Constraints", span: "span-1", accent: "#fdba74" },
    { label: "Automation", span: "span-2", accent: "#fef08a" },
    { label: "Analytics", span: "span-1", accent: "#bbf7d0" },
    { label: "Expressions", span: "span-4", accent: "#f9a8d4", muted: true },
    { label: "Snapping", span: "span-1", accent: "#fde68a" },
    { label: "IO", span: "span-1", accent: "#86efac" },
    { label: "Debug", span: "span-2", accent: "#fcd34d" }
  ];
</script>

<Canvas id="multi-row-drag-demo">
  <div class="multi-row-drag-demo">
    <Container config={{ direction: "row", groupID: "multi-row-landing" }}>
      {#each tiles as tile (tile.label)}
        <Item className={`multi-row-item chip ${tile.span}`}>
          <div class={`tile ${tile.muted ? "muted" : ""}`} style={`--accent: ${tile.accent}`}>
            <span class="dot" aria-hidden="true"></span>
            <span class="label">{tile.label}</span>
          </div>
        </Item>
      {/each}
    </Container>
  </div>
</Canvas>

<style lang="scss">
  .multi-row-drag-demo {
    width: 100%;
    height: 100%;
  }

  :global(#multi-row-drag-demo .container) {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    align-content: flex-start;
  }

  :global(#multi-row-drag-demo .item-wrapper) {
    box-shadow: none;
    padding: 0.2rem;
  }

  :global(.multi-row-item) {
    flex: 1 1 12%;
    min-width: 84px;
  }

  :global(.multi-row-item.span-1) {
    flex-basis: 15%;
    min-width: 84px;
  }

  :global(.multi-row-item.span-2) {
    flex-basis: 26%;
    min-width: 120px;
  }

  :global(.multi-row-item.span-3) {
    flex-basis: 38%;
    min-width: 160px;
  }

  :global(.multi-row-item.span-4) {
    flex-basis: 50%;
    min-width: 200px;
  }

  :global(.multi-row-item.card) {
    background: transparent;
    border: none;
    border-radius: 999px;
  }

  .tile {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    width: 100%;
    min-height: 2.1rem;
    padding: 0.3rem 0.75rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(10, 12, 24, 0.75);
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.8rem;
    letter-spacing: 0.05em;
    pointer-events: none;
  }

  .tile.muted {
    opacity: 0.7;
  }

  .dot {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  .label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
