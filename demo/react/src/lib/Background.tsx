import { useContext, useRef, useEffect, createContext } from "react";
import { Background } from "../../../../src/index";
import { EngineContext } from "./Canvas";

export const BackgroundContext = createContext<Background | null>(null);

export default function BackgroundReact() {
  const engine = useContext(EngineContext);
  const backgroundElement = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<Background | null>(null);

  useEffect(() => {
    if (!engine) {
      console.warn("Background: No engine found in context");
      return;
    }

    backgroundRef.current = new Background(engine.global, null);

    if (backgroundElement.current) {
      backgroundRef.current.element = backgroundElement.current;
    }
  }, [engine]);

  useEffect(() => {
    if (backgroundRef.current && backgroundElement.current) {
      backgroundRef.current.element = backgroundElement.current;
    }
  }, []);

  return (
    <BackgroundContext.Provider value={backgroundRef.current}>
      <div
        id="sl-background"
        ref={backgroundElement}
        style={{
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle, #cccccc 2px, transparent 1px)",
          userSelect: "none",
        }}
      />
    </BackgroundContext.Provider>
  );
}
