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

  onMount(() => {
    const anim = new AnimationObject(
      null,
      {
        $x: [-90, 80, 30, -90],
        $y: [-45, -20, 55, -45],
        $scale: [0.75, 1.35, 0.9, 0.75],
        $rotate: [0, 180, 320, 360],
      },
      {
        duration: 6000,
        easing: ["ease-in-out", "ease-out", "ease-in"],
        offset: [0, 0.35, 0.72, 1],
        persist: true,
        tick: (values) => {
          if (!object.element) {
            return;
          }
          object.element.style.transform = [
            "translate(-50%, -50%)",
            `translate(${values.$x}px, ${values.$y}px)`,
            `scale(${values.$scale})`,
            `rotate(${values.$rotate}deg)`,
          ].join(" ");
          object.element.textContent = `${Math.round(values.$x)}, ${Math.round(values.$y)}`;
        },
      },
    );
    object.addAnimation(anim);
    anim.play();

    props.play = () => anim.play();
    props.pause = () => anim.pause();
    props.reverse = () => anim.reverse();
    props.cancel = () => anim.cancel();
  });

  onDestroy(() => {
    object.animation?.cancel();
    object.destroy();
  });
</script>

<Exhibit {props}>
  <div class="multi-variable-dot" bind:this={object.element}></div>
</Exhibit>

<style lang="scss">
  .multi-variable-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 72px;
    height: 72px;
    border: 1px solid black;
    border-radius: 0;
    background: white;
    color: black;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: "Geist", sans-serif;
    font-size: 13px;
    font-weight: 300;
    transform: translate(-50%, -50%);
    transform-origin: center;
    will-change: transform;
  }
</style>
