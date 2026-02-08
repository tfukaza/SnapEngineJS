import { GlobalManager } from "./global";
import { BaseObject } from "./object";
import { EventProxyFactory } from "./util";

export enum mouseButton {
  LEFT = 0,
  MIDDLE = 1,
  RIGHT = 2,
  BACK = 3,
  FORWARD = 4,
}

export enum mouseButtonBitmap {
  LEFT = 1,
  MIDDLE = 2,
  RIGHT = 4,
  BACK = 8,
  FORWARD = 16,
}

export interface eventPosition {
  x: number;
  y: number;
  cameraX: number;
  cameraY: number;
  screenX: number;
  screenY: number;
}

/**
 * Events common to mouse and touch
 */
export interface pointerDownProp {
  event: PointerEvent;
  gid: string | null;
  position: eventPosition;
  button: number;
  isWithinEngine: boolean;
}

export interface pointerMoveProp {
  event: PointerEvent | null;
  gid: string | null;
  position: eventPosition;
  button: number;
}

export interface pointerUpProp {
  event: PointerEvent;
  gid: string | null;
  position: eventPosition;
  button: number;
}

/** Mouse events */
export interface mouseWheelProp {
  event: WheelEvent;
  gid: string | null;
  position: eventPosition;
  delta: number;
}

export interface dragStartProp {
  gid: string | null; // Object that triggered the event
  pointerId: number;
  start: eventPosition;
  button: number;
  isWithinEngine: boolean;
}

export interface dragProp {
  gid: string | null;
  pointerId: number;
  start: eventPosition;
  position: eventPosition;
  delta: eventPosition;
  button: number;
}

export interface dragEndProp {
  gid: string | null;
  pointerId: number;
  start: eventPosition;
  end: eventPosition;
  button: number;
}

export interface pinchStartProp {
  gid: string | null;
  gestureID: string;
  start: {
    pointerList: eventPosition[];
    distance: number;
  };
}

/** Touch Event */
export interface pinchProp {
  gid: string | null;
  gestureID: string;
  start: {
    pointerList: eventPosition[];
    distance: number;
  };
  pointerList: eventPosition[];
  distance: number;
}

export interface pinchEndProp {
  gid: string | null;
  gestureID: string;
  start: {
    pointerList: eventPosition[];
    distance: number;
  };
  pointerList: eventPosition[];
  distance: number;
  end: {
    pointerList: eventPosition[];
    distance: number;
  };
}

export interface touchMultiMoveProp {
  gid: string | null;
  position: eventPosition;
  positionCount: number;
  positionList: eventPosition[];
}

export interface InputEventCallback {
  pointerDown: null | ((prop: pointerDownProp) => void);
  pointerMove: null | ((prop: pointerMoveProp) => void);
  pointerUp: null | ((prop: pointerUpProp) => void);
  mouseWheel: null | ((prop: mouseWheelProp) => void);

  dragStart: null | ((prop: dragStartProp) => void);
  drag: null | ((prop: dragProp) => void);
  dragEnd: null | ((prop: dragEndProp) => void);

  pinchStart: null | ((prop: pinchStartProp) => void);
  pinch: null | ((prop: pinchProp) => void);
  pinchEnd: null | ((prop: pinchEndProp) => void);
}

export type touchData = {
  x: number;
  y: number;
  target: Element | null;
  identifier: number;
};

/**
 * General input event data struct for both mouse and touch pointers.
 */
export type pointerData = {
  id: number; // pointer id
  callerGID: string | null; // GID of the element that triggered the pointer event
  timestamp: number; // Timestamp of the pointer event
  x: number; // All coordinates are in word space
  y: number;
  startX: number;
  startY: number;
  prevX: number;
  prevY: number;
  endX: number | null;
  endY: number | null;
  moveCount: number; // Number of times the pointer has moved since the last pointer down event
};

const GLOBAL_GID = "global";

export interface InputControlOption {
  pinch: {
    returnOnlyFirst: boolean;
  };
}

