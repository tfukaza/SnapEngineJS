<script lang="ts">
  import type {Engine} from "../../../../index";
  import { getContext, onMount, onDestroy } from "svelte";
  import { ElementObject } from "../../../../../src/object";
  import { AnimationObject } from "../../../../../src/animation";
  let engine:Engine = getContext("engine");
  // let object:ElementObject = new ElementObject(engine, null);

  interface Object {
    object: ElementObject;
    prevX: number;
  }

  // const rows = 32;
  // const columns = 32;
  const rows = 10;
  const columns = 10;
  const objects:Object[] = [];
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < columns; j++) {
      const object = {
        object: new ElementObject(engine, null),
        prevX: 0,
      };
      objects.push(object);
    }
  }

  function round(value: number) {
    return Math.round(value * 100) / 100;
  }

  onMount(() => { 
    // Benchmark how long it takes to instantiate 1000 objects
    const start = performance.now();
    let i = 0;
    for (const object of objects) {
      i++;
      const anim = new AnimationObject(
        object.object.element,
        {
          // opacity: [0.5, 1, 0.5, 1],
          backgroundColor: ["red", "blue", "green", "black"],
          transform: ["translate(-30px, 0px)", "translate(30px, 0px)", "translate(-30px, 0px)", "translate(30px, 0px)"],
          $x: [-30, 30, -50, 50],
        },
        {
          duration: 10000,
          easing: ["ease-in-out", "linear", "ease-in-out"],
          offset: [0, 0.33, 0.66, 1.0],
          delay: 50 * i,
          tick: (value: any) => {
            object.object.element!.innerHTML = round(value.$x - object.prevX).toString();
            object.prevX = value.$x;
            // console.log("Tick", value);
            // object.object.dom.style.transform = `translate(${value.$x}px, 0px)`;
            // object.object.requestPostWrite();
          },
        }
      );
      object.object.addAnimation(anim);
      anim.play();
    }
    const end = performance.now();
    console.log(`Time taken to instantiate ${rows * columns} objects: ${end - start} milliseconds`);
  });

  onDestroy(() => {
    for (const obj of objects) {
      if (obj.object.animation) {
        obj.object.animation.cancel();
      }
      obj.object.destroy();
    }
  });
</script>
    
<div class="container"> 
  {#each objects as object}
    <div class="circle" bind:this={object.object.element}></div>
  {/each}
</div>

  <style lang="scss">
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .circle {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: red;
      padding: 4px;
      text-align: center;
      font-size: 10px;
      color: white;
      font-family: 'Inter', sans-serif;
    }
  
  </style>
  