"use client";

import { useEffect, useState } from "react";

const PRO_KEY = "toolnest_pro";

/**
 * Whether the current visitor has unlocked BizNest Pro.
 * Backed by a local license flag for now; a real license check can replace the
 * body without changing any caller. Always false during SSR to stay hydration-safe.
 */
export function useIsPro(): boolean {
  const [pro, setPro] = useState(false);
  useEffect(() => {
    try {
      setPro(localStorage.getItem(PRO_KEY) === "1");
    } catch {
      /* localStorage unavailable — treat as free */
    }
  }, []);
  return pro;
}
