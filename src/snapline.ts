import Camera from "./camera";
import { GlobalManager } from "./global";
import { BaseObject, ElementObject, frameStats, queueEntry } from "./object";
import { EventProxyFactory } from "./util";
import { CollisionEngine } from "./collision";
import { AnimationInterface } from "./animation";
import type { DebugRenderer } from "./debug";

export interface EngineConfig {}

export interface engineCallback {
  containerElementAssigned: ((containerElement: HTMLElement) => void) | null;
}

type AnimationProcessor = (timestamp: number) => void;

/**
 * The main engine class that manages the rendering loop, object updates,
 * and optional features like animations, collisions, camera controls, and debugging.
 *
 * The engine uses a multi-stage render pipeline (READ_1, WRITE_1, READ_2, WRITE_2, READ_3, WRITE_3)
 * to minimize DOM reflows and maximize performance.
 *
 * Multiple Engine instances can coexist, each managing their own canvas and render pipeline
 * while sharing a global GlobalManager singleton for ID generation and global input.
 *
 * Features can be enabled on-demand to keep bundle sizes small:
 * - Animation engine via `enableAnimationEngine()`
 * - Collision detection via `enableCollisionEngine()`
 * - Camera controls via `enableCameraControl()`
 * - Debug visualization via `enableDebug()`
 *
 * @example
 * ```typescript
 * const engine = new Engine();
 * engine.assignDom(document.getElementById('container'));
 * await engine.enableAnimationEngine();
 * await engine.enableDebug();
 * ```
 *
 * @example
 * ```typescript
 * // Multiple engines sharing the same GlobalManager
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine();
 * ```
 */
class Engine {
  engineConfig: EngineConfig;
  #containerStyle: { [key: string]: string } = {};
  global: GlobalManager;

  // Engine-specific properties
  containerElement: HTMLElement | null = null;
  cursor: {
    worldX: number;
    worldY: number;
    cameraX: number;
    cameraY: number;
    screenX: number;
    screenY: number;
  };
  camera: Camera | null = null;
  collisionEngine: CollisionEngine | null = null;

  animationList: AnimationInterface[] = [];
  debugMarkerList: Record<
    string,
    {
      type: "point" | "rect" | "circle" | "text";
      gid: string;
      id: string;
      persistent: boolean;
      color: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      radius?: number;
      text?: string;
    }
  > = {};

  _event: engineCallback;
  event: engineCallback;
  #resizeObserver: ResizeObserver | null = null;
  #animationProcessor: AnimationProcessor | null = null;
  #debugRenderer: DebugRenderer | null = null;

  constructor(config: EngineConfig = {}) {
    this.global = GlobalManager.getInstance();
    this.global.registerEngine(this);

    this.cursor = {
      worldX: 0,
      worldY: 0,
      cameraX: 0,
      cameraY: 0,
      screenX: 0,
      screenY: 0,
    };

    let defaultConfig: EngineConfig = {
      cameraConfig: {
        enableZoom: true,
        enablePan: true,
        panBounds: { top: null, left: null, right: null, bottom: null },
      },
    };
    this.engineConfig = {
      ...defaultConfig,
      ...config,
    };

    this.#containerStyle = {
      position: "relative",
      overflow: "hidden",
    };

    this._event = {
      containerElementAssigned: null,
    };
    this.event = EventProxyFactory(this, this._event);

