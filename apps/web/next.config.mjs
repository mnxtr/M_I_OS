import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  webpack(config, { dev }) {
    if (dev && process.env.MIOS_DISABLE_WEBPACK_CACHE === "true") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
