/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Skip ESLint during `next build` (Vercel) — lint errors won't fail deploys.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
