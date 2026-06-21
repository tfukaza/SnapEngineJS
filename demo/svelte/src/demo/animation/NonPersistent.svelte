<script lang="ts">
  import type { Engine } from "@snap-engine/core";
  import { getContext, onDestroy, onMount } from "svelte";
  import { ElementObject } from "@snap-engine/core";
  import { AnimationObject } from "@snap-engine/core/animation";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";

  let engine: Engine = getContext("engine");
  let object: ElementObject = new ElementObject(engine, null);
  let props: ExhibitProps = {};
  let animation: AnimationObject | null = null;

  onMount(() => {
    animation = new AnimationObject(
      null,
      {
        $value: [0, 100],
      },
      {
        duration: 1800,
        easing: "ease-out",
        persist: false,
        tick: (values) => {
          if (!object.element) {
            return;
          }
          object.element.textContent = Math.round(values.$value).toString();
        },
        finish: () => {
          if (!object.element) {
            return;
          }
          object.element.textContent = "100";
          object.element.dataset.state = "done";
        },
      },
    );
    object.addAnimation(animation);
    animation.play();

    props.play = () => animation?.play();
    props.pause = () => animation?.pause();
    props.reverse = () => animation?.reverse();
    props.cancel = () => animation?.cancel();
  });

  onDestroy(() => {
    animation?.cancel();
    object.destroy();
  });
</script>

<Exhibit {props}>
  <div class="non-persistent-stage">
    <div class="non-persistent-dot" bind:this={object.element}>0</div>
  </div>
</Exhibit>

<style lang="scss">
  .non-persistent-stage {
    position: absolute;
    inset: 64px 32px 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .non-persistent-dot {
    width: 96px;
    height: 96px;
    border: 1px solid black;
    border-radius: 0;
    background: white;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Geist", sans-serif;
    font-size: 30px;
    font-weight: 300;
    transition: background-color 120ms ease;
  }

  .non-persistent-dot[data-state="done"] {
    background: white;
  }
</style>
