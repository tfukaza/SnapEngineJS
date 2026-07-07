import {
  Container,
  Engine,
  Handle,
  Item,
  useSnapSortAwaitMutation,
} from "@snap-engine/snapsort-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const snapSortCubicAnimation = {
  duration: 180,
  timing_function: "cubic-bezier(0.2, 0, 0, 1)",
};

function queryFlag(name) {
  return new URLSearchParams(window.location.search).get(name) === "1";
}

function controlButtonProps(action) {
  return {
    onPointerDown: (event) => event.stopPropagation(),
    onMouseDown: (event) => event.stopPropagation(),
    onMouseUp: (event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    },
  };
}

function DemoItem({ children, className = "demo-item", metadata }) {
  return (
    <Item className={className} metadata={metadata}>
      {children}
      <span aria-hidden="true" className="snapsort-text-separator"> </span>
    </Item>
  );
}

function NumberedItems({ count, className = "demo-item row-item" }) {
  return Array.from({ length: count }, (_, index) => index + 1).map((n) => (
    <DemoItem className={className} key={n}>
      <p>Item {n}</p>
    </DemoItem>
  ));
}

const websiteLogoSliceCount = 6;
const websiteLogoSliceWidth = 30;
const websiteSidewaysItems = [3, 0, 5, 1, 4, 2].map((slice) => ({
  id: `typescript-slice-${slice}`,
  slice,
  x: `${slice * -websiteLogoSliceWidth}px`,
}));
const websiteParentItems = ["Item 1", "Item 2", "Item 3"];
const websiteNestedItems = ["Item 4", "Item 5", "Item 6"];
const websiteGripDots = Array.from({ length: 6 }, (_, index) => index);
const initialWebsiteMultiContainers = [
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
];

function cloneWebsiteMultiContainers() {
  return initialWebsiteMultiContainers.map((column) => ({
    ...column,
    items: column.items.map((item) => ({ ...item })),
  }));
}

function WebsiteGrip() {
  return (
    <span className="demo-grip" aria-hidden="true">
      {websiteGripDots.map((dot) => (
        <span data-dot={dot} key={dot} />
      ))}
    </span>
  );
}

function WebsiteRowHandle() {
  return (
    <Handle className="demo-row-handle">
      <WebsiteGrip />
    </Handle>
  );
}

function updateWebsiteSidewaysSolved(containerElement) {
  if (!containerElement) return;

  const order = [...containerElement.querySelectorAll(".logo-slice")].map(
    (slice) => Number(slice.dataset.slice),
  );
  const solved =
    order.length === websiteLogoSliceCount &&
    order.every((slice, index) => slice === index);
  containerElement.classList.toggle("solved", solved);
}

