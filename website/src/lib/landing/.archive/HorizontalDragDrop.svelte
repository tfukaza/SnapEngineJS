<script lang="ts">
  import { Engine } from "@snap-engine/base-svelte";
  import { Item, ItemContainer as Container } from "@snap-engine/drop-and-snap-svelte";
  import { debugState } from "$lib/landing/debugState.svelte";

  const items = [
    "Item A",
    "Item B",
    "Item C",
    "Item D",
    "Item E",
    "Item F",
    "Item G",
    "Item H"
  ];

  const shuffleArray = <T,>(values: T[]): T[] => {
    const copy = [...values];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
  };

  const secondaryColors = [
    "var(--color-secondary-1)",
    "var(--color-secondary-2)",
    "var(--color-secondary-3)",
    "var(--color-secondary-4)",
    "var(--color-secondary-5)",
    "var(--color-secondary-6)",
    "var(--color-secondary-7)"
  ];

  type Segment = {
    start: number;
    end: number;
    pivotRatio: number;
  };

  type LineDefinition = {
    color: string;
    segments: Segment[];
  };

  const itemCount = items.length;

  const lineColors = secondaryColors.slice(0, 3);
  const pivotRatios = [0.3, 0.5, 0.7];

  const randomBetween = () => Math.random();

  const buildLineDefinitions = (): LineDefinition[] => {
    if (itemCount === 0) {
      return [];
    }

    return lineColors.map((color, colorIndex) => {
      const pivotRatio = pivotRatios[colorIndex % pivotRatios.length] ?? 0.5;
      const randomHeights =
        itemCount > 1
          ? Array.from({ length: itemCount - 1 }, () => randomBetween())
          : [];

  const segments = items.map((_, index) => {
        const start = index === 0 ? 0.5 : randomHeights[index - 1] ?? 0.5;
        const end =
          index < randomHeights.length
            ? randomHeights[index]
            : randomHeights[randomHeights.length - 1] ?? 0.5;

        return {
          start,
          end,
          pivotRatio
        };
      });

      return { color, segments };
    });
  };

  const linesByColor = buildLineDefinitions();

  const decoratedItems = items.map((label, index) => ({
    label,
    segments: linesByColor.map(({ color, segments }) => ({
      color,
      ...segments[index]
    }))
  }));

  const scrambledDecoratedItems = shuffleArray(decoratedItems);

  const buildSegmentPath = ({ start, end, pivotRatio }: Segment) => {
    const viewHeight = 100;
    const startY = start * viewHeight;
    const endY = end * viewHeight;
    const entryX = 0;
    const pivotX = Math.max(0, Math.min(1, pivotRatio ?? 0.5)) * 100;
    const exitX = 100;

    if (Math.abs(endY - startY) < 0.5) {
      return `M${entryX} ${startY} H${exitX}`;
    }

    return `M${entryX} ${startY} H${pivotX} V${endY} H${exitX}`;
  };

  const brailleChar = "⠿";

  let canvasComponent: Engine | null = null;

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }
</script>

<Engine id="horizontal-drag-drop-canvas" bind:this={canvasComponent} debug={debugState.enabled}>
  <div class="horizontal-drag-drop">
    <Container config={{ direction: "row", groupID: "horizontal-landing" }}>
  {#each scrambledDecoratedItems as item (item.label)}
        <Item className="card">
          <div class="drag-item-content">
            <div class="line-cluster" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none">
                {#each item.segments as segment (segment.color)}
                  <path d={buildSegmentPath(segment)} style={`stroke: ${segment.color}`}></path>
                {/each}
              </svg>
            </div>
            <span class="drag-dots" aria-hidden="true">{brailleChar}</span>
          </div>
        </Item>
      {/each}
    </Container>
  </div>
</Engine>

<style lang="scss">

  @import "../landing.scss";

  .horizontal-drag-drop {
    height: 100%;
  }

  :global(.horizontal-drag-drop .container) {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  :global(.horizontal-drag-drop .item-wrapper) {
    height: 100%;
    width: 12.5%;
    box-shadow: none;
    --ui-radius: 6px;
    padding: 0;
  }

  :global(.horizontal-drag-drop .item) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 0;
    padding-top: 5px;
  }

  .drag-item-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    gap: 0.4rem;
    height: 100%;
  }

  .line-cluster {
    width: 100%;
    height: 70px;
  }

  .line-cluster svg {
    width: 100%;
    // height: 100%;
  }

  .line-cluster path {
    fill: none;
    stroke-width: 7;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.85;
  }

  .drag-dots {
    font-family: "Menlo", "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 0.75rem;
    color: #9a9796;
    letter-spacing: 0.1em;
  }
</style>
