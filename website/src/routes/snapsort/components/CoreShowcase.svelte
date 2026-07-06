<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import type { Engine as SnapEngine } from "@snap-engine/core";
  import { Container, Handle, Item } from "@snap-engine/snapsort-svelte";
  import type {
    Container as ContainerType,
    ItemMoveEvent,
  } from "@snap-engine/snapsort";
  import CustomizableShowcase from "./CustomizableShowcase.svelte";

  type MultiContainerItem = {
    id: string;
    label: string;
  };

  type MultiContainerColumn = {
    id: string;
    title: string;
    direction: "left" | "right";
    items: MultiContainerItem[];
    container?: ContainerType;
  };


  let {
    debugLayout,
    engine = $bindable<SnapEngine | null>(null),
  }: {
    debugLayout: boolean;
    engine?: SnapEngine | null;
  } = $props();

  let sidewaysSolved = $state(false);

  const sortableItems = [
    "Drag any",
    "item up",
    "or down",
    "and drop",
    "them in",
    "place",
  ];
  const logoSliceCount = 6;
  const logoSliceWidth = 30;
  const sidewaysItems = [3, 0, 5, 1, 4, 2].map((slice) => ({
    id: `typescript-slice-${slice}`,
    slice,
    x: `${slice * -logoSliceWidth}px`,
  }));

  function updateSidewaysSolved(containerElement: HTMLElement | null | undefined) {
    if (!containerElement) return;

    const order = Array.from(containerElement.querySelectorAll<HTMLElement>(".logo-slice"))
      .map((slice) => Number(slice.dataset.slice));

    sidewaysSolved =
      order.length === logoSliceCount &&
      order.every((slice, index) => slice === index);
  }

  function handleSidewaysMove(event: ItemMoveEvent) {
    event.to.container.element?.insertBefore(event.item.element!, event.beforeElement);
    requestAnimationFrame(() => updateSidewaysSolved(event.to.container.element));
  }
  const nestedItems = ["Item 1", "Item 2", "Item 3"];
  const nestedChildren = ["Item 4", "Item 5", "Item 6"];
  const insertItems = ["Item 1", "Item 4", "Item 5"];
  const insertNestedItems = ["Item 2", "Item 3"];

  // Heterogeneous: a nested Container sits as a sibling among plain Items,
  // which `item` (content-only, wrapped in an adapter Item) can't express --
  // `entry` renders the Item/Container itself per position.
  type NestedEntry = { kind: "item"; id: string; label: string } | { kind: "group" };
  const nestedEntries: NestedEntry[] = [
    ...nestedItems.map((label): NestedEntry => ({ kind: "item", id: label, label })),
    { kind: "group" },
  ];

  type InsertEntry = { kind: "item"; id: string; label: string } | { kind: "group" };
  const insertEntries: InsertEntry[] = [
    { kind: "item", id: insertItems[0], label: insertItems[0] },
    { kind: "group" },
    ...insertItems.slice(1).map((label): InsertEntry => ({ kind: "item", id: label, label })),
  ];
  const multiRowItems = [
    "This",
    "demo",
    "has",
    "a",
    "slightly",
    "different",
    "algorithm",
    "optimized",
    "for",
    "reordering",
    "words",
    "in",
    "a",
    "sentence",
  ].map((label, index) => ({
    id: `multi-row-${index}`,
    label,
  }));
  let multiContainers: MultiContainerColumn[] = $state([
    {
      id: "left",
      title: "Left",
      direction: "right",
      items: [
        { id: "mc-spec", label: "Spec" },
        { id: "mc-mockup", label: "Mockup" },
        { id: "mc-build", label: "Build" },
      ],
    },
    {
      id: "right",
      title: "Right",
      direction: "left",
      items: [
        { id: "mc-review", label: "Review" },
        { id: "mc-ship", label: "Ship" },
      ],
    },
  ]);

  function moveMultiContainerState(itemId: string, targetColumnId: string, targetIndex: number) {
    let movedItem: MultiContainerItem | null = null;
    const withoutMovedItem = multiContainers.map((column) => {
      const sourceIndex = column.items.findIndex((item) => item.id === itemId);
      if (sourceIndex === -1) return column;

      const nextItems = column.items.slice();
      const [item] = nextItems.splice(sourceIndex, 1);
      movedItem = item;
      return { ...column, items: nextItems };
    });

    if (!movedItem) return;
    const itemToMove = movedItem;

    multiContainers = withoutMovedItem.map((column) => {
      if (column.id !== targetColumnId) return column;

      const nextItems = column.items.slice();
      const destinationIndex = Math.max(0, Math.min(targetIndex, nextItems.length));
      nextItems.splice(destinationIndex, 0, itemToMove);
      return { ...column, items: nextItems };
    });
  }

  function handleMultiContainerMove(event: ItemMoveEvent) {
    const itemId = event.itemMetadata.itemId;
    const targetColumnId = event.to.containerMetadata.columnId;
    if (typeof itemId !== "string" || typeof targetColumnId !== "string") return;

    moveMultiContainerState(itemId, targetColumnId, event.to.index);
  }

  function moveItemToOppositeColumn(itemId: string) {
    const sourceColumnIndex = multiContainers.findIndex((column) =>
      column.items.some((item) => item.id === itemId),
    );
    if (sourceColumnIndex === -1) return;

    const targetColumnIndex = sourceColumnIndex === 0 ? 1 : 0;
    const sourceColumn = multiContainers[sourceColumnIndex];
    const targetColumn = multiContainers[targetColumnIndex];
    const sourceItemIndex = sourceColumn.items.findIndex((item) => item.id === itemId);
    const destinationIndex = Math.min(sourceItemIndex, targetColumn.items.length);

    if (sourceColumn.container && targetColumn.container) {
      const movedBySnapSort = sourceColumn.container.moveItem(
        itemId,
        targetColumn.container,
        destinationIndex,
      );
      if (movedBySnapSort) return;
    }

    moveMultiContainerState(itemId, targetColumn.id, destinationIndex);
  }

