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
      null,
      {
        $x: [0, 100],
      },
      {
        duration: 10000,
        easing: "ease-in-out",
        tick: (values: any) => {
          if (object.element) {
            object.element.innerHTML = `<h1>${Math.round(values.$x)}</h1>`;
          }
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
    if (object.animation) {
      object.animation.cancel();
    }
    object.destroy();
  });
</script>

<Exhibit {props} >
  <div bind:this={object.element} style="top: 50%; left: 50%; position: absolute; transform: translate(-50%, -50%);"></div>
</Exhibit>

  <style lang="scss">
    @import "../../../../app.scss";
  </style>
  