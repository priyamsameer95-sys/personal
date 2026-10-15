/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDF.js resolves its worker and native support relative to the package.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  },
  async headers() {
    return [{
      source: '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex' },
        { key: 'Content-Disposition', value: 'attachment; filename="Priyam_Sameer_CV.pdf"' },
      ],
    }];
  },
};

export default nextConfig;
