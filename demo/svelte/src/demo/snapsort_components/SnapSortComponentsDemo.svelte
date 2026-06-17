<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { tick } from "svelte";
  import {
    Item,
    ItemContainer as Container,
  } from "@snap-engine/snapsort-svelte";
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

  type DemoColumn = {
    id: string;
    title: string;
    items: DemoItem[];
    container?: SnapSortItemContainer;
  };

  const initialColumns: DemoColumn[] = [
    {
      id: "backlog",
      title: "Backlog",
      items: [
        { id: "item-1", label: "Profile fields", detail: "Account settings" },
        { id: "item-2", label: "Invite flow", detail: "Workspace setup" },
        { id: "item-3", label: "Audit log", detail: "Admin tools" },
        { id: "item-4", label: "Search filters", detail: "Results page" },
      ],
    },
    {
      id: "active",
      title: "Active",
      items: [
        { id: "item-5", label: "Board polish", detail: "Column controls" },
      ],
    },
    {
      id: "done",
      title: "Done",
      items: [{ id: "item-6", label: "Audit export", detail: "CSV polish" }],
    },
  ];
  const snapSortCubicAnimation = {
    duration: 180,
    timing_function: "cubic-bezier(0.2, 0, 0, 1)",
  };

  let nextItemNumber = $state(7);
  let columns = $state<DemoColumn[]>(structuredClone(initialColumns));
  let itemCount = $derived(
    columns.reduce((total, column) => total + column.items.length, 0),
  );

  function cloneInitialColumns() {
    return structuredClone(initialColumns);
  }

  function createItem(): DemoItem {
    const itemNumber = nextItemNumber++;
    return {
      id: `item-${itemNumber}`,
      label: `Task ${itemNumber}`,
      detail: "Added from array state",
    };
  }

  function addItem() {
    columns = columns.map((column, index) =>
      index === 0
        ? { ...column, items: [...column.items, createItem()] }
        : column,
    );
  }

  function deleteItem(itemId: string) {
    columns = columns.map((column) => ({
      ...column,
      items: column.items.filter((item) => item.id !== itemId),
    }));
  }

  function moveItemAcrossColumns(itemId: string, direction: -1 | 1) {
    const sourceColumnIndex = columns.findIndex((column) =>
      column.items.some((item) => item.id === itemId),
    );
    if (sourceColumnIndex === -1) return;

    const targetColumnIndex = sourceColumnIndex + direction;
    if (targetColumnIndex < 0 || targetColumnIndex >= columns.length) return;

    const sourceItemIndex = columns[sourceColumnIndex].items.findIndex(
      (item) => item.id === itemId,
    );
    if (sourceItemIndex === -1) return;

    const sourceContainer = columns[sourceColumnIndex].container;
    const targetContainer = columns[targetColumnIndex].container;
    if (!sourceContainer || !targetContainer) return;

    const destinationIndex = Math.min(
      sourceItemIndex,
      columns[targetColumnIndex].items.length,
    );
    const movedBySnapSort = sourceContainer.moveItem(
      itemId,
      targetContainer,
      destinationIndex,
    );
    if (movedBySnapSort) return;

    const movedItem = columns[sourceColumnIndex].items[sourceItemIndex];
    columns = columns.map((column, columnIndex) => {
      if (columnIndex === sourceColumnIndex) {
        return {
          ...column,
          items: column.items.filter((item) => item.id !== itemId),
        };
      }

      if (columnIndex === targetColumnIndex) {
        const nextItems = column.items.slice();
        nextItems.splice(destinationIndex, 0, movedItem);
        return { ...column, items: nextItems };
      }

      return column;
    });
  }

  $effect(() => {
    const demoWindow = window as typeof window & {
      __snapsortMoveComponentItem?: typeof moveItemAcrossColumns;
    };
    demoWindow.__snapsortMoveComponentItem = moveItemAcrossColumns;
    return () => {
      delete demoWindow.__snapsortMoveComponentItem;
    };
  });

  function resetItems() {
    nextItemNumber = 7;
    columns = cloneInitialColumns();
  }

  function handleSnapSortDomInsert(event: SnapSortDomInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;
    const targetColumnId = event.containerMetadata.columnId;
    if (typeof targetColumnId !== "string") return;

    let movedItem: DemoItem | null = null;
    const withoutMovedItem = columns.map((column) => {
      const sourceIndex = column.items.findIndex((item) => item.id === itemId);
      if (sourceIndex === -1) return column;

      const nextItems = column.items.slice();
      const [item] = nextItems.splice(sourceIndex, 1);
      movedItem = item;
      return { ...column, items: nextItems };
    });

    if (!movedItem) return;

    columns = withoutMovedItem.map((column) => {
      if (column.id !== targetColumnId) return column;

      const nextItems = column.items.slice();
      const destinationIndex = Math.max(
        0,
        Math.min(event.index, nextItems.length),
      );
      nextItems.splice(destinationIndex, 0, movedItem);
      return { ...column, items: nextItems };
    });
  }

  function handleSnapSortDomRemove(event: SnapSortDomRemoveEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;

    deleteItem(itemId);
  }

  function stopControlEvent(event: Event) {
    event.stopPropagation();
  }

  function runControl(event: Event, action: () => void) {
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  function controlButton(node: HTMLButtonElement, action: () => void) {
    let currentAction = action;
    const stop = (event: Event) => stopControlEvent(event);
    const run = (event: Event) => runControl(event, currentAction);

    node.addEventListener("pointerdown", stop);
    node.addEventListener("mousedown", stop);
    node.addEventListener("mouseup", run);

    return {
      update(nextAction: () => void) {
        currentAction = nextAction;
      },
      destroy() {
        node.removeEventListener("pointerdown", stop);
        node.removeEventListener("mousedown", stop);
        node.removeEventListener("mouseup", run);
      },
    };
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=arrow_left_alt,arrow_right_alt,delete&display=block"
  />
</svelte:head>

<div class="components-demo">
  <header class="demo-header">
    <div>
      <h1>SnapSort Components</h1>
      <p>{itemCount} array-backed cards</p>
    </div>
    <div class="toolbar">
      <button onclick={addItem}>Add Item</button>
      <button onclick={resetItems}>Reset</button>
    </div>
  </header>

  <div class="engine-area">
    <Engine id="snapsort-components-demo-canvas">
      <div class="board-frame">
        <Container
          className="board"
          config={{
            direction: "row",
            name: "component-kanban-root",
            noDrop: true,
          }}
          locked={true}
          metadata={{ boardId: "component-kanban" }}
        >
          {#each columns as column (column.id)}
            <Container
              className={column.id === "backlog" ? "list-panel array-list" : "list-panel"}
              bind:container={column.container}
              config={{
                direction: "column",
                name: `component-${column.id}`,
                animation: {
                  reorder: snapSortCubicAnimation,
                  drop: snapSortCubicAnimation,
                  clickMove: snapSortCubicAnimation,
                },
                callbacks: {
                  onDomInsert: handleSnapSortDomInsert,
                  onDomRemove: handleSnapSortDomRemove,
                  afterDomMutation: tick,
                },
              }}
              locked={true}
              metadata={{ columnId: column.id }}
            >
            <div class="list-header">
              <h2>{column.title}</h2>
              <span>{column.items.length}</span>
            </div>

              {#each column.items as item (item.id)}
                <Item className="task-card" metadata={{ itemId: item.id }}>
                  <div class="task-content">
                    <div class="task-main">
                      <strong>{item.label}</strong>
                      <span>{item.detail}</span>
                    </div>
                    <div class="card-actions">
                      <button
                        class="icon-button"
                        aria-label={`Delete ${item.label}`}
                        use:controlButton={() => deleteItem(item.id)}
                      ><span class="material-symbols-outlined" aria-hidden="true">delete</span></button>
                      <button
                        class="icon-button"
                        aria-label={`Move ${item.label} left`}
                        disabled={columns.findIndex((candidate) => candidate.id === column.id) === 0}
                        use:controlButton={() => moveItemAcrossColumns(item.id, -1)}
                      ><span class="material-symbols-outlined" aria-hidden="true">arrow_left_alt</span></button>
                      <button
                        class="icon-button"
                        aria-label={`Move ${item.label} right`}
                        disabled={columns.findIndex((candidate) => candidate.id === column.id) === columns.length - 1}
                        use:controlButton={() => moveItemAcrossColumns(item.id, 1)}
                      ><span class="material-symbols-outlined" aria-hidden="true">arrow_right_alt</span></button>
                    </div>
                  </div>
                </Item>
              {/each}
            </Container>
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

  .icon-button {
    width: 24px !important;
    min-width: 24px;
    height: 24px !important;
    border: 0 !important;
    background: transparent !important;
    color: #000;
    padding: 0 !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    box-shadow: none !important;
    position: static;
  }

  :global(.dev-style) .icon-button {
    width: 24px !important;
    min-width: 24px;
    height: 24px !important;
    border: 0 !important;
    background: transparent !important;
    padding: 0 !important;
    box-shadow: none !important;
  }

  .icon-button:hover:not(:disabled) {
    background: transparent !important;
    color: #666;
  }

  .material-symbols-outlined {
    font-family: "Material Symbols Outlined" !important;
    width: 24px !important;
    min-width: 24px;
    inline-size: 24px !important;
    height: 24px !important;
    overflow: hidden;
    pointer-events: none;
    font-size: 24px;
    line-height: 1;
    font-weight: normal;
    font-style: normal;
    letter-spacing: 0;
    text-transform: none;
    display: inline-block;
    white-space: nowrap;
    word-wrap: normal;
    direction: ltr;
    flex: 0 0 24px;
    text-align: center;
    font-feature-settings: "liga";
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-variation-settings:
      "FILL" 0,
      "wght" 400,
      "GRAD" 0,
      "opsz" 24;
  }

  .engine-area {
    flex: 1;
    min-height: 420px;
  }

  :global(.list-panel) {
    min-width: 260px;
    flex: 1 1 0;
    border: 2px solid #000;
    padding: var(--size-12);
    background: #fff;
    box-sizing: border-box;
    pointer-events: auto;
    align-items: stretch;
    gap: var(--size-8);
  }

  .board-frame {
    display: flex;
    width: min(1080px, 100%);
    min-height: 420px;
    pointer-events: auto;
  }

  :global(.board) {
    width: 100%;
    gap: var(--size-12);
    flex-wrap: nowrap;
    align-items: stretch;
    box-sizing: border-box;
    pointer-events: auto;
  }

  .list-header {
    width: 100%;
    border-bottom: 2px solid #000;
    padding-bottom: var(--size-12);
    margin-bottom: var(--size-12);
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-8);
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
    align-items: flex-start;
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

  .card-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: var(--size-4);
    margin-left: auto;
    flex: 0 0 auto;
  }

  .card-actions button:disabled {
    cursor: default;
    opacity: 0.45;
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

    :global(.board) {
      flex-direction: column;
    }
  }
</style>
