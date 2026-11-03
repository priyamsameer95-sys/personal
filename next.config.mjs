/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // PDF.js resolves its worker and native support relative to the package.
  serverExternalPackages: ['pdf-parse', 'pdfjs-dist', '@napi-rs/canvas'],
  async headers() {
    const publicHeaders = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'" },
      { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
    ];
    const privateHeaders = [
      { key: 'Cache-Control', value: 'no-store' },
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
    ];
    return [
      { source: '/:path*', headers: publicHeaders },
      { source: '/minforyam/:path*', headers: privateHeaders },
      { source: '/api/admin/:path*', headers: privateHeaders },
      {
        source: '/cv/Priyam_Sameer_Zero_to_One_Product_Manager_CV.pdf',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex' },
          { key: 'Content-Disposition', value: 'attachment; filename="Priyam_Sameer_CV.pdf"' },
        ],
      },
    ];
  },
};

export default nextConfig;
