import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Engine as CoreEngine } from "@snap-engine/core";
import { CollisionEngine } from "@snap-engine/core/collision";
import { DebugRenderer } from "@snap-engine/core/debug";

export const EngineContext = createContext<CoreEngine | null>(null);

export function useSnapSortEngine(): CoreEngine {
  const engine = useContext(EngineContext);
  if (!engine) {
    throw new Error("SnapSort React components must be rendered inside <Engine>.");
  }
  return engine;
}

export interface EngineProps {
  children: ReactNode;
  className?: string;
  debug?: boolean;
  engine?: CoreEngine | null;
  id?: string;
  style?: CSSProperties;
}

export function SnapSortEngine({
  children,
  className,
  debug = false,
  engine = null,
  id = "snap-canvas",
  style,
}: EngineProps) {
  const ownedEngineRef = useRef<CoreEngine | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  if (!ownedEngineRef.current) {
    ownedEngineRef.current = engine ?? new CoreEngine();
  }
  const resolvedEngine = engine ?? ownedEngineRef.current;

  if (!resolvedEngine.collisionEngine) {
    resolvedEngine.setCollisionEngine(new CollisionEngine());
  }

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    resolvedEngine.assignDom(canvasRef.current);
    resolvedEngine.camera?.setCameraPosition(0, 0);
  }, [resolvedEngine]);

  useEffect(() => {
    if (debug) {
      resolvedEngine.setDebugRenderer(new DebugRenderer());
    } else {
      resolvedEngine.disableDebug();
    }
  }, [debug, resolvedEngine]);

  return (
    <EngineContext.Provider value={resolvedEngine}>
      <div
        id={id}
        className={className}
        ref={canvasRef}
        style={{
          height: "100%",
          overflow: "hidden",
          position: "relative",
          ...style,
        }}
      >
        {children}
      </div>
    </EngineContext.Provider>
  );
}

export { SnapSortEngine as Engine };
