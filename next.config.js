/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['avatars.githubusercontent.com', 'avatar.vercel.sh']
  },
  experimental: {
    serverComponentsExternalPackages: ['@tremor/react'],
    serverActions: true
  },
  async headers() {
    return [
      {
        source: '/(.*)',  // Apply to all routes
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "form-action 'self' https://admin.frynetworks.com/api/auth/signin/github;"
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
