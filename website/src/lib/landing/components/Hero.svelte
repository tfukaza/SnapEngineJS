<script lang="ts">
  import { onMount } from "svelte";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { Item, ItemContainer as Container } from "@snap-engine/snapsort-svelte";
  import * as Tone from "tone";
  import HeroToneJoystick from "./hero/HeroToneJoystick.svelte";

  const recessedPadIndices = new Set([5, 6, 9, 10]);
  const waveShapes = ["sine", "triangle8", "square8", "sawtooth8"] as const;
  type WaveShape = (typeof waveShapes)[number];

  const padColorClasses = [
    "",
    "pad-gray",
    "pad-gray",
    "",
    "pad-gray",
    "pad-primary",
    "",
    "pad-gray",
    "pad-gray",
    "",
    "pad-primary",
    "pad-gray",
    "",
    "pad-gray",
    "pad-gray",
    "",
  ];

  const padNotes = [
    "C3",
    "Eb3",
    "F3",
    "G3",
    "Bb3",
    "C4",
    "Eb4",
    "F4",
    "G4",
    "Bb4",
    "C5",
    "Eb5",
    "F5",
    "G5",
    "Bb5",
    "C6",
  ];

  let heroButtonBed: HTMLDivElement | null = null;
  let waveformCanvas: HTMLCanvasElement | null = null;
  let toneInstrument: ReturnType<typeof createToneInstrument> | null = null;
  let sequenceTimer: number | null = null;
  let animationFrame = 0;
  let activePadIndex = $state<number | null>(null);
  let isPlaying = $state(false);
  let currentStep = $state(0);
  let speedMultiplier = $state(1);
  let sequenceDirection = $state<1 | -1>(1);
  let toneX = $state(0.5);
  let toneY = $state(0.5);

  function createToneInstrument() {
    const filter = new Tone.Filter({
      frequency: 1800,
      rolloff: -12,
      type: "lowpass",
    });
    const delay = new Tone.FeedbackDelay({
      delayTime: "16n",
      feedback: 0.18,
      wet: 0.14,
    });
    const reverb = new Tone.Reverb({
      decay: 1.4,
      wet: 0.12,
    });
    const synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: {
        type: "triangle8",
      },
      envelope: {
        attack: 0.006,
        decay: 0.12,
        sustain: 0.08,
        release: 0.28,
      },
      volume: -10,
    });

    synth.chain(filter, delay, reverb, Tone.Destination);
    return { delay, filter, reverb, synth, waveShape: "triangle8" as WaveShape };
  }

  function applyToneControls(instrument = toneInstrument) {
    if (!instrument) return;

    const now = Tone.now();
    const filterFrequency = 500 + toneX * 4200;
    const delayWet = 0.04 + toneY * 0.22;
    const delayFeedback = 0.08 + toneY * 0.26;
    const reverbWet = 0.04 + (1 - toneY) * 0.18;
    const nextWaveShape = waveShapes[Math.min(waveShapes.length - 1, Math.floor(toneX * waveShapes.length))];

    if (instrument.waveShape !== nextWaveShape) {
      instrument.synth.set({ oscillator: { type: nextWaveShape } });
      instrument.waveShape = nextWaveShape;
    }

    instrument.filter.frequency.cancelScheduledValues(now);
    instrument.filter.frequency.rampTo(filterFrequency, 0.08);
    instrument.delay.wet.rampTo(delayWet, 0.08);
    instrument.delay.feedback.rampTo(delayFeedback, 0.08);
    instrument.reverb.wet.rampTo(reverbWet, 0.08);
  }

  async function getToneInstrument() {
    if (typeof window === "undefined") return;

    await Tone.start();
    toneInstrument ??= createToneInstrument();
    applyToneControls(toneInstrument);
    return toneInstrument;
  }

  function updateToneControls(value: { x: number; y: number }) {
    toneX = value.x;
    toneY = value.y;
    applyToneControls();
  }

  async function playPad(index: number) {
    const instrument = await getToneInstrument();
    if (!instrument) return;

    const note = padNotes[index] ?? "C4";
    const now = Tone.now();
    const brightness = 500 + toneX * 4200 + (index % 4) * 80 + Math.floor(index / 4) * 50;

    instrument.filter.frequency.cancelScheduledValues(now);
    instrument.filter.frequency.rampTo(brightness, 0.03);
    instrument.synth.triggerAttackRelease(note, "16n", now, isPlaying ? 0.42 : 0.55);

    activePadIndex = index;
    window.setTimeout(() => {
      if (activePadIndex === index) activePadIndex = null;
    }, 160);
  }

  function currentPadOrder() {
    if (!heroButtonBed) return padNotes.map((_, index) => index);
    const pads = heroButtonBed.querySelectorAll<HTMLElement>(".hero-synth-button");
    return Array.from(pads).map((pad) => Number(pad.dataset.padIndex ?? 0));
  }

  function stopSequencer() {
    if (sequenceTimer !== null) {
      window.clearInterval(sequenceTimer);
      sequenceTimer = null;
    }
    isPlaying = false;
  }

  function sequencerTick() {
    const order = currentPadOrder();
    const normalizedStep = ((currentStep % order.length) + order.length) % order.length;
    const padIndex = order[normalizedStep] ?? 0;
    playPad(padIndex);
    currentStep = (currentStep + sequenceDirection + order.length) % order.length;
  }

  function scheduleSequencer() {
    if (sequenceTimer !== null) window.clearInterval(sequenceTimer);
    sequenceTimer = window.setInterval(sequencerTick, 220 / speedMultiplier);
  }

  async function playSequencer() {
    if (isPlaying) return;

    await getToneInstrument();
    isPlaying = true;
    sequencerTick();
    scheduleSequencer();
  }

  function toggleSpeed() {
    speedMultiplier = speedMultiplier === 1 ? 2 : 1;
    if (isPlaying) scheduleSequencer();
  }

  function toggleDirection() {
    sequenceDirection = sequenceDirection === 1 ? -1 : 1;
  }

  function drawWaveform(time: number) {
    if (!waveformCanvas) {
      animationFrame = requestAnimationFrame(drawWaveform);
      return;
    }

    const canvas = waveformCanvas;
    const context = canvas.getContext("2d");
    if (!context) return;

    const width = canvas.width;
    const height = canvas.height;
    const pixelPitch = 4;
    const pixelSize = 3;
    const phase = time * 0.006;
    const energy = activePadIndex === null ? 0.35 : 0.75;

    context.imageSmoothingEnabled = false;
    context.shadowBlur = 0;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);

    context.shadowColor = "#ffffff";
    context.shadowBlur = 2;
    context.fillStyle = "#ffffff";
    for (let x = 0; x < width; x += pixelPitch) {
      const wave = Math.sin(x * 0.16 + phase) + Math.sin(x * 0.07 + phase * 1.7) * 0.42;
      const y = Math.round((height / 2 + wave * height * 0.18 * energy) / pixelPitch) * pixelPitch;
      context.fillRect(x, y, pixelSize, pixelSize);
    }

    const stepWidth = width / 16;
    for (let index = 0; index < 16; index++) {
      const isCurrent = isPlaying && index === (currentStep + 15) % 16;
      const x = Math.round(index * stepWidth);
      const y = isCurrent ? height - 12 : height - 8;
      context.fillRect(x, y, pixelSize, isCurrent ? pixelSize * 2 + 1 : pixelSize);
    }
    context.shadowBlur = 0;

    animationFrame = requestAnimationFrame(drawWaveform);
  }

  onMount(() => {
    animationFrame = requestAnimationFrame(drawWaveform);

    return () => {
      cancelAnimationFrame(animationFrame);
      stopSequencer();
      toneInstrument?.synth.dispose();
      toneInstrument?.filter.dispose();
      toneInstrument?.delay.dispose();
      toneInstrument?.reverb.dispose();
    };
  });
