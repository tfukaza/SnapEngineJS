<script lang="ts">
  // Data for DropAndSnap card preview
  const dsKanbanTodo = [
    { id: "ds-k1", text: "Fix Scroll Bug", tag: "Bug", color: "#e74c3c", user: "JS" },
    { id: "ds-k2", text: "New Icon Set", tag: "Design", color: "#9b59b6", user: "AL" },
    { id: "ds-k3", text: "Optimize Images", tag: "Perf", color: "#f39c12", user: "MK" },
    { id: "ds-k7", text: "Write Docs", tag: "Misc", color: "#95a5a6", user: "JS" },
    { id: "ds-k8", text: "Update Deps", tag: "Maint", color: "#34495e", user: "RT" }
  ];
  
  const dsKanbanProgress = [
    { id: "ds-k4", text: "Sidebar Nav", tag: "Feat", color: "#3498db", user: "MK" },
    { id: "ds-k5", text: "User Auth", tag: "Back", color: "#2ecc71", user: "AL" },
    { id: "ds-k9", text: "Dark Mode", tag: "Feat", color: "#8e44ad", user: "RT" }
  ];
  
  const dsKanbanDone = [
     { id: "ds-k6", text: "v1.0 Release", tag: "Dep", color: "#34495e" }
  ];

  const dsTodoItems = [
    { id: "ds-t1", text: "Buy groceries", checked: false, priority: "Med", color: "#f39c12" },
    { id: "ds-t2", text: "Walk the dog", checked: true, priority: "Low", color: "#3498db" },
    { id: "ds-t3", text: "Reply to emails", checked: false, priority: "High", color: "#e74c3c" },
    { id: "ds-t4", text: "Water plants", checked: false, priority: "Med", color: "#f39c12" },
    { id: "ds-t5", text: "Schedule Dentist", checked: false, priority: "High", color: "#e74c3c" },
    { id: "ds-t6", text: "Pay Bills", checked: true, priority: "High", color: "#e74c3c" },
    { id: "ds-t7", text: "Call Mom", checked: false, priority: "Low", color: "#3498db" }
  ];
</script>

