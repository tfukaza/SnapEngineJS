// Credits to Lean Rada for the collision detection algorithm article
// https://leanrada.com/

import { BaseObject, CoreObject } from "./object";
import { EventProxyFactory } from "./util";
import type { Engine } from "./engine";

type ColliderType = "rect" | "circle" | "point";

interface CollisionEvent {
  onCollide: null | ((thisObject: Collider, otherObject: Collider) => void);
  onBeginContact:
    | null
    | ((thisObject: Collider, otherObject: Collider) => void);
  onEndContact: null | ((thisObject: Collider, otherObject: Collider) => void);
}

class EventCallback {
  #collider: CollisionEvent;

  collider: CollisionEvent;

  constructor(object: BaseObject) {
    this.#collider = {
      onCollide: null,
      onBeginContact: null,
      onEndContact: null,
    };
    this.collider = EventProxyFactory(object, this.#collider);
  }
}

const currentCollisionMap = new WeakMap<Collider, Set<Collider>>();
const iterationCollisionMap = new WeakMap<Collider, Set<Collider>>();

function currentCollisionsFor(collider: Collider): Set<Collider> {
  let collisions = currentCollisionMap.get(collider);
  if (!collisions) {
    collisions = new Set();
    currentCollisionMap.set(collider, collisions);
  }
  return collisions;
}

function iterationCollisionsFor(collider: Collider): Set<Collider> {
  let collisions = iterationCollisionMap.get(collider);
  if (!collisions) {
    collisions = new Set();
    iterationCollisionMap.set(collider, collisions);
  }
  return collisions;
}

function handleColliderCollision(thisObject: Collider, otherObject: Collider) {
  thisObject.event.collider.onCollide?.(thisObject, otherObject);
  const currentCollisions = currentCollisionsFor(thisObject);
  if (!currentCollisions.has(otherObject)) {
    thisObject.event.collider.onBeginContact?.(thisObject, otherObject);
    currentCollisions.add(otherObject);
  }
  iterationCollisionsFor(thisObject).add(otherObject);
}

function finishColliderCollisionIteration(collider: Collider) {
  const currentCollisions = currentCollisionsFor(collider);
  const iterationCollisions = iterationCollisionsFor(collider);
  for (const currentCollision of [...currentCollisions]) {
    if (!iterationCollisions.has(currentCollision)) {
      collider.event.collider.onEndContact?.(collider, currentCollision);
      currentCollisions.delete(currentCollision);
    }
  }
  iterationCollisions.clear();
}

function forgetColliderCollision(thisObject: Collider, otherObject: Collider) {
  currentCollisionsFor(thisObject).delete(otherObject);
  iterationCollisionsFor(thisObject).delete(otherObject);
}

/**
 * Base class for all collision shapes.
 *
 * Provides collision detection, event callbacks, and position tracking relative to parent objects.
 * Colliders are automatically registered with the global collision engine.
 *
 * Collision events:
 * - `onCollide`: Called every frame while colliding
 * - `onBeginContact`: Called once when collision starts
 * - `onEndContact`: Called once when collision ends
 */
class Collider extends CoreObject {
  #parent: BaseObject;
  #id: symbol;
  #width: number;
  #height: number;
  #event: EventCallback;

  type: ColliderType;

  constructor(
    engine: Engine,
    parent: BaseObject,
    type: ColliderType,
    localX: number,
    localY: number,
  ) {
    super(engine);
    this.#parent = parent;
    this.type = type;
    this.#id = Symbol();
    this.#width = 0;
    this.#height = 0;
    this.localPosition = [localX, localY];
    this.setTransformParent(parent, false);
    this.#event = new EventCallback(this.parent);
  }

  get id(): symbol {
    return this.#id;
  }

  get parent(): BaseObject {
    return this.#parent;
  }

  set parent(parent: BaseObject) {
    this.#parent = parent;
    this.setTransformParent(parent, false);
  }

  get event(): EventCallback {
    return this.#event;
  }

  get width(): number {
    return this.#width;
  }

  set width(width: number) {
    this.#width = width;
  }

