"use client";

import { BizProvider } from "@/lib/biz/store";

export default function BizLayout({ children }: { children: React.ReactNode }) {
  return <BizProvider>{children}</BizProvider>;
}