<section class="assets-showcase">
    <h2 class="eyebrow">Assets</h2>
    <p class="subhead">Interactive UI elements, ready out of the box.</p>

    <div class="assets-grid">
      <div class="asset-card card ground">
        <h3>SnapZap</h3>
        <p>Zoom and pan any DOM element.</p>
        <span class="coming-soon-label">Coming Soon</span>
      </div>
      <a href="/dropandsnap" class="asset-card drop-snap-card card ground">
        <div class="card-content-wrapper">
          <h3>DropAndSnap</h3>
          <p>Sortable lists and items.</p>
        </div>

        <div class="ds-preview">
          <div class="ds-board-transform">
              <div class="ds-grid">
                <!-- Cell 1: Kanban -->
                <div class="ds-grid-cell kanban-cell card ground">
                  <h6>Kanban Board</h6>
                  <div class="ds-kanban-row">
                     <div class="ds-col">
                        <div class="ds-static-container">
                          {#each dsKanbanTodo as item (item.id)}
                            <div style="margin-bottom: 8px; width: 100%;">
                              <div class="ds-card">
                                <span class="ds-tag" style="background-color: {item.color}">{item.tag}</span>
                                <span class="ds-text">{item.text}</span>
                                <div class="ds-card-footer">
                                  <div class="ds-user-avatar" style="background-color: {item.color}20; color: {item.color}">{item.user}</div>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                     </div>
                     <div class="ds-col">
                        <div class="ds-static-container ">
                          {#each dsKanbanProgress as item (item.id)}
                            <div style="margin-bottom: 8px; width: 100%;">
                              <div class="ds-card">
                                <span class="ds-tag" style="background-color: {item.color}">{item.tag}</span>
                                <span class="ds-text">{item.text}</span>
                                <div class="ds-card-footer">
                                  <div class="ds-user-avatar" style="background-color: {item.color}20; color: {item.color}">{item.user}</div>
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                     </div>
                  </div>
                </div>

                <!-- Cell 2: Todo List -->
                <div class="ds-grid-cell todo-cell card ground">
                   <div class="ds-static-container ">
                      {#each dsTodoItems as item (item.id)}
                        <div style="margin-bottom: 8px; width: 100%;">
                           <div class="ds-todo-item">
                              <div class="ds-checkbox {item.checked ? 'checked' : ''}"></div>
                              <span class="ds-text {item.checked ? 'strikethrough' : ''}">{item.text}</span>
                              <span class="ds-badge" style="background-color: {item.color}">{item.priority}</span>
                           </div>
                        </div>
                      {/each}
                   </div>
                </div>
              </div>
          </div>
        </div>
      </a>
      <div class="asset-card card ground">
        <h3>SnapLine</h3>
        <p>Node based UI.</p>
        <span class="coming-soon-label">Coming Soon</span>
      </div>
    </div>

</section>

<style lang="scss">
  @use "../landing.scss";

  .explainer-surface {
    background: transparent;
    border-radius: 0;
    padding: clamp(1.5rem, 4vw, 3rem);
    text-align: center;
  }

  .eyebrow {
    margin-bottom: 0.5rem;
    text-align: center;
  }

  .subhead {
    color: #5e4d44;
    font-size: 1rem;
    max-width: 32rem;
    margin: 0 auto clamp(2rem, 4vw, 3rem);
    line-height: 1.6;
  }
 
  .assets-showcase {
    margin-top: clamp(3rem, 6vw, 6rem);
    margin-bottom: clamp(3rem, 6vw, 6rem);
  }

  .assets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.5rem;
    text-align: left;
    margin-top: 2rem;
  }

  .kanban-cell {
    transition: transform 0.2s ease;
  }

  .todo-cell {
    transition: transform 0.2s ease;
  }

  .asset-card {
    background: rgba(255, 255, 255, 0.4);
    // border: 1px solid rgba(125, 106, 95, 0.1);
    // border-radius: var(--size-4);
    padding: 1.5rem;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    display: block;
    min-height: 400px;
    text-decoration: none;
    color: inherit;

    &:hover {
      transform: translateY(-2px);
      // box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      background: rgba(255, 255, 255, 0.6);

      .kanban-cell {
        transform: translateY(20px);
      }

      .todo-cell {
        transform: translateY(-20px);
      }
    }

  }

  :global(.drop-snap-card) {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .card-content-wrapper {
    position: relative;
    z-index: 2;
  }
  
  .coming-soon-label {
    display: inline-block;
    margin-top: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: #888;
    background: rgba(0, 0, 0, 0.05);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  .ds-preview {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
    background-color: var(--color-background-tint);
    mask-image: linear-gradient(to bottom, transparent 90px, black 150px, black 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 90px, black 150px, black 100%);

  }

  .ds-board-transform {
    transform-origin: center center;
    transform: rotate(30deg) scale(0.9) translateX(10%) translateY(15%);
    width: 100%; 
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .ds-grid {
    display: flex;
    flex-direction: row;
    gap: 24px;
    align-items: flex-start;
  }

  .ds-static-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .ds-grid-cell {
    width: 280px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    
    h6 {
      margin: 0 0 12px 0;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #726a66;
    }
  }

  .ds-kanban-row {
    display: flex;
    gap: 10px;
    flex: 1;
  }

  .ds-col {
    flex: 1;
    background: rgba(255, 255, 255, 0.3);
    border-radius: 6px;
    padding: 8px;
  }
  
  .ds-card {
    background: white;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .ds-card-footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
    border-top: 1px solid rgba(0,0,0,0.05);
    padding-top: 8px;
  }

  .ds-user-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    font-size: 0.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
  }
  
  .ds-tag {
    font-size: 0.6rem;
    color: white;
    padding: 3px 8px;
    border-radius: 4px;
    align-self: flex-start;
    font-weight: 600;
  }
  
  .ds-text {
    font-size: 0.85rem;
    color: #222;
    font-weight: 600;
    line-height: 1.3;
    
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
    border-radius: 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }

  .ds-checkbox {
    width: 14px;
    height: 14px;
    border: 2px solid #ddd;
    border-radius: 4px;
    
    &.checked {
      background-color: var(--color-secondary-2);
      border-color: var(--color-secondary-2);
    }
  }

  .ds-badge {
    margin-left: auto;
    font-size: 0.5rem;
    padding: 2px 6px;
    color: white;
    border-radius: 10px;
  }

  @media (max-width: 600px) {
    .asset-card {
      min-height: 200px;
      max-height: 250px;
    }
  }
</style>
