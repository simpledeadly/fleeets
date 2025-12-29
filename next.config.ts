import type { NextConfig } from 'next'
import path from 'node:path'

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
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb', // Ставим 10МБ, чтобы любая картинка пролезла
    },
  },
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  transpilePackages: ['lucide-react'],
  webpack: (config) => {
    return config
  },
}

export default nextConfig
