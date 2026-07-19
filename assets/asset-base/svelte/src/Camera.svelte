<script lang="ts">
  import {
    getContext,
    onDestroy,
    onMount,
    setContext,
    type Snippet,
    untrack,
  } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import { CameraControl as CameraControlObject } from "@snap-engine/asset-base";
  import type { Engine } from "@snap-engine/core";

  type CameraProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
    children: Snippet;
    className?: string;
    zoomLock?: boolean;
    panLock?: boolean;
    cameraControl?: CameraControlObject | null;
  };

  let {
    children,
    class: classValue = "",
    className = "",
    id = "snap-camera-control",
    zoomLock = false,
    panLock = false,
    cameraControl = $bindable<CameraControlObject | null>(null),
    style = "",
    ...divProps
  }: CameraProps = $props();

  const engine: Engine | null = getContext("engine");
  if (!engine) {
    throw new Error("SnapEngine Svelte camera consumers must be rendered inside <Engine>.");
  }

  const ownsCameraControl = cameraControl == null;
  const initialLocks = untrack(() => ({ panLock, zoomLock }));
  const cameraControlInstance =
    cameraControl ?? new CameraControlObject(engine, initialLocks);
  if (cameraControlInstance.engine !== engine) {
    throw new Error("The injected CameraControl belongs to another Engine.");
  }
  cameraControl = cameraControlInstance;
  setContext("cameraControl", cameraControlInstance);

  let cameraControlElement: HTMLDivElement | null = null;
  const mergedClass = $derived(`${classValue} ${className}`.trim());
  const mergedStyle = $derived(
    `background-color:#fff;height:100%;transform-origin:0 0;user-select:none;width:100%;${style ?? ""}`,
  );

  $effect(() => {
    cameraControlInstance.config = {
      ...cameraControlInstance.config,
      panLock,
      zoomLock,
    };
  });

  onMount(() => {
    if (cameraControlElement) {
      cameraControlInstance.element = cameraControlElement;
    }
  });

  onDestroy(() => {
    if (!ownsCameraControl) return;
    if (engine.camera === cameraControlInstance.camera) {
      engine.unsubscribeEvent("containerResized", "camera");
      engine.unsubscribeEvent("containerMoved", "camera");
      engine.camera = null;
    }
    cameraControlInstance.destroy(false);
  });
</script>

<div
  {...divProps}
  {id}
  class={mergedClass || undefined}
  bind:this={cameraControlElement}
  style={mergedStyle}
>
  {@render children()}
</div>
