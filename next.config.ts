import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    /*
     * How long the client router may reuse a page segment it has already
     * fetched. The `dynamic` default is 0, meaning every return to a screen
     * refetched from the server and swapped the content out for the route's
     * loading boundary first — which is why revisiting an already-loaded page
     * flashed empty before the content came back.
     *
     * With a reuse window the router serves the cached segment instead: the
     * navigation commits immediately, no boundary is entered, and the content
     * is simply there. Portal data is refreshed by the server actions that
     * change it, so a couple of minutes of reuse costs nothing.
     */
    staleTimes: {
      dynamic: 180,
      static: 300,
    },
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