    this.#resizeObserver = new ResizeObserver(() => {
      if (this.#debugRenderer) {
        let containerRect = this.containerElement!.getBoundingClientRect();
        this.#debugRenderer.updateSize(
          containerRect.width,
          containerRect.height,
        );
      }
    });
  }

  /**
   * Enables debug visualization overlay showing object bounding boxes, collision shapes,
   * coordinate grid, and debug markers.
   *
   * The debug overlay is rendered on a canvas element positioned absolutely over the container.
   * This method dynamically imports the debug module to keep it tree-shakeable.
   *
   * @returns A promise that resolves when the debug renderer is initialized
   *
   * @example
   * ```typescript
   * await engine.enableDebug();
   * // Now debug overlays will be visible
   * ```
   */
  async enableDebug() {
    if (this.containerElement == null) {
      return;
    }
    if (this.#debugRenderer) {
      return; // Already enabled
    }
    const { DebugRendererImpl } = await import("./debug");
    this.#debugRenderer = new DebugRendererImpl();
    this.#debugRenderer.enable(this.containerElement);
  }

  /**
   * Enables interactive camera controls for panning and zooming.
   *
   * This method dynamically imports the CameraControl module to keep it tree-shakeable.
   * Camera controls use middle mouse button for panning and scroll wheel for zooming.
   *
   * @param zoom - Whether to enable zoom controls (default: true)
   * @param pan - Whether to enable pan controls (default: true)
   * @returns A promise that resolves with the CameraControl instance
   *
   * @example
   * ```typescript
   * const controls = await engine.enableCameraControl(true, true);
   * controls.setCameraCenterPosition(100, 100);
   * ```
   */
  async enableCameraControl(zoom: boolean = true, pan: boolean = true) {
    const { CameraControl } = await import("./asset/cameraControl");
    const cameraControl = new CameraControl(this, zoom, pan);
    if (this.containerElement) {
      cameraControl.element = this.containerElement;
    }
    return cameraControl;
  }

  /**
   * Disables and removes the debug visualization overlay.
   */
  disableDebug() {
    if (this.#debugRenderer) {
      this.#debugRenderer.disable();
      this.#debugRenderer = null;
    }
  }

  /**
   * Initialize global stats, dom elements, and event listeners for the library.
   * @param containerDom: The element that contains all other elements.
   */
  assignDom(containerDom: HTMLElement) {
    this.containerElement = containerDom;
    this.camera = new Camera(containerDom);
    this.event.containerElementAssigned?.(containerDom);
    this.#resizeObserver?.observe(containerDom);
    // Note: Render loop is managed globally by GlobalManager
  }

  #processQueue(stage: string, queue: Record<string, Map<string, queueEntry>>) {
    // Keep a set of all objects that have been processed
    let processedObjects: Set<BaseObject> = new Set();
    for (const queueEntry of Object.values(queue)) {
      for (const objectEntry of queueEntry.values()) {
        if (!objectEntry.callback) {
          continue;
        }
        for (const callback of objectEntry.callback) {
          callback();
        }
        if (!processedObjects.has(objectEntry.object)) {
          processedObjects.add(objectEntry.object);
          if (objectEntry.object instanceof ElementObject) {
            if (stage == "READ_1") {
              objectEntry.object.callback.afterRead1?.();
            } else if (stage == "READ_2") {
              objectEntry.object.callback.afterRead2?.();
            } else if (stage == "READ_3") {
              objectEntry.object.callback.afterRead3?.();
            } else if (stage == "WRITE_1") {
              objectEntry.object.callback.afterWrite1?.();
            } else if (stage == "WRITE_2") {
              objectEntry.object.callback.afterWrite2?.();
            } else if (stage == "WRITE_3") {
              objectEntry.object.callback.afterWrite3?.();
            }
          }
        }
      }
    }
  }

  /**
   * Internal method to process a single render stage.
   * Called by GlobalManager's render loop.
   * @internal
   */
  _processStage(
    stage: string,
    queue: Record<string, Map<string, queueEntry>>,
    _timestamp: number,
  ): void {
    this.#processQueue(stage, queue);
  }

  /**
   * Internal method to process animations.
   * Called by GlobalManager's render loop between WRITE_2 and READ_3.
   * @internal
   */
  _processAnimations(timestamp: number): void {
    this.#animationProcessor?.(timestamp);
  }

  /**
   * Internal method to process post-render tasks (collisions, debug).
   * Called by GlobalManager's render loop after all stages complete.
   * @internal
   */
  _processPostRender(timestamp: number): void {
    this.collisionEngine?.detectCollisions();

    const stats: frameStats = { timestamp };
    this.#debugRenderer?.renderFrame(stats, this, this.global.objectTable);
  }

  /**
   * Enables the collision detection engine.
   *
   * Once enabled, collision detection runs automatically during each render frame.
   * Objects can add colliders via `object.addCollider()`.
   *
   * @example
   * ```typescript
   * engine.enableCollisionEngine();
   * const collider = new CircleCollider(engine, object, 50);
   * object.addCollider(collider);
   * ```
   */
  enableCollisionEngine() {
    if (this.collisionEngine) {
      return;
    }
    this.collisionEngine = new CollisionEngine();
  }

  /**
   * Enables the animation engine for processing Web Animations API animations.
   *
   * This method dynamically sets up the animation processor that runs during each frame.
   * Animations can be added to objects via `object.addAnimation()`.
   *
   * @returns A promise that resolves when the animation engine is initialized
   *
   * @example
   * ```typescript
   * await engine.enableAnimationEngine();
   * const animation = new AnimationObject(element, { x: [0, 100] }, { duration: 1000 });
   * object.addAnimation(animation);
   * ```
   */
  async enableAnimationEngine() {
    if (this.#animationProcessor) {
      return;
    }

    this.#animationProcessor = (timestamp: number) => {
      let newAnimationList: AnimationInterface[] = [];
      for (const animation of this.animationList) {
        if (
          (animation as any).calculateFrame(timestamp) == false &&
          (animation as any).requestDelete == false
        ) {
          newAnimationList.push(animation as any);
        }
      }
      this.animationList = newAnimationList;
    };
  }

  /**
   * Destroys this Engine instance, cleaning up resources and unregistering from GlobalManager.
   *
   * This stops the render loop, removes event listeners, and ensures the engine
   * no longer participates in global rendering.
   *
   * @example
   * ```typescript
   * const engine = new Engine();
   * // ... use engine ...
   * engine.destroy(); // Clean up when done
   * ```
   */
  destroy() {
    // Unregister from global manager
    this.global.unregisterEngine(this);

    // Clean up resize observer
    if (this.#resizeObserver && this.containerElement) {
      this.#resizeObserver.unobserve(this.containerElement);
      this.#resizeObserver = null;
    }

    // Disable debug renderer
    if (this.#debugRenderer) {
      this.disableDebug();
    }

    // Clear references
    this.containerElement = null;
    this.camera = null;
    this.collisionEngine = null;
    this.animationList = [];
    this.debugMarkerList = {};
    this.#animationProcessor = null;
  }
}

export { Engine };
