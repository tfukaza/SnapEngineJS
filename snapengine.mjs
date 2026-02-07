var __defProp = Object.defineProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var _engineIdCounter, _engineIds, _animationFrameId, _GlobalManager_instances, startRenderLoop_fn, stopRenderLoop_fn, ensureInputEngine_fn, ensureEngineId_fn, ensureGlobalObjectTable_fn, _animationProcessor, _debugRenderer, _eventSubscribers, _resizeObserver, _Engine_instances, publishEvent_fn, processQueue_fn, _config, _name, _prop, _outgoingLines, _incomingLines, _state, _hitCircle, _mouseHitBox, _targetConnector, _connectorCallback;
import { S as StationaryCamera } from "./camera-DYnXUm3K.js";
import { G as GlobalInputControl, E as ElementObject, d as detachAnimationFromOwner, a as EventProxyFactory } from "./input-BKVYLpNZ.js";
import { B } from "./input-BKVYLpNZ.js";
import { CircleCollider, PointCollider, RectCollider } from "./collision.mjs";
const _GlobalManager = class _GlobalManager {
  constructor() {
    __privateAdd(this, _GlobalManager_instances);
    __publicField(this, "inputEngine");
    __publicField(this, "objectTable");
    __publicField(this, "data");
    __publicField(this, "gid");
    __privateAdd(this, _engineIdCounter);
    __privateAdd(this, _engineIds);
    // Shared render state across all engines
    __publicField(this, "currentStage");
    __publicField(this, "read1Queue");
    __publicField(this, "write1Queue");
    __publicField(this, "read2Queue");
    __publicField(this, "write2Queue");
    __publicField(this, "read3Queue");
    __publicField(this, "write3Queue");
    // Registry of all engine instances
    __publicField(this, "engines");
    __privateAdd(this, _animationFrameId, null);
    this.objectTable = {};
    this.inputEngine = null;
    this.data = {};
    this.gid = 0;
    __privateSet(this, _engineIdCounter, 0);
    __privateSet(this, _engineIds, /* @__PURE__ */ new WeakMap());
    this.currentStage = "IDLE";
    this.read1Queue = /* @__PURE__ */ new Map();
    this.write1Queue = /* @__PURE__ */ new Map();
    this.read2Queue = /* @__PURE__ */ new Map();
    this.write2Queue = /* @__PURE__ */ new Map();
    this.read3Queue = /* @__PURE__ */ new Map();
    this.write3Queue = /* @__PURE__ */ new Map();
    this.engines = /* @__PURE__ */ new Set();
  }
  /**
   * Gets the singleton instance of GlobalManager.
   * Creates it if it doesn't exist yet.
   *
   * @returns The GlobalManager singleton instance
   */
  static getInstance() {
    if (!_GlobalManager.instance) {
      _GlobalManager.instance = new _GlobalManager();
    }
    return _GlobalManager.instance;
  }
  /**
   * Resets the singleton instance. Useful for testing.
   * WARNING: This will affect all Engine instances using this GlobalManager.
   */
  static resetInstance() {
    _GlobalManager.instance = null;
  }
  /**
   * Registers an Engine instance with the global render pipeline.
   * Called automatically by Engine constructor.
   *
   * @param engine - The Engine instance to register
   * @internal
   */
  registerEngine(engine) {
    this.engines.add(engine);
    __privateMethod(this, _GlobalManager_instances, ensureEngineId_fn).call(this, engine);
    __privateMethod(this, _GlobalManager_instances, ensureInputEngine_fn).call(this, engine);
    if (this.engines.size === 1) {
      __privateMethod(this, _GlobalManager_instances, startRenderLoop_fn).call(this);
    }
  }
  /**
   * Unregisters an Engine instance from the global render pipeline.
   * Should be called when an Engine is destroyed.
   *
   * @param engine - The Engine instance to unregister
   * @internal
   */
  unregisterEngine(engine) {
    var _a;
    this.engines.delete(engine);
    const engineId = __privateGet(this, _engineIds).get(engine);
    if (engineId) {
      delete this.objectTable[engineId];
      __privateGet(this, _engineIds).delete(engine);
    }
    if (this.engines.size === 0) {
      (_a = this.inputEngine) == null ? void 0 : _a.destroy();
      this.inputEngine = null;
      __privateMethod(this, _GlobalManager_instances, stopRenderLoop_fn).call(this);
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
  getInputEngine(engine) {
    if (!engine && !this.inputEngine) {
      return null;
    }
    return this.inputEngine ?? __privateMethod(this, _GlobalManager_instances, ensureInputEngine_fn).call(this, engine);
  }
  getEngineId(engine) {
    if (!engine) {
      return null;
    }
    return __privateGet(this, _engineIds).get(engine) ?? null;
  }
  getEngineObjectTable(engine, create = true) {
    if (!engine) {
      if (!create && !this.objectTable[_GlobalManager.GLOBAL_ENGINE_KEY]) {
        return null;
      }
      return __privateMethod(this, _GlobalManager_instances, ensureGlobalObjectTable_fn).call(this);
    }
    let engineId = __privateGet(this, _engineIds).get(engine);
    if (!engineId) {
      if (!create) {
        return null;
      }
      engineId = __privateMethod(this, _GlobalManager_instances, ensureEngineId_fn).call(this, engine);
    }
    if (!this.objectTable[engineId]) {
      if (!create) {
        return null;
      }
      this.objectTable[engineId] = {};
    }
    return this.objectTable[engineId];
  }
  registerObject(object) {
    const table = this.getEngineObjectTable(object.engine ?? null, true);
    if (table) {
      table[object.gid] = object;
    }
  }
  unregisterObject(object) {
    const table = this.getEngineObjectTable(object.engine ?? null, false);
    if (!table) {
      return;
    }
    delete table[object.gid];
    if (Object.keys(table).length === 0) {
      const key = object.engine && __privateGet(this, _engineIds).get(object.engine) ? __privateGet(this, _engineIds).get(object.engine) : _GlobalManager.GLOBAL_ENGINE_KEY;
      delete this.objectTable[key];
    }
  }
};
_engineIdCounter = new WeakMap();
_engineIds = new WeakMap();
_animationFrameId = new WeakMap();
_GlobalManager_instances = new WeakSet();
/**
 * Starts the global render loop.
 * Batches render stages across all engines to prevent layout thrashing.
 * @internal
 */
startRenderLoop_fn = function() {
  if (__privateGet(this, _animationFrameId) !== null) {
    return;
  }
  const step = () => {
    const timestamp = Date.now();
    this.currentStage = "READ_1";
    for (const engine of this.engines) {
      engine._processStage("READ_1", this.read1Queue, timestamp);
    }
    this.read1Queue = /* @__PURE__ */ new Map();
    this.currentStage = "WRITE_1";
    for (const engine of this.engines) {
      engine._processStage("WRITE_1", this.write1Queue, timestamp);
    }
    this.write1Queue = /* @__PURE__ */ new Map();
    this.currentStage = "READ_2";
    for (const engine of this.engines) {
      engine._processStage("READ_2", this.read2Queue, timestamp);
    }
    this.read2Queue = /* @__PURE__ */ new Map();
    this.currentStage = "WRITE_2";
    for (const engine of this.engines) {
      engine._processStage("WRITE_2", this.write2Queue, timestamp);
    }
    this.write2Queue = /* @__PURE__ */ new Map();
    for (const engine of this.engines) {
      engine._processAnimations(timestamp);
    }
    this.currentStage = "READ_3";
    for (const engine of this.engines) {
      engine._processStage("READ_3", this.read3Queue, timestamp);
    }
    this.read3Queue = /* @__PURE__ */ new Map();
    this.currentStage = "WRITE_3";
    for (const engine of this.engines) {
      engine._processStage("WRITE_3", this.write3Queue, timestamp);
    }
    this.write3Queue = /* @__PURE__ */ new Map();
    this.currentStage = "IDLE";
    for (const engine of this.engines) {
      engine._processPostRender(timestamp);
    }
    __privateSet(this, _animationFrameId, window.requestAnimationFrame(step));
  };
  __privateSet(this, _animationFrameId, window.requestAnimationFrame(step));
};
/**
 * Stops the global render loop.
 * @internal
 */
stopRenderLoop_fn = function() {
  if (__privateGet(this, _animationFrameId) !== null) {
    window.cancelAnimationFrame(__privateGet(this, _animationFrameId));
    __privateSet(this, _animationFrameId, null);
  }
};
ensureInputEngine_fn = function(_engine) {
  if (!this.inputEngine) {
    this.inputEngine = new GlobalInputControl(this);
  }
  return this.inputEngine;
};
ensureEngineId_fn = function(engine) {
  let engineId = __privateGet(this, _engineIds).get(engine);
  if (!engineId) {
    __privateWrapper(this, _engineIdCounter)._++;
    engineId = `engine-${__privateGet(this, _engineIdCounter)}`;
    __privateGet(this, _engineIds).set(engine, engineId);
  }
  if (!this.objectTable[engineId]) {
    this.objectTable[engineId] = {};
  }
  return engineId;
};
ensureGlobalObjectTable_fn = function() {
  const key = _GlobalManager.GLOBAL_ENGINE_KEY;
  if (!this.objectTable[key]) {
    this.objectTable[key] = {};
  }
  return this.objectTable[key];
};
__publicField(_GlobalManager, "instance", null);
__publicField(_GlobalManager, "GLOBAL_ENGINE_KEY", "__global__");
let GlobalManager = _GlobalManager;
const DEFAULT_ENGINE_CONFIG = {};
class Engine {
  constructor(config = {}) {
    __privateAdd(this, _Engine_instances);
    __publicField(this, "engineConfig");
    // Engine configuration options
    __publicField(this, "global", null);
    // Reference to the global manager
    __publicField(this, "containerElement", null);
    // The DOM element for the engine's container.
    __publicField(this, "containerBounds", null);
    // Cached bounding rect of the container
    __publicField(this, "camera", null);
    // Optional camera instance
    __publicField(this, "collisionEngine", null);
    // Optional collision engine instance
    __publicField(this, "animationList", []);
    // List of active animations, if animation engine is enabled  
    __privateAdd(this, _animationProcessor, null);
    __publicField(this, "debugMarkerList", {});
    // Debug markers by ID
    __privateAdd(this, _debugRenderer, null);
    // Event subscribers - allows multiple listeners per event type
    __privateAdd(this, _eventSubscribers, {
      containerAssigned: {},
      containerResized: {},
      containerMoved: {}
    });
    __privateAdd(this, _resizeObserver, null);
    this.global = GlobalManager.getInstance();
    this.global.registerEngine(this);
    this.engineConfig = {
      ...DEFAULT_ENGINE_CONFIG,
      ...config
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
   * engine.subscribeEvent('containerAssigned', 'myComponent', (props) => {
   *   console.log('Container assigned:', props.element, props.bounds);
   * });
   * ```
   */
  subscribeEvent(event, id, callback) {
    __privateGet(this, _eventSubscribers)[event][id] = callback;
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
  unsubscribeEvent(event, id) {
    delete __privateGet(this, _eventSubscribers)[event][id];
  }
  /**
   * Initialize dom elements, and event listeners for the library.
   * This must be handled outside the constructor since many frontend frameworks
   * run Component constructors before the DOM element is available.
   * 
   * @param element: The element acting as the container.
   */
  assignDom(element) {
    var _a, _b;
    this.containerElement = element;
    if (!this.camera) {
      this.camera = new StationaryCamera(this);
    }
    this.camera.containerDom = element;
    __privateSet(this, _resizeObserver, new ResizeObserver(() => {
      __privateMethod(this, _Engine_instances, publishEvent_fn).call(this, "containerResized", this.containerElement);
    }));
    (_a = __privateGet(this, _resizeObserver)) == null ? void 0 : _a.observe(element);
    (_b = __privateGet(this, _resizeObserver)) == null ? void 0 : _b.observe(window.document.body);
    window.addEventListener("scroll", () => {
      __privateMethod(this, _Engine_instances, publishEvent_fn).call(this, "containerMoved", this.containerElement);
    });
    __privateMethod(this, _Engine_instances, publishEvent_fn).call(this, "containerAssigned", element);
  }
  set element(containerDom) {
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
  setDebugRenderer(renderer) {
    if (this.containerElement == null) {
      return;
    }
    if (__privateGet(this, _debugRenderer)) {
      return;
    }
    __privateSet(this, _debugRenderer, renderer);
    __privateGet(this, _debugRenderer).enable(this);
  }
  /**
   * Disables and removes the debug visualization overlay.
   */
  disableDebug() {
    if (__privateGet(this, _debugRenderer)) {
      __privateGet(this, _debugRenderer).disable();
      __privateSet(this, _debugRenderer, null);
    }
  }
  /**
   * Internal method to process a single render stage.
   * Called by GlobalManager's render loop.
   * @internal
   */
  _processStage(stage, queue, _timestamp) {
    __privateMethod(this, _Engine_instances, processQueue_fn).call(this, stage, queue);
  }
  /**
   * Internal method to process animations.
   * Called by GlobalManager's render loop between WRITE_2 and READ_3.
   * @internal
   */
  _processAnimations(timestamp) {
    var _a;
    (_a = __privateGet(this, _animationProcessor)) == null ? void 0 : _a.call(this, timestamp);
  }
  /**
   * Internal method to process post-render tasks (collisions, debug).
   * Called by GlobalManager's render loop after all stages complete.
   * @internal
   */
  _processPostRender(timestamp) {
    var _a, _b;
    (_a = this.collisionEngine) == null ? void 0 : _a.detectCollisions();
    const stats = { timestamp };
    const localObjectTable = this.global.getEngineObjectTable(this, false) ?? {};
    (_b = __privateGet(this, _debugRenderer)) == null ? void 0 : _b.renderFrame(stats, this, localObjectTable);
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
  setCollisionEngine(collisionEngine) {
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
    if (__privateGet(this, _animationProcessor)) {
      return;
    }
    __privateSet(this, _animationProcessor, (timestamp) => {
      const newAnimationList = [];
      for (const animation of this.animationList) {
        const shouldKeep = animation.calculateFrame(timestamp) === false && animation.requestDelete === false;
        if (shouldKeep) {
          newAnimationList.push(animation);
        } else {
          detachAnimationFromOwner(animation);
        }
      }
      this.animationList = newAnimationList;
    });
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
    this.global.unregisterEngine(this);
    if (__privateGet(this, _resizeObserver) && this.containerElement) {
      __privateGet(this, _resizeObserver).unobserve(this.containerElement);
      __privateGet(this, _resizeObserver).unobserve(window.document.body);
      __privateSet(this, _resizeObserver, null);
    }
    if (__privateGet(this, _debugRenderer)) {
      this.disableDebug();
    }
    this.containerElement = null;
    this.camera = null;
    this.collisionEngine = null;
    this.animationList = [];
    this.debugMarkerList = {};
    __privateSet(this, _animationProcessor, null);
  }
}
_animationProcessor = new WeakMap();
_debugRenderer = new WeakMap();
_eventSubscribers = new WeakMap();
_resizeObserver = new WeakMap();
_Engine_instances = new WeakSet();
/**
 * Publish an event to all subscribers.
 * @internal
 */
publishEvent_fn = function(event, element) {
  const callbacks = Object.values(__privateGet(this, _eventSubscribers)[event]);
  if (callbacks.length === 0) {
    return;
  }
  const rect = element.getBoundingClientRect();
  this.containerBounds = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
  const props = {
    element,
    bounds: this.containerBounds
  };
  for (const callback of callbacks) {
    callback(props);
  }
};
processQueue_fn = function(stage, queue) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l;
  let processedObjects = /* @__PURE__ */ new Set();
  for (const queueEntry2 of queue.values()) {
    const firstEntry = queueEntry2.values().next().value;
    if (!firstEntry || firstEntry.object.engine !== this) {
      continue;
    }
    for (const objectEntry of queueEntry2.values()) {
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
            (_b = (_a = objectEntry.object.callback).afterRead1) == null ? void 0 : _b.call(_a);
          } else if (stage == "READ_2") {
            (_d = (_c = objectEntry.object.callback).afterRead2) == null ? void 0 : _d.call(_c);
          } else if (stage == "READ_3") {
            (_f = (_e = objectEntry.object.callback).afterRead3) == null ? void 0 : _f.call(_e);
          } else if (stage == "WRITE_1") {
            (_h = (_g = objectEntry.object.callback).afterWrite1) == null ? void 0 : _h.call(_g);
          } else if (stage == "WRITE_2") {
            (_j = (_i = objectEntry.object.callback).afterWrite2) == null ? void 0 : _j.call(_i);
          } else if (stage == "WRITE_3") {
            (_l = (_k = objectEntry.object.callback).afterWrite3) == null ? void 0 : _l.call(_k);
          }
        }
      }
    }
  }
};
class LineComponent extends ElementObject {
  constructor(engine, parent) {
    super(engine, parent);
    __publicField(this, "endWorldX");
    __publicField(this, "endWorldY");
    __publicField(this, "start");
    __publicField(this, "target");
    this.endWorldX = 0;
    this.endWorldY = 0;
    this.start = parent;
    this.target = null;
    this.transformMode = "direct";
  }
  setLineStartAtConnector() {
    const center = this.start.center;
    this.setLineStart(center.x, center.y);
  }
  setLineEndAtConnector() {
    if (this.target) {
      const center = this.target.center;
      this.setLineEnd(center.x, center.y);
    }
  }
  setLineStart(startPositionX, startPositionY) {
    this.worldPosition = [startPositionX, startPositionY];
  }
  setLineEnd(endWorldX, endWorldY) {
    this.endWorldX = endWorldX;
    this.endWorldY = endWorldY;
  }
  setLinePosition(startWorldX, startWorldY, endWorldX, endWorldY) {
    this.setLineStart(startWorldX, startWorldY);
    this.setLineEnd(endWorldX, endWorldY);
  }
  moveLineToConnectorTransform() {
    this.setLineStartAtConnector();
    if (!this.target) ;
    else {
      this.setLineEndAtConnector();
    }
  }
}
const _ConnectorComponent = class _ConnectorComponent extends ElementObject {
  constructor(engine, parent, config = {}) {
    super(engine, parent);
    __privateAdd(this, _config);
    __privateAdd(this, _name);
    __privateAdd(this, _prop);
    __privateAdd(this, _outgoingLines);
    __privateAdd(this, _incomingLines);
    __privateAdd(this, _state, 0);
    __privateAdd(this, _hitCircle);
    __privateAdd(this, _mouseHitBox);
    __privateAdd(this, _targetConnector, null);
    __privateAdd(this, _connectorCallback, null);
    __privateSet(this, _prop, {});
    __privateSet(this, _outgoingLines, []);
    __privateSet(this, _incomingLines, []);
    __privateSet(this, _config, config);
    __privateSet(this, _name, config.name || this.gid || "");
    this.event.input.pointerDown = this.onCursorDown;
    __privateSet(this, _hitCircle, new CircleCollider(engine, this, 0, 0, config.colliderRadius ?? 30));
    this.addCollider(__privateGet(this, _hitCircle));
    __privateSet(this, _mouseHitBox, new PointCollider(engine, this, 0, 0));
    this.addCollider(__privateGet(this, _mouseHitBox));
    __privateSet(this, _targetConnector, null);
    this.transformMode = "none";
    this.event.dom.onAssignDom = () => {
      this.queueUpdate("READ_1", () => {
        this.readDom();
        const prop = this.getDomProperty("READ_1");
        const centerX = prop.width / 2;
        const centerY = prop.height / 2;
        __privateGet(this, _hitCircle).transform.x = centerX;
        __privateGet(this, _hitCircle).transform.y = centerY;
        __privateGet(this, _mouseHitBox).transform.x = centerX;
        __privateGet(this, _mouseHitBox).transform.y = centerY;
      });
    };
    __privateSet(this, _connectorCallback, {
      onConnectOutgoing: null,
      onConnectIncoming: null,
      onDisconnectOutgoing: null,
      onDisconnectIncoming: null
    });
    __privateSet(this, _connectorCallback, EventProxyFactory(this, __privateGet(this, _connectorCallback)));
  }
  get name() {
    return __privateGet(this, _name);
  }
  get config() {
    return __privateGet(this, _config);
  }
  get prop() {
    return __privateGet(this, _prop);
  }
  get outgoingLines() {
    return __privateGet(this, _outgoingLines);
  }
  get incomingLines() {
    return __privateGet(this, _incomingLines);
  }
  get targetConnector() {
    return __privateGet(this, _targetConnector);
  }
  set targetConnector(value) {
    __privateSet(this, _targetConnector, value);
  }
  get numIncomingLines() {
    return __privateGet(this, _incomingLines).length;
  }
  get numOutgoingLines() {
    return __privateGet(this, _outgoingLines).length;
  }
  get center() {
    const prop = this.getDomProperty("READ_1");
    return {
      x: this.transform.x + prop.width / 2,
      y: this.transform.y + prop.height / 2
    };
  }
  get connectorCallback() {
    return __privateGet(this, _connectorCallback);
  }
  onCursorDown(prop) {
    const currentIncomingLines = __privateGet(this, _incomingLines).filter(
      (i) => !i._requestDelete
    );
    if (prop.event.button != 0) {
      return;
    }
    this.inputEngine.resetDragMembers();
    if (currentIncomingLines.length > 0) {
      this.startPickUpLine(currentIncomingLines[0], prop);
      return;
    }
    if (__privateGet(this, _config).allowDragOut) {
      this.startDragOutLine(prop);
    }
  }
  deleteLine(i) {
    if (__privateGet(this, _outgoingLines).length == 0) {
      return null;
    }
    const line = __privateGet(this, _outgoingLines)[i];
    line.destroy();
    __privateGet(this, _outgoingLines).splice(i, 1);
    return line;
  }
  deleteAllLines() {
    for (const line of __privateGet(this, _outgoingLines)) {
      line.destroy();
    }
  }
  updateAllLines() {
    var _a;
    this.calculateTransformFromLocal();
    for (const line of [...__privateGet(this, _outgoingLines), ...__privateGet(this, _incomingLines)]) {
      (_a = line.target) == null ? void 0 : _a.calculateTransformFromLocal();
      line.calculateLocalFromTransform();
      line.moveLineToConnectorTransform();
      line.requestTransform("WRITE_2");
    }
  }
  assignToNode(parent) {
    this.parent = parent;
    parent.children.push(this);
    let parent_ref = this.parent;
    parent_ref._prop[__privateGet(this, _name)] = null;
    __privateSet(this, _prop, parent_ref._prop);
    parent_ref._connectors[__privateGet(this, _name)] = this;
    __privateSet(this, _outgoingLines, []);
    __privateSet(this, _incomingLines, []);
    if (parent_ref.global && this.global == null) {
      this.global = parent_ref.global;
    }
  }
  createLine() {
    let line;
    if (__privateGet(this, _config).lineClass) {
      line = new (__privateGet(this, _config)).lineClass(this.engine, this);
    } else {
      line = new LineComponent(this.engine, this);
    }
    this.children.push(line);
    return line;
  }
  startDragOutLine(prop) {
    let newLine = this.createLine();
    newLine.setLineEnd(prop.position.x, prop.position.y);
    newLine.setLineStartAtConnector();
    __privateGet(this, _outgoingLines).unshift(newLine);
    this.parent.updateNodeLines();
    this.parent.updateNodeLineList();
    __privateSet(this, _state, 1);
    __privateSet(this, _targetConnector, null);
    this.event.input.drag = this.runDragOutLine;
    this.event.input.dragEnd = this.endDragOutLine;
    __privateGet(this, _mouseHitBox).event.collider.onCollide = (_, __) => {
      this.findClosestConnector();
    };
    __privateGet(this, _mouseHitBox).event.collider.onEndContact = (_, otherObject) => {
      var _a;
      if (((_a = __privateGet(this, _targetConnector)) == null ? void 0 : _a.gid) == otherObject.parent.gid) {
        __privateSet(this, _targetConnector, null);
      }
    };
    this.runDragOutLine({
      position: prop.position,
      start: {
        x: this.transform.x,
        y: this.transform.y
      },
      delta: {
        x: prop.position.x - this.transform.x,
        y: prop.position.y - this.transform.y
      }
    });
  }
  findClosestConnector() {
    let connectorCollider = Array.from(
      __privateGet(this, _mouseHitBox)._currentCollisions
    ).filter((c) => c.parent instanceof _ConnectorComponent);
    let connectors = connectorCollider.map((c) => c.parent).sort((a, b) => {
      const centerA = a.center;
      const centerB = b.center;
      let da = Math.sqrt(
        Math.pow(centerA.x - __privateGet(this, _mouseHitBox).transform.x, 2) + Math.pow(centerA.y - __privateGet(this, _mouseHitBox).transform.y, 2)
      );
      let db = Math.sqrt(
        Math.pow(centerB.x - __privateGet(this, _mouseHitBox).transform.x, 2) + Math.pow(centerB.y - __privateGet(this, _mouseHitBox).transform.y, 2)
      );
      return da - db;
    });
    if (connectors.length > 0) {
      __privateSet(this, _targetConnector, connectors[0]);
    } else {
      __privateSet(this, _targetConnector, null);
    }
  }
  runDragOutLine(prop) {
    if (__privateGet(this, _state) != 1) {
      return;
    }
    if (__privateGet(this, _outgoingLines).length == 0) {
      console.error(`Error: Outgoing lines is empty`);
      return;
    }
    __privateGet(this, _mouseHitBox).transform.x = prop.position.x - this.transform.x;
    __privateGet(this, _mouseHitBox).transform.y = prop.position.y - this.transform.y;
    let line = __privateGet(this, _outgoingLines)[0];
    if (__privateGet(this, _targetConnector)) {
      const result = this.hoverWhileDragging(__privateGet(this, _targetConnector));
      if (result) {
        line.setLineEnd(result[0], result[1]);
        line.setLineStartAtConnector();
        line.requestTransform("WRITE_2");
        return;
      }
    }
    line.setLineEnd(prop.position.x, prop.position.y);
    line.setLineStartAtConnector();
    this.parent.updateNodeLines();
  }
  hoverWhileDragging(targetConnector) {
    if (!(targetConnector instanceof _ConnectorComponent)) {
      return;
    }
    if (targetConnector == null) {
      return;
    }
    if (targetConnector.gid == this.gid) {
      return;
    }
    const connectorCenter = targetConnector.center;
    return [connectorCenter.x, connectorCenter.y];
  }
  endDragOutLine(_) {
    this.inputEngine.resetDragMembers();
    if (__privateGet(this, _targetConnector) && __privateGet(this, _targetConnector) instanceof _ConnectorComponent) {
      const target = __privateGet(this, _targetConnector);
      if (target == null) {
        console.error(`Error: target is null`);
        this._endLineDragCleanup();
        return;
      }
      if (this.connectToConnector(target, __privateGet(this, _outgoingLines)[0]) == false) {
        this._endLineDragCleanup();
        this.deleteLine(0);
        return;
      }
      __privateGet(target, _prop)[__privateGet(target, _name)] = __privateGet(this, _prop)[__privateGet(this, _name)];
      __privateGet(this, _outgoingLines)[0].setLineEnd(target.transform.x, target.transform.y);
    } else {
      this.deleteLine(0);
    }
    if (this.parent) {
      this.parent.updateNodeLines();
    }
    this._endLineDragCleanup();
  }
  _endLineDragCleanup() {
    __privateSet(this, _state, 0);
    this.event.global.pointerMove = null;
    this.event.global.pointerUp = null;
    this.parent.updateNodeLineList();
    __privateSet(this, _targetConnector, null);
    __privateGet(this, _mouseHitBox).event.collider.onBeginContact = null;
    __privateGet(this, _mouseHitBox).event.collider.onEndContact = null;
    __privateGet(this, _mouseHitBox).transform.x = 0;
    __privateGet(this, _mouseHitBox).transform.y = 0;
  }
  startPickUpLine(line, prop) {
    line.start.disconnectFromConnector(this);
    this.disconnectFromConnector(line.start);
    line.start.deleteLine(line.start.outgoingLines.indexOf(line));
    this.inputEngine.resetDragMembers();
    this.inputEngine.addDragMember(line.start.inputEngine);
    line.start.targetConnector = this;
    line.start.startDragOutLine(prop);
    __privateSet(this, _state, 1);
  }
  connectToConnector(connector, line) {
    var _a, _b, _c, _d;
    const currentIncomingLines = connector.incomingLines.filter(
      (i) => !i._requestDelete
    );
    if (currentIncomingLines.some((i) => i.start == this)) {
      return false;
    }
    if (connector.config.maxConnectors === currentIncomingLines.length) {
      return false;
    }
    if (line == null) {
      line = this.createLine();
      __privateGet(this, _outgoingLines).unshift(line);
    }
    this.calculateLocalFromTransform();
    line.target = connector;
    connector.incomingLines.push(line);
    this.parent.updateNodeLineList();
    (_b = (_a = __privateGet(this, _connectorCallback)) == null ? void 0 : _a.onConnectOutgoing) == null ? void 0 : _b.call(_a, connector);
    (_d = (_c = __privateGet(connector, _connectorCallback)) == null ? void 0 : _c.onConnectIncoming) == null ? void 0 : _d.call(_c, this);
    this.parent.setProp(__privateGet(this, _name), __privateGet(this, _prop)[__privateGet(this, _name)]);
    return true;
  }
  disconnectFromConnector(connector) {
    var _a, _b, _c, _d;
    for (const line of __privateGet(this, _outgoingLines)) {
      if (line.target == connector) {
        line._requestDelete = true;
        break;
      }
    }
    (_b = (_a = __privateGet(this, _connectorCallback)) == null ? void 0 : _a.onDisconnectOutgoing) == null ? void 0 : _b.call(_a, connector);
    (_d = (_c = __privateGet(connector, _connectorCallback)) == null ? void 0 : _c.onDisconnectIncoming) == null ? void 0 : _d.call(_c, this);
  }
};
_config = new WeakMap();
_name = new WeakMap();
_prop = new WeakMap();
_outgoingLines = new WeakMap();
_incomingLines = new WeakMap();
_state = new WeakMap();
_hitCircle = new WeakMap();
_mouseHitBox = new WeakMap();
_targetConnector = new WeakMap();
_connectorCallback = new WeakMap();
let ConnectorComponent = _ConnectorComponent;
class NodeComponent extends ElementObject {
  constructor(engine, parent, config = {}) {
    super(engine, parent);
    __publicField(this, "_config");
    __publicField(this, "_connectors");
    __publicField(this, "_components");
    __publicField(this, "_nodeWidth", 0);
    __publicField(this, "_nodeHeight", 0);
    __publicField(this, "_dragStartX", 0);
    __publicField(this, "_dragStartY", 0);
    __publicField(this, "_prop");
    __publicField(this, "_propSetCallback");
    __publicField(this, "_nodeStyle");
    __publicField(this, "_lineListCallback");
    __publicField(this, "_hitBox");
    __publicField(this, "_selected");
    __publicField(this, "_mouseDownX");
    __publicField(this, "_mouseDownY");
    __publicField(this, "_hasMoved");
    this._config = config;
    this._connectors = {};
    this._components = {};
    this._dragStartX = this.transform.x;
    this._dragStartY = this.transform.y;
    this._mouseDownX = 0;
    this._mouseDownY = 0;
    this._prop = {};
    this._propSetCallback = {};
    this._lineListCallback = null;
    this.transformMode = "direct";
    this.event.input.pointerDown = this.onCursorDown;
    this.event.input.dragStart = this.onDragStart;
    this.event.input.drag = this.onDrag;
    this.event.input.dragEnd = this.onDragEnd;
    this.event.input.pointerUp = this.onUp;
    this._hitBox = new RectCollider(this.engine, this, 0, 0, 0, 0);
    this.addCollider(this._hitBox);
    this._selected = false;
    this._hasMoved = false;
    this.event.dom.onResize = () => {
      this.queueUpdate("READ_1", () => {
        this.readDom(false, "READ_1");
        for (const connector of Object.values(this._connectors)) {
          connector.readDom(false, "READ_1");
          connector.calculateLocalFromDom("READ_1");
          connector.calculateTransformFromLocal();
        }
      });
      for (const line of [
        ...this.getAllOutgoingLines(),
        ...this.getAllIncomingLines()
      ]) {
        line.queueUpdate("WRITE_1", () => {
          line.moveLineToConnectorTransform();
          line.setLineEndAtConnector();
          line.writeDom();
          line.writeTransform();
        });
      }
    };
    this.style = {
      willChange: "transform",
      position: "absolute",
      transformOrigin: "top left"
    };
    this.event.dom.onAssignDom = () => {
      this._hitBox.element = this.element;
    };
    if (!this.global.data.select) {
      this.global.data.select = [];
    }
  }
  setStartPositions() {
    this._dragStartX = this.transform.x;
    this._dragStartY = this.transform.y;
  }
  setSelected(selected) {
    this._selected = selected;
    this.dataAttribute = {
      selected
    };
    if (selected) {
      this.global.data.select.push(this);
    } else {
      this.classList = this.classList.filter(
        (className) => className !== "selected"
      );
      this.global.data.select = this.global.data.select.filter(
        (node) => node.gid !== this.gid
      );
    }
    this.requestWrite();
  }
  _filterDeletedLines(svgLines) {
    for (let i = 0; i < svgLines.length; i++) {
      if (svgLines[i]._requestDelete) {
        svgLines.splice(i, 1);
        i--;
      }
    }
  }
  updateNodeLines() {
    for (const connector of Object.values(this._connectors)) {
      connector.updateAllLines();
    }
  }
  updateNodeLineList() {
    if (this._lineListCallback) {
      this._lineListCallback(this.getAllOutgoingLines());
    }
  }
  setLineListCallback(callback) {
    this._lineListCallback = callback;
  }
  onCursorDown(e) {
    var _a;
    if (e.event.button != 0) {
      return;
    }
    if (((_a = this.global.data.select) == null ? void 0 : _a.includes(this)) == false) {
      for (const node of this.global.data.select) {
        node.setSelected(false);
      }
      this.setSelected(true);
    }
  }
  onDragStart(prop) {
    this.global.data.allowCameraControl = false;
    for (const node of this.global.data.select ?? []) {
      node.setStartPositions();
      node._mouseDownX = prop.start.x;
      node._mouseDownY = prop.start.y;
    }
    this._hasMoved = true;
  }
  onDrag(prop) {
    if (this.global == null) {
      console.error("Global stats is null");
      return;
    }
    if (this._config.lockPosition) return;
    for (const node of this.global.data.select ?? []) {
      node.setDragPosition(prop);
    }
  }
  setDragPosition(prop) {
    const dx = prop.position.x - this._mouseDownX;
    const dy = prop.position.y - this._mouseDownY;
    this.worldPosition = [this._dragStartX + dx, this._dragStartY + dy];
    this.updateNodeLines();
    this.requestTransform("WRITE_2");
  }
  onDragEnd(prop) {
    this.global.data.allowCameraControl = true;
    for (const node of this.global.data.select ?? []) {
      node.setUpPosition(prop);
    }
  }
  setUpPosition(prop) {
    const [dx, dy] = [
      prop.end.x - this._mouseDownX,
      prop.end.y - this._mouseDownY
    ];
    this.worldPosition = [this._dragStartX + dx, this._dragStartY + dy];
    this.updateNodeLines();
  }
  onUp(_prop2) {
    if (this._hasMoved == false) {
      for (const node of this.global.data.select ?? []) {
        node.setSelected(false);
      }
      this.setSelected(true);
      return;
    }
  }
  getConnector(name) {
    if (!(name in this._connectors)) {
      console.error(`Connector ${name} does not exist in node ${this.gid}`);
      return null;
    }
    return this._connectors[name];
  }
  addConnectorObject(connector) {
    connector.assignToNode(this);
  }
  addSetPropCallback(callback, name) {
    this._propSetCallback[name] = callback;
  }
  getAllOutgoingLines() {
    return Object.values(this._connectors).flatMap(
      (connector) => connector.outgoingLines
    );
  }
  getAllIncomingLines() {
    return Object.values(this._connectors).flatMap(
      (connector) => connector.incomingLines
    );
  }
  getProp(name) {
    return this._prop[name];
  }
  setProp(name, value) {
    if (name in this._propSetCallback) {
      this._propSetCallback[name](value);
    }
    this._prop[name] = value;
    if (!(name in this._connectors)) {
      return;
    }
    const peers = this._connectors[name].outgoingLines.filter((line) => line.target && !line._requestDelete).map((line) => line.target);
    if (!peers) {
      return;
    }
    for (const peer of peers) {
      if (!peer) continue;
      if (!peer.parent) continue;
      let parent = peer.parent;
      parent.setProp(peer.name, value);
    }
  }
  propagateProp() {
    for (const connector of Object.values(this._connectors)) {
      this.setProp(connector.name, this.getProp(connector.name));
    }
  }
}
class RectSelectComponent extends ElementObject {
  constructor(engine, parent) {
    super(engine, parent);
    __publicField(this, "_state");
    __publicField(this, "_mouseDownX");
    __publicField(this, "_mouseDownY");
    __publicField(this, "_selectHitBox");
    this._state = "none";
    this._mouseDownX = 0;
    this._mouseDownY = 0;
    this.event.global.pointerDown = this.onGlobalCursorDown;
    this.event.global.pointerMove = this.onGlobalCursorMove;
    this.event.global.pointerUp = this.onGlobalCursorUp;
    this._selectHitBox = new RectCollider(engine, this, 0, 0, 0, 0);
    this._selectHitBox.transform.x = 0;
    this._selectHitBox.transform.y = 0;
    this._selectHitBox.event.collider.onCollide = this.onCollideNode;
    this.addCollider(this._selectHitBox);
    this.global.data.select = [];
    this.style = {
      width: "0px",
      height: "0px",
      transformOrigin: "top left",
      position: "absolute",
      left: "0px",
      top: "0px",
      pointerEvents: "none"
    };
    this.requestWrite();
  }
  onGlobalCursorDown(prop) {
    if (prop.event.button !== 0 || prop.event.target && prop.event.target.id !== "sl-background") {
      return;
    }
    for (let node of this.global.data.select) {
      node.setSelected(false);
    }
    this.global.data.select = [];
    this.worldPosition = [prop.position.x, prop.position.y];
    this._selectHitBox.recalculate();
    this._state = "dragging";
    this.style = {
      display: "block",
      width: "0px",
      height: "0px"
    };
    this._mouseDownX = prop.position.x;
    this._mouseDownY = prop.position.y;
    this._selectHitBox.event.collider.onBeginContact = (_, otherObject) => {
      if (otherObject.parent instanceof NodeComponent) {
        let node = otherObject.parent;
        node.setSelected(true);
      }
    };
    this._selectHitBox.event.collider.onEndContact = (_thisObject, otherObject) => {
      if (otherObject.parent instanceof NodeComponent) {
        let node = otherObject.parent;
        node.setSelected(false);
      }
    };
  }
  onGlobalCursorMove(prop) {
    if (this._state === "dragging") {
      let [boxOriginX, boxOriginY] = [
        Math.min(this._mouseDownX, prop.position.x),
        Math.min(this._mouseDownY, prop.position.y)
      ];
      let [boxWidth, boxHeight] = [
        Math.abs(prop.position.x - this._mouseDownX),
        Math.abs(prop.position.y - this._mouseDownY)
      ];
      this.style = {
        width: `${boxWidth}px`,
        height: `${boxHeight}px`
      };
      this.worldPosition = [boxOriginX, boxOriginY];
      this._selectHitBox.transform.x = this.transform.x - boxOriginX;
      this._selectHitBox.transform.y = this.transform.y - boxOriginY;
      this._selectHitBox.transform.width = boxWidth;
      this._selectHitBox.transform.height = boxHeight;
      this.requestTransform();
    }
  }
  onGlobalCursorUp(prop) {
    this.style = {
      display: "none"
    };
    this._state = "none";
    this._selectHitBox.event.collider.onBeginContact = null;
    this._selectHitBox.event.collider.onEndContact = null;
    this.requestTransform();
  }
  onCollideNode(hitBox, node) {
  }
}
class Background extends ElementObject {
  constructor(engine, parent) {
    super(engine, parent);
    __publicField(this, "_tileSize", 40);
    this.event.global.pointerMove = this.moveBackground;
    this._dom.style = {
      position: "absolute",
      top: "0",
      left: "0",
      backgroundSize: `${this._tileSize}px ${this._tileSize}px`
    };
    this.moveBackground();
  }
  moveBackground(_) {
    var _a, _b, _c, _d;
    let x = (_a = this.engine.camera) == null ? void 0 : _a.cameraPositionX;
    let y = (_b = this.engine.camera) == null ? void 0 : _b.cameraPositionY;
    let width = ((_c = this.engine.camera) == null ? void 0 : _c.cameraWidth) * 5;
    let height = ((_d = this.engine.camera) == null ? void 0 : _d.cameraHeight) * 5;
    this.worldPosition = [
      Math.floor(x / this._tileSize) * this._tileSize - width / 2,
      Math.floor(y / this._tileSize) * this._tileSize - height / 2
    ];
    this._dom.style = {
      width: `${width}px`,
      height: `${height}px`
    };
    this.requestWrite();
  }
}
export {
  Background,
  B as BaseObject,
  ConnectorComponent,
  ElementObject,
  Engine,
  GlobalManager,
  LineComponent,
  NodeComponent,
  RectSelectComponent
};
