<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Container, Item } from "@snap-engine/snapsort-svelte";
  import type { Engine as EngineClass } from "@snap-engine/core";
  import type { ItemMoveEvent } from "@snap-engine/snapsort";

  let engineInstance: EngineClass | null = $state(null);
  let debugMode = $state(false);
  const disableNestedFlip =
    new URLSearchParams(window.location.search).get("disableNestedFlip") === "1";
  const slowNestedFlip =
    new URLSearchParams(window.location.search).get("slowNestedFlip") === "1";
  const lockNestedChild =
    new URLSearchParams(window.location.search).get("lockNestedChild") === "1";
  const showCompactNested =
    new URLSearchParams(window.location.search).get("compactNested") === "1";
  const nestedAnimationConfig = disableNestedFlip
    ? { animation: { reorder: null, drop: null } }
    : slowNestedFlip
    ? {
        animation: {
          reorder: { duration: 800, timing_function: "linear" },
          drop: { duration: 800, timing_function: "linear" },
        },
      }
    : {};

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

  // Multi-item drag proof: cmd/ctrl-click toggles selection within a list;
  // dragging any selected item drags the whole selected set together.
  let selectedVertical = $state<Set<number>>(new Set());

  // Migrated to the items+snippet Container API (with a custom `ghost`
  // snippet) as the Stage 2 adapter-ergonomics proof of concept.
  const doubleRowItems = Array.from({ length: 28 }, (_, index) => index + 1);

  // Cross-container items-mode surface: proves the adapter's per-container
  // ghostEntries state doesn't leak a stale ghost into the area a run
  // anchor left (the fix in flow-ghost.ts's moveGhost/doMove).
  type MultiAreaItem = { id: string; label: string };
  type MultiArea = "area1" | "area2";
  let multiArea1Items = $state<MultiAreaItem[]>([
    { id: "multi-a", label: "Item A" },
    { id: "multi-b", label: "Item B" },
    { id: "multi-c", label: "Item C" },
  ]);
  let multiArea2Items = $state<MultiAreaItem[]>([
    { id: "multi-x", label: "Item X" },
    { id: "multi-y", label: "Item Y" },
    { id: "multi-z", label: "Item Z" },
  ]);

  function multiAreaList(area: MultiArea): MultiAreaItem[] {
    return area === "area1" ? multiArea1Items : multiArea2Items;
  }

  function setMultiAreaList(area: MultiArea, next: MultiAreaItem[]) {
    if (area === "area1") multiArea1Items = next;
    else multiArea2Items = next;
  }

  function handleMultiAreaMove(event: ItemMoveEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;
    const targetArea = event.to.containerMetadata.area as MultiArea | undefined;
    if (targetArea !== "area1" && targetArea !== "area2") return;

    const sourceArea: MultiArea = multiArea1Items.some((i) => i.id === itemId)
      ? "area1"
      : "area2";
    const moved = multiAreaList(sourceArea).find((i) => i.id === itemId);
    if (!moved) return;

    if (sourceArea !== targetArea) {
      setMultiAreaList(sourceArea, multiAreaList(sourceArea).filter((i) => i.id !== itemId));
    }
    const targetList = multiAreaList(targetArea).filter((i) => i.id !== itemId);
    const index = Math.max(0, Math.min(event.to.index, targetList.length));
    targetList.splice(index, 0, moved);
    setMultiAreaList(targetArea, targetList);
  }

  function toggleVerticalSelection(n: number, event: MouseEvent) {
    if (event.metaKey || event.ctrlKey) {
      const next = new Set(selectedVertical);
      if (next.has(n)) {
        next.delete(n);
      } else {
        next.add(n);
      }
      selectedVertical = next;
    } else {
      selectedVertical = new Set([n]);
    }
  }
</script>

