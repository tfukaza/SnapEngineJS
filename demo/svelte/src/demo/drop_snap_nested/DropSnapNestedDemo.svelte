<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Item, ItemContainer as Container } from "@snap-engine/snapsort-svelte";
  import type { Engine as EngineClass } from "@snap-engine/core";

  let engineInstance: EngineClass | null = $state(null);
  let debugMode = $state(false);

  const DEBUG_TAGS = [
    { id: "grid", label: "Grid" },
    { id: "hitboxes", label: "Hitboxes" },
    { id: "dom-read-1", label: "DOM Read 1" },
    { id: "dom-read-2", label: "DOM Read 2" },
    { id: "dom-read-3", label: "DOM Read 3" },
    { id: "rows", label: "Rows" },
    { id: "item-positions", label: "Item Positions" },
    { id: "containers", label: "Containers" },
    { id: "drop-index", label: "Drop Index" },
    { id: "drop-layout", label: "Drop Layout" },
    { id: "drop-snapshot", label: "Drop Snapshot" },
    { id: "drop-collisions", label: "Drop Collisions" },
    { id: "drop-candidates", label: "Drop Candidates" },
    { id: "drop-neighbors", label: "Drop Neighbors" },
    { id: "drop-tiebreak", label: "Drop Tie-break" },
    { id: "drop-zones", label: "Drop Zones" },
    { id: "collisions", label: "Collisions" },
    { id: "animations", label: "Animations" },
  ] as const;

  let enabledTags = $state<Record<string, boolean>>(
    Object.fromEntries(DEBUG_TAGS.map((tag) => [tag.id, tag.id.startsWith("drop-")])),
  );

  function applyTagFilter() {
    const renderer = engineInstance?.debugRenderer;
    if (!renderer) return;

    const allEnabled = DEBUG_TAGS.every((tag) => enabledTags[tag.id]);
    renderer.enabledTags = allEnabled
      ? null
      : new Set(DEBUG_TAGS.filter((tag) => enabledTags[tag.id]).map((tag) => tag.id));
  }

  function onTagChange(id: string) {
    enabledTags[id] = !enabledTags[id];
    applyTagFilter();
  }

  function toggleAll(on: boolean) {
    for (const tag of DEBUG_TAGS) {
      enabledTags[tag.id] = on;
    }
    applyTagFilter();
  }

  export function setDebug(enabled: boolean) {
    debugMode = enabled;
  }

  $effect(() => {
    if (engineInstance) {
      applyTagFilter();
    }
  });
</script>

