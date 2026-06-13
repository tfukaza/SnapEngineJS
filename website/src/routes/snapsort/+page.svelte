<script lang="ts">
  import { onMount } from "svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Item, ItemContainer as Container } from "@snap-engine/snapsort-svelte";
  import { GlobalManager } from "@snapline/index";

  type TitleLinePosition = {
    id: string;
    left: number;
    right: number;
  };

  let heroSection: HTMLElement | undefined = $state();
  let titleSection: HTMLElement | undefined = $state();
  let titleLetterElements: HTMLSpanElement[] = [];
  let titleLinePositions = $state<TitleLinePosition[]>([]);
  let titleLineCenterY = $state(0);

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
    const globalManager = GlobalManager.getInstance();
    const globalInput = globalManager.getInputEngine(null);
    if (globalInput) {
      globalInput.config.maxSimultaneousDrags = 1;
    }

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

  const todoItems = [
    {
      id: "t-1",
      text: "Buy groceries",
      checked: false,
      priority: "Med",
    },
    {
      id: "t-2",
      text: "Walk the dog",
      checked: true,
      priority: "Low",
    },
    {
      id: "t-3",
      text: "Reply to emails",
      checked: false,
      priority: "High",
    },
    {
      id: "t-4",
      text: "Gym workout",
      checked: false,
      priority: "Med",
    },
    {
      id: "t-5",
      text: "Read book",
      checked: true,
      priority: "Low",
    },
    {
      id: "t-6",
      text: "Pay bills",
      checked: false,
      priority: "High",
    },
    {
      id: "t-7",
      text: "Call mom",
      checked: false,
      priority: "Low",
    },
    {
      id: "t-8",
      text: "Water plants",
      checked: false,
      priority: "Med",
    },
  ];

  const kanbanTodo = [
    {
      id: "k-1",
      text: "Fix Bug #12",
      tag: "Bug",
      desc: "Fix the login issue on Safari browser.",
    },
    {
      id: "k-2",
      text: "Write Tests",
      tag: "Dev",
      desc: "Add unit tests for the new payment module.",
    },
  ];

  const kanbanDone = [
    {
      id: "k-3",
      text: "Code Review",
      tag: "Dev",
      desc: "Review the PR for the new feature.",
    },
    {
      id: "k-4",
      text: "Deploy to Prod",
      tag: "Ops",
      desc: "Deploy the latest build to production.",
    },
  ];

  const sentenceWords = [
    { id: "sw-1", text: "あり" },
    { id: "sw-2", text: "の" },
    { id: "sw-3", text: "ます" },
    { id: "sw-4", text: "多く" },
    { id: "sw-5", text: "が" },
    { id: "sw-6", text: "用途" },
  ];

  const kaomojis = [
    "(o^▽^o)",
    "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "(;¬_¬)",
    "(╯°□°）╯︵ ┻━┻",
    "┬─┬ノ( º _ ºノ)",
    "¯\\_(ツ)_/¯",
    "(ง'̀-'́)ง",
    "(;´༎ຶД༎ຶ`)",
    "( ͡° ͜ʖ ͡°)",
    "(づ｡◕‿‿◕｡)づ",
    "(*￣▽￣)b",
    "(*・ω・)ﾉ",
    "(ノ= ⏠ = )ノ",
    "(=^･ω･^=)",
    "(*μ_μ)",
    "( ˘▽˘)っ♨",
  ];

  const gridItems = Array.from({ length: kaomojis.length }, (_, i) => ({
    id: `g-${i}`,
    text: kaomojis[i % kaomojis.length],
  }));

  let sentenceDropZone = $state<HTMLElement>();
  let sentenceResult = $state("");
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
    window.location.href = "/docs";
  }

  function checkSentence() {
    if (!sentenceDropZone) return;
    const words = Array.from(
      sentenceDropZone.querySelectorAll(".sentence-drop-zone .sentence-word"),
    ).map((el) => el.textContent?.trim());
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

  function priorityChipClass(priority: string) {
    const classes: Record<string, string> = {
      High: "chip-warning",
      Med: "chip-ready",
      Low: "chip-muted",
    };

    return classes[priority] ?? "chip-muted";
  }

  function tagChipClass(tag: string) {
    const classes: Record<string, string> = {
      Bug: "chip-warning",
      Dev: "chip-ready",
      Ops: "chip-code",
    };

    return classes[tag] ?? "chip-muted";
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<section id="landing">
  <Engine id="snapsort-canvas" bind:this={canvasComponent} {debug}>

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
          <p>SnapSort any element</p>
          <button class="primary" type="button" onclick={goToDocs}>See docs</button>
        </div>
      </div>

  </Engine>
</section>
<section class="snapsort-intro">
  <h2 id="drag-drop-header">Sorting that feels like a snap</h2>
  <p>
    SnapSort gives any UI element precise, animated drag-and-drop behavior.
  </p>
</section>
<section>
  <Engine id="snapsort-examples-canvas" bind:this={canvasComponent} {debug}>

    <div class="examples-grid">
      <div class="example-card pm-example">
        <h3>TODO List</h3>
        <div class="card ground project-list">
          <Container config={{ direction: "column", groupID: "project-list" }}>
            {#each todoItems as { id, text, checked, priority } (id)}
              <Item>
                <div class="project-card">
                  <label>
                    <input type="checkbox" checked={checked} />
                    <span></span>
                  </label>
                  <span class="project-text">{text}</span>
                  <span class={`chip ${priorityChipClass(priority)} priority`}>{priority}</span>
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
              className="kanban-column card ground"
              config={{
                direction: "column",
                name: "kanban-todo",
                onClickAction: { action: "moveTo", target: "kanban-done" },
              }}
              locked={true}
            >
              <h4>To Do</h4>
              {#each kanbanTodo as { id, text, tag, desc } (id)}
                <Item>
                  <div class="kanban-card">
                    <div class="kanban-header">
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                    <span class={`chip ${tagChipClass(tag)} tag`}>{tag}</span>
                  </div>
                </Item>
              {/each}
            </Container>
            <Container
              className="kanban-column card ground"
              config={{
                direction: "column",
                name: "kanban-done",
                onClickAction: { action: "moveTo", target: "kanban-todo" },
              }}
              locked={true}
            >
              <h4>Done</h4>
              {#each kanbanDone as { id, text, tag, desc } (id)}
                <Item>
                  <div class="kanban-card">
                    <div class="kanban-header">
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                    <span class={`chip ${tagChipClass(tag)} tag`}>{tag}</span>
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
          <div class="sentence-container-area" bind:this={sentenceDropZone}>
            <Container
              className="sentence-workspace-root"
              config={{ direction: "column", name: "sentence-root", noDrop: true }}
              locked={true}
            >
              <Container
                className="sentence-drop-zone"
                config={{
                  direction: "row",
                  groupID: "sentence",
                  name: "sentence-target",
                  onClickAction: { action: "moveTo", target: "sentence-source" },
                }}
                locked={true}
              >
              </Container>
              <Container
                className="sentence-source-zone"
                config={{
                  direction: "row",
                  groupID: "sentence",
                  name: "sentence-source",
                  onClickAction: { action: "moveTo", target: "sentence-target" },
                }}
                locked={true}
              >
                {#each sentenceWords as { id, text } (id)}
                  <Item>
                    <div class="word-card sentence-word">{text}</div>
                  </Item>
                {/each}
              </Container>
            </Container>
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

      <div class="example-card layout-example">
        <h3>Multi-row Flex Layout</h3>
        <div class="card ground grid-layout">
          <Container config={{ direction: "row", groupID: "grid-layout" }}>
            {#each gridItems as { id, text } (id)}
              <Item style="padding: 0.15rem;">
                <div class="grid-card">
                  {text}
                </div>
              </Item>
            {/each}
          </Container>
        </div>
      </div>
    </div>
  </Engine>
</section>

<style lang="scss">
  @use "../../lib/landing/landing.scss";

  .debug-toggle {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 1000;
  }

  .debug-toggle button {
    padding: 0.5rem 1rem;
    background: rgba(58, 42, 34, 0.8);
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
    backdrop-filter: blur(4px);
  }

  .debug-toggle button:hover {
    background: rgba(58, 42, 34, 1);
  }

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

  .powered-by {
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #7d6a5f;
    opacity: 0.8;
    font-weight: 500;
  }


  .snapsort-intro {
    text-align: center;
    max-width: 720px;
    margin: 7rem auto 4rem;
  }

  #drag-drop-header {
    font-size: 3rem;
    line-height: 1.05;
    margin: 0 0 1rem;
  }

  .snapsort-intro p {
    margin: 0;
    color: #7d6a5f;
    font-size: 1.12rem;
    line-height: 1.55;
  }

  /* Examples Section */
  .examples-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(0, auto));
    grid-template-areas:
      "pm kanban kanban"
      "pm sentence layout";
    gap: var(--size-24);
    width: 100%;
    max-width: 1200px;
    margin: 4rem auto;
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

  .layout-example {
    grid-area: layout;
  }

  .insights-example {
    grid-area: insights;
  }

  .insights-card {
    padding: 1.5rem;
    background: white;
    border-radius: var(--ui-radius);
    border: 1px solid rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .insight {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 600;
  }

  .insight .label {
    font-size: 0.85rem;
    color: #7d6a5f;
  }

  .insight-footnote {
    margin: 0;
    font-size: 0.75rem;
    color: #9e8f85;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  // @media (max-width: 1024px) {
  //   .examples-grid {
  //     grid-template-columns: repeat(2, minmax(0, 1fr));
  //     grid-template-rows: none;
  //     grid-template-areas:
  //       "pm pm"
  //       "pm pm"
  //       "kanban kanban"
  //       "insights sentence"
  //       "layout layout";
  //   }
  // }

  @media (max-width: 720px) {
    .examples-grid {
      display: flex;
      flex-direction: column;
      margin: 2rem 0;
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

  .prompt-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3a2a22;
  }

  .english-sentence {
    span {
      color: #ffffff;
      font-family: inherit;
    }
  }

  .speaker-icon {
    width: 24px;
    height: 24px;
    opacity: 0.6;
    cursor: pointer;
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
  }

  .sentence-builder :global(.sentence-source-zone) {
    align-content: center;
    justify-content: flex-start;
    padding: var(--size-4) 0 var(--size-20);
  }

  .sentence-builder :global(.sentence-drop-zone .snapsort-item),
  .sentence-builder :global(.sentence-source-zone .snapsort-item) {
    padding: 0.15rem;
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
  }

  .sentence-word:active {
    cursor: grabbing;
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

  /* Project List */
  .project-list {
    padding: 1rem;
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
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid rgb(219, 219, 219);
    border-radius: var(--ui-radius);
    cursor: grab;
    touch-action: none;
    width: 100%;
    box-sizing: border-box;
  }

  .project-card:active {
    cursor: grabbing;
  }

  .project-text {
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: #555;
  }

  .priority {
    justify-self: end;
  }

  .date {
    font-size: 0.85rem;
    color: #7d6a5f;
    text-align: right;
  }

  .checkbox {
    width: 1.25rem;
    height: 1.25rem;
    border: 2px solid #ddd;
    border-radius: 4px;
  }

  .checkbox.checked {
    background: #3a2a22;
    border-color: #3a2a22;
  }

  /* Kanban Board */
  .kanban-board {
    display: flex;
    gap: 1rem;
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
    min-height: 300px;
    align-items: stretch;
  }

  .kanban-board :global(.kanban-column .snapsort-item) {
    align-items: stretch;
    width: 100%;
    padding-inline: 0;
  }

  .kanban-board :global(.kanban-column h4) {
    margin: 0 0 1rem 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #7d6a5f;
  }

  .kanban-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.05);
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
    gap: 0.5rem;
    margin-bottom: 0.1rem;
  }

  .kanban-title {
    font-weight: 600;
    font-size: 0.9rem;
    color: #3a2a22;
    margin: 0;
  }

  .kanban-desc {
    margin: 0;
    font-size: 0.75rem;
    color: #7d6a5f;
    line-height: 1.3;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tag {
    width: fit-content;
    margin: 0;
  }

  /* Grid Layout */
  .grid-layout {
    padding: 1rem;
    font-family: "DotGothic16", sans-serif;
    // background: #fafafa;
  }

  .grid-card {
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    font-weight: 600;
    color: #5e4d44;
    border: 1px solid rgb(216, 216, 216);
    cursor: grab;
    touch-action: none;
    border-radius: 3px;
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    font-family: inherit;
  }

  .grid-card:active {
    cursor: grabbing;
    border-color: #3a2a22;
  }

  @media (max-width: 900px) {
    .examples-section {
      flex-direction: column;
    }
  }
</style>
