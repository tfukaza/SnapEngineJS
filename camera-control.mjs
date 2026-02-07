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
var _state, _mouseDownX, _mouseDownY, _prevCameraX, _prevCameraY;
import { E as ElementObject } from "./input-BKVYLpNZ.js";
import { C as Camera } from "./camera-DYnXUm3K.js";
const DEFAULT_CONFIG = {
  zoomLock: false,
  panLock: false
};
class CameraControl extends ElementObject {
  constructor(engine, config = {}) {
    super(engine, null);
    __privateAdd(this, _state, "idle");
    __privateAdd(this, _mouseDownX);
    __privateAdd(this, _mouseDownY);
    __publicField(this, "config", {});
    __privateAdd(this, _prevCameraX, 0);
    __privateAdd(this, _prevCameraY, 0);
    __publicField(this, "camera", null);
    this.config = { ...DEFAULT_CONFIG, ...config };
    __privateSet(this, _mouseDownX, 0);
    __privateSet(this, _mouseDownY, 0);
    __privateSet(this, _state, "idle");
    this.event.global.pointerDown = this.onCursorDown;
    this.event.global.pointerMove = this.onCursorMove;
    this.event.global.pointerUp = this.onCursorUp;
    this.event.global.mouseWheel = this.onZoom;
    this.transformMode = "direct";
    this.style = {
      position: "absolute",
      left: "0px",
      top: "0px",
      width: "0px",
      height: "0px"
    };
    this.requestTransform("WRITE_2");
    __privateSet(this, _prevCameraX, 0);
    __privateSet(this, _prevCameraY, 0);
  }
  set element(_element) {
    super.element = _element;
    this.camera = new Camera(this.engine);
    this.engine.camera = this.camera;
  }
  paintCamera() {
    var _a, _b;
    (_a = this.engine.camera) == null ? void 0 : _a.updateCamera();
    this.style.transform = (_b = this.engine.camera) == null ? void 0 : _b.canvasStyle;
    this.requestTransform("WRITE_2");
  }
  // Camera Methods
  updateCameraCenterPosition(x = 0, y = 0) {
    var _a, _b, _c;
    (_a = this.engine.camera) == null ? void 0 : _a.setCameraCenterPosition(x, y);
    __privateSet(this, _prevCameraX, ((_b = this.engine.camera) == null ? void 0 : _b.cameraPositionX) || 0);
    __privateSet(this, _prevCameraY, ((_c = this.engine.camera) == null ? void 0 : _c.cameraPositionY) || 0);
    this.paintCamera();
  }
  setCameraPosition(x, y) {
    var _a;
    (_a = this.engine.camera) == null ? void 0 : _a.setCameraPosition(x, y);
    __privateSet(this, _prevCameraX, x);
    __privateSet(this, _prevCameraY, y);
    this.paintCamera();
  }
  setCameraCenterPosition(x, y) {
    var _a, _b, _c;
    (_a = this.engine.camera) == null ? void 0 : _a.setCameraCenterPosition(x, y);
    __privateSet(this, _prevCameraX, ((_b = this.engine.camera) == null ? void 0 : _b.cameraPositionX) || 0);
    __privateSet(this, _prevCameraY, ((_c = this.engine.camera) == null ? void 0 : _c.cameraPositionY) || 0);
    this.paintCamera();
  }
  getCameraCenterPosition() {
    var _a;
    return ((_a = this.engine.camera) == null ? void 0 : _a.getCameraCenterPosition()) || { x: 0, y: 0 };
  }
  zoomBy(deltaZoom, originX, originY) {
    if (this.config.zoomLock) {
      return;
    }
    const camera = this.engine.camera;
    if (!camera) {
      return;
    }
    const targetX = originX ?? camera.cameraWidth / 2;
    const targetY = originY ?? camera.cameraHeight / 2;
    camera.handleScroll(deltaZoom, targetX, targetY);
    this.style.transform = camera.canvasStyle;
    __privateSet(this, _prevCameraX, camera.cameraPositionX || 0);
    __privateSet(this, _prevCameraY, camera.cameraPositionY || 0);
    this.requestTransform("WRITE_2");
  }
  // Event Handlers
  onCursorDown(prop) {
    var _a;
    if (prop.event.button != 0) {
      return;
    }
    if (this.config.panLock) {
      return;
    }
    if (this.global.data.allowCameraControl === false) {
      return;
    }
    if (prop.isWithinEngine === false) {
      return;
    }
    __privateSet(this, _state, "panning");
    __privateSet(this, _mouseDownX, prop.position.screenX);
    __privateSet(this, _mouseDownY, prop.position.screenY);
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanStart();
    prop.event.preventDefault();
  }
  onCursorMove(prop) {
    var _a, _b;
    if (__privateGet(this, _state) != "panning") {
      return;
    }
    if (this.global.data.allowCameraControl === false) {
      return;
    }
    const dx = prop.position.screenX - __privateGet(this, _mouseDownX);
    const dy = prop.position.screenY - __privateGet(this, _mouseDownY);
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanDrag(dx, dy);
    this.style.transform = (_b = this.engine.camera) == null ? void 0 : _b.canvasStyle;
    this.requestTransform("WRITE_2");
  }
  onCursorUp(_prop) {
    var _a, _b, _c, _d;
    if (__privateGet(this, _state) != "panning") {
      return;
    }
    __privateSet(this, _state, "idle");
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanEnd();
    this.style.transform = (_b = this.engine.camera) == null ? void 0 : _b.canvasStyle;
    __privateSet(this, _prevCameraX, ((_c = this.engine.camera) == null ? void 0 : _c.cameraPositionX) || 0);
    __privateSet(this, _prevCameraY, ((_d = this.engine.camera) == null ? void 0 : _d.cameraPositionY) || 0);
    this.requestTransform("WRITE_2");
  }
  onZoom(prop) {
    if (this.config.zoomLock) {
      return;
    }
    const camera = this.engine.camera;
    if (prop.position.screenX < camera.containerOffsetX || prop.position.screenX > camera.containerOffsetX + camera.cameraWidth || prop.position.screenY < camera.containerOffsetY || prop.position.screenY > camera.containerOffsetY + camera.cameraHeight) {
      return;
    }
    this.zoomBy(prop.delta / 2e3, prop.position.cameraX, prop.position.cameraY);
    prop.event.preventDefault();
  }
}
_state = new WeakMap();
_mouseDownX = new WeakMap();
_mouseDownY = new WeakMap();
_prevCameraX = new WeakMap();
_prevCameraY = new WeakMap();
export {
  CameraControl
};
