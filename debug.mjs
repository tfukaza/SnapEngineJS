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
var _engine, _subscriptionId;
class DebugRenderer {
  constructor() {
    __publicField(this, "debugWindow", null);
    __publicField(this, "debugCtx", null);
    __privateAdd(this, _engine, null);
    __privateAdd(this, _subscriptionId, "debugRenderer");
  }
  enable(engine) {
    if (this.debugWindow) {
      return;
    }
    const containerElement = engine.containerElement;
    if (!containerElement) {
      return;
    }
    __privateSet(this, _engine, engine);
    this.debugWindow = document.createElement("canvas");
    this.debugWindow.style.position = "absolute";
    this.debugWindow.style.top = "0";
    this.debugWindow.style.left = "0";
    const containerRect = containerElement.getBoundingClientRect();
    this.debugWindow.width = containerRect.width;
    this.debugWindow.height = containerRect.height;
    this.debugWindow.style.zIndex = "1000";
    this.debugWindow.style.pointerEvents = "none";
    containerElement.appendChild(this.debugWindow);
    this.debugCtx = this.debugWindow.getContext("2d");
    engine.subscribeEvent("containerResized", __privateGet(this, _subscriptionId), (props) => {
      this.updateSize(props.bounds.width, props.bounds.height);
    });
  }
  disable() {
    if (this.debugWindow) {
      this.debugWindow.remove();
      this.debugWindow = null;
      this.debugCtx = null;
    }
    if (__privateGet(this, _engine)) {
      __privateGet(this, _engine).unsubscribeEvent("containerResized", __privateGet(this, _subscriptionId));
      __privateSet(this, _engine, null);
    }
  }
  updateSize(width, height) {
    if (this.debugWindow) {
      this.debugWindow.width = width;
      this.debugWindow.height = height;
    }
  }
  renderFrame(_stats, engine, objectTable) {
    var _a, _b, _c;
    if (this.debugWindow == null) {
      return;
    }
    (_a = this.debugCtx) == null ? void 0 : _a.clearRect(
      0,
      0,
      this.debugWindow.width,
      this.debugWindow.height
    );
    this.renderDebugGrid(engine);
    for (const object of Object.values(objectTable)) {
      this.debugObjectBoundingBox(object, engine);
    }
    if (this.debugCtx == null) {
      return;
    }
    for (const marker of Object.values(engine.debugMarkerList)) {
      const [cameraX, cameraY] = ((_b = engine.camera) == null ? void 0 : _b.getCameraFromWorld(
        marker.x,
        marker.y
      )) ?? [0, 0];
      if (marker.type == "point") {
        this.debugCtx.beginPath();
        this.debugCtx.fillStyle = marker.color;
        this.debugCtx.arc(cameraX, cameraY, 5, 0, 2 * Math.PI);
        this.debugCtx.fill();
      } else if (marker.type == "rect") {
        this.debugCtx.beginPath();
        if (marker.filled !== false) {
          this.debugCtx.fillStyle = marker.color;
          this.debugCtx.rect(cameraX, cameraY, marker.width, marker.height);
          this.debugCtx.fill();
        } else {
          this.debugCtx.strokeStyle = marker.color;
          this.debugCtx.lineWidth = marker.lineWidth ?? 1;
          this.debugCtx.strokeRect(
            cameraX,
            cameraY,
            marker.width,
            marker.height
          );
        }
      } else if (marker.type == "circle") {
        this.debugCtx.beginPath();
        this.debugCtx.fillStyle = marker.color;
        this.debugCtx.arc(cameraX, cameraY, marker.radius, 0, 2 * Math.PI);
        this.debugCtx.fill();
      } else if (marker.type == "text") {
        this.debugCtx.fillStyle = marker.color;
        this.debugCtx.fillText(marker.text, cameraX, cameraY);
      } else if (marker.type == "line") {
        const [cameraX2, cameraY2] = ((_c = engine.camera) == null ? void 0 : _c.getCameraFromWorld(
          marker.x2,
          marker.y2
        )) ?? [0, 0];
        this.debugCtx.beginPath();
        this.debugCtx.strokeStyle = marker.color;
        this.debugCtx.lineWidth = marker.lineWidth ?? 2;
        this.debugCtx.moveTo(cameraX, cameraY);
        this.debugCtx.lineTo(cameraX2, cameraY2);
        this.debugCtx.stroke();
      }
    }
    for (const id in engine.debugMarkerList) {
      if (!engine.debugMarkerList[id].persistent) {
        delete engine.debugMarkerList[id];
      }
    }
  }
  debugObjectBoundingBox(object, engine) {
    var _a, _b, _c;
    if (this.debugCtx == null) {
      return;
    }
    const [cameraX, cameraY] = ((_a = engine.camera) == null ? void 0 : _a.getCameraFromWorld(
      ...object.worldPosition
    )) ?? [0, 0];
    if (object.hasOwnProperty("_dom")) {
      let elementObject = object;
      const colors = ["#FF0000A0", "#00FF00A0", "#0000FFA0"];
      const stages = ["READ_1", "READ_2", "READ_3"];
      for (let i = 0; i < 3; i++) {
        const property = elementObject.getDomProperty(stages[i]);
        this.debugCtx.stroke();
        this.debugCtx.beginPath();
        this.debugCtx.strokeStyle = colors[i];
        this.debugCtx.lineWidth = 1;
        const [domCameraX, domCameraY] = ((_b = engine.camera) == null ? void 0 : _b.getCameraFromWorld(
          property.x,
          property.y
        )) ?? [0, 0];
        this.debugCtx.rect(
          domCameraX,
          domCameraY,
          property.width,
          property.height
        );
        this.debugCtx.stroke();
      }
      this.debugCtx.beginPath();
      this.debugCtx.strokeStyle = "black";
      this.debugCtx.lineWidth = 1;
      this.debugCtx.rect(
        cameraX,
        cameraY,
        elementObject._dom.property.width,
        elementObject._dom.property.height
      );
    }
    const COLLIDER_BLUE = "rgba(0, 247, 255, 0.5)";
    for (let collisionObject of object._colliderList) {
      this.debugCtx.beginPath();
      this.debugCtx.strokeStyle = COLLIDER_BLUE;
      this.debugCtx.lineWidth = 1;
      const [colliderCameraX, colliderCameraY] = ((_c = engine.camera) == null ? void 0 : _c.getCameraFromWorld(
        object.transform.x + collisionObject.transform.x,
        object.transform.y + collisionObject.transform.y
      )) ?? [0, 0];
      if (collisionObject.type == "circle") {
        this.debugCtx.arc(
          colliderCameraX,
          colliderCameraY,
          collisionObject.radius,
          0,
          2 * Math.PI
        );
        this.debugCtx.stroke();
      } else if (collisionObject.type == "rect") {
        this.debugCtx.rect(
          colliderCameraX,
          colliderCameraY,
          collisionObject.transform.width,
          collisionObject.transform.height
        );
        this.debugCtx.stroke();
      } else if (collisionObject.type == "point") {
        this.debugCtx.arc(colliderCameraX, colliderCameraY, 2, 0, 2 * Math.PI);
        this.debugCtx.fillStyle = COLLIDER_BLUE;
        this.debugCtx.fill();
      }
    }
  }
  renderDebugGrid(engine) {
    if (this.debugCtx == null) {
      return;
    }
    const gridSize = 100;
    const camera = engine.camera;
    if (!camera) return;
    const [worldLeft, worldTop] = camera.getWorldFromCamera(0, 0);
    const [worldRight, worldBottom] = camera.getWorldFromCamera(
      this.debugWindow.width,
      this.debugWindow.height
    );
    const startX = Math.floor(worldLeft / gridSize) * gridSize;
    const endX = Math.ceil(worldRight / gridSize) * gridSize;
    const startY = Math.floor(worldTop / gridSize) * gridSize;
    const endY = Math.ceil(worldBottom / gridSize) * gridSize;
    this.debugCtx.beginPath();
    this.debugCtx.strokeStyle = "rgba(200, 200, 200, 0.3)";
    this.debugCtx.lineWidth = 1;
    for (let x = startX; x <= endX; x += gridSize) {
      const [screenX1, screenY1] = camera.getCameraFromWorld(x, worldTop);
      const [screenX2, screenY2] = camera.getCameraFromWorld(x, worldBottom);
      this.debugCtx.moveTo(screenX1, screenY1);
      this.debugCtx.lineTo(screenX2, screenY2);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const [screenX1, screenY1] = camera.getCameraFromWorld(worldLeft, y);
      const [screenX2, screenY2] = camera.getCameraFromWorld(worldRight, y);
      this.debugCtx.moveTo(screenX1, screenY1);
      this.debugCtx.lineTo(screenX2, screenY2);
    }
    this.debugCtx.stroke();
    this.debugCtx.beginPath();
    this.debugCtx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    this.debugCtx.lineWidth = 2;
    const xAxisVisible = startY <= 0 && endY >= 0;
    const yAxisVisible = startX <= 0 && endX >= 0;
    if (xAxisVisible) {
      const [xAxisStartX, xAxisStartY] = camera.getCameraFromWorld(startX, 0);
      const [xAxisEndX, xAxisEndY] = camera.getCameraFromWorld(endX, 0);
      this.debugCtx.moveTo(xAxisStartX, xAxisStartY);
      this.debugCtx.lineTo(xAxisEndX, xAxisEndY);
    }
    if (yAxisVisible) {
      const [yAxisStartX, yAxisStartY] = camera.getCameraFromWorld(0, startY);
      const [yAxisEndX, yAxisEndY] = camera.getCameraFromWorld(0, endY);
      this.debugCtx.moveTo(yAxisStartX, yAxisStartY);
      this.debugCtx.lineTo(yAxisEndX, yAxisEndY);
    }
    this.debugCtx.stroke();
    this.debugCtx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.debugCtx.font = "12px Arial";
    this.debugCtx.textAlign = "center";
    for (let x = startX; x <= endX; x += gridSize) {
      if (x === 0) continue;
      const [screenX, screenY] = camera.getCameraFromWorld(x, 0);
      if (screenY >= 0 && screenY <= this.debugWindow.height) {
        this.debugCtx.fillText(x.toString(), screenX, screenY + 20);
      }
    }
    for (let y = startY; y <= endY; y += gridSize) {
      if (y === 0) continue;
      const [screenX, screenY] = camera.getCameraFromWorld(0, y);
      if (screenX >= 0 && screenX <= this.debugWindow.width) {
        this.debugCtx.fillText(y.toString(), screenX - 20, screenY + 4);
      }
    }
    const [originX, originY] = [0, 0];
    if (originX >= 0 && originX <= this.debugWindow.width && originY >= 0 && originY <= this.debugWindow.height) {
      this.debugCtx.fillText("(0,0)", originX + 20, originY - 10);
    }
  }
}
_engine = new WeakMap();
_subscriptionId = new WeakMap();
export {
  DebugRenderer
};
