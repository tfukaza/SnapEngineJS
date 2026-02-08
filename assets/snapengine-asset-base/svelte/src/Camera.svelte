<script lang="ts">
  import { onMount, getContext, setContext } from "svelte";
  import { CameraControl as CameraControlObject } from "@snapengine-asset-base/core";
  import type { Engine } from "snap-engine";

  let {
    children,
    zoomLock,
    panLock,
    cameraControl = $bindable<CameraControlObject | null>(null),
  }: {
    children: any;
    zoomLock?: boolean;
    panLock?: boolean;
    cameraControl?: CameraControlObject | null;
  } = $props();

  let cameraControlElement: HTMLDivElement | null = null;
  const engine: Engine = getContext("engine");
  const cameraControlInstance = new CameraControlObject(engine, {
    zoomLock: zoomLock ?? false,
    panLock: panLock ?? false,
  });

  cameraControl = cameraControlInstance;
  setContext("cameraControl", cameraControlInstance);

  onMount(() => {
    cameraControlInstance.element = cameraControlElement as HTMLElement;
  });
</script>

<div id="snap-camera-control" bind:this={cameraControlElement}>
  {@render children()}
</div>

<style lang="scss">
  #snap-camera-control {
    width: 100%;
    height: 100%;
    background-color: #fff;
    user-select: none;
  }
</style>
