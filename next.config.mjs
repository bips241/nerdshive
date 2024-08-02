/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nerdshive-project-v13.s3.ap-south-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'https://lh3.googleusercontent.com'
      },
    ],
  },
  };

export default nextConfig;
