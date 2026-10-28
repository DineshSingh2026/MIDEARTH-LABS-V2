/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: { unoptimized: true },
  devIndicators: { appIsrStatus: false, buildActivity: false },
};
export default nextConfig;
