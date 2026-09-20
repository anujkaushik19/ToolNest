/** @type {import('next').NextConfig} */
const nextConfig = {
  // onnxruntime-web (via @imgly/background-removal) ships pre-minified .mjs that
  // uses import.meta.url. The SWC minifier rejects it with "'import.meta' cannot
  // be used outside of module code". Terser handles it correctly.
  swcMinify: false,
  webpack: (config) => {
    // @xenova/transformers pulls in Node-only deps that must not be bundled for
    // the browser — it uses onnxruntime-web at runtime instead.
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
};

export default nextConfig;
