<script lang="ts">
  import { onMount } from "svelte";
  import ClientDemoFrame from "$lib/components/ClientDemoFrame.svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Container, Item } from "@snap-engine/snapsort-svelte";
  import type {
    Container as SnapSortContainer,
    ItemMoveEvent,
  } from "@snap-engine/snapsort";

  type PreviewEntry = {
    id: string;
    label: string;
    tag?: string;
    color?: string;
  };

  type PreviewGroup = {
    id: string;
    label: string;
    items: PreviewEntry[];
    container?: SnapSortContainer;
  };

  const pendingPlusCells = Array.from({ length: 96 }, (_, index) => index);
  const previewAnimation = {
    reorder: {
      duration: 700,
      timing_function: "cubic-bezier(0.22, 1, 0.36, 1)",
    },
  };

  let kanbanGroups: PreviewGroup[] = $state([
    {
      id: "preview-kanban-queue",
      label: "Queue",
      items: [
        { id: "preview-kanban-motion", label: "Review motion", tag: "UX" },
        { id: "preview-kanban-copy", label: "Polish copy", tag: "DOC" },
      ],
    },
    {
      id: "preview-kanban-done",
      label: "Done",
      items: [{ id: "preview-kanban-layout", label: "Ship layout", tag: "UI" }],
    },
  ]);

  let sentenceGroups: PreviewGroup[] = $state([
    {
      id: "preview-sentence-answer",
      label: "Answer",
      items: [
        { id: "preview-word-drag", label: "Drag" },
        { id: "preview-word-any", label: "any" },
      ],
    },
    {
      id: "preview-sentence-bank",
      label: "Word bank",
      items: [
        { id: "preview-word-element", label: "element" },
        { id: "preview-word-into", label: "into" },
        { id: "preview-word-place", label: "place" },
      ],
    },
  ]);

  let previewTiles: PreviewEntry[] = $state([
    { id: "preview-tile-primary", label: "01", color: "#ff5d0f" },
    { id: "preview-tile-secondary", label: "02", color: "#f34336" },
    { id: "preview-tile-accent", label: "03", color: "#ff0e56" },
    { id: "preview-tile-muted", label: "04", color: "#7f8286" },
  ]);
  let tileContainer: SnapSortContainer | undefined = $state();

  let previewFiles: PreviewEntry[] = $state([
    { id: "preview-file-src", label: "▾ src", tag: "folder" },
    { id: "preview-file-components", label: "▾ components", tag: "folder-nested" },
    { id: "preview-file-card", label: "Card.svelte", tag: "file-nested-deep" },
    { id: "preview-file-theme", label: "theme.scss", tag: "file-nested" },
    { id: "preview-file-package", label: "package.json", tag: "file" },
  ]);
  let fileContainer: SnapSortContainer | undefined = $state();

  let editorGroups: PreviewGroup[] = $state([
    {
      id: "preview-editor-tools",
      label: "Tools",
      items: [
        { id: "preview-editor-text", label: "Text" },
        { id: "preview-editor-choice", label: "Choice" },
        { id: "preview-editor-date", label: "Date" },
      ],
    },
    {
      id: "preview-editor-canvas",
      label: "Form",
      items: [],
    },
  ]);

  let pointerInside = $state(false);
  let focusInside = $state(false);
  let previewPanX = $state(-12);
  let previewPanY = $state(-104);
  let prefersReducedMotion = $state(false);
  let documentVisible = $state(true);
  const previewRequested = $derived(pointerInside || focusInside);
  const previewMotionActive = $derived(
    previewRequested && !prefersReducedMotion && documentVisible,
  );

  let automationTimer: ReturnType<typeof setTimeout> | null = null;
  let automationStep = 0;
  let kanbanForward = true;
  let sentenceForward = true;
  let fileForward = true;
  let editorForward = true;

  function handlePreviewPointerMove(event: MouseEvent) {
    if (prefersReducedMotion) return;

    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const xProgress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const yProgress = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

    previewPanX = -4 - xProgress * 60;
    previewPanY = -18 - yProgress * 234;
  }

  function handlePreviewPointerLeave() {
    pointerInside = false;
    previewPanX = -12;
    previewPanY = -104;
  }

  function movePreviewEntry(
    groups: PreviewGroup[],
    itemId: string,
    targetGroupId: string,
    targetIndex: number,
  ): PreviewGroup[] {
    let movedItem: PreviewEntry | undefined;
    const withoutMovedItem = groups.map((group) => {
      const sourceIndex = group.items.findIndex((item) => item.id === itemId);
      if (sourceIndex === -1) return group;

      const items = group.items.slice();
      [movedItem] = items.splice(sourceIndex, 1);
      return { ...group, items };
    });

    if (!movedItem) return groups;
    const entry = movedItem;

    return withoutMovedItem.map((group) => {
      if (group.id !== targetGroupId) return group;

      const items = group.items.slice();
      const index = Math.max(0, Math.min(targetIndex, items.length));
      items.splice(index, 0, entry);
      return { ...group, items };
    });
  }

  function handleKanbanMove(event: ItemMoveEvent) {
    const targetGroupId = event.to.containerMetadata.previewGroupId;
    if (typeof targetGroupId !== "string") return;

    kanbanGroups = movePreviewEntry(
      kanbanGroups,
      String(event.itemId),
      targetGroupId,
      event.to.index,
    );
  }

  function handleSentenceMove(event: ItemMoveEvent) {
    const targetGroupId = event.to.containerMetadata.previewGroupId;
    if (typeof targetGroupId !== "string") return;

    sentenceGroups = movePreviewEntry(
      sentenceGroups,
      String(event.itemId),
      targetGroupId,
      event.to.index,
    );
  }

  function handleTileMove(event: ItemMoveEvent) {
    const itemId = String(event.itemId);
    const movedItem = previewTiles.find((item) => item.id === itemId);
    if (!movedItem) return;

    const items = previewTiles.filter((item) => item.id !== itemId);
    const index = Math.max(0, Math.min(event.to.index, items.length));
    items.splice(index, 0, movedItem);
    previewTiles = items;
  }

  function handleFileMove(event: ItemMoveEvent) {
    const itemId = String(event.itemId);
    const movedItem = previewFiles.find((item) => item.id === itemId);
    if (!movedItem) return;

    const items = previewFiles.filter((item) => item.id !== itemId);
    const index = Math.max(0, Math.min(event.to.index, items.length));
    items.splice(index, 0, movedItem);
    previewFiles = items;
  }

  function handleEditorMove(event: ItemMoveEvent) {
    const targetGroupId = event.to.containerMetadata.previewGroupId;
    if (typeof targetGroupId !== "string") return;

    editorGroups = movePreviewEntry(
      editorGroups,
      String(event.itemId),
      targetGroupId,
      event.to.index,
    );
  }

  function moveBetweenGroups(
    groups: PreviewGroup[],
    sourceIndex: number,
    targetIndex: number,
  ): boolean {
    const source = groups[sourceIndex];
    const target = groups[targetIndex];
    const item = source?.items[0];
    if (!source?.container || !target?.container || !item) return false;

    return runAnimatedImperativeMove(
      () =>
        source.container!.moveItem(
          item.id,
          target.container!,
          target.items.length,
        ),
      `[data-preview-entry-id^="${item.id.split("-").slice(0, 2).join("-")}-"]`,
    );
  }

  function runAnimatedImperativeMove(
    move: () => boolean,
    selector: string,
  ): boolean {
    const firstRects = new Map<string, DOMRect>();
    document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      const itemId = element.dataset.previewEntryId;
      if (itemId) firstRects.set(itemId, element.getBoundingClientRect());
    });

    let observer: MutationObserver | undefined;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    const playFallbackAnimation = () => {
      observer?.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);

      const scaleElement = document.querySelector<HTMLElement>(
        ".snapsort-preview-scale",
      );
      const scale = scaleElement
        ? scaleElement.getBoundingClientRect().width / scaleElement.offsetWidth
        : 1;

      document.querySelectorAll<HTMLElement>(selector).forEach((element) => {
        const itemId = element.dataset.previewEntryId;
        const first = itemId ? firstRects.get(itemId) : undefined;
        if (!first) return;

        const last = element.getBoundingClientRect();
        const deltaX = (first.left - last.left) / scale;
        const deltaY = (first.top - last.top) / scale;
        if (Math.hypot(deltaX, deltaY) < 2) return;

        element.animate(
          [
            { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
            { transform: "translate3d(0, 0, 0)" },
          ],
          {
            duration: previewAnimation.reorder.duration,
            easing: previewAnimation.reorder.timing_function,
          },
        );
      });
    };

    if (!prefersReducedMotion) {
      const mosaic = document.querySelector(".preview-mosaic");
      if (mosaic) {
        observer = new MutationObserver(playFallbackAnimation);
        observer.observe(mosaic, { childList: true, subtree: true });
        fallbackTimer = setTimeout(playFallbackAnimation, 120);
      }
    }

    const moved = move();
    if (!moved) {
      observer?.disconnect();
      if (fallbackTimer) clearTimeout(fallbackTimer);
    }

    return moved;
  }

  function runAutomationStep() {
    const cycleStep = automationStep % 6;

    if (cycleStep === 0 || cycleStep === 3) {
      const moved = moveBetweenGroups(
        kanbanGroups,
        kanbanForward ? 0 : 1,
        kanbanForward ? 1 : 0,
      );
      if (moved) kanbanForward = !kanbanForward;
    } else if (cycleStep === 1 && fileContainer) {
      const moved = runAnimatedImperativeMove(
        () =>
          fileContainer!.moveItem(
            "preview-file-card",
            fileContainer!,
            fileForward ? previewFiles.length : 2,
          ),
        '[data-preview-entry-id^="preview-file-"]',
      );
      if (moved) fileForward = !fileForward;
    } else if (cycleStep === 2 && tileContainer && previewTiles[0]) {
      runAnimatedImperativeMove(
        () =>
          tileContainer!.moveItem(
            previewTiles[0].id,
            tileContainer!,
            previewTiles.length,
          ),
        '[data-preview-entry-id^="preview-tile-"]',
      );
    } else if (cycleStep === 4) {
      const moved = moveBetweenGroups(
        editorGroups,
        editorForward ? 0 : 1,
        editorForward ? 1 : 0,
      );
      if (moved) editorForward = !editorForward;
    } else if (cycleStep === 5) {
      const moved = moveBetweenGroups(
        sentenceGroups,
        sentenceForward ? 1 : 0,
        sentenceForward ? 0 : 1,
      );
      if (moved) sentenceForward = !sentenceForward;
    }

    automationStep += 1;
  }

  function stopAutomation() {
    if (automationTimer === null) return;
    clearTimeout(automationTimer);
    automationTimer = null;
  }

  function scheduleAutomation(delay = 800) {
    stopAutomation();
    if (!previewMotionActive) return;

    automationTimer = setTimeout(() => {
      automationTimer = null;
      if (!previewMotionActive) return;
      runAutomationStep();
      scheduleAutomation();
    }, delay);
  }

  $effect(() => {
    if (!previewMotionActive) {
      stopAutomation();
      return;
    }

    scheduleAutomation(400);
    return stopAutomation;
  });

  onMount(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReducedMotion = () => {
      prefersReducedMotion = reducedMotionQuery.matches;
    };
    const syncVisibility = () => {
      documentVisible = document.visibilityState === "visible";
    };

    syncReducedMotion();
    syncVisibility();
    reducedMotionQuery.addEventListener("change", syncReducedMotion);
    document.addEventListener("visibilitychange", syncVisibility);

    return () => {
      stopAutomation();
      reducedMotionQuery.removeEventListener("change", syncReducedMotion);
      document.removeEventListener("visibilitychange", syncVisibility);
    };
  });
