<script lang="ts">
  import { onDestroy } from "svelte";
  import Canvas from "../../../../../svelte/src/lib/Canvas.svelte";
  import { ElementObject } from "../../../../../../src/object";
  import { AnimationObject } from "../../../../../../src/animation";
  import type { Engine } from "../../../../../../src/index";

  interface SliderPreset {
    id: string;
    label: string;
    color: string;
    phase: number;
  }

  const SLIDERS: SliderPreset[] = [
    { id: "alpha", label: "Alpha", color: "#f472b6", phase: 0 },
    { id: "beta", label: "Beta", color: "#c084fc", phase: 0.12 },
    { id: "gamma", label: "Gamma", color: "#60a5fa", phase: 0.24 },
    { id: "delta", label: "Delta", color: "#34d399", phase: 0.36 },
    { id: "epsilon", label: "Epsilon", color: "#facc15", phase: 0.48 }
  ];

  const WAVE_DURATION = 6000;

  let engine: Engine | null = $state(null);
  let sliderRefs: (HTMLInputElement | null)[] = $state(
    Array(SLIDERS.length).fill(null)
  );
  let sliderValues: number[] = $state(Array(SLIDERS.length).fill(0.5));
  let isPlaying = $state(true);
  let progress = $state(0);

  let controllerObject: ElementObject | null = null;
  let controllerAnimation: AnimationObject | null = null;

  function slidersReady() {
    return sliderRefs.every((slider) => slider);
  }

  $effect(() => {
    if (!engine || !slidersReady()) return;
    if (!controllerObject) {
      controllerObject = new ElementObject(engine, null);
    }
    if (!controllerAnimation) {
      updateSliderValues(progress);
      startAnimation(progress);
    }
  });

  onDestroy(() => {
    controllerAnimation?.cancel();
    controllerAnimation = null;
    controllerObject?.destroy();
    controllerObject = null;
  });

  function startAnimation(fromProgress = 0) {
    if (!engine || !controllerObject || !slidersReady()) return;
    const normalized = normalizeProgress(fromProgress);
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
    const normalized = normalizeProgress(baseProgress);
    const nextValues = SLIDERS.map((slider, index) => {
      const offset = normalizeProgress(normalized + slider.phase);
      const wave = 0.5 + 0.5 * Math.sin(2 * Math.PI * offset);
      if (sliderRefs[index]) {
        sliderRefs[index]!.value = wave.toString();
      }
      return wave;
    });
    sliderValues = nextValues;
    progress = normalized;
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
    if (!engine || !slidersReady()) return;

    startAnimation(nextProgress);
    if (!isPlaying) {
      controllerAnimation?.pause();
    }
  }

  function normalizeProgress(value: number) {
    const result = value % 1;
    return result < 0 ? result + 1 : result;
  }
</script>

<div class="animation-control-wrapper">
  <Canvas id="animation-control" bind:engine={engine}>
    <div class="animation-control card">
      <div class="control-header">
      <div class="control-text">
        <p class="eyebrow">Wave controls</p>
        <p class="status">{isPlaying ? "Playing" : "Paused"}</p>
      </div>
      <button type="button" class="playback-toggle" onclick={togglePlayback}>
        {isPlaying ? "Pause" : "Play"}
      </button>
      </div>

      <div class="slider-cluster">
        {#each SLIDERS as slider, index (slider.id)}
          <div class="slider-column">
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={sliderValues[index]}
              bind:this={sliderRefs[index]}
              aria-label={`${slider.label} slider`}
            />
          </div>
        {/each}
      </div>

      <div class="timeline">
        <label for="wave-timeline">Timeline</label>
        <input
          id="wave-timeline"
          type="range"
          min="0"
          max="1"
          step="0.001"
          value={progress}
          oninput={handleTimelineInput}
        />
      </div>
    </div>
  </Canvas>
</div>

<style lang="scss">
  .animation-control-wrapper {
    width: 100%;
    height: 100%;
  }

  .animation-control-wrapper :global(#snap-canvas) {
    width: 100%;
    height: 100%;
  }

  .animation-control {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .control-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .control-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .control-text .eyebrow {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .control-text .status {
    margin: 0;
    font-weight: 600;
  }

  .playback-toggle {
    border: none;
    border-radius: var(--ui-radius);
    padding: 0.4rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--color-surface-accent, #111827);
    color: var(--color-text-on-accent, #fff);
  }

  .slider-cluster {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(56px, 1fr));
    gap: 0.75rem;
    align-items: stretch;
  }

  .slider-column {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }

  .slider-column input[type="range"] {
    // writing-mode: bt-lr;
    // appearance: slider-vertical;
    // -webkit-appearance: slider-vertical;
    // height: 100%;
    // min-height: 140px;
    // width: 100%;
  }

  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .timeline label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  .timeline input[type="range"] {
    width: 100%;
  }
</style>
