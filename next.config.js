/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // Disabled for Vercel deployment
  images: {
    remotePatterns: [
      // Local MinIO (development)
      { protocol: 'http', hostname: 'localhost', port: '9000' },
      // Production S3/R2 storage (configure via env or update these patterns)
      ...(process.env.S3_HOSTNAME
        ? [{ protocol: 'https', hostname: process.env.S3_HOSTNAME }]
        : []),
    ],
  },
};

module.exports = nextConfig;
