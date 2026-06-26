import * as THREE from "three";

export class WebGLSceneManager {
  private canvas: HTMLCanvasElement | OffscreenCanvas;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private particleSystem!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;

  private particleCount: number;
  private dpr: number;

  // Position buffers for the 7 States
  private chaosPos!: Float32Array;
  private discoveryPos!: Float32Array;
  private mappingPos!: Float32Array;
  private translationPos!: Float32Array;
  private connectionPos!: Float32Array;
  private understandingPos!: Float32Array;
  private spherePos!: Float32Array;
  private clarityPos!: Float32Array;

  // Interaction & Scroll States
  private scrollPercent = 0;
  private targetScrollPercent = 0;
  private mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

  private clock = new THREE.Clock();
  private animationId?: number;
  private isDestroyed = false;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas, particleCount: number, dpr: number) {
    this.canvas = canvas;
    this.particleCount = particleCount;
    this.dpr = dpr;
    this.init();
  }

  private init() {
    // ── 1. INITIALIZE SCENE, CAMERA, RENDERER ──
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xf5f3ef, 0.015);

    const width = this.canvas.width || 800;
    const height = this.canvas.height || 600;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    this.camera.position.z = 30;

    // Renderer options mapping to performance requirements
    const context = this.canvas.getContext("webgl2") || this.canvas.getContext("webgl");
    if (!context) {
      throw new Error("WebGL context not available");
    }

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      context: context as WebGLRenderingContext,
      antialias: this.dpr > 1,
      alpha: true,
      powerPreference: "high-performance",
    });

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(width, height, false);
    this.renderer.setClearColor(0xf5f3ef, 1);

    // ── 2. PRE-COMPUTE PARTICLE STATES ──
    this.initParticles();

    // ── 3. ADD LIGHTS ──
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    this.scene.add(ambientLight);

    // ── 4. START RENDER LOOP ──
    this.tick();
  }

  private initParticles() {
    const N = this.particleCount;
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);
    const sizes = new Float32Array(N);

    // Obsidian/Awwwards core colors
    const colorChoices = [
      new THREE.Color(0x6366f1), // Indigo
      new THREE.Color(0xec4899), // Pink
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xf59e0b), // Amber
    ];

    // Instantiate coordinate arrays
    this.chaosPos = new Float32Array(N * 3);
    this.discoveryPos = new Float32Array(N * 3);
    this.mappingPos = new Float32Array(N * 3);
    this.translationPos = new Float32Array(N * 3);
    this.connectionPos = new Float32Array(N * 3);
    this.understandingPos = new Float32Array(N * 3);
    this.spherePos = new Float32Array(N * 3);
    this.clarityPos = new Float32Array(N * 3);

    // Define mapping structure nodes (Tree graph)
    const mapEdges = [
      [ { x: 0, y: 6, z: 0 }, { x: -6, y: 2, z: 0 } ],
      [ { x: 0, y: 6, z: 0 }, { x: 0, y: 1, z: -2 } ],
      [ { x: 0, y: 6, z: 0 }, { x: 6, y: 2, z: 0 } ],
      [ { x: -6, y: 2, z: 0 }, { x: -9, y: -2, z: 1 } ],
      [ { x: -6, y: 2, z: 0 }, { x: -6, y: -3, z: 0 } ],
      [ { x: -6, y: 2, z: 0 }, { x: -3, y: -2, z: -1 } ],
      [ { x: 0, y: 1, z: -2 }, { x: -1.5, y: -4, z: 0 } ],
      [ { x: 0, y: 1, z: -2 }, { x: 1.5, y: -4, z: 0 } ],
      [ { x: 6, y: 2, z: 0 }, { x: 3, y: -2, z: 0 } ],
      [ { x: 6, y: 2, z: 0 }, { x: 6, y: -3, z: 1 } ],
      [ { x: 6, y: 2, z: 0 }, { x: 9, y: -2, z: -1 } ]
    ];

    // Cluster centers for Discovery
    const discoveryCenters = [
      { x: -8, y: 3, z: 0 },
      { x: 8, y: -2, z: -4 },
      { x: -2, y: -5, z: 2 }
    ];

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      // Color mapping & sizes
      const col = colorChoices[i % colorChoices.length];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
      sizes[i] = Math.random() * 2.2 + 0.4;

      // ── STATE 1: CHAOS (High entropy scattered cloud) ──
      this.chaosPos[i3] = (Math.random() - 0.5) * 36;
      this.chaosPos[i3 + 1] = (Math.random() - 0.5) * 24;
      this.chaosPos[i3 + 2] = (Math.random() - 0.5) * 30;

      // ── STATE 2: DISCOVERY (Clustered repository modules) ──
      const dCenter = discoveryCenters[i % 3];
      const dRad = Math.random() * 4.5;
      const dTheta = Math.random() * Math.PI * 2;
      const dPhi = Math.acos((Math.random() * 2) - 1);
      this.discoveryPos[i3] = dCenter.x + dRad * Math.sin(dPhi) * Math.cos(dTheta);
      this.discoveryPos[i3 + 1] = dCenter.y + dRad * Math.sin(dPhi) * Math.sin(dTheta);
      this.discoveryPos[i3 + 2] = dCenter.z + dRad * Math.cos(dPhi);

      // ── STATE 3: MAPPING (Files & folder network graph tree) ──
      const edge = mapEdges[i % mapEdges.length];
      const edgeT = Math.random();
      this.mappingPos[i3] = edge[0].x + (edge[1].x - edge[0].x) * edgeT + (Math.random() - 0.5) * 0.4;
      this.mappingPos[i3 + 1] = edge[0].y + (edge[1].y - edge[0].y) * edgeT + (Math.random() - 0.5) * 0.4;
      this.mappingPos[i3 + 2] = edge[0].z + (edge[1].z - edge[0].z) * edgeT + (Math.random() - 0.5) * 0.4;

      // ── STATE 4: TRANSLATION (Code to English left-to-right columns) ──
      const trPct = i / N;
      if (trPct < 0.4) {
        // Left column (code blocks)
        this.translationPos[i3] = -10 + (Math.random() - 0.5) * 1.5;
        this.translationPos[i3 + 1] = (Math.random() - 0.5) * 16;
        this.translationPos[i3 + 2] = (Math.random() - 0.5) * 3;
      } else if (trPct < 0.8) {
        // Right column (English definitions)
        this.translationPos[i3] = 10 + (Math.random() - 0.5) * 1.5;
        this.translationPos[i3 + 1] = (Math.random() - 0.5) * 16;
        this.translationPos[i3 + 2] = (Math.random() - 0.5) * 3;
      } else {
        // Connected bezier flow lines
        const bT = Math.random();
        const yS = ((i * 17) % 20 - 10);
        const yE = ((i * 31) % 20 - 10);
        const p0 = { x: -10, y: yS, z: 0 };
        const p1 = { x: -4, y: yS + 4, z: 3 };
        const p2 = { x: 4, y: yE - 4, z: -3 };
        const p3 = { x: 10, y: yE, z: 0 };
        const mt = 1 - bT;
        this.translationPos[i3] = mt*mt*mt*p0.x + 3*mt*mt*bT*p1.x + 3*mt*bT*bT*p2.x + bT*bT*bT*p3.x;
        this.translationPos[i3 + 1] = mt*mt*mt*p0.y + 3*mt*mt*bT*p1.y + 3*mt*bT*bT*p2.y + bT*bT*bT*p3.y;
        this.translationPos[i3 + 2] = mt*mt*mt*p0.z + 3*mt*mt*bT*p1.z + 3*mt*bT*bT*p2.z + bT*bT*bT*p3.z;
      }

      // ── STATE 5: CONNECTION (Active dependency paths) ──
      if (trPct < 0.35) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 2.2;
        this.connectionPos[i3] = -8 + r * Math.cos(theta);
        this.connectionPos[i3 + 1] = r * Math.sin(theta);
        this.connectionPos[i3 + 2] = (Math.random() - 0.5) * 2;
      } else if (trPct < 0.7) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 2.2;
        this.connectionPos[i3] = 8 + r * Math.cos(theta);
        this.connectionPos[i3 + 1] = r * Math.sin(theta);
        this.connectionPos[i3 + 2] = (Math.random() - 0.5) * 2;
      } else {
        const connT = Math.random();
        this.connectionPos[i3] = -8 + 16 * connT;
        this.connectionPos[i3 + 1] = Math.sin(connT * Math.PI * 2) * 2.5 + (Math.random() - 0.5) * 0.5;
        this.connectionPos[i3 + 2] = Math.cos(connT * Math.PI * 2) * 2.5 + (Math.random() - 0.5) * 0.5;
      }

      // ── STATE 6: UNDERSTANDING (Calm flowing wave grids) ──
      const uX = -16 + 32 * (i / N);
      const uZ = (Math.random() - 0.5) * 16;
      this.understandingPos[i3] = uX;
      this.understandingPos[i3 + 1] = Math.sin(uX * 0.4 + (i * 0.005)) * 3.5 + Math.cos(uZ * 0.3) * 1.5;
      this.understandingPos[i3 + 2] = uZ;

      // ── STATE 6.5: SPHERE (Organized structure) ──
      const sPhi = Math.acos((Math.random() * 2) - 1);
      const sTheta = Math.random() * Math.PI * 2;
      const sRad = 8;
      this.spherePos[i3] = sRad * Math.sin(sPhi) * Math.cos(sTheta);
      this.spherePos[i3 + 1] = sRad * Math.sin(sPhi) * Math.sin(sTheta);
      this.spherePos[i3 + 2] = sRad * Math.cos(sPhi);

      // ── STATE 7: CLARITY (Perfect concentric rotating orbits) ──
      const cAngle = Math.random() * Math.PI * 2;
      let cRad = 6;
      const cZ = (Math.random() - 0.5) * 0.6;
      if (i % 3 === 0) {
        cRad = 3.5;
      } else if (i % 3 === 1) {
        cRad = 6.5;
      } else {
        cRad = 9.5;
      }
      this.clarityPos[i3] = cRad * Math.cos(cAngle);
      this.clarityPos[i3 + 1] = cRad * Math.sin(cAngle);
      this.clarityPos[i3 + 2] = cZ;

      // Initialize points in Discovery layout
      positions[i3] = this.discoveryPos[i3];
      positions[i3 + 1] = this.discoveryPos[i3 + 1];
      positions[i3 + 2] = this.discoveryPos[i3 + 2];
    }

    this.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Custom circle texture (Web Worker safe)
    const createCircleTexture = () => {
      let matCanvas: HTMLCanvasElement | OffscreenCanvas;
      if (typeof document !== "undefined") {
        matCanvas = document.createElement("canvas");
      } else if (typeof OffscreenCanvas !== "undefined") {
        matCanvas = new OffscreenCanvas(32, 32);
      } else {
        return null;
      }
      matCanvas.width = 32;
      matCanvas.height = 32;
      const ctx = matCanvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(255, 255, 255, 0.85)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
      }
      return new THREE.CanvasTexture(matCanvas as any);
    };

    const mapTexture = createCircleTexture();

    this.material = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      map: mapTexture || undefined,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.particleSystem = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particleSystem);
  }

  public setScroll(percent: number) {
    this.targetScrollPercent = percent;
  }

  public setMouse(x: number, y: number) {
    this.mouse.targetX = x;
    this.mouse.targetY = y;
  }

  public resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(dpr);
  }

  private tick = () => {
    if (this.isDestroyed) return;

    const elapsedTime = this.clock.getElapsedTime();

    // Lerp mouse and scroll progress inputs
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.scrollPercent += (this.targetScrollPercent - this.scrollPercent) * 0.07;
    const scrollVal = this.scrollPercent;

    // Camera perspective animations
    this.camera.position.x = this.mouse.x * 2.5;
    this.camera.position.y = this.mouse.y * 2.5;
    this.camera.lookAt(0, 0, 0);

    // Particle global rotation updates
    this.particleSystem.rotation.y = elapsedTime * 0.025 + this.mouse.x * 0.12;
    this.particleSystem.rotation.x = Math.sin(elapsedTime * 0.08) * 0.03 + this.mouse.y * 0.08;

    // Morph layout targets
    const states = [
      { progress: 0.0, pos: this.discoveryPos },
      { progress: 0.138, pos: this.chaosPos },
      { progress: 0.259, pos: this.mappingPos },
      { progress: 0.379, pos: this.translationPos },
      { progress: 0.5, pos: this.connectionPos },
      { progress: 0.621, pos: this.spherePos },
      { progress: 0.759, pos: this.understandingPos },
      { progress: 0.948, pos: this.clarityPos }
    ];

    let fromState = states[0];
    let toState = states[1];
    let t = 0;

    for (let i = 0; i < states.length - 1; i++) {
      if (scrollVal >= states[i].progress && scrollVal <= states[i + 1].progress) {
        fromState = states[i];
        toState = states[i + 1];
        const range = toState.progress - fromState.progress;
        t = range > 0 ? (scrollVal - fromState.progress) / range : 0;
        break;
      }
    }

    if (scrollVal >= states[states.length - 1].progress) {
      fromState = states[states.length - 1];
      toState = states[states.length - 1];
      t = 1.0;
    }

    const positions = this.geometry.attributes.position.array as Float32Array;
    const fromPos = fromState.pos;
    const toPos = toState.pos;
    const N = this.particleCount;

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;

      let tx = THREE.MathUtils.lerp(fromPos[i3], toPos[i3], t);
      let ty = THREE.MathUtils.lerp(fromPos[i3 + 1], toPos[i3 + 1], t);
      let tz = THREE.MathUtils.lerp(fromPos[i3 + 2], toPos[i3 + 2], t);

      // Active Translation streaming flow
      if (fromState.progress === 0.379 || toState.progress === 0.379) {
        if (i / N >= 0.8) {
          const flowT = (elapsedTime * 0.12 + (i * 0.0035)) % 1.0;
          const yS = ((i * 17) % 20 - 10);
          const yE = ((i * 31) % 20 - 10);
          const p0 = { x: -10, y: yS, z: 0 };
          const p1 = { x: -4, y: yS + 4, z: 3 };
          const p2 = { x: 4, y: yE - 4, z: -3 };
          const p3 = { x: 10, y: yE, z: 0 };
          const mt = 1 - flowT;
          const fx = mt*mt*mt*p0.x + 3*mt*mt*flowT*p1.x + 3*mt*flowT*flowT*p2.x + flowT*flowT*flowT*p3.x;
          const fy = mt*mt*mt*p0.y + 3*mt*mt*flowT*p1.y + 3*mt*flowT*flowT*p2.y + flowT*flowT*flowT*p3.y;
          const fz = mt*mt*mt*p0.z + 3*mt*mt*flowT*p1.z + 3*mt*flowT*flowT*p2.z + flowT*flowT*flowT*p3.z;

          tx = THREE.MathUtils.lerp(tx, fx, t);
          ty = THREE.MathUtils.lerp(ty, fy, t);
          tz = THREE.MathUtils.lerp(tz, fz, t);
        }
      }

      // Proximity mouse physics
      const dx = positions[i3] - this.mouse.x * 12;
      const dy = positions[i3 + 1] - this.mouse.y * 12;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 4.5) {
        const force = (4.5 - dist) * 0.08;
        tx += dx * force;
        ty += dy * force;
      }

      // Continuous easing morph
      positions[i3] += (tx - positions[i3]) * 0.12;
      positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.12;
      positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.12;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);

    this.animationId = requestAnimationFrame(this.tick);
  };

  public destroy() {
    this.isDestroyed = true;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.renderer.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
