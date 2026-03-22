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
var _containerDom, _containerOffsetX, _containerOffsetY, _cameraWidth, _cameraHeight, _cameraPositionX, _cameraPositionY, _cameraPanStartX, _cameraPanStartY, _zoom, _config, _canvasStyle, _engine, _engineIdCounter, _engineIds, _animationFrameId, _GlobalManager_instances, startRenderLoop_fn, stopRenderLoop_fn, ensureInputEngine_fn, ensureEngineId_fn, ensureGlobalObjectTable_fn, _animationProcessor, _debugRenderer, _eventSubscribers, _resizeObserver, _Engine_instances, updateContainerBounds_fn, publishEvent_fn, processQueue_fn;
import { G as GlobalInputControl, E as ElementObject, d as detachAnimationFromOwner } from "./input-Rkk-Hba2.js";
import { B, a, g, m } from "./input-Rkk-Hba2.js";
class Camera {
  /**
   * Creates a new Camera instance for panning and zooming a DOM element.
   *
   * @param engine - The engine instance that manages the camera
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
  constructor(engine, config = {}) {
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
    __privateAdd(this, _engine);
    __privateSet(this, _engine, engine);
    __privateSet(this, _containerDom, null);
    __privateSet(this, _containerOffsetX, 0);
    __privateSet(this, _containerOffsetY, 0);
    __privateSet(this, _cameraWidth, 0);
    __privateSet(this, _cameraHeight, 0);
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
  set containerDom(element) {
    __privateSet(this, _containerDom, element);
    this.updateCameraProperty();
    this.updateCamera();
    __privateGet(this, _engine).subscribeEvent("containerResized", "camera", (props) => {
      this.updateCameraProperty(props.bounds);
      this.updateCamera();
    });
    __privateGet(this, _engine).subscribeEvent("containerMoved", "camera", (props) => {
      this.updateCameraProperty(props.bounds);
      this.updateCamera();
    });
  }
  /**
   * Updates the camera's dimensional properties from the provided bounds or by reading from DOM.
   * This method is automatically called when the container is resized or moved.
   *
   * @param bounds - Optional pre-computed container bounds. If not provided, reads from DOM.
   */
  updateCameraProperty(bounds) {
    if (!__privateGet(this, _containerDom)) {
      return;
    }
    const rect = bounds ?? __privateGet(this, _containerDom).getBoundingClientRect();
    __privateSet(this, _containerOffsetX, rect.left);
    __privateSet(this, _containerOffsetY, rect.top);
    __privateSet(this, _cameraWidth, rect.width);
    __privateSet(this, _cameraHeight, rect.height);
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
_engine = new WeakMap();
class StationaryCamera extends Camera {
  handleScroll(_, __, ___) {
  }
  handlePan(_, __) {
  }
  handlePanStart() {
  }
  handlePanDrag(_, __) {
  }
  handlePanEnd() {
  }
}
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
ensureInputEngine_fn = function(_engine2) {
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
    __privateMethod(this, _Engine_instances, updateContainerBounds_fn).call(this, element);
    __privateSet(this, _resizeObserver, new ResizeObserver(() => {
      __privateMethod(this, _Engine_instances, updateContainerBounds_fn).call(this, this.containerElement);
      __privateMethod(this, _Engine_instances, publishEvent_fn).call(this, "containerResized", this.containerElement);
    }));
    (_a = __privateGet(this, _resizeObserver)) == null ? void 0 : _a.observe(element);
    (_b = __privateGet(this, _resizeObserver)) == null ? void 0 : _b.observe(window.document.body);
    window.addEventListener("scroll", () => {
      __privateMethod(this, _Engine_instances, updateContainerBounds_fn).call(this, this.containerElement);
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
 * Update the cached container bounds from an element's bounding rect.
 * @internal
 */
updateContainerBounds_fn = function(element) {
  const rect = element.getBoundingClientRect();
  this.containerBounds = {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height
  };
};
/**
 * Publish an event to all subscribers.
 * @internal
 */
publishEvent_fn = function(event, element) {
  const callbacks = Object.values(__privateGet(this, _eventSubscribers)[event]);
  if (callbacks.length === 0) {
    return;
  }
  __privateMethod(this, _Engine_instances, updateContainerBounds_fn).call(this, element);
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
export {
  B as BaseObject,
  Camera,
  ElementObject,
  Engine,
  a as EventProxyFactory,
  GlobalManager,
  g as getDomProperty,
  m as mouseButtonBitmap
};
