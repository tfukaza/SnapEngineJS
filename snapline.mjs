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
var _containerDom, _containerOffsetX, _containerOffsetY, _cameraWidth, _cameraHeight, _cameraPositionX, _cameraPositionY, _cameraPanStartX, _cameraPanStartY, _zoom, _config, _canvasStyle, _resizeObserver, _debugObject, _dragMemberList, _listenerControllers, _InputControl_instances, isPointerTracked_fn, isEventWithinEngine_fn, shouldHandlePointerEvent_fn, shouldHandleWheelEvent_fn, handleMultiPointer_fn, _document, _engineIdCounter, _engineIds, _animationFrameId, _GlobalManager_instances, startRenderLoop_fn, stopRenderLoop_fn, ensureInputEngine_fn, ensureEngineId_fn, ensureGlobalObjectTable_fn, _resizeObserver2, _animationProcessor, _debugRenderer, _Engine_instances, processQueue_fn, _config2, _name, _prop, _outgoingLines, _incomingLines, _state, _hitCircle, _mouseHitBox, _targetConnector, _connectorCallback, _prevCameraX, _prevCameraY;
class Camera {
  /**
   * Creates a new Camera instance for panning and zooming a DOM element.
   *
   * @param container - The HTML element that will serve as the camera viewport
   * @param config - Configuration options for camera behavior
   * @param config.enableZoom - Whether zoom functionality is enabled (default: true)
   * @param config.zoomBounds - Min/max zoom limits (default: {min: 0.2, max: 1})
   * @param config.enablePan - Whether pan functionality is enabled (default: true)
   * @param config.panBounds - Boundaries for panning (default: no bounds)
   * @param config.handleResize - Whether to handle window resize events (default: true)
   *
   * @example
   * ```typescript
   * const camera = new Camera(document.getElementById('canvas'), {
   *   enableZoom: true,
   *   zoomBounds: { min: 0.1, max: 2.0 },
   *   enablePan: true
   * });
   * ```
   */
  constructor(container, config = {}) {
    /**
     * Represents a camera that can be used to pan and zoom the view of a DOM element.
     * The camera maintains 3 coordinate systems:
     * - Viewport coordinates: The x,y coordinates of the pointer on the browser viewport.
     *   (0,0) is the top left corner of the screen and the x,y coordinates increase as you move right and down.
     * - Camera coordinates: The x,y coordinates of the camera view.
     *   (0,0) is the top left corner of the camera view and the x,y coordinates increase as you move right and down.
     *   The position of the camera is the top left corner of the camera view.
     * - World coordinates: The x,y coordinates of the world that the camera is viewing.
     *   (0,0) is the center of the world and the x,y coordinates increase as you move right and down.
     */
    __privateAdd(this, _containerDom);
    // The DOM element that represents the camera view
    __privateAdd(this, _containerOffsetX);
    // The x coordinate of the container DOM on the browser viewport
    __privateAdd(this, _containerOffsetY);
    // The y coordinate of the container DOM on the browser viewport
    __privateAdd(this, _cameraWidth);
    // The width of the camera view. This should be the same as the container width.
    __privateAdd(this, _cameraHeight);
    // The height of the camera view. This should be the same as the container height.
    __privateAdd(this, _cameraPositionX);
    // Position of the center of the camera
    __privateAdd(this, _cameraPositionY);
    __privateAdd(this, _cameraPanStartX);
    // Initial position of the camera when panning
    __privateAdd(this, _cameraPanStartY);
    __privateAdd(this, _zoom);
    // The zoom level of the camera, 1 means no zoom, smaller values zoom out, larger values zoom in
    __privateAdd(this, _config);
    __privateAdd(this, _canvasStyle);
    // The CSS transform style that should be applied to the DOM element
    __privateAdd(this, _resizeObserver);
    let containerRect = container.getBoundingClientRect();
    __privateSet(this, _containerDom, container);
    __privateSet(this, _containerOffsetX, containerRect.left);
    __privateSet(this, _containerOffsetY, containerRect.top);
    __privateSet(this, _cameraWidth, containerRect.width);
    __privateSet(this, _cameraHeight, containerRect.height);
    __privateSet(this, _cameraPositionX, 0);
    __privateSet(this, _cameraPositionY, 0);
    __privateSet(this, _cameraPanStartX, 0);
    __privateSet(this, _cameraPanStartY, 0);
    __privateSet(this, _zoom, 1);
    const defaultConfig = {
      enableZoom: true,
      zoomBounds: { min: 0.2, max: 1 },
      enablePan: true,
      panBounds: { top: null, left: null, right: null, bottom: null }
    };
    __privateSet(this, _config, { ...defaultConfig, ...config });
    __privateSet(this, _canvasStyle, "");
    this.updateCamera();
    if (__privateGet(this, _config).handleResize || true) {
      __privateSet(this, _resizeObserver, new ResizeObserver(() => {
        this.updateCameraProperty();
      }));
      __privateGet(this, _resizeObserver).observe(__privateGet(this, _containerDom));
      __privateGet(this, _resizeObserver).observe(window.document.body);
    }
    window.addEventListener("scroll", () => {
      const rect = __privateGet(this, _containerDom).getBoundingClientRect();
      __privateSet(this, _containerOffsetX, rect.left);
      __privateSet(this, _containerOffsetY, rect.top);
      this.updateCamera();
    });
  }
  /**
   * Gets the current width of the camera viewport.
   * @returns The camera viewport width in pixels
   */
  get cameraWidth() {
    return __privateGet(this, _cameraWidth);
  }
  /**
   * Gets the current height of the camera viewport.
   * @returns The camera viewport height in pixels
   */
  get cameraHeight() {
    return __privateGet(this, _cameraHeight);
  }
  /**
   * Gets the current X position of the camera in world coordinates.
   * @returns The camera X position
   */
  get cameraPositionX() {
    return __privateGet(this, _cameraPositionX);
  }
  /**
   * Gets the current Y position of the camera in world coordinates.
   * @returns The camera Y position
   */
  get cameraPositionY() {
    return __privateGet(this, _cameraPositionY);
  }
  /**
   * Gets the current zoom level of the camera.
   * @returns The zoom level (1.0 = no zoom, <1 = zoomed out, >1 = zoomed in)
   */
  get zoom() {
    return __privateGet(this, _zoom);
  }
  /**
   * Gets the X offset of the container element relative to the viewport.
   * @returns The container X offset in pixels
   */
  get containerOffsetX() {
    return __privateGet(this, _containerOffsetX);
  }
  /**
   * Gets the Y offset of the container element relative to the viewport.
   * @returns The container Y offset in pixels
   */
  get containerOffsetY() {
    return __privateGet(this, _containerOffsetY);
  }
  /**
   * Updates the camera's dimensional properties by reading the current container bounds.
   * This method is automatically called when the container is resized.
   *
   * @remarks
   * This method performs DOM read operations and should ideally be queued in a read phase
   * to avoid layout thrashing.
   */
  updateCameraProperty() {
    let containerRect = __privateGet(this, _containerDom).getBoundingClientRect();
    __privateSet(this, _containerOffsetX, containerRect.left);
    __privateSet(this, _containerOffsetY, containerRect.top);
    __privateSet(this, _cameraWidth, containerRect.width);
    __privateSet(this, _cameraHeight, containerRect.height);
  }
  /**
   * Generates a CSS 3D transformation matrix string for converting world coordinates to camera view.
   *
   * @param cameraX - The X coordinate of the camera position in world space
   * @param cameraY - The Y coordinate of the camera position in world space
   * @param zoom - The zoom level to apply to the transformation
   * @returns A CSS matrix3d string that can be applied to DOM elements
   *
   * @example
   * ```typescript
   * const matrix = camera.worldToCameraMatrix(100, 50, 1.5);
   * element.style.transform = `matrix3d(${matrix})`;
   * ```
   */
  worldToCameraMatrix(cameraX, cameraY, zoom) {
    const s1 = zoom;
    const s2 = zoom;
    const t1 = -cameraX * zoom;
    const t2 = -cameraY * zoom;
    return `${s1},0,0,0,0,${s2},0,0,0,0,1,0,${t1},${t2},0,1`;
  }
  /**
   * Updates the camera's CSS transformation style based on current position and zoom.
   * This method should be called after any changes to camera position or zoom level.
   *
   * @remarks
   * The generated style can be retrieved via the `canvasStyle` getter and applied to DOM elements
   * to reflect the current camera view transformation.
   */
  updateCamera() {
    const matrix = this.worldToCameraMatrix(
      __privateGet(this, _cameraPositionX),
      __privateGet(this, _cameraPositionY),
      __privateGet(this, _zoom)
    );
    __privateSet(this, _canvasStyle, `matrix3d(${matrix})`);
  }
  /**
   * Gets the current CSS transformation style string for the camera.
   * @returns A CSS transform string that can be applied to DOM elements
   */
  get canvasStyle() {
    return __privateGet(this, _canvasStyle);
  }
  /**
   * Sets the camera position to specific world coordinates.
   *
   * @param x - The X coordinate in world space
   * @param y - The Y coordinate in world space
   *
   * @example
   * ```typescript
   * camera.setCameraPosition(100, 200); // Move camera to world position (100, 200)
   * ```
   */
  setCameraPosition(x, y) {
    __privateSet(this, _cameraPositionX, x);
    __privateSet(this, _cameraPositionY, y);
    this.updateCamera();
  }
  /**
   * Sets the camera position so that the specified world coordinates appear at the center of the viewport.
   *
   * @param x - The X coordinate in world space to center on
   * @param y - The Y coordinate in world space to center on
   *
   * @example
   * ```typescript
   * camera.setCameraCenterPosition(0, 0); // Center the camera on world origin
   * ```
   */
  setCameraCenterPosition(x, y) {
    __privateSet(this, _cameraPositionX, x - __privateGet(this, _cameraWidth) / 2);
    __privateSet(this, _cameraPositionY, y - __privateGet(this, _cameraHeight) / 2);
    this.updateCamera();
  }
  /**
   * Gets the world coordinates of the current camera center point.
   *
   * @returns An object containing the world coordinates of the camera center
   * @returns returns.x - The X coordinate of the camera center in world space
   * @returns returns.y - The Y coordinate of the camera center in world space
   *
   * @example
   * ```typescript
   * const center = camera.getCameraCenterPosition();
   * console.log(`Camera centered at: ${center.x}, ${center.y}`);
   * ```
   */
  getCameraCenterPosition() {
    const centerX = __privateGet(this, _cameraPositionX) + __privateGet(this, _cameraWidth) / 2;
    const centerY = __privateGet(this, _cameraPositionY) + __privateGet(this, _cameraHeight) / 2;
    return { x: centerX, y: centerY };
  }
  /**
   * Handles zoom input by adjusting the camera zoom level and position.
   * The camera will zoom towards the specified point in camera coordinates.
   *
   * @param deltaZoom - The amount to change the zoom level (positive = zoom in, negative = zoom out)
   * @param cameraX - The X coordinate in camera space to zoom towards
   * @param cameraY - The Y coordinate in camera space to zoom towards
   *
   * @remarks
   * - Zoom is constrained by the configured zoom bounds
   * - If panning is enabled, the camera position is adjusted to zoom towards the specified point
   * - If panning is disabled, zoom occurs from the current camera center
   *
   * @example
   * ```typescript
   * // Zoom in by 0.1 towards the mouse position
   * camera.handleScroll(0.1, mouseX, mouseY);
   * ```
   */
  handleScroll(deltaZoom, cameraX, cameraY) {
    if (!__privateGet(this, _config).enableZoom) {
      return;
    }
    if (__privateGet(this, _zoom) + deltaZoom < 0.2) {
      deltaZoom = 0.2 - __privateGet(this, _zoom);
    } else if (__privateGet(this, _zoom) + deltaZoom > 1) {
      deltaZoom = 1 - __privateGet(this, _zoom);
    }
    if (__privateGet(this, _config).zoomBounds) {
      if (__privateGet(this, _zoom) + deltaZoom < __privateGet(this, _config).zoomBounds.min) {
        deltaZoom = 0;
      } else if (__privateGet(this, _zoom) + deltaZoom > __privateGet(this, _config).zoomBounds.max) {
        deltaZoom = 0;
      }
    }
    const zoomRatio = __privateGet(this, _zoom) / (__privateGet(this, _zoom) + deltaZoom);
    if (__privateGet(this, _config).enablePan) {
      __privateSet(this, _cameraPositionX, __privateGet(this, _cameraPositionX) - __privateGet(this, _cameraWidth) / __privateGet(this, _zoom) * (zoomRatio - 1) * (1 - (__privateGet(this, _cameraWidth) - cameraX) / __privateGet(this, _cameraWidth)));
      __privateSet(this, _cameraPositionY, __privateGet(this, _cameraPositionY) - __privateGet(this, _cameraHeight) / __privateGet(this, _zoom) * (zoomRatio - 1) * (1 - (__privateGet(this, _cameraHeight) - cameraY) / __privateGet(this, _cameraHeight)));
    }
    __privateSet(this, _zoom, __privateGet(this, _zoom) + deltaZoom);
    this.updateCamera();
  }
  /**
   * Handles camera panning by applying a delta movement.
   *
   * @param deltaX - The change in X position (positive = pan right)
   * @param deltaY - The change in Y position (positive = pan down)
   *
   * @remarks
   * This is a simple pan method that applies movement directly. For more precise panning
   * that accounts for the exact mouse position, use the three-stage process:
   * handlePanStart() → handlePanDrag() → handlePanEnd()
   *
   * @example
   * ```typescript
   * // Pan the camera 10 pixels right and 5 pixels up
   * camera.handlePan(10, -5);
   * ```
   */
  handlePan(deltaX, deltaY) {
    if (!__privateGet(this, _config).enablePan) {
      return;
    }
    __privateSet(this, _cameraPositionX, __privateGet(this, _cameraPositionX) + deltaX / __privateGet(this, _zoom));
    __privateSet(this, _cameraPositionY, __privateGet(this, _cameraPositionY) + deltaY / __privateGet(this, _zoom));
    this.updateCamera();
  }
  /**
   * Initiates a panning operation by recording the current camera position.
   * This is the first step in a three-stage panning process that provides more accurate
   * tracking of mouse movement during drag operations.
   *
   * @remarks
   * Call this method when a pan gesture begins (e.g., on mousedown or touchstart).
   * Follow with handlePanDrag() calls during movement and handlePanEnd() when complete.
   *
   * @example
   * ```typescript
   * element.addEventListener('mousedown', () => {
   *   camera.handlePanStart();
   * });
   * ```
   */
  handlePanStart() {
    if (!__privateGet(this, _config).enablePan) {
      return;
    }
    __privateSet(this, _cameraPanStartX, __privateGet(this, _cameraPositionX));
    __privateSet(this, _cameraPanStartY, __privateGet(this, _cameraPositionY));
  }
  /**
   * Updates camera position during a panning operation based on cumulative movement
   * from the initial pan start position.
   *
   * @param deltaX - Total X movement since handlePanStart() was called
   * @param deltaY - Total Y movement since handlePanStart() was called
   *
   * @remarks
   * - This method should be called between handlePanStart() and handlePanEnd()
   * - Delta values are cumulative from the start position, not incremental
   * - Respects configured pan boundaries if set
   * - Movement is automatically adjusted for current zoom level
   *
   * @example
   * ```typescript
   * let startX, startY;
   *
   * element.addEventListener('mousedown', (e) => {
   *   camera.handlePanStart();
   *   startX = e.clientX;
   *   startY = e.clientY;
   * });
   *
   * element.addEventListener('mousemove', (e) => {
   *   const deltaX = e.clientX - startX;
   *   const deltaY = e.clientY - startY;
   *   camera.handlePanDrag(deltaX, deltaY);
   * });
   * ```
   */
  handlePanDrag(deltaX, deltaY) {
    if (!__privateGet(this, _config).enablePan) {
      return;
    }
    __privateSet(this, _cameraPositionX, -deltaX / __privateGet(this, _zoom) + __privateGet(this, _cameraPanStartX));
    __privateSet(this, _cameraPositionY, -deltaY / __privateGet(this, _zoom) + __privateGet(this, _cameraPanStartY));
    if (__privateGet(this, _config).panBounds) {
      if (__privateGet(this, _config).panBounds.left !== null && __privateGet(this, _cameraPositionX) < __privateGet(this, _config).panBounds.left) {
        __privateSet(this, _cameraPositionX, __privateGet(this, _config).panBounds.left + 1);
      }
      if (__privateGet(this, _config).panBounds.right !== null && __privateGet(this, _cameraPositionX) > __privateGet(this, _config).panBounds.right) {
        __privateSet(this, _cameraPositionX, __privateGet(this, _config).panBounds.right - 1);
      }
      if (__privateGet(this, _config).panBounds.top !== null && __privateGet(this, _cameraPositionY) < __privateGet(this, _config).panBounds.top) {
        __privateSet(this, _cameraPositionY, __privateGet(this, _config).panBounds.top - 1);
      }
      if (__privateGet(this, _config).panBounds.bottom !== null && __privateGet(this, _cameraPositionY) > __privateGet(this, _config).panBounds.bottom) {
        __privateSet(this, _cameraPositionY, __privateGet(this, _config).panBounds.bottom + 1);
      }
    }
    this.updateCamera();
  }
  /**
   * Completes a panning operation by resetting the pan start coordinates.
   * This is the final step in the three-stage panning process.
   *
   * @remarks
   * Call this method when a pan gesture ends (e.g., on mouseup or touchend).
   * This cleans up the internal pan tracking state.
   *
   * @example
   * ```typescript
   * element.addEventListener('mouseup', () => {
   *   camera.handlePanEnd();
   * });
   * ```
   */
  handlePanEnd() {
    if (!__privateGet(this, _config).enablePan) {
      return;
    }
    __privateSet(this, _cameraPanStartX, 0);
    __privateSet(this, _cameraPanStartY, 0);
  }
  /**
   * Converts world coordinates to camera viewport coordinates.
   *
   * @param worldX - The X coordinate in world space
   * @param worldY - The Y coordinate in world space
   * @returns A tuple [cameraX, cameraY] representing the point in camera coordinates
   *
   * @example
   * ```typescript
   * const [cameraX, cameraY] = camera.getCameraFromWorld(100, 200);
   * console.log(`World point (100, 200) appears at camera position (${cameraX}, ${cameraY})`);
   * ```
   */
  getCameraFromWorld(worldX, worldY) {
    const c_x = (worldX - __privateGet(this, _cameraPositionX)) * __privateGet(this, _zoom);
    const c_y = (worldY - __privateGet(this, _cameraPositionY)) * __privateGet(this, _zoom);
    return [c_x, c_y];
  }
  /**
   * Converts camera viewport coordinates to screen/browser viewport coordinates.
   *
   * @param cameraX - The X coordinate in camera space
   * @param cameraY - The Y coordinate in camera space
   * @returns A tuple [screenX, screenY] representing the point in screen coordinates
   *
   * @example
   * ```typescript
   * const [screenX, screenY] = camera.getScreenFromCamera(50, 75);
   * // Use screenX, screenY for positioning absolute elements relative to the viewport
   * ```
   */
  getScreenFromCamera(cameraX, cameraY) {
    const s_x = cameraX + __privateGet(this, _containerOffsetX);
    const s_y = cameraY + __privateGet(this, _containerOffsetY);
    return [s_x, s_y];
  }
  /**
   * Converts camera viewport coordinates to world coordinates.
   *
   * @param cameraX - The X coordinate in camera space
   * @param cameraY - The Y coordinate in camera space
   * @returns A tuple [worldX, worldY] representing the point in world coordinates
   *
   * @example
   * ```typescript
   * // Convert mouse position in camera to world coordinates
   * const [worldX, worldY] = camera.getWorldFromCamera(mouseX, mouseY);
   * console.log(`Mouse is over world position: ${worldX}, ${worldY}`);
   * ```
   */
  getWorldFromCamera(cameraX, cameraY) {
    const w_x = cameraX / __privateGet(this, _zoom) + __privateGet(this, _cameraPositionX);
    const w_y = cameraY / __privateGet(this, _zoom) + __privateGet(this, _cameraPositionY);
    return [w_x, w_y];
  }
  /**
   * Converts screen/browser viewport coordinates to camera viewport coordinates.
   *
   * @param mouseX - The X coordinate in screen space (e.g., from mouse event)
   * @param mouseY - The Y coordinate in screen space (e.g., from mouse event)
   * @returns A tuple [cameraX, cameraY] representing the point in camera coordinates
   *
   * @example
   * ```typescript
   * element.addEventListener('click', (e) => {
   *   const [cameraX, cameraY] = camera.getCameraFromScreen(e.clientX, e.clientY);
   *   console.log(`Clicked at camera position: ${cameraX}, ${cameraY}`);
   * });
   * ```
   */
  getCameraFromScreen(mouseX, mouseY) {
    mouseX = mouseX - __privateGet(this, _containerOffsetX);
    mouseY = mouseY - __privateGet(this, _containerOffsetY);
    return [mouseX, mouseY];
  }
  /**
   * Converts a movement delta in world coordinates to camera viewport coordinates.
   * Useful for transforming movement or size values between coordinate systems.
   *
   * @param worldDeltaX - The X component of movement/size in world space
   * @param worldDeltaY - The Y component of movement/size in world space
   * @returns A tuple [cameraDeltaX, cameraDeltaY] representing the delta in camera coordinates
   *
   * @example
   * ```typescript
   * // Convert a 10x10 world space rectangle to camera space
   * const [cameraWidth, cameraHeight] = camera.getCameraDeltaFromWorldDelta(10, 10);
   * ```
   */
  getCameraDeltaFromWorldDelta(worldDeltaX, worldDeltaY) {
    const c_dx = worldDeltaX * __privateGet(this, _zoom);
    const c_dy = worldDeltaY * __privateGet(this, _zoom);
    return [c_dx, c_dy];
  }
  /**
   * Converts a movement delta in camera viewport coordinates to world coordinates.
   * Useful for transforming movement or size values between coordinate systems.
   *
   * @param cameraDeltaX - The X component of movement/size in camera space
   * @param cameraDeltaY - The Y component of movement/size in camera space
   * @returns A tuple [worldDeltaX, worldDeltaY] representing the delta in world coordinates
   *
   * @example
   * ```typescript
   * // Convert a 50px camera movement to world space movement
   * const [worldDeltaX, worldDeltaY] = camera.getWorldDeltaFromCameraDelta(50, 30);
   * // Use worldDeltaX, worldDeltaY to move objects in world space
   * ```
   */
  getWorldDeltaFromCameraDelta(cameraDeltaX, cameraDeltaY) {
    const w_dx = cameraDeltaX / __privateGet(this, _zoom);
    const w_dy = cameraDeltaY / __privateGet(this, _zoom);
    return [w_dx, w_dy];
  }
}
_containerDom = new WeakMap();
_containerOffsetX = new WeakMap();
_containerOffsetY = new WeakMap();
_cameraWidth = new WeakMap();
_cameraHeight = new WeakMap();
_cameraPositionX = new WeakMap();
_cameraPositionY = new WeakMap();
_cameraPanStartX = new WeakMap();
_cameraPanStartY = new WeakMap();
_zoom = new WeakMap();
_config = new WeakMap();
_canvasStyle = new WeakMap();
_resizeObserver = new WeakMap();
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
let EventCallback$1 = class EventCallback {
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
};
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
  constructor(engineOrGlobal, parent) {
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
    this.event = new EventCallback$1(this);
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
    const { AnimationObject } = await import("./animation-y_r26ccE.mjs");
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
    const { SequenceObject } = await import("./animation-y_r26ccE.mjs");
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
      console.warn("Engine is not set, cannot add collider to collision engine");
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
      console.warn("Element is not set, cannot write DOM properties");
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
      console.warn("Element is not set, cannot write transform properties");
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
      if (!this._owner.transformOrigin) {
        throw new Error("Transform origin is not set");
      }
      transformStyle = {
        transform: generateTransformString({
          x: this._owner.transform.x - this._owner.transformOrigin.transform.x,
          y: this._owner.transform.y - this._owner.transformOrigin.transform.y,
          scaleX: this._owner.transform.scaleX * this._owner.transformOrigin.transform.scaleX,
          scaleY: this._owner.transform.scaleY * this._owner.transformOrigin.transform.scaleY
        })
      };
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
  constructor(engine, parent) {
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
    if (!__privateMethod(this, _InputControl_instances, isEventWithinEngine_fn).call(this, e.target)) {
      return;
    }
    e.stopPropagation();
    const coordinates = this.getCoordinates(e.clientX, e.clientY);
    (_b = (_a = this.event).pointerDown) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons
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
      button: e.buttons
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
    console.debug("onPointerUp", e.pointerId, coordinates);
    (_b = (_a = this.event).pointerUp) == null ? void 0 : _b.call(_a, {
      event: e,
      position: coordinates,
      gid: this._isGlobal ? GLOBAL_GID : this._ownerGID,
      button: e.buttons
    });
    let pointerData = this.globalPointerDict[e.pointerId];
    console.debug("onPointerUp", e.pointerId, pointerData);
    if (pointerData != null) {
      const gesture = this.globalGestureDict[e.pointerId];
      console.debug("onPointerUp gesture", e.pointerId, gesture);
      if (gesture != null) {
        gesture.state = "release";
        const start = this.getCoordinates(
          pointerData.startX,
          pointerData.startY
        );
        console.debug(
          "dragEnd",
          gesture.memberList.map((m) => m._ownerGID)
        );
        for (const member of gesture.memberList) {
          console.debug("dragEnd", e.pointerId, member._ownerGID);
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
          console.warn("pinchEnd", gestureKey, this._ownerGID);
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
    console.debug("onPointerCancel", e.pointerId);
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
      const startMiddle = this.getCoordinates(startMiddleX, startMiddleY);
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
        console.debug("pinchStart", startMiddle, this._ownerGID);
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
      console.debug("pinch", currentPointer0, currentPointer1, this._ownerGID);
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
    console.debug("Cancelling oldest drag", oldest.pointerId, "to enforce max drag limit");
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
class EventCallback2 {
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
    this.event = new EventCallback2(this.parent);
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
class Engine {
  constructor(config = {}, setGlobal = true) {
    __privateAdd(this, _Engine_instances);
    __publicField(this, "engineConfig");
    // #containerStyle: { [key: string]: string } = {};
    __publicField(this, "global", null);
    // Engine-specific properties
    __publicField(this, "containerElement", null);
    __publicField(this, "cursor");
    __publicField(this, "camera", null);
    __publicField(this, "collisionEngine", null);
    __publicField(this, "animationList", []);
    __publicField(this, "debugMarkerList", {});
    __publicField(this, "_event");
    __publicField(this, "event");
    __privateAdd(this, _resizeObserver2, null);
    __privateAdd(this, _animationProcessor, null);
    __privateAdd(this, _debugRenderer, null);
    if (setGlobal) {
      this.global = GlobalManager.getInstance();
      this.global.registerEngine(this);
    }
    this.cursor = {
      worldX: 0,
      worldY: 0,
      cameraX: 0,
      cameraY: 0,
      screenX: 0,
      screenY: 0
    };
    let defaultConfig = {
      cameraConfig: {
        enableZoom: true,
        enablePan: true,
        panBounds: { top: null, left: null, right: null, bottom: null }
      }
    };
    this.engineConfig = {
      ...defaultConfig,
      ...config
    };
    this._event = {
      containerElementAssigned: null
    };
    this.event = EventProxyFactory(this, this._event);
    __privateSet(this, _resizeObserver2, new ResizeObserver(() => {
      if (__privateGet(this, _debugRenderer)) {
        let containerRect = this.containerElement.getBoundingClientRect();
        __privateGet(this, _debugRenderer).updateSize(
          containerRect.width,
          containerRect.height
        );
      }
    }));
  }
  /**
   * Enables debug visualization overlay showing object bounding boxes, collision shapes,
   * coordinate grid, and debug markers.
   *
   * The debug overlay is rendered on a canvas element positioned absolutely over the container.
   * This method dynamically imports the debug module to keep it tree-shakeable.
   *
   * @returns A promise that resolves when the debug renderer is initialized
   *
   * @example
   * ```typescript
   * await engine.enableDebug();
   * // Now debug overlays will be visible
   * ```
   */
  async enableDebug() {
    if (this.containerElement == null) {
      return;
    }
    if (__privateGet(this, _debugRenderer)) {
      return;
    }
    const { DebugRendererImpl } = await import("./debug-wIi8RL1o.mjs");
    __privateSet(this, _debugRenderer, new DebugRendererImpl());
    __privateGet(this, _debugRenderer).enable(this.containerElement);
  }
  /**
   * Enables interactive camera controls for panning and zooming.
   *
   * This method dynamically imports the CameraControl module to keep it tree-shakeable.
   * Camera controls use middle mouse button for panning and scroll wheel for zooming.
   *
   * @param zoom - Whether to enable zoom controls (default: true)
   * @param pan - Whether to enable pan controls (default: true)
   * @returns A promise that resolves with the CameraControl instance
   *
   * @example
   * ```typescript
   * const controls = await engine.enableCameraControl(true, true);
   * controls.setCameraCenterPosition(100, 100);
   * ```
   */
  async enableCameraControl(zoom = true, pan = true) {
    const { CameraControl: CameraControl2 } = await Promise.resolve().then(() => cameraControl);
    const cameraControl$1 = new CameraControl2(this, zoom, pan);
    if (this.containerElement) {
      cameraControl$1.element = this.containerElement;
    }
    return cameraControl$1;
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
   * Initialize global stats, dom elements, and event listeners for the library.
   * @param containerDom: The element that contains all other elements.
   */
  assignDom(containerDom) {
    var _a, _b, _c;
    this.containerElement = containerDom;
    this.camera = new Camera(containerDom);
    (_b = (_a = this.event).containerElementAssigned) == null ? void 0 : _b.call(_a, containerDom);
    (_c = __privateGet(this, _resizeObserver2)) == null ? void 0 : _c.observe(containerDom);
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
   * Enables the collision detection engine.
   *
   * Once enabled, collision detection runs automatically during each render frame.
   * Objects can add colliders via `object.addCollider()`.
   *
   * @example
   * ```typescript
   * engine.enableCollisionEngine();
   * const collider = new CircleCollider(engine, object, 50);
   * object.addCollider(collider);
   * ```
   */
  enableCollisionEngine() {
    if (this.collisionEngine) {
      return;
    }
    this.collisionEngine = new CollisionEngine();
  }
  /**
   * Enables the animation engine for processing Web Animations API animations.
   *
   * This method dynamically sets up the animation processor that runs during each frame.
   * Animations can be added to objects via `object.addAnimation()`.
   *
   * @returns A promise that resolves when the animation engine is initialized
   *
   * @example
   * ```typescript
   * await engine.enableAnimationEngine();
   * const animation = new AnimationObject(element, { x: [0, 100] }, { duration: 1000 });
   * object.addAnimation(animation);
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
    if (__privateGet(this, _resizeObserver2) && this.containerElement) {
      __privateGet(this, _resizeObserver2).unobserve(this.containerElement);
      __privateSet(this, _resizeObserver2, null);
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
_resizeObserver2 = new WeakMap();
_animationProcessor = new WeakMap();
_debugRenderer = new WeakMap();
_Engine_instances = new WeakSet();
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
    __privateAdd(this, _config2);
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
    __privateSet(this, _config2, config);
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
    return __privateGet(this, _config2);
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
    console.debug(`Pointer down on connector ${this.gid}`);
    this.inputEngine.resetDragMembers();
    if (currentIncomingLines.length > 0) {
      this.startPickUpLine(currentIncomingLines[0], prop);
      return;
    }
    if (__privateGet(this, _config2).allowDragOut) {
      console.debug("Starting drag out line");
      this.startDragOutLine(prop);
    }
  }
  deleteLine(i) {
    console.debug(`Deleting line ${this.gid} at index ${i}`);
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
    if (__privateGet(this, _config2).lineClass) {
      line = new (__privateGet(this, _config2)).lineClass(this.engine, this);
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
    console.debug(`Running drag out line ${this.gid}`);
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
      console.debug(`Error: targetConnector is null`);
      return;
    }
    if (targetConnector.gid == this.gid) {
      return;
    }
    const connectorCenter = targetConnector.center;
    return [connectorCenter.x, connectorCenter.y];
  }
  endDragOutLine(_) {
    console.debug(`Ending drag out line ${this.gid}`);
    this.inputEngine.resetDragMembers();
    if (__privateGet(this, _targetConnector) && __privateGet(this, _targetConnector) instanceof _ConnectorComponent) {
      console.debug(`Connecting ${this.gid} to ${__privateGet(this, _targetConnector).gid}`);
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
      console.debug(`Deleting line ${this.gid} at index 0`);
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
    console.debug(`Connecting ${this.gid} to connector ${connector.gid}`);
    const currentIncomingLines = connector.incomingLines.filter(
      (i) => !i._requestDelete
    );
    if (currentIncomingLines.some((i) => i.start == this)) {
      console.warn(
        `Connector ${connector} already has a line connected to this connector`
      );
      return false;
    }
    if (connector.config.maxConnectors === currentIncomingLines.length) {
      console.warn(
        `Connector ${connector.name} already has max number of connectors (${connector.config.maxConnectors}) connected`
      );
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
    console.debug(`Disconnecting ${this.gid} from connector ${connector.gid}`);
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
_config2 = new WeakMap();
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
    this._selectHitBox.event.collider.onEndContact = (thisObject, otherObject) => {
      console.debug("onEndContact", thisObject, otherObject);
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
class CameraControl extends ElementObject {
  constructor(engine, zoomLock = false, panLock = false) {
    super(engine, null);
    __publicField(this, "_state", "idle");
    __publicField(this, "_mouseDownX");
    __publicField(this, "_mouseDownY");
    // _canvasElement: HTMLElement | null = null;
    __publicField(this, "zoomLock");
    __publicField(this, "panLock");
    __publicField(this, "resizeObserver", null);
    __privateAdd(this, _prevCameraX, 0);
    __privateAdd(this, _prevCameraY, 0);
    this.zoomLock = zoomLock;
    this.panLock = panLock;
    this._mouseDownX = 0;
    this._mouseDownY = 0;
    this._state = "idle";
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
    this.resizeObserver = null;
    __privateSet(this, _prevCameraX, 0);
    __privateSet(this, _prevCameraY, 0);
    this.engine.event.containerElementAssigned = () => {
      this.resizeObserver = new ResizeObserver(() => {
        this.setCameraPosition(__privateGet(this, _prevCameraX), __privateGet(this, _prevCameraY));
        this.paintCamera();
      });
      this.resizeObserver.observe(this.engine.containerElement);
      this.resizeObserver.observe(window.document.body);
    };
  }
  paintCamera() {
    var _a, _b, _c;
    (_a = this.engine.camera) == null ? void 0 : _a.updateCameraProperty();
    (_b = this.engine.camera) == null ? void 0 : _b.updateCamera();
    this.style.transform = (_c = this.engine.camera) == null ? void 0 : _c.canvasStyle;
    this.requestTransform("WRITE_2");
  }
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
  onCursorDown(prop) {
    var _a;
    if (prop.event.button != 1) {
      return;
    }
    if (this.panLock) {
      return;
    }
    this._state = "panning";
    this._mouseDownX = prop.position.screenX;
    this._mouseDownY = prop.position.screenY;
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanStart();
    prop.event.preventDefault();
  }
  onCursorMove(prop) {
    var _a, _b;
    if (this._state != "panning") {
      return;
    }
    const dx = prop.position.screenX - this._mouseDownX;
    const dy = prop.position.screenY - this._mouseDownY;
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanDrag(dx, dy);
    this.style.transform = (_b = this.engine.camera) == null ? void 0 : _b.canvasStyle;
    this.requestTransform("WRITE_2");
  }
  onCursorUp(_prop2) {
    var _a, _b, _c, _d;
    if (this._state != "panning") {
      return;
    }
    this._state = "idle";
    (_a = this.engine.camera) == null ? void 0 : _a.handlePanEnd();
    this.style.transform = (_b = this.engine.camera) == null ? void 0 : _b.canvasStyle;
    __privateSet(this, _prevCameraX, ((_c = this.engine.camera) == null ? void 0 : _c.cameraPositionX) || 0);
    __privateSet(this, _prevCameraY, ((_d = this.engine.camera) == null ? void 0 : _d.cameraPositionY) || 0);
    this.requestTransform("WRITE_2");
  }
  onZoom(prop) {
    if (this.zoomLock) {
      return;
    }
    const camera = this.engine.camera;
    if (prop.position.screenX < camera.containerOffsetX || prop.position.screenX > camera.containerOffsetX + camera.cameraWidth || prop.position.screenY < camera.containerOffsetY || prop.position.screenY > camera.containerOffsetY + camera.cameraHeight) {
      return;
    }
    this.zoomBy(prop.delta / 2e3, prop.position.cameraX, prop.position.cameraY);
    prop.event.preventDefault();
  }
  zoomBy(deltaZoom, originX, originY) {
    if (this.zoomLock) {
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
}
_prevCameraX = new WeakMap();
_prevCameraY = new WeakMap();
const cameraControl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  CameraControl
}, Symbol.toStringTag, { value: "Module" }));
export {
  Background,
  BaseObject,
  CameraControl,
  ConnectorComponent,
  ElementObject,
  Engine,
  GlobalManager,
  LineComponent,
  NodeComponent,
  RectSelectComponent
};