export function SnapSortWebsiteCoreDemo() {
  const columnRefs = useRef(new Map());
  const [multiContainers, setMultiContainers] = useState(
    cloneWebsiteMultiContainers,
  );

  const handleSidewaysInsert = useCallback((event) => {
    const containerElement = event.container.element;
    const itemElement = event.item.element;
    if (!containerElement || !itemElement) return;

    containerElement.insertBefore(itemElement, event.beforeElement);
    requestAnimationFrame(() => updateWebsiteSidewaysSolved(containerElement));
  }, []);

  const moveMultiContainerState = useCallback(
    (itemId, targetColumnId, targetIndex) => {
      setMultiContainers((current) => {
        let movedItem = null;
        const withoutMovedItem = current.map((column) => {
          const sourceIndex = column.items.findIndex(
            (item) => item.id === itemId,
          );
          if (sourceIndex === -1) return column;

          const nextItems = column.items.slice();
          const [item] = nextItems.splice(sourceIndex, 1);
          movedItem = item;
          return { ...column, items: nextItems };
        });

        if (!movedItem) return current;

        return withoutMovedItem.map((column) => {
          if (column.id !== targetColumnId) return column;

          const nextItems = column.items.slice();
          nextItems.splice(
            Math.max(0, Math.min(targetIndex, nextItems.length)),
            0,
            movedItem,
          );
          return { ...column, items: nextItems };
        });
      });
    },
    [],
  );

  const handleMultiContainerMove = useCallback(
    (event) => {
      const itemId = event.itemMetadata.itemId;
      const targetColumnId = event.to.containerMetadata.columnId;
      if (typeof itemId !== "string" || typeof targetColumnId !== "string") {
        return;
      }

      moveMultiContainerState(itemId, targetColumnId, event.to.index);
    },
    [moveMultiContainerState],
  );

  const moveItemToOppositeColumn = useCallback(
    (itemId) => {
      const sourceColumnIndex = multiContainers.findIndex((column) =>
        column.items.some((item) => item.id === itemId),
      );
      if (sourceColumnIndex === -1) return;

      const targetColumnIndex = sourceColumnIndex === 0 ? 1 : 0;
      const sourceColumn = multiContainers[sourceColumnIndex];
      const targetColumn = multiContainers[targetColumnIndex];
      const sourceItemIndex = sourceColumn.items.findIndex(
        (item) => item.id === itemId,
      );
      const destinationIndex = Math.min(
        sourceItemIndex,
        targetColumn.items.length,
      );
      const sourceContainer = columnRefs.current.get(sourceColumn.id);
      const targetContainer = columnRefs.current.get(targetColumn.id);
      if (
        sourceContainer &&
        targetContainer &&
        sourceContainer.moveItem(itemId, targetContainer, destinationIndex)
      ) {
        return;
      }

      moveMultiContainerState(itemId, targetColumn.id, destinationIndex);
    },
    [moveMultiContainerState, multiContainers],
  );

  return (
    <div className="snapsort-fixture website-core-demo dev-style">
      <div className="website-core-shell">
        <header className="website-core-intro">
          <h1>Versatile and Extensible</h1>
          <p>
            A wide variety of core components are available out of the box to
            provide building blocks for any type of drag and drop UI.
          </p>
        </header>

        <Engine id="snapsort-website-core-demo-canvas">
          <section
            className="core-demo-grid"
            aria-label="SnapSort website core demos"
          >
            <article className="core-demo-card" data-demo="sideways-list">
              <h2>Sideways list</h2>
              <div className="core-demo-surface sideways-demo-surface card">
                <Container
                  className="sideways-list"
                  config={{
                    direction: "row",
                    groupID: "core-sideways",
                    mainAxisAlign: "center",
                    callbacks: {
                      onItemInsert: handleSidewaysInsert,
                    },
                  }}
                >
                  {websiteSidewaysItems.map((item) => (
                    <Item key={item.id}>
                      <div
                        className="logo-slice"
                        data-slice={item.slice}
                        aria-label={`TypeScript logo slice ${item.slice + 1} of ${websiteLogoSliceCount}`}
                        style={{ "--slice-x": item.x }}
                      />
                    </Item>
                  ))}
                </Container>
              </div>
            </article>

            <article className="core-demo-card" data-demo="nested-list">
              <h2>Nested list</h2>
              <div className="core-demo-surface card">
                <Container
                  className="basic-list bounded-demo-list"
                  config={{ direction: "column", groupID: "core-nested" }}
                >
                  {websiteParentItems.map((item) => (
                    <Item key={item}>
                      <div className="basic-row handle-row">
                        <WebsiteRowHandle />
                        <span>{item}</span>
                      </div>
                    </Item>
                  ))}
                  <Container
                    className="nested-list bounded-demo-list card shallow"
                    config={{ direction: "column", groupID: "core-nested" }}
                    locked={false}
                  >
                    <Handle className="demo-container-handle">
                      <WebsiteGrip />
                    </Handle>
                    {websiteNestedItems.map((item) => (
                      <Item key={item}>
                        <div className="basic-row nested-row handle-row">
                          <WebsiteRowHandle />
                          <span>{item}</span>
                        </div>
                      </Item>
                    ))}
                  </Container>
                </Container>
              </div>
            </article>

            <article
              className="core-demo-card"
              data-demo="multiple-containers"
            >
              <h2>Multiple containers</h2>
              <div className="core-demo-surface multi-container-surface">
                <Container
                  className="multi-container-board"
                  config={{
                    direction: "row",
                    name: "core-multi-root",
                    noDrop: true,
                  }}
                  locked
                >
                  {multiContainers.map((column) => (
                    <Container
                      className="basic-column card"
                      config={{
                        direction: "column",
                        groupID: "core-multi-container",
                        name: column.id,
                        callbacks: {
                          onItemMove: handleMultiContainerMove,
                        },
                      }}
                      key={column.id}
                      locked
                      metadata={{ columnId: column.id }}
                      ref={(container) => {
                        if (container) columnRefs.current.set(column.id, container);
                      }}
                    >
                      <h3>{column.title}</h3>
                      {column.items.map((item) => (
                        <Item key={item.id} metadata={{ itemId: item.id }}>
                          <div className="basic-row compact-row multi-container-row">
                            <span>{item.label}</span>
                            <button
                              aria-label={`Move ${item.label} to the other column`}
                              className="column-move-button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveItemToOppositeColumn(item.id);
                              }}
                              onPointerDown={(event) => event.stopPropagation()}
                              type="button"
                            >
                              {column.direction === "right" ? ">" : "<"}
                            </button>
                          </div>
                        </Item>
                      ))}
                    </Container>
                  ))}
                </Container>
              </div>
            </article>
          </section>
        </Engine>
      </div>
    </div>
  );
}

