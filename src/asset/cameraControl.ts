import {
  pointerDownProp,
  pointerMoveProp,
  pointerUpProp,
  mouseWheelProp,
} from "../input";
import { ElementObject } from "../object";
import { Camera } from "../camera";

export type CameraControlConfig = {
  zoomLock?: boolean;
  panLock?: boolean;
};

const DEFAULT_CONFIG: CameraControlConfig = {
  zoomLock: false,
  panLock: false,
};

class CameraControl extends ElementObject {
  #state: "idle" | "panning" = "idle";
  #mouseDownX: number;
  #mouseDownY: number;
  
  config: CameraControlConfig = {};

  #prevCameraX: number = 0;
  #prevCameraY: number = 0;

  camera: Camera | null = null;

  constructor(
    engine: any,
    config: CameraControlConfig = {}
  ) {
    super(engine, null);
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.#mouseDownX = 0;
    this.#mouseDownY = 0;
    this.#state = "idle";
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

    this.#prevCameraX = 0;
    this.#prevCameraY = 0;
  }

  set element(_element: HTMLElement) {
    super.element = _element;
    this.camera = new Camera(this.engine);
    // this.camera.containerDom = _element;
    this.engine.camera = this.camera;
    // this.camera.updateCameraProperty();
    // this.engine.subscribeEvent('containerResized', 'cameraControl', () => {
    //   this.setCameraPosition(this.#prevCameraX, this.#prevCameraY);
    //   this.paintCamera();
    // });
  }

  paintCamera() {
    // this.engine.camera?.updateCameraProperty();
    this.engine.camera?.updateCamera();
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.requestTransform("WRITE_2");
  }

  // Camera Methods

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

  zoomBy(deltaZoom: number, originX?: number, originY?: number) {
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
    this.style.transform = camera.canvasStyle as string;
    this.#prevCameraX = camera.cameraPositionX || 0;
    this.#prevCameraY = camera.cameraPositionY || 0;
    this.requestTransform("WRITE_2");
  }

  // Event Handlers

  onCursorDown(prop: pointerDownProp) {
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
    this.#state = "panning";
    this.#mouseDownX = prop.position.screenX;
    this.#mouseDownY = prop.position.screenY;
    this.engine.camera?.handlePanStart();
    prop.event.preventDefault();
  }

  onCursorMove(prop: pointerMoveProp) {
    if (this.#state != "panning") {
      return;
    }
    if (this.global.data.allowCameraControl === false) {
      return;
    }
    const dx = prop.position.screenX - this.#mouseDownX;
    const dy = prop.position.screenY - this.#mouseDownY;
    this.engine.camera?.handlePanDrag(dx, dy);
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.requestTransform("WRITE_2");
  }

  onCursorUp(_prop: pointerUpProp) {
    if (this.#state != "panning") {
      return;
    }
    this.#state = "idle";
    this.engine.camera?.handlePanEnd();
    this.style.transform = this.engine.camera?.canvasStyle as string;
    this.#prevCameraX = this.engine.camera?.cameraPositionX || 0;
    this.#prevCameraY = this.engine.camera?.cameraPositionY || 0;
    this.requestTransform("WRITE_2");
  }

  onZoom(prop: mouseWheelProp) {
    if (this.config.zoomLock) {
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
}

export { CameraControl };