/**
 * Unified input handler that converts mouse and touch events into a consistent format.
 *
 * Provides:
 * - Pointer events (works for both mouse and touch)
 * - Gesture recognition (drag, pinch)
 * - Coordinate transformation (screen, camera, world space)
 * - Event propagation to global input system
 *
 * Events are automatically bound to the owner object and propagated through
 * the global input engine for centralized handling.
 *
 * @example
 * ```typescript
 * const engine = new Engine();
 * const input = new InputControl(engine, false, object.gid);
 * input.event.pointerDown = (props) => {
 *   console.log('Pointer at', props.position.x, props.position.y);
 * };
 * ```
 */
class InputControl {
  /**
   * Functions as a middleware that converts mouse and touch events into a unified event format.
   */
  _element: HTMLElement | null;
  global: GlobalManager | null;

  _sortedTouchArray: touchData[]; // List of touches for touch events, sorted by the times they are pressed
  _sortedTouchDict: { [key: number]: touchData }; // Dictionary of touches for touch events, indexed by the touch identifier
  _localPointerDict: { [key: number]: pointerData };
  _event: InputEventCallback;
  event: InputEventCallback;
  _isGlobal: boolean;
  _uuid: Symbol;
  _ownerGID: string | null;

  #debugObject: BaseObject;

  #dragMemberList: InputControl[];

  #listenerControllers: AbortController[];

  engine: any;

