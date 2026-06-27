import { BaseObject, ElementObject } from "@snap-engine/core";
import type {
  pointerDownProp,
  pointerMoveProp,
  pointerUpProp,
} from "@snap-engine/core";
import { RectCollider, Collider } from "@snap-engine/core/collision";
import { NodeComponent } from "./node";

class RectSelectComponent extends ElementObject {
  _state: "none" | "dragging";
  _mouseDownX: number;
  _mouseDownY: number;
  _selectHitBox: Collider;
  constructor(engine: any, parent: BaseObject | null) {
    super(engine, parent);

    this._state = "none";
    this._mouseDownX = 0;
    this._mouseDownY = 0;

    this.event.global.pointerDown = this.onGlobalCursorDown;
    this.event.global.pointerMove = this.onGlobalCursorMove;
    this.event.global.pointerUp = this.onGlobalCursorUp;

    this._selectHitBox = new RectCollider(engine, this, 0, 0, 0, 0);
    this._selectHitBox.localTransform = { x: 0, y: 0 };
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
      pointerEvents: "none",
    };
    this.schedule(() => this.writeDom(), {
      stage: "WRITE_1",
      queueId: "WRITE_1",
    });
  }

  onGlobalCursorDown(prop: pointerDownProp): void {
    if (
      prop.event.button !== 0 ||
      (prop.event.target &&
        (prop.event.target as HTMLElement).id !== "sl-background")
    ) {
      return;
    }
    for (let node of this.global.data.select) {
      node.setSelected(false);
    }

    this.global.data.select = [];
    this.worldTransform = { x: prop.position.x, y: prop.position.y };
    this._state = "dragging";
    this.style = {
      display: "block",
      width: "0px",
      height: "0px",
    };
    this._mouseDownX = prop.position.x;
    this._mouseDownY = prop.position.y;

    this._selectHitBox.event.collider.onBeginContact = (
      _: Collider,
      otherObject: Collider,
    ) => {
      if (otherObject.parent instanceof NodeComponent) {
        let node = otherObject.parent as NodeComponent;
        node.setSelected(true);
      }
    };
    this._selectHitBox.event.collider.onEndContact = (
      _thisObject: Collider,
      otherObject: Collider,
    ) => {
      if (otherObject.parent instanceof NodeComponent) {
        let node = otherObject.parent as NodeComponent;
        node.setSelected(false);
      }
    };
  }

  onGlobalCursorMove(prop: pointerMoveProp): void {
    if (this._state === "dragging") {
      let [boxOriginX, boxOriginY] = [
        Math.min(this._mouseDownX, prop.position.x),
        Math.min(this._mouseDownY, prop.position.y),
      ];
      let [boxWidth, boxHeight] = [
        Math.abs(prop.position.x - this._mouseDownX),
        Math.abs(prop.position.y - this._mouseDownY),
      ];
      this.style = {
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
      };
      this.worldTransform = { x: boxOriginX, y: boxOriginY };
      this._selectHitBox.localTransform = { x: 0, y: 0 };
      this._selectHitBox.width = boxWidth;
      this._selectHitBox.height = boxHeight;
      this.schedule(() => this.writeTransform(), {
        stage: "WRITE_2",
        queueId: `${this.id}-transform`,
      });
    }
  }

  onGlobalCursorUp(_prop: pointerUpProp): void {
    this.style = {
      display: "none",
    };
    this._state = "none";

    this._selectHitBox.event.collider.onBeginContact = null;
    this._selectHitBox.event.collider.onEndContact = null;
    this.schedule(() => this.writeTransform(), {
      stage: "WRITE_2",
      queueId: `${this.id}-transform`,
    });
  }

  onCollideNode(_hitBox: Collider, _node: Collider): void {}
}

export { RectSelectComponent };
