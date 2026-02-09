<script lang="ts">
  import { onMount } from "svelte";
  import Hero from "./components/Hero.svelte";
  import Highlights from "./components/Highlights.svelte";
  import AssetsShowcase from "./components/AssetsShowcase.svelte";

  let showBanner = $state(false);

  onMount(() => {
    if (!localStorage.getItem("alpha-banner-dismissed")) {
      showBanner = true;
    }
  });

  function dismissBanner() {
    showBanner = false;
    localStorage.setItem("alpha-banner-dismissed", "1");
  }
</script>

{#if showBanner}
  <div class="alpha-banner">
    <p class="alpha-banner-text">
      SnapEngine is in early alpha. APIs may change. Not recommended for production use.
    </p>
    <button class="alpha-banner-dismiss" onclick={dismissBanner} aria-label="Dismiss banner">
      ✕
    </button>
  </div>
{/if}

<Hero />
<Highlights />
<AssetsShowcase />


<style lang="scss">
  @use "./landing.scss";

  .alpha-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.6rem 1.2rem;
    background: #faf3e0;
    border: 1px solid #e6d3a8;
    border-radius: 8px;
    margin: 0 auto 1rem;
    width: clamp(100px, 90%, 1200px);
    box-sizing: border-box;
  }

  .alpha-banner-text {
    margin: 0;
    font-size: 0.85rem;
    color: #7a5c1e;
    text-align: center;
    line-height: 1.4;
  }

  .alpha-banner-dismiss {
    flex-shrink: 0;
    background: none;
    border: none;
    color: #a08040;
    font-size: 1rem;
    cursor: pointer;
    padding: 0.15rem 0.35rem;
    border-radius: 4px;
    line-height: 1;
    transition: background 0.15s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }
  }
</style>
