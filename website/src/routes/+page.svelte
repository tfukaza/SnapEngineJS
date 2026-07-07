<script lang="ts">
  import SeoHead from "$lib/components/SeoHead.svelte";
  import AssetsShowcase from "$lib/landing/components/AssetsShowcase.svelte";
  import Hero from "$lib/landing/components/Hero.svelte";
  import Highlights from "$lib/landing/components/Highlights.svelte";
</script>

<SeoHead
  title="SnapEngineJS | Interactivity engine for the web"
  description="SnapEngine is an interactivity engine for building draggable, animated, collision-aware web experiences."
  path="/"
  imageAlt="SnapEngineJS website preview"
/>
<Hero />
<Highlights />
<AssetsShowcase />

<style lang="scss">
  @use "$lib/landing/landing.scss";
</style>
