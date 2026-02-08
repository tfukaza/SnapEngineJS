import { useContext, useRef, useEffect, createContext } from "react";
import { CameraControl } from "@snap-engine/base";
import { EngineContext } from "./Canvas";

// Create context for camera control so child components can access it
export const CameraControlContext = createContext<CameraControl | null>(null);

interface CameraControlProps {
  zoomLock?: boolean;
  panLock?: boolean;
}

export default function CameraControlReact({
  children,
  cameraControlProps: { zoomLock = false, panLock = false },
}: {
  children: React.ReactNode;
  cameraControlProps: CameraControlProps;
}) {
  const engine = useContext(EngineContext);
  const cameraControlElement = useRef<HTMLDivElement>(null);
  const cameraControlRef = useRef<CameraControl | null>(null);

  useEffect(() => {
    if (!engine) {
      console.warn("CameraControl: No engine found in context");
      return;
    }

    cameraControlRef.current = new CameraControl(
      engine,
      {
        zoomLock: zoomLock,
        panLock: panLock,
      }
    );

    if (cameraControlElement.current) {
      cameraControlRef.current.element = cameraControlElement.current;
    }
  }, [engine, zoomLock, panLock]);

  useEffect(() => {
    if (cameraControlRef.current && cameraControlElement.current) {
      cameraControlRef.current.element = cameraControlElement.current;
    }
  }, []);

  return (
    <div
      id="snap-camera-control"
      ref={cameraControlElement}
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#fff",
        userSelect: "none",
      }}
    >
      <CameraControlContext.Provider value={cameraControlRef.current}>
        {children}
      </CameraControlContext.Provider>
    </div>
  );
}
