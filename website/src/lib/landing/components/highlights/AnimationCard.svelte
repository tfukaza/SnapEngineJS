<script lang="ts">
  import { onDestroy } from "svelte";
  import ClientDemoFrame from "$lib/components/ClientDemoFrame.svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { ElementObject } from "@snapline/object";
  import { AnimationObject } from "@snapline/animation";
  import type { Engine as EngineType } from "@snapline/index";
  import { debugState } from "$lib/landing/debugState.svelte";

  type Keyframe = {
    time: number;
    label?: string;
  };

  type TrackId = "rotate" | "scale" | "variable";

  type Track = {
    id: TrackId;
    label: string;
    subtitle: string;
    type: "css" | "variable" | "sequence";
    keyframes: Keyframe[];
    range: {
      start: number;
      end: number;
    };
  };

  const TOTAL_DURATION = 4; // seconds
  const TOTAL_DURATION_MS = TOTAL_DURATION * 1000;
  const plusCells = Array.from({ length: 120 }, (_, index) => index);

  const INITIAL_TIME = 0;
  const timelineMarkers = [0, 1, 2, 3, 4];
  let currentTime = $state(INITIAL_TIME);
  const TRACK_IDS: TrackId[] = ["rotate", "scale", "variable"];
  const KEYFRAME_TIMES = [0, 1.5, 3, TOTAL_DURATION];
  const ROTATION_KEYFRAMES = [0, 135, 270, 360];
  const SCALE_KEYFRAMES = [1, 1.5, 0.5, 1];
  const VARIABLE_KEYFRAMES = [1, 100];

  let counterValue = $state(VARIABLE_KEYFRAMES[0]);
  let engine: EngineType | null = $state(null);
  let canvasComponent: Engine | null = null;
  let animatedValueRef: HTMLSpanElement | null = $state(null);
  let valueObject: ElementObject | null = null;
  let isPlaying = $state(true);
  let trackControllers: Record<TrackId, AnimationObject | null> = {
    rotate: null,
    scale: null,
    variable: null,
  };
  let currentRotation = $state(0);
  let currentScale = $state(1);
  let valueTransform = $state(`rotate(0deg) scale(1)`);
  // Hidden linear time track state
  let playbackRaf: number | null = null;
  let playbackStartMs = 0;
  let playbackOffsetTime = INITIAL_TIME;
  let isScrubbingTimeline = false;
  let resumeAfterScrub = false;

  const TRACK_COLORS: Record<Track["type"], string> = {
    css: "#d8dde0",
    variable: "#d8dde0",
    sequence: "#d8dde0",
  };

  const tracks: Track[] = [
    {
      id: "rotate",
      label: "rotate",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "0°" },
        { time: 4, label: "360°" },
      ],
      range: { start: 0, end: 4 },
    },
    {
      id: "scale",
      label: "scale",
      subtitle: "",
      type: "css",
      keyframes: [
        { time: 0, label: "1×" },
        { time: 1.5, label: "1.5×" },
        { time: 3, label: "0.5×" },
        { time: 4, label: "1×" },
      ],
      range: { start: 0, end: 4 },
    },
    {
      id: "variable",
      label: "variable",
      subtitle: "",
      type: "variable",
      keyframes: [
        { time: 0, label: "1" },
        { time: 4, label: "100" },
      ],
      range: { start: 0, end: 4 },
    },
  ];

  function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  function toPercent(time: number) {
    return `${(time / TOTAL_DURATION) * 100}%`;
  }

  function updateRotationState(rotation: number) {
    const clampedRotation = clamp(rotation, 0, 360);
    currentRotation = clampedRotation;
    valueTransform = `rotate(${currentRotation}deg) scale(${currentScale})`;
  }

  function updateScaleState(scale: number) {
    currentScale = clamp(scale, 0.25, 2);
    valueTransform = `rotate(${currentRotation}deg) scale(${currentScale})`;
  }

  $effect(() => {
    if (!engine || !animatedValueRef) {
      return;
    }

    if (!valueObject) {
      valueObject = new ElementObject(engine, null);
      valueObject.element = animatedValueRef;
    }

    ensureTrackAnimations();
  });

  onDestroy(() => {
    stopPlaybackLoop();
    cancelTrackAnimations();
    valueObject?.destroy();
    valueObject = null;
  });

  function startPlaybackLoop() {
    if (typeof window === "undefined") {
      return;
    }

    if (playbackRaf !== null) {
      return;
    }

    playbackOffsetTime = currentTime;
    playbackStartMs = performance.now();

    const step = (now: number) => {
      playbackRaf = null;
      const elapsedSeconds = (now - playbackStartMs) / 1000;
      const nextTime = playbackOffsetTime + elapsedSeconds;
      currentTime = Math.min(nextTime, TOTAL_DURATION);

      if (currentTime >= TOTAL_DURATION) {
        stopPlaybackLoop();
        return;
      }

      playbackRaf = requestAnimationFrame(step);
    };

    playbackRaf = requestAnimationFrame(step);
  }

  function stopPlaybackLoop() {
    if (typeof window === "undefined") {
      playbackOffsetTime = currentTime;
      return;
    }

    if (playbackRaf !== null) {
      cancelAnimationFrame(playbackRaf);
      playbackRaf = null;
    }
    playbackOffsetTime = currentTime;
  }

  function handleTimelineInput(
    event: Event & { currentTarget: HTMLInputElement },
  ) {
    const nextTime = Number(event.currentTarget?.value ?? currentTime);
    if (Number.isNaN(nextTime)) {
      return;
    }
    const progress = clamp(nextTime / TOTAL_DURATION, 0, 1);
    const triggeredScrubSession = !isScrubbingTimeline;
    if (triggeredScrubSession) {
      beginTimelineScrub();
    }
    setTrackProgress(progress);
    if (triggeredScrubSession) {
      endTimelineScrub();
    }
  }

  function beginTimelineScrub() {
    if (isScrubbingTimeline) {
      return;
    }
    isScrubbingTimeline = true;
    resumeAfterScrub = isPlaying;
    if (isPlaying) {
      isPlaying = false;
      stopPlaybackLoop();
      syncPlaybackState();
      return;
    }
    stopPlaybackLoop();
  }

  function endTimelineScrub() {
    if (!isScrubbingTimeline) {
      return;
    }
    isScrubbingTimeline = false;
    if (resumeAfterScrub) {
      isPlaying = true;
      startPlaybackLoop();
      syncPlaybackState();
    }
    resumeAfterScrub = false;
  }

  function ensureTrackAnimations() {
    if (!valueObject || !animatedValueRef) {
      return;
    }

    const builders: Record<TrackId, () => AnimationObject> = {
      rotate: createRotationAnimation,
      scale: createScaleAnimation,
      variable: createVariableAnimation,
    };

    for (const id of TRACK_IDS) {
      if (trackControllers[id]) {
        continue;
      }

      const animation = builders[id]();
      animation.pause();
      valueObject.addAnimation(animation, { replaceExisting: false });
      animation.progress = currentTime / TOTAL_DURATION;
      trackControllers = { ...trackControllers, [id]: animation };
    }

    syncPlaybackState();

    if (isPlaying) {
      startPlaybackLoop();
    }
  }

  function createRotationAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedValueRef,
      {
        $rotation: ROTATION_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: "linear",
        tick: (values: Record<string, number>) => {
          if (typeof values.$rotation === "number") {
            updateRotationState(values.$rotation);
          }
        },
        finish: () => handleTrackFinish("rotate", controller),
      },
    );
    return controller;
  }

  function createScaleAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedValueRef,
      {
        $scale: SCALE_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: ["cubic-bezier(0.65, 0, 0.35, 1)", "linear", "steps(5, end)"],
        tick: (values: Record<string, number>) => {
          if (typeof values.$scale === "number") {
            updateScaleState(values.$scale);
          }
        },
        finish: () => handleTrackFinish("scale", controller),
      },
    );
    return controller;
  }

  function createVariableAnimation() {
    let controller: AnimationObject;
    controller = new AnimationObject(
      animatedValueRef,
      {
        $variable: VARIABLE_KEYFRAMES,
      },
      {
        duration: TOTAL_DURATION_MS,
        easing: "ease-in-out",
        tick: (values: Record<string, number>) => {
          if (typeof values.$variable === "number") {
            counterValue = Math.round(values.$variable);
          }
        },
        finish: () => handleTrackFinish("variable", controller),
      },
    );
    return controller;
  }

  function handleTrackFinish(trackId: TrackId, controller: AnimationObject) {
    if (trackControllers[trackId] !== controller) {
      return;
    }
    trackControllers = { ...trackControllers, [trackId]: null };
    if (TRACK_IDS.every((id) => trackControllers[id] === null)) {
      onAllTracksFinished();
    }
  }

  function onAllTracksFinished() {
    updateScaleState(SCALE_KEYFRAMES[SCALE_KEYFRAMES.length - 1]);
    updateRotationState(ROTATION_KEYFRAMES[ROTATION_KEYFRAMES.length - 1]);
    counterValue = VARIABLE_KEYFRAMES[VARIABLE_KEYFRAMES.length - 1];
    currentTime = TOTAL_DURATION;
    stopPlaybackLoop();

    if (isPlaying) {
      resetAnimationCycle();
    }
  }

  function resetAnimationCycle() {
    stopPlaybackLoop();
    cancelTrackAnimations();
    updateScaleState(SCALE_KEYFRAMES[0]);
    updateRotationState(ROTATION_KEYFRAMES[0]);
    counterValue = VARIABLE_KEYFRAMES[0];
    currentTime = 0;
    playbackOffsetTime = 0;
    ensureTrackAnimations();
    setTrackProgress(0);

    if (isPlaying) {
      startPlaybackLoop();
      syncPlaybackState();
    }
  }

  function cancelTrackAnimations() {
    valueObject?.cancelAnimations();
    trackControllers = {
      rotate: null,
      scale: null,
      variable: null,
    };
  }

  function syncPlaybackState() {
    for (const id of TRACK_IDS) {
      const animation = trackControllers[id];
      if (!animation) {
        continue;
      }
      if (isPlaying) {
        animation.play();
      } else {
        animation.pause();
      }
    }
  }

  function setTrackProgress(progress: number) {
    for (const id of TRACK_IDS) {
      const animation = trackControllers[id];
      if (!animation) {
        continue;
      }
      animation.pause();
      animation.progress = progress;
    }
    const clampedProgress = clamp(progress, 0, 1);
    currentTime = clampedProgress * TOTAL_DURATION;
    playbackOffsetTime = currentTime;
    syncPlaybackState();
  }

  function togglePlayback() {
    isPlaying = !isPlaying;
    if (isPlaying && currentTime >= TOTAL_DURATION - 0.01) {
      resetAnimationCycle();
      return;
    }

    ensureTrackAnimations();

    if (isPlaying) {
      startPlaybackLoop();
    } else {
      stopPlaybackLoop();
    }

    syncPlaybackState();
  }
