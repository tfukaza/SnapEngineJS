<script lang="ts">
  import type {Engine} from "../../../../index";
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "../../../../../src/object";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";
  
  let engine:Engine = getContext("engine");
  let object:ElementObject = new ElementObject(engine, null);
  let props:ExhibitProps = {};

  onMount(() => {
    object.animate(
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
    props.play = () => object.animation?.play();
    props.pause = () => object.animation?.pause();
    props.reverse = () => object.animation?.reverse();
    props.cancel = () => object.animation?.cancel();
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
  