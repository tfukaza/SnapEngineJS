<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Item, ItemContainer as Container } from "@snap-engine/snapsort-svelte";
  import type {
    ItemContainer as SnapSortItemContainer,
    SnapSortDomInsertEvent,
    SnapSortDomRemoveEvent,
  } from "@snap-engine/snapsort";

  type DemoItem = {
    id: string;
    label: string;
    detail: string;
  };

  let nextItemNumber = $state(5);
  let snapSortContainer = $state<SnapSortItemContainer>();
  let items = $state<DemoItem[]>([
    { id: "item-1", label: "Profile fields", detail: "Account settings" },
    { id: "item-2", label: "Invite flow", detail: "Workspace setup" },
    { id: "item-3", label: "Audit log", detail: "Admin tools" },
    { id: "item-4", label: "Search filters", detail: "Results page" },
  ]);

  function createItem(): DemoItem {
    const itemNumber = nextItemNumber++;
    return {
      id: `item-${itemNumber}`,
      label: `Task ${itemNumber}`,
      detail: "Added from array state",
    };
  }

  function addItem() {
    items = [...items, createItem()];
  }

  function deleteItem(itemId: string) {
    snapSortContainer?.removeItem(itemId);
  }

  function resetItems() {
    nextItemNumber = 5;
    items = [
      { id: "item-1", label: "Profile fields", detail: "Account settings" },
      { id: "item-2", label: "Invite flow", detail: "Workspace setup" },
      { id: "item-3", label: "Audit log", detail: "Admin tools" },
      { id: "item-4", label: "Search filters", detail: "Results page" },
    ];
  }

  function handleSnapSortDomInsert(event: SnapSortDomInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;

    const nextItems = items.slice();
    const sourceIndex = nextItems.findIndex((item) => item.id === itemId);
    if (sourceIndex === -1) return;

    const [item] = nextItems.splice(sourceIndex, 1);
    const destinationIndex = Math.max(
      0,
      Math.min(event.index, nextItems.length),
    );
    nextItems.splice(destinationIndex, 0, item);
    items = nextItems;
  }

  function handleSnapSortDomRemove(event: SnapSortDomRemoveEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;

    items = items.filter((item) => item.id !== itemId);
  }

  function stopControlEvent(event: Event) {
    event.stopPropagation();
  }

  function runControl(event: Event, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }
</script>

<div class="components-demo">
  <header class="demo-header">
    <div>
      <h1>SnapSort Components</h1>
      <p>{items.length} array items</p>
    </div>
    <div class="toolbar">
      <button onclick={addItem}>Add Item</button>
      <button onclick={resetItems}>Reset</button>
    </div>
  </header>

  <div class="engine-area">
    <Engine id="snapsort-components-demo-canvas">
      <div class="list-panel">
        <div class="list-header">
          <h2>Array-backed list</h2>
        </div>

        <Container
          className="array-list"
          bind:container={snapSortContainer}
          config={{
            direction: "column",
            groupID: "component-list",
            name: "component-array-list",
            callbacks: {
              onDomInsert: handleSnapSortDomInsert,
              onDomRemove: handleSnapSortDomRemove,
            },
          }}
          locked={true}
          metadata={{ listId: "component-list" }}
        >
          {#each items as item (item.id)}
            <Item className="task-card" metadata={{ itemId: item.id }}>
              <div class="task-content">
                <div class="task-main">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <button
                  aria-label={`Delete ${item.label}`}
                  onpointerdown={stopControlEvent}
                  onpointerup={(event) => runControl(event, () => deleteItem(item.id))}
                  onclick={(event) => runControl(event, () => deleteItem(item.id))}
                >Delete</button>
              </div>
            </Item>
          {/each}
        </Container>
      </div>
    </Engine>
  </div>
</div>

<style lang="scss">
  .components-demo {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #fff;
    box-sizing: border-box;
    padding: var(--size-24);
    display: flex;
    flex-direction: column;
    gap: var(--size-24);
  }

  .demo-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: var(--size-16);
    border-bottom: 2px solid #000;
    padding-bottom: var(--size-16);
  }

  h1 {
    margin: 0;
    font-family: "Geist", sans-serif;
    font-size: 56px;
    line-height: 1;
  }

  h2 {
    margin: 0;
    font-family: "Geist", sans-serif;
    font-size: 20px;
  }

  p,
  span,
  strong {
    font-family: "Geist", sans-serif;
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-8);
  }

  button {
    cursor: pointer;
    font-family: "Geist", sans-serif;
    font-size: 14px;
  }

  .engine-area {
    flex: 1;
    min-height: 420px;
  }

  .list-panel {
    width: min(520px, 100%);
    border: 2px solid #000;
    padding: var(--size-12);
    background: #fff;
    box-sizing: border-box;
    pointer-events: auto;
  }

  :global(.array-list) {
    width: 100%;
    min-height: 280px;
    gap: var(--size-8);
    box-sizing: border-box;
    pointer-events: auto;
  }

  .list-header {
    width: 100%;
    border-bottom: 2px solid #000;
    padding-bottom: var(--size-12);
    margin-bottom: var(--size-12);
    box-sizing: border-box;
  }

  :global(.task-card) {
    width: 100%;
    align-items: stretch;
    border: 2px solid #000;
    background: #fff;
    cursor: grab;
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(.task-card:active) {
    cursor: grabbing;
  }

  .task-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--size-12);
    width: 100%;
    padding: var(--size-12);
    box-sizing: border-box;
  }

  .task-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
  }

  .task-main strong,
  .task-main span {
    overflow-wrap: anywhere;
  }

  .task-main span {
    font-size: 13px;
  }

  :global(.ghost) {
    background: #e9e9e9;
    border: 2px solid #777;
    opacity: 1;
  }

  @media (max-width: 700px) {
    .demo-header {
      flex-direction: column;
      align-items: flex-start;
    }

    h1 {
      font-size: 40px;
    }
  }
</style>
