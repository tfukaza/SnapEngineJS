import {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
} from "react";
import { ConnectorComponent } from "@snap-engine/snapline";
import { useSnapLineEngine } from "./Engine";
import { NodeObjectContext } from "./Node";

export interface ConnectorProps {
  allowDragOut?: boolean;
  className?: string;
  maxConnectors?: number;
  name: string;
  style?: CSSProperties;
}

export interface ConnectorRef {
  object(): ConnectorComponent;
}

export const Connector = forwardRef<ConnectorRef, ConnectorProps>(
  (
    {
      allowDragOut = true,
      className = "",
      maxConnectors = 1,
      name,
      style,
    },
    ref,
  ) => {
    const engine = useSnapLineEngine();
    const nodeObject = useContext(NodeObjectContext);
    if (!nodeObject) {
      throw new Error("<Connector> must be rendered inside <Node>.");
    }

    const connectorDomRef = useRef<HTMLDivElement>(null);
    const connectorRef = useRef<ConnectorComponent | null>(null);
    if (!connectorRef.current) {
      connectorRef.current = new ConnectorComponent(engine, nodeObject, {
        allowDragOut,
        maxConnectors,
        name,
      });
      nodeObject.addConnectorObject(connectorRef.current);
    }
    const connector = connectorRef.current;

    useImperativeHandle(ref, () => ({
      object: () => connector,
    }));

    useEffect(() => {
      if (connectorDomRef.current) {
        connector.element = connectorDomRef.current;
      }
      return () => {
        connector.destroy();
      };
    }, [connector]);

    return (
      <div
        ref={connectorDomRef}
        data-snapline-name={name}
        data-snapline-type="connector"
        className={`connector ${allowDragOut ? "right" : "left"} ${className}`.trim()}
        style={{
          background: "#4f46e5",
          border: "2px solid #ffffff",
          borderRadius: 999,
          boxShadow: "0 1px 3px rgba(15, 23, 42, 0.25)",
          cursor: "crosshair",
          height: 14,
          pointerEvents: "auto",
          width: 14,
          ...style,
        }}
      />
    );
  },
);
