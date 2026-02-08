<script lang="ts">
  import { onDestroy } from "svelte";
  import { Engine } from "@snapengine-asset-base/svelte";
  import { ElementObject } from "@snapline/object";
  import { AnimationObject } from "@snapline/animation";
  import type { Engine as EngineType } from "@snapline/index";
  import { debugState } from "$lib/landing/debugState.svelte";

  interface SliderPreset {
    id: string;
    phase: number;
  }

  const WAVE_DURATION = 6000;
  const MIN_SLIDER_COUNT = 8;
  const MAX_SLIDER_COUNT = 64;
  const SLIDER_SLOT_WIDTH = 24;

  let sliderCount = $state(16);
  const sliderPresets = $derived.by((): SliderPreset[] => {
    if (sliderCount <= 0) return [];
    return Array.from({ length: sliderCount }, (_, index) => ({
      id: `slider-${index}`,
      phase: sliderCount > 0 ? index / sliderCount : 0,
    }));
  });

  let engine: EngineType | null = $state(null);
  let canvasComponent: Engine | null = null;
  let isPlaying = $state(true);
  let progress = $state(0);
  const sliderValues = $derived.by(() => {
    const normalized = normalizeProgress(progress);
    return sliderPresets.map((slider) => {
      const offset = normalizeProgress(normalized + slider.phase);
      return 0.5 + 0.5 * Math.sin(2 * Math.PI * offset);
    });
  });
  let sliderClusterRef: HTMLDivElement | null = $state(null);
  let sliderClusterWidth = $state(0);

  let controllerObject: ElementObject | null = null;
  let controllerAnimation: AnimationObject | null = null;

  $effect(() => {
    if (typeof window === "undefined") return;
    if (!sliderClusterRef) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        sliderClusterWidth = entry.contentRect.width;
      }
    });

    observer.observe(sliderClusterRef);

    return () => observer.disconnect();
  });

  $effect(() => {
    if (sliderClusterWidth <= 0) return;
    const available = Math.floor(sliderClusterWidth / SLIDER_SLOT_WIDTH);
    const nextCount = clamp(available, MIN_SLIDER_COUNT, MAX_SLIDER_COUNT);
    if (nextCount !== sliderCount) {
      sliderCount = nextCount;
    }
  });

  $effect(() => {
    if (!engine || sliderPresets.length === 0) return;
    if (!controllerObject) {
      controllerObject = new ElementObject(engine, null);
    }
    if (!controllerAnimation) {
      startAnimation(progress);
    }
  });

  onDestroy(() => {
    controllerAnimation?.cancel();
    controllerAnimation = null;
    controllerObject?.destroy();
    controllerObject = null;
  });

  export function enableDebug() {
    canvasComponent?.enableDebug();
  }

  export function disableDebug() {
    canvasComponent?.disableDebug();
  }

  function startAnimation(fromProgress = 0) {
    if (!engine || !controllerObject || sliderPresets.length === 0) return;
    const normalized = normalizeProgress(fromProgress);
    updateSliderValues(normalized);
    const remaining = Math.max(1 - normalized, 0);
    const duration = Math.max(remaining * WAVE_DURATION, 1);

    const animation = new AnimationObject(
      null,
      { $time: [normalized, 1] },
      {
        duration,
        easing: "linear",
        tick: (values: Record<string, number>) => {
          const current = typeof values.$time === "number" ? values.$time : 0;
          updateSliderValues(current);
        },
        finish: () => {
          controllerAnimation = null;
          if (isPlaying) {
            startAnimation(0);
          }
        },
      },
    );

    controllerObject.addAnimation(animation);
    controllerAnimation = animation;

    if (isPlaying) {
      animation.play();
    } else {
      animation.pause();
    }
  }

  function updateSliderValues(baseProgress: number) {
    progress = normalizeProgress(baseProgress);
  }

  function togglePlayback() {
    isPlaying = !isPlaying;
    if (!controllerAnimation) {
      startAnimation(progress);
      return;
    }
    if (isPlaying) {
      controllerAnimation.play();
    } else {
      controllerAnimation.pause();
    }
  }

  function handleTimelineInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const nextProgress = parseFloat(input.value);
    if (Number.isNaN(nextProgress)) return;

    updateSliderValues(nextProgress);
    if (!engine || sliderPresets.length === 0) return;

    startAnimation(nextProgress);
    if (!isPlaying) {
      controllerAnimation?.pause();
    }
  }

  function clamp(value: number, min: number, max: number) {
    if (Number.isNaN(value)) return min;
    return Math.min(Math.max(value, min), max);
  }

  function normalizeProgress(value: number) {
    const result = value % 1;
    return result < 0 ? result + 1 : result;
  }
</script>

<div class="animation-control-wrapper">
  <Engine id="animation-control" bind:engine={engine} bind:this={canvasComponent} debug={debugState.enabled}>
    <div class="animation-control card">


      <div class="slider-cluster" bind:this={sliderClusterRef}>
        {#each sliderPresets as slider, index (slider.id)}
          <!-- <div class="slider-column"> -->
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={sliderValues[index]}
              aria-label={`Slider ${index + 1}`}
            />
          <!-- </div> -->
        {/each}
      </div>
    </div>
  </Engine>
  <div class="card timeline">
    <input
      id="wave-timeline"
      type="range"
      min="0"
      max="1"
      step="0.001"
      value={progress}
      oninput={handleTimelineInput}
    />
    <button type="button" class="playback-toggle small" onclick={togglePlayback}>
      {isPlaying ? "Pause" : "Play"}
    </button>
  </div>
</div>

<style lang="scss">

  .card {
    padding: 4px;
  }

  .animation-control-wrapper {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-rows: 1fr auto;
    row-gap: 0;
  }

  .animation-control-wrapper :global(#snap-canvas) {
    width: 100%;
    height: 100%;
  }

  .animation-control {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    // padding: 1rem;
  
  }

  .playback-toggle {
    // border: none;
    // border-radius: var(--ui-radius);
    // padding: 0.4rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    width: 80px;
    // background: var(--color-surface-accent, #111827);
    // color: var(--color-text-on-accent, #fff);
  }

  .slider-cluster {
    display: flex;
    gap: 4px;
    align-items: center;
    justify-content: center;
    height: 100%;
    // width: 100%;
    overflow-x: auto;
    padding: 0 0.5rem;
  }

  .slider-cluster input[type="range"] {
    writing-mode: vertical-lr;
    // width: 48px;
    min-width: 12px;
    height:40px;
    // max-width: 48px;
    // flex: 0 0 48px;
    // flex-shrink: 0;
    // height: 100%;
    border: 0px solid rgba(255, 255, 255, 0.033);
    box-shadow: none;
    background: var(--color-surface, #ebeae9);
  }

  .timeline {
    // margin-top: 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .timeline input[type="range"] {
    width: 100%;
  }
</style>
