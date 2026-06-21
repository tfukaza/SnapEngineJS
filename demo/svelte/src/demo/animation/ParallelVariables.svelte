<script lang="ts">
  import type { Engine } from "@snap-engine/core";
  import { getContext, onDestroy, onMount } from "svelte";
  import { ElementObject } from "@snap-engine/core";
  import { AnimationObject } from "@snap-engine/core/animation";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";

  let engine: Engine = getContext("engine");
  let xObject: ElementObject = new ElementObject(engine, null);
  let yObject: ElementObject = new ElementObject(engine, null);
  let opacityObject: ElementObject = new ElementObject(engine, null);
  let props: ExhibitProps = {};
  const animations: AnimationObject[] = [];

  onMount(() => {
    const xAnimation = new AnimationObject(
      null,
      {
        $xFast: [-130, 130, -130],
      },
      {
        duration: 2200,
        easing: ["ease-in-out", "ease-in-out"],
        persist: true,
        tick: (values) => {
          if (!xObject.element) {
            return;
          }
          xObject.element.style.transform = `translate(${values.$xFast}px, -64px)`;
          xObject.element.textContent = `x ${Math.round(values.$xFast)}`;
        },
      },
    );

    const yAnimation = new AnimationObject(
      null,
      {
        $ySlow: [-80, 80, -20, -80],
      },
      {
        duration: 5200,
        easing: ["ease-out", "linear", "ease-in"],
        offset: [0, 0.45, 0.78, 1],
        persist: true,
        tick: (values) => {
          if (!yObject.element) {
            return;
          }
          yObject.element.style.transform = `translate(-12px, ${values.$ySlow}px)`;
          yObject.element.textContent = `y ${Math.round(values.$ySlow)}`;
        },
      },
    );

    const opacityAnimation = new AnimationObject(
      null,
      {
        $alphaPulse: [0.2, 1, 0.45, 0.85],
        $sizePulse: [28, 72, 44, 58],
      },
      {
        duration: 3600,
        easing: ["ease-in", "ease-out", "ease-in-out"],
        offset: [0, 0.25, 0.7, 1],
        persist: true,
        tick: (values) => {
          if (!opacityObject.element) {
            return;
          }
          opacityObject.element.style.opacity = String(values.$alphaPulse);
          opacityObject.element.style.width = `${values.$sizePulse}px`;
          opacityObject.element.style.height = `${values.$sizePulse}px`;
          opacityObject.element.textContent = `${Math.round(values.$sizePulse)}`;
        },
      },
    );

    animations.push(xAnimation, yAnimation, opacityAnimation);
    for (const animation of animations) {
      xObject.addAnimation(animation, { replaceExisting: false });
      animation.play();
    }

    props.play = () => animations.forEach((animation) => animation.play());
    props.pause = () => animations.forEach((animation) => animation.pause());
    props.reverse = () => animations.forEach((animation) => animation.reverse());
    props.cancel = () => animations.forEach((animation) => animation.cancel());
  });

  onDestroy(() => {
    for (const animation of animations) {
      animation.cancel();
    }
    xObject.destroy();
    yObject.destroy();
    opacityObject.destroy();
  });
</script>

<Exhibit {props}>
  <div class="parallel-stage">
    <div class="parallel-dot x-dot" bind:this={xObject.element}></div>
    <div class="parallel-dot y-dot" bind:this={yObject.element}></div>
    <div
      class="parallel-dot pulse-dot"
      bind:this={opacityObject.element}
    ></div>
  </div>
</Exhibit>

<style lang="scss">
  .parallel-stage {
    position: absolute;
    inset: 64px 32px 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .parallel-dot {
    position: absolute;
    width: 56px;
    height: 56px;
    border: 1px solid black;
    border-radius: 0;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Geist", sans-serif;
    font-size: 13px;
    font-weight: 300;
    will-change: transform, width, height, opacity;
  }

  .x-dot {
    background: white;
  }

  .y-dot {
    background: white;
  }

  .pulse-dot {
    background: white;
  }
</style>
