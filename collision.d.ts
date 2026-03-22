import { UUID } from 'crypto';

declare interface AnimationInterface {
    play(): void;
    pause(): void;
    cancel(): void;
    reverse(): void;
    calculateFrame(currentTime: number): boolean;
    currentTime: number;
    progress: number;
    requestDelete: boolean;
}

declare interface AnimationInterface_2 {
    play(): void;
    pause(): void;
    cancel(): void;
    reverse(): void;
    calculateFrame(currentTime: number): boolean;
    currentTime: number;
    progress: number;
    requestDelete: boolean;
}

/**
 * Base class for all objects in the engine.
 *
 * Provides core functionality for:
 * - Transform management (position, scale)
 * - Parent-child hierarchies
 * - Event handling (global and input events)
 * - Collision detection
 * - Animations
 * - Debug markers
 *
 * Each object belongs to a specific Engine instance while sharing the global
 * GlobalManager singleton for ID generation.
 *
 * @example
 * ```typescript
 * const obj = new BaseObject(engine, parentObject);
 * obj.worldPosition = [100, 200];
 * obj.addCollider(new CircleCollider(obj.engine, obj, 50));
 * ```
 */
declare class BaseObject {
    global: GlobalManager;
    engine: any;
    gid: string;
    parent: BaseObject | null;
    children: BaseObject[];
    transform: TransformProperty;
    local: TransformProperty;
    offset: TransformProperty;
    event: EventCallback;
    _requestPreRead: boolean;
    _requestWrite: boolean;
    _requestRead: boolean;
    _requestDelete: boolean;
    _requestPostWrite: boolean;
    _colliderList: Collider[];
    _animationList: AnimationInterface[];
    _globalInput: InputEventCallback;
    globalInput: InputEventCallback;
    constructor(engineOrGlobal: any, parent?: BaseObject | null);
    destroy(): void;
    get worldPosition(): [number, number];
    set worldPosition(position: [number, number]);
    get cameraPosition(): [number, number];
    set cameraPosition(position: [number, number]);
    get screenPosition(): [number, number];
    set screenPosition(position: [number, number]);
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
    queueUpdate(stage?: "READ_1" | "WRITE_1" | "READ_2" | "WRITE_2" | "READ_3" | "WRITE_3", callback?: null | (() => void), queueID?: string | null): queueEntry;
    /**
     * Read the DOM property of the object.
     */
    readDom(_?: boolean): void;
    /**
     * Write all object properties to the DOM.
     */
    writeDom(): void;
    /**
     * Write the CSS transform property of the object.
     * Unlike many other properties, the transform property does not trigger a DOM reflow and is thus more performant.
     * Whenever possible, use this method to write the transform property.
     */
    writeTransform(): void;
    /**
     * Destroy the DOM element of the object.
     */
    destroyDom(): void;
    /**
     * Calculate the transform properties of the object based on the saved transform properties of the parent
     * and the saved local and offset properties of the object.
     */
    calculateLocalFromTransform(): void;
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
    addAnimation(animation: AnimationInterface, options?: {
        replaceExisting?: boolean;
    }): AnimationInterface;
    cancelAnimations(): void;
    removeAnimationReference(animation: AnimationInterface): void;
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
    animate(keyframe: Record<string, any>, property: any): Promise<AnimationInterface>;
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
    animateSequence(animations: AnimationInterface[]): Promise<AnimationInterface>;
    get animation(): AnimationInterface | null;
    getCurrentStats(): frameStats;
    addCollider(collider: Collider): void;
    addDebugPoint(x: number, y: number, color?: string, persistent?: boolean, id?: string): void;
    addDebugRect(x: number, y: number, width: number, height: number, color?: string, persistent?: boolean, id?: string, filled?: boolean, lineWidth?: number): void;
    addDebugLine(x1: number, y1: number, x2: number, y2: number, color?: string, persistent?: boolean, id?: string, lineWidth?: number): void;
    addDebugCircle(x: number, y: number, radius: number, color?: string, persistent?: boolean, id?: string): void;
    addDebugText(x: number, y: number, text: string, color?: string, persistent?: boolean, id?: string): void;
    clearDebugMarker(id: string): void;
    clearAllDebugMarkers(): void;
}

/**
 * Base class for all objects in the engine.
 *
 * Provides core functionality for:
 * - Transform management (position, scale)
 * - Parent-child hierarchies
 * - Event handling (global and input events)
 * - Collision detection
 * - Animations
 * - Debug markers
 *
 * Each object belongs to a specific Engine instance while sharing the global
 * GlobalManager singleton for ID generation.
 *
 * @example
 * ```typescript
 * const obj = new BaseObject(engine, parentObject);
 * obj.worldPosition = [100, 200];
 * obj.addCollider(new CircleCollider(obj.engine, obj, 50));
 * ```
 */
declare class BaseObject_2 {
    global: GlobalManager_2;
    engine: any;
    gid: string;
    parent: BaseObject_2 | null;
    children: BaseObject_2[];
    transform: TransformProperty_2;
    local: TransformProperty_2;
    offset: TransformProperty_2;
    event: EventCallback_2;
    _requestPreRead: boolean;
    _requestWrite: boolean;
    _requestRead: boolean;
    _requestDelete: boolean;
    _requestPostWrite: boolean;
    _colliderList: Collider_2[];
    _animationList: AnimationInterface_2[];
    _globalInput: InputEventCallback_2;
    globalInput: InputEventCallback_2;
    constructor(engineOrGlobal: any, parent?: BaseObject_2 | null);
    destroy(): void;
    get worldPosition(): [number, number];
    set worldPosition(position: [number, number]);
    get cameraPosition(): [number, number];
    set cameraPosition(position: [number, number]);
    get screenPosition(): [number, number];
    set screenPosition(position: [number, number]);
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
    queueUpdate(stage?: "READ_1" | "WRITE_1" | "READ_2" | "WRITE_2" | "READ_3" | "WRITE_3", callback?: null | (() => void), queueID?: string | null): queueEntry_2;
    /**
     * Read the DOM property of the object.
     */
    readDom(_?: boolean): void;
    /**
     * Write all object properties to the DOM.
     */
    writeDom(): void;
    /**
     * Write the CSS transform property of the object.
     * Unlike many other properties, the transform property does not trigger a DOM reflow and is thus more performant.
     * Whenever possible, use this method to write the transform property.
     */
    writeTransform(): void;
    /**
     * Destroy the DOM element of the object.
     */
    destroyDom(): void;
    /**
     * Calculate the transform properties of the object based on the saved transform properties of the parent
     * and the saved local and offset properties of the object.
     */
    calculateLocalFromTransform(): void;
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
    addAnimation(animation: AnimationInterface_2, options?: {
        replaceExisting?: boolean;
    }): AnimationInterface_2;
    cancelAnimations(): void;
    removeAnimationReference(animation: AnimationInterface_2): void;
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
    animate(keyframe: Record<string, any>, property: any): Promise<AnimationInterface_2>;
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
    animateSequence(animations: AnimationInterface_2[]): Promise<AnimationInterface_2>;
    get animation(): AnimationInterface_2 | null;
    getCurrentStats(): frameStats_2;
    addCollider(collider: Collider_2): void;
    addDebugPoint(x: number, y: number, color?: string, persistent?: boolean, id?: string): void;
    addDebugRect(x: number, y: number, width: number, height: number, color?: string, persistent?: boolean, id?: string, filled?: boolean, lineWidth?: number): void;
    addDebugLine(x1: number, y1: number, x2: number, y2: number, color?: string, persistent?: boolean, id?: string, lineWidth?: number): void;
    addDebugCircle(x: number, y: number, radius: number, color?: string, persistent?: boolean, id?: string): void;
    addDebugText(x: number, y: number, text: string, color?: string, persistent?: boolean, id?: string): void;
    clearDebugMarker(id: string): void;
    clearAllDebugMarkers(): void;
}