<div class="snapsort-demo dev-style">
  <h1>SnapSort</h1>

  <div class="snapsort-shell">
    <div class="engine-area">
      <Engine id="snapsort-combined-demo-canvas" debug={debugMode} bind:engine={engineInstance}>
        <div class="demo-grid">
          <article class="demo-cell">
            <h2>Vertical Column</h2>
            <Container config={{ direction: "column", groupID: "vertical-group" }}>
              <Item className="demo-item"><p>Item 1</p></Item>
              <Item className="demo-item"><p>Item 2</p></Item>
              <Item className="demo-item"><p>Item 3</p></Item>
              <Item className="demo-item"><p>Item 4</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Horizontal Row</h2>
            <Container config={{ direction: "row", groupID: "horizontal-group" }}>
              <Item className="demo-item"><p>Item 1</p></Item>
              <Item className="demo-item"><p>Item 2</p></Item>
              <Item className="demo-item"><p>Item 3</p></Item>
              <Item className="demo-item"><p>Item 4</p></Item>
            </Container>
          </article>

          <article class="demo-cell wide">
            <h2>Wrapping Row</h2>
            <Container config={{ direction: "row", groupID: "wrap-row" }} locked={true}>
              {#each Array.from({ length: 12 }, (_, index) => index + 1) as n}
                <Item className="demo-item row-item"><p>W{n}</p></Item>
              {/each}
            </Container>
          </article>

          <article class="demo-cell wide">
            <h2>Horizontal Double Row</h2>
            <Container config={{ direction: "row", groupID: "double-row-group" }}>
              {#each Array.from({ length: 28 }, (_, index) => index + 1) as n}
                <Item className="demo-item row-item"><p>Item {n}</p></Item>
              {/each}
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Different Sizes</h2>
            <Container config={{ direction: "row", groupID: "sizes-group" }}>
              <Item className="demo-item"><p style="width: 60px;">Small</p></Item>
              <Item className="demo-item"><p style="width: 100px;">Medium</p></Item>
              <Item className="demo-item"><p style="width: 140px;">Large</p></Item>
              <Item className="demo-item"><p style="width: 60px;">Tall</p></Item>
              <Item className="demo-item"><p style="width: 30px;">Short</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Flat List</h2>
            <Container config={{ direction: "column", groupID: "flat-group" }} locked={true}>
              <Item className="demo-item"><p>Item A</p></Item>
              <Item className="demo-item"><p>Item B</p></Item>
              <Item className="demo-item"><p>Item C</p></Item>
              <Item className="demo-item"><p>Item D</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Multiple Drop Areas</h2>
            <Container config={{ direction: "row", name: "multi-root", noDrop: true }} locked={true}>
              <Container config={{ direction: "column", name: "multi-area-1" }} locked={true}>
                <h3>Area 1</h3>
                <Item className="demo-item"><p>Item A</p></Item>
                <Item className="demo-item"><p>Item B</p></Item>
                <Item className="demo-item"><p>Item C</p></Item>
              </Container>
              <Container config={{ direction: "column", name: "multi-area-2" }} locked={true}>
                <h3>Area 2</h3>
                <Item className="demo-item"><p>Item X</p></Item>
                <Item className="demo-item"><p>Item Y</p></Item>
                <Item className="demo-item"><p>Item Z</p></Item>
              </Container>
            </Container>
          </article>

          <article class="demo-cell wide">
            <h2>Multiple Drop Areas Row</h2>
            <Container config={{ direction: "column", name: "multi-row-root" }} locked={true}>
              <h3>Area 1</h3>
              <Container config={{ direction: "row", name: "multi-row-area-1" }} locked={true}>
                <Item className="demo-item"><p>Item A</p></Item>
                <Item className="demo-item"><p>Item B</p></Item>
                <Item className="demo-item"><p>Item C</p></Item>
              </Container>
              <h3>Area 2</h3>
              <Container config={{ direction: "row", name: "multi-row-area-2" }} locked={true}>
                <Item className="demo-item"><p>Item X</p></Item>
                <Item className="demo-item"><p>Item Y</p></Item>
                <Item className="demo-item"><p>Item Z</p></Item>
              </Container>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Nested Container</h2>
            <Container config={{ direction: "column", groupID: "nested-group" }} locked={true}>
              <Item className="demo-item"><p>Item 1</p></Item>
              <Item className="demo-item"><p>Item 1.5</p></Item>
              <Container config={{ direction: "column", groupID: "nested-group" }} locked={false}>
                <Item className="demo-item sub-item"><p>Sub A1</p></Item>
                <Item className="demo-item sub-item"><p>Sub A2</p></Item>
                <Item className="demo-item sub-item"><p>Sub A3</p></Item>
              </Container>
              <Item className="demo-item"><p>Item 2</p></Item>
              <Item className="demo-item"><p>Item 3</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Draggable Sub-Containers</h2>
            <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked={true}>
              <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked={false}>
                <Item className="demo-item sub-item"><p>Group 1 - A</p></Item>
                <Item className="demo-item sub-item"><p>Group 1 - B</p></Item>
              </Container>
              <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked={false}>
                <Item className="demo-item sub-item"><p>Group 2 - A</p></Item>
                <Item className="demo-item sub-item"><p>Group 2 - B</p></Item>
                <Item className="demo-item sub-item"><p>Group 2 - C</p></Item>
              </Container>
              <Item className="demo-item"><p>Loose Item</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Nested Row Groups</h2>
            <Container config={{ direction: "row", groupID: "nested-row-group" }} locked={true}>
              <Item className="demo-item row-item"><p>R1</p></Item>
              <Container config={{ direction: "row", groupID: "nested-row-group" }} locked={false}>
                <Item className="demo-item row-item sub-item"><p>S1</p></Item>
                <Item className="demo-item row-item sub-item"><p>S2</p></Item>
                <Item className="demo-item row-item sub-item"><p>S3</p></Item>
              </Container>
              <Item className="demo-item row-item"><p>R2</p></Item>
              <Item className="demo-item row-item"><p>R3</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Layers Panel</h2>
            <Container config={{ direction: "column", groupID: "layers" }} locked={true}>
              <Item className="layer-item">
                <div class="layer-row">
                  <span class="layer-icon">&#x25FB;</span>
                  <span>Header</span>
                </div>
              </Item>
              <Container config={{ direction: "column", groupID: "layers" }} locked={false}>
                <div class="group-label">Hero Section</div>
                <Item className="layer-item">
                  <div class="layer-row">
                    <span class="layer-icon">&#x25CB;</span>
                    <span>Avatar</span>
                  </div>
                </Item>
                <Item className="layer-item">
                  <div class="layer-row">
                    <span class="layer-icon">T</span>
                    <span>Title</span>
                  </div>
                </Item>
                <Item className="layer-item">
                  <div class="layer-row">
                    <span class="layer-icon">T</span>
                    <span>Subtitle</span>
                  </div>
                </Item>
              </Container>
              <Item className="layer-item">
                <div class="layer-row">
                  <span class="layer-icon">&#x25FB;</span>
                  <span>Card Grid</span>
                </div>
              </Item>
              <Item className="layer-item">
                <div class="layer-row">
                  <span class="layer-icon">&#x25FB;</span>
                  <span>Footer</span>
                </div>
              </Item>
            </Container>
          </article>
        </div>
      </Engine>
    </div>

    {#if debugMode}
      <aside class="debug-sidebar">
        <div class="debug-sidebar-header">
          <h2>Debug Tags</h2>
          <div class="debug-sidebar-actions">
            <button onclick={() => toggleAll(true)}>All</button>
            <button onclick={() => toggleAll(false)}>None</button>
          </div>
        </div>
        {#each DEBUG_TAGS as tag}
          <label class="debug-tag-item">
            <input type="checkbox" checked={enabledTags[tag.id]} onchange={() => onTagChange(tag.id)} />
            <span></span>
            {tag.label}
          </label>
        {/each}
      </aside>
    {/if}
  </div>
</div>

<style lang="scss">
  .snapsort-demo {
    width: 100%;
    min-height: 100%;
    overflow: visible;
    background: #fff;
    box-sizing: border-box;
    padding: var(--size-24);
    display: flex;
    flex-direction: column;
    gap: var(--size-24);
  }

  h1 {
    margin: 0;
    font-family: "Geist", sans-serif;
    font-size: 72px;
    line-height: 1;
    color: #000;
  }

  .snapsort-shell {
    display: flex;
    align-items: stretch;
    gap: var(--size-24);
  }

  .engine-area {
    flex: 1;
    min-width: 0;
  }

  .demo-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--size-24);
    align-items: start;
    pointer-events: auto;
  }

  .demo-cell {
    min-height: 240px;
    border: 2px solid #000;
    background: #fff;
    box-sizing: border-box;
    padding: var(--size-16);
  }

  .demo-cell.wide {
    grid-column: span 2;
  }

  h2 {
    margin: 0 0 var(--size-16);
    font-family: "Geist", sans-serif;
    font-size: 24px;
    font-weight: 500;
    color: #000;
  }

  h3 {
    margin: var(--size-8) 0;
    font-family: "Geist", sans-serif;
    font-size: 16px;
    font-weight: 500;
    color: #000;
  }

  :global(.snapsort-container) {
    gap: var(--size-8);
    min-height: 40px;
  }

  :global(.snapsort-container .snapsort-container) {
    border: 2px solid #000;
    padding: var(--size-8);
  }

  :global(.demo-item),
  :global(.layer-item),
  :global(.snapsort-item) {
    margin: var(--size-4);
    border: 2px solid #000;
    background: #fff;
    cursor: grab;
    box-sizing: border-box;
  }

  :global(.demo-item:active),
  :global(.layer-item:active),
  :global(.snapsort-item:active) {
    cursor: grabbing;
  }

  :global(.demo-item p) {
    margin: 0;
    padding: var(--size-8) var(--size-12);
    font-size: 1rem;
    user-select: none;
  }

  :global(.demo-item.row-item) {
    min-width: 50px;
    text-align: center;
  }

  :global(.demo-item.sub-item) {
    opacity: 0.6;
  }

  :global(.ghost) {
    background: #e5e5e5;
    border: 2px solid #9a9a9a;
    box-sizing: border-box;
    opacity: 1;
  }

  .layer-row {
    display: flex;
    align-items: center;
    gap: var(--size-8);
    padding: var(--size-8) var(--size-12);
    user-select: none;
    font-size: 1rem;
  }

  .layer-icon {
    width: var(--size-16);
    text-align: center;
  }

  .group-label {
    padding: var(--size-8) var(--size-12);
    font-size: 1rem;
    font-weight: 500;
    border-bottom: 2px solid #000;
  }

  .debug-sidebar {
    width: 260px;
    flex-shrink: 0;
    background: #fff;
    border: 2px solid #000;
    padding: var(--size-16);
    box-sizing: border-box;
    pointer-events: auto;
  }

  .debug-sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-12);
    margin-bottom: var(--size-16);
  }

  .debug-sidebar-actions {
    display: flex;
    gap: var(--size-8);
  }

  .debug-tag-item {
    display: flex;
    align-items: center;
    gap: var(--size-8);
    padding: var(--size-4) 0;
    cursor: pointer;
    user-select: none;
  }

  @media (max-width: 900px) {
    .snapsort-shell {
      flex-direction: column;
    }

    .demo-cell.wide {
      grid-column: auto;
    }

    .debug-sidebar {
      width: 100%;
    }
  }
</style>
