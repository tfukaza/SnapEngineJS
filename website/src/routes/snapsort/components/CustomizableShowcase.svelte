<script lang="ts">
  import { Container, Handle, Item } from "@snap-engine/snapsort-svelte";
  import type { ContainerConfig } from "@snap-engine/snapsort";
  import SnapSortContextBoundary from "../SnapSortContextBoundary.svelte";

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

  let customizableScrollScene: HTMLElement | undefined = $state();
  let customizableProgress = $state(0);

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

  const customizableMockupThemes: CustomizableMockupTheme[] = [
    { id: "retro", label: "Retro", demoOrder: ["editor", "list", "files", "words", "nested", "tasks"] },
    { id: "default", label: "SnapDesign", demoOrder: ["list", "words", "tasks", "nested", "editor", "files"] },
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
  // Heterogeneous: the nested child Container sits as a trailing sibling
  // among the parent's plain rows -- `entry` renders each position's
  // Item/Container itself. The same for every theme (the mockup data isn't
  // themed), so this is a plain constant, not a per-theme derivation.
  type NestedShowcaseEntry =
    | { kind: "row"; row: CustomizableMockupNestedItem }
    | { kind: "child-group" };
  const nestedShowcaseEntries: NestedShowcaseEntry[] = [
    ...customizableMockupNested.parent.map((row): NestedShowcaseEntry => ({ kind: "row", row })),
    { kind: "child-group" },
  ];
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
  const emptyMockupFiles: CustomizableMockupFile[] = [];

  type GalleryKanbanCard = {
    id: string;
    text: string;
    desc: string;
    avatar: string;
    avatarColor: string;
    due: string;
    tag: string;
  };

  type GalleryKanbanColumn = {
    id: string;
    title: string;
    cards: GalleryKanbanCard[];
  };

  const galleryKanban: GalleryKanbanColumn[] = [
    {
      id: "gk-todo",
      title: "To Do",
      cards: [
        {
          id: "gk-1",
          text: "Fix Bug #12",
          desc: "Fix the login issue on Safari browser.",
          avatar: "MC",
          avatarColor: "#0088ff",
          due: "Today",
          tag: "Bug",
        },
        {
          id: "gk-2",
          text: "Write Tests",
          desc: "Add unit tests for the new payment module.",
          avatar: "NK",
          avatarColor: "#8f3dff",
          due: "Jun 30",
          tag: "QA",
        },
      ],
    },
    {
      id: "gk-review",
      title: "Review",
      cards: [
        {
          id: "gk-3",
          text: "Code Review",
          desc: "Review the PR for the new feature.",
          avatar: "AP",
          avatarColor: "#ff7a00",
          due: "Jul 1",
          tag: "Dev",
        },
      ],
    },
    {
      id: "gk-done",
      title: "Done",
      cards: [
        {
          id: "gk-5",
          text: "Publish Docs",
          desc: "Update the release notes and component examples.",
          avatar: "ES",
          avatarColor: "#14a44d",
          due: "Done",
          tag: "Docs",
        },
        {
          id: "gk-6",
          text: "Deploy to Prod",
          desc: "Deploy the latest build to production.",
          avatar: "TI",
          avatarColor: "#00a9a5",
          due: "Done",
          tag: "Ops",
        },
      ],
    },
  ];
</script>

<svelte:window onscroll={updateCustomizableProgress} onresize={updateCustomizableProgress} />

<div class="feature-card-section">
        <div class="feature-card-grid">
          <div class="customizable-scroll-scene" bind:this={customizableScrollScene}>
          <article
            class="customizable-feature-card"
            style={`--customizable-progress: ${customizableProgress};`}
          >
            <div class="feature-card-copy">
              <div class="feature-card-copy-text">
                <h2>Customizable</h2>
                <p class="large">
                  SnapSort components are styleless by default. Use our default theme or
                  apply your own, including Tailwind. Configuration parameters allow
                  adjustment of animation and drag behavior.
                </p>
              </div>
            </div>

            <div
              class="customizable-demo shallow"
              style={`--customizable-progress: ${customizableProgress};`}
            >
              <div class="customizable-demo-scale">
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
                      class="customizable-mockup-card shallow"
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
                        items={customizableMockupRows}
                        getItemId={(row) => row.label}
                      >
                        {#snippet entry(row)}
                          <Item itemId={row.label}>
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
                        {/snippet}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card shallow"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("words")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Words</span>
                          <i></i>
                        </div>
                      {/if}
                      <Container
                        className="customizable-mini-words"
                        config={{
                          direction: "row",
                          groupID: `customizable-${theme.id}-words`,
                          mode: "progressive",
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                        items={customizableMockupWords}
                        getItemId={(word) => word}
                      >
                        {#snippet entry(word)}
                          <Item itemId={word}>
                            <span class="customizable-mini-word">{word}</span>
                          </Item>
                        {/snippet}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card shallow"
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
                        items={customizableMockupCards}
                        getItemId={(card) => card.title}
                      >
                        {#snippet entry(card)}
                          <Item itemId={card.title}>
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
                        {/snippet}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card shallow"
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
                        items={nestedShowcaseEntries}
                        getItemId={(e) => (e.kind === "row" ? `parent-${e.row.label}` : `child-group-${theme.id}`)}
                      >
                        {#snippet entry(e)}
                          {#if e.kind === "row"}
                            <Item itemId={`parent-${e.row.label}`}>
                              <div class="customizable-mini-row">
                                <Handle className="customizable-mini-handle">
                                  <span class="customizable-mini-grip" aria-hidden="true">
                                    <i></i><i></i><i></i><i></i>
                                  </span>
                                </Handle>
                                <span class="customizable-mini-row-main">
                                  <span class="customizable-mini-row-text">{e.row.label}</span>
                                  <span class="customizable-mini-row-sub">Parent block</span>
                                </span>
                                <span class="customizable-mini-meta">{e.row.meta}</span>
                              </div>
                            </Item>
                          {:else}
                            <Container
                              className="customizable-mini-nested-child"
                              config={{
                                direction: "column",
                                groupID: `customizable-${theme.id}-nested`,
                                ...getCustomizableThemeConfig(theme.id),
                              }}
                              itemId={`child-group-${theme.id}`}
                              items={customizableMockupNested.child}
                              getItemId={(row) => row.label}
                            >
                              {#snippet entry(row)}
                                <Item itemId={row.label}>
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
                              {/snippet}
                            </Container>
                          {/if}
                        {/snippet}
                      </Container>
                    </div>

                    <div
                      class="customizable-mockup-card shallow"
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
                          items={customizableMockupFields}
                          getItemId={(field) => field.label}
                        >
                          {#snippet entry(field)}
                            <Item itemId={field.label}>
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
                                    <Container
                                      className="customizable-mini-options"
                                      config={{
                                        direction: "column",
                                        groupID: `customizable-${theme.id}-editor-${field.label}`,
                                        mode: "progressive",
                                        ...getCustomizableThemeConfig(theme.id),
                                      }}
                                      items={field.options}
                                      getItemId={(option) => option}
                                    >
                                      {#snippet entry(option)}
                                        <Item itemId={option}>
                                          <span class="customizable-mini-option" class:checkbox={field.type === "checkbox"}>
                                            <Handle className="customizable-mini-option-handle">
                                              <span class="customizable-mini-option-grip" aria-hidden="true"></span>
                                            </Handle>
                                            <i></i>
                                            <span>{option}</span>
                                            <button type="button" tabindex="-1" aria-label="Remove option">x</button>
                                          </span>
                                        </Item>
                                      {/snippet}
                                    </Container>
                                  </SnapSortContextBoundary>
                                  <button class="customizable-mini-add-option" type="button" tabindex="-1">
                                    + Add option
                                  </button>
                                </div>
                              </div>
                            </Item>
                          {/snippet}
                        </Container>
                      </div>
                    </div>

                    <div
                      class="customizable-mockup-card shallow"
                      class:card={theme.id === "default"}
                      style={`order: ${theme.demoOrder.indexOf("files")};`}
                    >
                      {#if theme.id === "retro"}
                        <div class="customizable-retro-window-bar">
                          <span>Files</span>
                          <i></i>
                        </div>
                      {/if}
                      <Container
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
                          mode: "insertion",
                          ...getCustomizableThemeConfig(theme.id),
                        }}
                        items={customizableMockupFiles}
                        getItemId={(file) => file.id}
                      >
                        {#snippet entry(file)}
                          {#if file.kind === "folder"}
                            <Container
                              className={`customizable-mini-tree-folder depth-${file.depth}${file.active ? " active" : ""}`}
                              locked={false}
                              itemId={file.id}
                              metadata={{
                                containerId: file.id,
                                insertionDepth: file.depth + 1,
                                insertionMarkerInsetLeft: 6 + (file.depth + 1) * 9,
                                insertionMarkerInsetRight: 6,
                              }}
                              config={{
                                direction: "column",
                                groupID: `customizable-${theme.id}-files`,
                                name: `customizable-${theme.id}-files-${file.id}`,
                                mode: "insertion",
                                ...getCustomizableThemeConfig(theme.id),
                              }}
                              items={emptyMockupFiles}
                              getItemId={(child) => child.id}
                            >
                              {#snippet before()}
                                <div
                                  class="customizable-mini-tree-row folder"
                                  style={`--depth: ${file.depth};`}
                                >
                                  <span class="customizable-mini-indent" aria-hidden="true"></span>
                                  <span class="customizable-mini-chevron open" aria-hidden="true"></span>
                                  <span class="customizable-mini-tree-icon folder" aria-hidden="true"></span>
                                  <strong>{file.label}</strong>
                                </div>
                              {/snippet}
                              {#snippet entry()}
                                <!-- Leaf folder mockup: no sortable children. -->
                              {/snippet}
                            </Container>
                          {:else}
                            <Item
                              itemId={file.id}
                              className={`customizable-mini-tree-row file depth-${file.depth}${file.active ? " active" : ""}`}
                              style={`--depth: ${file.depth};`}
                            >
                              <span class="customizable-mini-indent" aria-hidden="true"></span>
                              <span class="customizable-mini-chevron-spacer" aria-hidden="true"></span>
                              <span class="customizable-mini-tree-icon file" aria-hidden="true"></span>
                              <strong>{file.label}</strong>
                            </Item>
                          {/if}
                        {/snippet}
                      </Container>
                    </div>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
              </div>
            </div>
          </article>
          </div>

          <section class="closing-grid" aria-label="Get started with SnapSort">
            <div class="closing-card get-started-card">
              <div class="closing-copy">
                <h3>Get started</h3>
                <p>
                  Install SnapSort, wrap your markup in a container, and ship drag
                  and drop in minutes — with the framework you already use.
                </p>
              </div>
              <ul class="closing-frameworks" aria-label="Framework availability">
                <li><img src="/icon/javascript.svg" alt="JavaScript" /></li>
                <li><img src="/icon/svelte.svg" alt="Svelte" /></li>
                <li><img src="/icon/react.svg" alt="React" /></li>
                <li class="framework-wip-logo">
                  <img src="/icon/vue.svg" alt="Vue" />
                  <span>WIP</span>
                </li>
                <li class="framework-wip-logo">
                  <img src="/icon/angular.svg" alt="Angular" />
                  <span>WIP</span>
                </li>
              </ul>
              <a class="button primary closing-button" href="/docs/snapsort/introduction">
                Read the docs
              </a>
            </div>

            <div class="closing-card gallery-card">
              <div class="gallery-kanban" aria-hidden="true">
                <div class="gallery-kanban-scale">
                  <Container
                    className="gk-board"
                    config={{ direction: "row", name: "gk-root", noDrop: true }}
                    locked={true}
                    items={galleryKanban}
                    getItemId={(column) => column.id}
                  >
                    {#snippet entry(column)}
                      <Container
                        className="gk-column"
                        config={{
                          direction: "column",
                          groupID: "closing-kanban",
                          name: column.id,
                        }}
                        locked={true}
                        itemId={column.id}
                        items={column.cards}
                        getItemId={(card) => card.id}
                      >
                        {#snippet before()}
                          <div class="gk-column-head">
                            <h4>{column.title}</h4>
                            <span class="gk-count">{column.cards.length}</span>
                          </div>
                        {/snippet}
                        {#snippet entry(card)}
                          <Item itemId={card.id}>
                            <div class="gk-card">
                              <div class="gk-header">
                                <span class="gk-title">{card.text}</span>
                                <span class="gk-tag">{card.tag}</span>
                              </div>
                              <p class="gk-desc">{card.desc}</p>
                              <div class="gk-footer">
                                <span
                                  class="gk-avatar"
                                  style={`--avatar-color: ${card.avatarColor};`}
                                >
                                  {card.avatar}
                                </span>
                                <span class="gk-due">
                                  <i class="material-symbols-rounded">event</i>{card.due}
                                </span>
                              </div>
                            </div>
                          </Item>
                        {/snippet}
                      </Container>
                    {/snippet}
                  </Container>
                </div>
              </div>
              <div class="closing-copy">
                <h3>Explore the gallery</h3>
                <p>
                  File trees, form builders, sentence puzzles, and more — complete
                  interactive demos built with SnapSort.
                </p>
              </div>
              <a class="button closing-button" href="/snapsort/gallery">Browse the gallery</a>
            </div>
          </section>
        </div>
      </div>