declare class Camera {
    #private;
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
    constructor(engine: Engine, config?: CameraConfig);
    /**
     * Gets the current width of the camera viewport.
     * @returns The camera viewport width in pixels
     */
    get cameraWidth(): number;
    /**
     * Gets the current height of the camera viewport.
     * @returns The camera viewport height in pixels
     */
    get cameraHeight(): number;
    /**
     * Gets the current X position of the camera in world coordinates.
     * @returns The camera X position
     */
    get cameraPositionX(): number;
    /**
     * Gets the current Y position of the camera in world coordinates.
     * @returns The camera Y position
     */
    get cameraPositionY(): number;
    /**
     * Gets the current zoom level of the camera.
     * @returns The zoom level (1.0 = no zoom, <1 = zoomed out, >1 = zoomed in)
     */
    get zoom(): number;
    /**
     * Gets the X offset of the container element relative to the viewport.
     * @returns The container X offset in pixels
     */
    get containerOffsetX(): number;
    /**
     * Gets the Y offset of the container element relative to the viewport.
     * @returns The container Y offset in pixels
     */
    get containerOffsetY(): number;
    set containerDom(element: HTMLElement | null);
    /**
     * Updates the camera's dimensional properties from the provided bounds or by reading from DOM.
     * This method is automatically called when the container is resized or moved.
     *
     * @param bounds - Optional pre-computed container bounds. If not provided, reads from DOM.
     */
    updateCameraProperty(bounds?: ContainerBounds): void;
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
    worldToCameraMatrix(cameraX: number, cameraY: number, zoom: number): string;
    /**
     * Updates the camera's CSS transformation style based on current position and zoom.
     * This method should be called after any changes to camera position or zoom level.
     *
     * @remarks
     * The generated style can be retrieved via the `canvasStyle` getter and applied to DOM elements
     * to reflect the current camera view transformation.
     */
    updateCamera(): void;
    /**
     * Gets the current CSS transformation style string for the camera.
     * @returns A CSS transform string that can be applied to DOM elements
     */
    get canvasStyle(): string;
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
    setCameraPosition(x: number, y: number): void;
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
    setCameraCenterPosition(x: number, y: number): void;
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
    getCameraCenterPosition(): {
        x: number;
        y: number;
    };
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
    handleScroll(deltaZoom: number, cameraX: number, cameraY: number): void;
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
    handlePan(deltaX: number, deltaY: number): void;
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
    handlePanStart(): void;
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
    handlePanDrag(deltaX: number, deltaY: number): void;
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
    handlePanEnd(): void;
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
    getCameraFromWorld(worldX: number, worldY: number): [number, number];
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
    getScreenFromCamera(cameraX: number, cameraY: number): [number, number];
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
    getWorldFromCamera(cameraX: number, cameraY: number): [number, number];
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
    getCameraFromScreen(mouseX: number, mouseY: number): [number, number];
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
    getCameraDeltaFromWorldDelta(worldDeltaX: number, worldDeltaY: number): [number, number];
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
    getWorldDeltaFromCameraDelta(cameraDeltaX: number, cameraDeltaY: number): [number, number];
}

declare class Camera_2 {
    #private;
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
    constructor(engine: Engine_2, config?: CameraConfig_2);
    /**
     * Gets the current width of the camera viewport.
     * @returns The camera viewport width in pixels
     */
    get cameraWidth(): number;
    /**
     * Gets the current height of the camera viewport.
     * @returns The camera viewport height in pixels
     */
    get cameraHeight(): number;
    /**
     * Gets the current X position of the camera in world coordinates.
     * @returns The camera X position
     */
    get cameraPositionX(): number;
    /**
     * Gets the current Y position of the camera in world coordinates.
     * @returns The camera Y position
     */
    get cameraPositionY(): number;
    /**
     * Gets the current zoom level of the camera.
     * @returns The zoom level (1.0 = no zoom, <1 = zoomed out, >1 = zoomed in)
     */
    get zoom(): number;
    /**
     * Gets the X offset of the container element relative to the viewport.
     * @returns The container X offset in pixels
     */
    get containerOffsetX(): number;
    /**
     * Gets the Y offset of the container element relative to the viewport.
     * @returns The container Y offset in pixels
     */
    get containerOffsetY(): number;
    set containerDom(element: HTMLElement | null);
    /**
     * Updates the camera's dimensional properties from the provided bounds or by reading from DOM.
     * This method is automatically called when the container is resized or moved.
     *
     * @param bounds - Optional pre-computed container bounds. If not provided, reads from DOM.
     */
    updateCameraProperty(bounds?: ContainerBounds_2): void;
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
    worldToCameraMatrix(cameraX: number, cameraY: number, zoom: number): string;
    /**
     * Updates the camera's CSS transformation style based on current position and zoom.
     * This method should be called after any changes to camera position or zoom level.
     *
     * @remarks
     * The generated style can be retrieved via the `canvasStyle` getter and applied to DOM elements
     * to reflect the current camera view transformation.
     */
    updateCamera(): void;
    /**
     * Gets the current CSS transformation style string for the camera.
     * @returns A CSS transform string that can be applied to DOM elements
     */
    get canvasStyle(): string;
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
    setCameraPosition(x: number, y: number): void;
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
    setCameraCenterPosition(x: number, y: number): void;
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
    getCameraCenterPosition(): {
        x: number;
        y: number;
    };
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
    handleScroll(deltaZoom: number, cameraX: number, cameraY: number): void;
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
    handlePan(deltaX: number, deltaY: number): void;
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
    handlePanStart(): void;
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
    handlePanDrag(deltaX: number, deltaY: number): void;
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
    handlePanEnd(): void;
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
    getCameraFromWorld(worldX: number, worldY: number): [number, number];
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
    getScreenFromCamera(cameraX: number, cameraY: number): [number, number];
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
    getWorldFromCamera(cameraX: number, cameraY: number): [number, number];
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
    getCameraFromScreen(mouseX: number, mouseY: number): [number, number];
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
    getCameraDeltaFromWorldDelta(worldDeltaX: number, worldDeltaY: number): [number, number];
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
    getWorldDeltaFromCameraDelta(cameraDeltaX: number, cameraDeltaY: number): [number, number];
}

