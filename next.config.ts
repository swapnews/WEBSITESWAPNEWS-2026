import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  images: {
    // AVIF/WebP memangkas ukuran gambar 30-50% dibanding JPEG/PNG.
    formats: ["image/avif", "image/webp"],
    // Cache hasil optimasi gambar 30 hari agar tidak diproses ulang tiap request.
    minimumCacheTTL: 2592000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // lucide-react adalah barrel export; tanpa ini seluruh paket ikon ikut ter-bundle.
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [
      // PENTING: tidak ada aturan header global di sini.
      // Sebelumnya `source: "/:path*"` memasang `max-age=0, must-revalidate` ke
      // SEMUA URL termasuk /_next/static/*, sehingga JS/CSS/font tidak pernah
      // di-cache browser maupun CDN. Next.js sudah mengirim header caching yang
      // benar (immutable untuk aset ber-hash) selama kita tidak menimpanya.
      {
        source: "/panelswap",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/dashboard/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/member/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/profile/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "private, no-store, max-age=0, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
