/** @type {import('next').NextConfig} */
import { fileURLToPath } from 'node:url';
const nextConfig = {
  turbopack: { root: fileURLToPath(new URL('.', import.meta.url)) },
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${process.env.API_SERVER_URL || 'http://127.0.0.1:5000'}/api/:path*` }];
  },
};

export default nextConfig;
