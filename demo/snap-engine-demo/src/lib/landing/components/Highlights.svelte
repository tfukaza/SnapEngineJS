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
    <h2>…what’s an “Interactivity Engine”?</h2>
    <p>It’s a collection of utilities for adding interactive elements to web apps.</p>
  </div>

  <InputHandlingCard />
  <AnimationCard />
  <CameraControlCard />
  <DomOptimizationCard />
  <CollisionCard />
  <VisualDebuggerCard />
</section>

<style lang="scss">
  @use "../landing.scss";
  @import url("https://fonts.googleapis.com/css2?family=Micro+5&display=swap");
  @import url("https://fonts.googleapis.com/css2?family=Pixelify+Sans&display=swap");

  .interactivity-explainer {
    margin-top: clamp(3rem, 6vw, 6rem);
  }

  .interactivity-intro {
    grid-column: 1 / -1;
    text-align: center;
    margin: clamp(20px, 20vh, 300px) auto;

    h2 {
      font-size: clamp(2.5rem, 5vw, 3.5rem);
      margin-bottom: 1rem;
    }

    p {
      font-size: clamp(1.2rem, 2vw, 1.5rem);
      line-height: 1.6;
    }
  }
</style>
