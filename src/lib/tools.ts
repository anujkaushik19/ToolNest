import {
  FileText,
  Image as ImageIcon,
  FileType2,
  Video,
  QrCode,
  Code2,
  type LucideIcon,
} from "lucide-react";

export type ToolStatus = "live" | "soon";

export type ToolCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
};

export type Tool = {
  slug: string;
  name: string;
  category: string; // category id
  description: string;
  status: ToolStatus;
};

export const categories: ToolCategory[] = [
  {
    id: "pdf",
    title: "PDF Tools",
    icon: FileText,
    gradient: "from-rose-500 to-orange-500",
    description: "Merge, split, compress, convert, sign and edit PDFs.",
  },
  {
    id: "image",
    title: "Image Tools",
    icon: ImageIcon,
    gradient: "from-emerald-500 to-teal-500",
    description: "Compress, convert, resize and enhance images with AI.",
  },
  {
    id: "document",
    title: "Document Tools",
    icon: FileType2,
    gradient: "from-blue-500 to-indigo-500",
    description: "Word, Excel & PowerPoint conversion and cleanup.",
  },
  {
    id: "media",
    title: "Video & Audio",
    icon: Video,
    gradient: "from-fuchsia-500 to-purple-500",
    description: "Compress, trim, convert and caption media files.",
  },
  {
    id: "generators",
    title: "Generators",
    icon: QrCode,
    gradient: "from-amber-500 to-yellow-500",
    description: "QR codes, barcodes, passwords and hashes in a click.",
  },
  {
    id: "code",
    title: "Code",
    icon: Code2,
    gradient: "from-cyan-500 to-sky-500",
    description: "Format, decode, hash and generate — fast developer utilities, all in your browser.",
  },
];

export const tools: Tool[] = [
  // Image
  {
    slug: "compress-image",
    name: "Compress Image",
    category: "image",
    description:
      "Shrink JPG, PNG and WebP files with a live quality slider — right in your browser.",
    status: "live",
  },
  {
    slug: "convert-image",
    name: "Convert Image",
    category: "image",
    description: "Convert between JPG, PNG, WebP and more.",
    status: "live",
  },
  {
    slug: "resize-image",
    name: "Resize Image",
    category: "image",
    description: "Change image dimensions with aspect-ratio lock.",
    status: "soon",
  },
  {
    slug: "remove-background",
    name: "Remove Background",
    category: "image",
    description:
      "AI background removal in one click — unlimited, full-resolution, right in your browser.",
    status: "live",
  },
  // PDF
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    category: "pdf",
    description: "Combine multiple PDFs into one document.",
    status: "live",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    category: "pdf",
    description: "Extract or separate pages from a PDF.",
    status: "live",
  },
  {
    slug: "images-to-pdf",
    name: "Images to PDF",
    category: "pdf",
    description: "Turn JPG and PNG images into a single PDF — reorder as you like.",
    status: "live",
  },
  {
    slug: "edit-pdf",
    name: "Edit PDF",
    category: "pdf",
    description:
      "Add text, notes and drawings to your PDF, then export — all in your browser.",
    status: "live",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    category: "pdf",
    description: "Export every PDF page as a PNG or JPG — download individually or as a ZIP.",
    status: "live",
  },
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    category: "pdf",
    description: "Shrink PDF file size with adjustable quality — see the savings instantly.",
    status: "live",
  },
  {
    slug: "sign-pdf",
    name: "Sign PDF",
    category: "pdf",
    description: "Draw or type your signature and place it on any page — in your browser.",
    status: "live",
  },
  {
    slug: "protect-pdf",
    name: "Protect PDF",
    category: "pdf",
    description: "Add a password and 256-bit encryption to your PDF.",
    status: "live",
  },
  {
    slug: "unlock-pdf",
    name: "Unlock PDF",
    category: "pdf",
    description: "Remove a known password from a PDF you own.",
    status: "live",
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    category: "pdf",
    description: "Turn PDFs into editable Word documents.",
    status: "live",
  },
  // Document
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    category: "document",
    description: "Convert Word, Excel, PowerPoint & OpenDocument files to polished PDFs.",
    status: "live",
  },
  {
    slug: "merge-word",
    name: "Merge Word Docs",
    category: "document",
    description: "Combine several Word files into one.",
    status: "soon",
  },
  // Media
  {
    slug: "compress-video",
    name: "Compress Video",
    category: "media",
    description: "Shrink MP4, MOV & WebM files with adjustable quality — right in your browser.",
    status: "live",
  },
  {
    slug: "video-to-gif",
    name: "Video to GIF",
    category: "media",
    description: "Turn a clip into a crisp, shareable GIF — pick the range, size and frame rate.",
    status: "live",
  },
  {
    slug: "trim-video",
    name: "Trim Video",
    category: "media",
    description: "Cut a clip out of any video instantly — no re-encoding, no quality loss.",
    status: "live",
  },
  {
    slug: "extract-audio",
    name: "Extract Audio",
    category: "media",
    description: "Pull the soundtrack out of any video as MP3, M4A or WAV — in your browser.",
    status: "live",
  },
  // Generators
  {
    slug: "qr-code",
    name: "QR Code Generator",
    category: "generators",
    description: "Create custom QR codes instantly.",
    status: "live",
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    category: "generators",
    description: "Generate strong, secure passwords.",
    status: "soon",
  },
  // Code
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    category: "code",
    description: "Beautify, minify and validate JSON with instant error highlighting.",
    status: "live",
  },
  {
    slug: "base64",
    name: "Base64 Encode / Decode",
    category: "code",
    description: "Convert text to and from Base64 — with URL-safe and file support.",
    status: "live",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    category: "code",
    description: "Decode and inspect a JSON Web Token's header, payload and expiry — locally.",
    status: "live",
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    category: "code",
    description: "Generate v4 UUIDs and ULIDs in bulk — copy one or a whole batch.",
    status: "live",
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    category: "code",
    description: "Compute MD5, SHA-1, SHA-256 and SHA-512 for text — in your browser.",
    status: "live",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    category: "code",
    description: "Test regular expressions live with match highlighting and groups.",
    status: "live",
  },
];

export function getToolsByCategory(categoryId: string): Tool[] {
  return tools.filter((t) => t.category === categoryId);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getCategory(id: string): ToolCategory | undefined {
  return categories.find((c) => c.id === id);
}

export const stats = [
  { value: "120+", label: "Tools" },
  { value: "8M+", label: "Files processed" },
  { value: "190", label: "Countries" },
  { value: "4.9\u2605", label: "User rating" },
];
