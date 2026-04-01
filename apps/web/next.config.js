const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@paper-market/core"],
  webpack: (config, { isServer }) => {
    return config;
  },
};

export default nextConfig;