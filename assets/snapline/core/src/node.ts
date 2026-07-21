import { BaseObject, ElementObject } from "@snap-engine/core";
import { ConnectorComponent } from "./connector";
import { LineComponent } from "./line";
import type {
  pointerUpProp,
  pointerDownProp,
  dragStartProp,
  dragProp,
  dragEndProp,
} from "@snap-engine/core";
import { RectCollider } from "@snap-engine/core/collision";

export interface NodeConfig {
  lockPosition?: boolean;
}

class NodeComponent extends ElementObject {
  _config: NodeConfig;
  _connectors: { [key: string]: ConnectorComponent };
  _components: { [key: string]: ElementObject };
  _nodeWidth = 0;
  _nodeHeight = 0;
  _dragStartX = 0;
  _dragStartY = 0;
  _prop: { [key: string]: any };
  _propSetCallback: { [key: string]: (value: any) => void };
  _nodeStyle: any;
  _lineListCallback: ((lines: LineComponent[]) => void) | null;
  _hitBox: RectCollider;
  _selected: boolean;
  _mouseDownX: number;
  _mouseDownY: number;
  _hasMoved: boolean;

  constructor(engine: any, parent: BaseObject | null, config: NodeConfig = {}) {
    super(engine, parent);
    this._config = config;

    this._connectors = {};
    this._components = {};
    this._dragStartX = this.worldTransform.x;
    this._dragStartY = this.worldTransform.y;
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
      this.schedule(
        () => {
          const property = this.readDom({ unapplyTransform: false }, "READ_1");
          this._hitBox.width = property.width;
          this._hitBox.height = property.height;
          for (const connector of Object.values(this._connectors)) {
            connector.measureLocalCenter("READ_1");
          }
        },
        { stage: "READ_1" },
      );
      for (const line of [
        ...this.getAllOutgoingLines(),
        ...this.getAllIncomingLines(),
      ]) {
        line.schedule(
          () => {
            line.moveLineToConnectorTransform(); // Move lines to the saved position of connectors
            line.setLineEndAtConnector();
            line.writeDom();
            line.writeTransform();
          },
          { stage: "WRITE_1" },
        );
      }
    };

    this.style = {
      willChange: "transform",
      position: "absolute",
      transformOrigin: "top left",
    };