  constructor(
    engine: any,
    isGlobal: boolean = true,
    ownerGID: string | null = null,
  ) {

    this.engine = engine;
    this.global = engine.global;
  
    this._element = null;
    this._isGlobal = isGlobal;
    this._sortedTouchArray = [];
    this._sortedTouchDict = {};
    this._ownerGID = ownerGID;
    this._localPointerDict = {};
    this.#dragMemberList = [];
    this.#listenerControllers = [];
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
      pinchEnd: null,
    };
    this.event = EventProxyFactory<InputControl, InputEventCallback>(
      this,
      this._event,
      this._isGlobal ? null : this.globalInputEngine?._inputControl.event,
    );
    this._uuid = Symbol();
    this.#debugObject = new BaseObject(this.global!, null);
  }

  destroy() {
    for (const controller of this.#listenerControllers) {
      controller.abort();
    }
    this.#listenerControllers = [];
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

  get globalPointerDict(): { [key: number]: pointerData } {
    if (this.globalInputEngine == null) {
      return {};
    }
    return this.globalInputEngine._pointerDict;
  }

  get globalGestureDict(): { [key: string]: dragGesture | pinchGesture } {
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

  getCoordinates(screenX: number, screenY: number) {
    if (this.engine == null || this.engine.camera == null) {
      // This generally should not happen, because even engines that don't use camera 
      // control still have a default camera instance.
      return {
        x: screenX,
        y: screenY,
        cameraX: screenX,
        cameraY: screenY,
        screenX,
        screenY,
      };
    }
    const [cameraX, cameraY] = this.engine.camera!.getCameraFromScreen(
      screenX,
      screenY,
    );
    const [worldX, worldY] = this.engine.camera!.getWorldFromCamera(
      cameraX,
      cameraY,
    );
    return {
      x: worldX,
      y: worldY,
      cameraX,
      cameraY,
      screenX,
      screenY,
    };
  }

  #isPointerTracked(pointerId: number) {
    return this.globalPointerDict[pointerId] != null;
  }

  #isEventWithinEngine(target: EventTarget | null) {
    const container = this.engine?.containerElement;
    if (container == null) {
      return true;
    }
    if (!(target instanceof Node)) {
      return false;
    }
    return container.contains(target);
  }

  #isCoordinateWithinEngine(screenX: number, screenY: number) {
    const rect = this.engine?.containerBounds;
    return (
      screenX >= rect.left &&
      screenX <= rect.right &&
      screenY >= rect.top &&
      screenY <= rect.bottom
    );
  }

  #shouldHandlePointerEvent(
    event: PointerEvent,
    options: { allowHover?: boolean } = {},
  ) {
    const { allowHover = false } = options;
    if (this.#isPointerTracked(event.pointerId)) {
      return true;
    }
    if (allowHover) {
      return this.#isEventWithinEngine(event.target);
    }
    return this.#isEventWithinEngine(event.target);
  }

  #shouldHandleWheelEvent(event: WheelEvent) {
    return this.#isEventWithinEngine(event.target);
  }

  /**
   * Called when the user pressed the mouse button.
   * This and all other pointer/gesture events automatically propagate to global input engine as well.
   * @param e
   * @returns
   */
  onPointerDown(e: PointerEvent) {
    const isWithinEngine = this.#isCoordinateWithinEngine(e.clientX, e.clientY);
    if (!isWithinEngine) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    this.event.pointerDown?.({
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons,
      isWithinEngine,
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
      moveCount: 0,
    };

    this.globalPointerDict[e.pointerId] = pointerData;

    this.event.dragStart?.({
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      pointerId: e.pointerId,
      start: coordinates,
      button: e.buttons,
      isWithinEngine,
    });
    this.#debugObject.addDebugPoint(
      coordinates.x,
      coordinates.y,
      "red",
      true,
      "pointerDown",
    );
    if (this.globalGestureDict[e.pointerId]) {
      this.globalGestureDict[e.pointerId].memberList.push(this);
    } else {
      this.globalGestureDict[e.pointerId] = {
        type: "drag",
        state: "drag",
        memberList: [this, ...this.#dragMemberList],
        initiatorID: this._isGlobal ? GLOBAL_GID : this._ownerGID ?? "",
      };
      // Enforce max simultaneous drags limit
      this.globalInputEngine?.enforceMaxDragLimit();
    }
  }

  /**
   * Called when the user moves the mouse
   * @param e
   */
  onPointerMove(e: PointerEvent) {
    if (!this.#shouldHandlePointerEvent(e, { allowHover: true })) {
      return;
    }
    e.preventDefault();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    // console.debug("onPointerMove", e.pointerId, coordinates);
    this.event.pointerMove?.({
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons,
    });
    const id = e.pointerId;
    let pointerData = this.globalPointerDict[id]; // || this._localPointerDict[id];
    if (pointerData != null) {
      const updatedPointerData = {
        prevX: pointerData.x,
        prevY: pointerData.y,
        x: e.clientX,
        y: e.clientY,
        callerGID: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      };
      Object.assign(pointerData, updatedPointerData);
      this.#handleMultiPointer(e);
    }
    e.stopPropagation();
  }

  /**
   * Called when the user releases the mouse button
   * @param e
   */
  onPointerUp(e: PointerEvent) {
    if (!this.#shouldHandlePointerEvent(e)) {
      return;
    }
    e.preventDefault();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    this.event.pointerUp?.({
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons,
    });
    let pointerData = this.globalPointerDict[e.pointerId];
    // this._localPointerDict[e.pointerId];
    if (pointerData != null) {
      const gesture = this.globalGestureDict[e.pointerId];
      if (gesture != null) {
        gesture.state = "release";

        const start = this.getCoordinates(
          pointerData.startX,
          pointerData.startY,
        );
        for (const member of gesture.memberList) {
          member.event.dragEnd?.({
            gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
            pointerId: e.pointerId,
            start: start,
            end: coordinates,
            button: e.buttons,
          });
        }
        delete this.globalGestureDict[e.pointerId];
      }
      // delete this._localPointerDict[e.pointerId];
      delete this.globalPointerDict[e.pointerId];

      // Check if any pinch gesture uses this pointer
      for (const gestureKey of Object.keys(this.globalGestureDict)) {
        if (!gestureKey.includes("-")) {
          continue;
        }
        const [pointerId_0, pointerId_1] = gestureKey.split("-").map(Number);
        if (pointerId_0 == e.pointerId || pointerId_1 == e.pointerId) {
          const gesture = this.globalGestureDict[gestureKey] as pinchGesture;
          this.event.pinchEnd?.({
            gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
            gestureID: gestureKey,
            start: gesture.start,
            pointerList: gesture.pointerList,
            distance: gesture.distance,
            end: {
              pointerList: gesture.pointerList,
              distance: gesture.distance,
            },
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
  onPointerCancel(e: PointerEvent) {
    // Treat cancel as pointer up to clean up gesture state
    this.onPointerUp(e);
  }

  /**
   * Called when the user scrolls the mouse wheel
   * @param e
   */
  onWheel(e: WheelEvent) {
    if (!this.#shouldHandleWheelEvent(e)) {
      return;
    }
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    this.event.mouseWheel?.({
      event: e,
      position: coordinates,
      delta: e.deltaY,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
    });
    // console.debug("onWheel", coordinates);
    e.stopPropagation();
  }

  #handleMultiPointer(e: PointerEvent) {
    // Only handle global pointer dict
    const numKeys = Object.keys(this.globalPointerDict).length;
    // Handle drag gestures of each pointer
    if (numKeys >= 1) {
      // console.info("handleDragGesture");
      for (const pointer of Object.values(this.globalPointerDict)) {
        const thisGID = this._isGlobal ? GLOBAL_GID : this._ownerGID;
        if (thisGID != pointer.callerGID) {
          continue;
        }
        pointer.moveCount++;
        // Drag gestures are only handled by the global input engine
        // to avoid edge cases where the pointer leaves the DOM element while dragging,
        // which can happen if the user is dragging very quickly
        const gesture = this.globalGestureDict[pointer.id];
        if (!gesture) {
          continue;
        }
        // console.info("drag gesture", gesture.memberList, this._isGlobal);
        // NOTE: The for loop is needed for non-touch devices.
        // It seems like that on touch devices, the pointerMove event continues working even after the cursor has
        // left the DOM element, which is not the case for mouse events.
        for (const member of gesture.memberList) {
          // Use the member's engine to transform coordinates, not the global InputControl's engine
          const startPosition = member.getCoordinates(
            pointer.startX,
            pointer.startY,
          );
          const currentPosition = member.getCoordinates(pointer.x, pointer.y);
          const deltaCoordinates = {
            x: currentPosition.x - startPosition.x,
            y: currentPosition.y - startPosition.y,
            cameraX: currentPosition.cameraX - startPosition.cameraX,
            cameraY: currentPosition.cameraY - startPosition.cameraY,
            screenX: currentPosition.screenX - startPosition.screenX,
            screenY: currentPosition.screenY - startPosition.screenY,
          };
          member.event.drag?.({
            gid: member._isGlobal ? GLOBAL_GID : member._ownerGID,
            pointerId: pointer.id,
            start: startPosition,
            position: currentPosition,
            delta: deltaCoordinates,
            button: e.buttons,
          });
        }
      }
    }
    // Handle pinch gestures.
    // Pinch gestures need to be handled by the global input engine since they involve
    // multiple pointers that may start on different elements.
    if (numKeys >= 2) {
      if (this._isGlobal) {
        // Global InputControl handles pinch detection directly
        this._detectAndFirePinchGestures();
      } else {
        // Non-global InputControl delegates to global InputControl
        const globalInput = this.globalInputEngine;
        if (globalInput) {
          globalInput._inputControl._detectAndFirePinchGestures();
        }
      }
    }
  }

  /**
   * Detects and fires pinch gesture events based on current pointer state.
   * Called by #handleMultiPointer when 2+ pointers are tracked.
   * @internal
   */
  _detectAndFirePinchGestures() {
    const pointerList = Object.values(this.globalPointerDict);
    if (pointerList.length < 2) return;
    
    // Sort the pointer list by the time they are pressed
    pointerList.sort((a, b) => a.timestamp - b.timestamp);

    // Every 2 pointers that are adjacent chronologically are considered to be a pinch gesture
    for (let i = 0; i < pointerList.length - 1; i++) {
      const pointer_0 = pointerList[i];
      const pointer_1 = pointerList[i + 1];

      const gestureKey = `${pointer_0.id}-${pointer_1.id}`;

      // const startMiddleX = (pointer_0.startX + pointer_1.startX) / 2;
      // const startMiddleY = (pointer_0.startY + pointer_1.startY) / 2;
      // const startMiddle = this.getCoordinates(startMiddleX, startMiddleY);
      const startDistance = Math.sqrt(
        Math.pow(pointer_0.startX - pointer_1.startX, 2) +
          Math.pow(pointer_0.startY - pointer_1.startY, 2),
      );
      const currentPointer0 = this.getCoordinates(pointer_0.x, pointer_0.y);
      const currentPointer1 = this.getCoordinates(pointer_1.x, pointer_1.y);
      const currentDistance = Math.sqrt(
        Math.pow(pointer_0.x - pointer_1.x, 2) +
          Math.pow(pointer_0.y - pointer_1.y, 2),
      );

      if (this.globalGestureDict[gestureKey] == null) {
        this.globalGestureDict[gestureKey] = {
          type: "pinch",
          state: "pinch",
          memberList: [this],
          start: {
            pointerList: [currentPointer0, currentPointer1],
            distance: startDistance,
          },
          pointerList: [currentPointer0, currentPointer1],
          distance: startDistance,
        };
        this.event.pinchStart?.({
          gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
          gestureID: gestureKey,
          start: {
            pointerList: [currentPointer0, currentPointer1],
            distance: startDistance,
          },
        });
      }

      const pinchGesture = this.globalGestureDict[gestureKey] as pinchGesture;
      pinchGesture.pointerList = [currentPointer0, currentPointer1];
      pinchGesture.distance = currentDistance;
      this.event.pinch?.({
        gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
        gestureID: gestureKey,
        start: pinchGesture.start,
        pointerList: pinchGesture.pointerList,
        distance: pinchGesture.distance,
      });
    }
  }

  addListener(
    dom: HTMLElement | Document,
    event: string,
    callback: (...args: any[]) => void,
  ) {
    const controller = new AbortController();
    const boundCallback = callback.bind(this);
    dom.addEventListener(event, boundCallback, { signal: controller.signal });
    this.#listenerControllers.push(controller);
  }

  addCursorEventListener(dom: HTMLElement | Document) {
    this.addListener(dom, "pointerdown", this.onPointerDown);
    this.addListener(dom, "pointermove", this.onPointerMove);
    this.addListener(dom, "pointerup", this.onPointerUp);
    this.addListener(dom, "pointercancel", this.onPointerCancel);
    this.addListener(dom, "wheel", this.onWheel);
  }

  addDragMember(member: InputControl) {
    this.#dragMemberList.push(member);
  }

  resetDragMembers() {
    this.#dragMemberList = [];
  }
}

type gestureType = "drag" | "pinch";

interface dragGesture {
  type: gestureType;
  state: "idle" | "drag" | "release";
  initiatorID: string;
  memberList: InputControl[];
}

interface pinchGesture {
  type: gestureType;
  state: "idle" | "pinch" | "release";
  memberList: InputControl[];
  start: {
    pointerList: eventPosition[];
    distance: number;
  };
  pointerList: eventPosition[];
  distance: number;
}

/**
 * Configuration options for the global input control.
 */
export interface GlobalInputConfig {
  /**
   * Maximum number of simultaneous drag gestures allowed.
   * When exceeded, the oldest drag gesture will be cancelled.
   * Set to 0 or Infinity for unlimited. Default is Infinity.
   */
  maxSimultaneousDrags: number;
}

const DEFAULT_GLOBAL_INPUT_CONFIG: GlobalInputConfig = {
  maxSimultaneousDrags: Infinity,
};

/**
 * Global input event manager for the entire engine instance.
 *
 * Manages:
 * - Document-level event listeners
 * - Global event subscription system
 * - Pointer tracking across all objects
 * - Gesture coordination (drag and pinch)
 *
 * Objects can subscribe to global input events to receive updates regardless of
 * which element the user interacts with. This is useful for camera controls,
 * global drag-and-drop, and other system-level interactions.
 *
 * @example
 * ```typescript
 * const globalInput = new GlobalInputControl(global, engine);
 * globalInput.config.maxSimultaneousDrags = 1; // Only allow one drag at a time
 * // Objects subscribe via: engine.enableCameraControl()
 * // or object.event.global.pointerMove = (props) => { ... }
 * ```
 */
class GlobalInputControl {
  #document: Document;
  global: GlobalManager | null;

  _inputControl: InputControl;
  globalCallbacks: Record<string, Record<string, { callback: (prop: any) => void, engine: any | null }>>;
  _pointerDict: { [key: number]: pointerData };
  _gestureDict: { [key: string]: dragGesture | pinchGesture };

  _event: InputEventCallback;
  event: InputEventCallback;

  /**
   * Configuration options for global input handling.
   */
  config: GlobalInputConfig;

  constructor(global: GlobalManager, config: Partial<GlobalInputConfig> = {}) {
    this.global = global;
    this.#document = document;
    this.config = { ...DEFAULT_GLOBAL_INPUT_CONFIG, ...config };
    this._inputControl = new InputControl({ global: global }, true, null);
    this._inputControl.addCursorEventListener(
      this.#document,
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
      pinchEnd: {},
    };

    this._pointerDict = {}; // Dictionary of pointers for pointer events, indexed by the pointer identifier
    this._gestureDict = {}; // Dictionary of gestures for gesture events, indexed by the gesture identifier

    type inputCallbackKey = keyof InputEventCallback;

    // Helper function to transform screen coordinates to world coordinates
    const transformPosition = (pos: eventPosition | undefined, camera: any): eventPosition | undefined => {
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
        screenY: pos.screenY,
      };
    };

    // Helper function to transform pinch pointer lists
    const transformPinchPointerList = (pointerList: eventPosition[] | undefined, camera: any): eventPosition[] | undefined => {
      if (!pointerList || !camera) {
        return pointerList;
      }
      return pointerList.map(pos => transformPosition(pos, camera)!);
    };

    for (const [key] of Object.entries(this.globalCallbacks)) {
      this._inputControl.event[key as inputCallbackKey] = (
        prop: any,
      ) => {
        for (const { callback, engine } of Object.values(
          this.globalCallbacks[key],
        )) {
          const transformWithEngine = (targetEngine: any) => {
            if (!targetEngine?.camera) {
              return prop;
            }
            const transformed: any = { ...prop };
            // Transform all position-related properties
            if (prop.position) {
              transformed.position = transformPosition(prop.position, targetEngine.camera);
            }
            if (prop.start) {
              // Handle pinch events where start is { pointerList, distance }
              if (prop.start.pointerList) {
                transformed.start = {
                  ...prop.start,
                  pointerList: transformPinchPointerList(prop.start.pointerList, targetEngine.camera),
                };
              } else {
                transformed.start = transformPosition(prop.start, targetEngine.camera);
              }
            }
            if (prop.end) {
              // Handle pinch events where end is { pointerList, distance }
              if (prop.end.pointerList) {
                transformed.end = {
                  ...prop.end,
                  pointerList: transformPinchPointerList(prop.end.pointerList, targetEngine.camera),
                };
              } else {
                transformed.end = transformPosition(prop.end, targetEngine.camera);
              }
            }
            if (prop.delta) {
              transformed.delta = transformPosition(prop.delta, targetEngine.camera);
            }
            // Handle pinch events pointerList array
            if (prop.pointerList) {
              transformed.pointerList = transformPinchPointerList(prop.pointerList, targetEngine.camera);
            }
            return transformed;
          };

          if (!engine) {
            // No engine specified - this is a truly global listener, call for all engines
            if (this.global && this.global.engines && this.global.engines.size > 0) {
              for (const currentEngine of this.global.engines) {
                callback(transformWithEngine(currentEngine));
              }
            } else {
              callback(prop);
            }
          } else {
            // Engine specified - transform coordinates using that specific engine only
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
      pinchEnd: null,
    };
    this.event = new Proxy(this._event, {
      set: (_target, prop, value) => {
        if (value != null) {
          this.subscribeGlobalCursorEvent(
            prop as keyof InputEventCallback,
            GLOBAL_GID,
            value.bind(this),
            null,
          );
        } else {
          this.unsubscribeGlobalCursorEvent(
            prop as keyof InputEventCallback,
            GLOBAL_GID,
          );
        }
        return true;
      },
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
      pinchEnd: {},
    };
    this._pointerDict = {};
    this._gestureDict = {};
  }

  subscribeGlobalCursorEvent(
    event: keyof InputEventCallback,
    gid: string,
    callback: (prop: any) => void,
    engine: any | null,
  ) {
    this.globalCallbacks[event][gid] = { callback, engine };
  }

  unsubscribeGlobalCursorEvent(event: keyof InputEventCallback, gid: string) {
    delete this.globalCallbacks[event][gid];
  }

  /**
   * Gets the number of active drag gestures.
   */
  getActiveDragCount(): number {
    return Object.values(this._gestureDict).filter(g => g.type === "drag").length;
  }

  /**
   * Gets active drag gestures sorted by timestamp (oldest first).
   */
  getActiveDragsSortedByTime(): { pointerId: number; gesture: dragGesture; timestamp: number }[] {
    const drags: { pointerId: number; gesture: dragGesture; timestamp: number }[] = [];
    
    for (const [key, gesture] of Object.entries(this._gestureDict)) {
      if (gesture.type !== "drag") continue;
      const pointerId = parseInt(key, 10);
      const pointerData = this._pointerDict[pointerId];
      if (pointerData) {
        drags.push({
          pointerId,
          gesture: gesture as dragGesture,
          timestamp: pointerData.timestamp,
        });
      }
    }
    
    return drags.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Cancels the oldest drag gesture by firing dragEnd for all its members.
   * Used to enforce maxSimultaneousDrags limit.
   */
  cancelOldestDrag(): void {
    const drags = this.getActiveDragsSortedByTime();
    if (drags.length === 0) return;
    
    const oldest = drags[0];
    const pointerData = this._pointerDict[oldest.pointerId];
    if (!pointerData) return;

    // Fire dragEnd for all members of this gesture
    for (const member of oldest.gesture.memberList) {
      const startPosition = member.getCoordinates(pointerData.startX, pointerData.startY);
      const endPosition = member.getCoordinates(pointerData.x, pointerData.y);
      
      member.event.dragEnd?.({
        gid: member._isGlobal ? GLOBAL_GID : member._ownerGID,
        pointerId: oldest.pointerId,
        start: startPosition,
        end: endPosition,
        button: 0, // No button info available for cancelled drag
      });
    }
    
    // Clean up the gesture and pointer data
    delete this._gestureDict[oldest.pointerId];
    delete this._pointerDict[oldest.pointerId];
  }

  /**
   * Enforces the maxSimultaneousDrags limit by cancelling oldest drags if needed.
   * Should be called after a new drag is registered.
   */
  enforceMaxDragLimit(): void {
    const maxDrags = this.config.maxSimultaneousDrags;
    if (maxDrags <= 0 || maxDrags === Infinity) return;
    
    while (this.getActiveDragCount() > maxDrags) {
      this.cancelOldestDrag();
    }
  }
}

export { InputControl, GlobalInputControl, GLOBAL_GID };