export function DropSnapNestedDemo() {
  const disableNestedFlip = queryFlag("disableNestedFlip");
  const slowNestedFlip = queryFlag("slowNestedFlip");
  const lockNestedChild = queryFlag("lockNestedChild");
  const showCompactNested = queryFlag("compactNested");
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

  return (
    <div className="snapsort-fixture snapsort-demo dev-style">
      <h1>SnapSort</h1>
      <div className="snapsort-shell">
        <div className="engine-area">
          <Engine id="snapsort-combined-demo-canvas">
            <div className="demo-grid">
              <article className="demo-cell wide horizontal-row-demo">
                <h2>Vertical Column</h2>
                <Container config={{ direction: "column", groupID: "vertical-group" }}>
                  <DemoItem><p>Item 1</p></DemoItem>
                  <DemoItem><p>Item 2</p></DemoItem>
                  <DemoItem><p>Item 3</p></DemoItem>
                  <DemoItem><p>Item 4</p></DemoItem>
                </Container>
              </article>

              <article className="demo-cell">
                <h2>Horizontal Row</h2>
                <Container config={{ direction: "row", groupID: "wrap-row" }} locked>
                  <NumberedItems count={12} />
                </Container>
              </article>

              <article className="demo-cell wide">
                <h2>Horizontal Double Row</h2>
                <Container config={{ direction: "row", groupID: "double-row-group" }}>
                  <NumberedItems count={28} />
                </Container>
              </article>

              <article className="demo-cell wide size-demo">
                <h2>Different Sizes</h2>
                <Container config={{ direction: "row", groupID: "sizes-group" }}>
                  <DemoItem className="demo-item size-item"><p style={{ width: 72, minHeight: 48 }}>Small</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 128, minHeight: 72 }}>Medium</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 220, minHeight: 96 }}>Wide</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 92, minHeight: 156 }}>Tall</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 168, minHeight: 120 }}>Large</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 56, minHeight: 64 }}>Narrow</p></DemoItem>
                  <DemoItem className="demo-item size-item"><p style={{ width: 260, minHeight: 72 }}>Extra Wide</p></DemoItem>
                </Container>
              </article>

              <article className="demo-cell">
                <h2>Multiple Drop Areas</h2>
                <Container config={{ direction: "row", name: "multi-root", noDrop: true }} locked>
                  <Container config={{ direction: "column", name: "multi-area-1" }} locked>
                    <h3>Area 1</h3>
                    <DemoItem><p>Item A</p></DemoItem>
                    <DemoItem><p>Item B</p></DemoItem>
                    <DemoItem><p>Item C</p></DemoItem>
                  </Container>
                  <Container config={{ direction: "column", name: "multi-area-2" }} locked>
                    <h3>Area 2</h3>
                    <DemoItem><p>Item X</p></DemoItem>
                    <DemoItem><p>Item Y</p></DemoItem>
                    <DemoItem><p>Item Z</p></DemoItem>
                  </Container>
                </Container>
              </article>

              <article className="demo-cell">
                <h2>Nested Container</h2>
                <Container config={{ direction: "column", groupID: "nested-group", ...nestedAnimationConfig }} locked>
                  <DemoItem><p>Item 1</p></DemoItem>
                  <DemoItem><p>Item 1.5</p></DemoItem>
                  <Container config={{ direction: "column", groupID: "nested-group", ...nestedAnimationConfig }} locked={lockNestedChild}>
                    <DemoItem className="demo-item sub-item"><p>Sub A1</p></DemoItem>
                    <DemoItem className="demo-item sub-item"><p>Sub A2</p></DemoItem>
                    <DemoItem className="demo-item sub-item"><p>Sub A3</p></DemoItem>
                  </Container>
                  <DemoItem><p>Item 2</p></DemoItem>
                  <DemoItem><p>Item 3</p></DemoItem>
                </Container>
              </article>

              {showCompactNested ? (
                <article className="demo-cell compact-nested-demo">
                  <h2>Compact Nested List</h2>
                  <Container className="compact-basic-list" config={{ direction: "column", groupID: "compact-nested", ...nestedAnimationConfig }}>
                    <DemoItem className="compact-item"><p>Overview</p></DemoItem>
                    <DemoItem className="compact-item"><p>Components</p></DemoItem>
                    <DemoItem className="compact-item"><p>Usage</p></DemoItem>
                    <Container className="compact-nested-list" config={{ direction: "column", groupID: "compact-nested", ...nestedAnimationConfig }}>
                      <DemoItem className="compact-item"><p>Container</p></DemoItem>
                      <DemoItem className="compact-item"><p>Item</p></DemoItem>
                      <DemoItem className="compact-item"><p>Handle</p></DemoItem>
                    </Container>
                  </Container>
                </article>
              ) : null}

              <article className="demo-cell">
                <h2>Draggable Sub-Containers</h2>
                <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked>
                  <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked={false}>
                    <DemoItem className="demo-item sub-item"><p>Group 1 - A</p></DemoItem>
                    <DemoItem className="demo-item sub-item"><p>Group 1 - B</p></DemoItem>
                  </Container>
                  <Container config={{ direction: "column", groupID: "drag-nested-group" }} locked={false}>
                    <DemoItem className="demo-item sub-item"><p>Group 2 - A</p></DemoItem>
                    <DemoItem className="demo-item sub-item"><p>Group 2 - B</p></DemoItem>
                    <DemoItem className="demo-item sub-item"><p>Group 2 - C</p></DemoItem>
                  </Container>
                  <DemoItem><p>Loose Item</p></DemoItem>
                </Container>
              </article>

              <article className="demo-cell">
                <h2>Nested Row Groups</h2>
                <Container config={{ direction: "row", groupID: "nested-row-group" }} locked>
                  <DemoItem className="demo-item row-item"><p>R1</p></DemoItem>
                  <Container config={{ direction: "row", groupID: "nested-row-group" }} locked={false}>
                    <DemoItem className="demo-item row-item sub-item"><p>S1</p></DemoItem>
                    <DemoItem className="demo-item row-item sub-item"><p>S2</p></DemoItem>
                    <DemoItem className="demo-item row-item sub-item"><p>S3</p></DemoItem>
                  </Container>
                  <DemoItem className="demo-item row-item"><p>R2</p></DemoItem>
                  <DemoItem className="demo-item row-item"><p>R3</p></DemoItem>
                </Container>
              </article>

              <article className="demo-cell">
                <h2>Layers Panel</h2>
                <Container config={{ direction: "column", groupID: "layers" }} locked>
                  <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">&#x25FB;</span><span>Header</span></div></DemoItem>
                  <Container config={{ direction: "column", groupID: "layers" }} locked={false}>
                    <div className="group-label">Hero Section</div>
                    <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">&#x25CB;</span><span>Avatar</span></div></DemoItem>
                    <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">T</span><span>Title</span></div></DemoItem>
                    <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">T</span><span>Subtitle</span></div></DemoItem>
                  </Container>
                  <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">&#x25FB;</span><span>Card Grid</span></div></DemoItem>
                  <DemoItem className="layer-item"><div className="layer-row"><span className="layer-icon">&#x25FB;</span><span>Footer</span></div></DemoItem>
                </Container>
              </article>
            </div>
          </Engine>
        </div>
      </div>
    </div>
  );
}

const initialColumns = [
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
    items: [{ id: "item-5", label: "Board polish", detail: "Column controls" }],
  },
  {
    id: "done",
    title: "Done",
    items: [{ id: "item-6", label: "Audit export", detail: "CSV polish" }],
  },
];

const progressiveExamples = [
  {
    id: "morning-brief",
    prompt: "Build the sentence: The product designer rewrote the onboarding checklist.",
    answerTiles: [
      { id: "morning-brief-answer-the", text: "The" },
      { id: "morning-brief-answer-product-designer", text: "product designer" },
      { id: "morning-brief-answer-rewrote", text: "rewrote" },
    ],
    bankTiles: [
      { id: "morning-brief-bank-checklist", text: "the onboarding checklist" },
      { id: "morning-brief-bank-quietly", text: "quietly" },
      { id: "morning-brief-bank-before-lunch", text: "before lunch" },
    ],
  },
];

