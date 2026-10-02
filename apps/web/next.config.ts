import type { NextConfig } from 'next';
const config: NextConfig = {
  experimental: { cpus: 2, proxyClientMaxBodySize: '22mb' },
  async headers() {
    return [{ source: '/atur-ulang-sandi', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'Cache-Control', value: 'private, no-store' }] }];
  },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_URL || 'http://127.0.0.1:3001'}/api/:path*` }];
  },
};
export default config;
