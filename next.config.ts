/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['pradojob.com', 'www.pradojob.com'],
    },
  },
};

module.exports = nextConfig;