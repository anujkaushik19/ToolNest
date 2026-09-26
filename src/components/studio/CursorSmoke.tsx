"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Cursor smoke trail rendered with three.js. Instanced soft quads (portable —
 * no gl_PointSize limits) that spawn at the pointer, drift up, expand and fade.
 * Non-interactive overlay; disabled for touch / reduced-motion.
 */
export default function CursorSmoke() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (typeof window === "undefined") return;

    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    let w = window.innerWidth;
    let h = window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 1, 100);
    camera.position.z = 10;

    // ---- soft puff sprite (generated, no asset) ----
    const tex = makeSmokeTexture();

    // ---- particle pool ----
    const COUNT = 420;
    const offset = new Float32Array(COUNT * 3);
    const scaleA = new Float32Array(COUNT);
    const alphaA = new Float32Array(COUNT);
    const colorA = new Float32Array(COUNT * 3);
    const rotA = new Float32Array(COUNT);

    // per-particle simulation state
    const vx = new Float32Array(COUNT);
    const vy = new Float32Array(COUNT);
    const size0 = new Float32Array(COUNT);
    const grow = new Float32Array(COUNT);
    const life = new Float32Array(COUNT);
    const maxLife = new Float32Array(COUNT);
    const rotV = new Float32Array(COUNT);
    const peak = new Float32Array(COUNT);

    const PALETTE = [
      [0.51, 0.55, 0.97], // indigo-400
      [0.65, 0.55, 0.98], // violet
      [0.91, 0.47, 0.98], // fuchsia
      [0.79, 0.78, 0.95], // lavender mist
    ];

    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute("position", base.attributes.position);
    geo.setAttribute("uv", base.attributes.uv);
    geo.setAttribute("iOffset", new THREE.InstancedBufferAttribute(offset, 3));
    geo.setAttribute("iScale", new THREE.InstancedBufferAttribute(scaleA, 1));
    geo.setAttribute("iAlpha", new THREE.InstancedBufferAttribute(alphaA, 1));
    geo.setAttribute("iColor", new THREE.InstancedBufferAttribute(colorA, 3));
    geo.setAttribute("iRot", new THREE.InstancedBufferAttribute(rotA, 1));
    geo.instanceCount = COUNT;

    const material = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      vertexShader: /* glsl */ `
        attribute vec3 iOffset;
        attribute float iScale;
        attribute float iAlpha;
        attribute vec3 iColor;
        attribute float iRot;
        varying vec2 vUv;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vUv = uv;
          vAlpha = iAlpha;
          vColor = iColor;
          float c = cos(iRot);
          float s = sin(iRot);
          vec2 p = position.xy * iScale;
          p = vec2(p.x * c - p.y * s, p.x * s + p.y * c);
          vec3 world = iOffset + vec3(p, 0.0);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(world, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying vec2 vUv;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float a = texture2D(uTex, vUv).a * vAlpha;
          gl_FragColor = vec4(vColor * a, a); // premultiplied
        }
      `,
    });

    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    scene.add(mesh);

    // ---- pointer tracking + spawning ----
    let curX = 0;
    let curY = 0;
    let lastX = 0;
    let lastY = 0;
    let hasPointer = false;
    let head = 0;

    function spawn(x: number, y: number, jitter: number) {
      const i = head;
      head = (head + 1) % COUNT;
      const ang = Math.random() * Math.PI * 2;
      const spd = 8 + Math.random() * 34;
      offset[i * 3] = x + (Math.random() - 0.5) * jitter;
      offset[i * 3 + 1] = y + (Math.random() - 0.5) * jitter;
      offset[i * 3 + 2] = 0;
      vx[i] = Math.cos(ang) * spd;
      vy[i] = Math.sin(ang) * spd + 18; // gentle upward drift
      size0[i] = 30 + Math.random() * 34;
      grow[i] = 70 + Math.random() * 130;
      maxLife[i] = 1.2 + Math.random() * 1.3;
      life[i] = maxLife[i];
      rotA[i] = Math.random() * Math.PI * 2;
      rotV[i] = (Math.random() - 0.5) * 1.2;
      peak[i] = 0.26 + Math.random() * 0.22;
      const col = PALETTE[(Math.random() * PALETTE.length) | 0];
      colorA[i * 3] = col[0];
      colorA[i * 3 + 1] = col[1];
      colorA[i * 3 + 2] = col[2];
    }

    function onMove(e: PointerEvent) {
      curX = e.clientX - w / 2;
      curY = h / 2 - e.clientY;
      if (!hasPointer) {
        lastX = curX;
        lastY = curY;
        hasPointer = true;
      }
    }
    window.addEventListener("pointermove", onMove, { passive: true });

    function onResize() {
      w = window.innerWidth;
      h = window.innerHeight;
      renderer.setSize(w, h);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", onResize);

    // ---- animation loop ----
    const clock = new THREE.Clock();
    let raf = 0;
    let running = true;

    function tick() {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      // emit along the path travelled since last frame
      if (hasPointer) {
        const dx = curX - lastX;
        const dy = curY - lastY;
        const dist = Math.hypot(dx, dy);
        const emits = Math.min(14, Math.max(dist > 0.5 ? 1 : 0, Math.floor(dist / 5)));
        for (let k = 0; k < emits; k++) {
          const t = emits > 1 ? k / emits : 0;
          spawn(lastX + dx * t, lastY + dy * t, 10);
        }
        lastX = curX;
        lastY = curY;
      }

      for (let i = 0; i < COUNT; i++) {
        if (life[i] <= 0) {
          if (alphaA[i] !== 0) alphaA[i] = 0;
          continue;
        }
        life[i] -= dt;
        const prog = 1 - life[i] / maxLife[i];
        offset[i * 3] += vx[i] * dt;
        offset[i * 3 + 1] += vy[i] * dt;
        vy[i] += 10 * dt; // buoyant rise
        vx[i] *= 1 - 0.6 * dt;
        scaleA[i] = size0[i] + grow[i] * prog;
        rotA[i] += rotV[i] * dt;
        alphaA[i] = life[i] <= 0 ? 0 : peak[i] * Math.sin(Math.PI * Math.min(prog, 1));
      }

      (geo.getAttribute("iOffset") as THREE.InstancedBufferAttribute).needsUpdate = true;
      (geo.getAttribute("iScale") as THREE.InstancedBufferAttribute).needsUpdate = true;
      (geo.getAttribute("iAlpha") as THREE.InstancedBufferAttribute).needsUpdate = true;
      (geo.getAttribute("iRot") as THREE.InstancedBufferAttribute).needsUpdate = true;
      (geo.getAttribute("iColor") as THREE.InstancedBufferAttribute).needsUpdate = true;

      renderer.render(scene, camera);
    }
    tick();

    function onVisibility() {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        clock.getDelta();
        tick();
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      geo.dispose();
      material.dispose();
      tex.dispose();
      base.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[60]"
      style={{ mixBlendMode: "normal" }}
    />
  );
}

function makeSmokeTexture(): THREE.Texture {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(0.7, "rgba(255,255,255,0.14)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}