declare interface CameraConfig {
    enableZoom?: boolean;
    zoomBounds?: {
        min: number;
        max: number;
    };
    enablePan?: boolean;
    panBounds?: {
        top: number | null;
        left: number | null;
        right: number | null;
        bottom: number | null;
    };
    handleResize?: boolean;
}

declare interface CameraConfig_2 {
    enableZoom?: boolean;
    zoomBounds?: {
        min: number;
        max: number;
    };
    enablePan?: boolean;
    panBounds?: {
        top: number | null;
        left: number | null;
        right: number | null;
        bottom: number | null;
    };
    handleResize?: boolean;
}

/**
 * Circular collision shape.
 *
 * Defines a circle for collision detection. The circle is centered at the collider's position
 * with the specified radius.
 *
 * @example
 * ```typescript
 * const circleCollider = new CircleCollider(engine, object, 0, 0, 25);
 * circleCollider.event.collider.onBeginContact = (self, other) => {
 *   console.log('Circle collision!');
 * };
 * object.addCollider(circleCollider);
 * ```
 */
export declare class CircleCollider extends Collider {
    radius: number;
    constructor(engine: Engine, parent: BaseObject, localX: number, localY: number, radius: number);
}

/**
 * Circular collision shape.
 *
 * Defines a circle for collision detection. The circle is centered at the collider's position
 * with the specified radius.
 *
 * @example
 * ```typescript
 * const circleCollider = new CircleCollider(engine, object, 0, 0, 25);
 * circleCollider.event.collider.onBeginContact = (self, other) => {
 *   console.log('Circle collision!');
 * };
 * object.addCollider(circleCollider);
 * ```
 */
