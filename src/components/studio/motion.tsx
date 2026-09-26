"use client";

import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useInView,
  animate,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { compact } from "./ui";

const EASE = [0.22, 1, 0.36, 1] as const;
const TILT_SPRING = { stiffness: 170, damping: 20, mass: 0.6 };

/* ---------- 3D tilt card that follows the cursor ---------- */
export function TiltCard({
  children,
  className = "",
  max = 9,
  spotlight = "rgba(99,102,241,0.16)",
  glare = true,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
  spotlight?: string;
  glare?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(py, [0, 1], [max, -max]), TILT_SPRING);
  const rotateY = useSpring(useTransform(px, [0, 1], [-max, max]), TILT_SPRING);
  const sx = useTransform(px, (v) => `${v * 100}%`);
  const sy = useTransform(py, (v) => `${v * 100}%`);
  const spotBg = useMotionTemplate`radial-gradient(240px circle at ${sx} ${sy}, ${spotlight}, transparent 68%)`;
  const glareBg = useMotionTemplate`radial-gradient(180px circle at ${sx} ${sy}, rgba(255,255,255,0.55), transparent 60%)`;

  const glareOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => glareOpacity.set(1)}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
        glareOpacity.set(0);
      }}
      style={{
        rotateX,
        rotateY,
        transformPerspective: 1000,
        transformStyle: "preserve-3d",
      }}
      whileHover={{ z: 24 }}
      transition={{ type: "spring", ...TILT_SPRING }}
      className={`relative [backface-visibility:hidden] ${className}`}
    >
      {children}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: spotBg }}
      />
      {glare && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-overlay"
          style={{ background: glareBg, opacity: glareOpacity }}
        />
      )}
    </motion.div>
  );
}

/* ---------- Count-up number, fires when scrolled into view ---------- */
function fmtVal(v: number, format: "compact" | "int" | "pct1") {
  if (format === "compact") return compact(v);
  if (format === "pct1") return `${v >= 0 ? "" : ""}${v.toFixed(1)}%`;
  return Math.round(v).toLocaleString("en-US");
}

export function AnimatedNumber({
  value,
  format = "compact",
  className = "",
  prefix = "",
}: {
  value: number;
  format?: "compact" | "int" | "pct1";
  className?: string;
  prefix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const [text, setText] = useState(fmtVal(0, format));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, value, { duration: 1.2, ease: EASE });
    const unsub = mv.on("change", (v) => setText(fmtVal(v, format)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [inView, value, format, mv]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
    </span>
  );
}

/* ---------- Staggered entrance ---------- */
export function Stagger({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: delay } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 22, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}
