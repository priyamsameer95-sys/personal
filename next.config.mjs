/** @type {import('next').NextConfig} */
const nextConfig = {
  // PDF.js resolves its worker and native support relative to the package.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  },
  async headers() {
    const privateHeaders = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
    ];
    return [{ source: '/minforyam/:path*', headers: privateHeaders }, { source: '/api/admin/:path*', headers: privateHeaders }, {
      source: '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf',
      headers: [
        { key: 'X-Robots-Tag', value: 'noindex' },
        { key: 'Content-Disposition', value: 'attachment; filename="Priyam_Sameer_CV.pdf"' },
      ],
    }];
  },
};

export default nextConfig;