<div class="snapsort-demo dev-style">
  <h1>SnapSort</h1>

  <div class="snapsort-shell">
    <div class="engine-area">
      <Engine id="snapsort-combined-demo-canvas" debug={debugMode} bind:engine={engineInstance}>
        <div class="demo-grid">
          <article class="demo-cell wide horizontal-row-demo">
            <h2>Vertical Column</h2>
            <p class="demo-hint">Cmd/ctrl-click to multi-select, then drag any selected item.</p>
            <Container
              config={{ direction: "column", groupID: "vertical-group" }}
              items={[1, 2, 3, 4]}
              getId={(n) => `vertical-${n}`}
              getClassName={(n) => (selectedVertical.has(n) ? "demo-item selected" : "demo-item")}
              getSelected={(n) => selectedVertical.has(n)}
              onItemClick={(n, e) => toggleVerticalSelection(n, e)}
            >
              {#snippet item(n)}<p>Item {n}</p>{/snippet}
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Horizontal Row</h2>
            <Container config={{ direction: "row", groupID: "wrap-row" }} locked={true}>
              {#each Array.from({ length: 12 }, (_, index) => index + 1) as n}
                <Item className="demo-item row-item"><p>Item {n}</p></Item>
              {/each}
            </Container>
          </article>

          <article class="demo-cell wide">
            <h2>Horizontal Double Row</h2>
            <Container
              config={{ direction: "row", groupID: "double-row-group" }}
              items={doubleRowItems}
              getId={(n) => `double-row-${n}`}
              getClassName={() => "demo-item row-item"}
            >
              {#snippet item(n)}<p>Item {n}</p>{/snippet}
              {#snippet ghost()}<span class="double-row-ghost-label">Drop</span>{/snippet}
            </Container>
          </article>

          <article class="demo-cell wide size-demo">
            <h2>Different Sizes</h2>
            <Container config={{ direction: "row", groupID: "sizes-group" }}>
              <Item className="demo-item size-item"><p style="width: 72px; min-height: 48px;">Small</p></Item>
              <Item className="demo-item size-item"><p style="width: 128px; min-height: 72px;">Medium</p></Item>
              <Item className="demo-item size-item"><p style="width: 220px; min-height: 96px;">Wide</p></Item>
              <Item className="demo-item size-item"><p style="width: 92px; min-height: 156px;">Tall</p></Item>
              <Item className="demo-item size-item"><p style="width: 168px; min-height: 120px;">Large</p></Item>
              <Item className="demo-item size-item"><p style="width: 56px; min-height: 64px;">Narrow</p></Item>
              <Item className="demo-item size-item"><p style="width: 260px; min-height: 72px;">Extra Wide</p></Item>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Multiple Drop Areas</h2>
            <Container config={{ direction: "row", name: "multi-root", noDrop: true }} locked={true}>
              <Container
                config={{ direction: "column", name: "multi-area-1", callbacks: { onItemMove: handleMultiAreaMove } }}
                metadata={{ area: "area1" }}
                locked={true}
                items={multiArea1Items}
                getClassName={() => "demo-item"}
              >
                <h3>Area 1</h3>
                {#snippet item(entry)}<p>{entry.label}</p>{/snippet}
              </Container>
              <Container
                config={{ direction: "column", name: "multi-area-2", callbacks: { onItemMove: handleMultiAreaMove } }}
                metadata={{ area: "area2" }}
                locked={true}
                items={multiArea2Items}
                getClassName={() => "demo-item"}
              >
                <h3>Area 2</h3>
                {#snippet item(entry)}<p>{entry.label}</p>{/snippet}
              </Container>
            </Container>
          </article>

          <article class="demo-cell">
            <h2>Nested Container</h2>
            <Container config={{ direction: "column", groupID: "nested-group", ...nestedAnimationConfig }} locked={true}>
              <Item className="demo-item"><p>Item 1</p></Item>
              <Item className="demo-item"><p>Item 1.5</p></Item>
              <Container config={{ direction: "column", groupID: "nested-group", ...nestedAnimationConfig }} locked={lockNestedChild}>
                <Item className="demo-item sub-item"><p>Sub A1</p></Item>
                <Item className="demo-item sub-item"><p>Sub A2</p></Item>
                <Item className="demo-item sub-item"><p>Sub A3</p></Item>
              </Container>
              <Item className="demo-item"><p>Item 2</p></Item>
              <Item className="demo-item"><p>Item 3</p></Item>
            </Container>
          </article>

          {#if showCompactNested}
            <article class="demo-cell compact-nested-demo">
              <h2>Compact Nested List</h2>
              <Container className="compact-basic-list" config={{ direction: "column", groupID: "compact-nested", ...nestedAnimationConfig }}>
                <Item className="compact-item"><p>Overview</p></Item>
                <Item className="compact-item"><p>Components</p></Item>
                <Item className="compact-item"><p>Usage</p></Item>
                <Container className="compact-nested-list" config={{ direction: "column", groupID: "compact-nested", ...nestedAnimationConfig }}>
                  <Item className="compact-item"><p>Container</p></Item>
                  <Item className="compact-item"><p>Item</p></Item>
                  <Item className="compact-item"><p>Handle</p></Item>
                </Container>
              </Container>
            </article>
          {/if}

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

  .demo-cell.size-demo {
    min-height: 360px;
  }

  .horizontal-row-demo :global(.snapsort-container) {
    max-width: 300px;
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

  .size-demo :global(.snapsort-container) {
    align-items: flex-start;
    min-height: 240px;
  }

  :global(.demo-item.size-item p) {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    text-align: center;
  }

  :global(.demo-item.row-item) {
    min-width: 50px;
    text-align: center;
  }

  :global(.demo-item.selected) {
    border-color: #6366f1;
    box-shadow: inset 0 0 0 2px #6366f1;
    background: #eef2ff;
  }

  .demo-hint {
    margin: 0 0 var(--size-8);
    font-size: 0.75rem;
    color: #888;
  }

  :global(.demo-item.sub-item) {
    opacity: 0.6;
  }

  .compact-nested-demo :global(.compact-basic-list) {
    width: 336px;
    gap: 0.35rem;
    min-height: 0;
    align-items: flex-start;
  }

  .compact-nested-demo :global(.snapsort-container .compact-nested-list) {
    width: calc(100% - 2rem);
    margin-left: 2rem;
    padding: 0 0 0 12px;
    border: 0;
    border-left: 1px solid #cfd4d7;
    gap: 0.35rem;
    min-height: 0;
    align-items: flex-start;
  }

  .compact-nested-demo :global(.compact-item.snapsort-item) {
    margin: 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
  }

  .compact-nested-demo :global(.compact-item p) {
    margin: 0;
    padding: 4px 10px 5px;
    font-size: 14px;
    line-height: 20px;
    user-select: none;
  }

  :global(.ghost) {
    background: #e5e5e5;
    border: 2px solid #9a9a9a;
    box-sizing: border-box;
    opacity: 1;
  }

  :global(.double-row-ghost-label) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background: #eef2ff;
    border: 2px dashed #6366f1;
    box-sizing: border-box;
    font-size: 0.7rem;
    color: #6366f1;
    user-select: none;
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
