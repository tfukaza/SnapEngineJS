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

  inputEngine: GlobalInputControl | null;
  objectTable: Record<string, BaseObject>;
  data: any;
  gid: number;

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
    this.inputEngine = new GlobalInputControl(this);
    this.data = {};
    this.gid = 0;

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
}

export { GlobalManager };
