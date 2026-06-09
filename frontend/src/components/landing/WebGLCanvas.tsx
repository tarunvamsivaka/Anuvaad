"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function WebGLCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const scrollRef = useRef({ percent: 0, targetPercent: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    // ── 1. INITIALIZE THREE.JS SCENE ──
    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030014, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 30;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x030014, 1);
    containerRef.current.appendChild(renderer.domElement);

    // ── 2. PARTICLES INITIALIZATION ──
    const PARTICLE_COUNT = 6000;
    const geometry = new THREE.BufferGeometry();

    const initialPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    // Color palettes (Awwwards obsidian vibe: cosmic violet, neon indigo, glowing gold, deep teal)
    const colorChoices = [
      new THREE.Color(0x6366f1), // Indigo
      new THREE.Color(0xec4899), // Pink / Violet
      new THREE.Color(0x06b6d4), // Cyan
      new THREE.Color(0xf59e0b), // Amber/Gold
    ];

    // Generate Layout Positions
    const tunnelPos = new Float32Array(PARTICLE_COUNT * 3);
    const gridPos = new Float32Array(PARTICLE_COUNT * 3);
    const wavePos = new Float32Array(PARTICLE_COUNT * 3);
    const spherePos = new Float32Array(PARTICLE_COUNT * 3);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      // ── COLOR & JITTER SETUP ──
      const col = colorChoices[i % colorChoices.length];
      colors[i3] = col.r;
      colors[i3 + 1] = col.g;
      colors[i3 + 2] = col.b;
      sizes[i] = Math.random() * 2.5 + 0.5;

      // Layout 1: Cylinder / Vortex Tunnel (Hero)
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2 * 60; // Spiral
      const radius = 6 + Math.sin(i * 0.05) * 2;
      const zVal = -50 + (i / PARTICLE_COUNT) * 80;
      tunnelPos[i3] = Math.cos(angle) * radius;
      tunnelPos[i3 + 1] = Math.sin(angle) * radius;
      tunnelPos[i3 + 2] = zVal;

      // Layout 2: Revolving Grid Constellation (Features)
      const cols = 80;
      const row = Math.floor(i / cols);
      const colIdx = i % cols;
      gridPos[i3] = (colIdx - cols / 2) * 0.7 + (Math.random() - 0.5) * 0.15;
      gridPos[i3 + 1] = (row - (PARTICLE_COUNT / cols) / 2) * 0.7 + (Math.random() - 0.5) * 0.15;
      gridPos[i3 + 2] = Math.sin(colIdx * 0.2) * Math.cos(row * 0.2) * 4;

      // Layout 3: Flowing Wave Stream (How It Works)
      const t = (i / PARTICLE_COUNT) * Math.PI * 4;
      wavePos[i3] = -30 + (i / PARTICLE_COUNT) * 60;
      wavePos[i3 + 1] = Math.sin(t * 3 + i * 0.01) * 6 + Math.cos(t * 1.5) * 2;
      wavePos[i3 + 2] = Math.sin(t * 2) * Math.cos(t) * 8;

      // Layout 4: Central Plasma Sphere (Pricing/CTA)
      const u = Math.random();
      const vVal = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * vVal - 1.0);
      const r = 8 + (Math.random() - 0.5) * 1.5;
      spherePos[i3] = r * Math.sin(phi) * Math.cos(theta);
      spherePos[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      spherePos[i3 + 2] = r * Math.cos(phi);

      // Start positions set to Tunnel layout
      initialPositions[i3] = tunnelPos[i3];
      initialPositions[i3 + 1] = tunnelPos[i3 + 1];
      initialPositions[i3 + 2] = tunnelPos[i3 + 2];
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(initialPositions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Custom circle texture using canvas (no external assets needed)
    const createCircleTexture = () => {
      const matCanvas = document.createElement("canvas");
      matCanvas.width = 32;
      matCanvas.height = 32;
      const ctx = matCanvas.getContext("2d");
      if (ctx) {
        const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        grad.addColorStop(0, "rgba(255, 255, 255, 1)");
        grad.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 32, 32);
      }
      return new THREE.CanvasTexture(matCanvas);
    };

    const material = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      map: createCircleTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // Add ambient lights for global illumination mapping if meshes are loaded
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // ── 3. INTERACTIVE EVENTS ──
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        scrollRef.current.targetPercent = window.scrollY / scrollHeight;
      }
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);

    // ── 4. RENDER & MORPH ANIMATION LOOP ──
    const clock = new THREE.Clock();
    let animationId: number;

    const tick = () => {
      const elapsedTime = clock.getElapsedTime();

      // Smooth mouse interpolations (lerping)
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      // Smooth scroll interpolations (lerping)
      scrollRef.current.percent += (scrollRef.current.targetPercent - scrollRef.current.percent) * 0.08;
      const scrollVal = scrollRef.current.percent;

      // Update Camera positions for immersive transitions
      camera.position.x = mouseRef.current.x * 3;
      camera.position.y = mouseRef.current.y * 3;
      camera.lookAt(0, 0, 0);

      // Rotate particle systems slowly
      particleSystem.rotation.y = elapsedTime * 0.03 + mouseRef.current.x * 0.15;
      particleSystem.rotation.x = Math.sin(elapsedTime * 0.1) * 0.05 + mouseRef.current.y * 0.1;

      // Morph geometry coordinates based on scroll progress
      const positions = geometry.attributes.position.array as Float32Array;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;

        // Find correct layout blend targets
        let tx = tunnelPos[i3];
        let ty = tunnelPos[i3 + 1];
        let tz = tunnelPos[i3 + 2];

        if (scrollVal <= 0.3) {
          // Morph 1: Tunnel -> Grid
          const factor = scrollVal / 0.3;
          tx = THREE.MathUtils.lerp(tunnelPos[i3], gridPos[i3], factor);
          ty = THREE.MathUtils.lerp(tunnelPos[i3 + 1], gridPos[i3 + 1], factor);
          tz = THREE.MathUtils.lerp(tunnelPos[i3 + 2], gridPos[i3 + 2], factor);
        } else if (scrollVal <= 0.65) {
          // Morph 2: Grid -> Wave
          const factor = (scrollVal - 0.3) / 0.35;
          tx = THREE.MathUtils.lerp(gridPos[i3], wavePos[i3], factor);
          ty = THREE.MathUtils.lerp(gridPos[i3 + 1], wavePos[i3 + 1], factor);
          tz = THREE.MathUtils.lerp(gridPos[i3 + 2], wavePos[i3 + 2], factor);
        } else {
          // Morph 3: Wave -> Sphere
          const factor = Math.min((scrollVal - 0.65) / 0.35, 1.0);
          tx = THREE.MathUtils.lerp(wavePos[i3], spherePos[i3], factor);
          ty = THREE.MathUtils.lerp(wavePos[i3 + 1], spherePos[i3 + 1], factor);
          tz = THREE.MathUtils.lerp(wavePos[i3 + 2], spherePos[i3 + 2], factor);
        }

        // Apply mouse distortion physics (particles move away/interactive pull)
        const dx = positions[i3] - mouseRef.current.x * 12;
        const dy = positions[i3 + 1] - mouseRef.current.y * 12;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 4) {
          const force = (4 - dist) * 0.08;
          tx += dx * force;
          ty += dy * force;
        }

        // Apply lerped morph motion
        positions[i3] += (tx - positions[i3]) * 0.1;
        positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.1;
        positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.1;
      }

      geometry.attributes.position.needsUpdate = true;

      // Render scene
      renderer.render(scene, camera);

      animationId = requestAnimationFrame(tick);
    };

    tick();

    // ── 5. CLEAN UP ──
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 -z-50 h-screen w-screen overflow-hidden bg-[#030014]"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