</script>

<section class="core-showcase col-12">
  <div class="core-showcase-header">
    <h2>Versatile and Extensible</h2>
    <p class="large">
      A wide variety of core components are available out of the box to provide
      building blocks for any type of drag and drop UI.
    </p>
  </div>

  <Engine id="snapsort-core-demos" bind:engine debug={debugLayout}>
    <div class="core-demo-grid">
      <article class="core-demo-card">
        <h3>Sortable list</h3>
        <div class="core-demo-surface card">
          <Container
            className="basic-list sortable-list"
            config={{ direction: "column", groupID: "core-sortable" }}
            items={sortableItems}
            getId={(label) => label}
          >
            {#snippet item(label)}
              <div class="basic-row card-content">
                <span>{label}</span>
              </div>
            {/snippet}
          </Container>
        </div>
      </article>

      <article class="core-demo-card sideways-demo-card">
        <h3>Sideways list</h3>
        <div class="core-demo-surface sideways-demo-surface card">
          <!--
            Deliberately kept on the legacy children API: handleSidewaysMove
            mutates the DOM directly (raw insertBefore) instead of updating
            reactive state, showcasing the core's vanilla DOM-splice
            behavior. Items mode assumes Svelte owns the rendered order via
            reactive `items` -- migrating this would let ghost-driven
            reconciliation (which DOES react to state) snap the manually
            reordered node back to its stale array position. This is also
            this arc's one deliberate vanilla-path e2e surface (see
            snapsort-drag-snapshot.spec.ts's core-showcase coverage).
          -->
          <Container
            className={`sideways-list ${sidewaysSolved ? "solved" : ""}`}
            config={{
              direction: "row",
              groupID: "core-sideways",
              mainAxisAlign: "center",
              callbacks: { onItemMove: handleSidewaysMove },
            }}
          >
            {#each sidewaysItems as item (item.id)}
              <Item>
                <div
                  class="logo-slice"
                  data-slice={item.slice}
                  aria-label="TypeScript logo slice {item.slice + 1} of {logoSliceCount}"
                  style={`--slice-x: ${item.x};`}
                ></div>
              </Item>
            {/each}
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Nested list</h3>
        <div class="core-demo-surface card">
          <Container
            className="basic-list bounded-demo-list"
            config={{ direction: "column", groupID: "core-nested" }}
            items={nestedEntries}
            getId={(e) => (e.kind === "item" ? e.id : "nested-group")}
          >
            {#snippet entry(e)}
              {#if e.kind === "item"}
                <Item>
                  <div class="basic-row handle-row">
                    <Handle className="demo-row-handle">
                      <span class="demo-grip" aria-hidden="true">
                        <i></i><i></i><i></i><i></i>
                      </span>
                    </Handle>
                    <span>{e.label}</span>
                  </div>
                </Item>
              {:else}
                <Container
                  className="nested-list bounded-demo-list card shallow"
                  config={{ direction: "column", groupID: "core-nested" }}
                  locked={false}
                  items={nestedChildren}
                  getId={(label) => label}
                >
                  <Handle className="demo-container-handle">
                    <span class="demo-grip" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                    </span>
                  </Handle>
                  {#snippet item(label)}
                    <div class="basic-row nested-row handle-row">
                      <Handle className="demo-row-handle">
                        <span class="demo-grip" aria-hidden="true">
                          <i></i><i></i><i></i><i></i>
                        </span>
                      </Handle>
                      <span>{label}</span>
                    </div>
                  {/snippet}
                </Container>
              {/if}
            {/snippet}
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Insert mode</h3>
        <div class="core-demo-surface card">
          <Container
            className="basic-list insertion-list bounded-demo-list"
            config={{ direction: "column", groupID: "core-insert", mode: "insertion" }}
            items={insertEntries}
            getId={(e) => (e.kind === "item" ? e.id : "insert-group")}
          >
            {#snippet entry(e)}
              {#if e.kind === "item"}
                <Item>
                  <div class="basic-row handle-row">
                    <Handle className="demo-row-handle">
                      <span class="demo-grip" aria-hidden="true">
                        <i></i><i></i><i></i><i></i>
                      </span>
                    </Handle>
                    <span>{e.label}</span>
                  </div>
                </Item>
              {:else}
                <Container
                  className="nested-list nested-insertion-list insertion-list bounded-demo-list card shallow"
                  config={{ direction: "column", groupID: "core-insert", mode: "insertion" }}
                  locked={false}
                  items={insertNestedItems}
                  getId={(label) => label}
                >
                  <Handle className="demo-container-handle">
                    <span class="demo-grip" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                    </span>
                  </Handle>
                  {#snippet item(label)}
                    <div class="basic-row nested-row handle-row">
                      <Handle className="demo-row-handle">
                        <span class="demo-grip" aria-hidden="true">
                          <i></i><i></i><i></i><i></i>
                        </span>
                      </Handle>
                      <span>{label}</span>
                    </div>
                  {/snippet}
                </Container>
              {/if}
            {/snippet}
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Multiple rows</h3>
        <div class="core-demo-surface card">
          <Container
            className="multi-row-list"
            config={{ direction: "row", groupID: "core-multi-row", mode: "progressive" }}
            items={multiRowItems}
            getId={(item) => item.id}
          >
            {#snippet item(item)}
              <div class="basic-token">
                <span>{item.label}</span>
              </div>
            {/snippet}
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Multiple containers</h3>
        <div class="core-demo-surface multi-container-surface">
          <Container
            className="multi-container-board"
            config={{ direction: "row", name: "core-multi-root", noDrop: true }}
            locked={true}
            items={multiContainers}
            getId={(column) => column.id}
          >
            {#snippet entry(column)}
              <Container
                className="basic-column card"
                bind:container={column.container}
                metadata={{ columnId: column.id }}
                config={{
                  direction: "column",
                  groupID: "core-multi-container",
                  name: column.id,
                  callbacks: { onItemMove: handleMultiContainerMove },
                }}
                locked={true}
                items={column.items}
                getId={(item) => item.id}
              >
                <h4>{column.title}</h4>
                {#snippet item(item)}
                  <div class="basic-row compact-row multi-container-row">
                    <span>{item.label}</span>
                    <button
                      class="column-move-button"
                      type="button"
                      aria-label="Move {item.label} to the other column"
                      onpointerdown={(event) => event.stopPropagation()}
                      onclick={(event) => {
                        event.stopPropagation();
                        moveItemToOppositeColumn(item.id);
                      }}
                    >
                      {#if column.direction === "right"}
                        &rarr;
                      {:else}
                        &larr;
                      {/if}
                    </button>
                  </div>
                {/snippet}
              </Container>
            {/snippet}
          </Container>
        </div>
      </article>

      <CustomizableShowcase />

    </div>
  </Engine>
</section>
