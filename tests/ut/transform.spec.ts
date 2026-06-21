import { expect, test } from "@playwright/test";
import { BaseObject, CoreObject } from "../../src/object";
import {
  CircleCollider,
  CollisionEngine,
  PointCollider,
  RectCollider,
} from "../../src/collision";

function createEngine() {
  let nextId = 0;
  const queue = {
    READ_1: new Map(),
    WRITE_1: new Map(),
    READ_2: new Map(),
    WRITE_2: new Map(),
    READ_3: new Map(),
    WRITE_3: new Map(),
  };

  return {
    global: {
      currentStage: "IDLE",
      queue,
      createId: () => `${++nextId}`,
      registerObject: () => {},
      unregisterObject: () => {},
    },
    input: {
      subscribeGlobalCursorEvent: () => {},
      unsubscribeGlobalCursorEvent: () => {},
    },
    camera: null,
    collisionEngine: null,
    animationList: [],
    debugMarkerList: {},
  } as any;
}

test.describe("BaseObject transforms", () => {
  test("keeps CoreObject root world and local transforms in sync", () => {
    const engine = createEngine();
    const object = new CoreObject(engine);

    object.worldPosition = [12, 24];
    object.worldTransform.scaleX = 2;
    object.worldTransform.scaleY = 3;

    expect(object.localPosition).toEqual([12, 24]);
    expect(object.localTransform.scaleX).toBe(2);
    expect(object.localTransform.scaleY).toBe(3);
    expect(object.transform).toBe(object.worldTransform);
  });

  test("keeps root world and local transforms in sync", () => {
    const engine = createEngine();
    const object = new BaseObject(engine);

    object.worldTransform.x = 10;
    object.worldTransform.y = 20;
    object.worldTransform.scaleX = 2;
    object.worldTransform.scaleY = 3;

    expect(object.localTransform.x).toBe(10);
    expect(object.localTransform.y).toBe(20);
    expect(object.localTransform.scaleX).toBe(2);
    expect(object.localTransform.scaleY).toBe(3);

    object.localPosition = [30, 40];
    expect(object.worldPosition).toEqual([30, 40]);
  });

  test("composes child transforms through parent position and scale", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    parent.worldPosition = [100, 200];
    parent.worldTransform.scaleX = 2;
    parent.worldTransform.scaleY = 4;

    const child = new BaseObject(engine, parent);
    child.localPosition = [10, 20];
    child.localTransform.scaleX = 3;
    child.localTransform.scaleY = 5;

    expect(child.worldPosition).toEqual([120, 280]);
    expect(child.worldTransform.scaleX).toBe(6);
    expect(child.worldTransform.scaleY).toBe(20);
  });

  test("sets child local transform through world transform writes", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    parent.worldPosition = [100, 200];
    parent.worldTransform.scaleX = 2;
    parent.worldTransform.scaleY = 4;

    const child = new BaseObject(engine, parent);
    child.worldPosition = [140, 260];
    child.worldTransform.scaleX = 10;
    child.worldTransform.scaleY = 12;

    expect(child.localPosition).toEqual([20, 15]);
    expect(child.localTransform.scaleX).toBe(5);
    expect(child.localTransform.scaleY).toBe(3);
  });

  test("preserves world transform on reparent", () => {
    const engine = createEngine();
    const parentA = new BaseObject(engine);
    parentA.worldPosition = [100, 100];
    parentA.worldTransform.scaleX = 2;
    parentA.worldTransform.scaleY = 2;

    const parentB = new BaseObject(engine);
    parentB.worldPosition = [-10, 20];
    parentB.worldTransform.scaleX = 5;
    parentB.worldTransform.scaleY = 10;

    const child = new BaseObject(engine, parentA);
    child.localPosition = [10, 20];
    child.localTransform.scaleX = 3;
    child.localTransform.scaleY = 4;

    const worldBefore = [...child.worldPosition];
    const scaleBefore = [
      child.worldTransform.scaleX,
      child.worldTransform.scaleY,
    ];

    parentB.appendChild(child);

    expect(child.worldPosition).toEqual(worldBefore);
    expect(child.worldTransform.scaleX).toBe(scaleBefore[0]);
    expect(child.worldTransform.scaleY).toBe(scaleBefore[1]);
    expect(parentA.children).not.toContain(child);
    expect(parentB.children).toEqual([child]);
  });

  test("rejects cyclic parent relationships and duplicate appends", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    const child = new BaseObject(engine, parent);

    parent.appendChild(child);
    parent.appendChild(child);

    expect(parent.children).toEqual([child]);
    expect(() => {
      child.appendChild(parent);
    }).toThrow("An object cannot be parented to one of its children.");
  });

  test("throws when world writes require a zero-scale inverse", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    parent.worldTransform.scaleX = 0;

    const child = new BaseObject(engine, parent);

    expect(() => {
      child.worldTransform.x = 10;
    }).toThrow("Cannot set world transform under a zero-scale parent.");
  });
});

