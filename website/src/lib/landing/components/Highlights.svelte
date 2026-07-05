<script lang="ts">
  import InputHandlingCard from "./highlights/InputHandlingCard.svelte";
  import AnimationCard from "./highlights/AnimationCard.svelte";
  import CameraControlCard from "./highlights/CameraControlCard.svelte";
  import DomOptimizationCard from "./highlights/DomOptimizationCard.svelte";
  import CollisionCard from "./highlights/CollisionCard.svelte";
  import { debugState } from "$lib/landing/debugState.svelte";
  import "./highlights/highlight-cards.css";
</script>

<section class="two-column interactivity-explainer">
  <div class="interactivity-intro">
    <h2 class="landing-section-heading">What's Included:</h2>
    <div class="visual-debugger-toggle">
      <span>Visual debugger {debugState.enabled ? "on" : "off"}</span>
      <div
        class="toggle-switch slot"
        class:enabled={debugState.enabled}
        onclick={() => (debugState.enabled = !debugState.enabled)}
        role="switch"
        aria-checked={debugState.enabled}
        tabindex="0"
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            debugState.enabled = !debugState.enabled;
          }
        }}
      >
        <div class="knob disk"></div>
      </div>
    </div>
  </div>

  <div class="highlight-card-list">
    <InputHandlingCard />
    <CameraControlCard />
    <AnimationCard />
    <CollisionCard />
    <DomOptimizationCard />
  </div>
</section>

<style lang="scss">
  @use "../landing.scss";
  @import url("https://fonts.googleapis.com/css2?family=Micro+5&display=swap");

  .interactivity-explainer {
    margin-top: clamp(2.5rem, 5vw, 5rem);

    @media (max-width: 900px) {
      grid-template-columns: 1fr !important;
    }
  }

  .interactivity-intro {
    display: flex;
    flex-direction: column;
    align-items: center;
    grid-column: 1 / -1;
    gap: var(--size-20);
    text-align: center;
    width: min(100%, 760px);
    margin: clamp(3rem, 7vw, 6rem) auto clamp(2rem, 4vw, 3.5rem);

    h2 {
      margin-bottom: var(--size-16);
    }
  }

  .visual-debugger-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--size-12);
    padding: var(--size-8) var(--size-12);
    border-radius: 999px;
    background: var(--color-background-tint);
  }

  .visual-debugger-toggle span {
    margin: 0;
    color: #5d6266;
    font-size: 0.92rem;
    font-weight: 600;
  }

  .toggle-switch {
    position: relative;
    width: 64px;
    height: 36px;
    border-radius: 999px;
    cursor: pointer;
    overflow: hidden;
    transition: background-color 0.3s ease;

    &:hover {
      background-color: rgba(0, 0, 0, 0.12);
    }

    &.enabled {
      background-color: var(--color-primary);
    }

    &:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  .knob {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 28px;
    height: 28px;
    --ui-radius: 14px;
    --card-color: rgb(29, 29, 29);
    padding: 0;
    background-color: var(--color-primary);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }

  .toggle-switch.enabled .knob {
    transform: translateX(28px);
    background-color: white;
  }

  .highlight-card-list {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: clamp(var(--size-24), 4vw, var(--size-48));
    width: 100%;

    > :global(article) {
      width: 100%;
      height: auto;
    }
  }
</style>
