/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ['pradojob.com', 'www.pradojob.com'],
    },
  },
};

module.exports = nextConfig;