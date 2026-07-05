<script lang="ts">
  import { Engine } from "@snap-engine/asset-base-svelte";
  import type { Engine as SnapEngine } from "@snap-engine/core";
  import {
    Container,
    ContainerInsertion,
    ContainerProgressive,
    Handle,
    Item,
    ItemInsertion,
    ItemProgressive,
  } from "@snap-engine/snapsort-svelte";
  import type { ContainerConfig, ContainerEuclidean, ItemInsertEvent } from "@snap-engine/snapsort";
  import SnapSortContextBoundary from "./SnapSortContextBoundary.svelte";

  type MultiContainerItem = {
    id: string;
    label: string;
  };

  type MultiContainerColumn = {
    id: string;
    title: string;
    direction: "left" | "right";
    items: MultiContainerItem[];
    container?: ContainerEuclidean;
  };

  type CustomizableMockupTheme = {
    id: string;
    label: string;
    demoOrder: CustomizableMockupType[];
  };

  type CustomizableMockupType = "list" | "words" | "tasks" | "nested" | "editor" | "files";

  type CustomizableMockupTask = {
    title: string;
    tag: string;
    progress: string;
    started: string;
  };

  type CustomizableMockupNestedItem = {
    label: string;
    meta: string;
  };

  type CustomizableMockupField = {
    label: string;
    type: "radio" | "checkbox";
    options: string[];
  };

  type CustomizableMockupFile = {
    id: string;
    label: string;
    kind: "folder" | "file";
    depth: number;
    active?: boolean;
  };

  let heroEngine: SnapEngine | null = $state(null);
  let examplesEngine: SnapEngine | null = $state(null);
  let sidewaysSolved = $state(false);
  let customizableScrollScene: HTMLElement | undefined = $state();
  let customizableProgress = $state(0);

  function configureInput(engine: SnapEngine | null) {
    if (engine) {
      engine.input.config.maxSimultaneousDrags = 1;
    }
  }

  $effect(() => {
    configureInput(heroEngine);
    configureInput(examplesEngine);
  });

  function goToDocs() {
    window.location.href = "/docs/snapsort/introduction";
  }

  function goToGallery() {
    window.location.href = "/snapsort/gallery";
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function updateCustomizableProgress() {
    if (typeof window === "undefined" || !customizableScrollScene) return;

    const rect = customizableScrollScene.getBoundingClientRect();
    const scrollableDistance = Math.max(1, window.innerHeight + rect.height);

    customizableProgress = clamp((window.innerHeight - rect.top) / scrollableDistance, 0, 1);
  }

  function getCustomizableThemeOffset(index: number) {
    const offsets = [
      [0, -680],
      [-680, -40],
      [-160, -760],
      [-740, -120],
    ];
    const [start, end] = offsets[index] ?? offsets[0];
    return start + (end - start) * customizableProgress;
  }

  function getCustomizableThemeConfig(themeId: string): Partial<ContainerConfig> {
    return themeId === "retro" || themeId === "terminal" ? { animation: null } : {};
  }

  $effect(() => {
    customizableScrollScene;
    if (typeof requestAnimationFrame === "undefined") return;

    requestAnimationFrame(updateCustomizableProgress);
  });

  const title = "SnapSort";
  const gripDots = Array.from({ length: 6 }, (_, i) => i);
  const titleChars = title.split("").map((char, i) => ({
    char,
    id: `snapsort-letter-${i}`,
  }));

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

  function handleSidewaysInsert(event: ItemInsertEvent) {
    event.container.element?.insertBefore(event.item.element!, event.beforeElement);
    requestAnimationFrame(() => updateSidewaysSolved(event.container.element));
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
  const customizableMockupThemes: CustomizableMockupTheme[] = [
    { id: "default", label: "SnapDesign", demoOrder: ["list", "words", "tasks", "nested", "editor", "files"] },
    { id: "retro", label: "Retro", demoOrder: ["editor", "list", "files", "words", "nested", "tasks"] },
    { id: "terminal", label: "Terminal", demoOrder: ["files", "tasks", "nested", "list", "editor", "words"] },
    { id: "elegant", label: "Elegant", demoOrder: ["words", "nested", "editor", "tasks", "files", "list"] },
  ];
  const customizableMockupRows = [
    { label: "Spec pass", meta: "01" },
    { label: "Mockup QA", meta: "02" },
    { label: "Ship note", meta: "03" },
  ];
  const customizableMockupWords = ["Drag", "words", "into", "place"];
  const customizableMockupCards: CustomizableMockupTask[] = [
    { title: "Review motion", tag: "UX", progress: "68%", started: "Jul 1" },
    { title: "Ship polish", tag: "UI", progress: "42%", started: "Jul 3" },
  ];
  const customizableMockupNested: {
    parent: CustomizableMockupNestedItem[];
    child: CustomizableMockupNestedItem[];
  } = {
    parent: [
      { label: "Section", meta: "3" },
      { label: "Controls", meta: "5" },
    ],
    child: [
      { label: "Text input", meta: "Aa" },
      { label: "Select menu", meta: "v" },
    ],
  };
  const customizableMockupFields: CustomizableMockupField[] = [
    {
      label: "Satisfaction",
      type: "radio",
      options: ["Great", "Okay", "Poor"],
    },
    {
      label: "Follow up",
      type: "checkbox",
      options: ["Email", "Phone"],
    },
  ];
  const customizableMockupFiles: CustomizableMockupFile[] = [
    { id: "src", label: "src", kind: "folder", depth: 0 },
    { id: "routes", label: "routes", kind: "folder", depth: 1 },
    { id: "page", label: "+page.svelte", kind: "file", depth: 2, active: true },
    { id: "theme", label: "theme.scss", kind: "file", depth: 1 },
    { id: "pkg", label: "package.json", kind: "file", depth: 0 },
  ];
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

  function handleMultiContainerInsert(event: ItemInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    const targetColumnId = event.containerMetadata.columnId;
    if (typeof itemId !== "string" || typeof targetColumnId !== "string") return;

    moveMultiContainerState(itemId, targetColumnId, event.index);
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

<svelte:window onscroll={updateCustomizableProgress} onresize={updateCustomizableProgress} />

<section id="landing">
  <Engine id="snapsort-canvas" bind:engine={heroEngine}>
    <div class="hero-section">
      <div class="hero-frame">
        <div class="hero-slot slot">
          <Container
            className="hero-stack"
            config={{ direction: "column", groupID: "snapsort-hero-content" }}
          >
            <Item className="hero-stack-item hero-title-item">
              <div class="hero-row card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <div class="title-section" aria-label="SnapSort">
                  <SnapSortContextBoundary>
                    <Container config={{ direction: "row", groupID: "snapsort-title" }}>
                      {#each titleChars as { char, id } (id)}
                        <Item style="padding: 0; width: auto;">
                          <span {id} class="letter-shell">
                            <span class="title-glyph title-text pixel-font">
                              {char === " " ? "\u00A0" : char}
                            </span>
                            <span class="letter-grip" aria-hidden="true">
                              {#each gripDots as dot (dot)}
                                <i class="letter-grip-dot"></i>
                              {/each}
                            </span>
                          </span>
                        </Item>
                      {/each}
                    </Container>
                  </SnapSortContextBoundary>
                </div>
              </div>
            </Item>

            <Item className="hero-stack-item hero-copy-item">
              <div class="hero-row card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <p class="hero-statement large">
                  Component library for drag and drop UI. Open source and framework agnostic.
                </p>
              </div>
            </Item>

            <Item className="hero-stack-item hero-cta-item">
              <div class="hero-row hero-row-final card">
                <Handle className="hero-row-handle">
                  <span class="hero-row-grip" aria-hidden="true">
                    {#each gripDots as dot (dot)}
                      <i></i>
                    {/each}
                  </span>
                </Handle>
                <div class="hero-cta">
                  <button class="primary" type="button" onclick={goToDocs}>Get Started</button>
                  <button type="button" onclick={goToGallery}>Gallery</button>
                </div>
              </div>
            </Item>
          </Container>
        </div>
      </div>
    </div>
  </Engine>

</section>

<section class="core-showcase col-12">
  <div class="core-showcase-header">
    <h2>Versatile and Extensible</h2>
    <p class="large">
      A wide variety of core components are available out of the box to provide
      building blocks for any type of drag and drop UI.
    </p>
  </div>

  <Engine id="snapsort-core-demos" bind:engine={examplesEngine}>
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

      <article class="core-demo-card">
        <h3>Sideways list</h3>
        <div class="core-demo-surface sideways-demo-surface card">
          <Container
            className={`sideways-list ${sidewaysSolved ? "solved" : ""}`}
            config={{
              direction: "row",
              groupID: "core-sideways",
              mainAxisAlign: "center",
              callbacks: { onItemInsert: handleSidewaysInsert },
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
          <ContainerInsertion
            className="basic-list insertion-list bounded-demo-list"
            config={{ direction: "column", groupID: "core-insert" }}
          >
            <ItemInsertion>
              <div class="basic-row handle-row">
                <Handle className="demo-row-handle">
                  <span class="demo-grip" aria-hidden="true">
                    <i></i><i></i><i></i><i></i>
                  </span>
                </Handle>
                <span>{insertItems[0]}</span>
              </div>
            </ItemInsertion>
            <ContainerInsertion
              className="nested-list nested-insertion-list insertion-list bounded-demo-list card shallow"
              config={{ direction: "column", groupID: "core-insert" }}
              locked={false}
            >
              <Handle className="demo-container-handle">
                <span class="demo-grip" aria-hidden="true">
                  <i></i><i></i><i></i><i></i>
                </span>
              </Handle>
              {#each insertNestedItems as item (item)}
                <ItemInsertion>
                  <div class="basic-row nested-row handle-row">
                    <Handle className="demo-row-handle">
                      <span class="demo-grip" aria-hidden="true">
                        <i></i><i></i><i></i><i></i>
                      </span>
                    </Handle>
                    <span>{item}</span>
                  </div>
                </ItemInsertion>
              {/each}
            </ContainerInsertion>
            {#each insertItems.slice(1) as item (item)}
              <ItemInsertion>
                <div class="basic-row handle-row">
                  <Handle className="demo-row-handle">
                    <span class="demo-grip" aria-hidden="true">
                      <i></i><i></i><i></i><i></i>
                    </span>
                  </Handle>
                  <span>{item}</span>
                </div>
              </ItemInsertion>
            {/each}
          </ContainerInsertion>
        </div>
      </article>

      <article class="core-demo-card">
        <h3>Multiple rows</h3>
        <div class="core-demo-surface card">
          <ContainerProgressive
            className="multi-row-list"
            config={{ direction: "row", groupID: "core-multi-row" }}
          >
            {#each multiRowItems as item (item.id)}
              <ItemProgressive>
                <div class="basic-token">
                  <span>{item.label}</span>
                </div>
              </ItemProgressive>
            {/each}
          </ContainerProgressive>
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
                  callbacks: { onItemInsert: handleMultiContainerInsert },
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

      <div class="feature-card-section">
        <div class="feature-card-grid">
          <div class="customizable-scroll-scene" bind:this={customizableScrollScene}>
          <article
            class="customizable-feature-card"
            style={`--customizable-progress: ${customizableProgress};`}
          >
            <div class="feature-card-copy">
              <div class="feature-card-copy-text">
                <h3>Customizable</h3>
                <p class="large">
                  SnapSort components are styleless by default. Use our default theme or
                  apply your own, including Tailwind. Configuration parameters allow
                  adjustment of animation and drag behavior.
                </p>
              </div>
            </div>

            <div
              class="customizable-demo card shallow"
              style={`--customizable-progress: ${customizableProgress};`}
            >
              <div class="customizable-theme-rail">
                {#each customizableMockupThemes as theme, themeIndex (theme.id)}
                  <div class="customizable-surface" data-theme={theme.id}>
                    <div
                      class="customizable-motion-frame"
                      style={`--theme-offset: ${getCustomizableThemeOffset(themeIndex).toFixed(2)}px;`}
                    >
                      <div class="customizable-mockup-shell">
                    <div class="customizable-mockup-title">{theme.label}</div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("list")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>List</span>
                          <i></i>
                        </div>
                      {/if}
                      <Container
                        className="customizable-mini-list"
                        config={{
                          direction: "column",
                          groupID: `customizable-${theme.id}-list`,
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                      >
                        {#each customizableMockupRows as row (row.label)}
                          <Item>
                            <div class="customizable-mini-row">
                              <span class="customizable-mini-handle" aria-hidden="true">
                                <span class="customizable-mini-grip">
                                  <i></i><i></i><i></i><i></i>
                                </span>
                              </span>
                              <span class="customizable-mini-row-main">
                                <span class="customizable-mini-row-text">{row.label}</span>
                              </span>
                              <span class="customizable-mini-meta">{row.meta}</span>
                            </div>
                          </Item>
                        {/each}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("words")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Words</span>
                          <i></i>
                        </div>
                      {/if}
                      <ContainerProgressive
                        className="customizable-mini-words"
                        config={{
                          direction: "row",
                          groupID: `customizable-${theme.id}-words`,
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                      >
                        {#each customizableMockupWords as word (word)}
                          <ItemProgressive>
                            <span class="customizable-mini-word">{word}</span>
                          </ItemProgressive>
                        {/each}
                      </ContainerProgressive>
                    </div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("tasks")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Tasks</span>
                          <i></i>
                        </div>
                      {/if}
                      <Container
                        className="customizable-mini-board"
                        config={{
                          direction: "column",
                          groupID: `customizable-${theme.id}-tasks`,
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                      >
                        {#each customizableMockupCards as card (card)}
                          <Item>
                            <div class="customizable-mini-card">
                              <div class="customizable-mini-card-head">
                                <span class="customizable-mini-handle task" aria-hidden="true">
                                  <span class="customizable-mini-grip">
                                    <i></i><i></i><i></i><i></i>
                                  </span>
                                </span>
                                <strong>{card.title}</strong>
                                <span>{card.tag}</span>
                              </div>
                              <i style={`--progress: ${card.progress};`}></i>
                              <div class="customizable-mini-card-foot">
                                <span>{card.started}</span>
                                <em>{card.progress}</em>
                              </div>
                            </div>
                          </Item>
                        {/each}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("nested")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Nested</span>
                          <i></i>
                        </div>
                      {/if}
                      <Container
                        className="customizable-mini-nested"
                        config={{
                          direction: "column",
                          groupID: `customizable-${theme.id}-nested`,
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                      >
                        {#each customizableMockupNested.parent as row (row.label)}
                          <Item>
                            <div class="customizable-mini-row">
                              <Handle className="customizable-mini-handle">
                                <span class="customizable-mini-grip" aria-hidden="true">
                                  <i></i><i></i><i></i><i></i>
                                </span>
                              </Handle>
                              <span class="customizable-mini-row-main">
                                <span class="customizable-mini-row-text">{row.label}</span>
                                <span class="customizable-mini-row-sub">Parent block</span>
                              </span>
                              <span class="customizable-mini-meta">{row.meta}</span>
                            </div>
                          </Item>
                        {/each}
                        <Container
                          className="customizable-mini-nested-child"
                          config={{
                            direction: "column",
                            groupID: `customizable-${theme.id}-nested`,
                            ...getCustomizableThemeConfig(theme.id),
                          }}
                        >
                          {#each customizableMockupNested.child as row (row.label)}
                            <Item>
                              <div class="customizable-mini-row nested">
                                <Handle className="customizable-mini-handle">
                                  <span class="customizable-mini-grip" aria-hidden="true">
                                    <i></i><i></i><i></i><i></i>
                                  </span>
                                </Handle>
                                <span class="customizable-mini-row-main">
                                  <span class="customizable-mini-row-text">{row.label}</span>
                                  <span class="customizable-mini-row-sub">Nested item</span>
                                </span>
                                <span class="customizable-mini-meta">{row.meta}</span>
                              </div>
                            </Item>
                          {/each}
                        </Container>
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("editor")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Editor</span>
                          <i></i>
                        </div>
                      {/if}
                      <div class="customizable-mini-editor-canvas">
                        <Container
                          className="customizable-mini-editor"
                          config={{
                            direction: "column",
                            groupID: `customizable-${theme.id}-editor`,
                            ...getCustomizableThemeConfig(theme.id),
                          }}
                        >
                          {#each customizableMockupFields as field (field.label)}
                            <Item>
                              <div class="customizable-mini-field">
                                <Handle className="customizable-mini-field-handle">
                                  <span class="customizable-mini-grip" aria-hidden="true">
                                    <i></i><i></i><i></i><i></i>
                                  </span>
                                </Handle>
                                <div class="customizable-mini-field-main">
                                  <div class="customizable-mini-question-input">
                                    <strong>{field.label}</strong>
                                    <span>{field.type === "radio" ? "Multiple choice" : "Checkboxes"}</span>
                                  </div>
                                  <SnapSortContextBoundary>
                                    <ContainerProgressive
                                      className="customizable-mini-options"
                                      config={{
                                        direction: "column",
                                        groupID: `customizable-${theme.id}-editor-${field.label}`,
                                        ...getCustomizableThemeConfig(theme.id),
                                      }}
                                    >
                                      {#each field.options as option (option)}
                                        <ItemProgressive>
                                          <span class="customizable-mini-option" class:checkbox={field.type === "checkbox"}>
                                            <Handle className="customizable-mini-option-handle">
                                              <span class="customizable-mini-option-grip" aria-hidden="true"></span>
                                            </Handle>
                                            <i></i>
                                            <span>{option}</span>
                                            <button type="button" tabindex="-1" aria-label="Remove option">x</button>
                                          </span>
                                        </ItemProgressive>
                                      {/each}
                                    </ContainerProgressive>
                                  </SnapSortContextBoundary>
                                  <button class="customizable-mini-add-option" type="button" tabindex="-1">
                                    + Add option
                                  </button>
                                </div>
                              </div>
                            </Item>
                          {/each}
                        </Container>
                      </div>
                    </div>

                    <div
                      class="customizable-mockup-card"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("files")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Files</span>
                          <i></i>
                        </div>
                      {/if}
                      <ContainerInsertion
                        className="customizable-mini-files"
                        locked={true}
                        metadata={{
                          containerId: `customizable-${theme.id}-files-root`,
                          insertionDepth: 0,
                          insertionMarkerInsetLeft: 6,
                          insertionMarkerInsetRight: 6,
                        }}
                        config={{
                          direction: "column",
                          groupID: `customizable-${theme.id}-files`,
                          name: `customizable-${theme.id}-files-root`,
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                      >
                        {#each customizableMockupFiles as file (file.id)}
                          {#if file.kind === "folder"}
                            <ContainerInsertion
                              className={`customizable-mini-tree-folder depth-${file.depth}${file.active ? " active" : ""}`}
                              locked={false}
                              metadata={{
                                itemId: file.id,
                                containerId: file.id,
                                insertionDepth: file.depth + 1,
                                insertionMarkerInsetLeft: 6 + (file.depth + 1) * 9,
                                insertionMarkerInsetRight: 6,
                              }}
                              config={{
                                direction: "column",
                                groupID: `customizable-${theme.id}-files`,
                                name: `customizable-${theme.id}-files-${file.id}`,
                                ...getCustomizableThemeConfig(theme.id),
                              }}
                            >
                              <div
                                class="customizable-mini-tree-row folder"
                                style={`--depth: ${file.depth};`}
                              >
                                <span class="customizable-mini-indent" aria-hidden="true"></span>
                                <span class="customizable-mini-chevron open" aria-hidden="true"></span>
                                <span class="customizable-mini-tree-icon folder" aria-hidden="true"></span>
                                <strong>{file.label}</strong>
                              </div>
                            </ContainerInsertion>
                          {:else}
                            <ItemInsertion
                              className={`customizable-mini-tree-row file depth-${file.depth}${file.active ? " active" : ""}`}
                              metadata={{ itemId: file.id }}
                              style={`--depth: ${file.depth};`}
                            >
                              <span class="customizable-mini-indent" aria-hidden="true"></span>
                              <span class="customizable-mini-chevron-spacer" aria-hidden="true"></span>
                              <span class="customizable-mini-tree-icon file" aria-hidden="true"></span>
                              <strong>{file.label}</strong>
                            </ItemInsertion>
                          {/if}
                        {/each}
                      </ContainerInsertion>
                    </div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          </article>
          </div>

          <article class="feature-card">
            <div class="framework-icons" aria-label="JavaScript, React, and Svelte">
              <span class="framework-icon javascript-icon">JS</span>
              <span class="framework-icon react-icon" aria-hidden="true">⚛</span>
              <span class="framework-icon svelte-icon" aria-hidden="true">S</span>
            </div>
            <div>
              <h3>Framework Agnostic</h3>
              <p>
                The core library is pure TypeScript. Adapters are provided for popular
                frameworks, giving you freedom over the tech stack.
              </p>
            </div>
          </article>
        </div>
      </div>
    </div>
  </Engine>
</section>

<style lang="scss">
  @use "../../lib/landing/landing.scss";
  @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap");
  @import url("https://fonts.googleapis.com/css2?family=VT323&display=swap");

  #landing,
  .core-showcase {
    width: min(90%, 1200px);
  }

  #landing {
    background: var(--color-background-tint);
    border-radius: 16px;
    height: min(58vh, 620px);
    min-height: 460px;
  }

  #landing :global(.ghost) {
    background: transparent !important;
    border: 0 !important;
    box-shadow: none !important;
    opacity: 0 !important;
  }

  :global(#snap-canvas) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  .hero-section {
    --hero-frame-width: min(100%, 660px);
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: transparent;
    -webkit-user-select: none;
    user-select: none;

    * {
      -webkit-user-select: none;
      user-select: none;
    }
  }

  .hero-frame {
    position: relative;
    width: var(--hero-frame-width);
    padding: 0;
    box-sizing: border-box;
  }

  .hero-slot {
    width: 100%;
    border-radius: calc(var(--size-16) + var(--size-4));
    padding: var(--size-4);
    background: color-mix(in srgb, var(--color-background-tint) 88%, #000);
    box-sizing: border-box;
    overflow: hidden;
  }

  :global(.hero-stack) {
    align-items: center;
    gap: var(--size-4);
    width: 100%;
  }

  :global(.hero-stack-item) {
    display: flex;
    align-items: stretch;
    justify-content: center;
    width: 100%;
    min-width: 0;
    min-height: clamp(4.25rem, 10vw, 7.5rem);
    padding: 0 !important;
    cursor: auto;
    touch-action: none;
  }

  :global(.hero-title-item) {
    min-height: clamp(7rem, 14vw, 11rem);
  }

  :global(.hero-copy-item) {
    min-height: clamp(5.25rem, 8vw, 7rem);
  }

  :global(.hero-cta-item) {
    min-height: clamp(4rem, 8vw, 6.5rem);
  }

  .hero-row {
    --card-color: var(--color-background-tint);
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: inherit;
    padding: clamp(0.85rem, 1.8vw, 1.25rem) clamp(3rem, 6vw, 4.5rem);
    box-sizing: border-box;
  }

  :global(.hero-row-handle) {
    position: absolute;
    left: clamp(1.1rem, 2.2vw, 1.75rem);
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    transform: translateY(-50%);
    cursor: grab;
    touch-action: none;
  }

  :global(.hero-row-handle:active) {
    cursor: grabbing;
  }

  .hero-row-grip,
  .letter-grip {
    display: grid;
    grid-template-columns: repeat(2, 0.28rem);
    grid-template-rows: repeat(3, 0.28rem);
    gap: 0.28rem;
  }

  .hero-row-grip i,
  .letter-grip-dot {
    display: block;
    width: 0.28rem;
    height: 0.28rem;
    border-radius: 50%;
    background: #9ca3a8;
  }

  .title-section {
    position: relative;
    width: fit-content;
    box-sizing: border-box;
    z-index: 1;
  }

  .title-section :global(.container) {
    filter: drop-shadow(2px 4px 6px rgba(58, 42, 34, 0.15));
    justify-content: center;
    width: auto;
  }

  .letter-shell {
    position: relative;
    z-index: 1;
    display: inline-block;
    padding: 0;
    margin: 0;
    line-height: 1;
    cursor: default;
    touch-action: none;
  }

  .letter-shell:active {
    cursor: default;
  }

  .title-text {
    font-size: clamp(3rem, 6vw, 5rem);
    line-height: 1;
  }

  .title-glyph {
    display: block;
    line-height: 1;
  }

  .letter-grip {
    position: absolute;
    grid-template-columns: repeat(3, 0.28rem);
    grid-template-rows: repeat(2, 0.28rem);
    top: calc(100% + 0.16em);
    left: 50%;
    transform: translateX(-50%);
    opacity: 0.62;
    cursor: grab;
  }

  .letter-grip:active,
  .letter-grip:active * {
    cursor: grabbing;
  }

  .hero-statement {
    max-width: 430px;
    margin: 0 auto;
    text-align: center;
  }

  .hero-cta {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: var(--size-12);
  }

  .hero-cta button {
    min-width: 9.5rem;
  }

  .core-showcase {
    margin: clamp(6rem, 11vw, 9rem) auto clamp(7rem, 11vw, 10rem);
  }

  .core-showcase-header {
    grid-column: 4 / span 6;
    width: 100%;
    margin: 0 auto clamp(2rem, 4vw, 3rem);
    text-align: center;
  }

  .core-showcase-header h2 {
    margin: 0 0 var(--size-16);
  }

  .core-showcase-header p {
    margin: 0 auto;
  }

  .core-showcase > :global(#snap-canvas) {
    grid-column: 1 / -1;
    width: 100%;
  }

  .core-demo-grid {
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: var(--size-24);
  }

  .core-demo-card {
    grid-column: span 4;
    display: flex;
    flex-direction: column;
    gap: var(--size-20);
    height: 400px;
    padding: var(--size-24);
    background: var(--color-background-tint);
    border-radius: 16px;
    box-sizing: border-box;
    user-select: none;
  }

  .core-demo-card h3 {
    margin: 0 0 var(--size-16);
  }

  .core-demo-surface {
    --card-color: var(--color-background);

    position: relative;
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .core-demo-surface::before,
  .core-demo-surface::after {
    pointer-events: none;
  }

  .sideways-demo-surface {
    flex: 0 0 auto;
    align-self: center;
    width: fit-content;
    min-height: auto;
    margin-block: auto;
    overflow: hidden;
  }

  .sideways-demo-surface :global(.sideways-list) {
    flex: 0 0 auto;
    width: max-content;
    min-height: auto;
  }

  .feature-card-section {
    grid-column: 1 / -1;
    margin-top: clamp(5rem, 8vw, 7rem);
  }

  .feature-card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-48);
  }

  .feature-card {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: var(--size-24);
    min-height: clamp(280px, 30vw, 380px);
    padding: var(--size-32);
    background: var(--color-background-tint);
    border: 0;
    border-radius: 16px;
    box-sizing: border-box;
  }

  .customizable-feature-card {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
    gap: 0;
    align-items: stretch;
  }

  .customizable-scroll-scene {
    grid-column: 1 / -1;
  }

  .feature-card-copy {
    max-width: 560px;
  }

  .customizable-feature-card .feature-card-copy {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto minmax(0, 1fr);
    align-self: stretch;
    padding-right: clamp(3rem, 6vw, 5rem);
    box-sizing: border-box;
  }

  .feature-card-copy-text {
    grid-row: 2;
  }

  .feature-card h3,
  .customizable-feature-card h3 {
    margin: 0 0 var(--size-16);
  }

  .feature-card p,
  .customizable-feature-card p {
    max-width: 520px;
    margin: 0;
  }

  .customizable-demo {
    position: relative;
    display: block;
    min-width: 0;
    height: 500px;
    min-height: 500px;
    padding: 0;
    --card-color: var(--color-background-tint);
    border-radius: 16px;
    box-shadow: none;
    overflow: hidden;
    -webkit-user-select: none;
    user-select: none;
  }

  .customizable-theme-rail {
    display: flex;
    width: 250%;
    height: 100%;
    transform: translateX(calc(var(--customizable-progress, 0) * -60%));
    transition: transform 80ms linear;
    will-change: transform;
  }

  .customizable-demo::before,
  .customizable-demo::after {
    border-radius: 16px;
    box-shadow: none;
  }

  .customizable-surface {
    --mockup-bg: rgba(255, 255, 255, 0.72);
    --mockup-border: rgba(0, 0, 0, 0.08);
    --mockup-text: #333637;
    --mockup-muted: #697074;
    --mockup-card: #ffffff;
    --mockup-chip: #ffffff;
    --mockup-accent: var(--color-primary);

    min-width: 0;
    min-height: 100%;
    flex: 0 0 25%;
    overflow: hidden;
    padding: 0.76rem 3rem;
    box-sizing: border-box;
  }

  .customizable-motion-frame {
    width: 100%;
    min-width: 0;
    transform: translateY(var(--theme-offset, 0px));
    transform-origin: top left;
    transition: transform 80ms linear;
    will-change: transform;
  }

  .customizable-demo span,
  .customizable-demo strong,
  .customizable-demo i,
  .customizable-demo em {
    margin: 0;
  }

  .customizable-surface[data-theme="default"] {
    background: var(--color-background-tint);
  }

  .customizable-surface[data-theme="retro"] {
    --retro-font: "VT323", "Geist Mono", monospace;
    --mockup-bg: lightgray;
    --mockup-border: #7d7d7d;
    --mockup-text: #111111;
    --mockup-muted: #2f2f2f;
    --mockup-card: lightgray;
    --mockup-chip: #e6e6e6;
    --mockup-accent: #000080;

    background: #008080;
  }

  .customizable-surface[data-theme="retro"] .customizable-motion-frame {
    filter: blur(0.22px);
  }

  .customizable-surface[data-theme="terminal"] {
    --mockup-bg: #222628;
    --mockup-border: #4c5a52;
    --mockup-text: #e8f7ef;
    --mockup-muted: #57f287;
    --mockup-card: #181a1d;
    --mockup-chip: #222628;
    --mockup-accent: #57f287;

    background: #181a1d;
  }

  .customizable-surface[data-theme="terminal"],
  .customizable-surface[data-theme="terminal"] *,
  .customizable-surface[data-theme="terminal"] :global(*) {
    border-radius: 0 !important;
    font-family: "Geist Mono", monospace !important;
    font-size: 0.82rem !important;
    font-weight: 500 !important;
    line-height: 1.1 !important;
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-row,
  .customizable-surface[data-theme="terminal"] .customizable-mini-row *,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card *,
  .customizable-surface[data-theme="terminal"] .customizable-mini-word,
  .customizable-surface[data-theme="terminal"] .customizable-mini-field,
  .customizable-surface[data-theme="terminal"] .customizable-mini-field *,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option *,
  .customizable-surface[data-theme="terminal"] .customizable-mini-tree-row,
  .customizable-surface[data-theme="terminal"] :global(.customizable-mini-tree-row),
  .customizable-surface[data-theme="terminal"] :global(.customizable-mini-tree-row *) {
    color: var(--mockup-text);
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-row-sub,
  .customizable-surface[data-theme="terminal"] .customizable-mini-meta,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card-foot span,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card-foot em,
  .customizable-surface[data-theme="terminal"] .customizable-mini-question-input span {
    color: var(--mockup-muted);
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-grip i {
    background: var(--mockup-text);
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-chevron::before,
  .customizable-surface[data-theme="terminal"] .customizable-mini-tree-icon.file::before {
    border-color: var(--mockup-muted);
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-tree-icon.file::after {
    background: var(--mockup-muted);
    box-shadow:
      0 0.12rem 0 var(--mockup-muted),
      0 0.24rem 0 var(--mockup-muted);
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-option button,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:hover,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:hover,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:focus,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:focus,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:focus-visible,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:focus-visible {
    min-height: 0;
    border: 1px solid var(--mockup-muted) !important;
    border-radius: 0 !important;
    outline: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--mockup-muted) !important;
    font-family: "Geist Mono", monospace !important;
    text-transform: lowercase;
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:hover,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:hover,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:focus-visible,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:focus-visible {
    background: rgba(87, 242, 135, 0.14) !important;
    color: var(--mockup-text) !important;
  }

  .customizable-surface[data-theme="terminal"] .customizable-mini-option button:active,
  .customizable-surface[data-theme="terminal"] .customizable-mini-add-option:active {
    border-color: var(--mockup-text) !important;
    background: var(--mockup-muted) !important;
    color: #181a1d !important;
    transform: none !important;
  }

  .customizable-surface[data-theme="elegant"] {
    --mockup-bg: #ebe6dc;
    --mockup-border: transparent;
    --mockup-text: #111111;
    --mockup-muted: #5c5146;
    --mockup-card: #ffffff;
    --mockup-chip: #f4f1ea;
    --mockup-accent: #214432;

    background: #f7f2ec;
    backdrop-filter: blur(14px);
  }

  .customizable-surface[data-theme="elegant"],
  .customizable-surface[data-theme="elegant"] *,
  .customizable-surface[data-theme="elegant"] :global(*) {
    font-family: "Inter", sans-serif;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mockup-title,
  .customizable-surface[data-theme="elegant"] .customizable-mini-row-text,
  .customizable-surface[data-theme="elegant"] .customizable-mini-card strong,
  .customizable-surface[data-theme="elegant"] .customizable-mini-question-input strong {
    color: #214432;
    font-family: "Playfair Display", serif;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-option span,
  .customizable-surface[data-theme="elegant"] .customizable-mini-tree-row strong,
  .customizable-surface[data-theme="elegant"] :global(.customizable-mini-tree-row strong) {
    color: var(--mockup-text);
  }

  .customizable-surface[data-theme="elegant"] :global([data-snapsort-ghost="insertion"]) {
    background: transparent !important;
    border-top: 3px solid var(--mockup-accent) !important;
    color: var(--mockup-accent) !important;
    box-shadow: none !important;
  }

  .customizable-mockup-shell {
    display: flex;
    flex-direction: column;
    gap: 4rem;
    height: 100%;
    min-width: 0;
    color: var(--mockup-text);
  }

  .customizable-mockup-title {
    color: var(--mockup-muted);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1;
    text-transform: uppercase;
  }

  .customizable-mockup-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
    padding: 0.75rem;
    box-sizing: border-box;
  }

  .customizable-surface:not([data-theme="default"]) .customizable-mockup-card {
    background: var(--mockup-bg);
    border: 1px solid var(--mockup-border);
    border-radius: 8px;
  }

  :global(.customizable-mini-list),
  :global(.customizable-mini-board),
  :global(.customizable-mini-nested),
  :global(.customizable-mini-nested-child),
  :global(.customizable-mini-editor),
  :global(.customizable-mini-files) {
    align-items: stretch;
    width: 100%;
    gap: 0.2rem !important;
  }

  :global(.customizable-mini-words) {
    align-content: flex-start;
    align-items: flex-start;
    flex-wrap: wrap;
    width: 100%;
    gap: 0.2rem !important;
  }

  :global(.customizable-mini-options) {
    align-items: stretch;
    width: 100%;
    gap: 0.28rem !important;
  }

  :global(.customizable-mini-list > .snapsort-item),
  :global(.customizable-mini-board > .snapsort-item),
  :global(.customizable-mini-words > .snapsort-item),
  :global(.customizable-mini-nested > .snapsort-item),
  :global(.customizable-mini-nested-child > .snapsort-item),
  :global(.customizable-mini-editor > .snapsort-item),
  :global(.customizable-mini-options > .snapsort-item),
  :global(.customizable-mini-files > .snapsort-item) {
    align-items: stretch;
    padding: 0;
  }

  :global(.customizable-mini-options > .snapsort-item) {
    width: 100%;
  }

  :global(.customizable-mini-list > .snapsort-item),
  :global(.customizable-mini-board > .snapsort-item),
  :global(.customizable-mini-nested > .snapsort-item),
  :global(.customizable-mini-nested-child > .snapsort-item),
  :global(.customizable-mini-editor > .snapsort-item),
  :global(.customizable-mini-files > .snapsort-item) {
    width: 100%;
  }

  .customizable-surface[data-theme="default"] :global(.ghost) {
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    border: 1px dashed color-mix(in srgb, var(--color-primary) 72%, transparent);
    border-radius: 6px;
    box-shadow: none;
    box-sizing: border-box;
  }

  .customizable-surface[data-theme="default"] :global([data-snapsort-ghost="insertion"]) {
    background: transparent !important;
    border-top-color: var(--mockup-accent) !important;
    color: var(--mockup-accent) !important;
  }

  .customizable-surface[data-theme="retro"] :global(.ghost) {
    background: transparent !important;
    border: 0 !important;
    border-radius: 0 !important;
    outline: 2px dashed #111111;
    outline-offset: -2px;
    box-shadow: none !important;
    box-sizing: border-box;
  }

  .customizable-surface[data-theme="retro"] :global([data-snapsort-ghost="insertion"]) {
    background: transparent !important;
    border-top: 2px dashed var(--mockup-accent) !important;
    border-radius: 0 !important;
    color: var(--mockup-accent) !important;
    box-shadow: none !important;
  }

  @keyframes terminal-ghost-stripes {
    from {
      background-position: 0 0;
    }

    to {
      background-position: 0.64rem 0;
    }
  }

  .customizable-surface[data-theme="terminal"] :global(.ghost) {
    background-color: rgba(24, 26, 29, 0.86) !important;
    background-image:
      linear-gradient(
        135deg,
        rgba(87, 242, 135, 0.34) 0 25%,
        transparent 25% 50%,
        rgba(87, 242, 135, 0.34) 50% 75%,
        transparent 75% 100%
      ) !important;
    background-size: 0.64rem 0.64rem !important;
    border: 1px solid var(--mockup-muted) !important;
    box-shadow:
      inset 0 0 0 1px rgba(232, 247, 239, 0.16),
      0 0 0.42rem rgba(87, 242, 135, 0.18) !important;
    box-sizing: border-box;
    animation: terminal-ghost-stripes 460ms linear infinite;
  }

  .customizable-surface[data-theme="terminal"] :global([data-snapsort-ghost="insertion"]) {
    height: 0.42rem !important;
    background-color: rgba(24, 26, 29, 0.86) !important;
    background-image:
      linear-gradient(
        135deg,
        rgba(87, 242, 135, 0.46) 0 25%,
        transparent 25% 50%,
        rgba(87, 242, 135, 0.46) 50% 75%,
        transparent 75% 100%
      ) !important;
    background-size: 0.56rem 0.56rem !important;
    border: 1px solid var(--mockup-accent) !important;
    color: var(--mockup-accent) !important;
    box-shadow: 0 0 0.42rem color-mix(in srgb, var(--mockup-accent) 22%, transparent) !important;
    animation: terminal-ghost-stripes 460ms linear infinite;
  }

  :global(.customizable-mini-nested-child) {
    width: calc(100% - 0.75rem);
    margin-left: 0.75rem;
    padding-left: 0.4rem;
    border-left: 1px solid var(--mockup-border);
    box-sizing: border-box;
  }

  :global(.customizable-mini-nested) .customizable-mini-row-main,
  :global(.customizable-mini-nested-child) .customizable-mini-row-main {
    gap: 0.24rem;
  }

  .customizable-mini-row,
  .customizable-mini-card,
  .customizable-mini-word,
  .customizable-mini-field,
  .customizable-mini-option {
    background: var(--mockup-card);
    border: 1px solid var(--mockup-border);
    box-sizing: border-box;
    color: var(--mockup-text);
    cursor: grab;
    touch-action: none;
  }

  .customizable-mini-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.28rem;
    min-height: 1.72rem;
    padding: 0.5rem 0.65rem 0.42rem;
    border-radius: 4px;
    font-family: "Geist", sans-serif;
    font-size: 0.9rem;
    line-height: 1;
  }

  .customizable-mini-row-main {
    display: grid;
    gap: 0.12rem;
    min-width: 0;
    color: inherit;
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
  }

  .customizable-mini-row-text {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: inherit;
    font-weight: 500;
    line-height: inherit;
  }

  .customizable-mini-row-sub {
    display: block;
    min-width: 0;
    overflow: hidden;
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.55rem;
    line-height: 1;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  :global(.customizable-mini-handle),
  :global(.customizable-mini-option-handle) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 0.68rem;
    color: currentColor;
    cursor: grab;
    touch-action: none;
  }

  .customizable-mini-handle.task {
    position: absolute;
    top: 50%;
    left: 0.36rem;
    transform: translateY(-50%);
    min-width: 1.35rem;
    color: var(--mockup-text);
  }

  .customizable-mini-grip {
    display: grid;
    grid-template-columns: repeat(2, 0.12rem);
    grid-template-rows: repeat(2, 0.12rem);
    gap: 0.1rem;
    opacity: 0.55;
  }

  .customizable-mini-grip i {
    display: block;
    width: 0.12rem;
    height: 0.12rem;
    border-radius: 50%;
    background: currentColor;
  }

  .customizable-mini-handle.task .customizable-mini-grip {
    grid-template-columns: repeat(2, 0.18rem);
    grid-template-rows: repeat(2, 0.18rem);
    gap: 0.14rem;
    opacity: 0.85;
  }

  .customizable-mini-handle.task .customizable-mini-grip i {
    width: 0.18rem;
    height: 0.18rem;
  }

  .customizable-mini-meta {
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.65rem;
    font-weight: 700;
    line-height: 1;
  }

  .customizable-mini-row.nested {
    background: var(--mockup-chip);
    padding-left: 2rem;
  }

  .customizable-mini-word {
    display: inline-flex;
    padding: 0.22rem 0.32rem 0.14rem;
    border-radius: 999px;
    background: var(--mockup-chip);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.8rem;
    line-height: 1;
    text-transform: uppercase;
  }

  .customizable-mini-editor-canvas {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  .customizable-mini-field {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: stretch;
    gap: 0.58rem;
    min-height: 2.72rem;
    padding: 0.7rem;
    border-radius: 6px;
  }

  .customizable-mini-card-head {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.28rem;
    min-width: 0;
  }

  .customizable-mini-field-main {
    display: grid;
    gap: 0.56rem;
    min-width: 0;
  }

  :global(.customizable-mini-field-handle) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.45rem;
    min-width: 1.45rem;
    border: 1px solid var(--mockup-border);
    border-radius: 6px;
    background: var(--mockup-bg);
    color: var(--mockup-muted);
    cursor: grab;
    touch-action: none;
  }

  .customizable-mini-question-input {
    display: grid;
    gap: 0.2rem;
    width: 100%;
    min-width: 0;
    padding: 0.54rem 0.72rem;
    background: var(--mockup-card);
    border: 1px solid var(--mockup-border);
    border-radius: 6px;
    box-sizing: border-box;
  }

  .customizable-mini-question-input strong {
    min-width: 0;
    overflow: hidden;
    color: inherit;
    font-family: "Geist", sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customizable-mini-question-input span {
    min-width: 0;
    overflow: hidden;
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.54rem;
    font-weight: 600;
    line-height: 1;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .customizable-mini-option {
    display: inline-grid;
    grid-template-columns: auto auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.16rem;
    width: 100%;
    min-width: 0;
    padding: 0.16rem 0.24rem 0.12rem;
    border-radius: 6px;
    background: var(--mockup-chip);
    font-family: "Geist Mono", monospace;
    font-size: 0.7rem;
    line-height: 1;
  }

  .customizable-mini-option i {
    display: block;
    width: 0.4rem;
    height: 0.4rem;
    border: 1px solid currentColor;
    border-radius: 50%;
    box-sizing: border-box;
    opacity: 0.65;
  }

  .customizable-mini-option.checkbox i {
    border-radius: 2px;
  }

  .customizable-mini-option-grip {
    display: block;
    width: 0.12rem;
    height: 0.68rem;
    background-image: radial-gradient(currentColor 1px, transparent 1px);
    background-size: 0.12rem 0.24rem;
    opacity: 0.45;
  }

  .customizable-mini-option span {
    min-width: 0;
    overflow: hidden;
    font-size: inherit;
    line-height: inherit;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customizable-mini-option button {
    display: inline-flex;
    width: 0.68rem;
    height: 0.68rem;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: transparent;
    box-shadow: none;
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.7rem;
    line-height: 1;
  }

  .customizable-mini-add-option {
    justify-self: start;
    min-height: 0;
    padding: 0.16rem 0.24rem;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    color: var(--mockup-muted);
    font-family: "Geist", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1;
  }

  :global(.customizable-mini-files) {
    display: flex;
    flex-direction: column;
    gap: 0 !important;
    padding: 0;
  }

  :global(.customizable-mini-tree-folder) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    background: transparent;
  }

  .customizable-mini-tree-row,
  :global(.customizable-mini-tree-row) {
    --indent-size: 0.96rem;
    position: relative;
    display: grid !important;
    grid-template-columns: 0.6rem 0.68rem minmax(0, 1fr);
    align-items: center !important;
    min-height: 1.24rem;
    width: 100%;
    margin: 0 !important;
    padding: 0.16rem 0.44rem 0.12rem calc(0.4rem + (var(--depth, 0) * var(--indent-size)));
    border: 1px solid transparent;
    border-radius: 0;
    box-sizing: border-box;
    background: transparent;
    color: var(--mockup-text);
    cursor: grab;
    font-family: "Geist Mono", monospace;
    font-size: 0.68rem;
    font-weight: 500;
    line-height: 1;
    touch-action: none;
  }

  :global(.customizable-mini-tree-row.active) {
    background: color-mix(in srgb, var(--mockup-muted) 16%, transparent);
  }

  .customizable-mini-indent {
    position: absolute;
    top: 0;
    bottom: 0;
    left: calc(0.68rem + ((var(--depth, 0) - 1) * var(--indent-size)));
    width: 1px;
    background: var(--mockup-border);
    opacity: min(var(--depth, 0), 1);
  }

  .customizable-mini-chevron,
  .customizable-mini-chevron-spacer {
    position: relative;
    width: 0.6rem;
    height: 0.6rem;
  }

  .customizable-mini-chevron::before {
    content: "";
    position: absolute;
    top: 0.16rem;
    left: 0.16rem;
    width: 0.26rem;
    height: 0.26rem;
    border-right: 1px solid currentColor;
    border-bottom: 1px solid currentColor;
    transform: rotate(45deg);
  }

  .customizable-mini-tree-icon {
    position: relative;
    width: 0.64rem;
    height: 0.64rem;
  }

  .customizable-mini-tree-icon.folder::before {
    content: "";
    position: absolute;
    left: 0.04rem;
    top: 0.26rem;
    width: 0.6rem;
    height: 0.36rem;
    border-radius: 1px;
    background: #d99a22;
  }

  .customizable-mini-tree-icon.folder::after {
    content: "";
    position: absolute;
    left: 0.1rem;
    top: 0.12rem;
    width: 0.32rem;
    height: 0.2rem;
    border-radius: 1px 1px 0 0;
    background: #e5b24a;
  }

  .customizable-mini-tree-icon.file::before {
    content: "";
    position: absolute;
    left: 0.12rem;
    top: 0.02rem;
    width: 0.44rem;
    height: 0.6rem;
    border: 1px solid var(--mockup-muted);
    border-radius: 1px;
    background: var(--mockup-card);
    box-sizing: border-box;
  }

  .customizable-mini-tree-icon.file::after {
    content: "";
    position: absolute;
    left: 0.22rem;
    top: 0.2rem;
    width: 0.24rem;
    height: 1px;
    background: var(--mockup-muted);
    box-shadow:
      0 0.12rem 0 var(--mockup-muted),
      0 0.24rem 0 var(--mockup-muted);
  }

  .customizable-mini-tree-row strong,
  :global(.customizable-mini-tree-row strong) {
    min-width: 0;
    overflow: hidden;
    color: inherit;
    font: inherit;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customizable-mini-card {
    --task-content-offset: 1.86rem;
    position: relative;
    display: grid;
    gap: 0.26rem;
    min-height: 2.84rem;
    padding: 0.36rem;
    border-radius: 6px;
  }

  .customizable-mini-card-head {
    grid-template-columns: minmax(0, 1fr) auto;
    padding-left: var(--task-content-offset);
  }

  .customizable-mini-card-head strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .customizable-mini-card strong {
    color: inherit;
    font-family: "Geist", sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.1;
  }

  .customizable-mini-card-head span {
    padding: 0.14rem 0.24rem 0.1rem;
    border-radius: 999px;
    background: var(--mockup-chip);
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.55rem;
    font-weight: 700;
    line-height: 1;
  }

  .customizable-mini-card > i {
    display: block;
    width: calc(100% - var(--task-content-offset));
    margin-left: var(--task-content-offset);
    height: 0.28rem;
    border-radius: 999px;
    background:
      linear-gradient(var(--mockup-muted), var(--mockup-muted)) 0 0 / var(--progress, 58%) 100% no-repeat,
      color-mix(in srgb, var(--mockup-muted) 20%, transparent);
    opacity: 0.58;
  }

  .customizable-surface[data-theme="default"] .customizable-mini-card > i {
    background:
      linear-gradient(var(--color-primary), var(--color-primary)) 0 0 / var(--progress, 58%) 100% no-repeat,
      color-mix(in srgb, var(--color-primary) 24%, transparent);
    opacity: 1;
  }

  .customizable-mini-card-foot {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    margin-left: var(--task-content-offset);
  }

  .customizable-mini-card-foot span {
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.6rem;
    font-weight: 600;
    line-height: 1;
  }

  .customizable-mini-card-foot em {
    margin-left: auto;
    color: var(--mockup-muted);
    font-family: "Geist Mono", monospace;
    font-size: 0.6rem;
    font-style: normal;
    font-weight: 700;
    line-height: 1;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-row,
  .customizable-surface[data-theme="retro"] .customizable-mini-card,
  .customizable-surface[data-theme="retro"] .customizable-mini-word,
  .customizable-surface[data-theme="retro"] .customizable-mini-field,
  .customizable-surface[data-theme="retro"] .customizable-mini-option,
  .customizable-surface[data-theme="retro"] .customizable-mockup-card {
    border-style: outset;
    border-width: 2px;
    border-color: #f0f0f0 #404040 #404040 #f0f0f0;
    border-radius: 0;
    box-shadow: 2px 2px 0 0 #042d27ba;
    font-family: "Geist Mono", monospace;
  }

  .customizable-surface[data-theme="retro"] .customizable-mockup-card {
    padding: 0;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-row,
  .customizable-surface[data-theme="retro"] .customizable-mini-card,
  .customizable-surface[data-theme="retro"] .customizable-mini-word,
  .customizable-surface[data-theme="retro"] .customizable-mini-option {
    box-shadow: none;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-editor-canvas,
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-list),
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-words),
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-board),
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-nested),
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-files) {
    margin: 0.75rem;
    width: auto !important;
    max-width: calc(100% - 1.5rem);
    box-sizing: border-box;
  }

  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-list),
  .customizable-surface[data-theme="retro"] .customizable-mockup-card > :global(.customizable-mini-nested) {
    overflow: hidden;
  }

  .customizable-retro-window-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
    min-height: 1.45rem;
    margin: 0;
    padding: 0.16rem 0.22rem 0.12rem 0.38rem;
    background: #000080;
    color: #ffffff;
    box-sizing: border-box;
  }

  .customizable-retro-window-bar span {
    min-width: 0;
    overflow: hidden;
    color: inherit;
    font-family: "Press Start 2P", "Geist Mono", monospace;
    font-size: 0.48rem;
    line-height: 1;
    text-overflow: ellipsis;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .customizable-retro-window-bar i {
    display: block;
    width: 0.78rem;
    height: 0.78rem;
    border-style: outset;
    border-width: 2px;
    border-color: #ffffff #404040 #404040 #ffffff;
    background: #c0c0c0;
    box-sizing: border-box;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-editor) {
    gap: 0.74rem !important;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-field {
    gap: 0.54rem;
    min-height: 3.1rem;
    padding: 0.58rem;
    background: #c0c0c0;
    border-style: outset;
    border-width: 2px;
    border-color: #ffffff #404040 #404040 #ffffff;
    box-shadow: none;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-field-handle) {
    width: 1.55rem;
    min-width: 1.55rem;
    border-style: outset;
    border-width: 2px;
    border-color: #ffffff #404040 #404040 #ffffff;
    border-radius: 0;
    background: #c0c0c0;
    color: #111111;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-field-handle:active),
  .customizable-surface[data-theme="retro"] .customizable-mini-add-option:active,
  .customizable-surface[data-theme="retro"] .customizable-mini-option button:active {
    border-style: inset;
    border-color: #404040 #ffffff #ffffff #404040;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-field-main {
    gap: 0.46rem;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-question-input {
    gap: 0.38rem;
    padding: 0.34rem;
    background: #ffffff;
    border-style: inset;
    border-width: 2px;
    border-color: #404040 #ffffff #ffffff #404040;
    border-radius: 0;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-question-input strong {
    color: #111111;
    font-family: "Geist Mono", monospace;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-question-input span {
    justify-self: start;
    max-width: 100%;
    padding: 0.14rem 1.25rem 0.12rem 0.24rem;
    background:
      linear-gradient(135deg, transparent 45%, #111111 47% 53%, transparent 55%) calc(100% - 0.42rem) 50% / 0.34rem 0.34rem no-repeat,
      #c0c0c0;
    border-style: outset;
    border-width: 2px;
    border-color: #ffffff #404040 #404040 #ffffff;
    color: #111111;
    font-family: "Geist Mono", monospace;
    font-size: 0.5rem;
    font-weight: 700;
    text-transform: none;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-options) {
    gap: 0 !important;
    padding: 0.16rem;
    background: #ffffff;
    border-style: inset;
    border-width: 2px;
    border-color: #404040 #f0f0f0 #f0f0f0 #404040;
    box-sizing: border-box;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option {
    padding: 0.22rem 0.28rem 0.18rem;
    background: transparent;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    color: #111111;
    font-size: 0.62rem;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option i {
    width: 0.46rem;
    height: 0.46rem;
    border: 1px solid #111111;
    background: #ffffff;
    opacity: 1;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option.checkbox i {
    border-radius: 0;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option-grip {
    width: 0.28rem;
    height: 0.82rem;
    background-image:
      linear-gradient(#ffffff, #ffffff),
      linear-gradient(#404040, #404040);
    background-position:
      0.08rem 0,
      0.16rem 0;
    background-size:
      1px 100%,
      1px 100%;
    background-repeat: no-repeat;
    opacity: 1;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option button,
  .customizable-surface[data-theme="retro"] .customizable-mini-add-option {
    border-style: outset !important;
    border-width: 2px !important;
    border-color: #ffffff #404040 #404040 #ffffff !important;
    border-radius: 0;
    background: #c0c0c0 !important;
    color: #111111;
    font-family: "Geist Mono", monospace;
    font-weight: 700;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-option button {
    width: 0.92rem;
    height: 0.92rem;
    font-size: 0.62rem;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-add-option {
    padding: 0.22rem 0.42rem 0.18rem;
    font-size: 0.56rem;
    text-transform: none;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-files) {
    gap: 0.06rem !important;
    padding: 0.22rem;
    background: #ffffff;
    border-style: inset;
    border-width: 2px;
    border-color: #404040 #f0f0f0 #f0f0f0 #404040;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-tree-row,
  .customizable-surface[data-theme="retro"] :global(.customizable-mini-tree-row) {
    grid-template-columns: 0.58rem 1.08rem minmax(0, 1fr);
    min-height: 1.48rem;
    padding-top: 0.16rem;
    padding-bottom: 0.14rem;
    background: transparent;
    border: 0;
    color: #111111;
  }

  .customizable-surface[data-theme="retro"] :global(.customizable-mini-tree-row.active) {
    background: #000080;
    color: #ffffff;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-indent {
    display: none;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-tree-icon {
    width: 1rem;
    height: 1rem;
    background-position: center;
    background-repeat: no-repeat;
    background-size: contain;
    image-rendering: pixelated;
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-tree-icon.folder {
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Windows_95_FOLDER.png/40px-Windows_95_FOLDER.png");
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-tree-icon.file {
    background-image: url("https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Windows_95_Text_field_sheet.png/40px-Windows_95_Text_field_sheet.png");
  }

  .customizable-surface[data-theme="retro"] .customizable-mini-tree-icon::before,
  .customizable-surface[data-theme="retro"] .customizable-mini-tree-icon::after {
    display: none;
  }

  .customizable-surface[data-theme="retro"],
  .customizable-surface[data-theme="retro"] *,
  .customizable-surface[data-theme="retro"] :global(*) {
    font-family: var(--retro-font) !important;
  }

  .customizable-surface[data-theme="terminal"] .customizable-mockup-title,
  .customizable-surface[data-theme="terminal"] .customizable-mini-row,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card strong,
  .customizable-surface[data-theme="terminal"] .customizable-mini-card em,
  .customizable-surface[data-theme="terminal"] .customizable-mini-word,
  .customizable-surface[data-theme="terminal"] .customizable-mini-field strong,
  .customizable-surface[data-theme="terminal"] .customizable-mini-option,
  .customizable-surface[data-theme="terminal"] .customizable-mini-tree-row,
  .customizable-surface[data-theme="terminal"] :global(.customizable-mini-tree-row) {
    font-family: "Geist Mono", monospace;
    text-transform: lowercase;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mockup-card {
    border: 0;
    border-radius: 32px;
    padding: 1rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-row,
  .customizable-surface[data-theme="elegant"] .customizable-mini-card,
  .customizable-surface[data-theme="elegant"] .customizable-mini-field {
    border: 0;
    border-radius: 20px;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-card {
    --task-content-offset: 2.35rem;
    gap: 0.52rem;
    min-height: 4.15rem;
    padding: 0.82rem 0.9rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-handle.task {
    left: 0.72rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-card-head {
    gap: 0.5rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-card-head span {
    padding: 0.2rem 0.44rem 0.16rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-card > i {
    height: 0.36rem;
    background:
      linear-gradient(#214432, #214432) 0 0 / var(--progress, 58%) 100% no-repeat,
      rgba(33, 68, 50, 0.16);
    opacity: 1;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-card-foot {
    gap: 0.34rem;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-row.nested {
    background: #ffffff;
  }

  .customizable-surface[data-theme="elegant"] :global(.customizable-mini-nested-child) {
    border-left: 0;
  }

  .customizable-surface[data-theme="elegant"] .customizable-mini-word,
  .customizable-surface[data-theme="elegant"] .customizable-mini-option,
  .customizable-surface[data-theme="elegant"] .customizable-mini-question-input {
    border: 0;
    border-radius: 16px;
  }

  .customizable-surface[data-theme="elegant"] :global(.customizable-mini-field-handle) {
    border: 0;
    border-radius: 16px;
  }

  .framework-icons {
    display: flex;
    align-items: center;
    gap: clamp(1.5rem, 3vw, 2.5rem);
    margin-bottom: clamp(3.5rem, 8vw, 5rem);
  }

  .framework-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: clamp(3.25rem, 5vw, 4.5rem);
    height: clamp(3.25rem, 5vw, 4.5rem);
    margin: 0;
    font-family: "Geist", sans-serif;
    font-size: clamp(2.1rem, 3.6vw, 3rem);
    font-weight: 800;
    line-height: 1;
  }

  .javascript-icon {
    align-items: flex-end;
    justify-content: flex-end;
    padding: 0 0.2rem 0.18rem 0;
    background: #f6df3f;
    color: #24262c;
    box-sizing: border-box;
  }

  .react-icon {
    color: #61dafb;
    font-size: clamp(4.1rem, 6.8vw, 5.9rem);
    font-weight: 400;
  }

  .svelte-icon {
    color: #ff3e00;
    font-size: clamp(3rem, 5vw, 4.3rem);
    font-weight: 900;
  }

  .core-demo-card :global(.snapsort-container) {
    gap: 0.35rem;
  }

  .core-demo-card :global(.snapsort-item) {
    align-items: stretch;
    padding: 0;
  }

  .core-demo-card :global(.ghost) {
    background: rgba(255, 138, 0, 0.14);
    border: 1px dashed rgba(255, 138, 0, 0.6);
    border-radius: 6px;
    box-sizing: border-box;
  }

  :global(.basic-list),
  :global(.sideways-list),
  :global(.multi-row-list),
  :global(.multi-container-board) {
    flex: 1;
    min-height: 0;
  }

  :global(.basic-list),
  :global(.insertion-list) {
    align-content: flex-start;
  }

  :global(.sortable-list) {
    align-items: stretch;
    width: 100%;
  }

  :global(.sortable-list > .snapsort-item) {
    width: 100%;
  }

  :global(.basic-list > .snapsort-item),
  :global(.nested-list > .snapsort-item),
  :global(.insertion-list > .snapsort-item) {
    align-items: stretch;
    width: 100%;
  }

  :global(.bounded-demo-list) {
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :global(.bounded-demo-list > .snapsort-item) {
    align-items: stretch;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :global(.bounded-demo-list .basic-row),
  :global(.bounded-demo-list .ghost) {
    max-width: 100% !important;
    min-width: 0;
    box-sizing: border-box;
  }

  .card-content {
    justify-content: center;
    background: transparent;
    border: 0;
    text-align: center;
  }

  .basic-row,
  .basic-token {
    display: inline-flex;
    align-items: center;
    gap: 0.65rem;
    min-height: 1.9rem;
    padding: 0.42rem 0.65rem 0.24rem;
    background: #ffffff;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 6px;
    box-sizing: border-box;
    color: #333637;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 1rem;
    font-weight: 400;
    line-height: 1;
    text-transform: none;
    white-space: nowrap;
    -webkit-user-select: none;
    user-select: none;
    cursor: grab;
    touch-action: none;
  }

  .basic-row:active,
  .basic-token:active {
    cursor: grabbing;
  }

  .basic-row span,
  .basic-token span {
    font-family: inherit;
    font-size: inherit;
    font-weight: inherit;
    line-height: inherit;
    text-transform: inherit;
  }

  .basic-row {
    width: 100%;
  }

  .handle-row {
    grid-template-columns: auto minmax(0, 1fr);
    justify-content: flex-start;
  }

  :global(.demo-row-handle),
  :global(.demo-container-handle) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #8f9497;
    cursor: grab;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  :global(.demo-row-handle) {
    flex: 0 0 auto;
    width: 1.05rem;
    height: 1.05rem;
  }

  :global(.demo-container-handle) {
    position: absolute;
    top: var(--size-12);
    bottom: var(--size-12);
    left: var(--size-12);
    z-index: 2;
    width: 1.35rem;
    min-height: 0;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-background-tint) 72%, #000 4%);
  }

  :global(.demo-row-handle:active),
  :global(.demo-container-handle:active) {
    cursor: grabbing;
  }

  .demo-grip {
    display: grid;
    grid-template-columns: repeat(2, 0.18rem);
    grid-template-rows: repeat(2, 0.18rem);
    gap: 0.18rem;
  }

  .demo-grip i {
    width: 0.18rem;
    height: 0.18rem;
    border-radius: 50%;
    background: currentColor;
  }

  .compact-row {
    min-height: 1.65rem;
    padding: 0.34rem 0.55rem 0.18rem;
    font-size: 0.82rem;
  }

  .multi-container-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    width: 100%;
    gap: 0.45rem;
  }

  .multi-container-row span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .column-move-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    min-width: 1.35rem;
    height: 1.35rem;
    min-height: 1.35rem;
    padding: 0;
    border: 1px solid rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    background: var(--color-background-tint);
    color: #333637;
    box-shadow: none;
    font-family: "Geist Mono", monospace;
    font-size: 0.8rem;
    line-height: 1;
    cursor: pointer;
    pointer-events: auto;
    touch-action: manipulation;
  }

  .column-move-button:hover {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.18);
  }

  :global(.sideways-list) {
    align-items: center !important;
    justify-content: center;
    align-content: center;
    width: 100%;
    gap: 0.35rem;
    transform-origin: center;
    transition:
      gap 260ms ease,
      transform 320ms ease 260ms;
  }

  :global(.sideways-list.solved) {
    gap: 0 !important;
    transform: scale(1.18);
  }

  :global(.sideways-list > .snapsort-item) {
    margin-inline: 0.04rem;
    transition: margin 260ms ease;
  }

  :global(.sideways-list.solved > .snapsort-item) {
    margin-inline: 0;
    pointer-events: none;
    touch-action: auto;
  }

  .logo-slice {
    width: 30px;
    height: 180px;
    background-image: url("/typescript.svg");
    background-position: var(--slice-x) 0;
    background-repeat: no-repeat;
    background-size: 180px 180px;
    border-radius: 4px;
    box-shadow: 0 2px 0 rgba(35, 37, 38, 0.12);
    cursor: grab;
    touch-action: none;
    transition:
      border-radius 260ms ease,
      box-shadow 260ms ease;
  }

  .logo-slice:active {
    cursor: grabbing;
  }

  :global(.sideways-list.solved) .logo-slice {
    border-radius: 0;
    box-shadow: none;
  }

  .basic-token {
    border-radius: 999px;
  }

  :global(.nested-list) {
    width: calc(100% - 2rem);
    max-width: calc(100% - 2rem);
    margin-left: 2rem;
    padding: var(--size-12);
    padding-left: calc(var(--size-12) + 1.85rem);
    box-sizing: border-box;
  }

  :global(.nested-list.card) {
    --card-radius: 12px;
  }

  .nested-row {
    background: #fbfbfb;
  }

  :global(.nested-insertion-list) {
    gap: 0.35rem;
    min-height: 2.2rem;
  }

  :global(.insertion-list [data-snapsort-ghost="insertion"]) {
    height: 3px !important;
    min-height: 3px !important;
    padding: 0 !important;
    color: var(--color-primary) !important;
    background: var(--color-primary) !important;
    border-top-color: var(--color-primary) !important;
    border-radius: 999px;
  }

  :global(.multi-row-list) {
    align-content: flex-start;
    align-items: flex-start;
    row-gap: 0.75rem !important;
    column-gap: 0.35rem !important;
    padding: 0.15rem 0 0.35rem;
    background-image: repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent 28px,
      rgba(105, 112, 116, 0.22) 28px,
      rgba(105, 112, 116, 0.22) 29px,
      transparent 29px,
      transparent 40px
    );
    background-position: 0 3px;
  }

  :global(.multi-row-list) .basic-token {
    min-height: 1.65rem;
    padding: 0.34rem 0.62rem 0.2rem;
    border-radius: 4px;
  }

  :global(.multi-container-board) {
    align-items: stretch;
  }

  :global(
    .multi-container-board
      > .basic-column:has(> .snapsort-item[data-snapsort-dragging="true"])
  ) {
    z-index: 2;
  }

  :global(.basic-column) {
    flex: 1 1 0;
    min-width: 0;
    padding: var(--size-12);
    --card-color: var(--color-background);
  }

  :global(.basic-column) h4 {
    margin: 0 0 var(--size-8);
    color: #697074;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  @media (max-width: 900px) {
    .core-showcase-header {
      grid-column: 1 / -1;
      max-width: 680px;
    }

    .core-demo-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .core-demo-card {
      grid-column: span 1;
    }

    .feature-card-grid {
      grid-template-columns: 1fr;
      gap: var(--size-24);
    }

    .feature-card {
      min-height: 280px;
    }

    .customizable-feature-card {
      grid-template-columns: 1fr;
      gap: var(--size-24);
    }

  }

  @media (max-width: 640px) {
    #landing {
      min-height: 420px;
    }

    .hero-section {
      padding: 0 1rem;
      box-sizing: border-box;
    }

    .hero-frame {
      width: 100%;
    }

    .title-text {
      font-size: 2.35rem;
    }

    .letter-grip {
      display: none;
    }

    .hero-cta button {
      min-width: 8.5rem;
    }

    .core-demo-grid {
      grid-template-columns: 1fr;
    }

    .feature-card {
      min-height: 260px;
      padding: var(--size-24);
    }

    .framework-icons {
      margin-bottom: var(--size-48);
    }
  }
</style>
