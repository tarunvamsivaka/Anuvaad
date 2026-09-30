"use client";

import dynamic from "next/dynamic";

const WebGLCanvas = dynamic(
  () => import("@/features/landing/_canvas/WebGLCanvas").then((mod) => mod.WebGLCanvas),
  { ssr: false }
);

const SmoothScroll = dynamic(
  () => import("./SmoothScroll").then((mod) => mod.SmoothScroll),
  { ssr: false }
);

export function WebGLScrollProvider() {
  return (
    <>
      <WebGLCanvas />
      <SmoothScroll />
    </>
  );
}
