/** @type {import('next').NextConfig} */
const nextConfig = {
  skipTrailingSlashRedirect: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['pradojob.com', 'www.pradojob.com'],
    },
  },
  async redirects() {
    return [
      {
        source: '/:lng/management/:path*',
        destination: '/:lng/dashboard',
        permanent: false,
      },
      {
        source: '/:lng/management',
        destination: '/:lng/dashboard',
        permanent: false,
      },
      {
        source: '/management/:path*',
        destination: '/dashboard',
        permanent: false,
      },
      {
        source: '/management',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;