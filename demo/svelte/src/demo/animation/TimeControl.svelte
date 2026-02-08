<script lang="ts">
  import type {Engine} from "@snap-engine/core";
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "@snap-engine/core";
  import { AnimationObject, SequenceObject } from "@snap-engine/core/animation";
  import Exhibit from "./Exhibit.svelte";
  import type { ExhibitProps } from "./Exhibit.svelte";
  
  let engine:Engine = getContext("engine");
  let object:ElementObject = new ElementObject(engine, null);
  let props:ExhibitProps = {};

  onMount(() => {
    let sequence_1 = new AnimationObject(object.element, {
    transform: [
      "translate(-50px, 50px)", 
      "translate(50px, 50px)", 
      "translate(50px, -50px)", 
      "translate(-50px, -50px)",
      "translate(-50px, 50px)"
    ],
    $number: [
      0,
      100, 
      200,
      300,
      400,
    ]
  },
    {
      duration: 4000,
      easing: ["ease-in-out", "ease-in-out", "ease-in-out", "ease-in-out"],
      tick: (value) => {
        if (object.element) {
          object.element.innerHTML = `${Math.round(value.$number)}`;
        }
      }
    },
  );

  let sequence_2 = new AnimationObject(object.element, {
    backgroundColor: [
      "red",
      "blue",
      "red",
    ],
  },
  {
      duration: 4000,
      offset: [0.45, 0.5, 0.55],
      easing: "linear",
    },
  );
    const sequence = new SequenceObject();
    sequence.add(sequence_1);
    sequence.add(sequence_2);
    object.addAnimation(sequence);
    sequence.play();

    props.play = () => sequence.play();
    props.pause = () => sequence.pause();
    props.reverse = () => sequence.reverse();
    props.cancel = () => sequence.cancel();
  });

  onDestroy(() => {
    if (object.animation) {
      object.animation.cancel();
    }
    object.destroy();
  });

  function handleInput(event: Event) {
    const input = event.target as HTMLInputElement;
    object.animation.progress = parseFloat(input.value);
  }
</script>

<Exhibit {props} >
  <input type="range" min="0" max="1" step="0.001" oninput={handleInput} />
  <div class="circle" bind:this={object.element} style="top: 50%; left: 50%; position: absolute;"></div>
</Exhibit>

  <style lang="scss">
    .circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: rgb(255, 94, 0);
    }

    input {
      width: calc(100% - var(--size-16) * 2);
      position: absolute;
      bottom: var(--size-16);
    }
  
  </style>
  