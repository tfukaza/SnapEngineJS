<script lang="ts">
  const todoItems = [
    { id: "t-1", text: "Buy groceries", checked: false, priority: "Med" },
    { id: "t-2", text: "Walk the dog", checked: true, priority: "Low" },
    { id: "t-3", text: "Reply to emails", checked: false, priority: "High" },
    { id: "t-4", text: "Gym workout", checked: false, priority: "Med" },
    { id: "t-5", text: "Read book", checked: true, priority: "Low" },
    { id: "t-6", text: "Pay bills", checked: false, priority: "High" },
    { id: "t-7", text: "Call mom", checked: false, priority: "Low" },
    { id: "t-8", text: "Water plants", checked: false, priority: "Med" },
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

  const sentenceWords = ["あり", "の", "ます", "多く", "が", "用途"];

  const layoutItems = [
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
  ];

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

<div class="snapsort-preview" aria-hidden="true">
  <div class="preview-example todo-example card">
    <h6>TODO List</h6>
    <div class="todo-list">
      {#each todoItems.slice(0, 4) as item (item.id)}
        <div class="todo-item">
          <div class="todo-checkbox {item.checked ? 'checked' : ''}"></div>
          <span class="todo-text {item.checked ? 'strikethrough' : ''}">{item.text}</span>
          <span class={`chip ${priorityChipClass(item.priority)} preview-priority`}>{item.priority}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="preview-example kanban-example card">
    <h6>Kanban Board</h6>
    <div class="kanban-board">
      <div class="kanban-column">
        <h4>To Do</h4>
        {#each kanbanTodo as item (item.id)}
          <div class="kanban-card">
            <div class="kanban-header">
              <span class="kanban-title">{item.text}</span>
            </div>
            <p>{item.desc}</p>
            <span class={`chip ${tagChipClass(item.tag)} preview-tag`}>{item.tag}</span>
          </div>
        {/each}
      </div>
      <div class="kanban-column">
        <h4>Done</h4>
        {#each kanbanDone as item (item.id)}
          <div class="kanban-card">
            <div class="kanban-header">
              <span class="kanban-title">{item.text}</span>
            </div>
            <p>{item.desc}</p>
            <span class={`chip ${tagChipClass(item.tag)} preview-tag`}>{item.tag}</span>
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="preview-example sentence-example card">
    <h6>Sentence Builder</h6>
    <div class="sentence-target display">It has many uses</div>
    <div class="sentence-word-row">
      {#each sentenceWords as word}
        <span class="word-card sentence-word">{word}</span>
      {/each}
    </div>
  </div>

  <div class="preview-example layout-example card">
    <h6>Multi-row Flex Layout</h6>
    <div class="layout-chip-row">
      {#each layoutItems as item}
        <span class="layout-chip">{item}</span>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .snapsort-preview {
    position: relative;
    width: 720px;
    height: var(--demo-stack-height);
    min-height: var(--demo-stack-height);
    overflow: visible;
    pointer-events: none;
  }

  .preview-example {
    position: absolute;
    min-width: 0;
    padding: var(--size-24);
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
    top: -24px;
    left: 0;
    width: 255px;
    height: 278px;
  }

  .kanban-example {
    top: 0;
    left: 275px;
    width: 430px;
    height: 324px;
  }

  .sentence-example {
    top: 276px;
    left: 0;
    width: 255px;
    height: 166px;
  }

  .layout-example {
    top: 376px;
    left: 330px;
    width: 310px;
    height: 142px;
  }

  .todo-list {
    display: flex;
    flex-direction: column;
    gap: var(--size-8);
    width: 100%;
  }

  .todo-item {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 14px;
    border: 1px solid rgb(219, 219, 219);
    border-radius: var(--ui-radius);
    background: white;
  }

  .todo-checkbox {
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

  .todo-text,
  .kanban-title {
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

  .preview-priority,
  .preview-tag {
    flex: 0 0 auto;
  }

  .kanban-board {
    display: flex;
    gap: var(--size-12);
    height: calc(100% - 24px);
  }

  .kanban-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-width: 0;
    padding: var(--size-12);
  }

  .kanban-column h4 {
    margin: 0 0 var(--size-4);
    color: #7d6a5f;
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    line-height: 1;
    text-transform: uppercase;
  }

  .kanban-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: var(--size-12);
    border: 1px solid rgba(0, 0, 0, 0.05);
    background: white;
    box-sizing: border-box;
  }

  .kanban-header {
    min-width: 0;
  }

  .kanban-card p {
    margin: 0;
    color: #555;
    font-family: "Geist", sans-serif;
    font-size: 0.58rem;
    font-weight: 400;
    line-height: 1.25;
    max-width: none;
  }

  .preview-tag {
    width: fit-content;
  }

  .sentence-target {
    margin-bottom: 14px;
    --card-color: #232526;
    --display-text-color: #e8e6dc;
    padding: var(--size-12) var(--size-16);
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
    gap: 10px;
  }

  .word-card,
  .layout-chip {
    display: inline-flex;
    align-items: center;
    min-height: 1.5rem;
    padding: 4px 8px;
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

  .layout-example {
    font-family: "DotGothic16", sans-serif;
  }

  .layout-chip {
    color: #3a2a22;
    font-family: inherit;
    font-size: 0.56rem;
  }

  @media (max-width: 560px) {
    .snapsort-preview {
      width: 640px;
      transform: scale(0.82);
      transform-origin: top left;
    }
  }
</style>
