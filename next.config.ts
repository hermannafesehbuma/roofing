import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Image uploads go through server actions, whose request body defaults to
      // 1MB — small enough that any photo off a phone fails before reaching the
      // action. Sits above the 10MB bucket cap (see lib/upload-limits.ts) so
      // oversized files are rejected with a real message, not a dropped request.
      bodySizeLimit: '12mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        // Supabase Storage — project images, avatars, documents
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
