<script lang="ts">
  import { onMount, tick } from "svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import type { Engine as SnapEngine } from "@snap-engine/core";
  import {
    Container,
    ContainerProgressive,
    Item,
    ItemProgressive,
  } from "@snap-engine/snapsort-svelte";
  import SnapSortContextBoundary from "./SnapSortContextBoundary.svelte";
  import type {
    ContainerBase as SortContainer,
    GhostCreateEvent,
    ItemBase,
    ItemInsertEvent,
    ItemRemoveEvent,
  } from "@snap-engine/snapsort";

  type TitleLinePosition = {
    id: string;
    left: number;
    right: number;
  };

  type SentenceZone = "answer" | "bank";

  type SentenceTile = {
    id: string;
    text: string;
  };

  type SentenceGhostEntry = {
    id: string;
    isGhost: true;
    zone: SentenceZone;
    index: number;
    originalItemId: string | null;
    ghostItem: ItemBase;
    text: string;
  };

  type RenderedSentenceTile =
    | {
        isGhost: false;
        tile: SentenceTile;
      }
    | SentenceGhostEntry;

  type EditorFieldType =
    | "shortText"
    | "longText"
    | "multipleChoice"
    | "checkboxes"
    | "dropdown"
    | "date"
    | "rating";

  type EditorPaletteItem = {
    type: EditorFieldType;
    label: string;
    icon: string;
  };

  type EditorOption = {
    id: string;
    label: string;
  };

  type EditorField = {
    id: string;
    type: EditorFieldType;
    label: string;
    options?: EditorOption[];
  };

  let heroSection: HTMLElement | undefined = $state();
  let titleSection: HTMLElement | undefined = $state();
  let heroEngine: SnapEngine | null = $state(null);
  let examplesEngine: SnapEngine | null = $state(null);
  let titleLetterElements: HTMLSpanElement[] = [];
  let titleLinePositions = $state<TitleLinePosition[]>([]);
  let titleLineCenterY = $state(0);

  function configureInput(engine: SnapEngine | null) {
    if (engine) {
      engine.input.config.maxSimultaneousDrags = 1;
    }
  }

  $effect(() => {
    configureInput(heroEngine);
    configureInput(examplesEngine);
  });

  function cssLengthToPixels(value: string, element: HTMLElement) {
    const amount = Number.parseFloat(value);
    if (Number.isNaN(amount)) return 0;
    if (value.endsWith("rem")) {
      return amount * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    }
    if (value.endsWith("em")) {
      return amount * Number.parseFloat(getComputedStyle(element).fontSize);
    }
    return amount;
  }

  function updateTitleLinePositions() {
    if (!heroSection) return;

    const heroRect = heroSection.getBoundingClientRect();
    if (titleSection) {
      const titleRect = titleSection.getBoundingClientRect();
      titleLineCenterY = titleRect.top - heroRect.top + titleRect.height / 2;
    }

    titleLinePositions = titleChars.flatMap(({ id }, i) => {
      const element = titleLetterElements[i];
      if (!element) return [];

      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      const leftOffset = cssLengthToPixels(
        styles.getPropertyValue("--letter-line-left-offset").trim(),
        element,
      );
      const rightOffset = cssLengthToPixels(
        styles.getPropertyValue("--letter-line-right-offset").trim(),
        element,
      );

      return [
        {
          id,
          left: rect.left - heroRect.left + leftOffset,
          right: rect.right - heroRect.left - rightOffset,
        },
      ];
    });
  }

  // Set max simultaneous drags to 1 for this demo (runs after engines are created)
  onMount(() => {
    let frame = 0;
    const tick = () => {
      updateTitleLinePositions();
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  });

  const title = "SnapSort";
  const gripDots = Array.from({ length: 6 }, (_, i) => i);

  const titleChars = title.split("").map((char, i) => ({
    char,
    id: `snapsort-letter-${i}`,
  }));

  let todoItems = $state([
    {
      id: "t-1",
      text: "Plan the grocery run for dinner, breakfast, and the weekend snack drawer",
      due: "Due in 2h",
      priority: "Home",
      estimate: "20m",
      checked: false,
    },
    {
      id: "t-2",
      text: "Take the evening neighborhood walk before the weather turns colder",
      due: "Done",
      priority: "Routine",
      estimate: "15m",
      checked: true,
    },
    {
      id: "t-3",
      text: "Clear the client inbox and flag anything that needs a follow-up tomorrow",
      due: "Due today",
      priority: "Work",
      estimate: "30m",
      checked: false,
    },
    {
      id: "t-4",
      text: "Fit in a short strength session before the evening calendar fills up",
      due: "6:30 PM",
      priority: "Health",
      estimate: "45m",
      checked: false,
    },
    {
      id: "t-5",
      text: "Read the next chapter and save three notes for the weekend review",
      due: "Done",
      priority: "Focus",
      estimate: "25m",
      checked: true,
    },
    {
      id: "t-6",
      text: "Review autopay dates and pay the two bills that still need approval",
      due: "Tomorrow",
      priority: "Finance",
      estimate: "10m",
      checked: false,
    },
    {
      id: "t-7",
      text: "Call mom back and send the photos from last weekend's visit",
      due: "Tonight",
      priority: "Family",
      estimate: "20m",
      checked: false,
    },
    {
      id: "t-8",
      text: "Water the balcony plants and rotate the herbs toward the light",
      due: "Due in 4h",
      priority: "Home",
      estimate: "8m",
      checked: false,
    },
  ]);

  const kanbanTodo = [
    {
      id: "k-1",
      text: "Fix Bug #12",
      desc: "Fix the login issue on Safari browser.",
      assignee: "Maya Chen",
      avatar: "MC",
      avatarColor: "#0088ff",
      due: "Today",
      tag: "Bug",
      activity: "3",
    },
    {
      id: "k-2",
      text: "Write Tests",
      desc: "Add unit tests for the new payment module.",
      assignee: "Noah Kim",
      avatar: "NK",
      avatarColor: "#8f3dff",
      due: "Jun 30",
      tag: "QA",
      activity: "1",
    },
  ];

  const kanbanReview = [
    {
      id: "k-3",
      text: "Code Review",
      desc: "Review the PR for the new feature.",
      assignee: "Ari Patel",
      avatar: "AP",
      avatarColor: "#ff7a00",
      due: "Jul 1",
      tag: "Dev",
      activity: "5",
    },
    {
      id: "k-4",
      text: "Design QA",
      desc: "Check spacing, empty states, and mobile behavior.",
      assignee: "Lina Park",
      avatar: "LP",
      avatarColor: "#ff3d7f",
      due: "Jul 2",
      tag: "UI",
      activity: "2",
    },
  ];

  const kanbanDone = [
    {
      id: "k-5",
      text: "Publish Docs",
      desc: "Update the release notes and component examples.",
      assignee: "Eli Stone",
      avatar: "ES",
      avatarColor: "#14a44d",
      due: "Done",
      tag: "Docs",
      activity: "4",
    },
    {
      id: "k-6",
      text: "Deploy to Prod",
      desc: "Deploy the latest build to production.",
      assignee: "Tara Ito",
      avatar: "TI",
      avatarColor: "#00a9a5",
      due: "Done",
      tag: "Ops",
      activity: "6",
    },
  ];

  const sentenceWords: SentenceTile[] = [
    { id: "sw-1", text: "あり" },
    { id: "sw-2", text: "の" },
    { id: "sw-3", text: "ます" },
    { id: "sw-4", text: "多く" },
    { id: "sw-5", text: "が" },
    { id: "sw-6", text: "用途" },
  ];

  const sentenceAnimation = {
    duration: 180,
    timing_function: "cubic-bezier(0.2, 0, 0, 1)",
  };

  const editorPalette: EditorPaletteItem[] = [
    { type: "shortText", label: "Short text", icon: "short_text" },
    { type: "longText", label: "Long text", icon: "notes" },
    { type: "multipleChoice", label: "Multiple choice", icon: "radio_button_checked" },
    { type: "checkboxes", label: "Checkboxes", icon: "checklist" },
    { type: "dropdown", label: "Dropdown", icon: "arrow_drop_down_circle" },
    { type: "date", label: "Date", icon: "event" },
    { type: "rating", label: "Rating", icon: "star" },
  ];

  let editorOptionCount = 7;

  function createEditorOption(label: string): EditorOption {
    editorOptionCount += 1;
    return {
      id: `editor-option-${editorOptionCount}`,
      label,
    };
  }

  function defaultEditorOptions(type: EditorFieldType): EditorOption[] | undefined {
    if (type === "multipleChoice" || type === "checkboxes") {
      return [createEditorOption("Option 1"), createEditorOption("Option 2")];
    }
    if (type === "dropdown") {
      return [
        createEditorOption("Option 1"),
        createEditorOption("Option 2"),
        createEditorOption("Option 3"),
      ];
    }
    return undefined;
  }

  let editorFieldCount = 3;
  let editorFields: EditorField[] = $state([
    { id: "editor-field-1", type: "shortText", label: "Question 1" },
    {
      id: "editor-field-2",
      type: "multipleChoice",
      label: "Question 2",
      options: [
        { id: "editor-option-1", label: "Option 1" },
        { id: "editor-option-2", label: "Option 2" },
      ],
    },
    { id: "editor-field-3", type: "rating", label: "Question 3" },
  ]);

  let sentenceAnswerContainer: SortContainer | undefined = $state();
  let sentenceBankContainer: SortContainer | undefined = $state();
  let sentenceAnswerTiles: SentenceTile[] = $state([]);
  let sentenceBankTiles: SentenceTile[] = $state([...sentenceWords]);
  let sentenceGhostEntry = $state<SentenceGhostEntry | null>(null);
  let sentenceResult = $state("");
  let sentencePointerStart: { x: number; y: number } | null = null;
  let suppressSentenceClick = false;
  let debug = $state(false);
  let canvasComponent: Engine | null = null;

  function toggleDebug() {
    debug = !debug;
    if (debug) {
      canvasComponent?.enableDebug();
    } else {
      canvasComponent?.disableDebug();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "d" || e.key === "D") {
      toggleDebug();
    }
  }

  function goToDocs() {
    window.location.href = "/docs/snapsort/introduction";
  }

  function addEditorField(type: EditorFieldType) {
    editorFieldCount += 1;
    editorFields = [
      ...editorFields,
      {
        id: `editor-field-${editorFieldCount}`,
        type,
        label: `Question ${editorFieldCount}`,
        options: defaultEditorOptions(type),
      },
    ];
  }

  function updateEditorFieldLabel(id: string, label: string) {
    editorFields = editorFields.map((field) =>
      field.id === id ? { ...field, label } : field,
    );
  }

  function updateEditorFieldOptions(
    fieldId: string,
    update: (options: EditorOption[]) => EditorOption[],
  ) {
    editorFields = editorFields.map((field) =>
      field.id === fieldId
        ? { ...field, options: update(field.options ?? []) }
        : field,
    );
  }

  function updateEditorOptionLabel(fieldId: string, optionId: string, label: string) {
    updateEditorFieldOptions(fieldId, (options) =>
      options.map((option) => option.id === optionId ? { ...option, label } : option),
    );
  }

  function addEditorOption(fieldId: string) {
    const field = editorFields.find((candidate) => candidate.id === fieldId);
    const nextLabel = `Option ${(field?.options?.length ?? 0) + 1}`;
    updateEditorFieldOptions(fieldId, (options) => [...options, createEditorOption(nextLabel)]);
  }

  function removeEditorOption(fieldId: string, optionId: string) {
    updateEditorFieldOptions(fieldId, (options) =>
      options.length <= 1 ? options : options.filter((option) => option.id !== optionId),
    );
  }

  function reorderEditorOption(fieldId: string, optionId: string, index: number) {
    updateEditorFieldOptions(fieldId, (options) => {
      const option = options.find((candidate) => candidate.id === optionId);
      if (!option) return options;

      const nextOptions = options.filter((candidate) => candidate.id !== optionId);
      const targetIndex = Math.max(0, Math.min(index, nextOptions.length));
      nextOptions.splice(targetIndex, 0, option);
      return nextOptions;
    });
  }

  function handleEditorOptionInsert(event: ItemInsertEvent) {
    if (event.item.isGhost) {
      event.container.element?.insertBefore(event.item.element!, event.beforeElement);
      return;
    }

    const fieldId = event.containerMetadata.fieldId;
    const optionId = event.itemMetadata.itemId;
    if (typeof fieldId !== "string" || typeof optionId !== "string") return;

    reorderEditorOption(fieldId, optionId, event.index);
  }

  function handleEditorOptionRemove(event: ItemRemoveEvent) {
    if (event.item.isGhost) {
      event.item.element?.remove();
    }
  }

  function sentenceContainerForZone(zone: SentenceZone) {
    return zone === "answer" ? sentenceAnswerContainer : sentenceBankContainer;
  }

  function sentenceTilesForZone(zone: SentenceZone) {
    return zone === "answer" ? sentenceAnswerTiles : sentenceBankTiles;
  }

  function findSentenceTile(tileId: string | undefined) {
    if (!tileId) return null;
    return [...sentenceAnswerTiles, ...sentenceBankTiles].find((tile) => tile.id === tileId) ?? null;
  }

  function updateSentenceTileZone(tileId: string, targetZone: SentenceZone, targetIndex: number) {
    sentenceGhostEntry = null;
    const allTiles = [...sentenceAnswerTiles, ...sentenceBankTiles];
    const movedTile = allTiles.find((tile) => tile.id === tileId);
    if (!movedTile) return;

    const nextAnswerTiles = sentenceAnswerTiles.filter((tile) => tile.id !== tileId);
    const nextBankTiles = sentenceBankTiles.filter((tile) => tile.id !== tileId);
    const targetTiles = targetZone === "answer" ? nextAnswerTiles : nextBankTiles;
    const destinationIndex = Math.max(0, Math.min(targetIndex, targetTiles.length));

    targetTiles.splice(destinationIndex, 0, movedTile);
    sentenceAnswerTiles = nextAnswerTiles;
    sentenceBankTiles = nextBankTiles;
    sentenceResult = "";
  }

  function handleSentenceInsert(event: ItemInsertEvent) {
    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;

    const targetZone = event.containerMetadata.zone;
    if (targetZone !== "answer" && targetZone !== "bank") return;

    if (event.item.isGhost) {
      const sourceTile = findSentenceTile(itemId);
      sentenceGhostEntry = {
        id: `sentence-ghost-${event.item.id}`,
        isGhost: true,
        zone: targetZone,
        index: event.index,
        originalItemId: itemId,
        ghostItem: event.item,
        text: sourceTile?.text ?? "",
      };
      return;
    }

    updateSentenceTileZone(itemId, targetZone, event.index);
  }

  function handleSentenceRemove(event: ItemRemoveEvent) {
    if (event.item.isGhost) {
      if (sentenceGhostEntry?.ghostItem === event.item) {
        sentenceGhostEntry = null;
      }
      return;
    }

    const itemId = event.itemMetadata.itemId;
    if (typeof itemId !== "string") return;

    sentenceAnswerTiles = sentenceAnswerTiles.filter((tile) => tile.id !== itemId);
    sentenceBankTiles = sentenceBankTiles.filter((tile) => tile.id !== itemId);
  }

  function createSentenceGhost(_event: GhostCreateEvent): void {
    return;
  }

  function renderedSentenceTiles(zone: SentenceZone): RenderedSentenceTile[] {
    const rendered: RenderedSentenceTile[] = sentenceTilesForZone(zone).map((tile) => ({
      isGhost: false,
      tile,
    }));
    if (sentenceGhostEntry?.zone !== zone) return rendered;

    const coreIndex = Math.max(0, Math.min(sentenceGhostEntry.index, rendered.length));
    const originalIndex = sentenceGhostEntry.originalItemId
      ? sentenceTilesForZone(zone).findIndex((tile) => tile.id === sentenceGhostEntry?.originalItemId)
      : -1;
    const destinationIndex =
      originalIndex !== -1 && originalIndex <= coreIndex
        ? coreIndex + 1
        : coreIndex;
    rendered.splice(destinationIndex, 0, sentenceGhostEntry);
    return rendered;
  }

  function moveSentenceTileToZone(tile: SentenceTile, targetZone: SentenceZone) {
    const sourceZone: SentenceZone = sentenceAnswerTiles.some((candidate) => candidate.id === tile.id)
      ? "answer"
      : "bank";
    const sourceContainer = sentenceContainerForZone(sourceZone);
    const targetContainer = sentenceContainerForZone(targetZone);
    const fallbackIndex = targetZone === "answer" ? sentenceAnswerTiles.length : sentenceBankTiles.length;

    if (sourceContainer && targetContainer) {
      const movedBySnapSort = sourceContainer.moveItem(tile.id, targetContainer, fallbackIndex);
      if (movedBySnapSort) return;
    }

    updateSentenceTileZone(tile.id, targetZone, fallbackIndex);
  }

  function handleSentenceTilePointerDown(event: PointerEvent) {
    sentencePointerStart = { x: event.clientX, y: event.clientY };
    suppressSentenceClick = false;
  }

  function handleSentenceTilePointerMove(event: PointerEvent) {
    if (!sentencePointerStart) return;
    const distance = Math.hypot(
      event.clientX - sentencePointerStart.x,
      event.clientY - sentencePointerStart.y,
    );
    if (distance > 3) {
      suppressSentenceClick = true;
    }
  }

  function handleSentenceTileClick(event: MouseEvent, action: () => void) {
    if (suppressSentenceClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressSentenceClick = false;
      sentencePointerStart = null;
      return;
    }

    action();
  }

  function checkSentence() {
    const words = sentenceAnswerTiles.map((tile) => tile.text);
    const correct = ["多く", "の", "用途", "が", "あり", "ます"];

    if (
      words.length === correct.length &&
      words.every((w, i) => w === correct[i])
    ) {
      sentenceResult = "Correct!";
    } else {
      sentenceResult = "Incorrect, try again.";
    }
  }

</script>

<svelte:window onkeydown={handleKeydown} />

<section id="landing">
  <Engine id="snapsort-canvas" bind:this={canvasComponent} bind:engine={heroEngine} {debug}>

      <div class="hero-section" bind:this={heroSection}>
        <div class="hero-letter-lines" aria-hidden="true">
          {#each titleLinePositions as line (line.id)}
            <span
              class="hero-letter-line"
              style:--letter-line-left={`${line.left}px`}
              style:--letter-line-right={`${line.right}px`}
              style:--letter-line-center={`${titleLineCenterY}px`}
            ></span>
          {/each}
        </div>
        <div class="title-section" bind:this={titleSection}>
          <Container
            config={{ direction: "row", groupID: "snapsort-title" }}
          >
            {#each titleChars as { char, id }, i (id)}
              <Item style="padding: 0; width: auto;">
                <span
                  {id}
                  class="letter-shell"
                  bind:this={titleLetterElements[i]}
                >
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
        </div>
        <div class="hero-copy">
          <p>The ultimate library for drag and drop interfaces. From todo lists to kanban boards and beyond, SnapSort has you covered. </p>
          <button class="primary" type="button" onclick={goToDocs}>See docs</button>
        </div>
      </div>

  </Engine>
</section>
<section>
  <Engine id="snapsort-examples-canvas" bind:this={canvasComponent} bind:engine={examplesEngine} {debug}>

    <div class="examples-grid">
      <div class="example-card pm-example">
        <h3>TODO List</h3>
        <div class="project-list">
          <Container config={{ direction: "column", groupID: "project-list" }}>
            {#each todoItems as todo (todo.id)}
              <Item>
                <div class="project-card" class:checked={todo.checked}>
                  <label>
                    <input type="checkbox" bind:checked={todo.checked} />
                    <span></span>
                  </label>
                  <span class="project-text">{todo.text}</span>
                  <div class="project-meta" aria-label="Task metadata">
                    <span class="project-meta-item">
                      <i class="material-symbols-rounded" aria-hidden="true">schedule</i>
                      {todo.due}
                    </span>
                    <span class="project-meta-item">
                      <i class="material-symbols-rounded" aria-hidden="true">flag</i>
                      {todo.priority}
                    </span>
                    <span class="project-meta-item">
                      <i class="material-symbols-rounded" aria-hidden="true">timer</i>
                      {todo.estimate}
                    </span>
                  </div>
                </div>
              </Item>
            {/each}
          </Container>
        </div>
      </div>

      <div class="example-card kanban-example">
        <h3>Kanban Board</h3>
        <div class="kanban-board">
          <Container
            config={{ direction: "row", name: "kanban-root", noDrop: true }}
            locked={true}
          >
            <Container
              className="kanban-column"
              config={{
                direction: "column",
                name: "kanban-todo",
                onClickAction: { action: "moveTo", target: "kanban-review" },
              }}
              locked={true}
            >
              <h4>To Do</h4>
              {#each kanbanTodo as { id, text, desc, assignee, avatar, avatarColor, due, tag, activity } (id)}
                <Item>
                  <div class="kanban-card card">
                    <div class="kanban-header">
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                    <div class="kanban-footer">
                      <span
                        class="kanban-avatar"
                        style={`--avatar-color: ${avatarColor};`}
                        title={assignee}
                        aria-label={assignee}
                      >
                        {avatar}
                      </span>
                      <div class="kanban-meta" aria-label="Task metadata">
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">event</i>
                          {due}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">sell</i>
                          {tag}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">forum</i>
                          {activity}
                        </span>
                      </div>
                    </div>
                  </div>
                </Item>
              {/each}
            </Container>
            <Container
              className="kanban-column"
              config={{
                direction: "column",
                name: "kanban-review",
                onClickAction: { action: "moveTo", target: "kanban-done" },
              }}
              locked={true}
            >
              <h4>Review</h4>
              {#each kanbanReview as { id, text, desc, assignee, avatar, avatarColor, due, tag, activity } (id)}
                <Item>
                  <div class="kanban-card card">
                    <div class="kanban-header">
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                    <div class="kanban-footer">
                      <span
                        class="kanban-avatar"
                        style={`--avatar-color: ${avatarColor};`}
                        title={assignee}
                        aria-label={assignee}
                      >
                        {avatar}
                      </span>
                      <div class="kanban-meta" aria-label="Task metadata">
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">event</i>
                          {due}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">sell</i>
                          {tag}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">forum</i>
                          {activity}
                        </span>
                      </div>
                    </div>
                  </div>
                </Item>
              {/each}
            </Container>
            <Container
              className="kanban-column"
              config={{
                direction: "column",
                name: "kanban-done",
                onClickAction: { action: "moveTo", target: "kanban-todo" },
              }}
              locked={true}
            >
              <h4>Done</h4>
              {#each kanbanDone as { id, text, desc, assignee, avatar, avatarColor, due, tag, activity } (id)}
                <Item>
                  <div class="kanban-card card">
                    <div class="kanban-header">
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                    <div class="kanban-footer">
                      <span
                        class="kanban-avatar"
                        style={`--avatar-color: ${avatarColor};`}
                        title={assignee}
                        aria-label={assignee}
                      >
                        {avatar}
                      </span>
                      <div class="kanban-meta" aria-label="Task metadata">
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">event</i>
                          {due}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">sell</i>
                          {tag}
                        </span>
                        <span class="kanban-meta-item">
                          <i class="material-symbols-rounded" aria-hidden="true">forum</i>
                          {activity}
                        </span>
                      </div>
                    </div>
                  </div>
                </Item>
              {/each}
            </Container>
          </Container>
        </div>
      </div>



      <div class="example-card sentence-example">
        <h3>Sentence Builder</h3>
        <div class="card ground sentence-builder">
          <div class="display prompt-section">
            <div class="english-sentence">
              <span>It has many uses</span>
            </div>
          </div>
          <div class="sentence-container-area">
            <ContainerProgressive
              className="sentence-workspace-root"
              config={{ direction: "column", name: "sentence-root", noDrop: true }}
              locked={true}
            >
              <ContainerProgressive
                className="sentence-drop-zone"
                bind:container={sentenceAnswerContainer}
                config={{
                  direction: "row",
                  groupID: "sentence",
                  name: "sentence-target",
                  dropArea: true,
                  animation: {
                    reorder: sentenceAnimation,
                    drop: sentenceAnimation,
                    clickMove: sentenceAnimation,
                  },
                  callbacks: {
                    onItemInsert: handleSentenceInsert,
                    onItemRemove: handleSentenceRemove,
                    createItemGhost: createSentenceGhost,
                    awaitMutation: tick,
                  },
                }}
                locked={true}
                metadata={{ zone: "answer" }}
              >
                {#each renderedSentenceTiles("answer") as entry (entry.isGhost ? entry.id : entry.tile.id)}
                  {#if entry.isGhost}
                    <ItemProgressive
                      className="sentence-tile-wrapper ghost sentence-tile-ghost"
                      itemObject={entry.ghostItem}
                      itemKey={entry.id}
                    >
                      <button type="button" class="word-card sentence-word selected" tabindex="-1">{entry.text}</button>
                    </ItemProgressive>
                  {:else}
                    <ItemProgressive className="sentence-tile-wrapper" metadata={{ itemId: entry.tile.id }}>
                      <button
                        type="button"
                        class="word-card sentence-word selected"
                        onpointerdown={handleSentenceTilePointerDown}
                        onpointermove={handleSentenceTilePointerMove}
                        onclick={(event) => handleSentenceTileClick(event, () => moveSentenceTileToZone(entry.tile, "bank"))}
                        aria-label={`Move ${entry.tile.text} to bank`}
                      >
                        {entry.tile.text}
                      </button>
                    </ItemProgressive>
                  {/if}
                {/each}
              </ContainerProgressive>
              <ContainerProgressive
                className="sentence-source-zone"
                bind:container={sentenceBankContainer}
                config={{
                  direction: "row",
                  mainAxisAlign: "center",
                  groupID: "sentence",
                  name: "sentence-source",
                  dropArea: true,
                  animation: {
                    reorder: sentenceAnimation,
                    drop: sentenceAnimation,
                    clickMove: sentenceAnimation,
                  },
                  callbacks: {
                    onItemInsert: handleSentenceInsert,
                    onItemRemove: handleSentenceRemove,
                    createItemGhost: createSentenceGhost,
                    awaitMutation: tick,
                  },
                }}
                locked={true}
                metadata={{ zone: "bank" }}
              >
                {#each renderedSentenceTiles("bank") as entry (entry.isGhost ? entry.id : entry.tile.id)}
                  {#if entry.isGhost}
                    <ItemProgressive
                      className="sentence-tile-wrapper ghost sentence-tile-ghost"
                      itemObject={entry.ghostItem}
                      itemKey={entry.id}
                    >
                      <button type="button" class="word-card sentence-word" tabindex="-1">{entry.text}</button>
                    </ItemProgressive>
                  {:else}
                    <ItemProgressive className="sentence-tile-wrapper" metadata={{ itemId: entry.tile.id }}>
                      <button
                        type="button"
                        class="word-card sentence-word"
                        onpointerdown={handleSentenceTilePointerDown}
                        onpointermove={handleSentenceTilePointerMove}
                        onclick={(event) => handleSentenceTileClick(event, () => moveSentenceTileToZone(entry.tile, "answer"))}
                        aria-label={`Move ${entry.tile.text} to answer`}
                      >
                        {entry.tile.text}
                      </button>
                    </ItemProgressive>
                  {/if}
                {/each}
              </ContainerProgressive>
            </ContainerProgressive>
          </div>
          <div class="controls">
            <button
              class="check-btn"
              class:success={sentenceResult === "Correct!"}
              onclick={checkSentence}
            >
              {sentenceResult === "Correct!" ? "Correct" : "Check"}
            </button>
          </div>
        </div>
      </div>

      <div class="example-card editor-example">
        <h3 class="editor-title">Editor</h3>
        <div class="editor-builder">
          <div class="editor-palette" aria-label="Field palette">
            {#each editorPalette as item (item.type)}
              <button
                type="button"
                class="editor-tool"
                onclick={() => addEditorField(item.type)}
              >
                <i class="material-symbols-rounded" aria-hidden="true">{item.icon}</i>
                <span>{item.label}</span>
              </button>
            {/each}
          </div>
          <div class="editor-canvas card form-control-group" aria-label="Form canvas">
            <div class="editor-canvas-header">
              <h4 class="editor-canvas-title">My Form</h4>
            </div>
            <Container
              className="editor-field-list"
              config={{ direction: "column", groupID: "editor-fields" }}
            >
              {#each editorFields as field (field.id)}
                <Item>
                  <div class="editor-field">
                    <div class="editor-field-main">
                      <input
                        class="editor-question-input"
                        type="text"
                        value={field.label}
                        aria-label="Question text"
                        oninput={(event) =>
                          updateEditorFieldLabel(field.id, event.currentTarget.value)}
                        onpointerdown={(event) => event.stopPropagation()}
                        onclick={(event) => event.stopPropagation()}
                      />
                      {#if field.type === "shortText"}
                        <input id={field.id} type="text" value="Short answer" readonly tabindex="-1" />
                      {:else if field.type === "longText"}
                        <textarea id={field.id} rows="3" readonly tabindex="-1">Long answer response</textarea>
                      {:else if field.type === "multipleChoice"}
                        <SnapSortContextBoundary>
                          <ContainerProgressive
                            className="editor-option-stack"
                            config={{
                              direction: "column",
                              groupID: `editor-options-${field.id}`,
                              name: `editor-options-${field.id}`,
                              callbacks: {
                                onItemInsert: handleEditorOptionInsert,
                                onItemRemove: handleEditorOptionRemove,
                                awaitMutation: tick,
                              },
                            }}
                            locked={true}
                            metadata={{ fieldId: field.id }}
                          >
                            {#each field.options ?? [] as option (option.id)}
                              <ItemProgressive className="editor-option-item" metadata={{ itemId: option.id }}>
                                <div class="editor-option-row">
                                  <label class="radio-label">
                                    <input type="radio" name={`${field.id}-choice`} checked={option === field.options?.[0]} tabindex="-1" />
                                    <span></span>
                                  </label>
                                  <input
                                    class="editor-option-input"
                                    type="text"
                                    value={option.label}
                                    aria-label="Option text"
                                    oninput={(event) =>
                                      updateEditorOptionLabel(field.id, option.id, event.currentTarget.value)}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => event.stopPropagation()}
                                  />
                                  <button
                                    class="editor-option-action"
                                    type="button"
                                    aria-label="Remove option"
                                    disabled={(field.options?.length ?? 0) <= 1}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => {
                                      event.stopPropagation();
                                      removeEditorOption(field.id, option.id);
                                    }}
                                  >
                                    <i class="material-symbols-rounded" aria-hidden="true">delete</i>
                                  </button>
                                  <i class="material-symbols-rounded editor-option-grip" aria-hidden="true">drag_indicator</i>
                                </div>
                              </ItemProgressive>
                            {/each}
                          </ContainerProgressive>
                        </SnapSortContextBoundary>
                        <button
                          class="editor-add-option"
                          type="button"
                          onpointerdown={(event) => event.stopPropagation()}
                          onclick={(event) => {
                            event.stopPropagation();
                            addEditorOption(field.id);
                          }}
                        >
                          <i class="material-symbols-rounded" aria-hidden="true">add</i>
                          Add option
                        </button>
                      {:else if field.type === "checkboxes"}
                        <SnapSortContextBoundary>
                          <ContainerProgressive
                            className="editor-option-stack"
                            config={{
                              direction: "column",
                              groupID: `editor-options-${field.id}`,
                              name: `editor-options-${field.id}`,
                              callbacks: {
                                onItemInsert: handleEditorOptionInsert,
                                onItemRemove: handleEditorOptionRemove,
                                awaitMutation: tick,
                              },
                            }}
                            locked={true}
                            metadata={{ fieldId: field.id }}
                          >
                            {#each field.options ?? [] as option (option.id)}
                              <ItemProgressive className="editor-option-item" metadata={{ itemId: option.id }}>
                                <div class="editor-option-row">
                                  <label class="checkbox-label">
                                    <input type="checkbox" checked={option === field.options?.[0]} tabindex="-1" />
                                    <span></span>
                                  </label>
                                  <input
                                    class="editor-option-input"
                                    type="text"
                                    value={option.label}
                                    aria-label="Option text"
                                    oninput={(event) =>
                                      updateEditorOptionLabel(field.id, option.id, event.currentTarget.value)}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => event.stopPropagation()}
                                  />
                                  <button
                                    class="editor-option-action"
                                    type="button"
                                    aria-label="Remove option"
                                    disabled={(field.options?.length ?? 0) <= 1}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => {
                                      event.stopPropagation();
                                      removeEditorOption(field.id, option.id);
                                    }}
                                  >
                                    <i class="material-symbols-rounded" aria-hidden="true">delete</i>
                                  </button>
                                  <i class="material-symbols-rounded editor-option-grip" aria-hidden="true">drag_indicator</i>
                                </div>
                              </ItemProgressive>
                            {/each}
                          </ContainerProgressive>
                        </SnapSortContextBoundary>
                        <button
                          class="editor-add-option"
                          type="button"
                          onpointerdown={(event) => event.stopPropagation()}
                          onclick={(event) => {
                            event.stopPropagation();
                            addEditorOption(field.id);
                          }}
                        >
                          <i class="material-symbols-rounded" aria-hidden="true">add</i>
                          Add option
                        </button>
                      {:else if field.type === "dropdown"}
                        <SnapSortContextBoundary>
                          <ContainerProgressive
                            className="editor-option-stack"
                            config={{
                              direction: "column",
                              groupID: `editor-options-${field.id}`,
                              name: `editor-options-${field.id}`,
                              callbacks: {
                                onItemInsert: handleEditorOptionInsert,
                                onItemRemove: handleEditorOptionRemove,
                                awaitMutation: tick,
                              },
                            }}
                            locked={true}
                            metadata={{ fieldId: field.id }}
                          >
                            {#each field.options ?? [] as option (option.id)}
                              <ItemProgressive className="editor-option-item" metadata={{ itemId: option.id }}>
                                <div class="editor-option-row">
                                  <i class="material-symbols-rounded editor-option-type-icon" aria-hidden="true">arrow_drop_down</i>
                                  <input
                                    class="editor-option-input"
                                    type="text"
                                    value={option.label}
                                    aria-label="Option text"
                                    oninput={(event) =>
                                      updateEditorOptionLabel(field.id, option.id, event.currentTarget.value)}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => event.stopPropagation()}
                                  />
                                  <button
                                    class="editor-option-action"
                                    type="button"
                                    aria-label="Remove option"
                                    disabled={(field.options?.length ?? 0) <= 1}
                                    onpointerdown={(event) => event.stopPropagation()}
                                    onclick={(event) => {
                                      event.stopPropagation();
                                      removeEditorOption(field.id, option.id);
                                    }}
                                  >
                                    <i class="material-symbols-rounded" aria-hidden="true">delete</i>
                                  </button>
                                  <i class="material-symbols-rounded editor-option-grip" aria-hidden="true">drag_indicator</i>
                                </div>
                              </ItemProgressive>
                            {/each}
                          </ContainerProgressive>
                        </SnapSortContextBoundary>
                        <button
                          class="editor-add-option"
                          type="button"
                          onpointerdown={(event) => event.stopPropagation()}
                          onclick={(event) => {
                            event.stopPropagation();
                            addEditorOption(field.id);
                          }}
                        >
                          <i class="material-symbols-rounded" aria-hidden="true">add</i>
                          Add option
                        </button>
                      {:else if field.type === "date"}
                        <input id={field.id} type="date" tabindex="-1" />
                      {:else}
                        <div class="editor-rating-preview" aria-label="5 star rating">
                          {#each Array(5) as _, index}
                            <i class="material-symbols-rounded" class:filled={index < 4} aria-hidden="true">star</i>
                          {/each}
                        </div>
                      {/if}
                    </div>
                    <i class="material-symbols-rounded editor-field-grip" aria-hidden="true">drag_indicator</i>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
        </div>
      </div>
    </div>
  </Engine>
</section>

<style lang="scss">
  @use "../../lib/landing/landing.scss";

  #landing {
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    height: 40vh;
  }

  :global(.ghost) {
    background: rgba(0, 0, 0, 0.06);
    border-radius: 6px;
    box-sizing: border-box;
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
  .hero-section{
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    // min-height: 80vh;
    background-color: transparent;

    @media (max-width: 720px) {
      width: 80%;
    }
    .title-section {
      position: relative;
      width: fit-content;
      box-sizing: border-box;
      z-index: 1;
      /* filter: drop-shadow(2px 4px 6px rgba(58, 42, 34, 0.15)); */
      // overflow: hidden;
    }

    .title-section::after {
      content: "";
      position: absolute;
      left: 50%;
      width: 100vw;
      bottom: 1.5rem;
      height: 1px;
      background: #cfd4d7;
      pointer-events: none;
      transform: translateX(-50%);
      z-index: -1;

      @media screen and (max-width: 700px) {
        display: none;
      }
    }

    :global(.container) {

      filter: drop-shadow(2px 4px 6px rgba(58, 42, 34, 0.15));
      justify-content: center;
      width: auto;
    }
  }

  .hero-letter-lines {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    opacity: 0;
  }

  .hero-letter-line::before,
  .hero-letter-line::after {
    content: "";
    position: absolute;
    top: 0;
    height: 100%;
    width: 1px;
    font-size: clamp(4rem, 8vw, 6.5rem);
    background: linear-gradient(
      to bottom,
      rgba(207, 212, 215, 0) 0%,
      rgba(207, 212, 215, 0) calc(var(--letter-line-center) - 0.85em),
      #cfd4d7 calc(var(--letter-line-center) - 0.5em),
      #cfd4d7 calc(var(--letter-line-center) + 0.5em),
      rgba(207, 212, 215, 0) calc(var(--letter-line-center) + 0.85em),
      rgba(207, 212, 215, 0) 100%
    );

    @media screen and (max-width: 700px) {
      font-size: 2.25rem;
    }
  }

  .hero-letter-line::before {
    left: var(--letter-line-left);
  }

  .hero-letter-line::after {
    left: var(--letter-line-right);
  }

  // .word-card {
  //   padding: 0.5rem 0.75rem;
  //   cursor: grab;
  // }

  .word-card:active {
    cursor: grabbing;
  }

  .letter-shell {
    --letter-line-left-offset: -0.06em;
    --letter-line-right-offset: -0.06em;
    --letter-grip-top: calc(100% + 0.06em);
    position: relative;
    z-index: 1;
    display: inline-block;
    padding: 0;
    margin: 0;
    line-height: 1;
    user-select: none;
    cursor: grab;
    touch-action: none;


  }

  #snapsort-letter-0 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.05em;
  }

  #snapsort-letter-1 {
    --letter-line-left-offset: 0.07em;
    --letter-line-right-offset: 0.07em;
  }

  #snapsort-letter-2 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  #snapsort-letter-3 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  #snapsort-letter-4 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  #snapsort-letter-5 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  #snapsort-letter-6 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  #snapsort-letter-7 {
    --letter-line-left-offset: 0.06em;
    --letter-line-right-offset: 0.06em;
  }

  .letter-shell:active {
    cursor: grabbing;
  }

  .title-text {
    font-size: clamp(4rem, 8vw, 6.5rem);
    line-height: 1;
    // font-weight: 800;

    @media screen and (max-width: 700px) {
      font-size: 2.25rem;
    }
  }

  .title-glyph {
    display: block;
    line-height: 1;
  }

  .letter-grip {
    position: absolute;
    top: var(--letter-grip-top);
    left: 50%;
    transform: translateX(-50%);
    display: grid;
    grid-template-columns: repeat(3, 0.34em);
    grid-template-rows: repeat(2, 0.34em);
    gap: 0.15em;
    justify-content: center;
    font-size: inherit;
    opacity: 0.62;

    @media screen and (max-width: 700px) {
      display: none;
    }
  }

  .letter-grip-dot {
    display: block;
    width: 0.34em;
    height: 0.34em;
    border-radius: 50%;
    background: #cfd4d7;
  }

  .hero-copy {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.8rem;
    margin-top: 2.5rem;
  }

  .hero-copy p {
    max-width: 500px;
  }

  /* Examples Section */
  .examples-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(3, minmax(0, auto));
    grid-template-areas:
      "pm pm sentence"
      "kanban kanban kanban"
      "editor editor editor";
    gap: var(--size-24);
    width: 100%;
    max-width: 1200px;
    margin: 7rem auto 4rem;
  }

  .example-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    background-color: var(--color-background-tint);
    border-radius: var(--ui-radius);
    padding: var(--size-32);
    user-select: none;
    justify-content: center;
  }

  .example-card h3 {
    color: #8f9497;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
    margin: 0;
  }

  .pm-example {
    grid-area: pm;
  }

  .kanban-example {
    grid-area: kanban;
  }

  .sentence-example {
    grid-area: sentence;
  }

  .editor-example {
    grid-area: editor;
    position: relative;
    gap: 0;
    justify-content: stretch;
    min-height: 470px;
  }

  .editor-title {
    position: absolute;
    top: var(--size-32);
    left: var(--size-32);
    z-index: 1;
  }

  @media (max-width: 720px) {
    .examples-grid {
      display: flex;
      flex-direction: column;
      margin: 2rem 0;
    }

    .kanban-example {
      display: none;
    }
  }

  /* Sentence Builder */
  .sentence-builder {
    padding: var(--size-24);
    display: flex;
    flex-direction: column;
    gap: var(--size-16);
    background: white;
    min-height: 300px;
    touch-action: none;
  }

  .prompt-section {
    --card-color: #232526;
    --display-text-color: #e8e6dc;
    font-family: "Bitcount Grid Single", monospace;
  }

  .english-sentence {
    span {
      color: #ffffff;
      font-family: inherit;
    }
  }

  .sentence-container-area {
    width: 100%;
    flex: 1;
    min-height: 116px;
  }

  .sentence-builder :global(.sentence-workspace-root) {
    width: 100%;
    height: 100%;
    align-items: stretch;
    justify-content: space-between;
  }

  .sentence-builder :global(.sentence-drop-zone),
  .sentence-builder :global(.sentence-source-zone) {
    position: relative;
    width: 100%;
    min-height: 38px;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--size-4);
  }

  .sentence-builder :global(.sentence-drop-zone) {
    border-bottom: 2px solid #eee;
    padding-bottom: var(--size-2);
    align-items: flex-start;
    align-content: flex-start;
  }

  .sentence-builder :global(.sentence-source-zone) {
    align-content: flex-start;
    justify-content: center;
    margin-top: auto;
    padding: var(--size-16) 0 0;
  }

  .sentence-builder :global(.sentence-tile-wrapper) {
    padding: 0.15rem;
  }

  .sentence-builder :global(.sentence-tile-ghost) {
    background: #d8dde0;
    border-radius: 4px;
    opacity: 0.55;
  }

  .sentence-word {
    background: #ffffff;
    border: 1px solid #ddd;
    padding: 2px 4px;
    border-radius: 4px;
    cursor: grab;
    touch-action: none;
    font-family: "DotGothic16", sans-serif;
    box-shadow: 0 3px 0 0 #d8dde0;
    color: #232526;
    font-size: 1rem;
    line-height: 1.2;
  }

  .sentence-word:active {
    cursor: grabbing;
  }

  .sentence-word.selected {
    box-shadow: 0 3px 0 0 #b9c3ca;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: auto;
  }

  .check-btn {
    width: 100%;
    padding: 0.5rem 1.5rem;
    --button-color: var(--color-primary);
    // background: #3a2a22;
    color: white;
    // border: none;
    // border-radius: 4px;
    cursor: pointer;
    // font-weight: 600;
    // font-family: inherit;
  }

  .check-btn.success {
    --button-color: #2e7d32;
  }

  /* Editor Builder */
  .editor-builder {
    display: grid;
    grid-template-columns: minmax(180px, 240px) minmax(0, 1fr);
    gap: var(--size-24);
    min-height: 406px;
    padding-top: 2.2rem;
  }

  .editor-palette {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-content: start;
    gap: 0.65rem;
    padding: var(--size-16);
  }

  .editor-tool {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    min-height: 74px;
    padding: 0.75rem 0.55rem;
    border: 1px solid #d5d8dc;
    border-radius: var(--ui-radius);
    background: #ffffff;
    color: #232526;
    box-shadow: none;
    cursor: pointer;
  }

  .editor-tool:hover {
    border-color: var(--color-primary);
  }

  .editor-tool :global(.material-symbols-rounded) {
    font-family: "Material Symbols Rounded";
    font-size: 1.25rem;
    line-height: 1;
    font-style: normal;
    font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24;
  }

  .editor-tool span {
    font-size: 0.82rem;
    line-height: 1;
  }

  .editor-canvas {
    --card-color: #eef0f2;
    display: flex;
    flex-direction: column;
    justify-self: center;
    min-width: 0;
    width: min(calc(100% - 3rem), 640px);
    align-self: stretch;
    padding: var(--size-32);
    margin-inline: 1.5rem;
    box-sizing: border-box;
    background: var(--card-color);
  }

  .editor-canvas-header {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .editor-canvas-title {
    margin: 0;
    color: #232526;
    font-family: "Bitcount Grid Single", monospace !important;
    font-size: 2.8rem;
    font-weight: 300;
    line-height: 1;
  }

  .editor-canvas :global(.editor-field-list) {
    width: 100%;
    align-items: stretch;
    gap: 1.25rem;
  }

  .editor-canvas :global(.editor-field-list .snapsort-item) {
    width: 100%;
    align-items: stretch;
    padding: 0;
  }

  .editor-field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 1rem;
    padding: 1rem;
    background: #ffffff;
    border: 1px solid #d5d8dc;
    border-radius: var(--ui-radius);
    cursor: grab;
    touch-action: none;
  }

  .editor-field:active {
    cursor: grabbing;
  }

  .editor-field-main {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: stretch;
    gap: 0.85rem;
    min-width: 0;
  }

  .editor-question-input {
    font-weight: 600;
    pointer-events: auto;
    min-width: 0;
  }

  .editor-field input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),
  .editor-field textarea {
    width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.55rem 0.8rem;
  }

  .editor-field textarea {
    resize: none;
    font-family: "Geist", sans-serif;
    font-size: 1rem;
    border: 1px solid #d5d8dc;
    border-radius: var(--ui-radius);
    background: #ffffff;
    box-shadow: none;
  }

  .editor-field input,
  .editor-field textarea {
    pointer-events: none;
  }

  .editor-field .editor-question-input {
    pointer-events: auto;
  }

  .editor-canvas :global(.editor-option-stack) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.45rem;
    min-width: 0;
    width: 100%;
  }

  .editor-canvas :global(.editor-option-item) {
    width: 100%;
    align-items: stretch;
    padding: 0;
  }

  .editor-option-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    gap: 0.55rem;
    width: 100%;
    cursor: grab;
    touch-action: none;
  }

  .editor-option-row:active {
    cursor: grabbing;
  }

  .editor-option-row :global(label) {
    margin: 0;
  }

  .editor-field .editor-option-input {
    pointer-events: auto;
  }

  .editor-option-action,
  .editor-add-option {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: fit-content;
    min-height: 0;
    padding: 0.25rem 0.45rem;
    font-size: 0.78rem;
    line-height: 1;
    border: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .editor-option-action {
    padding: 0.25rem;
    color: #c7472f;
  }

  .editor-option-action :global(.material-symbols-rounded),
  .editor-add-option :global(.material-symbols-rounded),
  .editor-option-type-icon,
  .editor-option-grip {
    font-family: "Material Symbols Rounded";
    font-size: 1rem;
    line-height: 1;
    font-style: normal;
    font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 20;
  }

  .editor-option-type-icon,
  .editor-option-grip {
    color: #8f9497;
  }

  .editor-add-option {
    justify-self: start;
    margin-top: 0.1rem;
    pointer-events: auto;
    color: var(--color-primary);
    font-weight: 500;
  }

  .editor-rating-preview {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: center;
    gap: 0.2rem;
    width: 100%;
    padding: 0.3rem 0;
    color: #b8bec2;
  }

  .editor-rating-preview :global(.material-symbols-rounded) {
    font-family: "Material Symbols Rounded";
    font-size: 1.7rem;
    line-height: 1;
    font-style: normal;
    font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24;
  }

  .editor-rating-preview :global(.material-symbols-rounded.filled) {
    color: var(--color-primary);
    font-variation-settings: "FILL" 1, "wght" 500, "GRAD" 0, "opsz" 24;
  }

  .editor-field-grip {
    font-family: "Material Symbols Rounded";
    font-size: 1.2rem;
    line-height: 1;
    color: #8f9497;
    padding-top: 0.15rem;
  }

  @media (max-width: 720px) {
    .editor-title {
      position: static;
      align-self: flex-end;
      margin-bottom: 1rem;
    }

    .editor-builder {
      grid-template-columns: 1fr;
      padding-top: 0;
    }

    .editor-palette {
      padding: var(--size-16);
    }

    .editor-field-main {
      gap: 0.55rem;
    }
  }

  /* Project List */
  .project-list {
    padding: 1rem;
    background: transparent;
    // height: 100%;
  }

  .project-list :global(.snapsort-container) {
    align-items: stretch;
    width: 100%;
  }

  .project-list :global(.snapsort-item) {
    align-items: stretch;
    width: 100%;
    padding-inline: 0;
  }

  .project-card {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid rgb(219, 219, 219);
    border-radius: var(--ui-radius);
    cursor: grab;
    touch-action: none;
    width: 100%;
    box-sizing: border-box;
    box-shadow: 0 1px 0 rgba(35, 37, 38, 0.04);
  }

  .project-card:active {
    cursor: grabbing;
  }

  .project-text {
    color: #232526;
    font-size: 0.8rem;
    font-weight: 500;
    line-height: 1.15;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-card.checked .project-text {
    color: #747a7d;
    text-decoration: line-through;
    text-decoration-thickness: 1.5px;
    text-decoration-color: #747a7d;
  }

  .project-meta {
    display: grid;
    grid-template-columns: repeat(3, max-content);
    gap: 0.55rem;
    color: #8f9497;
    font-size: 0.58rem;
    line-height: 1;
    justify-self: end;
  }

  .project-meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.28rem;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .project-meta-item :global(.material-symbols-rounded) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "Material Symbols Rounded";
    color: var(--todo-icon-color);
    font-size: inherit;
    font-weight: 500;
    line-height: 1;
    font-style: normal;
    font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 20;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    font-feature-settings: "liga";
  }

  .project-meta-item:nth-child(1) {
    --todo-icon-color: #4f8fc7;
  }

  .project-meta-item:nth-child(2) {
    --todo-icon-color: #d1843f;
  }

  .project-meta-item:nth-child(3) {
    --todo-icon-color: #5a9b73;
  }

  .project-card.checked .project-meta {
    color: #a3a8ab;
  }

  .project-list :global(label) {
    margin: 0;
  }

  @media (max-width: 720px) {
    .project-meta {
      grid-template-columns: repeat(2, max-content);
    }

    .project-meta-item:nth-child(2) {
      display: none;
    }
  }

  /* Kanban Board */
  .kanban-board {
    display: flex;
    height: 100%;
  }

  .kanban-board > :global(.snapsort-container) {
    width: 100%;
    gap: 1rem;
    flex-wrap: nowrap;
    align-items: stretch;
  }

  .kanban-board :global(.kanban-column) {
    flex: 1;
    padding: 1rem;
    min-height: 600px;
    align-items: stretch;
    border: 1px solid #c7cccf;
    border-radius: var(--ui-radius);
    background: transparent;
  }

  .kanban-board :global(.kanban-column .snapsort-item) {
    align-items: stretch;
    width: 100%;
    padding-inline: 0;
  }

  .kanban-board :global(.kanban-column h4) {
    margin: 0 0 1rem 0;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.9rem;
    font-weight: 300;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8f9497;
  }

  .kanban-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    cursor: grab;
    touch-action: none;
    width: 100%;
    box-sizing: border-box;
  }

  .kanban-card:active {
    cursor: grabbing;
  }

  .kanban-header {
    display: flex;
    align-items: center;
  }

  .kanban-title {
    font-weight: 600;
    font-size: 1.05rem;
    color: #232526;
    margin: 0;
  }

  .kanban-desc {
    margin: 0;
    font-size: 0.9rem;
    color: #232526;
    line-height: 1.3;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .kanban-footer {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding-top: 0.45rem;
  }

  .kanban-avatar {
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--avatar-color);
    color: white;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.67rem;
    font-weight: 300;
    line-height: 1;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
  }

  .kanban-meta {
    display: grid;
    grid-template-columns: repeat(3, max-content);
    gap: 0.65rem;
    justify-self: end;
    color: #232526;
    font-size: 0.9rem;
    line-height: 1;
  }

  .kanban-meta-item {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.18rem;
    color: inherit;
    font-size: inherit;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .kanban-meta-item :global(.material-symbols-rounded) {
    flex: 0 0 auto;
    font-family: "Material Symbols Rounded";
    color: currentColor;
    font-size: inherit;
    font-weight: 500;
    line-height: 1;
  }

</style>
