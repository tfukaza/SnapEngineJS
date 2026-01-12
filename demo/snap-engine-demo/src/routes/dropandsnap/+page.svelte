<script lang="ts">
  import Canvas from "../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  const title = "Drop and Snap";

  const titleChars = title.split("").map((char, i) => ({ char, id: `t-${i}` }));

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
  let canvasComponent: Canvas | null = null;

  function toggleDebug() {
    debug = !debug;
    if (debug) {
      canvasComponent?.enableDebug();
    } else {
      canvasComponent?.disableDebug();
    }
  }

  function checkSentence() {
    if (!sentenceDropZone) return;
    const words = Array.from(
      sentenceDropZone.querySelectorAll(".sentence-word"),
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
</script>

<section id="landing">
  <div class="debug-toggle">
    <button onclick={toggleDebug}>
      {debug ? "Disable Debug" : "Enable Debug"}
    </button>
  </div>
  <Canvas id="dropandsnap-canvas" bind:this={canvasComponent} {debug}>

      <div class="hero-section card ground">
        <div class="title-section">
          <Container
            config={{ direction: "row", groupID: "dropandsnap-title" }}
          >
            {#each titleChars as { char, id } (id)}
              <Item style="padding: 0; width: auto;">
                <div class="card char-card">
                  <span class="char title-text"
                    >{char === " " ? "\u00A0" : char}</span
                  >
                </div>
              </Item>
            {/each}
          </Container>
        </div>

        <div class="subtitle-wrapper">
          <div class="subtitle-card card ground">
            <p class="subtitle-text">Drag and drop library for the DOM. <br>Framework agnostic and extensible.</p>
          </div>
        </div>

        <p class="powered-by">Powered by SnapEngine</p>
      </div>
  
  </Canvas>
</section>   
<section>
  <h2 id="drag-drop-header">Drag and Drop library for any UI element</h2>
</section>
<section>
  <Canvas id="dropandsnap-examples-canvas" bind:this={canvasComponent} {debug}>
 
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
                  <span class="priority {priority.toLowerCase()}">{priority}</span>
                </div>
              </Item>
            {/each}
          </Container>
        </div>
      </div>

      <div class="example-card kanban-example">
        <h3>Kanban Board</h3>
        <div class="kanban-board">
          <div class="kanban-column card ground">
            <h4>To Do</h4>
            <Container
              config={{
                direction: "column",
                groupID: "kanban",
                name: "kanban-todo",
                onClickAction: { action: "moveTo", target: "kanban-done" },
              }}
            >
              {#each kanbanTodo as { id, text, tag, desc } (id)}
                <Item>
                  <div class="kanban-card">
                    <div class="kanban-header">
                      <span class="tag {tag.toLowerCase()}">{tag}</span>
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
          <div class="kanban-column card ground">
            <h4>Done</h4>
            <Container
              config={{
                direction: "column",
                groupID: "kanban",
                name: "kanban-done",
                onClickAction: { action: "moveTo", target: "kanban-todo" },
              }}
            >
              {#each kanbanDone as { id, text, tag, desc } (id)}
                <Item>
                  <div class="kanban-card">
                    <div class="kanban-header">
                      <span class="tag {tag.toLowerCase()}">{tag}</span>
                      <span class="kanban-title">{text}</span>
                    </div>
                    <p class="kanban-desc">{desc}</p>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
        </div>
      </div>



      <div class="example-card sentence-example">
        <h3>Sentence Builder</h3>
        <div class="card ground sentence-builder">
          <div class="card ground prompt-section">
            <div class="english-sentence">
              <span>It has many uses</span>
            </div>
          </div>
          <div class="sentence-drop-zone" bind:this={sentenceDropZone}>
            <Container
              config={{
                direction: "row",
                groupID: "sentence",
                name: "sentence-target",
                onClickAction: { action: "moveTo", target: "sentence-source" },
              }}
            >
              <div class="placeholder">Drop words here</div>
            </Container>
          </div>
          <div class="sentence-source-zone">
            <Container
              config={{
                direction: "row",
                groupID: "sentence",
                name: "sentence-source",
                onClickAction: { action: "moveTo", target: "sentence-target" },
              }}
            >
              {#each sentenceWords as { id, text } (id)}
                <Item>
                  <div class="word-card sentence-word">{text}</div>
                </Item>
              {/each}
            </Container>
          </div>
          <div class="controls">
            <button class="check-btn" onclick={checkSentence}>Check</button>
            {#if sentenceResult}
              <span class="result" class:success={sentenceResult === "Correct!"}
                >{sentenceResult}</span
              >
            {/if}
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
  </Canvas>
</section>

<style lang="scss">
  @import "../../lib/landing/landing.scss";

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
    border-radius: 4px;
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
    height: clamp(80vh, 80vh, 1200px);
  }

  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    // min-height: 80vh;
    background-color: white;
  }
  
  :global(#snap-canvas) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .hero-section{
  
    .title-section {
      width: fit-content;
      margin-bottom: 2rem;
      box-sizing: border-box;
      padding: var(--size-12);
      border: 1px solid rgb(220, 220, 220);
      border-radius: var(--ui-radius);
      /* filter: drop-shadow(2px 4px 6px rgba(58, 42, 34, 0.15)); */

    
      // overflow: hidden;

      .card{
        box-shadow: none;
      }
      
    }
    :global(.container) {
      
      filter: drop-shadow(2px 4px 6px rgba(58, 42, 34, 0.15));
      justify-content: center;
      width: auto;
    }
  }

  .subtitle-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 800px;
    box-sizing: border-box;
    text-align: center;
  }

  .subtitle-card {
    background: #1a1a1a;
    padding: 1rem 1.5rem;
    border-radius: 8px;
  }

  .subtitle-wrapper .subtitle-text {
    margin: 0;
    font-family: "Pixelify Sans", sans-serif;
    color: #ffffff;
  }


  .char-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  // .word-card {
  //   padding: 0.5rem 0.75rem;
  //   cursor: grab;
  // }

  .word-card:active {
    cursor: grabbing;
  }

  .char {
    display: inline-block;
    user-select: none;
    cursor: grab;
  }

  .char:active {
    cursor: grabbing;
  }

  .title-text {
    font-family: "Tomorrow", sans-serif;
    font-size: 4rem;
    font-weight: 800;
    line-height: 1;
  }

  .subtitle-text {
    font-size: 1.25rem;
    font-weight: 400;
    line-height: 1.4;
    color: #5e4d44;
  }

  .powered-by {
    margin-top: 2rem;
    font-size: 0.9rem;
    color: #7d6a5f;
    opacity: 0.8;
    font-weight: 500;
  }


  #drag-drop-header {
    text-align: center;
    font-family: "IBM Plex Mono", "Coral Pixels", cursive;
    font-size: 3rem;
    // font-weight: 700;
    margin: 200px 0px;
    // color: #3a2a22;
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
    font-family: "Tomorrow", sans-serif;
    font-size: 1.5rem;
    margin: 0;
    color: #3a2a22;
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

  @media (max-width: 1024px) {
    .examples-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: none;
      grid-template-areas:
        "pm pm"
        "pm pm"
        "kanban kanban"
        "insights sentence"
        "layout layout";
    }
  }

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
  }

  .prompt-section {
    --card-color: #232526;
  }

  .prompt-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3a2a22;
  }

  .english-sentence {
    font-family: "Pixelify Sans", sans-serif;
    font-size: 1.2rem;
    span {
      color: #ffffff;
    }
  }

  .speaker-icon {
    width: 24px;
    height: 24px;
    opacity: 0.6;
    cursor: pointer;
  }

  .sentence-drop-zone {
    min-height: 20px;
    border-bottom: 2px solid #eee;
    // padding: 0.5rem;
    display: flex;
    align-items: center;
    position: relative;
  }

  .sentence-drop-zone :global(.container) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--size-4);
    min-height: 40px;
    width: 100%;
    flex-wrap: wrap;
  }

  .sentence-source-zone {
    min-height: 20px;
    // padding: 0.5rem;
  }

  .sentence-source-zone :global(.container) {
    display: flex;
    flex-direction: row;
    // gap: 0.5rem;
    flex-wrap: wrap;
  }

  .sentence-word {
    background: #ffffff;
    border: 1px solid #ddd;
    padding: 2px 4px;
    // padding: 0.5rem 1rem;
    border-radius: 4px;
    // font-weight: 500;
    cursor: grab;
  }

  .sentence-word:active {
    cursor: grabbing;
  }

  .placeholder {
    color: #ccc;
    font-style: italic;
    pointer-events: none;
    position: absolute;
    left: 1rem;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-top: auto;
  }

  .check-btn {
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

  .check-btn:hover {
    background: #5e4d44;
  }

  .result {
    font-weight: 600;
    color: #c62828;
  }

  .result.success {
    color: #2e7d32;
  }

  /* Project List */
  .project-list {
    padding: 1rem;
    // height: 100%;
  }

  .project-list :global(.container),
  .kanban-column :global(.container) {
    align-items: stretch;
    width: 100%;
  }

  .project-list :global(.item-wrapper),
  .kanban-column :global(.item-wrapper) {
    width: 100%;
    padding: 0;
  }

  .project-list :global(.item),
  .kanban-column :global(.item) {
    width: 100%;
  }

  .project-card {
    display: grid;
    grid-template-columns: auto 1fr 50px;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid rgb(219, 219, 219);
    border-radius: var(--ui-radius);
    cursor: grab;
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
    font-size: 0.7rem;
    padding: 2px 6px;
    border-radius: 4px;
    background: #eee;
    text-align: center;
  }

  .priority.high {
    background: #ffebee;
    color: #c62828;
  }
  .priority.med {
    background: #fff3e0;
    color: #ef6c00;
  }
  .priority.low {
    background: #e8f5e9;
    color: #2e7d32;
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

  .kanban-column {
    flex: 1;
    padding: 1rem;
    min-height: 300px;
  }

  .kanban-column h4 {
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
    font-size: 0.65rem;
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    width: fit-content;
    font-weight: 600;
    margin: 0;
  }

  .tag.bug {
    background: #ffe0e0;
    color: #d32f2f;
  }

  .tag.dev {
    background: #e0f2f1;
    color: #00695c;
  }

  .tag.ops {
    background: #e3f2fd;
    color: #1565c0;
  }

  /* Grid Layout */
  .grid-layout {
    padding: 1rem;
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
    border-radius: 3px;
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
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
