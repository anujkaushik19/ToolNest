"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

/** Animated, cursor-reactive distorted orb — the WebGL centerpiece. */
function Orb() {
  const mesh = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.getElapsedTime();
    mesh.current.rotation.y = t * 0.18;
    // ease toward the pointer for a subtle interactive tilt
    mesh.current.rotation.x = THREE.MathUtils.lerp(
      mesh.current.rotation.x,
      state.pointer.y * 0.35,
      0.05,
    );
    mesh.current.rotation.z = THREE.MathUtils.lerp(
      mesh.current.rotation.z,
      state.pointer.x * 0.25,
      0.05,
    );
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={1.3}>
      <mesh ref={mesh} scale={1.65}>
        <icosahedronGeometry args={[1, 20]} />
        <MeshDistortMaterial
          color="#8b5cf6"
          distort={0.42}
          speed={1.7}
          roughness={0.25}
          metalness={0.35}
          envMapIntensity={0.8}
        />
      </mesh>
    </Float>
  );
}

export function HeroScene({ className = "" }: { className?: string }) {
  return (
    <Canvas
      className={className}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      {/* colour-from-every-side lighting gives the orb an iridescent gradient */}
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 2, 4]} intensity={1.6} color="#f0abfc" />
      <pointLight position={[-4, -1, 2]} intensity={40} color="#22d3ee" />
      <pointLight position={[3, 3, -2]} intensity={35} color="#818cf8" />
      <Orb />
      <Sparkles count={70} scale={7} size={2.4} speed={0.4} color="#e9d5ff" opacity={0.7} />
    </Canvas>
  );
}
