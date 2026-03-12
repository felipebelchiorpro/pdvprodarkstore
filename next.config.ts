/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'backpdv.darkstoresuplementos.com',
        pathname: '/api/files/**',
      },
    ],
  },
};

export default nextConfig;
