<script lang="ts">
  import type {Engine} from "@snap-engine/core";
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "@snap-engine/core";
  import { AnimationObject } from "@snap-engine/core/animation";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";
  
  let engine:Engine = getContext("engine");
  let object:ElementObject = new ElementObject(engine, null);
  let props:ExhibitProps = {};

  onMount(() => {
    const anim = new AnimationObject(
      null,
      {
        $x: [0, 100],
      },
      {
        duration: 10000,
        easing: "ease-in-out",
        persist: true,
        tick: (values: any) => {
          if (object.element) {
            object.element.textContent = Math.round(values.$x).toString();
          }
        },
      },
      engine,
    );
    object.addAnimation(anim);
    anim.play();

    props.play = () => anim.play();
    props.pause = () => anim.pause();
    props.reverse = () => anim.reverse();
    props.cancel = () => anim.cancel();
  });

  onDestroy(() => {
    if (object.animation) {
      object.animation.cancel();
    }
    object.destroy();
  });
</script>

<Exhibit {props} >
  <div class="variable-value" bind:this={object.element} style="top: 50%; left: 50%; position: absolute; transform: translate(-50%, -50%);"></div>
</Exhibit>

<style lang="scss">
  .variable-value {
    color: black;
    font-family: "Geist", sans-serif;
    font-size: 72px;
    font-weight: 300;
    line-height: 1;
  }
</style>
  
  