  get height(): number {
    return this.#height;
  }

  set height(height: number) {
    this.#height = height;
  }

  /**
   * Returns true if this collider is currently intersecting the given collider.
   * Updated every frame by the collision engine — no manual check needed.
   */
  isCollidingWith(other: Collider): boolean {
    return currentCollisionsFor(this).has(other);
  }

  /**
   * Returns a readonly set of all colliders currently intersecting this one.
   * Updated every frame by the collision engine.
   */
  get currentCollisions(): ReadonlySet<Collider> {
    return currentCollisionsFor(this);
  }

  get worldWidth(): number {
    return this.#width * Math.abs(this.worldTransform.scaleX);
  }

  get worldHeight(): number {
    return this.#height * Math.abs(this.worldTransform.scaleY);
  }

  get worldRadius(): number {
    return 0;
  }

  get worldLeft(): number {
    const x = this.worldPosition[0];
    return Math.min(x, x + this.#width * this.worldTransform.scaleX);
  }

  get worldRight(): number {
    const x = this.worldPosition[0];
    return Math.max(x, x + this.#width * this.worldTransform.scaleX);
  }

  get worldTop(): number {
    const y = this.worldPosition[1];
    return Math.min(y, y + this.#height * this.worldTransform.scaleY);
  }

  get worldBottom(): number {
    const y = this.worldPosition[1];
    return Math.max(y, y + this.#height * this.worldTransform.scaleY);
  }

  /**
   * Returns the number of colliders currently intersecting this one.
   * Updated every frame by the collision engine.
   */
  get collisionCount(): number {
    return currentCollisionsFor(this).size;
  }

  destroy() {
    this.engine.collisionEngine?.removeObject(this.id);
    this.detachTransformParent(false);
    currentCollisionMap.delete(this);
    iterationCollisionMap.delete(this);
  }
}

/**
 * Rectangular collision shape.
 *
 * Defines an axis-aligned bounding box for collision detection.
 * Dimensions are specified by width and height.
 */
class RectCollider extends Collider {
  constructor(
    engine: Engine,
    parent: BaseObject,
    localX: number,
    localY: number,
    width: number,
    height: number,
  ) {
    super(engine, parent, "rect", localX, localY);
    this.width = width;
    this.height = height;
  }
}

/**
 * Circular collision shape.
 *
 * Defines a circle for collision detection. The circle is centered at the collider's position
 * with the specified radius.
 */
class CircleCollider extends Collider {
  radius: number;
  constructor(
    engine: Engine,
    parent: BaseObject,
    localX: number,
    localY: number,
    radius: number,
  ) {
    super(engine, parent, "circle", localX, localY);
    this.radius = radius;
  }

  get worldRadius(): number {
    return (
      this.radius *
      Math.max(
        Math.abs(this.worldTransform.scaleX),
        Math.abs(this.worldTransform.scaleY),
      )
    );
  }
}

/**
 * Point collision shape.
 *
 * Defines a single point for collision detection. Useful for precise hit detection
 * or checking if a position overlaps with other colliders.
 */
class PointCollider extends Collider {
  constructor(
    engine: Engine,
    parent: BaseObject,
    localX: number,
    localY: number,
  ) {
    super(engine, parent, "point", localX, localY);
  }
}

interface SortedEntry {
  collider: Collider;
  x: number;
  left: boolean;
}

/**
 * Manages collision detection for all colliders in the scene.
 *
 * Uses a sweep-and-prune algorithm for efficient broad-phase collision detection.
 * Supports multiple collision shapes (rectangle, circle, point) and triggers
 * appropriate callbacks when collisions are detected.
 *
 * The engine automatically:
 * - Tracks active collisions
 * - Triggers onBeginContact when collisions start
 * - Triggers onCollide every frame while colliding
 * - Triggers onEndContact when collisions end
 */
class CollisionEngine {
  #objectTable: Map<symbol, Collider> = new Map();
  #objectList: Collider[] = [];
  #sortedXCoordinates: SortedEntry[] = [];

  addObject(object: Collider) {
    if (this.#objectTable.has(object.id)) {
      return;
    }

    this.#objectTable.set(object.id, object);
    this.#objectList.push(object);
    this.#sortedXCoordinates.push({
      collider: object,
      x:
        object.type === "circle"
          ? object.worldPosition[0] - object.worldRadius
          : object.worldLeft,
      left: true,
    });
    this.#sortedXCoordinates.push({
      collider: object,
      x:
        object.type === "circle"
          ? object.worldPosition[0] + object.worldRadius
          : object.worldRight,
      left: false,
    });
  }

