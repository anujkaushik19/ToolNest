import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { AuroraBackground } from "@/components/AuroraBackground";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ToolShell } from "@/components/ToolShell";
import { ImageCompressor } from "@/components/tools/ImageCompressor";
import { ImageConvert } from "@/components/tools/ImageConvert";
import { ImagesToPdf } from "@/components/tools/ImagesToPdf";
import { PdfMerge } from "@/components/tools/PdfMerge";
import { PdfSplit } from "@/components/tools/PdfSplit";
import EditPdf from "@/components/tools/EditPdf";
import { PdfToImages } from "@/components/tools/PdfToImages";
import { QrCode } from "@/components/tools/QrCode";
import { WordToPdf } from "@/components/tools/WordToPdf";
import { PdfToWord } from "@/components/tools/PdfToWord";
import { RemoveBackground } from "@/components/tools/RemoveBackground";
import { CompressPdf } from "@/components/tools/CompressPdf";
import { SignPdf } from "@/components/tools/SignPdf";
import { ProtectPdf, UnlockPdf } from "@/components/tools/PdfPassword";
import { CompressVideo } from "@/components/tools/CompressVideo";
import { VideoToGif } from "@/components/tools/VideoToGif";
import { TrimVideo } from "@/components/tools/TrimVideo";
import { ExtractAudio } from "@/components/tools/ExtractAudio";
import { JsonFormatter } from "@/components/tools/JsonFormatter";
import { Base64Tool } from "@/components/tools/Base64Tool";
import { JwtDecoder } from "@/components/tools/JwtDecoder";
import { UuidGenerator } from "@/components/tools/UuidGenerator";
import { HashGenerator } from "@/components/tools/HashGenerator";
import { RegexTester } from "@/components/tools/RegexTester";
import { AspectRatioResizer } from "@/components/tools/AspectRatioResizer";
import { CarouselSplitter } from "@/components/tools/CarouselSplitter";
import { CaptionBurner } from "@/components/tools/CaptionBurner";
import { getToolBySlug, tools } from "@/lib/tools";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return tools.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({
  params,
}: {
  params: Params;
}): Metadata {
  const tool = getToolBySlug(params.slug);
  if (!tool) return { title: "Tool not found — Toolnest" };
  return {
    title: `${tool.name} — Toolnest`,
    description: tool.description,
  };
}

// Registry of live tool UIs keyed by slug.
const liveTools: Record<string, React.ComponentType> = {
  "compress-image": ImageCompressor,
  "convert-image": ImageConvert,
  "images-to-pdf": ImagesToPdf,
  "merge-pdf": PdfMerge,
  "split-pdf": PdfSplit,
  "edit-pdf": EditPdf,
  "pdf-to-images": PdfToImages,
  "qr-code": QrCode,
  "word-to-pdf": WordToPdf,
  "pdf-to-word": PdfToWord,
  "remove-background": RemoveBackground,
  "compress-pdf": CompressPdf,
  "sign-pdf": SignPdf,
  "protect-pdf": ProtectPdf,
  "unlock-pdf": UnlockPdf,
  "compress-video": CompressVideo,
  "video-to-gif": VideoToGif,
  "trim-video": TrimVideo,
  "extract-audio": ExtractAudio,
  "json-formatter": JsonFormatter,
  "base64": Base64Tool,
  "jwt-decoder": JwtDecoder,
  "uuid-generator": UuidGenerator,
  "hash-generator": HashGenerator,
  "regex-tester": RegexTester,
  "resize-for-instagram": AspectRatioResizer,
  "instagram-carousel-splitter": CarouselSplitter,
  "auto-caption-video": CaptionBurner,
};

export default function ToolPage({ params }: { params: Params }) {
  const tool = getToolBySlug(params.slug);
  if (!tool) notFound();

  const ToolUI = liveTools[tool.slug];

  return (
    <>
      <AuroraBackground />
      <Navbar />
      <main>
        <ToolShell tool={tool}>
          {ToolUI ? (
            <ToolUI />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl glass px-8 py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
                <Clock className="h-8 w-8 text-accent-cyan" />
              </div>
              <h2 className="mt-6 text-2xl font-bold">Coming soon</h2>
              <p className="mt-2 max-w-md text-foreground/55">
                We&apos;re polishing this tool to top-class quality. It&apos;ll
                land here shortly — meanwhile, try our live tools.
              </p>
              <Link
                href="/tools"
                className="mt-6 rounded-2xl bg-gradient-to-r from-brand-500 to-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
              >
                Browse live tools
              </Link>
            </div>
          )}
        </ToolShell>
      </main>
      <Footer />
    </>
  );
}
