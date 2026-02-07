var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { I as InputControl, g as getDomProperty, a as EventProxyFactory } from "./input-BKVYLpNZ.js";
class EventCallback {
  constructor(object) {
    __publicField(this, "_object");
    __publicField(this, "_collider");
    __publicField(this, "collider");
    this._object = object;
    this._collider = {
      onCollide: null,
      onBeginContact: null,
      onEndContact: null
    };
    this.collider = EventProxyFactory(object, this._collider);
  }
}
class Collider {
  constructor(engine, parent, type, localX, localY) {
    __publicField(this, "global");
    __publicField(this, "engine");
    __publicField(this, "parent");
    __publicField(this, "type");
    __publicField(this, "uuid");
    __publicField(this, "_element");
    __publicField(this, "inputEngine");
    __publicField(this, "transform");
    // local: ColliderProperty;
    __publicField(this, "event");
    __publicField(this, "_currentCollisions");
    __publicField(this, "_iterationCollisions");
    this.engine = engine;
    this.global = engine.global;
    this.parent = parent;
    this.type = type;
    this.uuid = Symbol();
    this._element = null;
    this.transform = {
      x: localX,
      y: localY,
      width: 0,
      height: 0
    };
    this.event = new EventCallback(this.parent);
    this._iterationCollisions = /* @__PURE__ */ new Set();
    this._currentCollisions = /* @__PURE__ */ new Set();
    this.recalculate();
    this.inputEngine = new InputControl(this.engine);
  }
  get worldPosition() {
    return [
      this.parent.transform.x + this.transform.x,
      this.parent.transform.y + this.transform.y
    ];
  }
  set worldPosition([x, y]) {
    this.transform.x = x - this.parent.transform.x;
    this.transform.y = y - this.parent.transform.y;
  }
  // get localPosition(): [number, number] {
  //   return [this.local.x, this.local.y];
  // }
  // set localPosition([x, y]: [number, number]) {
  //   this.local.x = x;
  //   this.local.y = y;
  // }
  set element(element) {
    this._element = element;
    if (this.parent.hasOwnProperty("element")) {
      this.parent.requestRead();
    } else {
      this.recalculate();
    }
  }
  read() {
    if (!this.element) {
      return;
    }
    const property = getDomProperty(this.parent.engine, this.element);
    this.transform.x = property.x - this.parent.transform.x;
    this.transform.y = property.y - this.parent.transform.y;
    this.transform.width = property.width;
    this.transform.height = property.height;
  }
  recalculate() {
  }
}
class RectCollider extends Collider {
  constructor(engine, parent, localX, localY, width, height) {
    super(engine, parent, "rect", localX, localY);
    this.transform.width = width;
    this.transform.height = height;
  }
}
class CircleCollider extends Collider {
  constructor(engine, parent, localX, localY, radius) {
    super(engine, parent, "circle", localX, localY);
    __publicField(this, "radius");
    this.radius = radius;
  }
}
class PointCollider extends Collider {
  constructor(engine, parent, localX, localY) {
    super(engine, parent, "point", localX, localY);
  }
}
class CollisionEngine {
  constructor() {
    __publicField(this, "objectTable", {});
    __publicField(this, "objectList", []);
    __publicField(this, "sortedXCoordinates", []);
    this.sortedXCoordinates = [];
  }
  addObject(object) {
    this.objectTable[object.uuid] = object;
    this.objectList.push(object);
    this.sortedXCoordinates.push({
      collider: object,
      x: object.worldPosition[0],
      left: true
    });
    this.sortedXCoordinates.push({
      collider: object,
      x: object.worldPosition[0] + (object.transform.width ?? 0),
      left: false
    });
  }
  removeObject(uuid) {
    delete this.objectTable[uuid];
    this.objectList = this.objectList.filter((obj) => obj.uuid !== uuid);
  }
  updateXCoordinates() {
    for (const entry of this.sortedXCoordinates) {
      if (entry.left) {
        if (entry.collider.type === "circle") {
          entry.x = entry.collider.worldPosition[0] - entry.collider.radius;
        } else if (entry.collider.type === "rect") {
          entry.x = entry.collider.worldPosition[0];
        } else if (entry.collider.type === "point") {
          entry.x = entry.collider.worldPosition[0];
        }
      } else {
        if (entry.collider.type === "circle") {
          entry.x = entry.collider.worldPosition[0] + entry.collider.radius;
        } else if (entry.collider.type === "rect") {
          entry.x = entry.collider.worldPosition[0] + entry.collider.transform.width;
        } else if (entry.collider.type === "point") {
          entry.x = entry.collider.worldPosition[0];
        }
      }
    }
  }
  sortXCoordinates() {
    this.sortedXCoordinates.sort((a, b) => {
      return a.x - b.x;
    });
  }
  detectCollisions() {
    var _a, _b;
    this.updateXCoordinates();
    this.sortXCoordinates();
    let localCollisions = /* @__PURE__ */ new Set();
    for (const entry of this.sortedXCoordinates) {
      if (entry.left) {
        for (const collider of localCollisions) {
          if (this.isIntersecting(entry.collider, collider)) {
            this.onColliderCollide(entry.collider, collider);
            this.onColliderCollide(collider, entry.collider);
          }
        }
        localCollisions.add(entry.collider);
      } else {
        localCollisions.delete(entry.collider);
      }
    }
    for (const entry of this.sortedXCoordinates) {
      if (!entry.left) {
        continue;
      }
      for (const currentCollision of entry.collider._currentCollisions) {
        if (!entry.collider._iterationCollisions.has(currentCollision)) {
          (_b = (_a = entry.collider.event.collider).onEndContact) == null ? void 0 : _b.call(
            _a,
            entry.collider,
            currentCollision
          );
          entry.collider._currentCollisions.delete(currentCollision);
        }
      }
      entry.collider._iterationCollisions.clear();
    }
  }
  isIntersecting(a, b) {
    const colliderA = a;
    const colliderB = b;
    if (colliderA.type === "rect" && colliderB.type === "rect") {
      return this.isRectIntersecting(colliderA, colliderB);
    } else if (colliderA.type === "circle" && colliderB.type === "circle") {
      return this.isCircleIntersecting(
        colliderA,
        colliderB
      );
    } else if (colliderA.type === "rect" && colliderB.type === "circle") {
      return this.isRectCircleIntersecting(
        colliderA,
        colliderB
      );
    } else if (colliderA.type === "circle" && colliderB.type === "rect") {
      return this.isRectCircleIntersecting(
        colliderB,
        colliderA
      );
    } else if (colliderA.type === "rect" && colliderB.type === "point") {
      return this.isRectPointIntersecting(
        colliderA,
        colliderB
      );
    } else if (colliderA.type === "point" && colliderB.type === "rect") {
      return this.isRectPointIntersecting(
        colliderB,
        colliderA
      );
    } else if (colliderA.type === "point" && colliderB.type === "circle") {
      return this.isCirclePointIntersecting(
        colliderB,
        colliderA
      );
    } else if (colliderA.type === "circle" && colliderB.type === "point") {
      return this.isCirclePointIntersecting(
        colliderA,
        colliderB
      );
    } else if (colliderA.type === "point" && colliderB.type === "point") {
      return this.isPointPointIntersecting(
        colliderA,
        colliderB
      );
    }
    return false;
  }
  onColliderCollide(thisObject, otherObject) {
    var _a, _b;
    if (thisObject.event.collider.onCollide) {
      thisObject.event.collider.onCollide(thisObject, otherObject);
    }
    if (thisObject._currentCollisions.has(otherObject)) ;
    else {
      (_b = (_a = thisObject.event.collider).onBeginContact) == null ? void 0 : _b.call(_a, thisObject, otherObject);
      thisObject._currentCollisions.add(otherObject);
    }
    thisObject._iterationCollisions.add(otherObject);
  }
  isRectIntersecting(a, b) {
    return a.uuid !== b.uuid && a.worldPosition[1] < b.worldPosition[1] + b.transform.height && a.worldPosition[1] + a.transform.height > b.worldPosition[1];
  }
  isRectCircleIntersecting(rect, circle) {
    let rectX = circle.worldPosition[0];
    let rectY = circle.worldPosition[1];
    if (circle.worldPosition[0] < rect.worldPosition[0]) {
      rectX = rect.worldPosition[0];
    } else if (circle.worldPosition[0] > rect.worldPosition[0] + rect.transform.width) {
      rectX = rect.worldPosition[0] + rect.transform.width;
    }
    if (circle.worldPosition[1] < rect.worldPosition[1]) {
      rectY = rect.worldPosition[1];
    } else if (circle.worldPosition[1] > rect.worldPosition[1] + rect.transform.height) {
      rectY = rect.worldPosition[1] + rect.transform.height;
    }
    let distanceX = circle.worldPosition[0] - rectX;
    let distanceY = circle.worldPosition[1] - rectY;
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= (circle.radius ?? 0);
  }
  isRectPointIntersecting(rect, point) {
    return point.worldPosition[0] >= rect.worldPosition[0] && point.worldPosition[0] <= rect.worldPosition[0] + rect.transform.width && point.worldPosition[1] >= rect.worldPosition[1] && point.worldPosition[1] <= rect.worldPosition[1] + rect.transform.height;
  }
  isCirclePointIntersecting(circle, point) {
    let distanceX = circle.worldPosition[0] - point.worldPosition[0];
    let distanceY = circle.worldPosition[1] - point.worldPosition[1];
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= (circle.radius ?? 0);
  }
  isCircleIntersecting(circleA, circleB) {
    if (circleA.uuid === circleB.uuid) {
      return false;
    }
    let distanceX = circleA.worldPosition[0] - circleB.worldPosition[0];
    let distanceY = circleA.worldPosition[1] - circleB.worldPosition[1];
    let distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= (circleA.radius ?? 0) + (circleB.radius ?? 0);
  }
  isPointPointIntersecting(pointA, pointB) {
    if (pointA.uuid === pointB.uuid) {
      return false;
    }
    return pointA.worldPosition[0] === pointB.worldPosition[0] && pointA.worldPosition[1] === pointB.worldPosition[1];
  }
}
export {
  CircleCollider,
  Collider,
  CollisionEngine,
  PointCollider,
  RectCollider
};
