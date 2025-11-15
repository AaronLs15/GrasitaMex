import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vprqrorbqguboekhfvon.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  /* config options here */
  reactCompiler: true,
};

export default nextConfig;