function cloneColumns() {
  return initialColumns.map((column) => ({
    ...column,
    items: column.items.map((item) => ({ ...item })),
  }));
}

export function SnapSortComponentsDemo() {
  const awaitMutation = useSnapSortAwaitMutation();
  const containerRefs = useRef(new Map());
  const [columns, setColumns] = useState(cloneColumns);
  const [nextItemNumber, setNextItemNumber] = useState(7);
  const [ghostEntry, setGhostEntry] = useState(null);
  const [boardVersion, setBoardVersion] = useState(0);
  const itemCount = columns.reduce(
    (total, column) => total + column.items.length,
    0,
  );

  const findDemoItem = useCallback(
    (itemId) => {
      for (const column of columns) {
        const item = column.items.find((candidate) => candidate.id === itemId);
        if (item) return item;
      }
      return null;
    },
    [columns],
  );

  const deleteItem = useCallback((itemId) => {
    setGhostEntry(null);
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        items: column.items.filter((item) => item.id !== itemId),
      })),
    );
  }, []);

  const handleMove = useCallback((event) => {
    const itemId = event.itemMetadata.itemId;
    const targetColumnId = event.to.containerMetadata.columnId;
    if (typeof itemId !== "string" || typeof targetColumnId !== "string") return;

    setColumns((current) => {
      let movedItem = null;
      const withoutMovedItem = current.map((column) => {
        const sourceIndex = column.items.findIndex((item) => item.id === itemId);
        if (sourceIndex === -1) return column;
        const nextItems = column.items.slice();
        const [item] = nextItems.splice(sourceIndex, 1);
        movedItem = item;
        return { ...column, items: nextItems };
      });

      if (!movedItem) {
        const { label, detail } = event.itemMetadata;
        if (typeof label !== "string" || typeof detail !== "string") {
          return current;
        }
        movedItem = { id: itemId, label, detail };
      }

      return withoutMovedItem.map((column) => {
        if (column.id !== targetColumnId) return column;
        const nextItems = column.items.slice();
        nextItems.splice(
          Math.max(0, Math.min(event.to.index, nextItems.length)),
          0,
          movedItem,
        );
        return { ...column, items: nextItems };
      });
    });
  }, []);

  const handleRemove = useCallback((event) => {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;
    deleteItem(itemId);
  }, [deleteItem]);

  const handleGhostInsert = useCallback((event) => {
    const itemId = event.originalMetadata.itemId;
    const targetColumnId = event.containerMetadata.columnId;
    if (typeof itemId !== "string" || typeof targetColumnId !== "string") return;
    const sourceItem = findDemoItem(itemId);
    setGhostEntry({
      id: `ghost-${event.ghostItem.id}`,
      isGhost: true,
      columnId: targetColumnId,
      index: event.index,
      originalItemId: itemId,
      ghostItem: event.ghostItem,
      label: sourceItem?.label ?? "",
      detail: sourceItem?.detail ?? "",
    });
  }, [findDemoItem]);

  const handleGhostRemove = useCallback((event) => {
    setGhostEntry((current) =>
      current?.ghostItem === event.ghostItem ? null : current,
    );
  }, []);

  const callbacks = useMemo(
    () => ({
      onItemMove: handleMove,
      onItemRemove: handleRemove,
      onGhostInsert: handleGhostInsert,
      onGhostRemove: handleGhostRemove,
      createGhost: () => undefined,
      awaitMutation,
    }),
    [
      awaitMutation,
      handleGhostInsert,
      handleGhostRemove,
      handleMove,
      handleRemove,
    ],
  );

  const renderedColumnItems = useCallback(
    (column) => {
      const rendered = column.items.map((item) => ({ isGhost: false, item }));
      if (ghostEntry?.columnId !== column.id) return rendered;
      const coreIndex = Math.max(0, Math.min(ghostEntry.index, rendered.length));
      const originalIndex = ghostEntry.originalItemId
        ? column.items.findIndex((item) => item.id === ghostEntry.originalItemId)
        : -1;
      rendered.splice(
        originalIndex !== -1 && originalIndex <= coreIndex
          ? coreIndex + 1
          : coreIndex,
        0,
        ghostEntry,
      );
      return rendered;
    },
    [ghostEntry],
  );

  const addItem = useCallback(() => {
    setGhostEntry(null);
    setColumns((current) =>
      current.map((column, index) =>
        index === 0
          ? {
              ...column,
              items: [
                ...column.items,
                {
                  id: `item-${nextItemNumber}`,
                  label: `Task ${nextItemNumber}`,
                  detail: "Added from array state",
                },
              ],
            }
          : column,
      ),
    );
    setNextItemNumber((value) => value + 1);
  }, [nextItemNumber]);

  const resetItems = useCallback(() => {
    containerRefs.current.clear();
    setNextItemNumber(7);
    setGhostEntry(null);
    setColumns(cloneColumns());
    setBoardVersion((version) => version + 1);
  }, []);

  const moveItemAcrossColumns = useCallback(
    (itemId, direction) => {
      const sourceColumnIndex = columns.findIndex((column) =>
        column.items.some((item) => item.id === itemId),
      );
      const targetColumnIndex = sourceColumnIndex + direction;
      if (
        sourceColumnIndex === -1 ||
        targetColumnIndex < 0 ||
        targetColumnIndex >= columns.length
      ) {
        return;
      }

      const sourceItemIndex = columns[sourceColumnIndex].items.findIndex(
        (item) => item.id === itemId,
      );
      const sourceContainer = containerRefs.current.get(
        columns[sourceColumnIndex].id,
      );
      const targetContainer = containerRefs.current.get(
        columns[targetColumnIndex].id,
      );
      const destinationIndex = Math.min(
        sourceItemIndex,
        columns[targetColumnIndex].items.length,
      );
      if (
        sourceContainer &&
        targetContainer &&
        sourceContainer.moveItem(itemId, targetContainer, destinationIndex)
      ) {
        return;
      }

      const movedItem = columns[sourceColumnIndex].items[sourceItemIndex];
      setColumns((current) =>
        current.map((column, columnIndex) => {
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
        }),
      );
    },
    [columns],
  );

  useEffect(() => {
    window.__snapsortMoveComponentItem = moveItemAcrossColumns;
    return () => {
      delete window.__snapsortMoveComponentItem;
    };
  }, [moveItemAcrossColumns]);

  return (
    <div className="snapsort-fixture components-demo">
      <header className="demo-header">
        <div>
          <h1>SnapSort Components</h1>
          <p>{itemCount} Euclidean cards plus Progressive sentence demos</p>
        </div>
      </header>

      <section className="algorithm-panel kanban-panel">
        <div className="section-heading">
          <h2>Euclidean drag and drop</h2>
          <p>Array-backed board with column and item reordering.</p>
        </div>
        <div className="kanban-demo-shell">
          <div className="toolbar">
            <button onClick={addItem} type="button">Add Item</button>
            <button onClick={resetItems} type="button">Reset</button>
          </div>
          <div className="engine-area" key={boardVersion}>
            <Engine id="snapsort-components-demo-canvas">
              <div className="board-frame">
                <Container
                  className="board"
                  config={{ direction: "row", name: "component-kanban-root", noDrop: true }}
                  locked
                  metadata={{ boardId: "component-kanban" }}
                >
                  {columns.map((column) => (
                    <Container
                      className={column.id === "backlog" ? "list-panel array-list" : "list-panel"}
                      config={{
                        direction: "column",
                        name: `component-${column.id}`,
                        animation: {
                          reorder: snapSortCubicAnimation,
                          drop: snapSortCubicAnimation,
                          clickMove: snapSortCubicAnimation,
                        },
                        callbacks,
                      }}
                      key={column.id}
                      locked
                      metadata={{ columnId: column.id }}
                      ref={(container) => {
                        if (container) containerRefs.current.set(column.id, container);
                      }}
                    >
                      <div className="list-header">
                        <h2>{column.title}</h2>
                        <span>{column.items.length}</span>
                      </div>
                      {renderedColumnItems(column).map((entry) =>
                        entry.isGhost ? (
                          <Item
                            className="task-card ghost task-ghost"
                            itemObject={entry.ghostItem}
                            key={entry.id}
                          >
                            <TaskContent label={entry.label} detail={entry.detail} />
                          </Item>
                        ) : (
                          <Item
                            className="task-card"
                            key={entry.item.id}
                            metadata={{
                              itemId: entry.item.id,
                              label: entry.item.label,
                              detail: entry.item.detail,
                            }}
                          >
                            <TaskContent
                              actions={
                                <div className="card-actions">
                                  <button
                                    aria-label={`Delete ${entry.item.label}`}
                                    className="icon-button"
                                    type="button"
                                    {...controlButtonProps(() => deleteItem(entry.item.id))}
                                  >
                                    delete
                                  </button>
                                  <button
                                    aria-label={`Move ${entry.item.label} left`}
                                    className="icon-button"
                                    disabled={columns.findIndex((candidate) => candidate.id === column.id) === 0}
                                    type="button"
                                    {...controlButtonProps(() => moveItemAcrossColumns(entry.item.id, -1))}
                                  >
                                    left
                                  </button>
                                  <button
                                    aria-label={`Move ${entry.item.label} right`}
                                    className="icon-button"
                                    disabled={columns.findIndex((candidate) => candidate.id === column.id) === columns.length - 1}
                                    type="button"
                                    {...controlButtonProps(() => moveItemAcrossColumns(entry.item.id, 1))}
                                  >
                                    right
                                  </button>
                                </div>
                              }
                              detail={entry.item.detail}
                              handle
                              label={entry.item.label}
                            />
                          </Item>
                        ),
                      )}
                    </Container>
                  ))}
                </Container>
              </div>
            </Engine>
          </div>
        </div>
      </section>

      <div className="advanced-demo-grid">
        <section className="algorithm-panel">
          <div className="section-heading">
            <h2>Progressive drag and drop</h2>
            <p>Sentence-builder layouts using varied tile widths and wrapping rows.</p>
          </div>
          <Engine id="snapsort-progressive-components-demo-canvas">
            <Container
              className="progressive-root"
              config={{ direction: "column", mode: "progressive", name: "progressive-components-root", noDrop: true }}
              locked
              metadata={{ boardId: "progressive-components" }}
            >
              {progressiveExamples.map((example) => (
                <Container
                  className="progressive-example"
                  config={{ direction: "column", mode: "progressive", name: `progressive-example-${example.id}`, noDrop: true }}
                  key={example.id}
                  locked
                  metadata={{ exampleId: example.id }}
                >
                  <div className="progressive-prompt"><span>{example.prompt}</span></div>
                  <Container
                    className="sentence-answer-line"
                    config={{
                      direction: "row",
                      mode: "progressive",
                      name: `progressive-answer-${example.id}`,
                      groupID: `progressive-${example.id}`,
                      dropArea: true,
                      animation: { reorder: snapSortCubicAnimation, drop: snapSortCubicAnimation },
                    }}
                    locked
                    metadata={{ zone: "answer", exampleId: example.id }}
                  >
                    {example.answerTiles.map((tile) => (
                      <Item className="sentence-tile-wrapper" key={tile.id} metadata={{ itemId: tile.id }}>
                        <button className="sentence-tile" type="button">{tile.text}</button>
                      </Item>
                    ))}
                  </Container>
                  <Container
                    className="sentence-bank-line"
                    config={{
                      direction: "row",
                      mode: "progressive",
                      name: `progressive-bank-${example.id}`,
                      groupID: `progressive-${example.id}`,
                      dropArea: true,
                      animation: { reorder: snapSortCubicAnimation, drop: snapSortCubicAnimation },
                    }}
                    locked
                    metadata={{ zone: "bank", exampleId: example.id }}
                  >
                    {example.bankTiles.map((tile) => (
                      <Item className="sentence-tile-wrapper" key={tile.id} metadata={{ itemId: tile.id }}>
                        <button className="sentence-tile muted" type="button">{tile.text}</button>
                      </Item>
                    ))}
                  </Container>
                </Container>
              ))}
            </Container>
          </Engine>
        </section>
        <section className="algorithm-panel">
          <div className="section-heading">
            <h2>Progressive sentence builder</h2>
            <p>Interactive Duolingo-style component demo with click moves and validation.</p>
          </div>
          <SnapSortDuolingoDemo embedded />
        </section>
      </div>
    </div>
  );
}

