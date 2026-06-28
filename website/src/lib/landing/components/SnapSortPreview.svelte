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

  function priorityChipClass(priority: string) {
    const classes: Record<string, string> = {
      High: "chip-warning",
      Med: "chip-ready",
      Low: "chip-muted",
    };

    return classes[priority] ?? "chip-muted";
  }
</script>

<div class="snapsort-preview" aria-hidden="true">
  <div class="todo-example card">
    <h6>TODO List</h6>
    <div class="todo-list">
      {#each todoItems as item (item.id)}
        <div class="todo-item">
          <div class="todo-checkbox {item.checked ? 'checked' : ''}"></div>
          <span class="todo-text {item.checked ? 'strikethrough' : ''}">{item.text}</span>
          <span class={`chip ${priorityChipClass(item.priority)} preview-priority`}>{item.priority}</span>
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  .snapsort-preview {
    width: 100%;
    max-width: 24rem;
    margin: 0 auto;
    pointer-events: none;
  }

  .todo-example {
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

  .todo-text {
    min-width: 0;
    overflow: hidden;
    color: #222;
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

  .preview-priority {
    flex: 0 0 auto;
  }
</style>
