import Canvas from "./lib/Canvas";
import CameraControl from "./lib/CameraControl";
import Background from "./lib/Background";

import "./lib/style.css";

export default function App() {
  return (
    <main>
      <div
        style={{
          width: "80vw",
          height: "80vh",
        }}
      >
        <Canvas>
          <CameraControl
            cameraControlProps={{ zoomLock: false, panLock: false }}
          >
            <h1>Hello World</h1>
          </CameraControl>
          {/* <Background /> */}
        </Canvas>
      </div>
    </main>
  );
}
