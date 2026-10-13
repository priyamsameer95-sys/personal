/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDF.js resolves its worker and native support relative to the package.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  },
};

export default nextConfig;
