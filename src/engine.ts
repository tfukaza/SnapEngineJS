import {StationaryCamera} from "./camera";
import type { Camera } from "./camera";
import { GlobalManager } from "./global";
import {
  BaseObject,
  ElementObject,
  frameStats,
  queueEntry,
  detachAnimationFromOwner,
} from "./object";
import type { CollisionEngine } from "./collision";
import type { AnimationInterface } from "./animation";
import type { DebugRenderer } from "./debug";
import type { CameraControl } from "./asset/cameraControl";

export interface EngineConfig {}

const DEFAULT_ENGINE_CONFIG: EngineConfig = {
};

/**
 * Available engine event types that can be subscribed to.
 */
export type EngineEventType = 'containerAssigned' | 'containerResized' | 'containerMoved';

type AnimationProcessor = (timestamp: number) => void;

/**
 * The main engine class that manages the rendering loop, object updates,
 * and optional features like animations, collisions, camera controls, and debugging.
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

  engineConfig: EngineConfig; // Engine configuration options
  global: GlobalManager | null = null; // Reference to the global manager

  containerElement: HTMLElement | null = null; // The DOM element for the engine's container.
  camera: Camera | null = null; // Optional camera instance
  collisionEngine: CollisionEngine | null = null; // Optional collision engine instance
  animationList: AnimationInterface[] = []; // List of active animations, if animation engine is enabled  
  #animationProcessor: AnimationProcessor | null = null;
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
  > = {}; // Debug markers by ID
  #debugRenderer: DebugRenderer | null = null;

  // Event subscribers - allows multiple listeners per event type
  #eventSubscribers: Record<EngineEventType, Record<string, (element: HTMLElement) => void>> = {
    containerAssigned: {},
    containerResized: {},
    containerMoved: {},
  };

  #resizeObserver: ResizeObserver | null = null;


  constructor(config: EngineConfig = {}) {
    this.global = GlobalManager.getInstance();
    this.global.registerEngine(this);
    this.engineConfig = {
      ...DEFAULT_ENGINE_CONFIG,
      ...config,
    };
  }

  /**
   * Subscribe to an engine event with a unique identifier.
   * Multiple subscribers can listen to the same event.
   * 
   * @param event - The event type to subscribe to
   * @param id - A unique identifier for this subscription (used for unsubscribing)
   * @param callback - The callback function to invoke when the event fires
   * 
   * @example
   * ```typescript
   * engine.subscribeEvent('containerAssigned', 'myComponent', (element) => {
   *   console.log('Container assigned:', element);
   * });
   * ```
   */
  subscribeEvent(event: EngineEventType, id: string, callback: (element: HTMLElement) => void) {
    this.#eventSubscribers[event][id] = callback;
  }

  /**
   * Unsubscribe from an engine event.
   * 
   * @param event - The event type to unsubscribe from
   * @param id - The unique identifier used when subscribing
   * 
   * @example
   * ```typescript
   * engine.unsubscribeEvent('containerAssigned', 'myComponent');
   * ```
   */
  unsubscribeEvent(event: EngineEventType, id: string) {
    delete this.#eventSubscribers[event][id];
  }

  /**
   * Publish an event to all subscribers.
   * @internal
   */
  #publishEvent(event: EngineEventType, element: HTMLElement) {
    for (const callback of Object.values(this.#eventSubscribers[event])) {
      callback(element);
    }
  }

  /**
   * Initialize dom elements, and event listeners for the library.
   * This must be handled outside the constructor since many frontend frameworks
   * run Component constructors before the DOM element is available.
   * 
   * @param element: The element acting as the container.
   */
  assignDom(element: HTMLElement) {
    this.containerElement = element;
    // Camera may not be set if cameraControl was not used
    if (!this.camera) {
      this.camera = new StationaryCamera(this);
    }
    this.camera.containerDom = element;

    // Set up resize observer
    this.#resizeObserver = new ResizeObserver(() => {
      this.#publishEvent('containerResized', this.containerElement!);
    });
    this.#resizeObserver?.observe(element);
    this.#resizeObserver?.observe(window.document.body);
    // Set up scroll listener
    window.addEventListener('scroll', () => {
      this.#publishEvent('containerMoved', this.containerElement!);
    });

    this.#publishEvent('containerAssigned', element);
  }

  set element(containerDom: HTMLElement) {
    this.assignDom(containerDom);
  }

  /**
   * Sets the debug renderer for visualization overlay.
   *
   * @param renderer - The debug renderer instance to use
   *
   * @example
   * ```typescript
   * import { Engine } from 'snapengine';
   * import { DebugRenderer } from 'snapengine/debug';
   * 
   * const engine = new Engine();
   * engine.element = document.getElementById('container');
   * engine.setDebugRenderer(new DebugRenderer());
   * ```
   */
  setDebugRenderer(renderer: DebugRenderer) {
    if (this.containerElement == null) {
      return;
    }
    if (this.#debugRenderer) {
      return; // Already enabled
    }
    this.#debugRenderer = renderer;
    this.#debugRenderer.enable(this);
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

  #processQueue(stage: string, queue: Map<string, Map<string, queueEntry>>) {
    // Keep a set of all objects that have been processed
    let processedObjects: Set<BaseObject> = new Set();
    for (const queueEntry of queue.values()) {
      // Check if the object belongs to this engine
      // All entries in the inner map belong to the same object (same GID)
      const firstEntry = queueEntry.values().next().value;
      if (!firstEntry || firstEntry.object.engine !== this) {
        continue;
      }

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
    queue: Map<string, Map<string, queueEntry>>,
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
    const localObjectTable =
      this.global!.getEngineObjectTable(this, false) ?? {};
    this.#debugRenderer?.renderFrame(stats, this, localObjectTable);
  }

  /**
   * Sets a collision engine instance for collision detection.
   * 
   * This method allows you to inject a collision engine from a separate import,
   * enabling true tree-shaking when collision detection is not used.
   *
   * @param collisionEngine - The collision engine instance to use
   *
   * @example
   * ```typescript
   * import { Engine } from 'snapengine';
   * import { CollisionEngine, CircleCollider } from 'snapengine/collision';
   * 
   * const engine = new Engine();
   * engine.element = document.getElementById('container');
   * engine.setCollisionEngine(new CollisionEngine());
   * 
   * const collider = new CircleCollider(engine, object, 50);
   * object.addCollider(collider);
   * ```
   */
  setCollisionEngine(collisionEngine: CollisionEngine) {
    if (this.collisionEngine) {
      return;
    }
    this.collisionEngine = collisionEngine;
  }

  /**
   * Enables the animation engine for processing Web Animations API animations.
   *
   * The animation engine processes animations each frame. This method only sets up
   * the processing loop - animation classes should be imported separately.
   * 
   * @example
   * ```typescript
   * import { Engine } from 'snapengine';
   * import { AnimationObject } from 'snapengine/animation';
   * 
   * const engine = new Engine();
   * engine.element = document.getElementById('container');
   * engine.enableAnimationEngine();
   * 
   * const animation = new AnimationObject(element, { x: [0, 100] }, { duration: 1000 });
   * object.addAnimation(animation);
   * animation.play();
   * ```
   */
  enableAnimationEngine() {
    if (this.#animationProcessor) {
      return;
    }

    this.#animationProcessor = (timestamp: number) => {
      const newAnimationList: AnimationInterface[] = [];
      for (const animation of this.animationList) {
        const shouldKeep =
          animation.calculateFrame(timestamp) === false &&
          animation.requestDelete === false;

        if (shouldKeep) {
          newAnimationList.push(animation);
        } else {
          detachAnimationFromOwner(animation);
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
    this.global!.unregisterEngine(this);

    // Clean up resize observer
    if (this.#resizeObserver && this.containerElement) {
      this.#resizeObserver.unobserve(this.containerElement);
      this.#resizeObserver.unobserve(window.document.body);
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