function TaskContent({ actions = null, detail, handle = false, label }) {
  return (
    <div className="task-content">
      {handle ? (
        <Handle className="task-drag-handle">
          <span aria-hidden="true">::</span>
        </Handle>
      ) : null}
      <div className="task-main">
        <strong>{label}</strong>
        <span>{detail}</span>
      </div>
      {actions}
    </div>
  );
}

const exercise = {
  english: "I drink water every morning.",
  target: "私は毎朝水を飲みます",
  tiles: ["私", "は", "毎朝", "水", "を", "飲みます"],
};

function toTileData(texts) {
  return texts.map((text, index) => ({
    id: `tile-${index}`,
    text,
    originalIndex: index,
  }));
}

export function SnapSortDuolingoDemo({ embedded = false }) {
  const awaitMutation = useSnapSortAwaitMutation();
  const answerRef = useRef(null);
  const bankRef = useRef(null);
  const pointerStartRef = useRef(null);
  const pendingRemovedTileRef = useRef(null);
  const suppressTileClickRef = useRef(false);
  const [tileState, setTileState] = useState(() => ({
    answerTiles: [],
    bankTiles: toTileData(exercise.tiles),
  }));
  const [ghostEntry, setGhostEntry] = useState(null);
  const [result, setResult] = useState(null);
  const [lookupTarget, setLookupTarget] = useState(null);
  const { answerTiles, bankTiles } = tileState;

  const allTiles = useMemo(
    () => [...answerTiles, ...bankTiles],
    [answerTiles, bankTiles],
  );

  const updateTileZone = useCallback((tileId, targetZone, targetIndex) => {
    setGhostEntry(null);
    setResult(null);
    setTileState((current) => {
      const all = [...current.answerTiles, ...current.bankTiles];
      const movedTile =
        all.find((tile) => tile.id === tileId) ??
        pendingRemovedTileRef.current;
      if (!movedTile) return current;
      pendingRemovedTileRef.current = null;

      const nextAnswer = current.answerTiles.filter((tile) => tile.id !== tileId);
      const nextBank = current.bankTiles.filter((tile) => tile.id !== tileId);
      const targetTiles = targetZone === "answer" ? nextAnswer : nextBank;
      targetTiles.splice(
        Math.max(0, Math.min(targetIndex, targetTiles.length)),
        0,
        movedTile,
      );
      return {
        answerTiles: nextAnswer,
        bankTiles: nextBank,
      };
    });
  }, []);

  const containerForZone = useCallback(
    (zone) => (zone === "answer" ? answerRef.current : bankRef.current),
    [],
  );

  const moveTileToZone = useCallback(
    (tile, targetZone) => {
      const sourceZone = answerTiles.some((candidate) => candidate.id === tile.id)
        ? "answer"
        : "bank";
      const sourceContainer = containerForZone(sourceZone);
      const targetContainer = containerForZone(targetZone);
      const fallbackIndex =
        targetZone === "answer" ? answerTiles.length : bankTiles.length;
      if (
        sourceContainer &&
        targetContainer &&
        sourceContainer.moveItem(tile.id, targetContainer, fallbackIndex)
      ) {
        return;
      }
      updateTileZone(tile.id, targetZone, fallbackIndex);
    },
    [answerTiles, bankTiles, containerForZone, updateTileZone],
  );

  const handleMove = useCallback((event) => {
    const itemId = event.itemMetadata.itemId;
    const targetZone = event.to.containerMetadata.zone;
    if (
      typeof itemId !== "string" ||
      (targetZone !== "answer" && targetZone !== "bank")
    ) {
      return;
    }
    updateTileZone(itemId, targetZone, event.to.index);
  }, [updateTileZone]);

  const handleRemove = useCallback((event) => {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;
    setTileState((current) => {
      pendingRemovedTileRef.current =
        [...current.answerTiles, ...current.bankTiles].find(
          (tile) => tile.id === itemId,
        ) ?? null;
      return {
        answerTiles: current.answerTiles.filter((tile) => tile.id !== itemId),
        bankTiles: current.bankTiles.filter((tile) => tile.id !== itemId),
      };
    });
  }, []);

  const handleGhostInsert = useCallback((event) => {
    const itemId = event.originalMetadata.itemId;
    const targetZone = event.containerMetadata.zone;
    if (
      typeof itemId !== "string" ||
      (targetZone !== "answer" && targetZone !== "bank")
    ) {
      return;
    }
    const sourceTile = allTiles.find((tile) => tile.id === itemId);
    setGhostEntry({
      id: `ghost-${event.ghostItem.id}`,
      isGhost: true,
      zone: targetZone,
      index: event.index,
      originalItemId: itemId,
      ghostItem: event.ghostItem,
      text: sourceTile?.text ?? "",
    });
  }, [allTiles]);

  const handleGhostRemove = useCallback((event) => {
    setGhostEntry((current) =>
      current?.ghostItem === event.ghostItem ? null : current,
    );
  }, []);

  const callbacks = useMemo(
    () => ({
      onItemMove: handleMove,
      onItemRemove: handleRemove,
      onGhostInsert: handleGhostInsert,
      onGhostRemove: handleGhostRemove,
      createGhost: () => undefined,
      awaitMutation,
    }),
    [
      awaitMutation,
      handleGhostInsert,
      handleGhostRemove,
      handleMove,
      handleRemove,
    ],
  );

  const renderedTiles = useCallback(
    (zone) => {
      const sourceTiles = zone === "answer" ? answerTiles : bankTiles;
      const rendered = sourceTiles.map((tile) => ({ isGhost: false, tile }));
      if (ghostEntry?.zone !== zone) return rendered;
      const coreIndex = Math.max(0, Math.min(ghostEntry.index, rendered.length));
      const originalIndex = ghostEntry.originalItemId
        ? sourceTiles.findIndex((tile) => tile.id === ghostEntry.originalItemId)
        : -1;
      rendered.splice(
        originalIndex !== -1 && originalIndex <= coreIndex
          ? coreIndex + 1
          : coreIndex,
        0,
        ghostEntry,
      );
      return rendered;
    },
    [answerTiles, bankTiles, ghostEntry],
  );

  const tilePointerDown = (event) => {
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    suppressTileClickRef.current = false;
  };
  const tilePointerMove = (event) => {
    const start = pointerStartRef.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3) {
      suppressTileClickRef.current = true;
    }
  };
  const tileClick = (event, action) => {
    if (suppressTileClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressTileClickRef.current = false;
      pointerStartRef.current = null;
      return;
    }
    action();
    suppressTileClickRef.current = false;
    pointerStartRef.current = null;
  };

  const resetTiles = () => {
    setGhostEntry(null);
    pendingRemovedTileRef.current = null;
    setTileState({
      answerTiles: [],
      bankTiles: toTileData(exercise.tiles),
    });
    setResult(null);
  };

  const checkAnswer = () => {
    if (answerTiles.length === 0) return;
    const answer = answerTiles.map((tile) => tile.text).join("");
    setResult({ correct: answer === exercise.target, expected: exercise.target });
  };

  const tileButtonProps = (entry, targetZone, selected = false) => ({
    "aria-label": entry.tile.text,
    className: selected ? "tile selected" : "tile",
    onClick: (event) =>
      tileClick(event, () => moveTileToZone(entry.tile, targetZone)),
    onDoubleClick: () =>
      setLookupTarget(entry.tile.text.replace(/[.,!?]/g, "").trim()),
    onKeyDown: (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      moveTileToZone(entry.tile, targetZone);
    },
    onPointerDown: tilePointerDown,
    onPointerMove: tilePointerMove,
    title: targetZone === "answer" ? "Click to add" : "Click to remove",
    type: "button",
  });

  return (
    <div className={`snapsort-fixture game-demo${embedded ? " embedded" : ""}`}>
      <main>
        <section className="prompt">
          <p className="label">Translate this sentence:</p>
          <p className="english">{exercise.english}</p>
        </section>
        <div className="snapsort-engine" data-lang="ja">
          <Engine id="sentence-builder-snapsort-demo">
            <Container
              className="sentence-builder-root"
              config={{ direction: "column", mode: "progressive", name: "sentence-builder-root", noDrop: true }}
              locked
              metadata={{ purpose: "sentence-builder" }}
            >
              <Container
                className="answer-area answer-box"
                config={{
                  direction: "row",
                  mode: "progressive",
                  name: "sentence-answer",
                  groupID: "sentence-builder",
                  dropArea: true,
                  animation: {
                    reorder: snapSortCubicAnimation,
                    drop: snapSortCubicAnimation,
                    clickMove: snapSortCubicAnimation,
                  },
                  callbacks,
                }}
                locked
                metadata={{ zone: "answer" }}
                ref={answerRef}
              >
                {renderedTiles("answer").map((entry) =>
                  entry.isGhost ? (
                    <Item className="tile-wrapper ghost tile-ghost" itemObject={entry.ghostItem} key={entry.id}>
                      <button className="tile selected" tabIndex={-1} type="button">{entry.text}</button>
                    </Item>
                  ) : (
                    <Item className="tile-wrapper" key={entry.tile.id} metadata={{ itemId: entry.tile.id }}>
                      <button {...tileButtonProps(entry, "bank", true)}>{entry.tile.text}</button>
                    </Item>
                  ),
                )}
                {answerTiles.length === 0 && ghostEntry?.zone !== "answer" ? (
                  <span className="placeholder">Drag tiles here or click to add</span>
                ) : null}
              </Container>

              <Container
                className="tile-bank-container tile-bank"
                config={{
                  direction: "row",
                  mainAxisAlign: "center",
                  mode: "progressive",
                  name: "sentence-bank",
                  groupID: "sentence-builder",
                  dropArea: true,
                  animation: {
                    reorder: snapSortCubicAnimation,
                    drop: snapSortCubicAnimation,
                    clickMove: snapSortCubicAnimation,
                  },
                  callbacks,
                }}
                locked
                metadata={{ zone: "bank" }}
                ref={bankRef}
              >
                {renderedTiles("bank").map((entry) =>
                  entry.isGhost ? (
                    <Item className="tile-wrapper ghost tile-ghost" itemObject={entry.ghostItem} key={entry.id}>
                      <button className="tile" tabIndex={-1} type="button">{entry.text}</button>
                    </Item>
                  ) : (
                    <Item className="tile-wrapper" key={entry.tile.id} metadata={{ itemId: entry.tile.id }}>
                      <button {...tileButtonProps(entry, "answer")}>{entry.tile.text}</button>
                    </Item>
                  ),
                )}
              </Container>
            </Container>
          </Engine>
        </div>
        <section className="actions">
          <button className="btn secondary" disabled={answerTiles.length === 0} onClick={resetTiles} type="button">Reset</button>
          <button className="btn primary" disabled={answerTiles.length === 0} onClick={checkAnswer} type="button">Check</button>
        </section>
        {result ? (
          <section className={`result ${result.correct ? "correct" : "incorrect"}`}>
            <div className="result-icon">{result.correct ? "OK" : "No"}</div>
            <p className="result-text">{result.correct ? "Correct" : "Not quite right"}</p>
            {!result.correct ? <p className="expected">Expected: {result.expected}</p> : null}
            <button className="btn next" onClick={resetTiles} type="button">Try Again</button>
          </section>
        ) : null}
        {lookupTarget ? (
          <section className="lookup-panel">
            <div>
              <p className="label">Lookup</p>
              <p className="lookup-word">{lookupTarget}</p>
            </div>
            <button onClick={() => setLookupTarget(null)} type="button">Close</button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

const initialInsertionColumns = [
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
  { id: "empty", title: "Archive", items: [] },
];

function cloneInsertionColumns() {
  return initialInsertionColumns.map((column) => ({
    ...column,
    items: column.items.map((item) => ({ ...item })),
  }));
}

export function SnapSortInsertionDemo() {
  const awaitMutation = useSnapSortAwaitMutation();
  const [columns, setColumns] = useState(cloneInsertionColumns);
  const pendingRemovedItem = useRef(null);
  const itemCount = columns.reduce(
    (total, column) => total + column.items.length,
    0,
  );

  const removeItemById = useCallback((itemId, sourceColumns) => {
    let removedItem = null;
    const columnsWithoutItem = sourceColumns.map((column) => {
      const itemIndex = column.items.findIndex((item) => item.id === itemId);
      if (itemIndex === -1) return column;
      const nextItems = column.items.slice();
      const [item] = nextItems.splice(itemIndex, 1);
      removedItem = item;
      return { ...column, items: nextItems };
    });
    return { removedItem, columnsWithoutItem };
  }, []);

  const callbacks = useMemo(
    () => ({
      onItemMove: (event) => {
        const itemId = event.itemMetadata.itemId;
        const targetColumnId = event.to.containerMetadata.columnId;
        if (typeof itemId !== "string" || typeof targetColumnId !== "string") return;
        setColumns((current) => {
          let removed = pendingRemovedItem.current;
          let columnsWithoutItem = current;
          if (!removed) {
            const result = removeItemById(itemId, current);
            removed = result.removedItem;
            columnsWithoutItem = result.columnsWithoutItem;
          }
          pendingRemovedItem.current = null;
          if (!removed) return current;
          return columnsWithoutItem.map((column) => {
            if (column.id !== targetColumnId) return column;
            const nextItems = column.items.slice();
            nextItems.splice(Math.max(0, Math.min(event.to.index, nextItems.length)), 0, removed);
            return { ...column, items: nextItems };
          });
        });
      },
      onItemRemove: (event) => {
        const itemId = event.itemMetadata.itemId;
        if (typeof itemId !== "string") return;
        setColumns((current) => {
          const { removedItem, columnsWithoutItem } = removeItemById(itemId, current);
          pendingRemovedItem.current = removedItem;
          return columnsWithoutItem;
        });
      },
      awaitMutation,
    }),
    [awaitMutation, removeItemById],
  );

  const reset = () => {
    pendingRemovedItem.current = null;
    setColumns(cloneInsertionColumns());
  };

  const addItem = () => {
    setColumns((current) =>
      current.map((column, index) =>
        index === 0
          ? {
              ...column,
              items: [
                ...column.items,
                {
                  id: `task-${itemCount + 1}`,
                  kind: "file",
                  title: `new-file-${itemCount + 1}.md`,
                  detail: "1 KB",
                },
              ],
            }
          : column,
      ),
    );
  };

  return (
    <div className="snapsort-fixture insertion-demo">
      <header className="demo-header">
        <div>
          <h1>SnapSort Insertion</h1>
          <p>{itemCount} files and folders - original row stays still until drop</p>
        </div>
        <div className="toolbar">
          <button onClick={addItem} type="button">Add</button>
          <button onClick={reset} type="button">Reset</button>
        </div>
      </header>
      <Engine id="snapsort-insertion-demo-canvas">
        <Container
          className="insertion-board"
          config={{ direction: "row", mode: "insertion", name: "insertion-board-root", noDrop: true }}
          locked
          metadata={{ boardId: "insertion-demo" }}
        >
          {columns.map((column) => (
            <Container
              className="insertion-list"
              config={{
                direction: "column",
                groupID: "insertion-demo",
                mode: "insertion",
                name: `insertion-${column.id}`,
                callbacks,
              }}
              key={column.id}
              locked
              metadata={{ columnId: column.id }}
            >
              <div className="list-header">
                <h2>{column.title}</h2>
                <span>{column.items.length}</span>
              </div>
              {column.items.map((item) => (
                <Item className="insertion-card" key={item.id} metadata={{ itemId: item.id }}>
                  <span className={`file-icon ${item.kind === "folder" ? "folder-icon" : ""}`} aria-hidden="true">
                    {item.kind === "folder" ? "folder" : "description"}
                  </span>
                  <div className="card-copy">
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                </Item>
              ))}
            </Container>
          ))}
        </Container>
      </Engine>
    </div>
  );
}
