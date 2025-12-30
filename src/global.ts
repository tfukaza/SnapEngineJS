import { BaseObject, queueEntry } from "./object";
import { GlobalInputControl } from "./input";

/**
 * Central state manager shared across all engine instances.
 *
 * Manages global state including:
 * - Unique object ID generation
 * - Global input control
 * - Shared render queues for synchronized rendering across all engines
 * - Shared data storage
 * - Engine instance registry
 *
 * This is a singleton - only one instance exists per application.
 * Multiple Engine instances share the same GlobalManager and render pipeline.
 *
 * @example
 * ```typescript
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine(); // Shares the same GlobalManager and render queues
 * ```
 */
class GlobalManager {
  private static instance: GlobalManager | null = null;
  private static readonly GLOBAL_ENGINE_KEY = "__global__";

  inputEngines: WeakMap<any, GlobalInputControl>;
  objectTable: Record<string, Record<string, BaseObject>>;
  data: any;
  gid: number;
  #engineIdCounter: number;
  #engineIds: WeakMap<any, string>;

  // Shared render state across all engines
  currentStage:
    | "IDLE"
    | "READ_1"
    | "WRITE_1"
    | "READ_2"
    | "WRITE_2"
    | "READ_3"
    | "WRITE_3";
  read1Queue: Record<string, Map<string, queueEntry>>;
  write1Queue: Record<string, Map<string, queueEntry>>;
  read2Queue: Record<string, Map<string, queueEntry>>;
  write2Queue: Record<string, Map<string, queueEntry>>;
  read3Queue: Record<string, Map<string, queueEntry>>;
  write3Queue: Record<string, Map<string, queueEntry>>;

  // Registry of all engine instances
  engines: Set<any>;

  private constructor() {
  this.objectTable = {};
  this.inputEngines = new WeakMap();
    this.data = {};
    this.gid = 0;
    this.#engineIdCounter = 0;
    this.#engineIds = new WeakMap();

    this.currentStage = "IDLE";
    this.read1Queue = {};
    this.write1Queue = {};
    this.read2Queue = {};
    this.write2Queue = {};
    this.read3Queue = {};
    this.write3Queue = {};

    this.engines = new Set();
  }

  /**
   * Gets the singleton instance of GlobalManager.
   * Creates it if it doesn't exist yet.
   *
   * @returns The GlobalManager singleton instance
   */
  static getInstance(): GlobalManager {
    if (!GlobalManager.instance) {
      GlobalManager.instance = new GlobalManager();
    }
    return GlobalManager.instance;
  }

  /**
   * Resets the singleton instance. Useful for testing.
   * WARNING: This will affect all Engine instances using this GlobalManager.
   */
  static resetInstance(): void {
    GlobalManager.instance = null;
  }

  /**
   * Registers an Engine instance with the global render pipeline.
   * Called automatically by Engine constructor.
   *
   * @param engine - The Engine instance to register
   * @internal
   */
  registerEngine(engine: any): void {
    this.engines.add(engine);
    this.#ensureEngineId(engine);
    this.#ensureInputEngine(engine);

    // Start the global render loop if this is the first engine
    if (this.engines.size === 1) {
      this.#startRenderLoop();
    }
  }

  /**
   * Unregisters an Engine instance from the global render pipeline.
   * Should be called when an Engine is destroyed.
   *
   * @param engine - The Engine instance to unregister
   * @internal
   */
  unregisterEngine(engine: any): void {
    this.engines.delete(engine);

    const inputEngine = this.inputEngines.get(engine);
    inputEngine?.destroy();
    this.inputEngines.delete(engine);

    const engineId = this.#engineIds.get(engine);
    if (engineId) {
      delete this.objectTable[engineId];
      this.#engineIds.delete(engine);
    }

    // Stop the global render loop if no engines remain
    if (this.engines.size === 0) {
      this.#stopRenderLoop();
    }
  }

  #animationFrameId: number | null = null;

  /**
   * Starts the global render loop.
   * Batches render stages across all engines to prevent layout thrashing.
   * @internal
   */
  #startRenderLoop(): void {
    if (this.#animationFrameId !== null) {
      return; // Already running
    }