    // Initialize global select list if needed
    if (!this.global.data.select) {
      this.global.data.select = [];
    }
  }

  setStartPositions() {
    this._dragStartX = this.worldTransform.x;
    this._dragStartY = this.worldTransform.y;
  }

  setSelected(selected: boolean) {
    if (!this.global.data.select) {
      this.global.data.select = [];
    }
    this._selected = selected;
    this.dataAttribute = {
      selected: String(selected),
      "snapline-state": selected ? "focus" : "idle",
    };
    if (selected) {
      if (!this.global.data.select.includes(this)) {
        this.global.data.select.push(this);
      }
    } else {
      this.global.data.select = this.global.data.select.filter(
        (node: NodeComponent) => node.id !== this.id,
      );
    }
    this.schedule(() => this.writeDom(), {
      stage: "WRITE_1",
      queueId: `${this.id}-selected`,
    });
  }

  _filterDeletedLines(svgLines: LineComponent[]) {
    for (let i = 0; i < svgLines.length; i++) {
      if (svgLines[i].isDeleteRequested) {
        svgLines.splice(i, 1);
        i--;
      }
    }
  }

  updateNodeLines(): void {
    for (const connector of Object.values(this._connectors)) {
      connector.updateAllLines();
    }
  }

  writeNodeLines(): void {
    for (const connector of Object.values(this._connectors)) {
      connector.writeAllLines();
    }
  }

  writeTransformAndLines(): void {
    this.writeTransform();
    this.writeNodeLines();
  }

  updateNodeLineList(): void {
    if (this._lineListCallback) {
      // console.log("updateNodeLineList", this.id);
      this._lineListCallback(this.getAllOutgoingLines());
    }
  }

  setLineListCallback(callback: (lines: LineComponent[]) => void) {
    this._lineListCallback = callback;
  }

  onCursorDown(e: pointerDownProp): void {
    if (e.event.button != 0) {
      return;
    }

    // Disable camera control from the very first pointer event: waiting for
    // the drag-start threshold lets the camera pan by one move event before
    // onDragStart runs. onUp / onDragEnd re-enable it.
    this.global.data.allowCameraControl = false;

    this._hasMoved = false;
    if (this.global.data.select?.includes(this) == false) {
      for (const node of [...this.global.data.select]) {
        node.setSelected(false);
      }
      this.setSelected(true);
    }
  }

  onDragStart(prop: dragStartProp): void {
    for (const node of this.global.data.select ?? []) {
      node.setStartPositions();
      node._mouseDownX = prop.start.x;
      node._mouseDownY = prop.start.y;
    }
    this._hasMoved = true;
  }

  onDrag(prop: dragProp): void {
    if (this.global == null) {
      console.error("Global stats is null");
      return;
    }
    if (this._config.lockPosition) return;
    for (const node of this.global.data.select ?? []) {
      node.setDragPosition(prop);
    }
  }

  setDragPosition(prop: dragProp) {
    const dx = prop.position.x - this._mouseDownX;
    const dy = prop.position.y - this._mouseDownY;

    this.worldTransform = {
      x: this._dragStartX + dx,
      y: this._dragStartY + dy,
    };
    this.schedule(() => this.writeTransformAndLines(), {
      stage: "WRITE_2",
      queueId: `${this.id}-transform`,
    });
  }

  onDragEnd(prop: dragEndProp) {
    // Re-enable camera control after drag ends
    this.global.data.allowCameraControl = true;

    for (const node of this.global.data.select ?? []) {
      node.setUpPosition(prop);
    }
  }

  setUpPosition(prop: dragEndProp) {
    const [dx, dy] = [
      prop.end.x - this._mouseDownX,
      prop.end.y - this._mouseDownY,
    ];
    this.worldTransform = {
      x: this._dragStartX + dx,
      y: this._dragStartY + dy,
    };
    this.schedule(() => this.writeTransformAndLines(), {
      stage: "WRITE_2",
      queueId: `${this.id}-transform`,
    });
  }

  onUp(_prop: pointerUpProp) {
    this.global.data.allowCameraControl = true;

    if (this._hasMoved == false) {
      for (const node of [...(this.global.data.select ?? [])]) {
        node.setSelected(false);
      }
      this.setSelected(true);
    }
    this._hasMoved = false;
  }

  getConnector(name: string): ConnectorComponent | null {
    if (!(name in this._connectors)) {
      console.error(`Connector ${name} does not exist in node ${this.id}`);
      return null;
    }
    return this._connectors[name];
  }

  addConnectorObject(connector: ConnectorComponent) {
    connector.assignToNode(this);
  }

  addSetPropCallback(callback: (value: any) => void, name: string) {
    this._propSetCallback[name] = callback;
  }

  getAllOutgoingLines(): LineComponent[] {
    return Object.values(this._connectors).flatMap(
      (connector) => connector.outgoingLines,
    );
  }

  getAllIncomingLines(): LineComponent[] {
    return Object.values(this._connectors).flatMap(
      (connector) => connector.incomingLines,
    );
  }

  getProp(name: string) {
    return this._prop[name];
  }

  setProp(name: string, value: any) {
    if (name in this._propSetCallback) {
      this._propSetCallback[name](value);
    }
    this._prop[name] = value;

    if (!(name in this._connectors)) {
      return;
    }
    const peers = this._connectors[name].outgoingLines
      .filter((line) => line.target && !line.isDeleteRequested)
      .map((line) => line.target);
    if (!peers) {
      return;
    }
    for (const peer of peers) {
      if (!peer) continue;
      if (!peer.parent) continue;
      let parent = peer.parent as NodeComponent;
      parent.setProp(peer.name, value);
    }
  }

  propagateProp() {
    for (const connector of Object.values(this._connectors)) {
      this.setProp(connector.name, this.getProp(connector.name));
    }
  }

  destroy() {
    for (const connector of Object.values(this._connectors)) {
      connector.deleteAllLines();
    }
    this.setSelected(false);
    this._connectors = {};
    super.destroy();
  }
}

export { NodeComponent };
