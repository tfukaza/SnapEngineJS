import {
  useContext,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  createContext,
} from "react";
import { NodeComponent, ConnectorComponent } from "../../../../../src/index";
import { EngineContext } from "../Canvas";

// Create context for NodeObject - will be provided by Node component
export const NodeObjectContext = createContext<NodeComponent | null>(null);

interface ConnectorProps {
  name: string;
  maxConnectors?: number;
  allowDragOut?: boolean;
}

export interface ConnectorRef {
  object(): ConnectorComponent;
}

const ConnectorReact = forwardRef<ConnectorRef, ConnectorProps>(
  ({ name, maxConnectors = 1, allowDragOut = true }, ref) => {
    const engine = useContext(EngineContext);
    const nodeObject = useContext(NodeObjectContext);
    const connectorRef = useRef<ConnectorComponent | null>(null);
    const elementRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(ref, () => ({
      object: () => connectorRef.current!,
    }));

    useEffect(() => {
      if (!engine || !nodeObject) {
        console.warn("Connector: Missing engine or nodeObject in context");
        return;
      }

      connectorRef.current = new ConnectorComponent(engine.global, nodeObject, {
        name: name,
        maxConnectors: maxConnectors,
        allowDragOut: allowDragOut,
      });

      nodeObject.addConnectorObject(connectorRef.current);

      if (elementRef.current) {
        connectorRef.current.element = elementRef.current;
      }

      return () => {
        if (connectorRef.current) {
          connectorRef.current.destroy();
        }
      };
    }, [engine, nodeObject, name, maxConnectors, allowDragOut]);

    return <div className="connector" ref={elementRef}></div>;
  },
);

ConnectorReact.displayName = "ConnectorReact";

export default ConnectorReact;
