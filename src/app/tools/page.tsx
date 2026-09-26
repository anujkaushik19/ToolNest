import { Suspense } from "react";
import type { Metadata } from "next";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToolsExplorer } from "@/components/ToolsExplorer";

export const metadata: Metadata = {
  title: "All Tools — BizNest",
  description:
    "Browse every BizNest utility: PDF, image, document, video, audio, generators and text tools — all in one place.",
};

export default function ToolsPage() {
  return (
    <>
      <AuroraBackground />
      <Navbar />
      <main>
        <Suspense fallback={<div className="min-h-screen" />}>
          <ToolsExplorer />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
