const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@paper-market/core"],
  webpack: (config, { isServer: _isServer }) => {
    return config;
  },
};

export default nextConfig;