    const step = () => {
      const timestamp = Date.now();

      // Process each stage for ALL engines before moving to the next stage
      // This prevents layout thrashing by batching DOM reads and writes

      // READ_1 stage for all engines
      this.currentStage = "READ_1";
      for (const engine of this.engines) {
        engine._processStage("READ_1", this.read1Queue, timestamp);
      }
      this.read1Queue = {};

      // WRITE_1 stage for all engines
      this.currentStage = "WRITE_1";
      for (const engine of this.engines) {
        engine._processStage("WRITE_1", this.write1Queue, timestamp);
      }
      this.write1Queue = {};

      // READ_2 stage for all engines
      this.currentStage = "READ_2";
      for (const engine of this.engines) {
        engine._processStage("READ_2", this.read2Queue, timestamp);
      }
      this.read2Queue = {};

      // WRITE_2 stage for all engines
      this.currentStage = "WRITE_2";
      for (const engine of this.engines) {
        engine._processStage("WRITE_2", this.write2Queue, timestamp);
      }
      this.write2Queue = {};

      // Animation processing for all engines
      for (const engine of this.engines) {
        engine._processAnimations(timestamp);
      }

      // READ_3 stage for all engines
      this.currentStage = "READ_3";
      for (const engine of this.engines) {
        engine._processStage("READ_3", this.read3Queue, timestamp);
      }
      this.read3Queue = {};

      // WRITE_3 stage for all engines
      this.currentStage = "WRITE_3";
      for (const engine of this.engines) {
        engine._processStage("WRITE_3", this.write3Queue, timestamp);
      }
      this.write3Queue = {};

      this.currentStage = "IDLE";

      // Post-render processing (collisions, debug) for all engines
      for (const engine of this.engines) {
        engine._processPostRender(timestamp);
      }

      this.#animationFrameId = window.requestAnimationFrame(step);
    };

    this.#animationFrameId = window.requestAnimationFrame(step);
  }

  /**
   * Stops the global render loop.
   * @internal
   */
  #stopRenderLoop(): void {
    if (this.#animationFrameId !== null) {
      window.cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  /**
   * Generates a unique identifier for objects.
   *
   * @returns A unique string ID that increments with each call.
   */
  getGlobalId() {
    this.gid++;
    return this.gid.toString();
  }

  getInputEngine(engine: any | null): GlobalInputControl | null {
    if (!engine) {
      return null;
    }
    return this.inputEngines.get(engine) ?? this.#ensureInputEngine(engine);
  }

  getEngineId(engine: any | null): string | null {
    if (!engine) {
      return null;
    }
    return this.#engineIds.get(engine) ?? null;
  }

  getEngineObjectTable(
    engine: any | null,
    create: boolean = true,
  ): Record<string, BaseObject> | null {
    if (!engine) {
      if (!create && !this.objectTable[GlobalManager.GLOBAL_ENGINE_KEY]) {
        return null;
      }
      return this.#ensureGlobalObjectTable();
    }

    let engineId = this.#engineIds.get(engine);
    if (!engineId) {
      if (!create) {
        return null;
      }
      engineId = this.#ensureEngineId(engine);
    }

    if (!this.objectTable[engineId]) {
      if (!create) {
        return null;
      }
      this.objectTable[engineId] = {};
    }

    return this.objectTable[engineId];
  }

  registerObject(object: BaseObject): void {
    const table = this.getEngineObjectTable(object.engine ?? null, true);
    if (table) {
      table[object.gid] = object;
    }
  }

  unregisterObject(object: BaseObject): void {
    const table = this.getEngineObjectTable(object.engine ?? null, false);
    if (!table) {
      return;
    }
    delete table[object.gid];

    if (Object.keys(table).length === 0) {
      const key =
        object.engine && this.#engineIds.get(object.engine)
          ? this.#engineIds.get(object.engine)!
          : GlobalManager.GLOBAL_ENGINE_KEY;
      delete this.objectTable[key];
    }
  }

  #ensureInputEngine(engine: any): GlobalInputControl {
    let inputEngine = this.inputEngines.get(engine);
    if (!inputEngine) {
      inputEngine = new GlobalInputControl(this, engine);
      this.inputEngines.set(engine, inputEngine);
    }
    return inputEngine;
  }

  #ensureEngineId(engine: any): string {
    let engineId = this.#engineIds.get(engine);
    if (!engineId) {
      this.#engineIdCounter++;
      engineId = `engine-${this.#engineIdCounter}`;
      this.#engineIds.set(engine, engineId);
    }
    if (!this.objectTable[engineId]) {
      this.objectTable[engineId] = {};
    }
    return engineId;
  }

  #ensureGlobalObjectTable(): Record<string, BaseObject> {
    const key = GlobalManager.GLOBAL_ENGINE_KEY;
    if (!this.objectTable[key]) {
      this.objectTable[key] = {};
    }
    return this.objectTable[key];
  }
}

export { GlobalManager };
