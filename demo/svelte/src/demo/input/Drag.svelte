<script lang="ts">
    import Canvas from "../../lib/Canvas.svelte";
    import type {Engine} from "../../../../index";
    import {ElementObject} from "../../../../../src/object";
    import type {
        dragProp, 
        dragStartProp, 
        dragEndProp, 
        pointerDownProp, 
        pointerUpProp, 
        pinchProp, 
        pinchStartProp,
        pinchEndProp, 
        pointerMoveProp} from "../../../../../src/input";
    // import { GLOBAL_GID } from "../../../../../src/input";
    import { onMount, onDestroy } from "svelte";

    let engine: Engine | null = $state(null);
    let canvasComponent: Canvas | null = null;

    // let startPosition: any = $state([]);
    // let endPosition: any = $state([]);
    // let dragCount: number = $state(0);
    // startPosition.push({id: dragCount, startX: 0, startY: 0});
    // dragCount++;
    // let style = $derived(`top: ${startPosition[startPosition.length - 1].startY - 10}px; left: ${startPosition[startPosition.length - 1].startX}px;`);

    // let dots: any = $state([]);
    interface pointerDot {
        x: number;
        y: number;
        createdAt: number;
        color: string;
    }

    interface memberProp {
        name: string;
        color: string;
    }

    interface pointerProp {
        pointerId: string;
        x: number;
        y: number;
        memberList: memberProp[];
    }

    interface dragGestureProp {
        pointerId: string;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        endX: number | null;
        endY: number | null;
        memberList: memberProp[];
        needDelete: boolean;
    }

    interface pinchGesture {
        id: string;
        x0: number;
        y0: number;
        x1: number;
        y1: number;
        object: ElementObject;
    }

    let pointerDots: pointerDot[] = [];
    
    let pointerList: Record<string, pointerProp> = $state({});
    let dragGesture: Record<string, dragGestureProp> = $state({});
    let pinchMarker: Record<string, pinchGesture> = $state({});
    

    function round(value: number) {
        return Math.round(value * 100) / 100;
    }

    function pointerDown(_: pointerDownProp, __: string, ___: string) {
    }

    function pointerMove(prop: pointerMoveProp, color: string, caller: string) {
        if (pointerList[prop.event!.pointerId]) {
            Object.assign(pointerList[prop.event!.pointerId], {
                x: round(prop.position.x), 
                y: round(prop.position.y),
            });
            // if (!pointerList[prop.event!.pointerId].memberList.find(member => member.name === caller)) {
            //     pointerList[prop.event!.pointerId].memberList.push({name: caller, color: color});
            // };
        } else {
            pointerList[prop.event!.pointerId] = {
                pointerId: prop.event!.pointerId.toString(),
                x: round(prop.position.x), 
                y: round(prop.position.y),
                memberList: [{name: caller, color: color}]
            };
        }
        
    }

    function pointerUp(prop: pointerUpProp) {
        delete pointerList[prop.event!.pointerId];
    }

    function dragStart(prop: dragStartProp, color: string, caller: string) {
        const startX = round(prop.start.x);
        const startY = round(prop.start.y);
        if (dragGesture[prop.pointerId] && dragGesture[prop.pointerId].needDelete) {
            delete dragGesture[prop.pointerId];
        } 

        if (dragGesture[prop.pointerId]) {
            dragGesture[prop.pointerId].memberList.push({name: caller, color: color});
        } else {
            dragGesture[prop.pointerId] = {
                pointerId: prop.pointerId.toString(),
                startX: startX,
                startY: startY,
                currentX: startX,
                currentY: startY,
                endX: null,
                endY: null,
                memberList: [{name: caller, color: color}],
                needDelete: false
            }
        }
    }

    function drag(prop: dragProp) {
        
        let pointer = dragGesture[prop.pointerId];
        pointer.currentX = prop.position.x;
        pointer.currentY = prop.position.y;

        pointerDots.push({
            x: round(prop.position.x), 
            y: round(prop.position.y),
            createdAt: Date.now(),
            color: "#000"
        });
    }

    function dragEnd(prop: dragEndProp) {
        let pointer = dragGesture[prop.pointerId];
        pointer.endX = round(prop.end.x);
        pointer.endY = round(prop.end.y);
        pointer.needDelete = true;
    }


    function pinchStart(prop: pinchStartProp) {
        if (!engine) return;
        pinchMarker[prop.gestureID] = {
            id: prop.gestureID,
            x0: prop.start.pointerList[0].x,
            y0: prop.start.pointerList[0].y, 
            x1: prop.start.pointerList[1].x, 
            y1: prop.start.pointerList[1].y, 
            object: new ElementObject(engine, null)
        }
    }

    function pinch(prop: pinchProp) {
        Object.assign(pinchMarker[prop.gestureID], {
            x0: prop.pointerList[0].x, 
            y0: prop.pointerList[0].y, 
            x1: prop.pointerList[1].x, 
            y1: prop.pointerList[1].y, 
        });
    }
    function pinchEnd(prop: pinchEndProp) {
        delete pinchMarker[prop.gestureID];
    }


    interface AreaConfig {
        name: string;
        color: string;
        style: string;
        element?: HTMLDivElement;
        object?: ElementObject;
    }

    let areas: AreaConfig[] = [
        { name: "Center", color: "#FF5733", style: "grid-area: 2 / 2 / 5 / 5;" },
        { name: "TopLeft", color: "#33FF57", style: "grid-area: 1 / 1 / 2 / 3;" },
        { name: "BottomRight", color: "#3357FF", style: "grid-area:3 / 5 / 6 / 6;" },
        { name: "TopRight", color: "#F333FF", style: "grid-area: 1 / 4 / 2 / 6;" },
        { name: "BottomLeft", color: "#FF33A8", style: "grid-area: 4 / 1 / 6 / 2;" },
    ];

    let nestedArea: AreaConfig = {
        name: "Nested",
        color: "#000000",
        style: "width: 50%; height: 50%; display: flex; align-items: center; justify-content: center;",
    };

    let canvasWrapper: HTMLDivElement | null = null;
    let pointerCanvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    const dotRadius = 1;
    const dotFadeTime = 500;
    let handleResize: (() => void) | null = null;

    function updateCanvasSize() {
        if (!pointerCanvas || !canvasWrapper) return;
        const { width, height } = canvasWrapper.getBoundingClientRect();
        pointerCanvas.width = width;
        pointerCanvas.height = height;
    }

    function drawCircle(
        x: number, y: number, 
        radius: number, 
        fillColor: string | null = null, 
        strokeColor: string | null = null) {
        ctx!.beginPath();
        ctx!.arc(x, y, radius, 0, Math.PI * 2);
        if (fillColor) {
            ctx!.fillStyle = fillColor;
            ctx!.fill();
        }
        if (strokeColor) {
            ctx!.strokeStyle = strokeColor;
            ctx!.stroke();
        }
    }

    function drawLine(
        x1: number, 
        y1: number, 
        x2: number, 
        y2: number, 
        width: number, 
        offset: number, 
        color: string) {

        const rotation = Math.atan2(y2 - y1, x2 - x1);
        const offsetY = Math.cos(rotation) * offset;
        const offsetX = Math.sin(rotation) * offset;

        ctx!.beginPath();
        ctx!.moveTo(x1 + offsetX, y1 + offsetY);
        ctx!.lineTo(x2 + offsetX, y2 + offsetY);
        ctx!.strokeStyle = color;
        ctx!.lineWidth = width;
        ctx!.stroke();
    }

    const memberOffset = 4;

    function renderFrame() {
        if (!pointerCanvas || !ctx) {
            window.requestAnimationFrame(renderFrame);
            return;
        }
        ctx.clearRect(0, 0, pointerCanvas.width, pointerCanvas.height);
        for (const dot of pointerDots) {
            drawCircle(dot.x, dot.y, dotRadius, dot.color);
        }
        for (const pointer of Object.values(pointerList)) {
            for (const [index, member] of pointer.memberList.entries()) {
                const offset = (index * memberOffset)
                // console.log(member.color);
                drawCircle(pointer.x, pointer.y, 4 + offset, null, member.color);
            }
        }
        for (const gesture of Object.values(dragGesture)) {
            const numMembers = gesture.memberList.length;
            for (let i = 0; i < numMembers; i++) {
                const member = gesture.memberList[i];
                const offset = (i * memberOffset) - (numMembers * memberOffset / 2);
                drawLine(
                    gesture.startX, 
                    gesture.startY, 
                    gesture.currentX, 
                    gesture.currentY, 
                    2, 
                    offset, 
                    member.color);
            }
        }
        for (const marker of Object.values(pinchMarker)) {
            drawLine(marker.x0, marker.y0, marker.x1, marker.y1, 2, 0, "#AAAAAA");
        }
        window.requestAnimationFrame(renderFrame);
        // Remove dots that are older than 1 second
        const now = Date.now();
        pointerDots = pointerDots.filter(dot => now - dot.createdAt < dotFadeTime);
        // Adjust color to gradually fade out
        for (const dot of pointerDots) {
            dot.color = `rgba(0, 0, 0, ${1 - (now - dot.createdAt) / dotFadeTime})`;
        }

    }

    function attachEvents(area: AreaConfig) {
        if (!area.object) return;
        area.object.event.input.dragStart = (prop: dragStartProp) => {
            dragStart(prop, area.color, area.name);
        }
        area.object.event.input.drag = (prop: dragProp) => {
            drag(prop);
        }
        area.object.event.input.dragEnd = (prop: dragEndProp) => {
            dragEnd(prop);
        }
        area.object.event.input.pointerDown = (prop: pointerDownProp) => {
            pointerDown(prop, area.color, area.name);
        }
        area.object.event.input.pointerUp = (prop: pointerUpProp) => {
            pointerUp(prop);
        }
        area.object.event.input.pointerMove = (prop: pointerMoveProp) => {
            pointerMove(prop, area.color, area.name);
        }
    }

    onMount(() => {
        ctx = pointerCanvas?.getContext("2d") ?? null;
        handleResize = () => updateCanvasSize();
        handleResize();
        window.addEventListener("resize", handleResize);
        window.requestAnimationFrame(renderFrame);

        if (!engine) {
            console.warn("Engine not ready for Drag demo.");
            return;
        }

        const globalInputEngine = engine.global.getInputEngine(engine);
        if (globalInputEngine) {
            globalInputEngine.event.pointerDown = (prop: pointerDownProp) => {
                pointerDown(prop, "#000", "Global");
            };
            globalInputEngine.event.pointerUp = (prop: pointerUpProp) => {
                pointerUp(prop);
            };
            globalInputEngine.event.pointerMove = (prop: pointerMoveProp) => {
                pointerMove(prop, "#000", "Global");
            };
            globalInputEngine.event.dragStart = (prop: any) => {
                dragStart(prop, "#000", "Global");
            };
            globalInputEngine.event.drag = (prop: any) => {
                drag(prop);
            };
            globalInputEngine.event.dragEnd = (prop: any) => {
                dragEnd(prop);
            };
            globalInputEngine.event.pinchStart = (prop: pinchStartProp) => {
                pinchStart(prop);
            };
            globalInputEngine.event.pinch = (prop: pinchProp) => {
                pinch(prop);
            };
            globalInputEngine.event.pinchEnd = (prop: pinchEndProp) => {
                pinchEnd(prop);
            };
        }
            
        for (const area of areas) {
            if (!area.element) continue;
            area.object = new ElementObject(engine, null);
            area.object.element = area.element;
            attachEvents(area);
        }

        if (nestedArea.element) {
             const centerArea = areas.find(a => a.name === "Center");
             nestedArea.object = new ElementObject(engine, centerArea?.object || null);
             nestedArea.object.element = nestedArea.element;
             attachEvents(nestedArea);
        }
    
    });

    onDestroy(() => {
        if (handleResize) {
            window.removeEventListener("resize", handleResize);
        }
    });

    export function setDebug(enabled: boolean) {
        if (enabled) {
            canvasComponent?.enableDebug();
        } else {
            canvasComponent?.disableDebug();
        }
    }

   
