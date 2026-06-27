import { ElementObject, BaseObject } from "@snap-engine/core";
import { NodeComponent } from "./node";
import { LineComponent } from "./line";
import type { pointerDownProp, dragProp, dragEndProp } from "@snap-engine/core";
import {
  Collider,
  CircleCollider,
  PointCollider,
} from "@snap-engine/core/collision";
import { EventProxyFactory } from "@snap-engine/core";

enum ConnectorState {
  IDLE,
  DRAGGING,
}

export interface ConnectorConfig {
  name?: string;
  maxConnectors?: number;
  allowDragOut?: boolean;
  lineClass?: typeof LineComponent;
  colliderRadius?: number;
}

interface ConnectorCallback {
  onConnectOutgoing: null | ((connector: ConnectorComponent) => void);
  onConnectIncoming: null | ((connector: ConnectorComponent) => void);
  onDisconnectOutgoing: null | ((connector: ConnectorComponent) => void);
  onDisconnectIncoming: null | ((connector: ConnectorComponent) => void);
}

class ConnectorComponent extends ElementObject {
  #config: ConnectorConfig;
  #name: string;
  #prop: { [key: string]: any };
  #outgoingLines: LineComponent[];
  #incomingLines: LineComponent[];
  #state: ConnectorState = ConnectorState.IDLE;

  #hitCircle: CircleCollider;
  #mouseHitBox: PointCollider;

  #targetConnector: ConnectorComponent | null = null;

  #connectorCallback: ConnectorCallback | null = null;

  get parent(): NodeComponent {
    return super.parent as NodeComponent;
  }

  set parent(parent: BaseObject | null) {
    super.parent = parent;
  }

  constructor(
    engine: any,
    parent: NodeComponent,
    config: ConnectorConfig = {},
  ) {
    super(engine, parent as unknown as BaseObject);

    this.#prop = {};
    this.#outgoingLines = [];
    this.#incomingLines = [];
    this.#config = config;
    this.#name = config.name || this.id || "";
    this.event.input.pointerDown = this.onCursorDown;

    this.#hitCircle = new CircleCollider(
      engine,
      this,
      0,
      0,
      config.colliderRadius ?? 30,
    );
    this.addCollider(this.#hitCircle);

    this.#mouseHitBox = new PointCollider(engine, this, 0, 0);
    this.addCollider(this.#mouseHitBox);

    this.#targetConnector = null;
    this.transformMode = "none";

    // Center colliders on the connector element once DOM is assigned
    this.event.dom.onAssignDom = () => {
      this.schedule(
        () => {
          this.readDom();
          const prop = this.getDomProperty("READ_1");
          const centerX = prop.width / 2;
          const centerY = prop.height / 2;
          this.#hitCircle.localTransform = { x: centerX, y: centerY };
          this.#mouseHitBox.localTransform = { x: centerX, y: centerY };
        },
        { stage: "READ_1" },
      );
    };

    this.#connectorCallback = {
      onConnectOutgoing: null,
      onConnectIncoming: null,
      onDisconnectOutgoing: null,
      onDisconnectIncoming: null,
    };
    this.#connectorCallback = EventProxyFactory(this, this.#connectorCallback);
  }

  get name(): string {
    return this.#name;
  }

  get config(): ConnectorConfig {
    return this.#config;
  }

  get prop(): { [key: string]: any } {
    return this.#prop;
  }

  get outgoingLines(): LineComponent[] {
    return this.#outgoingLines;
  }

  get incomingLines(): LineComponent[] {
    return this.#incomingLines;
  }

  get targetConnector(): ConnectorComponent | null {
    return this.#targetConnector;
  }

  set targetConnector(value: ConnectorComponent | null) {
    this.#targetConnector = value;
  }

  get numIncomingLines(): number {
    return this.#incomingLines.length;
  }

  get numOutgoingLines(): number {
    return this.#outgoingLines.length;
  }

  get center(): { x: number; y: number } {
    const prop = this.getDomProperty("READ_1");
    return {
      x: this.worldTransform.x + prop.width / 2,
      y: this.worldTransform.y + prop.height / 2,
    };
  }

  get connectorCallback(): ConnectorCallback {
    return this.#connectorCallback!;
  }

