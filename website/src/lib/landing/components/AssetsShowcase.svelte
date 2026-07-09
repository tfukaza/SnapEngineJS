<script lang="ts">
  const pendingPlusCells = Array.from({ length: 96 }, (_, index) => index);
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

<section id="assets" class="assets-showcase landing-section-gap">
    <div class="assets-header">
      <h2 class="eyebrow landing-section-heading">Composable Assets</h2>
      <p class="subhead">
        Start with reusable patterns built on SnapEngine, then shape them into
        the exact interface your UI needs.
      </p>
    </div>

    <div class="assets-grid">
      <a href="/snapsort" class="asset-card drop-snap-card">
        <div class="asset-copy">
          <div class="asset-card-header">
            <h3>SnapSort</h3>
          </div>
          <p>Drag and drop any element</p>
          <div class="framework-list" aria-label="Framework availability">
            <span class="chip framework-chip">Vanilla JS</span>
            <span class="chip framework-chip">Svelte</span>
            <span class="chip framework-chip framework-logo-chip" aria-label="Vue WIP">
              <img src="/icon/vue.svg" alt="" aria-hidden="true" />
              <small>WIP</small>
            </span>
            <span class="chip framework-chip framework-logo-chip" aria-label="Angular WIP">
              <img src="/icon/angular.svg" alt="" aria-hidden="true" />
              <small>WIP</small>
            </span>
          </div>
        </div>

        <div class="asset-preview">
          <div class="snapsort-preview" aria-hidden="true">
            <div class="todo-example card">
              <h6>TODO List</h6>
              <div class="todo-list">
                {#each todoItems as item (item.id)}
                  <div class="todo-item">
                    <div class="todo-checkbox {item.checked ? 'checked' : ''}"></div>
                    <span class="todo-text {item.checked ? 'strikethrough' : ''}">{item.text}</span>
                    <span class={`chip ${priorityChipClass(item.priority)} preview-priority`}>
                      {item.priority}
                    </span>
                  </div>
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1.5rem;
    text-align: left;
    margin-top: var(--assets-content-gap);
  }

  .asset-card {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--size-24);
    padding: clamp(1.5rem, 3vw, 2.5rem);
    transition: transform 0.2s ease;
    text-decoration: none;
    color: inherit;
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
    position: relative;
    overflow: hidden;
  }

  .asset-copy {
    position: relative;
    z-index: 1;
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
    gap: var(--size-8);
    margin-top: var(--size-16);
  }

  .framework-chip {
    background: #f0f2f2;
    color: #3f4548;
  }

  .framework-logo-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 2rem;
    padding: var(--size-4) var(--size-8);
  }

  .framework-logo-chip img {
    display: block;
    max-width: 2.25rem;
    max-height: 1.5rem;
    object-fit: contain;
  }

  .framework-logo-chip small {
    position: absolute;
    top: -0.4rem;
    right: -0.45rem;
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
      min-height: 160px;
    }

  }
</style>