test.describe("Collider transforms", () => {
  test("uses the shared transform graph without entering public children", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    parent.worldPosition = [100, 200];
    parent.worldTransform.scaleX = 2;
    parent.worldTransform.scaleY = 3;

    const collider = new RectCollider(engine, parent, 10, 20, 30, 40);
    parent.addCollider(collider);

    expect(parent.children).toEqual([]);
    expect(parent.transformChildren).toContain(collider);
    expect(collider.worldPosition).toEqual([120, 260]);
    expect(collider.worldWidth).toBe(60);
    expect(collider.worldHeight).toBe(120);

    parent.worldPosition = [150, 250];

    expect(collider.worldPosition).toEqual([170, 310]);
  });

  test("keeps local collider mutations and world position writes compatible", () => {
    const engine = createEngine();
    const parent = new BaseObject(engine);
    parent.worldPosition = [100, 200];
    parent.worldTransform.scaleX = 2;
    parent.worldTransform.scaleY = 4;

    const collider = new RectCollider(engine, parent, 10, 20, 30, 40);

    collider.localPosition = [15, 25];

    expect(collider.localPosition).toEqual([15, 25]);
    expect(collider.worldPosition).toEqual([130, 300]);

    collider.worldPosition = [160, 360];

    expect(collider.localPosition).toEqual([30, 40]);
  });

  test("reparenting colliders preserves local offsets", () => {
    const engine = createEngine();
    const parentA = new BaseObject(engine);
    parentA.worldPosition = [100, 100];
    parentA.worldTransform.scaleX = 2;
    parentA.worldTransform.scaleY = 2;

    const parentB = new BaseObject(engine);
    parentB.worldPosition = [-10, 20];
    parentB.worldTransform.scaleX = 5;
    parentB.worldTransform.scaleY = 10;

    const collider = new RectCollider(engine, parentA, 10, 20, 30, 40);

    collider.parent = parentB;

    expect(collider.parent).toBe(parentB);
    expect(collider.localPosition).toEqual([10, 20]);
    expect(collider.worldPosition).toEqual([40, 220]);
    expect(parentA.transformChildren).not.toContain(collider);
    expect(parentB.transformChildren).toContain(collider);
  });

  test("detects collisions across collider shapes after parent transforms", () => {
    const engine = createEngine();
    const collisionEngine = new CollisionEngine();
    const rectParent = new BaseObject(engine);
    const circleParent = new BaseObject(engine);
    const pointParent = new BaseObject(engine);

    rectParent.worldPosition = [10, 10];
    circleParent.worldPosition = [40, 40];
    pointParent.worldPosition = [20, 20];

    const rect = new RectCollider(engine, rectParent, 0, 0, 40, 40);
    const circle = new CircleCollider(engine, circleParent, 0, 0, 15);
    const point = new PointCollider(engine, pointParent, 0, 0);

    expect(collisionEngine.isIntersecting(rect, circle)).toBe(true);
    expect(collisionEngine.isIntersecting(rect, point)).toBe(true);
    expect(collisionEngine.isIntersecting(circle, point)).toBe(false);
  });

  test("emits begin, collide, and end callbacks after transform updates", () => {
    const engine = createEngine();
    const collisionEngine = new CollisionEngine();
    const parentA = new BaseObject(engine);
    const parentB = new BaseObject(engine);
    const rectA = new RectCollider(engine, parentA, 0, 0, 50, 50);
    const rectB = new RectCollider(engine, parentB, 25, 25, 50, 50);
    let beginCount = 0;
    let collideCount = 0;
    let endCount = 0;

    rectA.event.collider.onBeginContact = () => {
      beginCount++;
    };
    rectA.event.collider.onCollide = () => {
      collideCount++;
    };
    rectA.event.collider.onEndContact = () => {
      endCount++;
    };

    collisionEngine.addObject(rectA);
    collisionEngine.addObject(rectB);

    collisionEngine.detectCollisions();
    collisionEngine.detectCollisions();
    rectB.worldPosition = [100, 100];
    collisionEngine.detectCollisions();

    expect(beginCount).toBe(1);
    expect(collideCount).toBe(2);
    expect(endCount).toBe(1);
    expect(rectA.collisionCount).toBe(0);
  });
});