declare class CircleCollider_2 extends Collider_2 {
    radius: number;
    constructor(engine: Engine_2, parent: BaseObject_2, localX: number, localY: number, radius: number);
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
 *
 * @example
 * ```typescript
 * const collider = new CircleCollider(engine, object, 50);
 * collider.event.collider.onBeginContact = (self, other) => {
 *   console.log('Collision detected!');
 * };
 * object.addCollider(collider);
 * ```
 */
export declare class Collider {
    global: GlobalManager;
    engine: Engine;
    parent: BaseObject;
    type: "rect" | "circle" | "line" | "point" | "svg";
    uuid: symbol;
    _element: HTMLElement | null;
    inputEngine: InputControl;
    transform: ColliderProperty_2;
    event: EventCallback_3;
    _currentCollisions: Set<Collider>;
    _iterationCollisions: Set<Collider>;
    constructor(engine: any, parent: BaseObject, type: "rect" | "circle" | "line" | "point" | "svg", localX: number, localY: number);
    get worldPosition(): [number, number];
    set worldPosition([x, y]: [number, number]);
    set element(element: HTMLElement);
    read(): void;
    recalculate(): void;
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
 *
 * @example
 * ```typescript
 * const collider = new CircleCollider(engine, object, 50);
 * collider.event.collider.onBeginContact = (self, other) => {
 *   console.log('Collision detected!');
 * };
 * object.addCollider(collider);
 * ```
 */
declare class Collider_2 {
    global: GlobalManager_2;
    engine: Engine_2;
    parent: BaseObject_2;
    type: "rect" | "circle" | "line" | "point" | "svg";
    uuid: symbol;
    _element: HTMLElement | null;
    inputEngine: InputControl_2;
    transform: ColliderProperty;
    event: EventCallback_2_2;
    _currentCollisions: Set<Collider_2>;
    _iterationCollisions: Set<Collider_2>;
    constructor(engine: any, parent: BaseObject_2, type: "rect" | "circle" | "line" | "point" | "svg", localX: number, localY: number);
    get worldPosition(): [number, number];
    set worldPosition([x, y]: [number, number]);
    set element(element: HTMLElement);
    read(): void;
    recalculate(): void;
}

declare interface ColliderProperty {
    x: number;
    y: number;
    width: number;
    height: number;
}

declare interface ColliderProperty_2 {
    x: number;
    y: number;
    width: number;
    height: number;
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
 *
 * @example
 * ```typescript
 * const collisionEngine = new CollisionEngine();
 * // Add colliders via object.addCollider()
 * // Call detectCollisions() each frame to check for collisions
 * collisionEngine.detectCollisions();
 * ```
 */
export declare class CollisionEngine {
    objectTable: Record<symbol, Collider>;
    objectList: Collider[];
    sortedXCoordinates: SortedEntry_2[];
    constructor();
    addObject(object: Collider): void;
    removeObject(uuid: symbol): void;
    updateXCoordinates(): void;
    sortXCoordinates(): void;
    detectCollisions(): void;
    isIntersecting(a: Collider, b: Collider): boolean;
    onColliderCollide(thisObject: Collider, otherObject: Collider): void;
    isRectIntersecting(a: Collider, b: Collider): boolean;
    isRectCircleIntersecting(rect: RectCollider, circle: CircleCollider): boolean;
    isRectPointIntersecting(rect: RectCollider, point: PointCollider): boolean;
    isCirclePointIntersecting(circle: CircleCollider, point: PointCollider): boolean;
    isCircleIntersecting(circleA: CircleCollider, circleB: CircleCollider): boolean;
    isPointPointIntersecting(pointA: PointCollider, pointB: PointCollider): boolean;
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
 *
 * @example
 * ```typescript
 * const collisionEngine = new CollisionEngine();
 * // Add colliders via object.addCollider()
 * // Call detectCollisions() each frame to check for collisions
 * collisionEngine.detectCollisions();
 * ```
 */
declare class CollisionEngine_2 {
    objectTable: Record<symbol, Collider_2>;
    objectList: Collider_2[];
    sortedXCoordinates: SortedEntry[];
    constructor();
    addObject(object: Collider_2): void;
    removeObject(uuid: symbol): void;
    updateXCoordinates(): void;
    sortXCoordinates(): void;
    detectCollisions(): void;
    isIntersecting(a: Collider_2, b: Collider_2): boolean;
    onColliderCollide(thisObject: Collider_2, otherObject: Collider_2): void;
    isRectIntersecting(a: Collider_2, b: Collider_2): boolean;
    isRectCircleIntersecting(rect: RectCollider_2, circle: CircleCollider_2): boolean;
    isRectPointIntersecting(rect: RectCollider_2, point: PointCollider_2): boolean;
    isCirclePointIntersecting(circle: CircleCollider_2, point: PointCollider_2): boolean;
    isCircleIntersecting(circleA: CircleCollider_2, circleB: CircleCollider_2): boolean;
    isPointPointIntersecting(pointA: PointCollider_2, pointB: PointCollider_2): boolean;
}

declare interface CollisionEvent {
    onCollide: null | ((thisObject: Collider_2, otherObject: Collider_2) => void);
    onBeginContact: null | ((thisObject: Collider_2, otherObject: Collider_2) => void);
    onEndContact: null | ((thisObject: Collider_2, otherObject: Collider_2) => void);
}

declare interface CollisionEvent_2 {
    onCollide: null | ((thisObject: Collider, otherObject: Collider) => void);
    onBeginContact: null | ((thisObject: Collider, otherObject: Collider) => void);
    onEndContact: null | ((thisObject: Collider, otherObject: Collider) => void);
}

/**
 * Container bounds data passed to engine event callbacks.
 */
declare interface ContainerBounds {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

/**
 * Container bounds data passed to engine event callbacks.
 */
declare interface ContainerBounds_2 {
    left: number;
    top: number;
    right: number;
    bottom: number;
    width: number;
    height: number;
}

declare class DebugRenderer implements DebugRendererInterface {
    #private;
    debugWindow: HTMLCanvasElement | null;
    debugCtx: CanvasRenderingContext2D | null;
    enable(engine: Engine_2): void;
    disable(): void;
    updateSize(width: number, height: number): void;
    renderFrame(_stats: frameStats_2, engine: any, objectTable: Record<string, BaseObject_2>): void;
    private debugObjectBoundingBox;
    private renderDebugGrid;
}

declare interface DebugRendererInterface {
    enable(engine: Engine_2): void;
    disable(): void;
    renderFrame(stats: frameStats_2, engine: any, objectTable: Record<string, BaseObject_2>): void;
    updateSize(width: number, height: number): void;
}

declare interface DomEvent {
    onAssignDom: null | (() => void);
    onResize: null | (() => void);
}

declare interface DomEvent_2 {
    onAssignDom: null | (() => void);
    onResize: null | (() => void);
}

declare interface dragEndProp {
    gid: string | null;
    pointerId: number;
    start: eventPosition;
    end: eventPosition;
    button: number;
}

declare interface dragEndProp_2 {
    gid: string | null;
    pointerId: number;
    start: eventPosition_2;
    end: eventPosition_2;
    button: number;
}

declare interface dragGesture {
    type: gestureType;
    state: "idle" | "drag" | "release";
    initiatorID: string;
    memberList: InputControl[];
}

declare interface dragGesture_2 {
    type: gestureType_2;
    state: "idle" | "drag" | "release";
    initiatorID: string;
    memberList: InputControl_2[];
}

declare interface dragProp {
    gid: string | null;
    pointerId: number;
    start: eventPosition;
    position: eventPosition;
    delta: eventPosition;
    button: number;
}

declare interface dragProp_2 {
    gid: string | null;
    pointerId: number;
    start: eventPosition_2;
    position: eventPosition_2;
    delta: eventPosition_2;
    button: number;
}

declare interface dragStartProp {
    gid: string | null;
    pointerId: number;
    start: eventPosition;
    button: number;
    isWithinEngine: boolean;
}

declare interface dragStartProp_2 {
    gid: string | null;
    pointerId: number;
    start: eventPosition_2;
    button: number;
    isWithinEngine: boolean;
}

/**
 * The main engine class that manages the rendering loop, object updates,
 * and optional features like animations, collisions, camera controls, and debugging.
 *
 * Multiple Engine instances can coexist, each managing their own canvas and render pipeline
 * while sharing a global GlobalManager singleton for ID generation and global input.
 *
 * Features can be enabled on-demand to keep bundle sizes small:
 * - Animation engine via `enableAnimationEngine()`
 * - Collision detection via `enableCollisionEngine()`
 * - Camera controls via `enableCameraControl()`
 * - Debug visualization via `enableDebug()`
 *
 * @example
 * ```typescript
 * const engine = new Engine();
 * engine.assignDom(document.getElementById('container'));
 * await engine.enableAnimationEngine();
 * await engine.enableDebug();
 * ```
 *
 * @example
 * ```typescript
 * // Multiple engines sharing the same GlobalManager
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine();
 * ```
 */
declare class Engine {
    #private;
    engineConfig: EngineConfig;
    global: GlobalManager | null;
    containerElement: HTMLElement | null;
    containerBounds: ContainerBounds | null;
    camera: Camera | null;
    collisionEngine: CollisionEngine | null;
    animationList: AnimationInterface[];
    debugMarkerList: Record<string, {
        type: "point" | "rect" | "circle" | "text";
        gid: string;
        id: string;
        persistent: boolean;
        color: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        radius?: number;
        text?: string;
    }>;
    constructor(config?: EngineConfig);
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
    subscribeEvent(event: EngineEventType, id: string, callback: (props: EngineEventProps) => void): void;
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
    unsubscribeEvent(event: EngineEventType, id: string): void;
    /**
     * Initialize dom elements, and event listeners for the library.
     * This must be handled outside the constructor since many frontend frameworks
     * run Component constructors before the DOM element is available.
     *
     * @param element: The element acting as the container.
     */
    assignDom(element: HTMLElement): void;
    set element(containerDom: HTMLElement);
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
    setDebugRenderer(renderer: DebugRenderer): void;
    /**
     * Disables and removes the debug visualization overlay.
     */
    disableDebug(): void;
    /* Excluded from this release type: _processStage */
    /* Excluded from this release type: _processAnimations */
    /* Excluded from this release type: _processPostRender */
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
    setCollisionEngine(collisionEngine: CollisionEngine): void;
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
    enableAnimationEngine(): void;
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
    destroy(): void;
}

/**
 * The main engine class that manages the rendering loop, object updates,
 * and optional features like animations, collisions, camera controls, and debugging.
 *
 * Multiple Engine instances can coexist, each managing their own canvas and render pipeline
 * while sharing a global GlobalManager singleton for ID generation and global input.
 *
 * Features can be enabled on-demand to keep bundle sizes small:
 * - Animation engine via `enableAnimationEngine()`
 * - Collision detection via `enableCollisionEngine()`
 * - Camera controls via `enableCameraControl()`
 * - Debug visualization via `enableDebug()`
 *
 * @example
 * ```typescript
 * const engine = new Engine();
 * engine.assignDom(document.getElementById('container'));
 * await engine.enableAnimationEngine();
 * await engine.enableDebug();
 * ```
 *
 * @example
 * ```typescript
 * // Multiple engines sharing the same GlobalManager
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine();
 * ```
 */
declare class Engine_2 {
    #private;
    engineConfig: EngineConfig_2;
    global: GlobalManager_2 | null;
    containerElement: HTMLElement | null;
    containerBounds: ContainerBounds_2 | null;
    camera: Camera_2 | null;
    collisionEngine: CollisionEngine_2 | null;
    animationList: AnimationInterface_2[];
    debugMarkerList: Record<string, {
        type: "point" | "rect" | "circle" | "text";
        gid: string;
        id: string;
        persistent: boolean;
        color: string;
        x: number;
        y: number;
        width?: number;
        height?: number;
        radius?: number;
        text?: string;
    }>;
    constructor(config?: EngineConfig_2);
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
    subscribeEvent(event: EngineEventType_2, id: string, callback: (props: EngineEventProps_2) => void): void;
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
    unsubscribeEvent(event: EngineEventType_2, id: string): void;
    /**
     * Initialize dom elements, and event listeners for the library.
     * This must be handled outside the constructor since many frontend frameworks
     * run Component constructors before the DOM element is available.
     *
     * @param element: The element acting as the container.
     */
    assignDom(element: HTMLElement): void;
    set element(containerDom: HTMLElement);
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
    setDebugRenderer(renderer: DebugRenderer): void;
    /**
     * Disables and removes the debug visualization overlay.
     */
    disableDebug(): void;
    /* Excluded from this release type: _processStage */
    /* Excluded from this release type: _processAnimations */
    /* Excluded from this release type: _processPostRender */
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
    setCollisionEngine(collisionEngine: CollisionEngine_2): void;
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
    enableAnimationEngine(): void;
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
    destroy(): void;
}

declare interface EngineConfig {
}

declare interface EngineConfig_2 {
}

/**
 * Props passed to engine event callbacks.
 */
declare interface EngineEventProps {
    element: HTMLElement;
    bounds: ContainerBounds;
}

/**
 * Props passed to engine event callbacks.
 */
declare interface EngineEventProps_2 {
    element: HTMLElement;
    bounds: ContainerBounds_2;
}

/**
 * Available engine event types that can be subscribed to.
 */
declare type EngineEventType = 'containerAssigned' | 'containerResized' | 'containerMoved';

/**
 * Available engine event types that can be subscribed to.
 */
declare type EngineEventType_2 = 'containerAssigned' | 'containerResized' | 'containerMoved';

declare class EventCallback {
    _object: BaseObject;
    _global: InputEventCallback;
    global: InputEventCallback;
    _input: InputEventCallback;
    input: InputEventCallback;
    _dom: DomEvent;
    dom: DomEvent;
    constructor(object: BaseObject);
}

declare class EventCallback_2 {
    _object: BaseObject_2;
    _global: InputEventCallback_2;
    global: InputEventCallback_2;
    _input: InputEventCallback_2;
    input: InputEventCallback_2;
    _dom: DomEvent_2;
    dom: DomEvent_2;
    constructor(object: BaseObject_2);
}

declare class EventCallback_2_2 {
    _object: BaseObject_2;
    _collider: CollisionEvent;
    collider: CollisionEvent;
    constructor(object: BaseObject_2);
}

declare class EventCallback_3 {
    _object: BaseObject;
    _collider: CollisionEvent_2;
    collider: CollisionEvent_2;
    constructor(object: BaseObject);
}

declare interface eventPosition {
    x: number;
    y: number;
    cameraX: number;
    cameraY: number;
    screenX: number;
    screenY: number;
}

declare interface eventPosition_2 {
    x: number;
    y: number;
    cameraX: number;
    cameraY: number;
    screenX: number;
    screenY: number;
}

declare interface frameStats {
    timestamp: number;
}

declare interface frameStats_2 {
    timestamp: number;
}

declare type gestureType = "drag" | "pinch";

declare type gestureType_2 = "drag" | "pinch";

/**
 * Configuration options for the global input control.
 */
declare interface GlobalInputConfig {
    /**
     * Maximum number of simultaneous drag gestures allowed.
     * When exceeded, the oldest drag gesture will be cancelled.
     * Set to 0 or Infinity for unlimited. Default is Infinity.
     */
    maxSimultaneousDrags: number;
}

/**
 * Configuration options for the global input control.
 */
declare interface GlobalInputConfig_2 {
    /**
     * Maximum number of simultaneous drag gestures allowed.
     * When exceeded, the oldest drag gesture will be cancelled.
     * Set to 0 or Infinity for unlimited. Default is Infinity.
     */
    maxSimultaneousDrags: number;
}

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
declare class GlobalInputControl {
    #private;
    global: GlobalManager | null;
    _inputControl: InputControl;
    globalCallbacks: Record<string, Record<string, {
        callback: (prop: any) => void;
        engine: any | null;
    }>>;
    _pointerDict: {
        [key: number]: pointerData;
    };
    _gestureDict: {
        [key: string]: dragGesture | pinchGesture;
    };
    _event: InputEventCallback;
    event: InputEventCallback;
    /**
     * Configuration options for global input handling.
     */
    config: GlobalInputConfig;
    constructor(global: GlobalManager, config?: Partial<GlobalInputConfig>);
    destroy(): void;
    subscribeGlobalCursorEvent(event: keyof InputEventCallback, gid: string, callback: (prop: any) => void, engine: any | null): void;
    unsubscribeGlobalCursorEvent(event: keyof InputEventCallback, gid: string): void;
    /**
     * Gets the number of active drag gestures.
     */
    getActiveDragCount(): number;
    /**
     * Gets active drag gestures sorted by timestamp (oldest first).
     */
    getActiveDragsSortedByTime(): {
        pointerId: number;
        gesture: dragGesture;
        timestamp: number;
    }[];
    /**
     * Cancels the oldest drag gesture by firing dragEnd for all its members.
     * Used to enforce maxSimultaneousDrags limit.
     */
    cancelOldestDrag(): void;
    /**
     * Enforces the maxSimultaneousDrags limit by cancelling oldest drags if needed.
     * Should be called after a new drag is registered.
     */
    enforceMaxDragLimit(): void;
}

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
declare class GlobalInputControl_2 {
    #private;
    global: GlobalManager_2 | null;
    _inputControl: InputControl_2;
    globalCallbacks: Record<string, Record<string, {
        callback: (prop: any) => void;
        engine: any | null;
    }>>;
    _pointerDict: {
        [key: number]: pointerData_2;
    };
    _gestureDict: {
        [key: string]: dragGesture_2 | pinchGesture_2;
    };
    _event: InputEventCallback_2;
    event: InputEventCallback_2;
    /**
     * Configuration options for global input handling.
     */
    config: GlobalInputConfig_2;
    constructor(global: GlobalManager_2, config?: Partial<GlobalInputConfig_2>);
    destroy(): void;
    subscribeGlobalCursorEvent(event: keyof InputEventCallback_2, gid: string, callback: (prop: any) => void, engine: any | null): void;
    unsubscribeGlobalCursorEvent(event: keyof InputEventCallback_2, gid: string): void;
    /**
     * Gets the number of active drag gestures.
     */
    getActiveDragCount(): number;
    /**
     * Gets active drag gestures sorted by timestamp (oldest first).
     */
    getActiveDragsSortedByTime(): {
        pointerId: number;
        gesture: dragGesture_2;
        timestamp: number;
    }[];
    /**
     * Cancels the oldest drag gesture by firing dragEnd for all its members.
     * Used to enforce maxSimultaneousDrags limit.
     */
    cancelOldestDrag(): void;
    /**
     * Enforces the maxSimultaneousDrags limit by cancelling oldest drags if needed.
     * Should be called after a new drag is registered.
     */
    enforceMaxDragLimit(): void;
}

/**
 * Central state manager shared across all engine instances.
 *
 * Manages global state including:
 * - Unique object ID generation
 * - Global input control
 * - Shared render queues for synchronized rendering across all engines
 * - Shared data storage
 * - Engine instance registry
 *
 * This is a singleton - only one instance exists per application.
 * Multiple Engine instances share the same GlobalManager and render pipeline.
 *
 * @example
 * ```typescript
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine(); // Shares the same GlobalManager and render queues
 * ```
 */
declare class GlobalManager {
    #private;
    private static instance;
    private static readonly GLOBAL_ENGINE_KEY;
    inputEngine: GlobalInputControl | null;
    objectTable: Record<string, Record<string, BaseObject>>;
    data: any;
    gid: number;
    currentStage: "IDLE" | "READ_1" | "WRITE_1" | "READ_2" | "WRITE_2" | "READ_3" | "WRITE_3";
    read1Queue: Map<string, Map<string, queueEntry>>;
    write1Queue: Map<string, Map<string, queueEntry>>;
    read2Queue: Map<string, Map<string, queueEntry>>;
    write2Queue: Map<string, Map<string, queueEntry>>;
    read3Queue: Map<string, Map<string, queueEntry>>;
    write3Queue: Map<string, Map<string, queueEntry>>;
    engines: Set<any>;
    private constructor();
    /**
     * Gets the singleton instance of GlobalManager.
     * Creates it if it doesn't exist yet.
     *
     * @returns The GlobalManager singleton instance
     */
    static getInstance(): GlobalManager;
    /**
     * Resets the singleton instance. Useful for testing.
     * WARNING: This will affect all Engine instances using this GlobalManager.
     */
    static resetInstance(): void;
    /* Excluded from this release type: registerEngine */
    /* Excluded from this release type: unregisterEngine */
    /**
     * Generates a unique identifier for objects.
     *
     * @returns A unique string ID that increments with each call.
     */
    getGlobalId(): string;
    getInputEngine(engine: any | null): GlobalInputControl | null;
    getEngineId(engine: any | null): string | null;
    getEngineObjectTable(engine: any | null, create?: boolean): Record<string, BaseObject> | null;
    registerObject(object: BaseObject): void;
    unregisterObject(object: BaseObject): void;
}

/**
 * Central state manager shared across all engine instances.
 *
 * Manages global state including:
 * - Unique object ID generation
 * - Global input control
 * - Shared render queues for synchronized rendering across all engines
 * - Shared data storage
 * - Engine instance registry
 *
 * This is a singleton - only one instance exists per application.
 * Multiple Engine instances share the same GlobalManager and render pipeline.
 *
 * @example
 * ```typescript
 * const global = GlobalManager.getInstance();
 * const engine1 = new Engine();
 * const engine2 = new Engine(); // Shares the same GlobalManager and render queues
 * ```
 */
declare class GlobalManager_2 {
    #private;
    private static instance;
    private static readonly GLOBAL_ENGINE_KEY;
    inputEngine: GlobalInputControl_2 | null;
    objectTable: Record<string, Record<string, BaseObject_2>>;
    data: any;
    gid: number;
    currentStage: "IDLE" | "READ_1" | "WRITE_1" | "READ_2" | "WRITE_2" | "READ_3" | "WRITE_3";
    read1Queue: Map<string, Map<string, queueEntry_2>>;
    write1Queue: Map<string, Map<string, queueEntry_2>>;
    read2Queue: Map<string, Map<string, queueEntry_2>>;
    write2Queue: Map<string, Map<string, queueEntry_2>>;
    read3Queue: Map<string, Map<string, queueEntry_2>>;
    write3Queue: Map<string, Map<string, queueEntry_2>>;
    engines: Set<any>;
    private constructor();
    /**
     * Gets the singleton instance of GlobalManager.
     * Creates it if it doesn't exist yet.
     *
     * @returns The GlobalManager singleton instance
     */
    static getInstance(): GlobalManager_2;
    /**
     * Resets the singleton instance. Useful for testing.
     * WARNING: This will affect all Engine instances using this GlobalManager.
     */
    static resetInstance(): void;
    /* Excluded from this release type: registerEngine */
    /* Excluded from this release type: unregisterEngine */
    /**
     * Generates a unique identifier for objects.
     *
     * @returns A unique string ID that increments with each call.
     */
    getGlobalId(): string;
    getInputEngine(engine: any | null): GlobalInputControl_2 | null;
    getEngineId(engine: any | null): string | null;
    getEngineObjectTable(engine: any | null, create?: boolean): Record<string, BaseObject_2> | null;
    registerObject(object: BaseObject_2): void;
    unregisterObject(object: BaseObject_2): void;
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
declare class InputControl {
    #private;
    /**
     * Functions as a middleware that converts mouse and touch events into a unified event format.
     */
    _element: HTMLElement | null;
    global: GlobalManager | null;
    _sortedTouchArray: touchData[];
    _sortedTouchDict: {
        [key: number]: touchData;
    };
    _localPointerDict: {
        [key: number]: pointerData;
    };
    _event: InputEventCallback;
    event: InputEventCallback;
    _isGlobal: boolean;
    _uuid: Symbol;
    _ownerGID: string | null;
    engine: any;
    constructor(engine: any, isGlobal?: boolean, ownerGID?: string | null);
    destroy(): void;
    get globalInputEngine(): GlobalInputControl | null;
    get globalPointerDict(): {
        [key: number]: pointerData;
    };
    get globalGestureDict(): {
        [key: string]: dragGesture | pinchGesture;
    };
    getCoordinates(screenX: number, screenY: number): {
        x: any;
        y: any;
        cameraX: any;
        cameraY: any;
        screenX: number;
        screenY: number;
    };
    /**
     * Called when the user pressed the mouse button.
     * This and all other pointer/gesture events automatically propagate to global input engine as well.
     * @param e
     * @returns
     */
    onPointerDown(e: PointerEvent): void;
    /**
     * Called when the user moves the mouse
     * @param e
     */
    onPointerMove(e: PointerEvent): void;
    /**
     * Called when the user releases the mouse button
     * @param e
     */
    onPointerUp(e: PointerEvent): void;
    /**
     * Called when a pointer event is cancelled (e.g., touch interrupted by system gesture).
     * Treated as a pointer up event to clean up any ongoing gestures.
     * @param e
     */
    onPointerCancel(e: PointerEvent): void;
    /**
     * Called when the user scrolls the mouse wheel
     * @param e
     */
    onWheel(e: WheelEvent): void;
    /* Excluded from this release type: _detectAndFirePinchGestures */
    addListener(dom: HTMLElement | Document, event: string, callback: (...args: any[]) => void): void;
    addCursorEventListener(dom: HTMLElement | Document): void;
    addDragMember(member: InputControl): void;
    resetDragMembers(): void;
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
declare class InputControl_2 {
    #private;
    /**
     * Functions as a middleware that converts mouse and touch events into a unified event format.
     */
    _element: HTMLElement | null;
    global: GlobalManager_2 | null;
    _sortedTouchArray: touchData_2[];
    _sortedTouchDict: {
        [key: number]: touchData_2;
    };
    _localPointerDict: {
        [key: number]: pointerData_2;
    };
    _event: InputEventCallback_2;
    event: InputEventCallback_2;
    _isGlobal: boolean;
    _uuid: Symbol;
    _ownerGID: string | null;
    engine: any;
    constructor(engine: any, isGlobal?: boolean, ownerGID?: string | null);
    destroy(): void;
    get globalInputEngine(): GlobalInputControl_2 | null;
    get globalPointerDict(): {
        [key: number]: pointerData_2;
    };
    get globalGestureDict(): {
        [key: string]: dragGesture_2 | pinchGesture_2;
    };
    getCoordinates(screenX: number, screenY: number): {
        x: any;
        y: any;
        cameraX: any;
        cameraY: any;
        screenX: number;
        screenY: number;
    };
    /**
     * Called when the user pressed the mouse button.
     * This and all other pointer/gesture events automatically propagate to global input engine as well.
     * @param e
     * @returns
     */
    onPointerDown(e: PointerEvent): void;
    /**
     * Called when the user moves the mouse
     * @param e
     */
    onPointerMove(e: PointerEvent): void;
    /**
     * Called when the user releases the mouse button
     * @param e
     */
    onPointerUp(e: PointerEvent): void;
    /**
     * Called when a pointer event is cancelled (e.g., touch interrupted by system gesture).
     * Treated as a pointer up event to clean up any ongoing gestures.
     * @param e
     */
    onPointerCancel(e: PointerEvent): void;
    /**
     * Called when the user scrolls the mouse wheel
     * @param e
     */
    onWheel(e: WheelEvent): void;
    /* Excluded from this release type: _detectAndFirePinchGestures */
    addListener(dom: HTMLElement | Document, event: string, callback: (...args: any[]) => void): void;
    addCursorEventListener(dom: HTMLElement | Document): void;
    addDragMember(member: InputControl_2): void;
    resetDragMembers(): void;
}

declare interface InputEventCallback {
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

declare interface InputEventCallback_2 {
    pointerDown: null | ((prop: pointerDownProp_2) => void);
    pointerMove: null | ((prop: pointerMoveProp_2) => void);
    pointerUp: null | ((prop: pointerUpProp_2) => void);
    mouseWheel: null | ((prop: mouseWheelProp_2) => void);
    dragStart: null | ((prop: dragStartProp_2) => void);
    drag: null | ((prop: dragProp_2) => void);
    dragEnd: null | ((prop: dragEndProp_2) => void);
    pinchStart: null | ((prop: pinchStartProp_2) => void);
    pinch: null | ((prop: pinchProp_2) => void);
    pinchEnd: null | ((prop: pinchEndProp_2) => void);
}

/** Mouse events */
declare interface mouseWheelProp {
    event: WheelEvent;
    gid: string | null;
    position: eventPosition;
    delta: number;
}

/** Mouse events */
declare interface mouseWheelProp_2 {
    event: WheelEvent;
    gid: string | null;
    position: eventPosition_2;
    delta: number;
}

declare interface pinchEndProp {
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

declare interface pinchEndProp_2 {
    gid: string | null;
    gestureID: string;
    start: {
        pointerList: eventPosition_2[];
        distance: number;
    };
    pointerList: eventPosition_2[];
    distance: number;
    end: {
        pointerList: eventPosition_2[];
        distance: number;
    };
}

declare interface pinchGesture {
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

declare interface pinchGesture_2 {
    type: gestureType_2;
    state: "idle" | "pinch" | "release";
    memberList: InputControl_2[];
    start: {
        pointerList: eventPosition_2[];
        distance: number;
    };
    pointerList: eventPosition_2[];
    distance: number;
}

/** Touch Event */
declare interface pinchProp {
    gid: string | null;
    gestureID: string;
    start: {
        pointerList: eventPosition[];
        distance: number;
    };
    pointerList: eventPosition[];
    distance: number;
}

/** Touch Event */
declare interface pinchProp_2 {
    gid: string | null;
    gestureID: string;
    start: {
        pointerList: eventPosition_2[];
        distance: number;
    };
    pointerList: eventPosition_2[];
    distance: number;
}

declare interface pinchStartProp {
    gid: string | null;
    gestureID: string;
    start: {
        pointerList: eventPosition[];
        distance: number;
    };
}

declare interface pinchStartProp_2 {
    gid: string | null;
    gestureID: string;
    start: {
        pointerList: eventPosition_2[];
        distance: number;
    };
}

/**
 * Point collision shape.
 *
 * Defines a single point for collision detection. Useful for precise hit detection
 * or checking if a position overlaps with other colliders.
 *
 * @example
 * ```typescript
 * const pointCollider = new PointCollider(global, object, 10, 10);
 * object.addCollider(pointCollider);
 * ```
 */
export declare class PointCollider extends Collider {
    constructor(engine: Engine, parent: BaseObject, localX: number, localY: number);
}

/**
 * Point collision shape.
 *
 * Defines a single point for collision detection. Useful for precise hit detection
 * or checking if a position overlaps with other colliders.
 *
 * @example
 * ```typescript
 * const pointCollider = new PointCollider(global, object, 10, 10);
 * object.addCollider(pointCollider);
 * ```
 */
declare class PointCollider_2 extends Collider_2 {
    constructor(engine: Engine_2, parent: BaseObject_2, localX: number, localY: number);
}

/**
 * General input event data struct for both mouse and touch pointers.
 */
declare type pointerData = {
    id: number;
    callerGID: string | null;
    timestamp: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    prevX: number;
    prevY: number;
    endX: number | null;
    endY: number | null;
    moveCount: number;
};

/**
 * General input event data struct for both mouse and touch pointers.
 */
declare type pointerData_2 = {
    id: number;
    callerGID: string | null;
    timestamp: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    prevX: number;
    prevY: number;
    endX: number | null;
    endY: number | null;
    moveCount: number;
};

/**
 * Events common to mouse and touch
 */
declare interface pointerDownProp {
    event: PointerEvent;
    gid: string | null;
    position: eventPosition;
    button: number;
    isWithinEngine: boolean;
}

/**
 * Events common to mouse and touch
 */
declare interface pointerDownProp_2 {
    event: PointerEvent;
    gid: string | null;
    position: eventPosition_2;
    button: number;
    isWithinEngine: boolean;
}

declare interface pointerMoveProp {
    event: PointerEvent | null;
    gid: string | null;
    position: eventPosition;
    button: number;
}

declare interface pointerMoveProp_2 {
    event: PointerEvent | null;
    gid: string | null;
    position: eventPosition_2;
    button: number;
}

declare interface pointerUpProp {
    event: PointerEvent;
    gid: string | null;
    position: eventPosition;
    button: number;
}

declare interface pointerUpProp_2 {
    event: PointerEvent;
    gid: string | null;
    position: eventPosition_2;
    button: number;
}

declare class queueEntry {
    uuid: UUID | string;
    object: BaseObject;
    callback: null | Array<() => void>;
    constructor(object: BaseObject, callback: null | (() => void), uuid?: UUID | string | null);
    addCallback(callback: () => void): void;
}

declare class queueEntry_2 {
    uuid: UUID | string;
    object: BaseObject_2;
    callback: null | Array<() => void>;
    constructor(object: BaseObject_2, callback: null | (() => void), uuid?: UUID | string | null);
    addCallback(callback: () => void): void;
}

/**
 * Rectangular collision shape.
 *
 * Defines an axis-aligned bounding box for collision detection.
 * Dimensions are specified by width and height.
 *
 * @example
 * ```typescript
 * const rectCollider = new RectCollider(engine, object, 0, 0, 100, 50);
 * object.addCollider(rectCollider);
 * ```
 */
export declare class RectCollider extends Collider {
    constructor(engine: Engine, parent: BaseObject, localX: number, localY: number, width: number, height: number);
}

/**
 * Rectangular collision shape.
 *
 * Defines an axis-aligned bounding box for collision detection.
 * Dimensions are specified by width and height.
 *
 * @example
 * ```typescript
 * const rectCollider = new RectCollider(engine, object, 0, 0, 100, 50);
 * object.addCollider(rectCollider);
 * ```
 */
declare class RectCollider_2 extends Collider_2 {
    constructor(engine: Engine_2, parent: BaseObject_2, localX: number, localY: number, width: number, height: number);
}

declare interface SortedEntry {
    collider: Collider_2;
    x: number;
    left: boolean;
}

declare interface SortedEntry_2 {
    collider: Collider;
    x: number;
    left: boolean;
}

declare type touchData = {
    x: number;
    y: number;
    target: Element | null;
    identifier: number;
};

declare type touchData_2 = {
    x: number;
    y: number;
    target: Element | null;
    identifier: number;
};

declare interface TransformProperty {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
}

declare interface TransformProperty_2 {
    x: number;
    y: number;
    scaleX: number;
    scaleY: number;
}

export { }
