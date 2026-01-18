<script lang="ts">
  import type {Engine} from "../../../../index";
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "../../../../../src/object";
  import { AnimationObject } from "../../../../../src/animation";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";
  
  let engine:Engine = getContext("engine");
  let object:ElementObject = new ElementObject(engine, null);
  let props:ExhibitProps = {};

  onMount(() => {
    const anim = new AnimationObject(
      object.element,
      {
        transform: [
          "translate(0px, 0px)", 
          "translate(100px, 0px)", 
          "translate(100px, 50px)", 
          "translate(-100px, -50px)",
          "translate(-100px, 0px)",
          "translate(0px, 0px)"
        ],
      },
      {
        duration: 3000,
        easing: "ease-in-out",
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
    if (object.animation) {
      object.animation.cancel();
    }
    object.destroy();
  });
</script>

<Exhibit {props} >
  <div class="circle" bind:this={object.element} style="top: 50%; left: 50%; position: absolute;"></div>
</Exhibit>

  <style lang="scss">
    .circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgb(255, 94, 0);
    }
  
  </style>
  