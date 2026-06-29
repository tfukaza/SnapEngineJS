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
var _object, _global, _input, _dom, _owner, _parentTransform, _local, _cachedWorld, _cachedWorldEpoch, _ObjectTransform_instances, getCachedWorld_fn, worldToLocal_fn, markLocalChange_fn, _global2, _engine, _transform, _transformParent, _transformChildren, _CoreObject_instances, detachTransformParent_fn, validateNewTransformParent_fn, _id, _parent, _children, _colliderList, _animationList, _globalInput, _BaseObject_instances, validateNewParent_fn, detachFromParent_fn, attachChild_fn, setParent_fn, detachFromPublicParent_fn, _element, _style, _classList, _dataAttribute, _property, _domProperty, _resizeObserver, _mutationObserver, _state, _ElementObject_instances, assignElement_fn;
function getDomProperty(engine, dom) {
  const rect = dom.getBoundingClientRect();
  const css = window.getComputedStyle(dom);
  const margin_top = parseFloat(css.marginTop) || 0;
  const margin_right = parseFloat(css.marginRight) || 0;
  const margin_bottom = parseFloat(css.marginBottom) || 0;
  const margin_left = parseFloat(css.marginLeft) || 0;
  const padding_top = parseFloat(css.paddingTop) || 0;
  const padding_right = parseFloat(css.paddingRight) || 0;
  const padding_bottom = parseFloat(css.paddingBottom) || 0;
  const padding_left = parseFloat(css.paddingLeft) || 0;
  const border_top = parseFloat(css.borderTopWidth) || 0;
  const border_right = parseFloat(css.borderRightWidth) || 0;
  const border_bottom = parseFloat(css.borderBottomWidth) || 0;
  const border_left = parseFloat(css.borderLeftWidth) || 0;
  if (engine == null || engine.camera == null) {
    return {
      height: rect.height,
      width: rect.width,
      x: rect.left,
      y: rect.top,
      cameraX: rect.left,
      cameraY: rect.top,
      screenX: rect.left,
      screenY: rect.top,
      margin: {
        top: margin_top,
        right: margin_right,
        bottom: margin_bottom,
        left: margin_left
      },
      padding: {
        top: padding_top,
        right: padding_right,
        bottom: padding_bottom,
        left: padding_left
      },
      border: {
        top: border_top,
        right: border_right,
        bottom: border_bottom,
        left: border_left
      }
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
    screenY: rect.top,
    margin: {
      top: margin_top,
      right: margin_right,
      bottom: margin_bottom,
      left: margin_left
    },
    padding: {
      top: padding_top,
      right: padding_right,
      bottom: padding_bottom,
      left: padding_left
    },
    border: {
      top: border_top,
      right: border_right,
      bottom: border_bottom,
      left: border_left
    }
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
function cloneDomProperty(prop) {
  return {
    x: prop.x,
    y: prop.y,
    height: prop.height,
    width: prop.width,
    scaleX: prop.scaleX,
    scaleY: prop.scaleY,
    screenX: prop.screenX,
    screenY: prop.screenY,
    margin: { ...prop.margin },
    padding: { ...prop.padding },
    border: { ...prop.border }
  };
}
class EventCallback {
  constructor(object) {
    __privateAdd(this, _object);
    __privateAdd(this, _global);
    __privateAdd(this, _input);
    __privateAdd(this, _dom);
    __publicField(this, "global");
    __publicField(this, "input");
    __publicField(this, "dom");
    __privateSet(this, _object, object);
    __privateSet(this, _global, {
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
    });
    this.global = new Proxy(__privateGet(this, _global), {
      set: (_, prop, value) => {
        var _a, _b;
        if (value == null) {
          (_a = __privateGet(this, _object).engine) == null ? void 0 : _a.input.unsubscribeGlobalCursorEvent(
            prop,
            __privateGet(this, _object).id
          );
        } else {
          (_b = __privateGet(this, _object).engine) == null ? void 0 : _b.input.subscribeGlobalCursorEvent(
            prop,
            __privateGet(this, _object).id,
            value.bind(__privateGet(this, _object)),
            __privateGet(this, _object).engine
          );
        }
        return true;
      }
    });
    __privateSet(this, _input, {
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
    });
    this.input = EventProxyFactory(
      __privateGet(this, _object),
      __privateGet(this, _input)
    );
    __privateSet(this, _dom, {
      onAssignDom: null,
      onResize: null,
      onAfterReadDom: null
    });
    this.dom = EventProxyFactory(__privateGet(this, _object), __privateGet(this, _dom));
  }
}
_object = new WeakMap();
_global = new WeakMap();
_input = new WeakMap();
_dom = new WeakMap();
let transformEpoch = 0;
class ObjectTransform {
  // world: TransformView;
  // local: TransformView;
  constructor(owner) {
    __privateAdd(this, _ObjectTransform_instances);
    __privateAdd(this, _owner);
    __privateAdd(this, _parentTransform, null);
    __privateAdd(this, _local, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    });
    __privateAdd(this, _cachedWorld, {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    });
    __privateAdd(this, _cachedWorldEpoch, -1);
    __privateSet(this, _owner, owner);
  }
  // get(space: TransformSpace, property: keyof TransformProperty): number {
  //   if (space === "local") {
  //     return this.#local[property];
  //   }
  //   return this.#getCachedWorld()[property];
  // }
  // set(space: TransformSpace, property: keyof TransformProperty, value: number) {
  //   const transform = {
  //     ...(space === "local" ? this.#local : this.#getCachedWorld()),
  //     [property]: value,
  //   };
  //   if (space === "local") {
  //     this.setLocal(transform);
  //     this.#owner.notifyTransformChange();
  //   } else {
  //     this.setWorld(transform);
  //   }
  // }
  getWorld() {
    return __privateMethod(this, _ObjectTransform_instances, getCachedWorld_fn).call(this);
  }
  // #getWorld(property: keyof TransformProperty): number {
  //   return this.#getCachedWorld()[property];
  // }
  setWorld(transform) {
    __privateSet(this, _local, __privateMethod(this, _ObjectTransform_instances, worldToLocal_fn).call(this, transform));
    __privateMethod(this, _ObjectTransform_instances, markLocalChange_fn).call(this);
    __privateGet(this, _owner).notifyTransformChange();
  }
  // #setWorld(property: keyof TransformProperty, value: number) {
  //   const world = this.#getCachedWorld();
  //   // Safe to modify the cache since it will be invalidated anyways
  //   world[property] = value;
  //   const local = this.#worldToLocal(world);
  //   this.#localX = local.x;
  //   this.#localY = local.y;
  //   this.#localScaleX = local.scaleX;
  //   this.#localScaleY = local.scaleY;
  //   this.#markLocalChange();
  // }
  getLocal() {
    return __privateGet(this, _local);
  }
  setLocal(transform) {
    __privateSet(this, _local, transform);
    __privateMethod(this, _ObjectTransform_instances, markLocalChange_fn).call(this);
  }
  setParentTransform(parent) {
    __privateSet(this, _parentTransform, parent ? parent.transform ?? null : null);
    __privateMethod(this, _ObjectTransform_instances, markLocalChange_fn).call(this);
  }
}
_owner = new WeakMap();
_parentTransform = new WeakMap();
_local = new WeakMap();
_cachedWorld = new WeakMap();
_cachedWorldEpoch = new WeakMap();
_ObjectTransform_instances = new WeakSet();
getCachedWorld_fn = function() {
  var _a;
  if (__privateGet(this, _cachedWorldEpoch) === transformEpoch) {
    return __privateGet(this, _cachedWorld);
  }
  const parentWorld = __privateGet(this, _parentTransform) ? __privateMethod(_a = __privateGet(this, _parentTransform), _ObjectTransform_instances, getCachedWorld_fn).call(_a) : null;
  if (parentWorld) {
    __privateGet(this, _cachedWorld).x = parentWorld.x + __privateGet(this, _local).x * parentWorld.scaleX;
    __privateGet(this, _cachedWorld).y = parentWorld.y + __privateGet(this, _local).y * parentWorld.scaleY;
    __privateGet(this, _cachedWorld).scaleX = parentWorld.scaleX * __privateGet(this, _local).scaleX;
    __privateGet(this, _cachedWorld).scaleY = parentWorld.scaleY * __privateGet(this, _local).scaleY;
  } else {
    __privateGet(this, _cachedWorld).x = __privateGet(this, _local).x;
    __privateGet(this, _cachedWorld).y = __privateGet(this, _local).y;
    __privateGet(this, _cachedWorld).scaleX = __privateGet(this, _local).scaleX;
    __privateGet(this, _cachedWorld).scaleY = __privateGet(this, _local).scaleY;
  }
  __privateSet(this, _cachedWorldEpoch, transformEpoch);
  return __privateGet(this, _cachedWorld);
};
worldToLocal_fn = function(transform) {
  var _a;
  const parentTransform = __privateGet(this, _parentTransform) ? __privateMethod(_a = __privateGet(this, _parentTransform), _ObjectTransform_instances, getCachedWorld_fn).call(_a) : null;
  if (!parentTransform) {
    return { ...transform };
  }
  if (parentTransform.scaleX === 0 || parentTransform.scaleY === 0) {
    throw new Error("Cannot set world transform under a zero-scale parent.");
  }
  return {
    x: (transform.x - parentTransform.x) / parentTransform.scaleX,
    y: (transform.y - parentTransform.y) / parentTransform.scaleY,
    scaleX: transform.scaleX / parentTransform.scaleX,
    scaleY: transform.scaleY / parentTransform.scaleY
  };
};
markLocalChange_fn = function() {
  transformEpoch++;
};
class CoreObject {
  // worldTransform: TransformView;
  // localTransform: TransformView;
  constructor(engine) {
    __privateAdd(this, _CoreObject_instances);
    __privateAdd(this, _global2);
    __privateAdd(this, _engine);
    __privateAdd(this, _transform);
    __privateAdd(this, _transformParent, null);
    __privateAdd(this, _transformChildren, []);
    const global = engine.global;
    if (!global) {
      throw new Error("CoreObject requires an active Engine instance.");
    }
    __privateSet(this, _engine, engine);
    __privateSet(this, _global2, global);
    __privateSet(this, _transform, new ObjectTransform(this));
  }
  get global() {
    return __privateGet(this, _global2);
  }
  set global(global) {
    __privateSet(this, _global2, global);
  }
  get engine() {
    return __privateGet(this, _engine);
  }
  set engine(engine) {
    __privateSet(this, _engine, engine);
  }
  get transformParent() {
    return __privateGet(this, _transformParent);
  }
  get transformChildren() {
    return __privateGet(this, _transformChildren);
  }
  get transform() {
    return __privateGet(this, _transform);
  }
  get worldTransform() {
    return __privateGet(this, _transform).getWorld();
  }
  set worldTransform(transform) {
    __privateGet(this, _transform).setWorld({
      x: transform.x ?? this.worldTransform.x,
      y: transform.y ?? this.worldTransform.y,
      scaleX: transform.scaleX ?? this.worldTransform.scaleX,
      scaleY: transform.scaleY ?? this.worldTransform.scaleY
    });
  }
  get localTransform() {
    return __privateGet(this, _transform).getLocal();
  }
  set localTransform(transform) {
    __privateGet(this, _transform).setLocal({
      x: transform.x ?? this.localTransform.x,
      y: transform.y ?? this.localTransform.y,
      scaleX: transform.scaleX ?? this.localTransform.scaleX,
      scaleY: transform.scaleY ?? this.localTransform.scaleY
    });
  }
  // TODO: Factor in camera scaling
  get cameraPosition() {
    var _a;
    const world = this.worldTransform;
    return ((_a = this.engine.camera) == null ? void 0 : _a.getCameraFromWorld(world.x, world.y)) ?? [0, 0];
  }
  set cameraPosition(position) {
    var _a, _b;
    const world = ((_b = (_a = this.engine) == null ? void 0 : _a.camera) == null ? void 0 : _b.getWorldFromCamera(...position)) ?? [
      0,
      0
    ];
    this.worldTransform = { x: world[0], y: world[1] };
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
  notifyTransformChange() {
    this.onTransformChange();
  }
  onTransformChange() {
  }
  getWorldTransform() {
    return __privateGet(this, _transform).getWorld();
  }
  getTransformEpoch() {
    return transformEpoch;
  }
  setWorldTransform(transform) {
    __privateGet(this, _transform).setWorld(transform);
  }
  setTransformParent(parent, preserveWorld) {
    __privateMethod(this, _CoreObject_instances, validateNewTransformParent_fn).call(this, parent);
    if (parent === __privateGet(this, _transformParent)) {
      return;
    }
    const worldTransform = preserveWorld ? __privateGet(this, _transform).getWorld() : null;
    __privateMethod(this, _CoreObject_instances, detachTransformParent_fn).call(this, false);
    __privateSet(this, _transformParent, parent);
    __privateGet(this, _transform).setParentTransform(parent);
    if (parent) {
      __privateGet(parent, _transformChildren).push(this);
    }
    if (worldTransform) {
      __privateGet(this, _transform).setWorld(worldTransform);
    } else {
      this.notifyTransformChange();
    }
  }
  detachTransformParent(preserveWorld) {
    __privateMethod(this, _CoreObject_instances, detachTransformParent_fn).call(this, preserveWorld);
  }
}
_global2 = new WeakMap();
_engine = new WeakMap();
_transform = new WeakMap();
_transformParent = new WeakMap();
_transformChildren = new WeakMap();
_CoreObject_instances = new WeakSet();
detachTransformParent_fn = function(preserveWorld) {
  if (!__privateGet(this, _transformParent)) {
    return;
  }
  const worldTransform = preserveWorld ? __privateGet(this, _transform).getWorld() : null;
  const parent = __privateGet(this, _transformParent);
  __privateSet(parent, _transformChildren, __privateGet(parent, _transformChildren).filter(
    (child) => child !== this
  ));
  __privateSet(this, _transformParent, null);
  __privateGet(this, _transform).setParentTransform(null);
  if (worldTransform) {
    __privateGet(this, _transform).setWorld(worldTransform);
  } else {
    this.notifyTransformChange();
  }
};
validateNewTransformParent_fn = function(parent) {
  if (parent === null) {
    return;
  }
  if (parent === this) {
    throw new Error("An object cannot be parented to itself.");
  }
  let ancestor = parent;
  while (ancestor) {
    if (ancestor === this) {
      throw new Error("An object cannot be parented to one of its children.");
    }
    ancestor = ancestor.transformParent;
  }
};
class FrameTask {
  constructor(object, callback, id = null) {
    __publicField(this, "id");
    __publicField(this, "object");
    __publicField(this, "callback");
    this.id = id ?? object.global.createId();
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
  cancel() {
    this.callback = null;
  }
}
const animationOwnerMap = /* @__PURE__ */ new WeakMap();
class BaseObject extends CoreObject {
  constructor(engine, parent = null) {
    var _a;
    super(engine);
    __privateAdd(this, _BaseObject_instances);
    __privateAdd(this, _id);
    __privateAdd(this, _parent, null);
    __privateAdd(this, _children, []);
    __privateAdd(this, _colliderList, []);
    __privateAdd(this, _animationList, []);
    __privateAdd(this, _globalInput);
    __publicField(this, "event");
    __publicField(this, "globalInput");
    __publicField(this, "isDeleteRequested", false);
    __privateSet(this, _id, this.global.createId());
    this.global.registerObject(this);
    __privateSet(this, _colliderList, []);
    this.event = new EventCallback(this);
    __privateSet(this, _globalInput, {
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
    });
    this.globalInput = new Proxy(__privateGet(this, _globalInput), {
      set: (_, prop, value) => {
        var _a2, _b;
        if (value == null) {
          (_a2 = this.engine) == null ? void 0 : _a2.input.unsubscribeGlobalCursorEvent(prop, this.id);
        } else {
          (_b = this.engine) == null ? void 0 : _b.input.subscribeGlobalCursorEvent(
            prop,
            this.id,
            value.bind(this),
            this.engine
          );
        }
        return true;
      }
    });
    if (parent) {
      __privateMethod(_a = parent, _BaseObject_instances, attachChild_fn).call(_a, this, false);
    }
  }
  get id() {
    return __privateGet(this, _id);
  }
  set id(id) {
    __privateSet(this, _id, id);
  }
  get parent() {
    return __privateGet(this, _parent);
  }
  set parent(parent) {
    __privateMethod(this, _BaseObject_instances, setParent_fn).call(this, parent, true);
  }
  get children() {
    return __privateGet(this, _children);
  }
  set children(children) {
    __privateSet(this, _children, children);
  }
  get colliderList() {
    return __privateGet(this, _colliderList);
  }
  set colliderList(colliderList) {
    __privateSet(this, _colliderList, colliderList);
  }
  get animationList() {
    return __privateGet(this, _animationList);
  }
  set animationList(animationList) {
    __privateSet(this, _animationList, animationList);
  }
  get animation() {
    if (this.animationList.length === 0) {
      return null;
    }
    return this.animationList[this.animationList.length - 1];
  }
  destroy() {
    this.isDeleteRequested = true;
    for (const collider of [...this.colliderList]) {
      collider.destroy();
    }
    this.colliderList = [];
    this.cancelAnimations();
    for (const queue of Object.values(this.global.queue)) {
      queue.delete(this.id);
    }
    if (__privateGet(this, _parent)) {
      __privateGet(this, _parent).removeChild(this);
    }
    this.global.unregisterObject(this);
  }
  appendChild(child) {
    __privateMethod(this, _BaseObject_instances, attachChild_fn).call(this, child, true);
  }
  removeChild(child) {
    var _a;
    if (__privateGet(child, _parent) !== this) {
      return;
    }
    __privateMethod(_a = child, _BaseObject_instances, detachFromParent_fn).call(_a, true);
  }
  /**
   * Queues an update callback to be executed during a specific stage of the render pipeline.
   * @param callback - Optional callback function to execute during the stage
   * @param config - Render stage and optional queue identifier
   * @returns The queue entry object
   */
  schedule(callback, config) {
    const request = new FrameTask(this, callback, config.queueId);
    const queue = this.global.queue[config.stage];
    if (!queue.get(this.id)) {
      queue.set(this.id, /* @__PURE__ */ new Map());
    }
    queue.get(this.id).set(request.id, request);
    return request;
  }
  requestDestroy() {
    return this.schedule(() => this.destroyDom(), {
      stage: "WRITE_2",
      queueId: "destroy"
    });
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
  addCollider(collider) {
    var _a;
    if (collider.parent !== this) {
      collider.parent = this;
    }
    if (!this.colliderList.includes(collider)) {
      this.colliderList.push(collider);
    }
    if (!this.engine) {
      return;
    }
    (_a = this.engine.collisionEngine) == null ? void 0 : _a.addObject(collider);
  }
  addAnimation(animation, options = {}) {
    var _a, _b;
    (_a = this.engine) == null ? void 0 : _a.enableAnimationEngine();
    const replaceExisting = options.replaceExisting ?? true;
    if (replaceExisting) {
      this.cancelAnimations();
    }
    this.animationList.push(animation);
    animationOwnerMap.set(animation, this);
    (_b = this.engine) == null ? void 0 : _b.animationList.push(animation);
    return animation;
  }
  cancelAnimations() {
    for (const existingAnimation of [...this.animationList]) {
      existingAnimation.requestDelete = true;
      existingAnimation.cancel();
      this.removeAnimationReference(existingAnimation);
    }
  }
  removeAnimationReference(animation) {
    this.animationList = this.animationList.filter(
      (anim) => anim !== animation
    );
    animationOwnerMap.delete(animation);
  }
  /**
   * Convenience method to create and add a sequence of animations to this object.
   *
   * @param animations - Array of AnimationInterface objects to play as a sequence
   * @returns The created sequence animation
   */
  async animateSequence(animations) {
    const { SequenceObject } = await import("./animation.mjs");
    const sequence = new SequenceObject();
    for (const animation of animations) {
      sequence.add(animation);
    }
    return this.addAnimation(sequence, { replaceExisting: true });
  }
  getCurrentStats() {
    return {
      timestamp: Date.now()
    };
  }
  addDebugPoint(x, y, color = "red", persistent = false, id = "", tag) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.id}-${id}`] = {
      objectId: this.id,
      type: "point",
      color,
      x,
      y,
      persistent,
      id: `${this.id}-${id}`,
      tag
    };
  }
  addDebugRect(x, y, width, height, color = "red", persistent = false, id = "", filled = true, lineWidth = 1, tag) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.id}-${id}`] = {
      objectId: this.id,
      type: "rect",
      color,
      x,
      y,
      width,
      height,
      persistent,
      id: `${this.id}-${id}`,
      filled,
      lineWidth,
      tag
    };
  }
  addDebugLine(x1, y1, x2, y2, color = "red", persistent = false, id = "", lineWidth = 2, tag, arrowEnd, arrowStart, arrowSize) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.id}-${id}`] = {
      objectId: this.id,
      type: "line",
      color,
      x: x1,
      y: y1,
      x2,
      y2,
      persistent,
      id: `${this.id}-${id}`,
      lineWidth,
      tag,
      arrowEnd,
      arrowStart,
      arrowSize
    };
  }
  addDebugCircle(x, y, radius, color = "red", persistent = false, id = "", tag) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.id}-${id}`] = {
      objectId: this.id,
      type: "circle",
      color,
      x,
      y,
      radius,
      persistent,
      id: `${this.id}-${id}`,
      tag
    };
  }
  addDebugText(x, y, text, color = "red", persistent = false, id = "", tag) {
    if (!this.engine) return;
    this.engine.debugMarkerList[`${this.id}-${id}`] = {
      objectId: this.id,
      x,
      y,
      type: "text",
      color,
      text,
      persistent,
      id: `${this.id}-${id}`,
      tag
    };
  }
  clearDebugMarker(id) {
    if (!this.engine) return;
    delete this.engine.debugMarkerList[`${this.id}-${id}`];
  }
  clearAllDebugMarkers() {
    if (!this.engine) return;
    for (const marker of Object.values(this.engine.debugMarkerList)) {
      if (marker.objectId == this.id) {
        delete this.engine.debugMarkerList[marker.id];
      }
    }
  }
}
_id = new WeakMap();
_parent = new WeakMap();
_children = new WeakMap();
_colliderList = new WeakMap();
_animationList = new WeakMap();
_globalInput = new WeakMap();
_BaseObject_instances = new WeakSet();
validateNewParent_fn = function(parent) {
  if (parent === null) {
    return;
  }
  if (parent === this) {
    throw new Error("An object cannot be parented to itself.");
  }
  let ancestor = parent;
  while (ancestor) {
    if (ancestor === this) {
      throw new Error("An object cannot be parented to one of its children.");
    }
    ancestor = ancestor.parent;
  }
};
detachFromParent_fn = function(preserveWorld) {
  if (!__privateGet(this, _parent)) {
    return;
  }
  const parent = __privateGet(this, _parent);
  __privateSet(parent, _children, __privateGet(parent, _children).filter((child) => child !== this));
  __privateSet(this, _parent, null);
  this.setTransformParent(null, preserveWorld);
};
attachChild_fn = function(child, preserveWorld) {
  var _a, _b;
  __privateMethod(_a = child, _BaseObject_instances, validateNewParent_fn).call(_a, this);
  if (__privateGet(child, _parent) === this) {
    return;
  }
  __privateMethod(_b = child, _BaseObject_instances, detachFromPublicParent_fn).call(_b);
  __privateSet(child, _parent, this);
  __privateGet(this, _children).push(child);
  child.setTransformParent(this, preserveWorld);
};
setParent_fn = function(parent, preserveWorld) {
  var _a;
  __privateMethod(this, _BaseObject_instances, validateNewParent_fn).call(this, parent);
  if (parent === __privateGet(this, _parent)) {
    return;
  }
  if (parent) {
    __privateMethod(_a = parent, _BaseObject_instances, attachChild_fn).call(_a, this, preserveWorld);
  } else {
    __privateMethod(this, _BaseObject_instances, detachFromParent_fn).call(this, preserveWorld);
  }
};
detachFromPublicParent_fn = function() {
  if (!__privateGet(this, _parent)) {
    return;
  }
  const parent = __privateGet(this, _parent);
  __privateSet(parent, _children, __privateGet(parent, _children).filter((child) => child !== this));
  __privateSet(this, _parent, null);
};
function detachAnimationFromOwner(animation) {
  const owner = animationOwnerMap.get(animation);
  if (!owner) {
    return;
  }
  owner.removeAnimationReference(animation);
}
function createDomProperty() {
  return {
    x: 0,
    y: 0,
    height: 0,
    width: 0,
    scaleX: 1,
    scaleY: 1,
    screenX: 0,
    screenY: 0,
    margin: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    padding: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    border: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
}
function copyDomPropertyValue(target, source) {
  Object.assign(target, {
    ...source,
    margin: { ...source.margin },
    padding: { ...source.padding },
    border: { ...source.border }
  });
}
const _ElementObject = class _ElementObject extends BaseObject {
  constructor(engine, parent = null) {
    super(engine, parent);
    __privateAdd(this, _ElementObject_instances);
    __privateAdd(this, _element, null);
    __privateAdd(this, _style, {});
    __privateAdd(this, _classList, []);
    __privateAdd(this, _dataAttribute, {});
    __privateAdd(this, _property);
    __privateAdd(this, _domProperty);
    __privateAdd(this, _resizeObserver, null);
    __privateAdd(this, _mutationObserver, null);
    __privateAdd(this, _state, {});
    __publicField(this, "state");
    __publicField(this, "transformMode");
    __publicField(this, "transformOrigin");
    __privateSet(this, _property, createDomProperty());
    __privateSet(this, _domProperty, []);
    for (let i = 0; i < 3; i++) {
      __privateGet(this, _domProperty).push(createDomProperty());
    }
    this.transformMode = "direct";
    this.transformOrigin = null;
    this.state = new Proxy(__privateGet(this, _state), {
      set: (target, prop, value) => {
        target[prop] = value;
        return true;
      }
    });
  }
  get currentDomProperty() {
    return __privateGet(this, _property);
  }
  get style() {
    return __privateGet(this, _style);
  }
  set style(style) {
    __privateSet(this, _style, Object.assign(__privateGet(this, _style), style));
  }
  get classList() {
    return __privateGet(this, _classList);
  }
  set classList(classList) {
    __privateSet(this, _classList, classList);
  }
  get dataAttribute() {
    return __privateGet(this, _dataAttribute);
  }
  set dataAttribute(dataAttribute) {
    __privateSet(this, _dataAttribute, Object.assign(__privateGet(this, _dataAttribute), dataAttribute));
  }
  get element() {
    return __privateGet(this, _element);
  }
  set element(element) {
    var _a, _b;
    if (!element) {
      return;
    }
    __privateMethod(this, _ElementObject_instances, assignElement_fn).call(this, element);
    (_b = (_a = this.event.dom).onAssignDom) == null ? void 0 : _b.call(_a);
  }
  destroy() {
    this.destroyDom();
    super.destroy();
  }
  getDomProperty(stage = null) {
    let index = 0;
    if (stage == "READ_1") {
      index = 0;
    } else if (stage == "READ_2") {
      index = 1;
    } else if (stage == "READ_3" || stage == null) {
      index = 2;
    } else {
      throw new Error(`Invalid stage: ${stage}`);
    }
    return __privateGet(this, _domProperty)[index];
  }
  copyDomProperty(fromStage, toStage) {
    copyDomPropertyValue(
      this.getDomProperty(toStage),
      this.getDomProperty(fromStage)
    );
  }
  /**
   * Save the DOM property to the transform property.
   * Currently only saves the x and y properties.
   * This function assumes that the element position has already been read from the DOM.
   */
  saveDomProperety(stage = null) {
    let currentStage = stage ?? this.global.currentStage;
    currentStage = currentStage == "IDLE" ? "READ_2" : currentStage;
    const property = this.getDomProperty(currentStage);
    this.worldTransform = { x: property.x, y: property.y };
  }
  readDom(config = {}, stage = null) {
    const currentStage = stage ?? this.global.currentStage;
    if (!["READ_1", "READ_2", "READ_3", "IDLE"].includes(currentStage)) {
      throw new Error(
        `Reading DOM during ${currentStage} is prohibited. Only READ_1, READ_2, READ_3, and IDLE are allowed.`
      );
    }
    if (currentStage === "IDLE") {
      console.warn(`Reading DOM during IDLE stage may cause layout thrashing`);
    }
    if (!__privateGet(this, _element)) {
      throw new Error("Element is not set");
    }
    const property = getDomProperty(this.engine, __privateGet(this, _element));
    const transform = __privateGet(this, _element).style.transform;
    let transformApplied = {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1
    };
    if (transform && transform != "none" && config.unapplyTransform) {
      transformApplied = parseTransformString(transform);
    }
    __privateGet(this, _property).height = property.height / transformApplied.scaleY;
    __privateGet(this, _property).width = property.width / transformApplied.scaleX;
    __privateGet(this, _property).x = property.x - transformApplied.x;
    __privateGet(this, _property).y = property.y - transformApplied.y;
    __privateGet(this, _property).screenX = property.screenX;
    __privateGet(this, _property).screenY = property.screenY;
    __privateGet(this, _property).margin = property.margin;
    __privateGet(this, _property).padding = property.padding;
    __privateGet(this, _property).border = property.border;
    if (["READ_1", "READ_2", "READ_3"].includes(currentStage)) {
      copyDomPropertyValue(
        this.getDomProperty(currentStage),
        __privateGet(this, _property)
      );
    }
    return __privateGet(this, _property);
  }
  readDomRecursive(config = {}) {
    const stage = this.global.currentStage;
    if (!["READ_1", "READ_2", "READ_3"].includes(stage)) {
      throw new Error(`Invalid stage: ${stage}`);
    }
    this.readDom(config);
    if (config.saveDomProperety || config.saveWorldPosition) {
      this.saveDomProperety(stage);
    }
    for (const child of this.children) {
      if (child instanceof _ElementObject) {
        child.readDomRecursive(config);
      }
    }
  }
  requestFLIP(writeCallback, transformCallback) {
    this.schedule(
      () => {
        this.readDom({ unapplyTransform: false });
        this.saveDomProperety("READ_1");
      },
      { stage: "READ_1", queueId: "READ_1" }
    );
    this.schedule(
      async () => {
        this.writeDom();
        await writeCallback();
      },
      { stage: "WRITE_1", queueId: "WRITE_1" }
    );
    this.schedule(
      () => {
        this.readDom({ unapplyTransform: false });
        this.saveDomProperety("READ_2");
      },
      { stage: "READ_2", queueId: "READ_2" }
    );
    this.schedule(async () => await transformCallback(), {
      stage: "WRITE_2",
      queueId: "WRITE_2"
    });
  }
  writeDom() {
    const currentStage = this.global.currentStage;
    if (!["WRITE_1", "WRITE_2", "WRITE_3", "IDLE"].includes(currentStage)) {
      throw new Error(
        `Writing DOM during ${currentStage} is prohibited. Only WRITE_1, WRITE_2, WRITE_3, and IDLE are allowed.`
      );
    }
    if (!__privateGet(this, _element)) {
      throw new Error("Element is not set");
    }
    setDomStyle(__privateGet(this, _element), __privateGet(this, _style));
    if (__privateGet(this, _classList).length > 0) {
      const nextClassList = new Set(__privateGet(this, _classList));
      __privateGet(this, _element).classList.forEach((className) => {
        if (!nextClassList.has(className)) {
          __privateGet(this, _element).classList.remove(className);
        }
      });
      for (const className of nextClassList) {
        __privateGet(this, _element).classList.add(className);
      }
    }
    for (const [key, value] of Object.entries(__privateGet(this, _dataAttribute))) {
      __privateGet(this, _element).setAttribute(`data-${key}`, value);
    }
    __privateGet(this, _element).setAttribute("data-engine-id", this.id);
    super.writeDom();
  }
  writeTransform() {
    const currentStage = this.global.currentStage;
    if (!["WRITE_1", "WRITE_2", "WRITE_3", "IDLE"].includes(currentStage)) {
      throw new Error(
        `Writing transform during ${currentStage} is prohibited. Only WRITE_1, WRITE_2, WRITE_3, and IDLE are allowed.`
      );
    }
    if (!__privateGet(this, _element)) {
      throw new Error("Element is not set");
    }
    let transformStyle = {
      transform: ""
    };
    if (this.transformMode == "direct") {
      transformStyle = {
        transform: generateTransformString({
          x: this.worldTransform.x,
          y: this.worldTransform.y,
          scaleX: this.worldTransform.scaleX,
          scaleY: this.worldTransform.scaleY
        })
      };
    } else if (this.transformMode == "relative") {
      const [newX, newY] = [
        this.worldTransform.x - __privateGet(this, _property).x,
        this.worldTransform.y - __privateGet(this, _property).y
      ];
      transformStyle = {
        transform: generateTransformString({
          x: newX,
          y: newY,
          scaleX: this.worldTransform.scaleX,
          scaleY: this.worldTransform.scaleY
        })
      };
    } else if (this.transformMode == "origin") {
      const origin = this.transformOrigin ?? this.parent;
      if (!origin) {
        const [newX, newY] = [
          this.worldTransform.x - __privateGet(this, _property).x,
          this.worldTransform.y - __privateGet(this, _property).y
        ];
        transformStyle = {
          transform: generateTransformString({
            x: newX,
            y: newY,
            scaleX: this.worldTransform.scaleX,
            scaleY: this.worldTransform.scaleY
          })
        };
      } else {
        if (origin.worldTransform.scaleX === 0 || origin.worldTransform.scaleY === 0) {
          throw new Error(
            "Cannot write origin transform relative to a zero-scale origin."
          );
        }
        transformStyle = {
          transform: generateTransformString({
            x: (this.worldTransform.x - origin.worldTransform.x) / origin.worldTransform.scaleX,
            y: (this.worldTransform.y - origin.worldTransform.y) / origin.worldTransform.scaleY,
            scaleX: this.worldTransform.scaleX / origin.worldTransform.scaleX,
            scaleY: this.worldTransform.scaleY / origin.worldTransform.scaleY
          })
        };
      }
    } else if (this.transformMode == "none") {
      transformStyle = {
        transform: ""
      };
    }
    if (__privateGet(this, _style)["transform"] != void 0 && __privateGet(this, _style)["transform"] != "" && transformStyle["transform"] != "") {
      transformStyle["transform"] = __privateGet(this, _style)["transform"];
    }
    setDomStyle(__privateGet(this, _element), { ...__privateGet(this, _style), ...transformStyle });
    super.writeTransform();
  }
  destroyDom() {
    var _a, _b, _c;
    (_a = __privateGet(this, _resizeObserver)) == null ? void 0 : _a.disconnect();
    (_b = __privateGet(this, _mutationObserver)) == null ? void 0 : _b.disconnect();
    if (__privateGet(this, _element)) {
      (_c = this.engine) == null ? void 0 : _c.input.unregisterObjectElement(this, __privateGet(this, _element));
      __privateGet(this, _element).remove();
    }
    __privateSet(this, _element, null);
    super.destroyDom();
  }
};
_element = new WeakMap();
_style = new WeakMap();
_classList = new WeakMap();
_dataAttribute = new WeakMap();
_property = new WeakMap();
_domProperty = new WeakMap();
_resizeObserver = new WeakMap();
_mutationObserver = new WeakMap();
_state = new WeakMap();
_ElementObject_instances = new WeakSet();
assignElement_fn = function(element) {
  if (__privateGet(this, _element)) {
    this.destroyDom();
  }
  __privateSet(this, _element, element);
  this.engine.input.registerObjectElement(this, element);
  __privateSet(this, _resizeObserver, new ResizeObserver(() => {
    var _a, _b;
    (_b = (_a = this.event.dom).onResize) == null ? void 0 : _b.call(_a);
  }));
  __privateGet(this, _resizeObserver).observe(element);
  __privateSet(this, _mutationObserver, new MutationObserver(() => {
    var _a, _b;
    (_b = (_a = this.event.dom).onResize) == null ? void 0 : _b.call(_a);
  }));
};
let ElementObject = _ElementObject;
export {
  BaseObject as B,
  CoreObject as C,
  ElementObject as E,
  ObjectTransform as O,
  EventProxyFactory as a,
  cloneDomProperty as c,
  detachAnimationFromOwner as d,
  getDomProperty as g
};