</script>

<article class="animation-card theme-secondary-4">
    <div class="animation-card-layout">
    <div class="animation-card-body card">
      <ClientDemoFrame>
        {#snippet fallback()}
          <div class="animation-demo animation-skeleton" aria-hidden="true">
            <div class="timeline grid-layout">
              {#each Array(16) as _, index}
                <span class={index % 4 === 0 ? "animation-skeleton-wide" : ""}></span>
              {/each}
            </div>
          </div>
        {/snippet}
        <Engine id="highlight-animation" bind:engine bind:this={canvasComponent} debug={debugState.enabled}>
        <div class="animation-demo">
          <div class="timeline grid-layout">
            <div class="timeline-content">
              <!-- <label class="timeline-label" for="animation-timeline-range"
                >Time</label
              > -->
              <span></span>
              <div class="timeline-slider">
                <input
                  id="animation-timeline-range"
                  type="range"
                  min="0"
                  max={TOTAL_DURATION}
                  step="0.01"
                  value={currentTime}
                  oninput={handleTimelineInput}
                  onpointerdown={beginTimelineScrub}
                  onpointerup={endTimelineScrub}
                  onpointerleave={endTimelineScrub}
                  onpointercancel={endTimelineScrub}
                  aria-label="Scrub animation time"
                />
                <span class="playhead" style={`left: calc(8px + (100% - 16px) * ${currentTime / TOTAL_DURATION});`}></span>
              </div>

              <span class="timeline-placeholder" aria-hidden="true"></span>
              <div class="timeline-header">
                {#each timelineMarkers as marker}
                  <span>{marker}s</span>
                {/each}
              </div>

              {#each tracks as track}
                <div class="track-meta">
                  <span class="track-label">{track.label}</span>
                </div>
                <div
                  class={`track-lane ${track.type}`}
                  style={`--range-color: ${TRACK_COLORS[track.type]};`}
                  aria-hidden="true"
                >
                  <span
                    class="track-line"
                    style={`left: ${toPercent(track.range.start)}; width: calc(${toPercent(track.range.end)} - ${toPercent(track.range.start)});`}
                  ></span>
                  {#each track.keyframes as keyframe}
                    <span
                      class="keyframe-point"
                      style={`left: ${toPercent(keyframe.time)};`}
                    ></span>
                  {/each}
                </div>
              {/each}
            </div>
          </div>

          <div class="preview-area">
          <div class="preview-plus-grid" aria-hidden="true">
            {#each plusCells as cell (cell)}
              <span>+</span>
            {/each}
          </div>
          <div class="preview-value-container">
            <span
              class="animated-value value-readout"
              bind:this={animatedValueRef}
              style={`transform: ${valueTransform};`}
            >
              {counterValue}
            </span>
          </div>
            <!-- <button class="playback-toggle" type="button" onclick={togglePlayback}>
              {isPlaying ? "Pause" : "Play"}
            </button> -->
          </div>
        </div>
        </Engine>
      </ClientDemoFrame>
    </div>

    <div class="animation-card-heading">
      <h3>Animation Engine</h3>
      <p>WAAPI based animation engine that's lightweight and performant.</p>
    </div>
  </div>
</article>

<style lang="scss">
  .animation-card {
    --card-padding: var(--size-48);
    --card-top-padding: var(--card-padding);
    container-type: inline-size;
    container-name: animation-card;
    height: 100%;
    box-sizing: border-box;
    background: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      --card-top-padding: var(--highlight-card-mobile-top-padding);
      grid-column: span 2;
    }
  }

  .animation-card-layout {
    width: 100%;
    min-height: inherit;
    height: 100%;
    display: grid;
    grid-template-columns: minmax(0, 0.6fr) minmax(0, 0.4fr);
    grid-template-areas: "visual heading";
    align-items: stretch;
    gap: var(--size-48);
    box-sizing: border-box;

    @container animation-card (max-width: 400px) {
      display: flex;
      flex-direction: column;
      gap: var(--size-24);
    }
  }

  .animation-card-heading {
    grid-area: heading;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: var(--size-16);
    min-width: 0;

    h3 {
      width: min(100%, min-content);
      margin-bottom: 0;
      font-family: "Geist Pixel Circle", "Doto", sans-serif;
      font-size: var(--highlight-card-heading-size);
      line-height: 0.88;
    }

    p {
      margin: 0;
      max-width: 18rem;
    }

    @container animation-card (max-width: 400px) {
      justify-content: flex-start;
      gap: var(--size-12);
      padding: 0 var(--card-padding) var(--card-padding) var(--card-padding);
    }
  }

  .animation-card-body {
    grid-area: visual;
    min-width: 0;
    /* min-height: 360px; */
    margin: var(--card-top-padding) 0 var(--card-padding) var(--card-padding) ;

    @container animation-card (max-width: 400px) {
      margin: var(--card-top-padding) var(--card-padding) 0 var(--card-padding);
    }
  }

  .animation-demo {
    display: flex;
    flex-direction: column;
    gap: 0;
    height: 100%;
    width: 100%;
  }


  .preview-area {
    position: relative;
    flex: 1;
    border-radius: 0 0 var(--ui-radius) var(--ui-radius);
    border: 1px solid #d8dde0;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--color-background-tint);
    min-height: 100px;
    isolation: isolate;
  }

  .preview-plus-grid {
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

  .preview-plus-grid span {
    color: inherit;
    margin: 0;
  }

  .preview-value-container {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .animated-value {
    min-width: 2.2ch;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #111111;
    font-family: "Bitcount Grid Single", monospace;
    font-size: 56px;
    font-weight: 300;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: 0;
    transform: rotate(0deg) scale(1);
  }

  // .preview-value-container {
  //   filter: drop-shadow(6px 6px 5px rgba(24, 29, 42, 0.264));
  // }

  .value-readout {
    color: #111111;
  }

  .timeline {
    // border: 1px solid rgba(58, 42, 34, 0.15);
    height: auto;
    box-sizing: border-box;
    // background-color: var(--color-background-tint);
    // border-radius: var(--ui-radius) var(--ui-radius) 0 0;
    padding: 1rem;
  }

  .timeline.grid-layout {
    display: block;
  }

  .animation-skeleton {
    min-height: 24rem;
  }

  .animation-skeleton .timeline {
    display: grid;
    grid-template-columns: 6rem minmax(0, 1fr);
    gap: 0.55rem 0.75rem;
  }

  .animation-skeleton span {
    display: block;
    height: 0.8rem;
    border-radius: 999px;
    background: rgb(31 30 41 / 8%);
  }

  .animation-skeleton-wide {
    height: 1.2rem !important;
  }

  .timeline-content {
    --timeline-label-width: 100px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 0.4rem;
    column-gap: 0.6rem;
    align-items: center;
  }

  .timeline-label {
    font-size: 0.7rem;
    // letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(47, 31, 26, 0.55);
  }

  .timeline-slider {
    position: relative;
    margin: 0 8px;
    box-sizing: border-box;
  }

  .timeline-slider input[type="range"] {
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  .timeline-slider .playhead {
    position: absolute;
    top: 100%;
    width: 2px;
    border-radius: 1px;
    height: 100px;
    background: rgb(255, 96, 43);
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: 4px 4px 4px rgba(28, 38, 44, 0.151);
    z-index: 0;
  }

  .timeline-placeholder {
    height: 1px;
    width: 100%;
  }

  .timeline-header {
    display: flex;
    // grid-template-columns: repeat(5, minmax(0, 1fr));
    // letter-spacing: 0.08em;
    color: rgba(47, 31, 26, 0.55);
    justify-content: space-between;
    margin: 0 8px;
    // align-items: end;

    span {
      font-size: 0.7rem;
    }
  }

  .timeline-header span {
    text-align: right;
  }

  .track-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    color: rgba(47, 31, 26, 0.9);
  }

  .track-label {
    font-family: "Bitcount Grid Single", monospace;
    font-size: 0.8rem;
    font-weight: 300;
    // letter-spacing: 0.05em;
    // text-transform: uppercase;
  }

  .track-lane {
    --keyframe-size: 14px;
    --specular-angle: 130deg;
    --track-line-color: #aeb6ba;
    --keyframe-color: #aeb6ba;
    position: relative;
    z-index: 1;
    height: 20px;
    border: none;
    margin: 0px 8px;
    overflow: visible;
  }

  .track-line {
    position: absolute;
    top: 50%;
    height: 2px;
    border-radius: 999px;
    transform: translateY(-50%);
    background-color: var(--track-line-color);
    box-shadow: none;
    pointer-events: none;
    z-index: 0;
  }

  .keyframe-point {
    position: absolute;
    z-index: 2;
    top: 50%;
    width: var(--keyframe-size);
    height: var(--keyframe-size);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    background:
      radial-gradient(
        hsl(from var(--keyframe-color) h calc(s + 5) calc(l + 15)) 0%,
        hsl(from var(--keyframe-color) h s calc(l + 10)) 50%,
        hsl(from var(--keyframe-color) h s l / 0) 58%,
        hsl(from var(--keyframe-color) h s l / 0) 65%,
        hsl(from var(--keyframe-color) h s calc(l - 5) / 0.4) 72%
      ),
      conic-gradient(
        from var(--specular-angle) at center,
        hsl(from var(--keyframe-color) h calc(s + 20) calc(l + 5) / 0.1) 43%,
        #fff 57%,
        hsl(from var(--keyframe-color) h calc(s + 20) calc(l + 5) / 0.1) 70%
      ),
      conic-gradient(
        from 120deg at center,
        hsl(from var(--keyframe-color) h calc(s - 5) calc(l - 10)) 0%,
        hsl(from var(--keyframe-color) calc(h + 10) calc(s + 10) calc(l + 20)) 50%,
        hsl(from var(--keyframe-color) h calc(s - 5) calc(l - 10)) 100%
      );
    box-shadow:
      2px 2px 2px 0px rgba(4, 14, 48, 0.096),
      4px 4px 4px -3px rgba(7, 20, 53, 0.142),
      6px 6px 6px -4px rgba(6, 21, 40, 0.422);
    pointer-events: none;
  }

  .playback-toggle {
    border: none;
    border-radius: 999px;
    padding: 0.4rem 1.25rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    background: var(--card-accent);
    color: #fffaf6;
    cursor: pointer;
    transition:
      transform 0.15s ease,
      box-shadow 0.15s ease;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 18px
        color-mix(in srgb, var(--card-accent) 35%, rgba(0, 0, 0, 0.22));
    }

    &:active {
      transform: translateY(0);
      box-shadow: none;
    }
  }

  @media (max-width: 720px) {
    // .track {
    //   grid-template-columns: 1fr;
    // }

    // .timeline-slider {
    //   grid-template-columns: 1fr;
    // }

    // .track-lane {
    //   height: 30px;
    // }
  }
</style>