</script>

<section id="assets" class="assets-showcase landing-section-gap">
  <div class="assets-header">
    <h2 class="eyebrow landing-section-heading">Composable Assets</h2>
    <p class="subhead">
      Start with reusable patterns built on SnapEngine, then shape them into
      the exact interface your UI needs.
    </p>
  </div>

  <div class="assets-grid">
    <article
      class="asset-card drop-snap-card"
      data-preview-active={previewMotionActive}
      data-preview-hovered={previewRequested}
      style={`--preview-pan-x: ${previewPanX}px; --preview-pan-y: ${previewPanY}px;`}
      onmouseenter={() => (pointerInside = true)}
      onmousemove={handlePreviewPointerMove}
      onmouseleave={handlePreviewPointerLeave}
      onfocusin={() => (focusInside = true)}
      onfocusout={() => (focusInside = false)}
    >
      <div class="asset-copy">
        <div class="asset-card-header">
          <h3>SnapSort</h3>
        </div>
        <p>Drag and drop any element</p>
        <a class="button primary learn-more-button" href="/snapsort">Learn more</a>
      </div>

      <div class="asset-preview snapsort-asset-preview">
        <div class="snapsort-preview-window" aria-hidden="true">
          <div class="snapsort-preview-pan">
            <div class="snapsort-preview-scale">
              <ClientDemoFrame>
                {#snippet fallback()}
                  <div class="preview-mosaic preview-skeleton-mosaic">
                    {#each Array.from({ length: 7 }) as _, index}
                      <div class:preview-skeleton-wide={index === 0 || index === 5}>
                        <span></span><span></span><span></span>
                      </div>
                    {/each}
                  </div>
                {/snippet}

                <Engine
                  id="assets-snapsort-preview-engine"
                  className="preview-engine"
                  style="height:auto;"
                >
                  <div class="preview-mosaic">
                    <article class="preview-panel preview-panel-wide preview-panel-tall preview-kanban-panel">
                      <header><strong>Kanban</strong><span>3 cards</span></header>
                      <div class="preview-kanban-board">
                        {#each kanbanGroups as group (group.id)}
                          <Container
                            bind:container={group.container}
                            className="preview-kanban-column"
                            items={group.items}
                            getItemId={(item) => item.id}
                            metadata={{ previewGroupId: group.id }}
                            config={{
                              direction: "column",
                              groupID: "assets-preview-kanban",
                              animation: previewAnimation,
                              callbacks: { onItemMove: handleKanbanMove },
                            }}
                          >
                            {#snippet before()}
                              <h5>{group.label}</h5>
                            {/snippet}
                            {#snippet entry(item)}
                              <Item itemId={item.id} className="preview-kanban-item">
                                <div class="preview-task-card" data-preview-entry-id={item.id}>
                                  <div class="preview-task-header">
                                    <span>{item.label}</span>
                                    <small>{item.tag}</small>
                                  </div>
                                  <p>Polish the interaction before the next release.</p>
                                  <div class="preview-task-footer"><i>SE</i><span>Jul 19 · 2</span></div>
                                </div>
                              </Item>
                            {/snippet}
                          </Container>
                        {/each}
                      </div>
                    </article>

                    <article class="preview-panel preview-panel-tall preview-sentence-panel">
                      <header><strong>Sentence</strong><span>Words</span></header>
                      <div class="preview-sentence-board">
                        {#each sentenceGroups as group (group.id)}
                          <div class="preview-sentence-group">
                            <small>{group.label}</small>
                            <Container
                              bind:container={group.container}
                              className="preview-sentence-zone"
                              items={group.items}
                              getItemId={(item) => item.id}
                              metadata={{ previewGroupId: group.id }}
                              config={{
                                direction: "row",
                                groupID: "assets-preview-sentence",
                                animation: previewAnimation,
                                callbacks: { onItemMove: handleSentenceMove },
                              }}
                            >
                              {#snippet entry(item)}
                                <Item itemId={item.id} className="preview-word-item">
                                  <span class="preview-word" data-preview-entry-id={item.id}>{item.label}</span>
                                </Item>
                              {/snippet}
                            </Container>
                          </div>
                        {/each}
                      </div>
                    </article>

                    <article class="preview-panel preview-file-panel">
                      <header><strong>Files</strong><span>Tree</span></header>
                      <Container
                        bind:container={fileContainer}
                        className="preview-file-tree"
                        items={previewFiles}
                        getItemId={(item) => item.id}
                        config={{
                          direction: "column",
                          groupID: "assets-preview-files",
                          disableFlip: true,
                          animation: previewAnimation,
                          callbacks: { onItemMove: handleFileMove },
                        }}
                      >
                        {#snippet entry(item)}
                          <Item itemId={item.id} className="preview-file-item">
                            <span
                              class:folder={item.tag?.startsWith("folder")}
                              class:nested={item.tag?.includes("nested")}
                              class:nested-deep={item.tag === "file-nested-deep"}
                              class:active={item.id === "preview-file-card"}
                              data-preview-entry-id={item.id}
                            >{item.label}</span>
                          </Item>
                        {/snippet}
                      </Container>
                    </article>

                    <article class="preview-panel preview-swap-panel">
                      <header><strong>Tile grid</strong><span>Reorder</span></header>
                      <Container
                        bind:container={tileContainer}
                        className="preview-tile-grid"
                        items={previewTiles}
                        getItemId={(item) => item.id}
                        config={{
                          direction: "row",
                          groupID: "assets-preview-tiles",
                          disableFlip: true,
                          animation: previewAnimation,
                          callbacks: { onItemMove: handleTileMove },
                        }}
                      >
                        {#snippet entry(item)}
                          <Item itemId={item.id} className="preview-tile-item">
                            <span data-preview-entry-id={item.id} style={`--preview-tile-color: ${item.color};`}>{item.label}</span>
                          </Item>
                        {/snippet}
                      </Container>
                    </article>

                    <article class="preview-panel preview-trash-panel">
                      <header><strong>Trash it</strong><span>Drop effect</span></header>
                      <div class="preview-trash-list">
                        <span><i></i>Draft header</span>
                        <span><i></i>Old mock-up</span>
                      </div>
                      <div class="preview-trash-target">⌫ &nbsp; Drop to delete</div>
                    </article>

                    <article class="preview-panel preview-panel-wide preview-panel-tall preview-editor-panel">
                      <header><strong>Editor</strong><span>Form builder</span></header>
                      <div class="preview-editor-layout">
                        {#each editorGroups as group (group.id)}
                          <Container
                            bind:container={group.container}
                            className={group.id === "preview-editor-tools" ? "preview-editor-tools" : "preview-editor-canvas card shallow"}
                            items={group.items}
                            getItemId={(item) => item.id}
                            metadata={{ previewGroupId: group.id }}
                            config={{
                              direction: "column",
                              groupID: "assets-preview-editor",
                              animation: previewAnimation,
                              callbacks: { onItemMove: handleEditorMove },
                            }}
                          >
                            {#snippet before()}
                              {#if group.id === "preview-editor-canvas"}
                                <small>Customer feedback</small>
                              {/if}
                            {/snippet}
                            {#snippet entry(item)}
                              <Item itemId={item.id} className="preview-editor-item">
                                <span class="preview-editor-control" data-preview-entry-id={item.id}>{item.label}</span>
                              </Item>
                            {/snippet}
                            {#snippet after()}
                              {#if group.id === "preview-editor-canvas"}
                                <div class="preview-input-line"></div>
                                <div class="preview-choice-row"><i></i><span>Excellent</span></div>
                                <div class="preview-choice-row"><i></i><span>Good</span></div>
                              {/if}
                            {/snippet}
                          </Container>
                        {/each}
                      </div>
                    </article>

                    <article class="preview-panel preview-clone-panel">
                      <header><strong>Clone</strong><span>Copy</span></header>
                      <div class="preview-clone-blocks">
                        <span class="heading-block">Heading</span>
                        <span class="image-block">Image</span>
                        <span class="button-block">Button</span>
                      </div>
                      <div class="preview-clone-canvas">Drop blocks here</div>
                    </article>
                  </div>
                </Engine>
              </ClientDemoFrame>
            </div>
          </div>
        </div>
      </div>
    </article>

    <div class="asset-card planned-card">
      <div class="asset-copy">
        <div class="asset-card-header">
          <h3>SnapZap</h3>
        </div>
        <p>Zoom and pan made simple</p>
      </div>
      <div class="asset-preview pending-preview" aria-hidden="true">
        <div class="pending-plus-grid">
          {#each pendingPlusCells as cell (cell)}
            <span>+</span>
          {/each}
        </div>
        <span>Coming soon</span>
      </div>
    </div>

    <div class="asset-card planned-card">
      <div class="asset-copy">
        <div class="asset-card-header">
          <h3>SnapLine</h3>
        </div>
        <p>Node-based UI</p>
      </div>
      <div class="asset-preview pending-preview" aria-hidden="true">
        <div class="pending-plus-grid">
          {#each pendingPlusCells as cell (cell)}
            <span>+</span>
          {/each}
        </div>
        <span>Coming soon</span>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  @use "../landing.scss";

  .assets-header {
    width: min(100%, 760px);
    margin: 0 auto;
    text-align: center;
  }

  .eyebrow {
    margin: 0 0 var(--size-16);
    text-align: center;
  }

  .subhead {
    max-width: 620px;
    margin: 0 auto;
    color: #5d6266;
    font-size: clamp(1rem, 1.3vw, 1.18rem);
    line-height: 1.7;
    text-align: center;
  }

  .assets-showcase {
    --assets-content-gap: clamp(2rem, 4vw, 3rem);
    margin-bottom: clamp(3rem, 6vw, 6rem);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
    margin-top: var(--assets-content-gap);
    text-align: left;
  }

  .asset-card {
    --asset-card-padding: clamp(1.5rem, 3vw, 2.5rem);

    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--size-24);
    padding: var(--asset-card-padding);
    border-radius: var(--ui-radius);
    background: var(--color-background-tint);
    color: inherit;
    text-decoration: none;
    box-sizing: border-box;

    h3 {
      margin: 0;
      font-family: "Geist Pixel Circle", "Doto", sans-serif;
      font-size: clamp(1.75rem, 3vw, 2.75rem);
      font-weight: 500;
      letter-spacing: 0;
      line-height: 0.95;
    }

    p {
      max-width: 22rem;
      margin: 0;
      color: #5d6266;
      font-size: clamp(0.95rem, 1.1vw, 1.05rem);
      font-weight: 400;
      line-height: 1.6;
    }
  }

  .planned-card {
    min-height: 0;
  }

  .drop-snap-card {
    position: relative;
    gap: 0;
    padding: 0;
    overflow: hidden;
  }

  .drop-snap-card .asset-copy {
    padding: var(--asset-card-padding) var(--asset-card-padding) var(--size-16);
  }

  .asset-copy {
    position: relative;
    z-index: 5;
    min-width: 0;
  }

  .asset-card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--size-12);
    margin-bottom: var(--size-16);
  }

  .learn-more-button {
    display: inline-flex;
    align-self: flex-start;
    margin-top: var(--size-24);
    color: #ffffff;
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.2;
    text-decoration: none;
  }

  .asset-preview {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 180px;
  }

  .snapsort-asset-preview {
    min-height: 360px;
  }

  .snapsort-preview-window {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    user-select: none;
  }

  .snapsort-preview-window::before {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;
    z-index: 4;
    height: 72px;
    background: linear-gradient(
      to bottom,
      var(--color-background-tint) 5%,
      color-mix(in srgb, var(--color-background-tint) 82%, transparent) 54%,
      transparent 100%
    );
    content: "";
  }

  .snapsort-preview-window::after {
    position: absolute;
    inset: 0;
    z-index: 5;
    box-shadow: inset 0 0 var(--size-24) var(--size-12) var(--color-background-tint);
    content: "";
    pointer-events: none;
  }

  .snapsort-preview-pan {
    position: absolute;
    top: 0;
    left: 0;
    width: 1084px;
    transform: translate3d(var(--preview-pan-x), var(--preview-pan-y), 0);
    transition: transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .snapsort-preview-scale {
    width: 1084px;
    filter: grayscale(1) saturate(0.15) contrast(0.94);
    transform: scale(0.42);
    transform-origin: top left;
    transition: filter 320ms ease;
  }

  .drop-snap-card[data-preview-hovered="true"] .snapsort-preview-scale {
    filter: grayscale(0) saturate(1.05) contrast(1);
  }

  :global(.preview-engine) {
    width: 1084px;
  }

  .preview-mosaic {
    display: grid;
    grid-template-columns: repeat(3, 340px);
    grid-auto-flow: row dense;
    grid-auto-rows: minmax(380px, auto);
    gap: 32px;
    width: 1084px;
    color: #292d2f;
  }

  .preview-panel {
    min-width: 0;
    min-height: 380px;
    padding: var(--size-32);
    border-radius: var(--ui-radius);
    background: var(--color-background);
    box-sizing: border-box;
    user-select: none;
  }

  .preview-skeleton-mosaic > div {
    min-width: 0;
    min-height: 380px;
    padding: var(--size-32);
    border-radius: var(--ui-radius);
    background: var(--color-background);
    box-sizing: border-box;
  }

  .preview-panel-wide,
  .preview-skeleton-wide {
    grid-column: span 2;
  }

  .preview-panel-tall {
    min-height: 440px;
  }

  .preview-panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-16);
    margin-bottom: var(--size-24);
  }

  .preview-panel header strong {
    font-family: "Bitcount Grid Single", monospace;
    font-size: 24px;
    font-weight: 300;
    line-height: 1;
  }

  .preview-panel header span {
    color: #8a9094;
    font-size: 0.8rem;
    line-height: 1;
    text-transform: uppercase;
  }

  .preview-kanban-board {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }

  .preview-kanban-panel {
    order: 4;
    grid-column: span 2;
    min-height: 440px;
  }

  .preview-sentence-panel {
    order: 1;
  }

  .preview-file-panel {
    order: 2;
  }

  .preview-swap-panel {
    order: 3;
  }

  .preview-trash-panel {
    order: 5;
  }

  .preview-editor-panel {
    order: 6;
  }

  .preview-clone-panel {
    order: 7;
  }

  .preview-kanban-panel :global(.preview-kanban-column) {
    align-items: stretch;
    gap: 0;
    min-height: 300px;
    padding: 0.75rem;
    border-radius: 12px;
    background: rgb(31 30 41 / 4%);
  }

  .preview-kanban-panel :global(.preview-kanban-column h5) {
    margin: 0 0 1rem;
    color: #8f9497;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.9rem;
    font-weight: 300;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .preview-kanban-panel :global(.preview-kanban-item) {
    align-items: stretch;
    width: 100%;
    padding: 0;
  }

  .preview-task-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 0.5rem;
    padding: 0.85rem 0.95rem;
    border: 1px solid rgb(31 30 41 / 8%);
    border-radius: 10px;
    background: var(--color-background);
    box-shadow: 0 1px 2px rgb(31 30 41 / 5%), 0 4px 12px -6px rgb(31 30 41 / 8%);
    box-sizing: border-box;
  }

  .preview-task-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .preview-task-header span {
    overflow: hidden;
    color: #232526;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.25;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-task-header small {
    flex: 0 0 auto;
    padding: 0.16rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 10%, #fff);
    color: color-mix(in srgb, var(--color-primary) 72%, #222);
    font-size: 0.7rem;
    font-weight: 600;
  }

  .preview-task-card p {
    margin: 0;
    color: #5f6569;
    font-size: 0.85rem;
    line-height: 1.35;
  }

  .preview-task-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.45rem;
    color: #8f9497;
    font-size: 0.78rem;
  }

  .preview-task-footer i {
    display: grid;
    width: 1.6rem;
    height: 1.6rem;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.67rem;
    font-style: normal;
    place-items: center;
  }

  .preview-sentence-board {
    display: flex;
    flex-direction: column;
    gap: var(--size-24);
  }

  .preview-sentence-group > small {
    display: block;
    margin-bottom: var(--size-8);
    color: #8a9094;
    font-size: 0.8rem;
    text-transform: uppercase;
  }

  .preview-sentence-panel :global(.preview-sentence-zone) {
    align-content: flex-start;
    align-items: flex-start;
    gap: var(--size-4);
    min-height: 76px;
    padding: var(--size-8) 0;
    border-bottom: 2px solid #ddd;
  }

  .preview-sentence-panel :global(.preview-word-item) {
    padding: 0;
  }

  .preview-sentence-panel :global(.preview-word) {
    display: block;
    padding: 2px 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    box-shadow: 0 3px 0 #d8dde0;
    color: #232526;
    font-family: "DotGothic16", sans-serif;
    font-size: 1rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .preview-file-panel :global(.preview-file-tree) {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    font-family: "Geist Mono", monospace;
    font-size: 0.9rem;
  }

  .preview-file-panel :global(.preview-file-item) {
    align-items: stretch;
    width: 100%;
    padding: 0;
  }

  .preview-file-panel :global(.preview-file-tree span) {
    display: block;
    padding: 0.5rem 0.65rem;
    border-radius: 8px;
  }

  .preview-file-panel :global(.preview-file-tree .nested) {
    margin-left: 1rem;
  }

  .preview-file-panel :global(.preview-file-tree .nested-deep) {
    margin-left: 2rem;
  }

  .preview-file-panel :global(.preview-file-tree .folder) {
    color: #5d6266;
    font-weight: 600;
  }

  .preview-file-panel :global(.preview-file-tree .active) {
    background: color-mix(in srgb, var(--color-primary) 14%, white);
    color: color-mix(in srgb, var(--color-primary) 74%, #222);
  }

  .preview-swap-panel :global(.preview-tile-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--size-8);
  }

  .preview-swap-panel :global(.preview-tile-item) {
    width: 100%;
    padding: 0;
  }

  .preview-swap-panel :global(.preview-tile-item > span) {
    display: flex;
    align-items: flex-end;
    width: 100%;
    height: 116px;
    padding: var(--size-16);
    border-radius: var(--ui-radius);
    background: var(--preview-tile-color);
    color: white;
    font-size: 1rem;
    font-weight: 700;
    box-sizing: border-box;
  }

  .preview-trash-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-12);
  }

  .preview-trash-list span {
    display: flex;
    align-items: center;
    gap: var(--size-12);
    padding: var(--size-16);
    border: 1px solid color-mix(in srgb, var(--color-background-dark) 20%, transparent);
    border-radius: var(--ui-radius);
    background: var(--color-background);
    font-size: 0.9rem;
  }

  .preview-trash-list span:first-child {
    position: relative;
    z-index: 1;
    animation: preview-trash-drop 5.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    animation-play-state: paused;
  }

  .preview-trash-list i {
    width: 10px;
    height: 28px;
    border-right: 2px dotted #b6bbbe;
    border-left: 2px dotted #b6bbbe;
  }

  .preview-trash-target {
    margin-top: var(--size-16);
    padding: var(--size-24) var(--size-12);
    border: 1px dashed color-mix(in srgb, var(--color-secondary-1) 38%, transparent);
    border-radius: var(--ui-radius);
    background: color-mix(in srgb, var(--color-secondary-1) 12%, white);
    color: color-mix(in srgb, var(--color-secondary-1) 78%, #222);
    font-size: 0.9rem;
    text-align: center;
  }

  .preview-editor-layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: var(--size-24);
  }

  .preview-editor-panel :global(.preview-editor-tools) {
    display: flex;
    flex-direction: column;
    gap: var(--size-12);
  }

  .preview-editor-panel :global(.preview-editor-item) {
    align-items: stretch;
    width: 100%;
    padding: 0;
  }

  .preview-editor-panel :global(.preview-editor-control) {
    display: block;
    padding: var(--size-16);
    border: 1px solid color-mix(in srgb, var(--color-background-dark) 18%, transparent);
    border-radius: var(--ui-radius);
    background: var(--color-background-tint);
    font-size: 0.9rem;
  }

  .preview-editor-panel :global(.preview-editor-canvas) {
    --card-radius: var(--ui-radius);

    align-items: stretch;
    min-height: 260px;
    padding: var(--size-24);
  }

  .preview-editor-panel :global(.preview-editor-canvas > small) {
    font-size: 1rem;
    font-weight: 700;
  }

  .preview-input-line {
    height: 48px;
    margin: var(--size-24) 0;
    border: 1px solid color-mix(in srgb, var(--color-background-dark) 22%, transparent);
    border-radius: var(--ui-radius);
    background: var(--color-background);
    animation: preview-editor-target 4.6s ease-in-out infinite;
    animation-play-state: paused;
  }

  .preview-choice-row {
    display: flex;
    align-items: center;
    gap: var(--size-12);
    margin-top: var(--size-16);
    color: #666d70;
    font-size: 0.9rem;
  }

  .preview-choice-row i {
    width: 20px;
    height: 20px;
    border: 1px solid #c9ced0;
    border-radius: 50%;
  }

  .preview-clone-blocks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--size-12);
  }

  .preview-clone-blocks span {
    padding: var(--size-16) var(--size-12);
    border-radius: var(--ui-radius);
    font-size: 0.85rem;
    text-align: center;
  }

  .preview-clone-blocks .heading-block {
    position: relative;
    z-index: 2;
    background: color-mix(in srgb, var(--color-primary) 16%, white);
    color: color-mix(in srgb, var(--color-primary) 78%, #222);
    animation: preview-clone-block 4.9s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    animation-play-state: paused;
  }

  .preview-clone-blocks .image-block {
    background: color-mix(in srgb, var(--color-secondary-1) 15%, white);
    color: color-mix(in srgb, var(--color-secondary-1) 78%, #222);
  }

  .preview-clone-blocks .button-block {
    grid-column: span 2;
    background: color-mix(in srgb, var(--color-accent) 14%, white);
    color: color-mix(in srgb, var(--color-accent) 72%, #222);
  }

  .preview-clone-canvas {
    margin-top: var(--size-16);
    padding: 46px var(--size-12);
    border: 1px dashed #c7cccf;
    border-radius: var(--ui-radius);
    background: var(--color-background);
    color: #9ba0a3;
    font-size: 0.85rem;
    text-align: center;
    animation: preview-clone-target 4.9s ease-in-out infinite;
    animation-play-state: paused;
  }

  .drop-snap-card[data-preview-active="true"] .preview-trash-list span:first-child,
  .drop-snap-card[data-preview-active="true"] .preview-input-line,
  .drop-snap-card[data-preview-active="true"] .preview-clone-blocks .heading-block,
  .drop-snap-card[data-preview-active="true"] .preview-clone-canvas {
    animation-play-state: running;
  }

  .preview-skeleton-mosaic > div {
    display: flex;
    flex-direction: column;
    gap: var(--size-24);
  }

  .preview-skeleton-mosaic span {
    display: block;
    height: 60px;
    border-radius: var(--ui-radius);
    background: rgb(31 30 41 / 7%);
  }

  .preview-skeleton-mosaic span:first-child {
    width: 44%;
    height: 24px;
  }

  .pending-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    border-radius: var(--size-8);
  }

  .pending-preview > span {
    position: relative;
    z-index: 1;
    color: rgba(32, 36, 38, 0.24);
    font-family: "Bitcount Grid Single", monospace;
    font-size: clamp(2rem, 4vw, 3.5rem);
    font-weight: 300;
    line-height: 1;
    text-align: center;
  }

  .pending-plus-grid {
    position: absolute;
    inset: 10px;
    z-index: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
    grid-auto-rows: 36px;
    overflow: hidden;
    pointer-events: none;
    color: rgba(0, 0, 0, 0.08);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 10px;
    font-weight: 300;
    line-height: 1;
    place-items: center;
    user-select: none;
  }

  .pending-plus-grid span {
    margin: 0;
    color: inherit;
  }

  @keyframes preview-trash-drop {
    0%,
    16% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
    42% {
      opacity: 1;
      transform: translate3d(0, 126px, 0) scale(0.92);
    }
    48%,
    58% {
      opacity: 0;
      transform: translate3d(0, 126px, 0) scale(0.88);
    }
    59% {
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(1);
    }
    72%,
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes preview-editor-target {
    0%,
    32%,
    62%,
    100% {
      border-color: color-mix(in srgb, var(--color-background-dark) 22%, transparent);
      box-shadow: 0 0 0 0 transparent;
    }
    42%,
    54% {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 18%, transparent);
    }
  }

  @keyframes preview-clone-block {
    0%,
    14% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
    40% {
      opacity: 1;
      transform: translate3d(82px, 132px, 0) scale(0.94);
    }
    48%,
    58% {
      opacity: 0;
      transform: translate3d(82px, 132px, 0) scale(0.9);
    }
    59% {
      opacity: 0;
      transform: translate3d(0, 0, 0) scale(1);
    }
    72%,
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes preview-clone-target {
    0%,
    32%,
    62%,
    100% {
      border-color: #c7cccf;
      background: var(--color-background);
    }
    42%,
    54% {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 8%, white);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .snapsort-preview-pan {
      transition: none;
    }

    .snapsort-preview-scale {
      transition: none;
    }
  }

  @media (max-width: 900px) {
    .assets-grid {
      grid-template-columns: 1fr;
    }

    .asset-card {
      flex-direction: column;
      align-items: stretch;
      min-height: 0;
    }

    .asset-copy,
    .asset-preview {
      flex-basis: auto;
    }

    .snapsort-asset-preview {
      min-height: 330px;
    }

    .snapsort-preview-scale {
      transform: scale(0.36);
    }

  }
</style>
