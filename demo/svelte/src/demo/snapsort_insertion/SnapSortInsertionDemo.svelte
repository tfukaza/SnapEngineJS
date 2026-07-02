<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import {
    ContainerInsertion,
    ItemInsertion,
  } from "@snap-engine/snapsort-svelte";
  import type {
    ContainerBase as SortContainer,
    ItemInsertEvent,
    ItemRemoveEvent,
  } from "@snap-engine/snapsort";
  import { tick } from "svelte";

  type DemoItem = {
    id: string;
    kind: "file" | "folder";
    title: string;
    detail: string;
  };

  type DemoColumn = {
    id: string;
    title: string;
    items: DemoItem[];
    container?: SortContainer;
  };

  const initialColumns: DemoColumn[] = [
    {
      id: "today",
      title: "Project",
      items: [
        { id: "task-1", kind: "folder", title: "src", detail: "Folder" },
        { id: "task-2", kind: "folder", title: "assets", detail: "Folder" },
        { id: "task-3", kind: "file", title: "package.json", detail: "3 KB" },
        { id: "task-4", kind: "file", title: "README.md", detail: "8 KB" },
      ],
    },
    {
      id: "next",
      title: "Source",
      items: [
        { id: "task-5", kind: "file", title: "Container.svelte", detail: "6 KB" },
        { id: "task-6", kind: "file", title: "Item.svelte", detail: "4 KB" },
        { id: "task-7", kind: "file", title: "Handle.svelte", detail: "1 KB" },
      ],
    },
    {
      id: "empty",
      title: "Archive",
      items: [],
    },
  ];

  let nextId = $state(8);
  let columns = $state<DemoColumn[]>(structuredClone(initialColumns));
  let pendingRemovedItem: DemoItem | null = null;
  const itemCount = $derived(
    columns.reduce((total, column) => total + column.items.length, 0),
  );

  function reset() {
    nextId = 8;
    pendingRemovedItem = null;
    columns = structuredClone(initialColumns);
  }

  function addItem() {
    const id = `task-${nextId++}`;
    columns = columns.map((column, index) =>
      index === 0
        ? {
            ...column,
            items: [
              ...column.items,
              {
                id,
                kind: "file",
                title: `new-file-${id.replace("task-", "")}.md`,
                detail: "1 KB",
              },
            ],
          }
        : column,
    );
  }

  function removeItemById(itemId: string): DemoItem | null {
    let removedItem: DemoItem | null = null;
    columns = columns.map((column) => {
      const itemIndex = column.items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) return column;

      const nextItems = column.items.slice();
      const [item] = nextItems.splice(itemIndex, 1);
      removedItem = item;
      return { ...column, items: nextItems };
    });
    return removedItem;
  }

  function handleInsert(event: ItemInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    const targetColumnId = event.containerMetadata.columnId;
    if (typeof itemId !== "string" || typeof targetColumnId !== "string") {
      return;
    }

    const movedItem = pendingRemovedItem ?? removeItemById(itemId);
    pendingRemovedItem = null;
    if (!movedItem) return;

    columns = columns.map((column) => {
      if (column.id !== targetColumnId) return column;

      const nextItems = column.items.slice();
      nextItems.splice(Math.max(0, Math.min(event.index, nextItems.length)), 0, movedItem);
      return { ...column, items: nextItems };
    });
  }

  function handleRemove(event: ItemRemoveEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;
    pendingRemovedItem = removeItemById(itemId);
  }
</script>

<svelte:head>
  <link
    rel="stylesheet"
    href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined&icon_names=add,description,folder,restart_alt&display=block"
  />
</svelte:head>