  onCursorDown(prop: pointerDownProp): void {
    const currentIncomingLines = this.#incomingLines.filter(
      (i) => !i.isDeleteRequested,
    );
    // Skip if it's not a left click
    if (prop.event.button != 0) {
      return;
    }
    if (currentIncomingLines.length > 0) {
      this.startPickUpLine(currentIncomingLines[0], prop);
      return;
    }
    if (this.#config.allowDragOut) {
      this.startDragOutLine(prop);
    }
  }

  deleteLine(i: number): LineComponent | null {
    if (this.#outgoingLines.length == 0) {
      return null;
    }

    const line = this.#outgoingLines[i];
    line.destroy();
    this.#outgoingLines.splice(i, 1);
    return line;
  }

  deleteAllLines() {
    for (const line of this.#outgoingLines) {
      line.destroy();
    }
  }

  updateAllLines() {
    for (const line of [...this.#outgoingLines, ...this.#incomingLines]) {
      line.moveLineToConnectorTransform();
      line.schedule(() => line.writeTransform(), {
        stage: "WRITE_2",
        queueId: `${line.id}-transform`,
      });
    }
  }

  assignToNode(parent: NodeComponent) {
    this.parent = parent;
    let parent_ref = this.parent as NodeComponent;
    parent_ref._prop[this.#name] = null;
    this.#prop = parent_ref._prop;
    parent_ref._connectors[this.#name] = this;
    this.#outgoingLines = [];
    this.#incomingLines = [];
    if (parent_ref.global && this.global == null) {
      this.global = parent_ref.global;
    }
  }

  createLine(): LineComponent {
    let line: LineComponent;
    if (this.#config.lineClass) {
      line = new this.#config.lineClass(this.engine, this);
    } else {
      line = new LineComponent(this.engine, this);
    }
    return line;
  }

  startDragOutLine(prop: pointerDownProp): void {
    let newLine = this.createLine();
    newLine.setLineEnd(prop.position.x, prop.position.y);
    newLine.setLineStartAtConnector();

    this.#outgoingLines.unshift(newLine);

    this.parent.updateNodeLines();
    this.parent.updateNodeLineList();

    this.#state = ConnectorState.DRAGGING;
    this.#targetConnector = null;
    // this.event.input.drag = null;
    this.event.input.drag = this.runDragOutLine;
    // this.globalInput.pointerUp = this.endDragOutLine;
    this.event.input.dragEnd = this.endDragOutLine;

    this.#mouseHitBox.event.collider.onCollide = (
      _: Collider,
      __: Collider,
    ) => {
      // console.log("onCollide", this.id);
      this.findClosestConnector();
    };
    this.#mouseHitBox.event.collider.onEndContact = (
      _: Collider,
      otherObject: Collider,
    ) => {
      if (this.#targetConnector?.id == otherObject.parent.id) {
        this.#targetConnector = null;
      }
    };

    this.runDragOutLine({
      position: prop.position,
      start: {
        x: this.worldTransform.x,
        y: this.worldTransform.y,
      },
      delta: {
        x: prop.position.x - this.worldTransform.x,
        y: prop.position.y - this.worldTransform.y,
      },
    } as dragProp);
  }

  findClosestConnector() {
    let connectorCollider: Array<Collider> = Array.from(
      this.#mouseHitBox.currentCollisions,
    ).filter((c) => c.parent instanceof ConnectorComponent);
    let connectors: Array<ConnectorComponent> = connectorCollider
      .map((c) => c.parent as ConnectorComponent)
      .sort((a, b) => {
        const centerA = a.center;
        const centerB = b.center;
        const mouseWorld = this.#mouseHitBox.worldTransform;
        const [mouseX, mouseY] = [mouseWorld.x, mouseWorld.y];
        let da = Math.sqrt(
          Math.pow(centerA.x - mouseX, 2) + Math.pow(centerA.y - mouseY, 2),
        );
        let db = Math.sqrt(
          Math.pow(centerB.x - mouseX, 2) + Math.pow(centerB.y - mouseY, 2),
        );
        return da - db;
      });
    if (connectors.length > 0) {
      this.#targetConnector = connectors[0];
    } else {
      this.#targetConnector = null;
    }
  }

  runDragOutLine(prop: dragProp) {
    if (this.#state != ConnectorState.DRAGGING) {
      return;
    }

    if (this.#outgoingLines.length == 0) {
      console.error(`Error: Outgoing lines is empty`);
      return;
    }
    this.#mouseHitBox.worldTransform = {
      x: prop.position.x,
      y: prop.position.y,
    };

    let line = this.#outgoingLines[0];

    if (this.#targetConnector) {
      const result = this.hoverWhileDragging(this.#targetConnector);
      if (result) {
        line.setLineEnd(result[0], result[1]);
        line.setLineStartAtConnector();
        line.schedule(() => line.writeTransform(), {
          stage: "WRITE_2",
          queueId: `${line.id}-transform`,
        });
        return;
      }
    }
    line.setLineEnd(prop.position.x, prop.position.y);
    line.setLineStartAtConnector();
    this.parent.updateNodeLines();
  }

  hoverWhileDragging(
    targetConnector: ConnectorComponent,
  ): [number, number] | void {
    if (!(targetConnector instanceof ConnectorComponent)) {
      return;
    }
    if (targetConnector == null) {
      return;
    }
    if (targetConnector.id == this.id) {
      return;
    }
    const connectorCenter = targetConnector.center;

    return [connectorCenter.x, connectorCenter.y];
  }

  endDragOutLine(_: dragEndProp) {
    if (
      this.#targetConnector &&
      this.#targetConnector instanceof ConnectorComponent
    ) {
      const target = this.#targetConnector;
      if (target == null) {
        console.error(`Error: target is null`);
        this._endLineDragCleanup();
        return;
      }
      if (this.connectToConnector(target, this.#outgoingLines[0]) == false) {
        this._endLineDragCleanup();
        this.deleteLine(0);
        return;
      }

      target.#prop[target.#name] = this.#prop[this.#name];

      this.#outgoingLines[0].setLineEnd(
        target.worldTransform.x,
        target.worldTransform.y,
      );
    } else {
      this.deleteLine(0);
    }
    if (this.parent) {
      this.parent.updateNodeLines();
    }

    this._endLineDragCleanup();
  }

  _endLineDragCleanup() {
    this.#state = ConnectorState.IDLE;
    this.event.global.pointerMove = null;
    this.event.global.pointerUp = null;
    this.parent.updateNodeLineList();
    this.#targetConnector = null;
    this.#mouseHitBox.event.collider.onBeginContact = null;
    this.#mouseHitBox.event.collider.onEndContact = null;
    this.#mouseHitBox.localTransform = { x: 0, y: 0 };
  }

  startPickUpLine(line: LineComponent, prop: pointerDownProp) {
    line.start.disconnectFromConnector(this);
    this.disconnectFromConnector(line.start);
    line.start.deleteLine(line.start.outgoingLines.indexOf(line));
    this.engine?.input.setPointerDragOwner(prop.event.pointerId, line.start);
    line.start.targetConnector = this;
    line.start.startDragOutLine(prop);
    this.#state = ConnectorState.DRAGGING;
  }

  connectToConnector(
    connector: ConnectorComponent,
    line: LineComponent | null,
  ): boolean {
    const currentIncomingLines = connector.incomingLines.filter(
      (i) => !i.isDeleteRequested,
    );

    if (currentIncomingLines.some((i) => i.start == this)) {
      return false;
    }

    if (connector.config.maxConnectors === currentIncomingLines.length) {
      return false;
    }

    if (line == null) {
      line = this.createLine();
      this.#outgoingLines.unshift(line);
    }

    line.target = connector;
    connector.incomingLines.push(line);

    this.parent.updateNodeLineList();

    this.#connectorCallback?.onConnectOutgoing?.(connector);
    connector.#connectorCallback?.onConnectIncoming?.(this);
    this.parent.setProp(this.#name, this.#prop[this.#name]);

    return true;
  }

  disconnectFromConnector(connector: ConnectorComponent) {
    for (const line of this.#outgoingLines) {
      if (line.target == connector) {
        line.isDeleteRequested = true;
        break;
      }
    }
    this.#connectorCallback?.onDisconnectOutgoing?.(connector);
    connector.#connectorCallback?.onDisconnectIncoming?.(this);
  }
}

export { ConnectorComponent };