</script>

<section id="landing">
  <div class="hero-layout">
    <div class="hero-text">
      <h1>
        Interactivity<br />Engine<span class="hero-title-icon material-symbols-outlined" aria-hidden="true">manufacturing</span><br />for the<br />Web<span class="hero-title-icon material-symbols-outlined" aria-hidden="true">web</span>
      </h1>
    </div>
    <div class="hero-card card">
      <Engine id="hero-synth-pads">
        <div class="hero-synth-panel">
          <div class="hero-synth-top">
            <div class="hero-oled display">
              <canvas bind:this={waveformCanvas} class="hero-waveform" width="64" height="64"></canvas>
            </div>
            <div class="hero-transport-grid" aria-label="Sequencer controls">
              <button class="hero-transport-button" type="button" aria-label="Play sequence" aria-pressed={isPlaying} onclick={playSequencer}>
                <span class="hero-transport-icon material-symbols-rounded" aria-hidden="true">play_arrow</span>
              </button>
              <button class="hero-transport-button" type="button" aria-label="Pause sequence" aria-pressed={!isPlaying} onclick={stopSequencer}>
                <span class="hero-transport-icon material-symbols-rounded" aria-hidden="true">pause</span>
              </button>
              <button class={`hero-transport-button ${speedMultiplier === 2 ? "is-active" : ""}`} type="button" aria-label="Toggle double speed" aria-pressed={speedMultiplier === 2} onclick={toggleSpeed}>
                <span class="hero-transport-icon material-symbols-rounded" aria-hidden="true">speed</span>
              </button>
              <button class={`hero-transport-button ${sequenceDirection === -1 ? "is-active" : ""}`} type="button" aria-label="Reverse sequence direction" aria-pressed={sequenceDirection === -1} onclick={toggleDirection}>
                <span class="hero-transport-icon material-symbols-rounded" aria-hidden="true">keyboard_backspace</span>
              </button>
            </div>
            <HeroToneJoystick bind:x={toneX} bind:y={toneY} onValueChange={updateToneControls} />
          </div>
          <div class="hero-button-bed slot" bind:this={heroButtonBed}>
            <div class="hero-button-slots" aria-hidden="true">
              {#each Array(16) as _}
                <div class="hero-button-slot"></div>
              {/each}
            </div>
            <div class="hero-button-grid" aria-hidden="true">
              <Container config={{ direction: "row", groupID: "hero-synth-pads" }}>
                {#each Array(16) as _, index}
                  <Item className="hero-synth-item">
                    <div
                      class={`hero-synth-button ${padColorClasses[index]} ${activePadIndex === index ? "is-active" : ""}`}
                      data-pad-index={index}
                      onpointerdown={() => playPad(index)}
                    >
                      <span class="hero-synth-button-number" aria-hidden="true">{index + 1}</span>
                      {#if recessedPadIndices.has(index)}
                        <div class="hero-synth-button-indent"></div>
                      {:else}
                        <div class="hero-synth-button-bump"></div>
                      {/if}
                    </div>
                  </Item>
                {/each}
              </Container>
            </div>
          </div>
        </div>
      </Engine>
    </div>
  </div>
</section>

<style lang="scss">
  @use "../landing.scss";

  #landing {
    height: 60vh;
    position: relative;
    border-radius: var(--size-12);
    background-color: var(--color-background-tint);
    margin: 0px auto;
    container-type: inline-size;
    container-name: landing;
    overflow: hidden;
  }

  .hero-layout {
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 2rem;
    align-items: stretch;
    padding: 50px;
    box-sizing: border-box;
  }

  .hero-text {
    display: flex;
    align-items: flex-start;
    justify-content: flex-start;
    text-align: left;
    padding-top: var(--size-24);
    padding-left: var(--size-24);

    h1 {
      line-height: 0.9;
      margin: 0;
      font-size: 100px;
    }

    .hero-title-icon {
      display: inline-block;
      width: 0.9em;
      height: 0.9em;
      margin-left: 0.1em;
      font-family: "Material Symbols Outlined";
      font-size: 0.82em;
      font-style: normal;
      font-weight: 500;
      line-height: 1;
      color: #44484f;
      vertical-align: -0.08em;
      font-variation-settings:
        "FILL" 0,
        "wght" 500,
        "GRAD" 0,
        "opsz" 48;
    }
  }

  .hero-card {
    width: 440px;
    align-self: end;
    justify-self: end;
    box-sizing: border-box;
    padding: var(--size-24);
  }

  .hero-card :global(#snap-canvas) {
    width: 100%;
    height: 100%;
  }

  .hero-synth-panel {
    --hero-pad-gap: 4px;
    --hero-control-gap: var(--hero-pad-gap);
    --hero-control-size: calc((100% - (var(--hero-pad-gap) * 5)) / 4);
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    box-sizing: border-box;
  }

  .hero-synth-top {
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--hero-pad-gap);
  }

  .hero-oled {
    width: var(--hero-control-size);
    aspect-ratio: 1 / 1;
    margin-left: var(--hero-pad-gap);
    flex: 0 0 auto;
  }

  .hero-waveform {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    filter: blur(0.18px);
  }

  .hero-transport-grid {
    width: var(--hero-control-size);
    aspect-ratio: 1 / 1;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(2, 1fr);
    gap: var(--hero-pad-gap);
    padding: 5px;
    box-sizing: border-box;
  }

  .hero-transport-button {
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 0;
    display: grid;
    place-items: center;
    font-family: "Geist Pixel Square", "Geist Pixel Circle", monospace;
    font-size: 0.55rem;
    letter-spacing: 0;
  }

  .hero-transport-icon {
    width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    flex: 0 0 auto;
    font-size: 16px;
    line-height: 1;
    font-variation-settings:
      "FILL" 0,
      "wght" 500,
      "GRAD" 0,
      "opsz" 20;
    transition:
      color 0.1s ease,
      filter 0.1s ease;
  }

  .hero-button-bed {
    --hero-pad-size: calc((100% - (var(--hero-pad-gap) * 3)) / 4);
    width: 100%;
    aspect-ratio: 1 / 1;
    position: relative;
    padding: var(--hero-pad-gap);
    border-radius: calc(var(--ui-radius) + 4px);
    background: #3c3f45;
    box-sizing: border-box;
  }

  .hero-button-slots {
    position: absolute;
    inset: var(--hero-pad-gap);
    z-index: 0;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(4, 1fr);
    gap: var(--hero-pad-gap);
    place-items: center;
    pointer-events: none;
  }

  .hero-button-slot {
    width: 20%;
    height: 20%;
    border-radius: calc(var(--ui-radius) * 0.5);
    background: #25282e;
    box-shadow:
      -6px -6px 8px 0px rgba(255, 255, 255, 0.06) inset,
      2px 2px 6.1px -1px rgba(0, 0, 0, 0.5) inset,
      -1px -1px 1px 0px rgba(115, 124, 144, 0.14),
      1px 1px 1px 0px rgba(255, 255, 255, 0.06),
      8px 8px 20px -7px rgba(0, 0, 0, 0.45) inset;
  }

  .hero-button-grid {
    width: 100%;
    height: 100%;
    position: relative;
    z-index: 1;
  }

  .hero-button-grid :global(.snapsort-container) {
    width: 100%;
    height: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    align-items: flex-start;
    gap: var(--hero-pad-gap);
  }

  .hero-button-grid :global(.hero-synth-item) {
    width: var(--hero-pad-size);
    height: var(--hero-pad-size);
    min-width: 0;
    min-height: 0;
    padding: 0;
    touch-action: none;
  }

  .hero-synth-button {
    --button-color: #fff;
    --button-dot-color: rgba(1, 11, 38, 0.32);
    --button-highlight-color: hsl(from var(--button-color) calc(h + 10) s calc(l + 20));
    --button-shadow-color: hsl(from var(--button-color) calc(h - 10) s calc(l - 20));
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    padding: 0;
    border: none;
    border-radius: var(--ui-radius);
    background: var(--button-color);
    color: var(--color-text);
    cursor: pointer;
    font-family: "Lato", sans-serif;
    font-size: 1rem;
    position: relative;
    display: grid;
    place-items: center;
    box-shadow:
      0px 0px 1px 0.5px rgba(1, 11, 38, 0.157) inset,
      1px 1px 1px 0.5px hsl(from var(--button-highlight-color) h s l / 0.7) inset,
      -0.5px -0.5px 0.5px 0.5px hsl(from var(--button-shadow-color) h s l / 0.5) inset,
      2.5px 2.5px 3px -2px rgba(13, 34, 68, 0.43),
      5px 5px 6px -3px rgba(6, 29, 57, 0.348);
    transition: all 0.1s ease-in-out;
  }

  .hero-synth-button-bump {
    width: calc(100% - 8px);
    height: calc(100% - 8px);
    border-radius: calc(var(--ui-radius) - 1px);
    background: var(--button-color);
    position: relative;
    box-shadow:
      1.75px 2px 2.25px -1.25px rgba(32, 36, 37, 0.26),
      0.75px 0.75px 0.75px 0px hsl(from var(--button-highlight-color) h s l / 0.42) inset,
      -0.4px -0.4px 0.65px 0px hsl(from var(--button-shadow-color) h s l / 0.28) inset;
  }

  .hero-synth-button-bump::after {
    content: "";
    position: absolute;
    top: 0.4px;
    left: 0.4px;
    width: calc(100% - 0.8px);
    height: calc(100% - 0.8px);
    border-radius: calc(var(--ui-radius) - 1.4px);
    box-sizing: border-box;
    border: 0.7px solid rgb(255, 255, 255);
    mask-image: linear-gradient(
      to bottom right,
      rgba(0, 0, 0, 0.72) 0%,
      rgba(0, 0, 0, 0.48) 12%,
      rgba(0, 0, 0, 0.25) 28%,
      rgba(0, 0, 0, 0) 48%
    );
    filter: blur(0.15px);
  }

  .hero-synth-button-indent {
    width: 72%;
    aspect-ratio: 1 / 1;
    border-radius: 999px;
    background: radial-gradient(
      circle at 118% 118%,
      color-mix(in srgb, var(--button-color) 78%, #f0e8d4 22%) 0%,
      var(--button-color) 44%,
      color-mix(in srgb, var(--button-color) 92%, #2f2634 8%) 100%
    );
    box-shadow:
      1px 1px 1.5px 0 rgba(31, 18, 38, 0.14) inset,
      -0.75px -0.75px 1px 0 rgba(242, 234, 210, 0.32) inset,
      0 0 0 0.5px rgba(1, 11, 38, 0.08);
    filter: blur(1px);
  }

  .hero-synth-button.pad-gray {
    --button-color: #d8dde3;
  }

  .hero-synth-button.pad-primary {
    --button-color: var(--color-primary);
    --button-dot-color: rgba(255, 255, 255, 0.34);
    color: #fff;
  }

  .hero-synth-button.pad-primary .hero-synth-button-bump {
    --button-color: #d8dde3;
  }

  .hero-synth-button::before {
    content: "";
    position: absolute;
    top: 8px;
    left: 8px;
    z-index: 2;
    width: 12px;
    height: 7px;
    background-image: radial-gradient(circle, var(--button-dot-color) 1px, transparent 1.15px);
    background-size: 4px 4px;
    background-position: 0 0;
    pointer-events: none;
  }

  .hero-synth-button-number {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 3;
    font-family: "Zen Dots", "Geist Mono", monospace;
    font-size: 15px;
    line-height: 1;
    color: var(--button-dot-color);
    text-align: right;
    pointer-events: none;
  }

  .hero-synth-button::after {
    content: "";
    position: absolute;
    top: 0.5px;
    left: 0.5px;
    width: calc(100% - 1px);
    height: calc(100% - 1px);
    border-radius: calc(var(--ui-radius) - 0.5px);
    box-sizing: border-box;
    border-style: inset;
    border: 1.5px solid rgb(255, 255, 255);
    mask-image: linear-gradient(
      to bottom right,
      rgba(0, 0, 0, 0.9) 0%,
      rgba(0, 0, 0, 0.8) 8%,
      rgba(0, 0, 0, 0.6) 10%,
      rgba(0, 0, 0, 0.5) 25%,
      rgba(0, 0, 0, 0) 50%
    );
    filter: blur(0.2px);
    pointer-events: none;
  }

  .hero-synth-button:hover {
    cursor: move;
    box-shadow:
      0px 0px 1px 0.5px rgba(1, 11, 38, 0.157) inset,
      1px 1px 1px 0.5px hsl(from var(--button-highlight-color) h s l / 0.7) inset,
      -0.5px -0.5px 0.5px 0.5px hsl(from var(--button-shadow-color) h s l / 0.5) inset,
      2px 2px 3px -2px rgba(13, 34, 68, 0.43),
      4px 4px 6px -3px rgba(6, 29, 57, 0.348);
  }

  .hero-synth-button.is-active {
    transform: scale(0.97);
    filter: saturate(1.08);
  }

  @container landing (max-width: 900px) {
    #landing {
      height: auto;
    }

    .hero-layout {
      grid-template-columns: 100%;
      grid-template-rows: min-content 1fr;
      gap: var(--size-32);
      padding: var(--size-48) 0;
      align-items: start;
    }

    .hero-text {
      width: 100%;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 0;
    }

    .hero-text h1 {
      text-align: center;
      font-size: clamp(2.5rem, 10vw, 5rem);
    }

    .hero-card {
      width: min(440px, calc(100% - var(--size-32)));
      justify-self: center;
    }
  }
</style>
