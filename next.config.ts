import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Sirve las imágenes tal cual (desde Supabase/public) sin pasar por el
    // optimizador de Vercel, cuya cuota del plan Hobby se agota (error 402).
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vprqrorbqguboekhfvon.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  reactCompiler: true,
};

export default nextConfig;
