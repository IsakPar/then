/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for containerized deployments
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: ['localhost'],
  },
  
  // Environment variables that should be available at build time
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Exclude duplicate directories from build
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/lastminutelive/**'],
    }
    return config
  },
}

module.exports = nextConfig 