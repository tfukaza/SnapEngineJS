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
          >
            {#each sortableItems as item (item)}
              <Item>
                <div class="basic-row card-content">
                  <span>{item}</span>
                </div>
              </Item>
            {/each}
          </Container>
        </div>
      </article>

      <article class="core-demo-card sideways-demo-card">
        <h3>Sideways list</h3>
        <div class="core-demo-surface sideways-demo-surface card">
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
          >
            {#each nestedItems as item (item)}
              <Item>
                <div class="basic-row handle-row">
                  <Handle className="demo-row-handle">
                    <span class="demo-grip" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                    </span>
                  </Handle>
                  <span>{item}</span>
                </div>
              </Item>
            {/each}
            <Container
              className="nested-list bounded-demo-list card shallow"
              config={{ direction: "column", groupID: "core-nested" }}
              locked={false}
            >
              <Handle className="demo-container-handle">
                <span class="demo-grip" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                </span>
              </Handle>
              {#each nestedChildren as item (item)}
                <Item>
                  <div class="basic-row nested-row handle-row">
                    <Handle className="demo-row-handle">
                      <span class="demo-grip" aria-hidden="true">
                        <i></i><i></i><i></i><i></i>
                      </span>
                    </Handle>
                    <span>{item}</span>
                  </div>
                </Item>
              {/each}
            </Container>
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Insert mode</h3>
        <div class="core-demo-surface card">
          <Container
            className="basic-list insertion-list bounded-demo-list"
            config={{ direction: "column", groupID: "core-insert", mode: "insertion" }}
          >
            <Item>
              <div class="basic-row handle-row">
                <Handle className="demo-row-handle">
                  <span class="demo-grip" aria-hidden="true">
                    <i></i><i></i><i></i><i></i>
                  </span>
                </Handle>
                <span>{insertItems[0]}</span>
              </div>
            </Item>
            <Container
              className="nested-list nested-insertion-list insertion-list bounded-demo-list card shallow"
              config={{ direction: "column", groupID: "core-insert", mode: "insertion" }}
              locked={false}
            >
              <Handle className="demo-container-handle">
                <span class="demo-grip" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                </span>
              </Handle>
              {#each insertNestedItems as item (item)}
                <Item>
                  <div class="basic-row nested-row handle-row">
                    <Handle className="demo-row-handle">
                      <span class="demo-grip" aria-hidden="true">
                        <i></i><i></i><i></i><i></i>
                      </span>
                    </Handle>
                    <span>{item}</span>
                  </div>
                </Item>
              {/each}
            </Container>
            {#each insertItems.slice(1) as item (item)}
              <Item>
                <div class="basic-row handle-row">
                  <Handle className="demo-row-handle">
                    <span class="demo-grip" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                    </span>
                  </Handle>
                  <span>{item}</span>
                </div>
              </Item>
            {/each}
          </Container>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Multiple rows</h3>
        <div class="core-demo-surface card">
          <Container
            className="multi-row-list"
            config={{ direction: "row", groupID: "core-multi-row", mode: "progressive" }}
          >
            {#each multiRowItems as item (item.id)}
              <Item>
                <div class="basic-token">
                  <span>{item.label}</span>
                </div>
              </Item>
            {/each}
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
          >
            {#each multiContainers as column (column.id)}
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
              >
                <h4>{column.title}</h4>
                {#each column.items as item (item.id)}
                  <Item metadata={{ itemId: item.id }}>
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
                  </Item>
                {/each}
              </Container>
            {/each}
          </Container>
        </div>
      </article>

      <CustomizableShowcase />

    </div>
  </Engine>
</section>
