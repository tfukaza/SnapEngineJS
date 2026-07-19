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
      duration: 900,
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
    { id: "preview-tile-coral", label: "01", color: "#ff8068" },
    { id: "preview-tile-blue", label: "02", color: "#78a9ff" },
    { id: "preview-tile-yellow", label: "03", color: "#ffd166" },
    { id: "preview-tile-green", label: "04", color: "#61c99f" },
  ]);
  let tileContainer: SnapSortContainer | undefined = $state();

  let pointerInside = $state(false);
  let focusInside = $state(false);
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

  function moveBetweenGroups(
    groups: PreviewGroup[],
    sourceIndex: number,
    targetIndex: number,
  ): boolean {
    const source = groups[sourceIndex];
    const target = groups[targetIndex];
    const item = source?.items[0];
    if (!source?.container || !target?.container || !item) return false;

    return source.container.moveItem(
      item.id,
      target.container,
      target.items.length,
    );
  }

  function runAutomationStep() {
    if (automationStep % 3 === 0) {
      const moved = moveBetweenGroups(
        kanbanGroups,
        kanbanForward ? 0 : 1,
        kanbanForward ? 1 : 0,
      );
      if (moved) kanbanForward = !kanbanForward;
    } else if (automationStep % 3 === 1) {
      const moved = moveBetweenGroups(
        sentenceGroups,
        sentenceForward ? 1 : 0,
        sentenceForward ? 0 : 1,
      );
      if (moved) sentenceForward = !sentenceForward;
    } else if (tileContainer && previewTiles[0]) {
      tileContainer.moveItem(
        previewTiles[0].id,
        tileContainer,
        previewTiles.length,
      );
    }

    automationStep += 1;
  }

  function stopAutomation() {
    if (automationTimer === null) return;
    clearTimeout(automationTimer);
    automationTimer = null;
  }

  function scheduleAutomation(delay = 2800) {
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

    scheduleAutomation(900);
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
    <a
      href="/snapsort"
      class="asset-card drop-snap-card"
      data-preview-active={previewMotionActive}
      onmouseenter={() => (pointerInside = true)}
      onmouseleave={() => (pointerInside = false)}
      onfocus={() => (focusInside = true)}
      onblur={() => (focusInside = false)}
    >
      <div class="asset-copy">
        <div class="asset-card-header">
          <h3>SnapSort</h3>
        </div>
        <p>Drag and drop any element</p>
        <ul class="framework-list" aria-label="Framework availability">
          <li><img src="/icon/javascript.svg" alt="JavaScript" /></li>
          <li><img src="/icon/svelte.svg" alt="Svelte" /></li>
          <li><img src="/icon/react.svg" alt="React" /></li>
          <li class="framework-wip-logo">
            <img src="/icon/vue.svg" alt="Vue" />
            <small>WIP</small>
          </li>
          <li class="framework-wip-logo">
            <img src="/icon/angular.svg" alt="Angular" />
            <small>WIP</small>
          </li>
        </ul>
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
                                <div class="preview-task-card">
                                  <span>{item.label}</span>
                                  <small>{item.tag}</small>
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
                                  <span>{item.label}</span>
                                </Item>
                              {/snippet}
                            </Container>
                          </div>
                        {/each}
                      </div>
                    </article>

                    <article class="preview-panel preview-file-panel">
                      <header><strong>Files</strong><span>Tree</span></header>
                      <div class="preview-file-tree">
                        <span class="folder">▾ src</span>
                        <span class="folder nested">▾ components</span>
                        <span class="file nested-deep active">Card.svelte</span>
                        <span class="file nested">theme.scss</span>
                        <span class="file">package.json</span>
                      </div>
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
                          animation: previewAnimation,
                          callbacks: { onItemMove: handleTileMove },
                        }}
                      >
                        {#snippet entry(item)}
                          <Item itemId={item.id} className="preview-tile-item">
                            <span style={`--preview-tile-color: ${item.color};`}>{item.label}</span>
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
                        <div class="preview-editor-tools">
                          <span>Text</span><span>Choice</span><span>Date</span>
                        </div>
                        <div class="preview-editor-canvas">
                          <small>Customer feedback</small>
                          <div class="preview-input-line"></div>
                          <div class="preview-choice-row"><i></i><span>Excellent</span></div>
                          <div class="preview-choice-row"><i></i><span>Good</span></div>
                        </div>
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
    </a>

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
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--size-24);
    padding: clamp(1.5rem, 3vw, 2.5rem);
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
    overflow: hidden;
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

  .framework-list {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--size-16);
    margin: var(--size-20) 0 0;
    padding: 0;
    list-style: none;
  }

  .framework-list li {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.15rem;
    height: 2.15rem;
  }

  .framework-list img {
    display: block;
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }

  .framework-wip-logo small {
    position: absolute;
    top: -0.5rem;
    right: -0.7rem;
    padding: 0.16rem 0.32rem;
    border: 1px solid #d9dddf;
    border-radius: 999px;
    background: #ffffff;
    color: #697074;
    font-size: 0.58rem;
    font-weight: 700;
    line-height: 1;
  }

  .asset-preview {
    position: relative;
    flex: 1 1 auto;
    min-width: 0;
    min-height: 180px;
  }

  .snapsort-asset-preview {
    min-height: 340px;
    margin-top: calc(var(--size-12) * -1);
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
    height: 96px;
    background: linear-gradient(
      to bottom,
      var(--color-background-tint) 5%,
      color-mix(in srgb, var(--color-background-tint) 82%, transparent) 54%,
      transparent 100%
    );
    content: "";
  }

  .snapsort-preview-pan {
    position: absolute;
    top: 0;
    left: 0;
    width: 542px;
    transform: translate3d(-16px, -8px, 0);
    animation: preview-pan 28s linear infinite alternate;
    animation-play-state: paused;
    will-change: transform;
  }

  .drop-snap-card[data-preview-active="true"] .snapsort-preview-pan {
    animation-play-state: running;
  }

  .snapsort-preview-scale {
    width: 542px;
    transform: scale(0.72);
    transform-origin: top left;
  }

  :global(.preview-engine) {
    width: 542px;
  }

  .preview-mosaic {
    display: grid;
    grid-template-columns: repeat(3, 170px);
    grid-auto-flow: row dense;
    grid-auto-rows: minmax(190px, auto);
    gap: 16px;
    width: 542px;
    color: #292d2f;
  }

  .preview-panel,
  .preview-skeleton-mosaic > div {
    min-width: 0;
    min-height: 190px;
    padding: 16px;
    border: 1px solid rgb(31 30 41 / 8%);
    border-radius: 14px;
    background: rgb(255 255 255 / 88%);
    box-shadow: 0 8px 24px rgb(31 30 41 / 7%);
    box-sizing: border-box;
  }

  .preview-panel-wide,
  .preview-skeleton-wide {
    grid-column: span 2;
  }

  .preview-panel-tall {
    min-height: 220px;
  }

  .preview-panel header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 14px;
  }

  .preview-panel header strong {
    font-size: 13px;
    line-height: 1;
  }

  .preview-panel header span {
    color: #8a9094;
    font-size: 9px;
    line-height: 1;
    text-transform: uppercase;
  }

  .preview-kanban-board {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .preview-kanban-panel :global(.preview-kanban-column) {
    align-items: stretch;
    gap: 7px;
    min-height: 154px;
    padding: 9px;
    border-radius: 10px;
    background: #f2f3f3;
  }

  .preview-kanban-panel :global(.preview-kanban-column h5) {
    margin: 0 0 2px;
    color: #777e82;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .preview-kanban-panel :global(.preview-kanban-item) {
    align-items: stretch;
    width: 100%;
    padding: 0;
  }

  .preview-task-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: 1px solid rgb(31 30 41 / 8%);
    border-radius: 8px;
    background: white;
    box-shadow: 0 3px 10px rgb(31 30 41 / 6%);
    box-sizing: border-box;
  }

  .preview-task-card span {
    overflow: hidden;
    font-size: 10px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .preview-task-card small {
    flex: 0 0 auto;
    padding: 3px 5px;
    border-radius: 999px;
    background: #eff0ff;
    color: #6862b7;
    font-size: 7px;
  }

  .preview-sentence-board {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview-sentence-group > small {
    display: block;
    margin-bottom: 5px;
    color: #8a9094;
    font-size: 8px;
    text-transform: uppercase;
  }

  .preview-sentence-panel :global(.preview-sentence-zone) {
    align-content: flex-start;
    align-items: flex-start;
    gap: 5px;
    min-height: 54px;
    padding: 7px;
    border: 1px dashed #d5d9db;
    border-radius: 9px;
    background: #f8f9f9;
  }

  .preview-sentence-panel :global(.preview-word-item) {
    padding: 0;
  }

  .preview-sentence-panel :global(.preview-word-item span) {
    display: block;
    padding: 6px 8px;
    border: 1px solid #dfe2e3;
    border-radius: 7px;
    background: white;
    font-size: 9px;
    font-weight: 600;
    white-space: nowrap;
  }

  .preview-file-tree {
    display: flex;
    flex-direction: column;
    gap: 5px;
    font-family: "Geist Mono", monospace;
    font-size: 9px;
  }

  .preview-file-tree span {
    padding: 6px 7px;
    border-radius: 6px;
  }

  .preview-file-tree .nested {
    margin-left: 10px;
  }

  .preview-file-tree .nested-deep {
    margin-left: 20px;
  }

  .preview-file-tree .folder {
    color: #5d6266;
    font-weight: 600;
  }

  .preview-file-tree .active {
    background: #eceeff;
    color: #5c57a8;
  }

  .preview-swap-panel :global(.preview-tile-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .preview-swap-panel :global(.preview-tile-item) {
    width: 100%;
    padding: 0;
  }

  .preview-swap-panel :global(.preview-tile-item > span) {
    display: flex;
    align-items: flex-end;
    width: 100%;
    height: 58px;
    padding: 8px;
    border-radius: 9px;
    background: var(--preview-tile-color);
    color: rgb(31 30 41 / 58%);
    font-size: 9px;
    font-weight: 700;
    box-sizing: border-box;
  }

  .preview-trash-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview-trash-list span {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 8px;
    border: 1px solid #e2e4e5;
    border-radius: 7px;
    background: white;
    font-size: 9px;
  }

  .preview-trash-list i {
    width: 5px;
    height: 14px;
    border-right: 2px dotted #b6bbbe;
    border-left: 2px dotted #b6bbbe;
  }

  .preview-trash-target {
    margin-top: 9px;
    padding: 13px 6px;
    border: 1px dashed #e0a39d;
    border-radius: 8px;
    background: #fff4f2;
    color: #b65349;
    font-size: 9px;
    text-align: center;
  }

  .preview-editor-layout {
    display: grid;
    grid-template-columns: 90px minmax(0, 1fr);
    gap: 10px;
  }

  .preview-editor-tools {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .preview-editor-tools span {
    padding: 9px;
    border: 1px solid #e0e3e4;
    border-radius: 7px;
    background: #f7f8f8;
    font-size: 9px;
  }

  .preview-editor-canvas {
    padding: 12px;
    border: 1px solid #dfe2e3;
    border-radius: 9px;
    background: white;
  }

  .preview-editor-canvas > small {
    font-size: 10px;
    font-weight: 700;
  }

  .preview-input-line {
    height: 24px;
    margin: 11px 0;
    border: 1px solid #dfe2e3;
    border-radius: 6px;
  }

  .preview-choice-row {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 8px;
    color: #666d70;
    font-size: 9px;
  }

  .preview-choice-row i {
    width: 10px;
    height: 10px;
    border: 1px solid #c9ced0;
    border-radius: 50%;
  }

  .preview-clone-blocks {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 7px;
  }

  .preview-clone-blocks span {
    padding: 9px 7px;
    border-radius: 7px;
    font-size: 8px;
    text-align: center;
  }

  .preview-clone-blocks .heading-block {
    background: #f0edff;
    color: #655bb5;
  }

  .preview-clone-blocks .image-block {
    background: #e9f7f2;
    color: #377d65;
  }

  .preview-clone-blocks .button-block {
    grid-column: span 2;
    background: #fff2df;
    color: #9a6827;
  }

  .preview-clone-canvas {
    margin-top: 10px;
    padding: 23px 6px;
    border: 1px dashed #ccd1d3;
    border-radius: 8px;
    color: #9ba0a3;
    font-size: 8px;
    text-align: center;
  }

  .preview-skeleton-mosaic > div {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview-skeleton-mosaic span {
    display: block;
    height: 30px;
    border-radius: 7px;
    background: rgb(31 30 41 / 7%);
  }

  .preview-skeleton-mosaic span:first-child {
    width: 44%;
    height: 12px;
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

  @keyframes preview-pan {
    from {
      transform: translate3d(-16px, -8px, 0);
    }
    to {
      transform: translate3d(-86px, -135px, 0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .snapsort-preview-pan {
      animation: none;
      transform: translate3d(-48px, -58px, 0);
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
      min-height: 300px;
    }

    .snapsort-preview-scale {
      transform: scale(0.64);
    }

    .snapsort-preview-pan {
      transform: translate3d(-10px, -6px, 0);
    }

    @keyframes preview-pan {
      from {
        transform: translate3d(-10px, -6px, 0);
      }
      to {
        transform: translate3d(-72px, -145px, 0);
      }
    }
  }
</style>
