import { WebGLSceneManager } from "./WebGLSceneManager";

let manager: WebGLSceneManager | null = null;

self.onmessage = (event: MessageEvent) => {
  const data = event.data;

  switch (data.type) {
    case "init": {
      const { canvas, particleCount, dpr } = data;
      try {
        manager = new WebGLSceneManager(canvas, particleCount, dpr);
      } catch (err) {
        console.error("Worker failed to initialize WebGLSceneManager:", err);
      }
      break;
    }
    case "resize": {
      if (manager) {
        manager.resize(data.width, data.height, data.dpr);
      }
      break;
    }
    case "scroll": {
      if (manager) {
        manager.setScroll(data.value);
      }
      break;
    }
    case "mouse": {
      if (manager) {
        manager.setMouse(data.x, data.y);
      }
      break;
    }
    case "destroy": {
      if (manager) {
        manager.destroy();
        manager = null;
      }
      break;
    }
  }
};
