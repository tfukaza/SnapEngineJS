<script lang="ts">
  import type { Engine } from "@snap-engine/core";
  import { ElementObject } from "@snap-engine/core";
  import { AnimationObject } from "@snap-engine/core/animation";
  import { getContext, onDestroy } from "svelte";

  class TimedAnimation {
    #animation: AnimationObject;
    #onSample: (duration: number) => void;

    constructor(animation: AnimationObject, onSample: (duration: number) => void) {
      this.#animation = animation;
      this.#onSample = onSample;
    }

    play() {
      this.#animation.play();
    }

    pause() {
      this.#animation.pause();
    }

    cancel() {
      this.#animation.cancel();
    }

    reverse() {
      this.#animation.reverse();
    }

    calculateFrame(currentTime: number): boolean {
      const start = performance.now();
      const result = this.#animation.calculateFrame(currentTime);
      this.#onSample(performance.now() - start);
      return result;
    }

    get currentTime(): number {
      return this.#animation.currentTime;
    }

    set currentTime(time: number) {
      this.#animation.currentTime = time;
    }

    get progress(): number {
      return this.#animation.progress;
    }

    set progress(progress: number) {
      this.#animation.progress = progress;
    }

    get requestDelete(): boolean {
      return this.#animation.requestDelete;
    }
  }

  const engine: Engine = getContext("engine");
  const object = new ElementObject(engine, null);
  const countPresets = [1000, 10000, 100000, 1000000];

  let variableCount = $state(1000);
  let duration = $state(60000);
  let busy = $state(false);
  let running = $state(false);
  let status = $state("Idle");
  let setupMs = $state(0);
  let frameCount = $state(0);
  let latestMs = $state(0);
  let averageMs = $state(0);
  let p95Ms = $state(0);
  let maxMs = $state(0);
  let fps = $state(0);
  let checksumDisplay = $state(0);

  let animation: TimedAnimation | null = $state(null);
  let sampleCount = 0;
  let sampleTotal = 0;
  let sampleMax = 0;
  let recentSamples: number[] = [];
  let startedAt = 0;
  let lastStatsUpdate = 0;
  let checksum = 0;

  function createKeyframes(count: number): Record<string, number[]> {
    const keyframes: Record<string, number[]> = {};
    for (let i = 0; i < count; i++) {
      const end = (i % 997) + 1;
      keyframes[`$v${i}`] = [0, end, -end, 0];
    }
    return keyframes;
  }

  function percentile(values: number[], ratio: number): number {
    if (values.length === 0) {
      return 0;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.floor((sorted.length - 1) * ratio),
    );
    return sorted[index];
  }

  function resetStats() {
    setupMs = 0;
    frameCount = 0;
    latestMs = 0;
    averageMs = 0;
    p95Ms = 0;
    maxMs = 0;
    fps = 0;
    checksumDisplay = 0;
    sampleCount = 0;
    sampleTotal = 0;
    sampleMax = 0;
    recentSamples = [];
    startedAt = performance.now();
    lastStatsUpdate = startedAt;
    checksum = 0;
  }

  function recordSample(durationMs: number) {
    sampleCount++;
    sampleTotal += durationMs;
    sampleMax = Math.max(sampleMax, durationMs);
    recentSamples.push(durationMs);

    if (recentSamples.length > 240) {
      recentSamples.shift();
    }

    const now = performance.now();
    if (now - lastStatsUpdate < 250) {
      return;
    }

    frameCount = sampleCount;
    latestMs = durationMs;
    averageMs = sampleTotal / sampleCount;
    p95Ms = percentile(recentSamples, 0.95);
    maxMs = sampleMax;
    fps = sampleCount / Math.max((now - startedAt) / 1000, 0.001);
    checksumDisplay = checksum;
    lastStatsUpdate = now;
  }

  function disposeAnimation() {
    animation?.cancel();
    animation = null;
  }

  function waitForFrame(): Promise<void> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }

  async function startBench() {
    disposeAnimation();
    resetStats();
    busy = true;
    running = false;
    status = `Building ${variableCount.toLocaleString()} variables`;
    await waitForFrame();

    try {
      const setupStart = performance.now();
      const keyframes = createKeyframes(variableCount);
      const lastKey = `$v${Math.max(0, variableCount - 1)}`;
      const rawAnimation = new AnimationObject(null, keyframes, {
        duration,
        easing: ["linear", "ease-in-out", "linear"],
        offset: [0, 0.33, 0.67, 1],
        persist: true,
        tick: (values) => {
          checksum = (values.$v0 ?? 0) + (values[lastKey] ?? 0);
        },
      }, engine);
      animation = new TimedAnimation(rawAnimation, recordSample);
      object.addAnimation(animation as any);
      setupMs = performance.now() - setupStart;
      animation.play();
      running = true;
      status = "Running";
    } catch (error) {
      disposeAnimation();
      running = false;
      status =
        error instanceof Error
          ? `Failed: ${error.message}`
          : "Failed to start benchmark";
    } finally {
      busy = false;
    }
  }

  function pauseBench() {
    animation?.pause();
    running = false;
    status = animation ? "Paused" : "Idle";
  }

  function resumeBench() {
    animation?.play();
    running = animation != null;
    status = animation ? "Running" : "Idle";
  }

  function stopBench() {
    disposeAnimation();
    running = false;
    status = "Stopped";
  }

  onDestroy(() => {
    disposeAnimation();
    object.destroy();
  });