  removeObject(id: symbol) {
    const object = this.#objectTable.get(id);
    this.#objectTable.delete(id);
    this.#objectList = this.#objectList.filter((obj) => obj.id !== id);
    this.#sortedXCoordinates = this.#sortedXCoordinates.filter(
      (entry) => entry.collider.id !== id,
    );

    if (!object) {
      return;
    }

    for (const collider of this.#objectList) {
      forgetColliderCollision(collider, object);
    }
  }

  #updateXCoordinates() {
    for (const entry of this.#sortedXCoordinates) {
      if (entry.left) {
        if (entry.collider.type === "circle") {
          entry.x =
            entry.collider.worldPosition[0] - entry.collider.worldRadius;
        } else if (entry.collider.type === "rect") {
          entry.x = entry.collider.worldLeft;
        } else if (entry.collider.type === "point") {
          entry.x = entry.collider.worldPosition[0];
        }
      } else {
        if (entry.collider.type === "circle") {
          entry.x =
            entry.collider.worldPosition[0] + entry.collider.worldRadius;
        } else if (entry.collider.type === "rect") {
          entry.x = entry.collider.worldRight;
        } else if (entry.collider.type === "point") {
          entry.x = entry.collider.worldPosition[0];
        }
      }
    }
  }

  #sortXCoordinates() {
    this.#sortedXCoordinates.sort((a, b) => {
      return a.x - b.x;
    });
  }

  #colliderCenterX(c: Collider): number {
    if (c.type === "rect") return c.worldLeft + c.worldWidth / 2;
    const [wx] = c.worldPosition;
    return wx; // circle and point are already centered
  }

  #colliderCenterY(c: Collider): number {
    if (c.type === "rect") return c.worldTop + c.worldHeight / 2;
    const [, wy] = c.worldPosition;
    return wy;
  }

  detectCollisions() {
    this.#updateXCoordinates();
    this.#sortXCoordinates();
    const localCollisions: Set<Collider> = new Set();
    let collisionIdx = 0;
    // Sweep through the sorted X coordinates
    for (const entry of this.#sortedXCoordinates) {
      if (entry.left) {
        // Check if any objects in the local collisions set are intersecting with the current object
        for (const collider of localCollisions) {
          if (this.isIntersecting(entry.collider, collider)) {
            handleColliderCollision(entry.collider, collider);
            handleColliderCollision(collider, entry.collider);

            // Debug: draw line between colliding collider centers
            const ax = this.#colliderCenterX(entry.collider);
            const ay = this.#colliderCenterY(entry.collider);
            const bx = this.#colliderCenterX(collider);
            const by = this.#colliderCenterY(collider);
            entry.collider.parent.addDebugLine(
              ax,
              ay,
              bx,
              by,
              "rgba(255, 50, 50, 0.35)",
              false,
              `collision-${collisionIdx++}`,
              1,
              "collisions",
            );
          }
        }
        localCollisions.add(entry.collider);
      } else {
        localCollisions.delete(entry.collider);
      }
    }
    // Check if any collisions ended
    for (const entry of this.#sortedXCoordinates) {
      if (!entry.left) {
        continue;
      }
      finishColliderCollisionIteration(entry.collider);
    }
  }

  isIntersecting(a: Collider, b: Collider) {
    const colliderA = a;
    const colliderB = b;

    if (colliderA.type === "rect" && colliderB.type === "rect") {
      return this.#isRectIntersecting(colliderA, colliderB);
    } else if (colliderA.type === "circle" && colliderB.type === "circle") {
      return this.#isCircleIntersecting(
        colliderA as CircleCollider,
        colliderB as CircleCollider,
      );
    } else if (colliderA.type === "rect" && colliderB.type === "circle") {
      return this.#isRectCircleIntersecting(
        colliderA as RectCollider,
        colliderB as CircleCollider,
      );
    } else if (colliderA.type === "circle" && colliderB.type === "rect") {
      return this.#isRectCircleIntersecting(
        colliderB as RectCollider,
        colliderA as CircleCollider,
      );
    } else if (colliderA.type === "rect" && colliderB.type === "point") {
      return this.#isRectPointIntersecting(
        colliderA as RectCollider,
        colliderB as PointCollider,
      );
    } else if (colliderA.type === "point" && colliderB.type === "rect") {
      return this.#isRectPointIntersecting(
        colliderB as RectCollider,
        colliderA as PointCollider,
      );
    } else if (colliderA.type === "point" && colliderB.type === "circle") {
      return this.#isCirclePointIntersecting(
        colliderB as CircleCollider,
        colliderA as PointCollider,
      );
    } else if (colliderA.type === "circle" && colliderB.type === "point") {
      return this.#isCirclePointIntersecting(
        colliderA as CircleCollider,
        colliderB as PointCollider,
      );
    } else if (colliderA.type === "point" && colliderB.type === "point") {
      return this.#isPointPointIntersecting(
        colliderA as PointCollider,
        colliderB as PointCollider,
      );
    }

    return false;
  }

  #isRectIntersecting(a: Collider, b: Collider) {
    return (
      a.id !== b.id &&
      a.worldLeft < b.worldRight &&
      a.worldRight > b.worldLeft &&
      a.worldTop < b.worldBottom &&
      a.worldBottom > b.worldTop
    );
  }

  #isRectCircleIntersecting(rect: RectCollider, circle: CircleCollider) {
    let rectX = circle.worldPosition[0];
    let rectY = circle.worldPosition[1];
    if (circle.worldPosition[0] < rect.worldLeft) {
      rectX = rect.worldLeft;
    } else if (circle.worldPosition[0] > rect.worldRight) {
      rectX = rect.worldRight;
    }

    if (circle.worldPosition[1] < rect.worldTop) {
      rectY = rect.worldTop;
    } else if (circle.worldPosition[1] > rect.worldBottom) {
      rectY = rect.worldBottom;
    }

    const distanceX = circle.worldPosition[0] - rectX;
    const distanceY = circle.worldPosition[1] - rectY;
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= circle.worldRadius;
  }

  #isRectPointIntersecting(rect: RectCollider, point: PointCollider) {
    return (
      point.worldPosition[0] >= rect.worldLeft &&
      point.worldPosition[0] <= rect.worldRight &&
      point.worldPosition[1] >= rect.worldTop &&
      point.worldPosition[1] <= rect.worldBottom
    );
  }

  #isCirclePointIntersecting(circle: CircleCollider, point: PointCollider) {
    const distanceX = circle.worldPosition[0] - point.worldPosition[0];
    const distanceY = circle.worldPosition[1] - point.worldPosition[1];
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= circle.worldRadius;
  }

  #isCircleIntersecting(circleA: CircleCollider, circleB: CircleCollider) {
    if (circleA.id === circleB.id) {
      return false;
    }
    const distanceX = circleA.worldPosition[0] - circleB.worldPosition[0];
    const distanceY = circleA.worldPosition[1] - circleB.worldPosition[1];
    const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);
    return distance <= circleA.worldRadius + circleB.worldRadius;
  }

  #isPointPointIntersecting(pointA: PointCollider, pointB: PointCollider) {
    if (pointA.id === pointB.id) {
      return false;
    }
    return (
      pointA.worldPosition[0] === pointB.worldPosition[0] &&
      pointA.worldPosition[1] === pointB.worldPosition[1]
    );
  }
}

export {
  CollisionEngine,
  Collider,
  RectCollider,
  CircleCollider,
  PointCollider,
};
