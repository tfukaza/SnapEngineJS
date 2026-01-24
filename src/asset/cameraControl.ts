import {
  pointerDownProp,
  pointerMoveProp,
  pointerUpProp,
  mouseWheelProp,
} from "../input";
import { ElementObject } from "../object";

class CameraControl extends ElementObject {
  _state: "idle" | "panning" = "idle";
  _mouseDownX: number;
  _mouseDownY: number;
  // _canvasElement: HTMLElement | null = null;
  zoomLock: boolean;
  panLock: boolean;

  resizeObserver: ResizeObserver | null = null;

  #prevCameraX: number = 0;
  #prevCameraY: number = 0;

  constructor(
    engine: any,
    zoomLock: boolean = false,
    panLock: boolean = false,
  ) {
    super(engine, null);
    this.zoomLock = zoomLock;
    this.panLock = panLock;
    this._mouseDownX = 0;
    this._mouseDownY = 0;
    this._state = "idle";
    // this._canvasElement = null;
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
      height: "0px",
    };
    this.requestTransform("WRITE_2");

    this.resizeObserver = null;

    this.#prevCameraX = 0;
    this.#prevCameraY = 0;

    this.engine.event.containerElementAssigned = () => {
      this.resizeObserver = new ResizeObserver(() => {
        this.setCameraPosition(this.#prevCameraX, this.#prevCameraY);
        this.paintCamera();
      });
      this.resizeObserver.observe(this.engine.containerElement!);
      this.resizeObserver.observe(window.document.body);
    };
  }

  paintCamera() {
    this.engine.camera?.updateCameraProperty();
    this.engine.camera?.updateCamera();
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.requestTransform("WRITE_2");
  }

  updateCameraCenterPosition(x: number = 0, y: number = 0) {
    this.engine.camera?.setCameraCenterPosition(x, y);
    this.#prevCameraX = this.engine.camera?.cameraPositionX || 0;
    this.#prevCameraY = this.engine.camera?.cameraPositionY || 0;
    this.paintCamera();
  }

  setCameraPosition(x: number, y: number) {
    this.engine.camera?.setCameraPosition(x, y);
    this.#prevCameraX = x;
    this.#prevCameraY = y;
    this.paintCamera();
  }

  setCameraCenterPosition(x: number, y: number) {
    this.engine.camera?.setCameraCenterPosition(x, y);
    this.#prevCameraX = this.engine.camera?.cameraPositionX || 0;
    this.#prevCameraY = this.engine.camera?.cameraPositionY || 0;
    this.paintCamera();
  }

  getCameraCenterPosition() {
    return this.engine.camera?.getCameraCenterPosition() || { x: 0, y: 0 };
  }

  onCursorDown(prop: pointerDownProp) {
    if (prop.event.button != 0) {
      return;
    }
    if (this.panLock) {
      return;
    }
    this._state = "panning";
    this._mouseDownX = prop.position.screenX;
    this._mouseDownY = prop.position.screenY;
    this.engine.camera?.handlePanStart();
    prop.event.preventDefault();
  }

  onCursorMove(prop: pointerMoveProp) {
    if (this._state != "panning") {
      return;
    }
    const dx = prop.position.screenX - this._mouseDownX;
    const dy = prop.position.screenY - this._mouseDownY;
    this.engine.camera?.handlePanDrag(dx, dy);
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.requestTransform("WRITE_2");
  }

  onCursorUp(_prop: pointerUpProp) {
    if (this._state != "panning") {
      return;
    }
    this._state = "idle";
    this.engine.camera?.handlePanEnd();
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.#prevCameraX = this.engine.camera?.cameraPositionX || 0;
    this.#prevCameraY = this.engine.camera?.cameraPositionY || 0;
    this.requestTransform("WRITE_2");
  }

  onZoom(prop: mouseWheelProp) {
    if (this.zoomLock) {
      return;
    }
  const camera = this.engine.camera!;
    if (
      prop.position.screenX < camera.containerOffsetX ||
      prop.position.screenX > camera.containerOffsetX + camera.cameraWidth ||
      prop.position.screenY < camera.containerOffsetY ||
      prop.position.screenY > camera.containerOffsetY + camera.cameraHeight
    ) {
      return;
    }
    this.zoomBy(prop.delta / 2000, prop.position.cameraX, prop.position.cameraY);
    prop.event.preventDefault();
  }

  zoomBy(deltaZoom: number, originX?: number, originY?: number) {
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
    this.style.transform = camera.canvasStyle as string;
    this.#prevCameraX = camera.cameraPositionX || 0;
    this.#prevCameraY = camera.cameraPositionY || 0;
    this.requestTransform("WRITE_2");
  }
}

export { CameraControl };
