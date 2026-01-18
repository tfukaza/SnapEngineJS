import { Engine } from "../../../../src/index";
import { useRef } from "react";
import { useEffect } from "react";
import { createContext } from "react";

export const EngineContext = createContext<Engine | null>(null);

export default function SnapEngineReact({
  children,
}: {
  children: React.ReactNode;
}) {
  const engine = useRef(new Engine());
  const canvas = useRef<HTMLDivElement>(null); // canvas that contains the nodes

  useEffect(() => {
    if (!engine.current || !canvas.current) {
      return;
    }
    engine.current.assignDom(canvas.current as HTMLElement);
    engine.current.enableDebug();
  }, []);

  return (
    <div
      ref={canvas}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        position: "relative",
      }}
      id="snap-canvas"
    >
      <EngineContext.Provider value={engine.current}>
        {children}
      </EngineContext.Provider>
    </div>
  );
}
