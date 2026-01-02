<script lang="ts">
  import Canvas from "../../../../svelte/src/lib/Canvas.svelte";
  import Item from "../../../../svelte/src/demo/drag_drop/Item.svelte";
  import Container from "../../../../svelte/src/demo/drag_drop/ItemContainer.svelte";

  const title = "Drop and Snap";
  const subtitle1 = "Drag and drop library for the DOM.";
  const subtitle2 = "Framework agnostic and extensible.";

  const titleChars = title.split("").map((char, i) => ({ char, id: `t-${i}` }));
  const subtitleWords1 = subtitle1.split(" ").map((word, i) => ({ word, id: `s1-${i}` }));
  const subtitleWords2 = subtitle2.split(" ").map((word, i) => ({ word, id: `s2-${i}` }));

  const projectItems = [
    { id: "p-1", text: "Design System", checked: true, assignee: "JD", date: "Oct 24", priority: "High" },
    { id: "p-2", text: "API Integration", checked: false, assignee: "AL", date: "Oct 25", priority: "Med" },
    { id: "p-3", text: "User Testing", checked: false, assignee: "MK", date: "Oct 26", priority: "High" },
    { id: "p-4", text: "Documentation", checked: true, assignee: "JD", date: "Oct 27", priority: "Low" }
  ];

  const kanbanTodo = [
    { id: "k-1", text: "Fix Bug #12", tag: "Bug", desc: "Fix the login issue on Safari browser." },
    { id: "k-2", text: "Write Tests", tag: "Dev", desc: "Add unit tests for the new payment module." }
  ];

  const kanbanDone = [
    { id: "k-3", text: "Code Review", tag: "Dev", desc: "Review the PR for the new feature." },
    { id: "k-4", text: "Deploy to Prod", tag: "Ops", desc: "Deploy the latest build to production." }
  ];

  const sentenceWords = [
    { id: "sw-1", text: "あり" },
    { id: "sw-2", text: "の" },
    { id: "sw-3", text: "ます" },
    { id: "sw-4", text: "多く" },
    { id: "sw-5", text: "が" },
    { id: "sw-6", text: "用途" }
  ];

  const gridItems = Array.from({ length: 32 }, (_, i) => ({ 
    id: `g-${i}`, 
    text: `${i + 1}` + ".".repeat(Math.floor(Math.random() * 8))
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
    const words = Array.from(sentenceDropZone.querySelectorAll(".sentence-word")).map(el => el.textContent?.trim());
    const correct = ["多く", "の", "用途", "が", "あり", "ます"];
    
    if (words.length === correct.length && words.every((w, i) => w === correct[i])) {
        sentenceResult = "Correct!";
    } else {
        sentenceResult = "Incorrect, try again.";
    }
  }
</script>

<div class="page">
  <div class="debug-toggle">
    <button onclick={toggleDebug}>
      {debug ? "Disable Debug" : "Enable Debug"}
    </button>
  </div>
  <Canvas id="dropandsnap-canvas" bind:this={canvasComponent} {debug}>
    <div class="layout">
      <div class="hero-section">
        <div class="title-section slot">
          <Container config={{ direction: "row", groupID: "dropandsnap-title" }}>
            {#each titleChars as { char, id } (id)}
              <Item style="padding: 0; width: auto;">
                <div class="card char-card">
                  <span class="char title-text">{char === " " ? "\u00A0" : char}</span>
                </div>
              </Item>
            {/each}
          </Container>
        </div>

        <div class="subtitle-wrapper">
          <div class="subtitle-row slot">
            <Container config={{ direction: "row", groupID: "dropandsnap-subtitle-1" }}>
              {#each subtitleWords1 as { word, id } (id)}
                <Item style="padding: 0; width: auto;">
                  <div class="card word-card">
                    <span class="word subtitle-text">{word}</span>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
          <div class="subtitle-row slot">
            <Container config={{ direction: "row", groupID: "dropandsnap-subtitle-2" }}>
              {#each subtitleWords2 as { word, id } (id)}
                <Item style="padding: 0; width: auto;">
                  <div class="card word-card">
                    <span class="word subtitle-text">{word}</span>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
        </div>
        
        <p class="powered-by">Powered by SnapEngine</p>
      </div>

      <div class="examples-section">
        <div class="example-container">
          <h3>Project Management</h3>
          <div class="card project-list">
            <Container config={{ direction: "column", groupID: "project-list" }}>
              {#each projectItems as { id, text, checked, assignee, date, priority } (id)}
                <Item>
                  <div class="card project-card">
                    <div class="checkbox" class:checked></div>
                    <span class="project-text">{text}</span>
                    <span class="priority {priority.toLowerCase()}">{priority}</span>
                    <span class="date">{date}</span>
                    <div class="avatar">{assignee}</div>
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
        </div>

        <div class="example-container">
          <h3>Kanban Board</h3>
          <div class="kanban-board">
            <div class="kanban-column card">
              <h4>To Do</h4>
              <Container config={{ direction: "column", groupID: "kanban", name: "kanban-todo", onClickAction: { action: "moveTo", target: "kanban-done" } }}>
                {#each kanbanTodo as { id, text, tag, desc } (id)}
                  <Item>
                    <div class="card kanban-card">
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
            <div class="kanban-column card">
              <h4>Done</h4>
              <Container config={{ direction: "column", groupID: "kanban", name: "kanban-done", onClickAction: { action: "moveTo", target: "kanban-todo" } }}>
                {#each kanbanDone as { id, text, tag, desc } (id)}
                  <Item>
                    <div class="card kanban-card">
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

        <div class="example-container">
          <h3>Sentence Builder</h3>
          <div class="card sentence-builder">
            <div class="prompt-section">

                <div class="english-sentence">
                   
                    <span>It has many uses</span>
                </div>
            </div>
            <div class="sentence-drop-zone" bind:this={sentenceDropZone}>
               <Container config={{ direction: "row", groupID: "sentence", name: "sentence-target", onClickAction: { action: "moveTo", target: "sentence-source" } }}>
                  <div class="placeholder">Drop words here</div>
               </Container>
            </div>
            <div class="sentence-source-zone">
               <Container config={{ direction: "row", groupID: "sentence", name: "sentence-source", onClickAction: { action: "moveTo", target: "sentence-target" } }}>
                  {#each sentenceWords as { id, text } (id)}
                    <Item>
                      <div class="card word-card sentence-word">{text}</div>
                    </Item>
                  {/each}
               </Container>
            </div>
            <div class="controls">
                <button class="check-btn" onclick={checkSentence}>Check</button>
                {#if sentenceResult}
                    <span class="result" class:success={sentenceResult === "Correct!"}>{sentenceResult}</span>
                {/if}
            </div>
          </div>
        </div>

        <div class="example-container">
          <h3>Multi-row Flex Layout</h3>
          <div class="card grid-layout">
            <Container config={{ direction: "row", groupID: "grid-layout" }}>
              {#each gridItems as { id, text } (id)}
                <Item style="padding: 0.15rem;">
                  <div class="card grid-card">
                    {text}
                  </div>
                </Item>
              {/each}
            </Container>
          </div>
        </div>
      </div>
    </div>
  </Canvas>
</div>

<style>
  @import "../../../../app.scss";

  .page {
    width: 100%;
    min-height: 100vh;
    background: #fdfbf9;
    color: #3a2a22;
    overflow-y: auto;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  }

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

  .layout {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    padding: 2rem;
    box-sizing: border-box;
  }

  .hero-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 80vh;
    width: 100%;
  }

  .title-section {
    width: fit-content;
    margin-bottom: 2rem;
    box-sizing: border-box;
  }
  
  .title-section :global(.container) {
    justify-content: center;
    width: auto;
  }

  .subtitle-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    max-width: 800px;
    box-sizing: border-box;
  }

  .subtitle-row {
    width: fit-content;
  }

  .subtitle-row :global(.container) {
    justify-content: center;
    width: auto;
  }

  .card {
    box-shadow: none;
  }

  .char-card {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
  }

  .word-card {
    padding: 0.5rem 0.75rem;
    cursor: grab;
  }

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

  /* Examples Section */
  .examples-section {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4rem;
    width: 100%;
    max-width: 1200px;
    margin-top: 4rem;
    margin-bottom: 4rem;
  }

  .example-container {
    flex: 0 0 calc(50% - 2rem);
    min-width: 300px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Sentence Builder */
  .sentence-builder {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: white;
    min-height: 300px;
  }

  .prompt-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .prompt-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: #3a2a22;
  }

  .english-sentence {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 1.2rem;
    color: #3a2a22;
  }

  .speaker-icon {
    width: 24px;
    height: 24px;
    opacity: 0.6;
    cursor: pointer;
  }

  .sentence-drop-zone {
    min-height: 80px;
    border-bottom: 2px solid #eee;
    padding: 0.5rem;
    display: flex;
    align-items: center;
    position: relative;
  }
  
  .sentence-drop-zone :global(.container) {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    min-height: 40px;
    width: 100%;
    flex-wrap: wrap;
  }

  .sentence-source-zone {
    min-height: 80px;
    padding: 0.5rem;
  }

  .sentence-source-zone :global(.container) {
    display: flex;
    flex-direction: row;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .sentence-word {
    background: #f5f5f5;
    border: 1px solid #ddd;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
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
    background: #3a2a22;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
    font-family: inherit;
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

  .example-container h3 {
    font-family: "Tomorrow", sans-serif;
    font-size: 1.5rem;
    margin: 0;
    color: #3a2a22;
  }

  /* Project List */
  .project-list {
    padding: 1rem;
    height: 100%;
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
    grid-template-columns: 24px 1fr 60px 60px 24px;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    margin-bottom: 0.5rem;
    background: white;
    border: 1px solid rgba(0,0,0,0.05);
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
  
  .priority.high { background: #ffebee; color: #c62828; }
  .priority.med { background: #fff3e0; color: #ef6c00; }
  .priority.low { background: #e8f5e9; color: #2e7d32; }

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
    border: 1px solid rgba(0,0,0,0.05);
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
    background: #fafafa;
  }

  .grid-card {
    min-height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    font-weight: 600;
    color: #5e4d44;
    border: 1px solid rgba(0,0,0,0.05);
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