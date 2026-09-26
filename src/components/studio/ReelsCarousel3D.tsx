"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as THREE from "three";
import type { Media } from "@/lib/studio/types";
import { compact } from "@/components/studio/ui";

export interface ReelCardData {
  media: Media;
  views: number;
  follows: number;
  score: number;
}

/** Shared, mutable carousel state read/written by both DOM handlers and the r3f loop. */
interface Ctrl {
  active: number;
  vel: number;
  target: number | null;
  dragging: boolean;
  lastX: number;
}

// ---- poster texture drawing -------------------------------------------------

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function scoreColor(score: number): string {
  if (score >= 60) return "#34d399";
  if (score >= 40) return "#fbbf24";
  return "#fb7185";
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines - 1) break;
    } else {
      line = test;
    }
  }
  if (lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(`${last}…`).width > maxWidth && last.length > 1) last = last.slice(0, -1);
    if (ctx.measureText(lines[maxLines - 1]).width > maxWidth) lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function makePoster(card: ReelCardData): THREE.CanvasTexture {
  const W = 512;
  const H = 910;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  drawPoster(ctx, card, W, H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Vertically-mirrored, alpha-faded copy of the poster for the floor reflection. */
function makeReflection(card: ReelCardData): THREE.CanvasTexture {
  const W = 512;
  const H = 910;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  ctx.translate(0, H);
  ctx.scale(1, -1);
  drawPoster(ctx, card, W, H);
  ctx.restore();
  ctx.globalCompositeOperation = "destination-in";
  const fade = ctx.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, "rgba(0,0,0,0.4)");
  fade.addColorStop(0.55, "rgba(0,0,0,0.06)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fade;
  ctx.fillRect(0, 0, W, H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function drawPoster(ctx: CanvasRenderingContext2D, card: ReelCardData, W: number, H: number) {
  const { media: m, views, score } = card;

  // base gradient from the reel's signature colour
  const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
  g.addColorStop(0, shade(m.tileColor, 26));
  g.addColorStop(0.55, m.tileColor);
  g.addColorStop(1, shade(m.tileColor, -52));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // top light bloom
  const bloom = ctx.createRadialGradient(W * 0.5, H * 0.3, 8, W * 0.5, H * 0.3, W * 0.85);
  bloom.addColorStop(0, "rgba(255,255,255,0.20)");
  bloom.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, H);

  // bottom vignette for legibility
  const vg = ctx.createLinearGradient(0, H * 0.45, 0, H);
  vg.addColorStop(0, "rgba(6,7,18,0)");
  vg.addColorStop(1, "rgba(6,7,18,0.86)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  // topic pill (top-left)
  ctx.textAlign = "left";
  ctx.font = "600 26px system-ui, sans-serif";
  const topic = m.topic;
  const tw = ctx.measureText(topic).width;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  roundRect(ctx, 30, 32, tw + 40, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(topic, 50, 56);

  // score badge (top-right)
  const sc = scoreColor(score);
  ctx.beginPath();
  ctx.arc(W - 66, 56, 34, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(8,10,22,0.55)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = sc;
  ctx.beginPath();
  ctx.arc(W - 66, 56, 34, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(score, 100)) / 100);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 30px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(score), W - 66, 58);
  ctx.textAlign = "left";

  // play button
  ctx.beginPath();
  ctx.arc(W / 2, H * 0.44, 62, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.16)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 18, H * 0.44 - 26);
  ctx.lineTo(W / 2 - 18, H * 0.44 + 26);
  ctx.lineTo(W / 2 + 28, H * 0.44);
  ctx.closePath();
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // hook / caption (bottom)
  ctx.font = "700 34px system-ui, sans-serif";
  ctx.fillStyle = "#ffffff";
  const lines = wrapText(ctx, m.hook || m.caption || "Reel", W - 60, 2);
  let ty = H - 168;
  for (const line of lines) {
    ctx.fillText(line, 30, ty);
    ty += 42;
  }

  // metrics row
  ctx.font = "600 26px system-ui, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(`▶ ${compact(views)} views`, 30, H - 62);
  ctx.fillStyle = sc;
  ctx.textAlign = "right";
  ctx.fillText(score >= 50 ? "Above your avg" : "Below your avg", W - 30, H - 62);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// ---- 3D deck ----------------------------------------------------------------

function wrapDelta(x: number, n: number): number {
  let d = ((x % n) + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

function Deck({ cards, ctrl, autoRotate }: { cards: ReelCardData[]; ctrl: React.MutableRefObject<Ctrl>; autoRotate: boolean }) {
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const reflections = useRef<(THREE.Mesh | null)[]>([]);
  const textures = useMemo(() => cards.map(makePoster), [cards]);
  const reflectionTextures = useMemo(() => cards.map(makeReflection), [cards]);
  const n = cards.length;
  const CARD_H = 2.06;

  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose());
      reflectionTextures.forEach((t) => t.dispose());
    },
    [textures, reflectionTextures],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const s = ctrl.current;

    if (s.target != null) {
      s.active += (s.target - s.active) * (1 - Math.exp(-9 * dt));
      if (Math.abs(s.target - s.active) < 0.001) {
        s.active = s.target;
        s.target = null;
      }
    } else if (!s.dragging) {
      if (Math.abs(s.vel) > 0.02) {
        s.active += s.vel * dt;
        s.vel *= Math.pow(0.9, dt * 60);
      } else if (autoRotate) {
        s.active += 0.12 * dt;
      } else {
        const nearest = Math.round(s.active);
        s.active += (nearest - s.active) * (1 - Math.exp(-9 * dt));
      }
    }

    for (let i = 0; i < n; i++) {
      const mesh = meshes.current[i];
      if (!mesh) continue;
      const d = wrapDelta(i - s.active, n);
      const ad = Math.abs(d);
      const dir = Math.sign(d);
      const x = dir * (Math.min(ad, 1) * 1.32 + Math.max(0, ad - 1) * 0.66);
      const z = -Math.min(ad, 3.2) * 0.66;
      const ry = -dir * Math.min(ad, 1) * 0.62;
      const scale = Math.max(0.5, 1.16 - Math.min(ad, 1) * 0.3 - Math.max(0, ad - 1) * 0.05);
      const visible = ad < 4;
      const opacity = ad > 3 ? Math.max(0, 1 - (ad - 3)) : 1;

      mesh.position.set(x, 0, z);
      mesh.rotation.y = ry;
      mesh.scale.setScalar(scale);
      mesh.visible = visible;
      mesh.renderOrder = Math.round(20 - ad * 4);
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;

      const refl = reflections.current[i];
      if (refl) {
        // sits directly beneath the card, mirrored, and fades out
        refl.position.set(x, -CARD_H * scale - 0.03, z);
        refl.rotation.y = ry;
        refl.scale.setScalar(scale);
        refl.visible = visible;
        refl.renderOrder = Math.round(9 - ad * 4);
        (refl.material as THREE.MeshBasicMaterial).opacity = opacity * 0.5;
      }
    }
  });

  return (
    <group position={[0, 0.62, 0]}>
      {cards.map((card, i) => (
        <group key={card.media.id}>
          <mesh ref={(el) => { meshes.current[i] = el; }}>
            <planeGeometry args={[1.16, CARD_H]} />
            <meshBasicMaterial map={textures[i]} transparent depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh ref={(el) => { reflections.current[i] = el; }}>
            <planeGeometry args={[1.16, CARD_H]} />
            <meshBasicMaterial map={reflectionTextures[i]} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ---- public component -------------------------------------------------------

export default function ReelsCarousel3D({ cards, onOpen }: { cards: ReelCardData[]; onOpen?: (index: number) => void }) {
  const ctrl = useRef<Ctrl>({ active: 0, vel: 0, target: null, dragging: false, lastX: 0 });
  const autoRotate = useRef(true);
  const gesture = useRef({ x: 0, y: 0, moved: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    autoRotate.current = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const onDown = (e: React.PointerEvent) => {
    const s = ctrl.current;
    s.dragging = true;
    s.lastX = e.clientX;
    s.vel = 0;
    s.target = null;
    gesture.current = { x: e.clientX, y: e.clientY, moved: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = ctrl.current;
    if (!s.dragging) return;
    const dx = e.clientX - s.lastX;
    s.lastX = e.clientX;
    s.active -= dx * 0.006;
    s.vel = -dx * 0.36;
    gesture.current.moved += Math.abs(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = ctrl.current;
    // only treat as a tap-to-open if a real press started here (not a hover/leave)
    const wasPressed = s.dragging;
    s.dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
    if (wasPressed && onOpen && gesture.current.moved < 6) {
      const n = cards.length;
      const idx = ((Math.round(s.active) % n) + n) % n;
      s.vel = 0;
      s.target = Math.round(s.active);
      onOpen(idx);
    }
  };
  // leaving the area should just cancel the drag, never open a reel
  const onLeave = (e: React.PointerEvent) => {
    const s = ctrl.current;
    s.dragging = false;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  const step = (dir: number) => {
    const s = ctrl.current;
    s.vel = 0;
    s.target = Math.round(s.active) + dir;
  };

  return (
    <div className="group relative h-[380px] w-full sm:h-[420px]">
      <div
        className="absolute inset-0 cursor-grab touch-none select-none active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onLeave}
      >
        <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 5.2], fov: 45 }} gl={{ antialias: true, alpha: true }} style={{ background: "transparent" }}>
          <ambientLight intensity={1} />
          <Deck cards={cards} ctrl={ctrl} autoRotate={autoRotate.current} />
        </Canvas>
      </div>

      <button
        type="button"
        aria-label="Previous reel"
        onClick={() => step(-1)}
        className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/70 p-2 text-slate-700 shadow-md ring-1 ring-slate-900/5 backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next reel"
        onClick={() => step(1)}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/70 p-2 text-slate-700 shadow-md ring-1 ring-slate-900/5 backdrop-blur transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
