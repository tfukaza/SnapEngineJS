<script lang="ts">
  import { onMount } from 'svelte';
  
  let container: HTMLDivElement;
  let cols = $state(12);
  let rows = $state(7);
  let dots = $derived(Array(cols * rows).fill(false).map((_, i) => i % 3 === 0));

  function updateGridSize() {
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const dotSize = 16;
    const gap = 2;
    const padding = 16; // 0.5rem * 2 sides
    
    const availableWidth = rect.width - padding;
    const availableHeight = rect.height - padding;
    
    cols = Math.floor((availableWidth + gap) / (dotSize + gap));
    rows = Math.floor((availableHeight + gap) / (dotSize + gap));
    
    // Ensure minimum grid size
    cols = Math.max(cols, 1);
    rows = Math.max(rows, 1);
  }

  onMount(() => {
    updateGridSize();
    
    // Update on window resize
    const resizeObserver = new ResizeObserver(() => {
      updateGridSize();
    });
    
    if (container) {
      resizeObserver.observe(container);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  });
</script>

<div 
  class="card flip-dot-display" 
  bind:this={container}
  style="grid-template-columns: repeat({cols}, 16px); grid-template-rows: repeat({rows}, 16px);"
>
  {#each dots as flipped, i}
    <div class="slot dot-slot" class:flipped>
      <div class="dot"></div>
    </div>
  {/each}
</div>

<style lang="scss">
  .flip-dot-display {
    display: grid;
    gap: 2px;
    padding: 0.5rem;
    background: var(--color-background);
    justify-content: center;
    align-content: center;
    height: 100%;
    width: 100%;
    border-radius: calc(var(--ui-radius) - 2px);
    box-sizing: border-box;
  }

  .dot-slot {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    background: var(--color-background);
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--color-primary);
    transition: background-color 0.3s ease;
    box-shadow: 0 0 4px rgba(14, 16, 34, 0.5);
  }

  .dot-slot.flipped .dot {
    background: var(--color-background)
  }
</style>
