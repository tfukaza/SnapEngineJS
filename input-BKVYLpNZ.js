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
var _debugObject, _dragMemberList, _listenerControllers, _InputControl_instances, isPointerTracked_fn, isEventWithinEngine_fn, isCoordinateWithinEngine_fn, shouldHandlePointerEvent_fn, shouldHandleWheelEvent_fn, handleMultiPointer_fn, _document;
function getDomProperty(engine, dom) {
  const rect = dom.getBoundingClientRect();
  if (engine == null || engine.camera == null) {
    return {
      height: rect.height,
      width: rect.width,
      x: rect.left,
      y: rect.top,
      cameraX: rect.left,
      cameraY: rect.top,
      screenX: rect.left,
      screenY: rect.top
    };
  }
  const [cameraX, cameraY] = engine.camera.getCameraFromScreen(
    rect.left,
    rect.top
  );
  const [worldX, worldY] = engine.camera.getWorldFromCamera(cameraX, cameraY);
  const [cameraWidth, cameraHeight] = engine.camera.getCameraDeltaFromWorldDelta(rect.width, rect.height);
  const [worldWidth, worldHeight] = engine.camera.getWorldDeltaFromCameraDelta(
    cameraWidth,
    cameraHeight
  );
  return {
    height: worldHeight,
    width: worldWidth,
    x: worldX,
    y: worldY,
    cameraX,
    cameraY,
    screenX: rect.left,
    screenY: rect.top
  };
}
function generateTransformString(transform) {
  const string = `translate3d(${transform.x}px, ${transform.y}px, 0px) scale(${transform.scaleX}, ${transform.scaleY}) `;
  return string;
}
function parseTransformString(transform) {
  const transformValues = transform.split("(")[1].split(")")[0].split(",");
  return {
    x: parseFloat(transformValues[0]),
    y: parseFloat(transformValues[1]),
    scaleX: parseFloat(transformValues[3]) || 1,
    scaleY: parseFloat(transformValues[4]) || 1
  };
}
function setDomStyle(dom, style) {
  Object.assign(dom.style, style);
}
function EventProxyFactory(object, dict, secondary = null) {
  return new Proxy(dict, {
    set: (target, prop, value) => {
      if (value == null) {
        target[prop] = null;
      } else {
        target[prop] = value.bind(object);
      }
      return true;
    },
    get: (target, prop) => {
      return (...args) => {
        var _a, _b;
        (_a = target[prop]) == null ? void 0 : _a.call(target, ...args);
        (_b = secondary == null ? void 0 : secondary[prop]) == null ? void 0 : _b.call(secondary, ...args);
      };
    }
  });
}
class EventCallback {
  constructor(object) {
    __publicField(this, "_object");
    __publicField(this, "_global");
    __publicField(this, "global");
    __publicField(this, "_input");
    __publicField(this, "input");
    __publicField(this, "_dom");
    __publicField(this, "dom");
    this._object = object;
    this._global = {
      pointerDown: null,
      pointerMove: null,
      pointerUp: null,
      mouseWheel: null,
      drag: null,
      pinch: null,
      dragStart: null,
      dragEnd: null,
      pinchStart: null,
      pinchEnd: null
    };
    this.global = new Proxy(this._global, {
      set: (_, prop, value) => {
        const globalInputEngine = this._object.global.getInputEngine(
          this._object.engine
        );
        if (value == null) {
          globalInputEngine == null ? void 0 : globalInputEngine.unsubscribeGlobalCursorEvent(prop, this._object.gid);
        } else {
          globalInputEngine == null ? void 0 : globalInputEngine.subscribeGlobalCursorEvent(
            prop,
            this._object.gid,
            value.bind(this._object),
            this._object.engine
          );
        }
        return true;
      }
    });
    this._input = {
      pointerDown: null,
      pointerMove: null,
      pointerUp: null,
      mouseWheel: null,
      dragStart: null,
      drag: null,
      dragEnd: null,
      pinchStart: null,
      pinch: null,
      pinchEnd: null
    };
    this.input = EventProxyFactory(
      this._object,
      this._input
    );
    this._dom = {
      onAssignDom: null,
      onResize: null
    };
    this.dom = EventProxyFactory(this._object, this._dom);
  }
}
class queueEntry {
  constructor(object, callback, uuid = null) {
    __publicField(this, "uuid");
    __publicField(this, "object");
    __publicField(this, "callback");
    this.uuid = uuid ?? object.global.getGlobalId();
    this.object = object;
    this.callback = callback ? [callback.bind(object)] : null;
  }
  addCallback(callback) {
    if (this.callback) {
      this.callback.push(callback.bind(this.object));
    } else {
      this.callback = [callback.bind(this.object)];
    }
  }
}
const animationOwnerMap = /* @__PURE__ */ new WeakMap();
class BaseObject {
  constructor(engineOrGlobal, parent = null) {
    __publicField(this, "global");
    __publicField(this, "engine");
    // Will be the Engine instance - using any to avoid circular dependency
    __publicField(this, "gid");
    __publicField(this, "parent");
    __publicField(this, "children", []);
    __publicField(this, "transform");
    __publicField(this, "local");
    __publicField(this, "offset");
    __publicField(this, "event");
    __publicField(this, "_requestPreRead", false);
    __publicField(this, "_requestWrite", false);
    __publicField(this, "_requestRead", false);
    __publicField(this, "_requestDelete", false);
    __publicField(this, "_requestPostWrite", false);
    __publicField(this, "_colliderList", []);
    __publicField(this, "_animationList", []);
    __publicField(this, "_globalInput");
    __publicField(this, "globalInput");
    if (engineOrGlobal.global) {
      this.engine = engineOrGlobal;
      this.global = engineOrGlobal.global;
    } else {
      this.global = engineOrGlobal;
      this.engine = null;
    }
    this.gid = this.global.getGlobalId();
    this.global.registerObject(this);
    this.parent = parent;
    this._colliderList = [];
    this.transform = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    this.local = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    this.offset = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    this.event = new EventCallback(this);
    this._requestPreRead = false;
    this._requestWrite = false;
    this._requestRead = false;
    this._requestDelete = false;
    this._requestPostWrite = false;
    this._globalInput = {
      pointerDown: null,
      pointerMove: null,
      pointerUp: null,
      mouseWheel: null,
      dragStart: null,
      drag: null,
      dragEnd: null,
      pinchStart: null,
      pinch: null,
      pinchEnd: null
    };
    this.globalInput = new Proxy(this._globalInput, {
      set: (_, prop, value) => {
        const globalInputEngine = this.global.getInputEngine(this.engine);
        if (value == null) {
          globalInputEngine == null ? void 0 : globalInputEngine.unsubscribeGlobalCursorEvent(prop, this.gid);
        } else {
          globalInputEngine == null ? void 0 : globalInputEngine.subscribeGlobalCursorEvent(
            prop,
            this.gid,
            value.bind(this),
            this.engine
          );
        }
        return true;
      }
    });
  }
  destroy() {
    this.cancelAnimations();
    this.global.unregisterObject(this);
  }
  get worldPosition() {
    return [this.transform.x, this.transform.y];
  }
  set worldPosition(position) {
    this.transform.x = position[0];
    this.transform.y = position[1];
  }
  get cameraPosition() {
    var _a;
    return ((_a = this.engine.camera) == null ? void 0 : _a.getCameraFromWorld(...this.worldPosition)) ?? [0, 0];
  }
  set cameraPosition(position) {
    var _a, _b;
    this.worldPosition = ((_b = (_a = this.engine) == null ? void 0 : _a.camera) == null ? void 0 : _b.getWorldFromCamera(
      ...position
    )) ?? [0, 0];
  }
  get screenPosition() {
    var _a;
    return ((_a = this.engine.camera) == null ? void 0 : _a.getScreenFromCamera(...this.cameraPosition)) ?? [0, 0];
  }
  set screenPosition(position) {
    var _a, _b;
    this.cameraPosition = ((_b = (_a = this.engine) == null ? void 0 : _a.camera) == null ? void 0 : _b.getCameraFromScreen(
      ...position
    )) ?? [0, 0];
  }
  /**
   * Queues an update callback to be executed during a specific stage of the render pipeline.
   *
   * The SnapLine render pipeline has 6 stages:
   * - READ_1
   * - WRITE_1
   * - READ_2
   * - WRITE_2
   * - READ_3
   * - WRITE_3
   *
   * Read stages are for reading DOM properties (which may trigger reflows),
   * while write stages are for applying changes to the DOM.
   * Batching reads and writes prevents layout thrashing and improves performance.
   *
   * @param stage - The render stage when the callback should execute (default: "READ_1")
   * @param callback - Optional callback function to execute during the stage
   * @param queueID - Optional unique identifier for this queue entry
   * @returns The queue entry object
   *
   * @example
   * ```typescript
   * object.queueUpdate("READ_1", () => {
   *   // Read DOM properties
   * });
   * object.queueUpdate("WRITE_2", () => {
   *   // Apply transforms
   * });
   * ```
   */
  queueUpdate(stage = "READ_1", callback = null, queueID = null) {
    const request = new queueEntry(this, callback, queueID);
    let queue = this.global.read1Queue;
    switch (stage) {
      case "READ_1":
        queue = this.global.read1Queue;
        break;
      case "WRITE_1":
        queue = this.global.write1Queue;
        break;
      case "READ_2":
        queue = this.global.read2Queue;
        break;
      case "WRITE_2":
        queue = this.global.write2Queue;
        break;
      case "READ_3":
        queue = this.global.read3Queue;
        break;
      case "WRITE_3":
        queue = this.global.write3Queue;
        break;
    }
    if (!queue.get(this.gid)) {
      queue.set(this.gid, /* @__PURE__ */ new Map());
    }
    queue.get(this.gid).set(request.uuid, request);
    return request;
  }
  /**
   * Read the DOM property of the object.
   */
  readDom(_ = false) {
    for (const collider of this._colliderList) {
      collider.read();
    }
  }
  /**
   * Write all object properties to the DOM.
   */
  writeDom() {
  }
  /**
   * Write the CSS transform property of the object.
   * Unlike many other properties, the transform property does not trigger a DOM reflow and is thus more performant.
   * Whenever possible, use this method to write the transform property.
   */
  writeTransform() {
  }
  /**
   * Destroy the DOM element of the object.
   */
  destroyDom() {
  }
  /**
   * Calculate the transform properties of the object based on the saved transform properties of the parent
   * and the saved local and offset properties of the object.
   */
  calculateLocalFromTransform() {
    if (this.parent) {
      this.transform.x = this.parent.transform.x + this.local.x;
      this.transform.y = this.parent.transform.y + this.local.y;
    }
    for (const collider of this._colliderList) {
      collider.recalculate();
    }
  }
  /**
   * Add an animation to this object.
   * Users should create animation instances directly and pass them here.
   */
  /**
   * Adds an animation to this object and cancels any existing animations.
   *
   * This method automatically enables the animation engine if it's not already enabled.
   * Only one animation can be active per object at a time.
   *
   * @param animation - The animation to add (AnimationObject or SequenceObject)
   * @returns The added animation
   *
   * @example
   * ```typescript
   * const anim = new AnimationObject(element, { x: [0, 100] }, { duration: 1000 });
   * await object.addAnimation(anim);
   * ```
   */
  addAnimation(animation, options = {}) {
    var _a, _b;
    (_a = this.engine) == null ? void 0 : _a.enableAnimationEngine();
    const replaceExisting = options.replaceExisting ?? true;
    if (replaceExisting) {
      this.cancelAnimations();
    }
    this._animationList.push(animation);
    animationOwnerMap.set(animation, this);
    (_b = this.engine) == null ? void 0 : _b.animationList.push(animation);
    return animation;
  }
  cancelAnimations() {
    for (const existingAnimation of [...this._animationList]) {
      existingAnimation.requestDelete = true;
      existingAnimation.cancel();
      this.removeAnimationReference(existingAnimation);
    }
  }
  removeAnimationReference(animation) {
    this._animationList = this._animationList.filter(
      (anim) => anim !== animation
    );
    animationOwnerMap.delete(animation);
  }
  /**
   * Convenience method to create and add an animation to this object.
   * 
   * @deprecated Use addAnimation with AnimationObject instead.
   *
   * @param keyframe - The keyframe properties to animate
   * @param property - Animation options (duration, easing, etc.)
   * @returns The created animation
   *
   * @example
   * ```typescript
   * object.animate(
   *   { transform: ["translate(0px, 0px)", "translate(100px, 0px)"] },
   *   { duration: 1000, easing: "ease-in-out" }
   * );
   * ```
   */
  async animate(keyframe, property) {
    const { AnimationObject } = await import("./animation.mjs");
    const animation = new AnimationObject(
      this.element,
      keyframe,
      property
    );
    return this.addAnimation(animation, { replaceExisting: true });
  }
  /**
   * Convenience method to create and add a sequence of animations to this object.
   *
   * @param animations - Array of AnimationInterface objects to play as a sequence
   * @returns The created sequence animation
   *
   * @example
   * ```typescript
   * const anim1 = new AnimationObject(object, { x: [0, 100] }, { duration: 1000 });
   * const anim2 = new AnimationObject(object, { y: [0, 100] }, { duration: 1000 });
   * object.animateSequence([anim1, anim2]);
   * ```
   */
  async animateSequence(animations) {
    const { SequenceObject } = await import("./animation.mjs");
    const sequence = new SequenceObject();
    for (const animation of animations) {
      sequence.add(animation);
    }
    return this.addAnimation(sequence, { replaceExisting: true });
  }
  get animation() {
    if (this._animationList.length === 0) {
      return null;
    }
    return this._animationList[this._animationList.length - 1];
  }
  getCurrentStats() {
    return {
      timestamp: Date.now()
    };
  }
  addCollider(collider) {
    var _a;
    this._colliderList.push(collider);
    if (!this.engine) {
      return;
    }
    (_a = this.engine.collisionEngine) == null ? void 0 : _a.addObject(collider);
  }
  addDebugPoint(x, y, color = "red", persistent = false, id = "") {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.gid}-${id}`] = {
      gid: this.gid,
      type: "point",
      color,
      x,
      y,
      persistent,
      id: `${this.gid}-${id}`
    };
  }
  addDebugRect(x, y, width, height, color = "red", persistent = false, id = "", filled = true, lineWidth = 1) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.gid}-${id}`] = {
      gid: this.gid,
      type: "rect",
      color,
      x,
      y,
      width,
      height,
      persistent,
      id: `${this.gid}-${id}`,
      filled,
      lineWidth
    };
  }
  addDebugLine(x1, y1, x2, y2, color = "red", persistent = false, id = "", lineWidth = 2) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.gid}-${id}`] = {
      gid: this.gid,
      type: "line",
      color,
      x: x1,
      y: y1,
      x2,
      y2,
      persistent,
      id: `${this.gid}-${id}`,
      lineWidth
    };
  }
  addDebugCircle(x, y, radius, color = "red", persistent = false, id = "") {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.gid}-${id}`] = {
      gid: this.gid,
      type: "circle",
      color,
      x,
      y,
      radius,
      persistent,
      id: `${this.gid}-${id}`
    };
  }
  addDebugText(x, y, text, color = "red", persistent = false, id = "") {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.gid}-${id}`] = {
      gid: this.gid,
      x,
      y,
      type: "text",
      color,
      text,
      persistent,
      id: `${this.gid}-${id}`
    };
  }
  clearDebugMarker(id) {
    if (!this.engine) return;
    delete this.engine.debugMarkerList[`${this.gid}-${id}`];
  }
  clearAllDebugMarkers() {
    if (!this.engine) return;
    for (const marker of Object.values(this.engine.debugMarkerList)) {
      if (marker.gid == this.gid) {
        delete this.engine.debugMarkerList[marker.id];
      }
    }
  }
}
function detachAnimationFromOwner(animation) {
  const owner = animationOwnerMap.get(animation);
  if (!owner) {
    return;
  }
  owner.removeAnimationReference(animation);
}
class DomElement {
  constructor(engineOrGlobal, owner, dom = null, insertMode = {}, isFragment = false) {
    __publicField(this, "_uuid");
    __publicField(this, "_global");
    __publicField(this, "_engine");
    __publicField(this, "_owner");
    __publicField(this, "element");
    __publicField(this, "_pendingInsert");
    __publicField(this, "_requestWrite", false);
    __publicField(this, "_requestRead", false);
    __publicField(this, "_requestDelete", false);
    __publicField(this, "_requestPostWrite", false);
    __publicField(this, "_style");
    __publicField(this, "_classList");
    __publicField(this, "_dataAttribute");
    __publicField(this, "property");
    __publicField(this, "_transformApplied");
    __publicField(this, "insertMode");
    __publicField(this, "resizeObserver", null);
    __publicField(this, "mutationObserver", null);
    if (engineOrGlobal.global) {
      this._engine = engineOrGlobal;
      this._global = engineOrGlobal.global;
    } else {
      this._global = engineOrGlobal;
      this._engine = null;
    }
    this.element = dom;
    this.property = {
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      scaleX: 1,
      scaleY: 1,
      screenX: 0,
      screenY: 0
    };
    this._transformApplied = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    this._pendingInsert = isFragment;
    this._owner = owner;
    this._uuid = (++this._global.gid).toString();
    this._requestWrite = false;
    this._requestRead = false;
    this._requestDelete = false;
    this._requestPostWrite = false;
    this._style = {};
    this._dataAttribute = {};
    this._classList = [];
    this.insertMode = insertMode;
  }
  addElement(element) {
    this.element = element;
    this._owner.requestWrite();
    this._owner.requestRead();
    this.resizeObserver = new ResizeObserver(() => {
      var _a, _b;
      (_b = (_a = this._owner.event.dom).onResize) == null ? void 0 : _b.call(_a);
    });
    this.resizeObserver.observe(element);
    this.mutationObserver = new MutationObserver(() => {
      var _a, _b;
      (_b = (_a = this._owner.event.dom).onResize) == null ? void 0 : _b.call(_a);
    });
  }
  set style(style) {
    this._style = Object.assign(this._style, style);
  }
  get style() {
    return this._style;
  }
  set dataAttribute(dataAttribute) {
    this._dataAttribute = Object.assign(this._dataAttribute, dataAttribute);
  }
  get dataAttribute() {
    return this._dataAttribute;
  }
  set classList(classList) {
    this._classList = classList;
  }
  get classList() {
    return this._classList;
  }
  /**
   * Read the DOM property of the element.
   * @param accountTransform If true, the returned transform property will subtract any transform applied to the element.
   *      Note that transforms applied to the parent will not be accounted for.
   */
  readDom(accountTransform = false) {
    if (!this.element) {
      throw new Error("Element is not set");
    }
    const property = getDomProperty(this._engine, this.element);
    const transform = this.element.style.transform;
    let transformApplied = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    if (transform && transform != "none" && accountTransform) {
      transformApplied = parseTransformString(transform);
    }
    this.property.height = property.height / transformApplied.scaleY;
    this.property.width = property.width / transformApplied.scaleX;
    this.property.x = property.x - transformApplied.x;
    this.property.y = property.y - transformApplied.y;
    this.property.screenX = property.screenX;
    this.property.screenY = property.screenY;
  }
  /**
   * Write all properties of the element to the DOM, like style, class list, and data attributes.
   */
  writeDom() {
    if (!this.element) {
      return;
    }
    setDomStyle(this.element, this._style);
    this.element.classList.forEach((className) => {
      this.element.classList.add(className);
    });
    for (const [key, value] of Object.entries(this._dataAttribute)) {
      this.element.setAttribute(`data-${key}`, value);
    }
    this.element.setAttribute("data-engine-gid", this._owner.gid);
  }
  /**
   * Write the CSS transform property of the element.
   * Unlike many other properties, the transform property does not trigger a DOM reflow and is thus more performant.
   * Whenever possible, use this method instead of writeDom.
   * For example, if you are moving an element, instead of changing the left and top properties,
   * you should use this method to set the transform property.
   */
  writeTransform() {
    if (!this.element) {
      return;
    }
    let transformStyle = {
      transform: ""
    };
    if (this._owner.transformMode == "direct") {
      transformStyle = {
        transform: generateTransformString({
          x: this._owner.transform.x + this._owner.offset.x,
          y: this._owner.transform.y + this._owner.offset.y,
          scaleX: this._owner.transform.scaleX,
          scaleY: this._owner.transform.scaleY
        })
      };
    } else if (this._owner.transformMode == "relative") {
      const [newX, newY] = [
        this._owner.transform.x - this.property.x,
        this._owner.transform.y - this.property.y
      ];
      transformStyle = {
        transform: generateTransformString({
          x: newX + this._owner.offset.x,
          y: newY + this._owner.offset.y,
          scaleX: this._owner.transform.scaleX,
          scaleY: this._owner.transform.scaleY
        })
      };
    } else if (this._owner.transformMode == "none") {
      transformStyle = {
        transform: ""
      };
    } else if (this._owner.transformMode == "offset") {
      const origin = this._owner.transformOrigin ?? this._owner.parent;
      if (!origin) {
        const [newX, newY] = [
          this._owner.transform.x - this.property.x,
          this._owner.transform.y - this.property.y
        ];
        transformStyle = {
          transform: generateTransformString({
            x: newX + this._owner.offset.x,
            y: newY + this._owner.offset.y,
            scaleX: this._owner.transform.scaleX,
            scaleY: this._owner.transform.scaleY
          })
        };
      } else {
        transformStyle = {
          transform: generateTransformString({
            x: this._owner.transform.x - origin.transform.x,
            y: this._owner.transform.y - origin.transform.y,
            scaleX: this._owner.transform.scaleX * origin.transform.scaleX,
            scaleY: this._owner.transform.scaleY * origin.transform.scaleY
          })
        };
      }
    }
    if (this._style["transform"] != void 0 && this._style["transform"] != "" && transformStyle["transform"] != "") {
      transformStyle["transform"] = this._style["transform"];
    }
    setDomStyle(this.element, { ...this._style, ...transformStyle });
  }
  destroyDom() {
    var _a, _b;
    (_a = this.resizeObserver) == null ? void 0 : _a.disconnect();
    (_b = this.mutationObserver) == null ? void 0 : _b.disconnect();
    if (this.element) {
      this.element.remove();
    }
    this.element = null;
  }
}
class ElementObject extends BaseObject {
  constructor(engine, parent = null) {
    super(engine, parent);
    __publicField(this, "_dom");
    __publicField(this, "_requestWrite");
    __publicField(this, "_requestRead");
    __publicField(this, "_requestDelete");
    __publicField(this, "_requestPostWrite");
    __publicField(this, "_state", {});
    __publicField(this, "state");
    __publicField(this, "transformMode");
    __publicField(this, "transformOrigin");
    /**
     * direct: Applies the transform directly to the object.
     * relative: Perform calculations to apply the transform relative to the DOM element's
     *      current position. The current position must be read from the DOM explicitly beforehand.
     *      Only applicable if the object owns a DOM element.
     * offset: Apply the transform relative to the position of a parent object.
     * none: No transform is applied to the object.
     */
    // _parentElement: HTMLElement | null;
    // _elementIndex: number;
    __publicField(this, "_domProperty");
    __publicField(this, "inScene", false);
    __publicField(this, "_callback");
    __publicField(this, "callback");
    __publicField(this, "inputEngine");
    this._dom = new DomElement(engine, this, null);
    this.inScene = false;
    this._requestWrite = false;
    this._requestRead = false;
    this._requestDelete = false;
    this._requestPostWrite = false;
    this._domProperty = [
      {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
        scaleX: 1,
        scaleY: 1,
        screenX: 0,
        screenY: 0
      },
      {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
        scaleX: 1,
        scaleY: 1,
        screenX: 0,
        screenY: 0
      },
      {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
        scaleX: 1,
        scaleY: 1,
        screenX: 0,
        screenY: 0
      }
    ];
    this.transformMode = "direct";
    this.transformOrigin = null;
    this._callback = {
      afterRead1: null,
      afterRead2: null,
      afterRead3: null,
      afterWrite1: null,
      afterWrite2: null,
      afterWrite3: null
    };
    this.callback = EventProxyFactory(this, this._callback);
    this.state = new Proxy(this._state, {
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      }
    });
    this.inputEngine = new InputControl(
      this.engine,
      false,
      this.gid
    );
  }
  destroy() {
    this._dom.destroyDom();
    super.destroy();
  }
  getDomProperty(stage = null) {
    const index = stage == "READ_1" ? 0 : stage == "READ_2" ? 1 : 2;
    return this._domProperty[index];
  }
  copyDomProperty(fromStage, toStage) {
    const fromIndex = fromStage == "READ_1" ? 0 : fromStage == "READ_2" ? 1 : 2;
    const toIndex = toStage == "READ_1" ? 0 : toStage == "READ_2" ? 1 : 2;
    Object.assign(this._domProperty[toIndex], this._domProperty[fromIndex]);
  }
  /**
   * Save the DOM property to the transform property.
   * Currently only saves the x and y properties.
   * This function assumes that the element position has already been read from the DOM.
   */
  saveDomPropertyToTransform(stage = null) {
    let currentStage = stage ?? this.global.currentStage;
    currentStage = currentStage == "IDLE" ? "READ_2" : currentStage;
    const property = this.getDomProperty(currentStage);
    this.worldPosition = [property.x, property.y];
  }
  /**
   * Calculate the local offsets relative to the parent.
   * This function assumes that the element position has already been read from the DOM
   * in both the parent and the current object.
   */
  calculateLocalFromTransform() {
    if (this.parent) {
      this.local.x = this.transform.x - this.parent.transform.x;
      this.local.y = this.transform.y - this.parent.transform.y;
    }
  }
  calculateLocalFromDom(stage = null) {
    if (this.parent) {
      const property = this.getDomProperty(stage);
      if (this.parent instanceof ElementObject) {
        this.local.x = property.x - this.parent.getDomProperty(stage).x;
        this.local.y = property.y - this.parent.getDomProperty(stage).y;
      } else {
        this.local.x = this.transform.x - this.parent.transform.x;
        this.local.y = this.transform.y - this.parent.transform.y;
      }
    }
  }
  calculateTransformFromLocal() {
    if (this.parent) {
      this.transform.x = this.parent.transform.x + this.local.x;
      this.transform.y = this.parent.transform.y + this.local.y;
    }
  }
  get style() {
    return this._dom.style;
  }
  set style(style) {
    this._dom.style = style;
  }
  get classList() {
    return this._dom.classList;
  }
  set classList(classList) {
    this._dom.classList = classList;
  }
  get dataAttribute() {
    return this._dom.dataAttribute;
  }
  set dataAttribute(dataAttribute) {
    this._dom.dataAttribute = dataAttribute;
  }
  get element() {
    return this._dom.element;
  }
  set element(element) {
    var _a, _b, _c, _d;
    if (!element) {
      console.error("Element is not set", this.gid);
      return;
    }
    this._dom.addElement(element);
    (_a = this.inputEngine) == null ? void 0 : _a.addCursorEventListener(element);
    const keys = Object.keys(this.inputEngine.event);
    for (const event of keys) {
      const callback = ((_b = this.event.input[event]) == null ? void 0 : _b.bind(this)) || null;
      this.inputEngine.event[event] = callback;
    }
    (_d = (_c = this.event.dom).onAssignDom) == null ? void 0 : _d.call(_c);
  }
  readDom(accountTransform = false, stage = null) {
    let currentStage = stage ?? this.global.currentStage;
    currentStage = currentStage == "IDLE" ? "READ_2" : currentStage;
    this._dom.readDom(accountTransform);
    super.readDom(accountTransform);
    if (currentStage == "READ_1") {
      Object.assign(this._domProperty[0], this._dom.property);
    } else if (currentStage == "READ_2") {
      Object.assign(this._domProperty[1], this._dom.property);
    } else if (currentStage == "READ_3") {
      Object.assign(this._domProperty[2], this._dom.property);
    }
  }
  writeDom() {
    this._dom.writeDom();
    super.writeDom();
  }
  writeTransform() {
    this._dom.writeTransform();
    super.writeTransform();
  }
  destroyDom() {
    this._dom.destroyDom();
    super.destroyDom();
  }
  /**
   * Common queue requests for element objects.
   */
  requestRead(accountTransform = false, saveTransform = true, stage = "READ_1") {
    const callback = () => {
      this.readDom(accountTransform);
      if (saveTransform) {
        this.saveDomPropertyToTransform(stage);
      }
    };
    return this.queueUpdate(stage, callback, stage);
  }
  requestWrite(mutate = true, writeCallback = null, stage = "WRITE_1") {
    const callback = () => {
      if (mutate) {
        this.writeDom();
      }
      writeCallback == null ? void 0 : writeCallback();
    };
    return this.queueUpdate(stage, callback, stage);
  }
  requestDestroy() {
    const callback = () => {
      this.destroyDom();
    };
    return this.queueUpdate("WRITE_2", callback, "destroy");
  }
  requestTransform(stage = "WRITE_2") {
    const callback = () => {
      this.writeTransform();
    };
    return this.queueUpdate(stage, callback, "transform");
  }
  requestFLIP(writeCallback, transformCallback) {
    this.requestRead(false, true, "READ_1");
    this.requestWrite(true, writeCallback, "WRITE_1");
    this.requestRead(false, true, "READ_2");
    this.requestWrite(false, transformCallback, "WRITE_2");
  }
}
const GLOBAL_GID = "global";
class InputControl {
  constructor(engine, isGlobal = true, ownerGID = null) {
    __privateAdd(this, _InputControl_instances);
    /**
     * Functions as a middleware that converts mouse and touch events into a unified event format.
     */
    __publicField(this, "_element");
    __publicField(this, "global");
    __publicField(this, "_sortedTouchArray");
    // List of touches for touch events, sorted by the times they are pressed
    __publicField(this, "_sortedTouchDict");
    // Dictionary of touches for touch events, indexed by the touch identifier
    __publicField(this, "_localPointerDict");
    __publicField(this, "_event");
    __publicField(this, "event");
    __publicField(this, "_isGlobal");
    __publicField(this, "_uuid");
    __publicField(this, "_ownerGID");
    __privateAdd(this, _debugObject);
    __privateAdd(this, _dragMemberList);
    __privateAdd(this, _listenerControllers);
    __publicField(this, "engine");
    var _a;
    this.engine = engine;
    this.global = engine.global;
    this._element = null;
    this._isGlobal = isGlobal;
    this._sortedTouchArray = [];
    this._sortedTouchDict = {};
    this._ownerGID = ownerGID;
    this._localPointerDict = {};
    __privateSet(this, _dragMemberList, []);
    __privateSet(this, _listenerControllers, []);
    this._event = {
      pointerDown: null,
      pointerMove: null,
      pointerUp: null,
      mouseWheel: null,
      dragStart: null,
      drag: null,
      dragEnd: null,
      pinchStart: null,
      pinch: null,
      pinchEnd: null
    };
    this.event = EventProxyFactory(
      this,
      this._event,
      this._isGlobal ? null : (_a = this.globalInputEngine) == null ? void 0 : _a._inputControl.event
    );
    this._uuid = Symbol();
    __privateSet(this, _debugObject, new BaseObject(this.global, null));
  }
  destroy() {
    for (const controller of __privateGet(this, _listenerControllers)) {
      controller.abort();
    }
    __privateSet(this, _listenerControllers, []);
    this._element = null;
    this._sortedTouchArray = [];
    this._sortedTouchDict = {};
    this._localPointerDict = {};
  }
  get globalInputEngine() {
    if (!this.global) {
      return null;
    }
    return this.global.getInputEngine(this.engine ?? null);
  }
  get globalPointerDict() {
    if (this.globalInputEngine == null) {
      return {};
    }
    return this.globalInputEngine._pointerDict;
  }
  get globalGestureDict() {
    if (this.globalInputEngine == null) {
      return {};
    }
    return this.globalInputEngine._gestureDict;
  }
  // convertMouseToCursorState(buttons: number): cursorState {
  //   switch (buttons) {
  //     case 1:
  //       return cursorState.mouseLeft;
  //     case 2:
  //       return cursorState.mouseRight;
  //     case 4:
  //       return cursorState.mouseMiddle;
  //     default:
  //       return cursorState.none;
  //   }
  // }
  getCoordinates(screenX, screenY) {
    if (this.engine == null || this.engine.camera == null) {
      return {
        x: screenX,
        y: screenY,
        cameraX: screenX,
        cameraY: screenY,
        screenX,
        screenY
      };
    }
    const [cameraX, cameraY] = this.engine.camera.getCameraFromScreen(
      screenX,
      screenY
    );
    const [worldX, worldY] = this.engine.camera.getWorldFromCamera(
      cameraX,
      cameraY
    );
    return {
      x: worldX,
      y: worldY,
      cameraX,
      cameraY,
      screenX,
      screenY
    };
  }
  /**
   * Called when the user pressed the mouse button.
   * This and all other pointer/gesture events automatically propagate to global input engine as well.
   * @param e
   * @returns
   */
  onPointerDown(e) {
    var _a, _b, _c, _d, _e;
    const isWithinEngine = __privateMethod(this, _InputControl_instances, isCoordinateWithinEngine_fn).call(this, e.clientX, e.clientY);
    if (!isWithinEngine) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    (_b = (_a = this.event).pointerDown) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons,
      isWithinEngine
    });
    const pointerData = {
      id: e.pointerId,
      callerGID: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      timestamp: e.timeStamp,
      x: e.clientX,
      y: e.clientY,
      startX: e.clientX,
      startY: e.clientY,
      prevX: e.clientX,
      prevY: e.clientY,
      endX: null,
      endY: null,
      moveCount: 0
    };
    this.globalPointerDict[e.pointerId] = pointerData;
    (_d = (_c = this.event).dragStart) == null ? void 0 : _d.call(_c, {
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      pointerId: e.pointerId,
      start: coordinates,
      button: e.buttons,
      isWithinEngine
    });
    __privateGet(this, _debugObject).addDebugPoint(
      coordinates.x,
      coordinates.y,
      "red",
      true,
      "pointerDown"
    );
    if (this.globalGestureDict[e.pointerId]) {
      this.globalGestureDict[e.pointerId].memberList.push(this);
    } else {
      this.globalGestureDict[e.pointerId] = {
        type: "drag",
        state: "drag",
        memberList: [this, ...__privateGet(this, _dragMemberList)],
        initiatorID: this._isGlobal ? GLOBAL_GID : this._ownerGID ?? ""
      };
      (_e = this.globalInputEngine) == null ? void 0 : _e.enforceMaxDragLimit();
    }
  }
  /**
   * Called when the user moves the mouse
   * @param e
   */
  onPointerMove(e) {
    var _a, _b;
    if (!__privateMethod(this, _InputControl_instances, shouldHandlePointerEvent_fn).call(this, e, { allowHover: true })) {
      return;
    }
    e.preventDefault();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    (_b = (_a = this.event).pointerMove) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons
    });
    const id = e.pointerId;
    let pointerData = this.globalPointerDict[id];
    if (pointerData != null) {
      const updatedPointerData = {
        prevX: pointerData.x,
        prevY: pointerData.y,
        x: e.clientX,
        y: e.clientY,
        callerGID: this._isGlobal ? GLOBAL_GID : this._ownerGID
      };
      Object.assign(pointerData, updatedPointerData);
      __privateMethod(this, _InputControl_instances, handleMultiPointer_fn).call(this, e);
    }
    e.stopPropagation();
  }
  /**
   * Called when the user releases the mouse button
   * @param e
   */
  onPointerUp(e) {
    var _a, _b, _c, _d, _e, _f;
    if (!__privateMethod(this, _InputControl_instances, shouldHandlePointerEvent_fn).call(this, e)) {
      return;
    }
    e.preventDefault();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    (_b = (_a = this.event).pointerUp) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons
    });
    let pointerData = this.globalPointerDict[e.pointerId];
    if (pointerData != null) {
      const gesture = this.globalGestureDict[e.pointerId];
      if (gesture != null) {
        gesture.state = "release";
        const start = this.getCoordinates(
          pointerData.startX,
          pointerData.startY
        );
        for (const member of gesture.memberList) {
          (_d = (_c = member.event).dragEnd) == null ? void 0 : _d.call(_c, {
            gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
            pointerId: e.pointerId,
            start,
            end: coordinates,
            button: e.buttons
          });
        }
        delete this.globalGestureDict[e.pointerId];
      }
      delete this.globalPointerDict[e.pointerId];
      for (const gestureKey of Object.keys(this.globalGestureDict)) {
        if (!gestureKey.includes("-")) {
          continue;
        }
        const [pointerId_0, pointerId_1] = gestureKey.split("-").map(Number);
        if (pointerId_0 == e.pointerId || pointerId_1 == e.pointerId) {
          const gesture2 = this.globalGestureDict[gestureKey];
          (_f = (_e = this.event).pinchEnd) == null ? void 0 : _f.call(_e, {
            gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
            gestureID: gestureKey,
            start: gesture2.start,
            pointerList: gesture2.pointerList,
            distance: gesture2.distance,
            end: {
              pointerList: gesture2.pointerList,
              distance: gesture2.distance
            }
          });
          delete this.globalGestureDict[gestureKey];
        }
      }
    }
    e.stopPropagation();
  }
  /**
   * Called when a pointer event is cancelled (e.g., touch interrupted by system gesture).
   * Treated as a pointer up event to clean up any ongoing gestures.
   * @param e
   */
  onPointerCancel(e) {
    this.onPointerUp(e);
  }
  /**
   * Called when the user scrolls the mouse wheel
   * @param e
   */
  onWheel(e) {
    var _a, _b;
    if (!__privateMethod(this, _InputControl_instances, shouldHandleWheelEvent_fn).call(this, e)) {
      return;
    }
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    (_b = (_a = this.event).mouseWheel) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      delta: e.deltaY,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID
    });
    e.stopPropagation();
  }
  /**
   * Detects and fires pinch gesture events based on current pointer state.
   * Called by #handleMultiPointer when 2+ pointers are tracked.
   * @internal
   */
  _detectAndFirePinchGestures() {
    var _a, _b, _c, _d;
    const pointerList = Object.values(this.globalPointerDict);
    if (pointerList.length < 2) return;
    pointerList.sort((a, b) => a.timestamp - b.timestamp);
    for (let i = 0; i < pointerList.length - 1; i++) {
      const pointer_0 = pointerList[i];
      const pointer_1 = pointerList[i + 1];
      const gestureKey = `${pointer_0.id}-${pointer_1.id}`;
      const startMiddleX = (pointer_0.startX + pointer_1.startX) / 2;
      const startMiddleY = (pointer_0.startY + pointer_1.startY) / 2;
      this.getCoordinates(startMiddleX, startMiddleY);
      const startDistance = Math.sqrt(
        Math.pow(pointer_0.startX - pointer_1.startX, 2) + Math.pow(pointer_0.startY - pointer_1.startY, 2)
      );
      const currentPointer0 = this.getCoordinates(pointer_0.x, pointer_0.y);
      const currentPointer1 = this.getCoordinates(pointer_1.x, pointer_1.y);
      const currentDistance = Math.sqrt(
        Math.pow(pointer_0.x - pointer_1.x, 2) + Math.pow(pointer_0.y - pointer_1.y, 2)
      );
      if (this.globalGestureDict[gestureKey] == null) {
        this.globalGestureDict[gestureKey] = {
          type: "pinch",
          state: "pinch",
          memberList: [this],
          start: {
            pointerList: [currentPointer0, currentPointer1],
            distance: startDistance
          },
          pointerList: [currentPointer0, currentPointer1],
          distance: startDistance
        };
        (_b = (_a = this.event).pinchStart) == null ? void 0 : _b.call(_a, {
          gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
          gestureID: gestureKey,
          start: {
            pointerList: [currentPointer0, currentPointer1],
            distance: startDistance
          }
        });
      }
      const pinchGesture = this.globalGestureDict[gestureKey];
      pinchGesture.pointerList = [currentPointer0, currentPointer1];
      pinchGesture.distance = currentDistance;
      (_d = (_c = this.event).pinch) == null ? void 0 : _d.call(_c, {
        gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
        gestureID: gestureKey,
        start: pinchGesture.start,
        pointerList: pinchGesture.pointerList,
        distance: pinchGesture.distance
      });
    }
  }
  addListener(dom, event, callback) {
    const controller = new AbortController();
    const boundCallback = callback.bind(this);
    dom.addEventListener(event, boundCallback, { signal: controller.signal });
    __privateGet(this, _listenerControllers).push(controller);
  }
  addCursorEventListener(dom) {
    this.addListener(dom, "pointerdown", this.onPointerDown);
    this.addListener(dom, "pointermove", this.onPointerMove);
    this.addListener(dom, "pointerup", this.onPointerUp);
    this.addListener(dom, "pointercancel", this.onPointerCancel);
    this.addListener(dom, "wheel", this.onWheel);
  }
  addDragMember(member) {
    __privateGet(this, _dragMemberList).push(member);
  }
  resetDragMembers() {
    __privateSet(this, _dragMemberList, []);
  }
}
_debugObject = new WeakMap();
_dragMemberList = new WeakMap();
_listenerControllers = new WeakMap();
_InputControl_instances = new WeakSet();
isPointerTracked_fn = function(pointerId) {
  return this.globalPointerDict[pointerId] != null;
};
isEventWithinEngine_fn = function(target) {
  var _a;
  const container = (_a = this.engine) == null ? void 0 : _a.containerElement;
  if (container == null) {
    return true;
  }
  if (!(target instanceof Node)) {
    return false;
  }
  return container.contains(target);
};
isCoordinateWithinEngine_fn = function(screenX, screenY) {
  var _a;
  const rect = (_a = this.engine) == null ? void 0 : _a.containerBounds;
  return screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom;
};
shouldHandlePointerEvent_fn = function(event, options = {}) {
  const { allowHover = false } = options;
  if (__privateMethod(this, _InputControl_instances, isPointerTracked_fn).call(this, event.pointerId)) {
    return true;
  }
  if (allowHover) {
    return __privateMethod(this, _InputControl_instances, isEventWithinEngine_fn).call(this, event.target);
  }
  return __privateMethod(this, _InputControl_instances, isEventWithinEngine_fn).call(this, event.target);
};
shouldHandleWheelEvent_fn = function(event) {
  return __privateMethod(this, _InputControl_instances, isEventWithinEngine_fn).call(this, event.target);
};
handleMultiPointer_fn = function(e) {
  var _a, _b;
  const numKeys = Object.keys(this.globalPointerDict).length;
  if (numKeys >= 1) {
    for (const pointer of Object.values(this.globalPointerDict)) {
      const thisGID = this._isGlobal ? GLOBAL_GID : this._ownerGID;
      if (thisGID != pointer.callerGID) {
        continue;
      }
      pointer.moveCount++;
      const gesture = this.globalGestureDict[pointer.id];
      if (!gesture) {
        continue;
      }
      for (const member of gesture.memberList) {
        const startPosition = member.getCoordinates(
          pointer.startX,
          pointer.startY
        );
        const currentPosition = member.getCoordinates(pointer.x, pointer.y);
        const deltaCoordinates = {
          x: currentPosition.x - startPosition.x,
          y: currentPosition.y - startPosition.y,
          cameraX: currentPosition.cameraX - startPosition.cameraX,
          cameraY: currentPosition.cameraY - startPosition.cameraY,
          screenX: currentPosition.screenX - startPosition.screenX,
          screenY: currentPosition.screenY - startPosition.screenY
        };
        (_b = (_a = member.event).drag) == null ? void 0 : _b.call(_a, {
          gid: member._isGlobal ? GLOBAL_GID : member._ownerGID,
          pointerId: pointer.id,
          start: startPosition,
          position: currentPosition,
          delta: deltaCoordinates,
          button: e.buttons
        });
      }
    }
  }
  if (numKeys >= 2) {
    if (this._isGlobal) {
      this._detectAndFirePinchGestures();
    } else {
      const globalInput = this.globalInputEngine;
      if (globalInput) {
        globalInput._inputControl._detectAndFirePinchGestures();
      }
    }
  }
};
const DEFAULT_GLOBAL_INPUT_CONFIG = {
  maxSimultaneousDrags: Infinity
};
class GlobalInputControl {
  constructor(global, config = {}) {
    __privateAdd(this, _document);
    __publicField(this, "global");
    __publicField(this, "_inputControl");
    __publicField(this, "globalCallbacks");
    __publicField(this, "_pointerDict");
    __publicField(this, "_gestureDict");
    __publicField(this, "_event");
    __publicField(this, "event");
    /**
     * Configuration options for global input handling.
     */
    __publicField(this, "config");
    this.global = global;
    __privateSet(this, _document, document);
    this.config = { ...DEFAULT_GLOBAL_INPUT_CONFIG, ...config };
    this._inputControl = new InputControl({ global }, true, null);
    this._inputControl.addCursorEventListener(
      __privateGet(this, _document)
    );
    this.globalCallbacks = {
      pointerDown: {},
      pointerMove: {},
      pointerUp: {},
      mouseWheel: {},
      dragStart: {},
      drag: {},
      dragEnd: {},
      pinchStart: {},
      pinch: {},
      pinchEnd: {}
    };
    this._pointerDict = {};
    this._gestureDict = {};
    const transformPosition = (pos, camera) => {
      if (!pos || pos.screenX == null || pos.screenY == null || !camera) {
        return pos;
      }
      const [cameraX, cameraY] = camera.getCameraFromScreen(pos.screenX, pos.screenY);
      const [worldX, worldY] = camera.getWorldFromCamera(cameraX, cameraY);
      return {
        x: worldX,
        y: worldY,
        cameraX,
        cameraY,
        screenX: pos.screenX,
        screenY: pos.screenY
      };
    };
    const transformPinchPointerList = (pointerList, camera) => {
      if (!pointerList || !camera) {
        return pointerList;
      }
      return pointerList.map((pos) => transformPosition(pos, camera));
    };
    for (const [key] of Object.entries(this.globalCallbacks)) {
      this._inputControl.event[key] = (prop) => {
        for (const { callback, engine } of Object.values(
          this.globalCallbacks[key]
        )) {
          const transformWithEngine = (targetEngine) => {
            if (!(targetEngine == null ? void 0 : targetEngine.camera)) {
              return prop;
            }
            const transformed = { ...prop };
            if (prop.position) {
              transformed.position = transformPosition(prop.position, targetEngine.camera);
            }
            if (prop.start) {
              if (prop.start.pointerList) {
                transformed.start = {
                  ...prop.start,
                  pointerList: transformPinchPointerList(prop.start.pointerList, targetEngine.camera)
                };
              } else {
                transformed.start = transformPosition(prop.start, targetEngine.camera);
              }
            }
            if (prop.end) {
              if (prop.end.pointerList) {
                transformed.end = {
                  ...prop.end,
                  pointerList: transformPinchPointerList(prop.end.pointerList, targetEngine.camera)
                };
              } else {
                transformed.end = transformPosition(prop.end, targetEngine.camera);
              }
            }
            if (prop.delta) {
              transformed.delta = transformPosition(prop.delta, targetEngine.camera);
            }
            if (prop.pointerList) {
              transformed.pointerList = transformPinchPointerList(prop.pointerList, targetEngine.camera);
            }
            return transformed;
          };
          if (!engine) {
            if (this.global && this.global.engines && this.global.engines.size > 0) {
              for (const currentEngine of this.global.engines) {
                callback(transformWithEngine(currentEngine));
              }
            } else {
              callback(prop);
            }
          } else {
            callback(transformWithEngine(engine));
          }
        }
      };
    }
    this._event = {
      pointerDown: null,
      pointerMove: null,
      pointerUp: null,
      mouseWheel: null,
      dragStart: null,
      drag: null,
      dragEnd: null,
      pinchStart: null,
      pinch: null,
      pinchEnd: null
    };
    this.event = new Proxy(this._event, {
      set: (_target, prop, value) => {
        if (value != null) {
          this.subscribeGlobalCursorEvent(
            prop,
            GLOBAL_GID,
            value.bind(this),
            null
          );
        } else {
          this.unsubscribeGlobalCursorEvent(
            prop,
            GLOBAL_GID
          );
        }
        return true;
      }
    });
  }
  destroy() {
    this._inputControl.destroy();
    this.globalCallbacks = {
      pointerDown: {},
      pointerMove: {},
      pointerUp: {},
      mouseWheel: {},
      dragStart: {},
      drag: {},
      dragEnd: {},
      pinchStart: {},
      pinch: {},
      pinchEnd: {}
    };
    this._pointerDict = {};
    this._gestureDict = {};
  }
  subscribeGlobalCursorEvent(event, gid, callback, engine) {
    this.globalCallbacks[event][gid] = { callback, engine };
  }
  unsubscribeGlobalCursorEvent(event, gid) {
    delete this.globalCallbacks[event][gid];
  }
  /**
   * Gets the number of active drag gestures.
   */
  getActiveDragCount() {
    return Object.values(this._gestureDict).filter((g) => g.type === "drag").length;
  }
  /**
   * Gets active drag gestures sorted by timestamp (oldest first).
   */
  getActiveDragsSortedByTime() {
    const drags = [];
    for (const [key, gesture] of Object.entries(this._gestureDict)) {
      if (gesture.type !== "drag") continue;
      const pointerId = parseInt(key, 10);
      const pointerData = this._pointerDict[pointerId];
      if (pointerData) {
        drags.push({
          pointerId,
          gesture,
          timestamp: pointerData.timestamp
        });
      }
    }
    return drags.sort((a, b) => a.timestamp - b.timestamp);
  }
  /**
   * Cancels the oldest drag gesture by firing dragEnd for all its members.
   * Used to enforce maxSimultaneousDrags limit.
   */
  cancelOldestDrag() {
    var _a, _b;
    const drags = this.getActiveDragsSortedByTime();
    if (drags.length === 0) return;
    const oldest = drags[0];
    const pointerData = this._pointerDict[oldest.pointerId];
    if (!pointerData) return;
    for (const member of oldest.gesture.memberList) {
      const startPosition = member.getCoordinates(pointerData.startX, pointerData.startY);
      const endPosition = member.getCoordinates(pointerData.x, pointerData.y);
      (_b = (_a = member.event).dragEnd) == null ? void 0 : _b.call(_a, {
        gid: member._isGlobal ? GLOBAL_GID : member._ownerGID,
        pointerId: oldest.pointerId,
        start: startPosition,
        end: endPosition,
        button: 0
        // No button info available for cancelled drag
      });
    }
    delete this._gestureDict[oldest.pointerId];
    delete this._pointerDict[oldest.pointerId];
  }
  /**
   * Enforces the maxSimultaneousDrags limit by cancelling oldest drags if needed.
   * Should be called after a new drag is registered.
   */
  enforceMaxDragLimit() {
    const maxDrags = this.config.maxSimultaneousDrags;
    if (maxDrags <= 0 || maxDrags === Infinity) return;
    while (this.getActiveDragCount() > maxDrags) {
      this.cancelOldestDrag();
    }
  }
}
_document = new WeakMap();
export {
  BaseObject as B,
  ElementObject as E,
  GlobalInputControl as G,
  InputControl as I,
  EventProxyFactory as a,
  detachAnimationFromOwner as d,
  getDomProperty as g
};
