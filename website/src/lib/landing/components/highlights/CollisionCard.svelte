<script lang="ts">
  import type { Action } from "svelte/action";
  import { Engine } from "@snap-engine/asset-base-svelte";
  import { CircleCollider, RectCollider } from "@snap-engine/core/collision";
  import type { Collider } from "@snap-engine/core/collision";
  import { ElementObject } from "@snap-engine/core";
  import type { Engine as EngineType } from "@snap-engine/core";
  import { debugState } from "$lib/landing/debugState.svelte";
  import collisionDotMatrix from "../../../../../static/generated/collision-detection-dot-matrix.json";

  type Dot = {
    x: number;
    y: number;
    key: string;
  };
  type CollisionDotMatrix = {
    columns: number;
    rows: number;
    dots: Array<{ x: number; y: number }>;
  };
  type TargetCollisionKind = "square" | "circle";

  const GENERATED_DOT_MATRIX = collisionDotMatrix as CollisionDotMatrix;
  const BOX_SIZE = 84;
  const CIRCLE_SIZE = 72;
  const DOT_DISPLACEMENT_MIN = 4;
  const DOT_DISPLACEMENT_MAX = 30;
  const DOT_DISPLACEMENT_POWER = 1.45;
  const DOT_SQUARE_CORNER_BONUS = 18;
  const DOT_DISPLACEMENT_MIN_OPACITY = 0.18;
  const ACTIVE_DISPLACEMENT_EPSILON = 0.01;
  const DESCRIPTION_DISPLACEMENT_MIN = 3;
  const DESCRIPTION_DISPLACEMENT_MAX = 22;
  const DESCRIPTION_DISPLACEMENT_POWER = 1.35;
  const DESCRIPTION_SQUARE_CORNER_BONUS = 12;
  const TARGET_COMBINED_COLOR = "#8f3dff";
  const DESCRIPTION_TEXT = "Built-in collision engine to detect overlaps and contacts.";
  const descriptionCharacters = Array.from(DESCRIPTION_TEXT).map((character, index) => ({
    character,
    key: `${character}-${index}`,
  }));
  const dots: Dot[] = GENERATED_DOT_MATRIX.dots.map((dot) => ({
    ...dot,
    key: `${dot.x}-${dot.y}`,
  }));

  let engine: EngineType | null = $state(null);
  let stageElement: HTMLDivElement | null = $state(null);
  let descriptionDisplacementUpdateQueued = false;
  const descriptionCharacterObjects = new WeakMap<HTMLElement, ElementObject>();
  const descriptionCharacterClassLists = new WeakMap<HTMLElement, string[]>();
  const gridColumns = GENERATED_DOT_MATRIX.columns;
  const gridRows = GENERATED_DOT_MATRIX.rows;

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  function getColliderElement(collider: Collider) {
    return (collider.parent as ElementObject).element;
  }

  function getCollisionTargetKind(collider: Collider): TargetCollisionKind | null {
    const element = getColliderElement(collider);
    if (element?.classList.contains("collision-target--square")) {
      return "square";
    }
    if (element?.classList.contains("collision-target--circle")) {
      return "circle";
    }
    return null;
  }

  function isCollisionTarget(collider: Collider) {
    return getCollisionTargetKind(collider) !== null;
  }

  function setObjectActiveClass(
    object: ElementObject | null | undefined,
    baseClassList: string[],
    isActive: boolean,
  ) {
    if (!object) {
      return;
    }

    const nextClassList = isActive
      ? Array.from(new Set([...baseClassList, "is-active"]))
      : baseClassList;
    object.classList = nextClassList;
    object.writeDom();
  }

  function rectsOverlap(a: DOMRect, b: DOMRect) {
    return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  }

  function getLayoutRect(element: HTMLElement) {
    const offsetParent = element.offsetParent as HTMLElement | null;
    if (!offsetParent) {
      return element.getBoundingClientRect();
    }

    const parentRect = offsetParent.getBoundingClientRect();
    return new DOMRect(
      parentRect.left + element.offsetLeft,
      parentRect.top + element.offsetTop,
      element.offsetWidth,
      element.offsetHeight,
    );
  }

  function getTargetElementKind(element: HTMLElement): TargetCollisionKind | null {
    if (element.classList.contains("collision-target--square")) {
      return "square";
    }
    if (element.classList.contains("collision-target--circle")) {
      return "circle";
    }
    return null;
  }

  function getDescriptionSquareCornerBonus(
    textCenter: { x: number; y: number },
    targetCenter: { x: number; y: number },
    targetRect: DOMRect,
    direction: { x: number; y: number },
  ) {
    const halfWidth = targetRect.width / 2;
    const halfHeight = targetRect.height / 2;
    const minHalfSize = Math.min(halfWidth, halfHeight);
    const absDirectionX = Math.abs(direction.x);
    const absDirectionY = Math.abs(direction.y);
    const rayBoundaryDistance = Math.min(
      absDirectionX > 0.001 ? halfWidth / absDirectionX : Number.POSITIVE_INFINITY,
      absDirectionY > 0.001 ? halfHeight / absDirectionY : Number.POSITIVE_INFINITY,
    );
    const angleBoost = clamp(rayBoundaryDistance / minHalfSize, 1, Math.SQRT2);
    const localX = clamp(Math.abs(textCenter.x - targetCenter.x) / halfWidth, 0, 1);
    const localY = clamp(Math.abs(textCenter.y - targetCenter.y) / halfHeight, 0, 1);
    const cornerCloseness = Math.sqrt(localX * localY);
    const normalizedAngleBoost = clamp((angleBoost - 1) / (Math.SQRT2 - 1), 0, 1);

    return cornerCloseness * normalizedAngleBoost * DESCRIPTION_SQUARE_CORNER_BONUS;
  }

  function updateDescriptionTextDisplacements() {
    if (!stageElement) {
      return;
    }

    const characters = Array.from(
      stageElement.querySelectorAll<HTMLElement>(".collision-description-character"),
    );
    const targets = Array.from(stageElement.querySelectorAll<HTMLElement>(".collision-target"));

    for (const character of characters) {
      const textRect = getLayoutRect(character);
      const textCenter = {
        x: textRect.left + textRect.width / 2,
        y: textRect.top + textRect.height / 2,
      };
      let displacementX = 0;
      let displacementY = 0;

      for (const target of targets) {
        const targetKind = getTargetElementKind(target);
        if (!targetKind) {
          continue;
        }

        const targetRect = target.getBoundingClientRect();
        if (!rectsOverlap(textRect, targetRect)) {
          continue;
        }

        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        };
        const awayX = textCenter.x - targetCenter.x;
        const awayY = textCenter.y - targetCenter.y;
        const distance = Math.hypot(awayX, awayY);
        const direction =
          distance > 0.001
            ? { x: awayX / distance, y: awayY / distance }
            : { x: 1, y: 0 };
        const influenceRadius = Math.max(targetRect.width, targetRect.height) * 0.8;
        const closeness = clamp(1 - distance / influenceRadius, 0, 1);
        const distanceFactor = Math.pow(closeness, DESCRIPTION_DISPLACEMENT_POWER);
        const displacement =
          DESCRIPTION_DISPLACEMENT_MIN +
          distanceFactor * (DESCRIPTION_DISPLACEMENT_MAX - DESCRIPTION_DISPLACEMENT_MIN) +
          (targetKind === "square"
            ? getDescriptionSquareCornerBonus(textCenter, targetCenter, targetRect, direction)
            : 0);
        const cappedDisplacement = Math.min(displacement, DESCRIPTION_DISPLACEMENT_MAX);

        displacementX += direction.x * cappedDisplacement;
        displacementY += direction.y * cappedDisplacement;
      }

      const displacementLength = Math.hypot(displacementX, displacementY);
      if (displacementLength > DESCRIPTION_DISPLACEMENT_MAX) {
        const clampFactor = DESCRIPTION_DISPLACEMENT_MAX / displacementLength;
        displacementX *= clampFactor;
        displacementY *= clampFactor;
      }

      const isActive = displacementLength > ACTIVE_DISPLACEMENT_EPSILON;
      const characterObject = descriptionCharacterObjects.get(character);
      const baseClassList =
        descriptionCharacterClassLists.get(character) ?? ["collision-description-character"];
      characterObject?.schedule(
        () => {
          setObjectActiveClass(characterObject, baseClassList, isActive);
          character.style.transform = isActive
            ? `translate(${displacementX.toFixed(2)}px, ${displacementY.toFixed(2)}px)`
            : "";
        },
        { stage: "WRITE_2", queueId: "description-character-displacement" },
      );
    }
  }

  function scheduleDescriptionDisplacementUpdate() {
    if (descriptionDisplacementUpdateQueued || typeof requestAnimationFrame === "undefined") {
      return;
    }

    descriptionDisplacementUpdateQueued = true;
    requestAnimationFrame(() => {
      descriptionDisplacementUpdateQueued = false;
      updateDescriptionTextDisplacements();
    });
  }

  const stageRef: Action<HTMLDivElement> = (node) => {
    stageElement = node;
    scheduleDescriptionDisplacementUpdate();

    return {
      destroy() {
        if (stageElement === node) {
          stageElement = null;
        }
      },
    };
  };

  const circleColliderRef: Action<
    HTMLDivElement,
    { engine: EngineType | null }
  > = (
    node,
    params,
  ) => {
    let object: ElementObject | null = null;
    let collider: CircleCollider | null = null;
    const baseClassList = Array.from(node.classList);
    const activeTargetCollisions = new Set<Collider>();
    const previousTargetCenters = new Map<symbol, { x: number; y: number }>();

    function getDotCenter() {
      const offsetParent = node.offsetParent as HTMLElement | null;
      if (!offsetParent) {
        const rect = node.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      const parentRect = offsetParent.getBoundingClientRect();
      return {
        x: parentRect.left + node.offsetLeft + node.offsetWidth / 2,
        y: parentRect.top + node.offsetTop + node.offsetHeight / 2,
      };
    }

    function getFallbackDirection(targetCenter: { x: number; y: number }, target: Collider) {
      const previousCenter = previousTargetCenters.get(target.id);
      const motionX = previousCenter ? targetCenter.x - previousCenter.x : 0;
      const motionY = previousCenter ? targetCenter.y - previousCenter.y : 0;
      const motionDistance = Math.hypot(motionX, motionY);
      if (motionDistance > 0.001) {
        return { x: motionX / motionDistance, y: motionY / motionDistance };
      }

      const offsetParent = node.offsetParent as HTMLElement | null;
      if (offsetParent) {
        const parentX = node.offsetLeft - offsetParent.clientWidth / 2;
        const parentY = node.offsetTop - offsetParent.clientHeight / 2;
        const parentDistance = Math.hypot(parentX, parentY);
        if (parentDistance > 0.001) {
          return { x: parentX / parentDistance, y: parentY / parentDistance };
        }
      }

      return { x: 1, y: 0 };
    }

    function setDotDisplacement(x: number, y: number) {
      object?.schedule(
        () => {
          const displacementLength = Math.hypot(x, y);
          const isActive = displacementLength > ACTIVE_DISPLACEMENT_EPSILON;
          setObjectActiveClass(object, baseClassList, isActive);
          if (isActive) {
            const displacementProgress = clamp(displacementLength / DOT_DISPLACEMENT_MAX, 0, 1);
            const opacity =
              1 - displacementProgress * (1 - DOT_DISPLACEMENT_MIN_OPACITY);
            node.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
            node.style.opacity = opacity.toFixed(2);
          } else {
            node.style.transform = "";
            node.style.opacity = "";
          }
        },
        { stage: "WRITE_2", queueId: "dot-displacement" },
      );
    }

    function getSquareCornerBonus(
      dotCenter: { x: number; y: number },
      targetCenter: { x: number; y: number },
      targetRect: DOMRect,
      direction: { x: number; y: number },
    ) {
      const halfWidth = targetRect.width / 2;
      const halfHeight = targetRect.height / 2;
      const minHalfSize = Math.min(halfWidth, halfHeight);
      const absDirectionX = Math.abs(direction.x);
      const absDirectionY = Math.abs(direction.y);
      const rayBoundaryDistance = Math.min(
        absDirectionX > 0.001 ? halfWidth / absDirectionX : Number.POSITIVE_INFINITY,
        absDirectionY > 0.001 ? halfHeight / absDirectionY : Number.POSITIVE_INFINITY,
      );
      const angleBoost = clamp(rayBoundaryDistance / minHalfSize, 1, Math.SQRT2);
      const localX = clamp(Math.abs(dotCenter.x - targetCenter.x) / halfWidth, 0, 1);
      const localY = clamp(Math.abs(dotCenter.y - targetCenter.y) / halfHeight, 0, 1);
      const cornerCloseness = Math.sqrt(localX * localY);
      const normalizedAngleBoost = clamp((angleBoost - 1) / (Math.SQRT2 - 1), 0, 1);

      return cornerCloseness * normalizedAngleBoost * DOT_SQUARE_CORNER_BONUS;
    }

    function updateDotState() {
      if (activeTargetCollisions.size === 0) {
        setDotDisplacement(0, 0);
        return;
      }

      const dotCenter = getDotCenter();
      let displacementX = 0;
      let displacementY = 0;

      for (const target of activeTargetCollisions) {
        const element = getColliderElement(target);
        if (!element) {
          continue;
        }

        const targetKind = getCollisionTargetKind(target);
        const targetRect = element.getBoundingClientRect();
        const targetCenter = {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
        };
        const awayX = dotCenter.x - targetCenter.x;
        const awayY = dotCenter.y - targetCenter.y;
        const distance = Math.hypot(awayX, awayY);
        const direction =
          distance > 0.001
            ? { x: awayX / distance, y: awayY / distance }
            : getFallbackDirection(targetCenter, target);
        const influenceRadius = Math.max(targetRect.width, targetRect.height) * 0.7;
        const closeness = clamp(1 - distance / influenceRadius, 0, 1);
        const distanceFactor = Math.pow(closeness, DOT_DISPLACEMENT_POWER);
        const displacement =
          DOT_DISPLACEMENT_MIN +
          distanceFactor * (DOT_DISPLACEMENT_MAX - DOT_DISPLACEMENT_MIN) +
          (targetKind === "square"
            ? getSquareCornerBonus(dotCenter, targetCenter, targetRect, direction)
            : 0);

        const cappedDisplacement = Math.min(displacement, DOT_DISPLACEMENT_MAX);
        displacementX += direction.x * cappedDisplacement;
        displacementY += direction.y * cappedDisplacement;
        previousTargetCenters.set(target.id, targetCenter);
      }

      const displacementLength = Math.hypot(displacementX, displacementY);
      if (displacementLength > DOT_DISPLACEMENT_MAX) {
        const clampFactor = DOT_DISPLACEMENT_MAX / displacementLength;
        displacementX *= clampFactor;
        displacementY *= clampFactor;
      }

      setDotDisplacement(displacementX, displacementY);
    }

    function detach() {
      if (collider) {
        engine?.collisionEngine?.removeObject(collider.id);
      }
      object?.destroy();
      activeTargetCollisions.clear();
      previousTargetCenters.clear();
      collider = null;
      object = null;
    }

    function attach(currentEngine: EngineType | null) {
      if (!currentEngine || object) {
        return;
      }

      object = new ElementObject(currentEngine, null);
      object.element = node;
      object.classList = baseClassList;
      object.schedule(() => {
        object?.readDom({ unapplyTransform: false });
        object?.saveDomProperety("READ_1");
      }, { stage: "READ_1", queueId: "collision-dot-read" });
      const radius = node.getBoundingClientRect().width / 2;
      collider = new CircleCollider(currentEngine, object, radius, radius, radius);
      object.addCollider(collider);

      collider.event.collider.onBeginContact = (_, other) => {
        const targetKind = getCollisionTargetKind(other);
        if (!targetKind) {
          return;
        }

        activeTargetCollisions.add(other);
        updateDotState();
      };

      collider.event.collider.onCollide = (_, other) => {
        if (!isCollisionTarget(other)) {
          return;
        }

        activeTargetCollisions.add(other);
        updateDotState();
      };

      collider.event.collider.onEndContact = (_, other) => {
        if (!isCollisionTarget(other)) {
          return;
        }

        activeTargetCollisions.delete(other);
        previousTargetCenters.delete(other.id);
        updateDotState();
      };
    }

    attach(params.engine);

    return {
      update(nextParams) {
        attach(nextParams.engine);
      },
      destroy() {
        detach();
      },
    };
  };

  const collisionTargetRef: Action<
    HTMLDivElement,
    {
      engine: EngineType | null;
      size: number;
      shape: "rect" | "circle";
    }
  > = (node, params) => {
    let object: ElementObject | null = null;
    let collider: RectCollider | CircleCollider | null = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    const activeTargetContacts = new Set<symbol>();

    function moveTo(x: number, y: number) {
      if (!object) {
        return;
      }

      object.worldTransform = { x, y };
      object.schedule(() => object?.writeTransform(), {
        stage: "WRITE_1",
        queueId: `${object.id}-transform`,
      });
      scheduleDescriptionDisplacementUpdate();
    }

    function attach(currentEngine: EngineType | null) {
      if (!currentEngine || object) {
        return;
      }

      object = new ElementObject(currentEngine, null);
      object.transformMode = "relative";
      object.element = node;
      object.schedule(() => {
        object?.readDom({ unapplyTransform: false });
        object?.saveDomProperety("READ_1");
      }, { stage: "READ_1", queueId: "collision-target-read" });

      collider =
        params.shape === "circle"
          ? new CircleCollider(
              currentEngine,
              object,
              params.size / 2,
              params.size / 2,
              params.size / 2,
            )
          : new RectCollider(currentEngine, object, 0, 0, params.size, params.size);
      object.addCollider(collider);
      collider.event.collider.onBeginContact = (_, other) => {
        if (!isCollisionTarget(other)) {
          return;
        }

        activeTargetContacts.add(other.id);
        node.style.color = TARGET_COMBINED_COLOR;
      };
      collider.event.collider.onEndContact = (_, other) => {
        if (!isCollisionTarget(other)) {
          return;
        }

        activeTargetContacts.delete(other.id);
        if (activeTargetContacts.size === 0) {
          node.style.color = "";
        }
      };
      object.event.input.dragStart = (prop) => {
        if (!object) {
          return;
        }

        object.global.data.allowCameraControl = false;
        isDragging = true;
        dragStartX = object.worldTransform.x;
        dragStartY = object.worldTransform.y;
      };

      object.event.input.drag = (prop) => {
        if (!object) {
          return;
        }

        moveTo(dragStartX + prop.delta.x, dragStartY + prop.delta.y);
      };

      object.event.input.dragEnd = () => {
        if (object) {
          object.global.data.allowCameraControl = true;
        }

        isDragging = false;
      };
    }

    attach(params.engine);

    return {
      update(nextParams) {
        attach(nextParams.engine);
      },
      destroy() {
        if (collider) {
          engine?.collisionEngine?.removeObject(collider.id);
        }
        object?.destroy();
        collider = null;
        object = null;
      },
    };
  };

  const descriptionCharacterRef: Action<HTMLSpanElement, { engine: EngineType | null }> = (
    node,
    params,
  ) => {
    let object: ElementObject | null = null;
    const baseClassList = Array.from(node.classList);
    descriptionCharacterClassLists.set(node, baseClassList);

    function attach(currentEngine: EngineType | null) {
      if (!currentEngine || object) {
        return;
      }

      object = new ElementObject(currentEngine, null);
      object.element = node;
      object.classList = baseClassList;
      descriptionCharacterObjects.set(node, object);
    }

    attach(params.engine);

    return {
      update(nextParams) {
        attach(nextParams.engine);
      },
      destroy() {
        descriptionCharacterObjects.delete(node);
        object?.destroy();
        object = null;
      },
    };
  };

</script>

<article class="collision-card theme-secondary-1">
  <h3 class="sr-only">Collision Detection</h3>

  <Engine id="collision-card-canvas" bind:engine debug={debugState.enabled}>
    <div class="collision-stage" use:stageRef>
      <div class="collision-content">
        <div
          class="dot-title"
          style={`--dot-columns: ${gridColumns}; --dot-rows: ${gridRows};`}
          aria-hidden="true"
        >
          {#each dots as dot (dot.key)}
            <div
              class="dot-cell"
              style={`grid-column: ${dot.x + 1}; grid-row: ${dot.y + 1};`}
              use:circleColliderRef={{ engine }}
            ></div>
          {/each}
        </div>

        <p class="collision-description">
          {#each descriptionCharacters as segment (segment.key)}
            <span class="collision-description-character" use:descriptionCharacterRef={{ engine }}>
              {segment.character}
            </span>
          {/each}
        </p>
      </div>

      {#if dots.length > 0}
        <div
          class="collision-target collision-target--square"
          style={`width: ${BOX_SIZE}px; height: ${BOX_SIZE}px;`}
          use:collisionTargetRef={{
            engine,
            size: BOX_SIZE,
            shape: "rect",
          }}
          aria-label="Drag collision box"
        >
          <span class="collision-target-handle card card-round">
            <span class="material-symbols-rounded" aria-hidden="true">open_with</span>
          </span>
        </div>

        <div
          class="collision-target collision-target--circle"
          style={`width: ${CIRCLE_SIZE}px; height: ${CIRCLE_SIZE}px;`}
          use:collisionTargetRef={{
            engine,
            size: CIRCLE_SIZE,
            shape: "circle",
          }}
          aria-label="Drag collision circle"
        >
          <span class="collision-target-handle card card-round">
            <span class="material-symbols-rounded" aria-hidden="true">open_with</span>
          </span>
        </div>
      {/if}
    </div>
  </Engine>
</article>

<style lang="scss">
  .collision-card {
    --card-padding: var(--size-48);
    --card-top-padding: var(--card-padding);
    --dot-gap: 0px;
    --title-description-gap: 36px;
    min-height: 520px;
    height: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    padding: 0;
    background-color: var(--color-background-tint);
    border-radius: var(--ui-radius);
    overflow: hidden;
    text-align: center;

    :global(#snap-canvas) {
      width: 100%;
      height: auto !important;
      min-height: inherit;
      flex: 1 1 auto;
    }

    @media (max-width: 720px) {
      --card-padding: var(--size-24);
      --card-top-padding: var(--highlight-card-mobile-top-padding);
      --title-description-gap: 30px;
      padding-block: var(--card-top-padding) 0;
      grid-column: span 2;
    }
  }

  .collision-stage {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: inherit;
    overflow: hidden;
  }

  .collision-content {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--title-description-gap);
    pointer-events: none;
  }

  .dot-title {
    width: min(75%, calc(100% - var(--size-32) * 2));
    aspect-ratio: var(--dot-columns) / var(--dot-rows);
    display: grid;
    grid-template-columns: repeat(var(--dot-columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--dot-rows), minmax(0, 1fr));
    gap: var(--dot-gap);
  }

  .dot-cell {
    align-self: center;
    justify-self: center;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    background: #000000;
    transform-origin: center;
  }

  .dot-cell.is-active {
    transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform, opacity, background-color;
  }

  .collision-description {
    width: min(26rem, calc(100% - var(--size-48)));
    margin: 0;
    color: #000000;
    font-size: var(--font-size-16);
    line-height: 1.35;
    text-align: center;
    white-space: normal;
  }

  .collision-description-character {
    display: inline-block;
    transform-origin: center;
    white-space: pre;
  }

  .collision-description-character.is-active {
    transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform;
  }

  .collision-target {
    position: absolute;
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: 0;
    border: 0;
    background: rgba(0, 0, 0, 0.035);
    box-shadow: none;
    color: #34383a;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .collision-target--square {
    left: 18%;
    top: 58%;
  }

  .collision-target:active {
    cursor: grabbing;
  }

  .collision-target--circle {
    right: 18%;
    top: 29%;
    border-radius: 50%;
  }

  .collision-target-handle {
    --ui-radius: var(--size-12);
    display: grid;
    place-items: center;
    box-sizing: border-box;
    padding: 6px;
    width: var(--size-32);
    aspect-ratio: 1 / 1;
    min-width: var(--size-32);
    min-height: var(--size-32);
    border-radius: var(--size-12) !important;
  }

  .collision-target .material-symbols-rounded {
    font-family: "Material Symbols Rounded";
    font-size: var(--size-16);
    font-variation-settings: "FILL" 0, "wght" 500, "GRAD" 0, "opsz" 24;
    line-height: 1;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