<div class="insertion-demo">
  <header class="demo-header">
    <div>
      <h1>SnapSort Insertion</h1>
      <p>{itemCount} files and folders · original row stays still until drop</p>
    </div>
    <div class="toolbar">
      <button onclick={addItem}>
        <span class="material-symbols-outlined" aria-hidden="true">add</span>
        Add
      </button>
      <button onclick={reset}>
        <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
        Reset
      </button>
    </div>
  </header>

  <Engine id="snapsort-insertion-demo-canvas">
    <ContainerInsertion
      className="insertion-board"
      config={{
        direction: "row",
        name: "insertion-board-root",
        noDrop: true,
      }}
      locked={true}
      metadata={{ boardId: "insertion-demo" }}
    >
      {#each columns as column (column.id)}
        <ContainerInsertion
          className="insertion-list"
          bind:container={column.container}
          config={{
            direction: "column",
            groupID: "insertion-demo",
            name: `insertion-${column.id}`,
            callbacks: {
              onItemInsert: handleInsert,
              onItemRemove: handleRemove,
              awaitMutation: tick,
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
            <ItemInsertion className="insertion-card" metadata={{ itemId: item.id }}>
              <span
                class="material-symbols-outlined file-icon"
                class:folder-icon={item.kind === "folder"}
                aria-hidden="true"
              >{item.kind === "folder" ? "folder" : "description"}</span>
              <div class="card-copy">
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
            </ItemInsertion>
          {/each}
        </ContainerInsertion>
      {/each}
    </ContainerInsertion>
  </Engine>
</div>

<style>
  .insertion-demo {
    width: 100%;
    min-height: 100%;
    box-sizing: border-box;
    padding: 0 24px 32px;
    color: #172033;
  }

  .demo-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 12px;
  }

  .demo-header h1 {
    margin: 0;
    font-size: 22px;
    line-height: 1.15;
  }

  .demo-header p {
    margin: 4px 0 0;
    color: #657084;
    font-size: 13px;
  }

  .toolbar {
    display: flex;
    gap: 6px;
  }

  .toolbar button {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid #cfd6e3;
    background: #ffffff;
    color: #172033;
    border-radius: 6px;
    padding: 6px 10px;
    font: inherit;
    cursor: pointer;
  }

  .toolbar button:hover {
    background: #f5f7fb;
  }

  :global(.insertion-board) {
    align-items: stretch;
    gap: 12px;
    width: 100%;
  }

  :global(.insertion-list) {
    width: min(360px, calc((100vw - 96px) / 3));
    min-width: 250px;
    min-height: 300px;
    align-items: stretch;
    gap: 2px;
    padding: 8px;
    border: 1px solid #d7dde8;
    border-radius: 8px;
    background: #ffffff;
    box-sizing: border-box;
  }

  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    padding: 0 6px;
    margin-bottom: 4px;
    border-bottom: 1px solid #edf0f5;
  }

  .list-header h2 {
    margin: 0;
    font-size: 13px;
    line-height: 1.2;
  }

  .list-header span {
    min-width: 22px;
    height: 20px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    background: #eef2f7;
    color: #536072;
    font-size: 12px;
  }

  :global(.insertion-card) {
    width: 100%;
    min-height: 34px;
    display: grid;
    grid-template-columns: 24px minmax(0, 1fr);
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: #ffffff;
    box-shadow: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
  }

  :global(.insertion-card:hover) {
    border-color: #dbe2ee;
    background: #f7f9fc;
  }

  :global(.insertion-card[data-snapsort-dragging="true"]) {
    opacity: 0.62;
    outline: 1px solid #93c5fd;
    outline-offset: -1px;
    background: #eff6ff;
    cursor: grabbing;
  }

  .card-copy {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 12px;
  }

  .card-copy strong,
  .card-copy span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-copy strong {
    font-size: 13px;
    font-weight: 500;
  }

  .card-copy span {
    color: #6b7280;
    font-size: 12px;
  }

  .file-icon {
    color: #64748b;
    font-size: 20px;
  }

  .folder-icon {
    color: #d89b22;
  }

  :global([data-snapsort-ghost="insertion"]) {
    color: #2563eb;
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.16);
  }

  @media (max-width: 860px) {
    .insertion-demo {
      padding: 0 16px 32px;
    }

    .demo-header {
      align-items: flex-start;
      flex-direction: column;
    }

    :global(.insertion-board) {
      flex-direction: column !important;
    }

    :global(.insertion-list) {
      width: 100%;
    }
  }
</style>
