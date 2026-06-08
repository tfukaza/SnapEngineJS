<script lang="ts">
  // Data for SnapSort card preview
  const dsKanbanTodo = [
    {
      id: "ds-k1",
      text: "Fix Bug #12",
      tag: "Bug",
      desc: "Fix the login issue on Safari browser.",
    },
    {
      id: "ds-k2",
      text: "Write Tests",
      tag: "Dev",
      desc: "Add unit tests for the new payment module.",
    },
  ];

  const dsKanbanDone = [
    {
      id: "ds-k3",
      text: "Code Review",
      tag: "Dev",
      desc: "Review the PR for the new feature.",
    },
    {
      id: "ds-k4",
      text: "Deploy to Prod",
      tag: "Ops",
      desc: "Deploy the latest build to production.",
    },
  ];

  const dsTodoItems = [
    { id: "ds-t1", text: "Buy groceries", checked: false, priority: "Med" },
    { id: "ds-t2", text: "Walk the dog", checked: true, priority: "Low" },
    { id: "ds-t3", text: "Reply to emails", checked: false, priority: "High" },
    { id: "ds-t4", text: "Gym workout", checked: false, priority: "Med" },
    { id: "ds-t5", text: "Read book", checked: true, priority: "Low" },
    { id: "ds-t6", text: "Pay bills", checked: false, priority: "High" },
    { id: "ds-t7", text: "Call mom", checked: false, priority: "Low" },
  ];

  const dsSentenceWords = ["あり", "の", "ます", "多く", "が", "用途"];
  const dsLayoutItems = [
    "(o^▽^o)",
    "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧",
    "(;¬_¬)",
    "(ง'̀-'́)ง",
    "¯\\_(ツ)_/¯",
    "(*￣▽￣)b",
  ];
  const pendingPlusCells = Array.from({ length: 96 }, (_, index) => index);
</script>

