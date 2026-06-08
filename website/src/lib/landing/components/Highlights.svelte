<script lang="ts">
  import InputHandlingCard from "./highlights/InputHandlingCard.svelte";
  import AnimationCard from "./highlights/AnimationCard.svelte";
  import CameraControlCard from "./highlights/CameraControlCard.svelte";
  import DomOptimizationCard from "./highlights/DomOptimizationCard.svelte";
  import CollisionCard from "./highlights/CollisionCard.svelte";
  import VisualDebuggerCard from "./highlights/VisualDebuggerCard.svelte";
</script>

<section class="two-column interactivity-explainer">
  <div class="interactivity-intro">
    <h2 class="landing-section-heading">The toolkit for<br />creating any UI.</h2>
    <p class="section-copy">
      Use the pieces you need to build interfaces that move, react, snap,
      collide, animate, and stay easy to reason about.
    </p>
  </div>

  <div class="highlight-card-columns">
    <div class="highlight-card-column">
      <InputHandlingCard />
      <CollisionCard />
      <DomOptimizationCard />
    </div>

    <div class="highlight-card-column">
      <CameraControlCard />
      <AnimationCard />
      <VisualDebuggerCard />
    </div>
  </div>
</section>

<style lang="scss">
  @use "../landing.scss";
  @import url("https://fonts.googleapis.com/css2?family=Micro+5&display=swap");

  .interactivity-explainer {
    --highlight-card-height: 550px;
    margin-top: clamp(2.5rem, 5vw, 5rem);

    @media (max-width: 1024px) {
      --highlight-card-height: 500px;
    }

    @media (max-width: 900px) {
      --highlight-card-height: 460px;
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

    .section-copy {
      color: #5d6266;
      font-size: clamp(1rem, 1.3vw, 1.18rem);
      line-height: 1.7;
      margin: 0 auto;
      max-width: 660px;
    }
  }

  .highlight-card-columns {
    grid-column: 1 / -1;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: start;
    gap: clamp(var(--size-24), 4vw, var(--size-48));
    width: 100%;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  .highlight-card-column {
    display: flex;
    flex-direction: column;
    gap: clamp(var(--size-24), 4vw, var(--size-48));
    min-width: 0;

    > :global(article) {
      width: 100%;
      height: var(--highlight-card-height);
      min-height: var(--highlight-card-height);
    }
  }

</style>
