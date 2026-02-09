<script lang="ts">
    // import type {Engine} from "@snap-engine/core";
    // import { getContext } from "svelte";

    // let engine:Engine = getContext("engine");

    // let pointerPosition: any = $state({x: 0, y: 0, screenX: 0, screenY: 0, cameraX: 0, cameraY: 0});
    // let style = $derived(`top: ${pointerPosition.screenY}px; left: ${pointerPosition.screenX}px;`);

    // function updateMousePosition(prop: pointerMoveProp) {
    //     pointerPosition = prop.position;
    //     for (const [key, value] of Object.entries(prop.position)) {
    //         // Round to the nearest 1/100th of a pixel
    //         pointerPosition[key] = Math.round(value * 100) / 100;
    //     }
    // }
    // onMount(() => {
    //     const globalInputEngine = engine.global.getInputEngine(engine);
    //     if (globalInputEngine) {
    //         // globalInputEngine._inputControl.event.pointerMove = updateMousePosition;
    //         globalInputEngine.subscribeGlobalCursorEvent("pointerMove", "100", updateMousePosition);
    //     }
    // });



</script>

<!-- <div style={style} class="mouse-position-display">
   <ol>
    <li>
        <p>World Coordinates: {pointerPosition.x}, {pointerPosition.y}</p>
    </li>
    <li>
        <p>Camera Coordinates: {pointerPosition.cameraX}, {pointerPosition.cameraY}</p>
    </li>
    <li>
        <p>Screen Coordinates: {pointerPosition.screenX}, {pointerPosition.screenY}</p>
    </li>
   </ol>
</div> -->


<style lang="scss">
    .mouse-position-display {
        position: fixed;
        top: 0;
        left: 0;
        li {
            list-style-type: none;
        }

        p {
            font-size: 12px;
            font-family: 'IBM Plex Mono', monospace;
           
        }
    }
</style>