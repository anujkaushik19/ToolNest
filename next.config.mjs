/** @type {import('next').NextConfig} */
const nextConfig = {
  // onnxruntime-web (via @imgly/background-removal) ships pre-minified .mjs that
  // uses import.meta.url. The SWC minifier rejects it with "'import.meta' cannot
  // be used outside of module code". Terser handles it correctly.
  swcMinify: false,
};

export default nextConfig;
