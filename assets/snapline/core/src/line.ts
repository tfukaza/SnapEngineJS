import { ElementObject, BaseObject } from "@snap-engine/core";
import { ConnectorComponent } from "./connector";

class LineComponent extends ElementObject {
  endWorldX: number;
  endWorldY: number;

  start: ConnectorComponent;
  target: ConnectorComponent | null;
  #renderCallbacks: Set<(line: LineComponent) => void>;

  constructor(engine: any, parent: BaseObject) {
    super(engine, parent);

    this.endWorldX = 0;
    this.endWorldY = 0;

    this.start = parent as unknown as ConnectorComponent;
    this.target = null;
    this.#renderCallbacks = new Set();

    this.transformMode = "direct";
  }

  onRender(callback: (line: LineComponent) => void): () => void {
    this.#renderCallbacks.add(callback);
    return () => {
      this.#renderCallbacks.delete(callback);
    };
  }

  requestRender() {
    for (const callback of this.#renderCallbacks) {
      callback(this);
    }
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

  setLineStart(startPositionX: number, startPositionY: number) {
    this.worldTransform = { x: startPositionX, y: startPositionY };
  }

  setLineEnd(endWorldX: number, endWorldY: number) {
    this.endWorldX = endWorldX;
    this.endWorldY = endWorldY;
  }

  setLinePosition(
    startWorldX: number,
    startWorldY: number,
    endWorldX: number,
    endWorldY: number,
  ) {
    this.setLineStart(startWorldX, startWorldY);
    this.setLineEnd(endWorldX, endWorldY);
  }

  moveLineToConnectorTransform() {
    this.setLineStartAtConnector();
    if (!this.target) {
      // this.setLineEnd(this.global.cursor.worldX, this.global.cursor.worldY);
    } else {
      this.setLineEndAtConnector();
    }
  }

  writeTransform() {
    super.writeTransform();
    this.requestRender();
  }
}

export { LineComponent };