<section id="assets" class="assets-showcase landing-section-gap">
    <div class="assets-header">
      <h2 class="eyebrow landing-section-heading">Composable assets</h2>
      <p class="subhead">
        Start with reusable patterns built on SnapEngine, then shape them into
        the exact interface your product needs.
      </p>
    </div>

    <div class="assets-grid">
      <a href="/snapsort" class="asset-card drop-snap-card">
        <div class="asset-copy">
          <div class="asset-card-header">
            <h3>SnapSort</h3>
          </div>
          <p>Sortable lists, nested drop zones, and direct drag feedback.</p>
        </div>

        <div class="asset-preview ds-preview" aria-hidden="true">
          <div class="ds-preview-column">
            <div class="ds-example todo-example card">
              <h6>TODO List</h6>
              <div class="ds-static-container">
                {#each dsTodoItems.slice(0, 4) as item (item.id)}
                  <div class="ds-todo-item">
                    <div class="ds-checkbox {item.checked ? 'checked' : ''}"></div>
                    <span class="ds-text {item.checked ? 'strikethrough' : ''}">{item.text}</span>
                    <span class="ds-badge {item.priority.toLowerCase()}">{item.priority}</span>
                  </div>
                {/each}
              </div>
            </div>

            <div class="ds-example sentence-example card">
              <h6>Sentence Builder</h6>
              <div class="sentence-target display">It has many uses</div>
              <div class="sentence-word-row">
                {#each dsSentenceWords as word}
                  <span class="word-card sentence-word">{word}</span>
                {/each}
              </div>
            </div>
          </div>

          <div class="ds-preview-column">
            <div class="ds-example kanban-example card">
              <h6>Kanban Board</h6>
              <div class="ds-kanban-row">
                <div class="ds-col card">
                  <h4>To Do</h4>
                  {#each dsKanbanTodo as item (item.id)}
                    <div class="ds-card">
                      <div class="ds-card-header">
                        <span class="ds-tag {item.tag.toLowerCase()}">{item.tag}</span>
                        <span class="ds-text">{item.text}</span>
                      </div>
                      <p>{item.desc}</p>
                    </div>
                  {/each}
                </div>
                <div class="ds-col card">
                  <h4>Done</h4>
                  {#each dsKanbanDone as item (item.id)}
                    <div class="ds-card">
                      <div class="ds-card-header">
                        <span class="ds-tag {item.tag.toLowerCase()}">{item.tag}</span>
                        <span class="ds-text">{item.text}</span>
                      </div>
                      <p>{item.desc}</p>
                    </div>
                  {/each}
                </div>
              </div>
            </div>

            <div class="ds-example layout-example card">
              <h6>Multi-row Flex Layout</h6>
              <div class="layout-chip-row">
                {#each dsLayoutItems as item}
                  <span class="layout-chip">{item}</span>
                {/each}
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
          <p>Zoom and pan any DOM element without taking over the rest of the page.</p>
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
          <p>Node-based UI primitives for graph editors and visual tools.</p>
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
    color: #5d6266;
    font-size: clamp(1rem, 1.3vw, 1.18rem);
    max-width: 620px;
    margin: 0 auto;
    line-height: 1.7;
    text-align: center;
  }
 
  .assets-showcase {
    --assets-content-gap: clamp(2rem, 4vw, 3rem);
    margin-bottom: clamp(3rem, 6vw, 6rem);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    text-align: left;
    margin-top: var(--assets-content-gap);
  }

  .asset-card {
    display: flex;
    align-items: center;
    gap: clamp(1.5rem, 4vw, 3rem);
    padding: clamp(1.5rem, 3vw, 2.5rem);
    transition: transform 0.2s ease;
    text-decoration: none;
    color: inherit;
    font-family: "Geist", sans-serif;
    background: var(--color-background-tint);
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-radius: var(--ui-radius);
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
      margin: 0;
      color: #5d6266;
      font-family: "Geist", sans-serif;
      font-size: clamp(0.95rem, 1.1vw, 1.05rem);
      font-weight: 400;
      line-height: 1.6;
      max-width: 22rem;
    }

    &:hover {
      transform: translateY(-2px);
    }

  }

  .planned-card {
    min-height: 0;
  }

  :global(.drop-snap-card) {
    --demo-window-height: 320px;
    --demo-stack-height: 392px;
    position: relative;
    height: var(--demo-window-height);
    overflow: hidden;
  }
  
  .asset-copy {
    position: relative;
    z-index: 1;
    flex: 0 1 42%;
    min-width: 0;
  }

  .asset-card-header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--size-12);
    margin-bottom: var(--size-16);
  }

  .asset-preview {
    position: relative;
    flex: 1 1 58%;
    min-width: 0;
    min-height: 180px;
  }

  .ds-preview {
    display: flex;
    align-items: flex-start;
    align-self: center;
    gap: var(--size-16);
    height: var(--demo-stack-height);
    min-height: var(--demo-stack-height);
    overflow: visible;
    pointer-events: none;
  }

  .ds-preview-column {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    align-items: stretch;
    gap: var(--size-16);
    min-width: 0;
  }

  .ds-example {
    min-width: 0;
    height: var(--ds-example-height);
    padding: var(--size-16);
    box-sizing: border-box;
    overflow: hidden;

    h6 {
      margin: 0 0 var(--size-12);
      color: #8f9497;
      font-family: "Bitcount Grid Single", monospace;
      font-size: 0.82rem;
      font-weight: 300;
      letter-spacing: 0;
      line-height: 1;
    }
  }

  .todo-example {
    --ds-example-height: 188px;
  }

  .kanban-example {
    --ds-example-height: 232px;
  }

  .sentence-example,
  .layout-example {
    --ds-example-height: 132px;
  }

  .ds-static-container {
    display: flex;
    flex-direction: column;
    gap: var(--size-6);
    width: 100%;
  }

  .ds-kanban-row {
    display: flex;
    gap: var(--size-8);
    flex: 1;
  }

  .ds-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--size-8);
    min-width: 0;
    padding: var(--size-8);
  }

  .ds-col h4 {
    margin: 0 0 var(--size-4);
    color: #7d6a5f;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    line-height: 1;
    text-transform: uppercase;
  }
  
  .ds-card {
    display: flex;
    flex-direction: column;
    gap: var(--size-4);
    padding: var(--size-8);
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 0;
    background: white;
    box-sizing: border-box;
  }

  .ds-card-header {
    display: flex;
    align-items: center;
    gap: var(--size-6);
    min-width: 0;
  }

  .ds-card p {
    margin: 0;
    color: #555;
    font-family: "Geist", sans-serif;
    font-size: 0.58rem;
    font-weight: 400;
    line-height: 1.25;
    max-width: none;
  }
  
  .ds-tag {
    flex: 0 0 auto;
    font-family: "Geist", sans-serif;
    font-size: 0.55rem;
    color: white;
    padding: 2px 5px;
    border-radius: 4px;
    font-weight: 600;
    line-height: 1;
  }

  .ds-tag.bug {
    background: var(--color-secondary-3);
  }

  .ds-tag.dev {
    background: var(--color-secondary-2);
  }

  .ds-tag.ops {
    background: var(--color-secondary-4);
  }
  
  .ds-text {
    min-width: 0;
    overflow: hidden;
    color: #222;
    font-family: "Geist", sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    line-height: 1.3;
    text-overflow: ellipsis;
    white-space: nowrap;
    
    &.strikethrough {
      text-decoration: line-through;
      opacity: 0.6;
    }
  }

  .ds-todo-item {
    display: flex;
    align-items: center;
    gap: 10px;
    background: white;
    padding: 8px 12px;
    border: 1px solid rgb(219, 219, 219);
    border-radius: var(--ui-radius);
  }

  .ds-checkbox {
    width: 14px;
    height: 14px;
    flex: 0 0 auto;
    border: 2px solid #ddd;
    border-radius: 4px;
    
    &.checked {
      background-color: #3a2a22;
      border-color: #3a2a22;
    }
  }

  .ds-badge {
    margin-left: auto;
    flex: 0 0 auto;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.58rem;
    font-weight: 500;
    line-height: 1.2;
  }

  .ds-badge.high {
    background: #ffebee;
    color: #c62828;
  }

  .ds-badge.med {
    background: #fff3e0;
    color: #ef6c00;
  }

  .ds-badge.low {
    background: #e8f5e9;
    color: #2e7d32;
  }

  .sentence-target {
    margin-bottom: var(--size-8);
    --card-color: #232526;
    --display-text-color: #e8e6dc;
    padding: var(--size-8) var(--size-12);
    color: var(--display-text-color);
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.78rem;
    font-weight: 300;
    line-height: 1;
  }

  .sentence-word-row,
  .layout-chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-6);
  }

  .word-card,
  .layout-chip {
    display: inline-flex;
    align-items: center;
    min-height: 1.5rem;
    padding: 2px 6px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    color: #3a2a22;
    font-family: "DotGothic16", sans-serif;
    font-size: 0.68rem;
    font-weight: 600;
    line-height: 1;
    box-shadow: 0 3px 0 0 #d8dde0;
  }

  .layout-chip {
    color: #3a2a22;
    font-family: "DotGothic16", sans-serif;
    font-size: 0.56rem;
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
    color: inherit;
    margin: 0;
  }

  @media (max-width: 900px) {
    .asset-card {
      flex-direction: column;
      align-items: stretch;
      min-height: 0;
    }

    :global(.drop-snap-card) {
      height: auto;
      overflow: visible;
    }

    .asset-copy,
    .asset-preview {
      flex-basis: auto;
      min-height: 160px;
    }

    .ds-preview {
      align-items: flex-start;
    }
  }

  @media (max-width: 560px) {
    .ds-preview {
      flex-direction: column;
    }

    .ds-preview-column {
      width: 100%;
    }
  }
</style>