</script>

<div class="drag-demo-wrapper" bind:this={canvasWrapper}>
    <Canvas
        id="drag-demo-canvas"
        bind:this={canvasComponent}
        bind:engine={engine}
    >
        <div class="drag-demo-surface">
            <canvas bind:this={pointerCanvas} class="overlay-canvas"></canvas>

            <div class="grid-container">
                {#each areas as area}
                    <div bind:this={area.element} class="pointer-area slot" style={area.style}>
                        <p>{area.name}</p>
                        {#if area.name === 'Center'}
                            <div 
                                bind:this={nestedArea.element} 
                                class="pointer-area card" 
                                style={nestedArea.style}
                            >
                                <p>{nestedArea.name}</p>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            {#each Object.values(pointerList) as pointer (pointer.pointerId)}
            <div style={`top: ${pointer.y}px; left: ${pointer.x}px;`} class="mouse-position-display">
               <ol>
                <li>
                    <p>Pointer ID: {pointer.pointerId}</p>
                    <p>X: {pointer.x}</p>
                    <p>Y: {pointer.y}</p>
                    <p>Member List: {pointer.memberList.map(member => member.name).join(", ")}</p>
                </li>
               </ol>
            </div>
            {/each}

            {#each Object.values(dragGesture) as gesture (gesture.pointerId)}
                <div style={`top: ${gesture.startY}px; left: ${gesture.startX}px;`} class="drag-pin card">
                    {#each gesture.memberList as member}
                        <div class="drag-pin-member" style={`background-color: ${member.color};`}>
                            <p>{gesture.pointerId} - {member.name}</p>
                        </div>
                    {/each}
                    <div class="drag-pin-body">
                        <p>Start: {gesture.startX}, {gesture.startY}</p>
                    </div>
                </div>
                {#if gesture.endX && gesture.endY}
                    <div style={`top: ${gesture.endY}px; left: ${gesture.endX}px;`} class="drag-pin card">
                        {#each gesture.memberList as member}
                            <div class="drag-pin-member" style={`background-color: ${member.color};`}>
                                <p>{gesture.pointerId} - {member.name}</p>
                            </div>
                        {/each}
                        <div class="drag-pin-body">
                            <p>End: {gesture.endX}, {gesture.endY}</p>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    </Canvas>
</div>



<style lang="scss">
    @import "../../../../app.scss";

     li {
        list-style-type: none;
    }

    p {
        line-height: 1;
        margin: 0;
        font-size: 12px;
        color: var(--color-text);
    }

    .drag-demo-wrapper {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 80vw;
        height: 80vh;
        transform: translate(-50%, -50%);
        overflow: hidden;
    }

    .drag-demo-surface {
        position: relative;
        width: 100%;
        height: 100%;
    }

    .overlay-canvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 100;
        pointer-events: none;
    }

    .grid-container {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        grid-template-rows: repeat(5, 1fr);
        gap: var(--size-16);
        padding: var(--size-16);
        box-sizing: border-box;
        pointer-events: none;
    }

    .pointer-area {
        position: relative;
        background-color: var(--color-background-tint);
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        
        p {
            pointer-events: none;
            user-select: none;
            position: absolute;
            top: var(--size-16);
            left: var(--size-16);
            opacity: 0.5;
        }
    }

    .mouse-position-display {
        position: absolute;
        pointer-events: none;
       
    }

    .dot {
        width:2px;
        height:2px;
        position: absolute;
        background-color: #989898;
        // border: 2px solid #000;
        border-radius: 1px;
        pointer-events: none;
    }

    .drag-pin {
    position: absolute;
        pointer-events: none;
        padding: 0;
        overflow: hidden;

        .drag-pin-member {
            padding: var(--size-4);
           
            p {
                font-size: 12px;
                color: #fff; 
            }
        }

        .drag-pin-body {
            padding: var(--size-4);
            p {
                font-size: 12px;
            }
        }
       
    }

    .pinch-marker {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        overflow: visible;

        line {
            stroke: #9a9a9a;
            stroke-width: 2;
        }
    }
</style>