</script>

<div class="bench">
  <section class="controls">
    <div class="field">
      <label for="variable-count">Variables</label>
      <input
        id="variable-count"
        type="number"
        min="1"
        max="1000000"
        step="1000"
        bind:value={variableCount}
        disabled={busy || running}
      />
    </div>

    <div class="presets">
      {#each countPresets as count}
        <button
          class:active={variableCount === count}
          disabled={busy || running}
          onclick={() => (variableCount = count)}
        >
          {count.toLocaleString()}
        </button>
      {/each}
    </div>

    <div class="field">
      <label for="duration">Duration ms</label>
      <input
        id="duration"
        type="number"
        min="1000"
        step="1000"
        bind:value={duration}
        disabled={busy || running}
      />
    </div>

    <div class="actions">
      <button onclick={() => void startBench()} disabled={busy || running}>
        Run
      </button>
      <button onclick={pauseBench} disabled={busy || !running}>Pause</button>
      <button onclick={resumeBench} disabled={busy || running || animation == null}>
        Resume
      </button>
      <button onclick={stopBench} disabled={busy || animation == null}>Stop</button>
    </div>
  </section>

  <section class="stats">
    <div>
      <span>Status</span>
      <strong>{status}</strong>
    </div>
    <div>
      <span>Setup</span>
      <strong>{setupMs.toFixed(2)} ms</strong>
    </div>
    <div>
      <span>Frames</span>
      <strong>{frameCount.toLocaleString()}</strong>
    </div>
    <div>
      <span>Latest</span>
      <strong>{latestMs.toFixed(4)} ms</strong>
    </div>
    <div>
      <span>Average</span>
      <strong>{averageMs.toFixed(4)} ms</strong>
    </div>
    <div>
      <span>P95 recent</span>
      <strong>{p95Ms.toFixed(4)} ms</strong>
    </div>
    <div>
      <span>Max</span>
      <strong>{maxMs.toFixed(4)} ms</strong>
    </div>
    <div>
      <span>FPS</span>
      <strong>{fps.toFixed(1)}</strong>
    </div>
    <div>
      <span>Checksum</span>
      <strong>{checksumDisplay.toFixed(2)}</strong>
    </div>
  </section>
</div>

<style lang="scss">
  .bench {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 24px;
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 20px;
    color: #000;
    background: #fff;
    font-family: "Geist", sans-serif;
  }

  .controls {
    display: flex;
    align-items: end;
    flex-wrap: wrap;
    gap: 12px;
    padding-bottom: 16px;
    border-bottom: 1px solid #000;
  }

  .field {
    display: grid;
    gap: 6px;
  }

  label,
  span {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0;
  }

  input,
  button {
    height: 36px;
    box-sizing: border-box;
    border: 1px solid #000;
    border-radius: 0;
    background: #fff;
    color: #000;
    font: inherit;
  }

  input {
    width: 160px;
    padding: 0 10px;
  }

  button {
    padding: 0 12px;
    cursor: pointer;
  }

  button:hover:not(:disabled),
  button.active {
    background: #000;
    color: #fff;
  }

  button:disabled,
  input:disabled {
    opacity: 0.45;
    cursor: default;
  }

  .presets,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    align-content: start;
    gap: 0;
    background: #fff;
    border: 1px solid #000;
  }

  .stats div {
    min-height: 104px;
    box-sizing: border-box;
    padding: 14px;
    display: grid;
    align-content: space-between;
    background: #fff;
    border-right: 1px solid #000;
    border-bottom: 1px solid #000;
  }

  strong {
    font-size: 26px;
    line-height: 1.1;
    font-weight: 400;
    overflow-wrap: anywhere;
  }
</style>
