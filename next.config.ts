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
  transpilePackages: ['@/features', '@/lib'],
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname)
    return config
  },
}

export default nextConfig
