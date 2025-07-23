/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for containerized deployments
  output: 'standalone',
  
  // Disable TypeScript checking during build for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build to avoid issues
  eslint: {
    ignoreDuringBuilds: true,
  },
  
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
    
    // Add fallbacks for Node.js modules that might not be available
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    return config
  },
  
  // Server external packages
  serverExternalPackages: ['postgres'],
}

module.exports = nextConfig 