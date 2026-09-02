/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  webpack(config, { dev }) {
    if (dev && process.env.MIOS_DISABLE_WEBPACK_CACHE === "true") {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
