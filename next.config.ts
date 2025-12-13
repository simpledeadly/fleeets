import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Set-Cookie',
          value:
            '__prerender_bypass=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        },
      ],
    },
  ],
}

export default nextConfig
