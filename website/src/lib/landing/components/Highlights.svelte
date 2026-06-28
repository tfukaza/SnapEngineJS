<script lang="ts">
  import InputHandlingCard from "./highlights/InputHandlingCard.svelte";
  import AnimationCard from "./highlights/AnimationCard.svelte";
  import CameraControlCard from "./highlights/CameraControlCard.svelte";
  import DomOptimizationCard from "./highlights/DomOptimizationCard.svelte";
  import CollisionCard from "./highlights/CollisionCard.svelte";
  import VisualDebuggerCard from "./highlights/VisualDebuggerCard.svelte";
  import "./highlights/highlight-cards.css";
</script>

<section class="two-column interactivity-explainer">
  <div class="interactivity-intro">
    <h2 class="landing-section-heading">What's Included:</h2>
  </div>

  <div class="highlight-card-list">
    <InputHandlingCard />
    <CameraControlCard />
    <AnimationCard />
    <CollisionCard />
    <DomOptimizationCard />
    <VisualDebuggerCard />
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
    grid-column: 1 / -1;
    text-align: center;
    width: min(100%, 760px);
    margin: clamp(3rem, 7vw, 6rem) auto clamp(2rem, 4vw, 3.5rem);

    h2 {
      margin-bottom: var(--size-16);
    }
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
