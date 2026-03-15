const createNextIntlPlugin = require('next-intl/plugin');

// Point to our custom request file
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const isStandaloneBuild = process.env.NEXT_OUTPUT_STANDALONE === 'true';

const normalizeBackendBaseUrl = (value) => {
  const raw = (value || '').trim();
  if (!raw) return 'http://127.0.0.1:8080';

  // Accept both base URL and full GraphQL endpoint in env.
  // Example: https://api.example.com OR https://api.example.com/graphql
  return raw.replace(/\/graphql\/?$/, '').replace(/\/$/, '');
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Disable x-powered-by header for security
  poweredByHeader: false,

  // Image remote patterns for external images
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'https',
        hostname: 'agrinova.com',
      },
      {
        protocol: 'https',
        hostname: 'agrinova.kskgroup.web.id',
      },
      {
        protocol: 'https',
        hostname: 'api.kskgroup.web.id',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
    formats: ['image/webp', 'image/avif'],
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },

  // Rewrites for proxying to backend
  async rewrites() {
    const backendBaseUrl = normalizeBackendBaseUrl(process.env.BACKEND_GRAPHQL_URL);

    return [
      // GraphQL API proxy
      {
        source: '/api/graphql',
        destination: `${backendBaseUrl}/graphql`,
      },
      // GraphQL Subscriptions WebSocket proxy (this will be handled client-side)
      // Note: WebSocket connections cannot be proxied through rewrites
      {
        source: '/api/graphql/:path*',
        destination: `${backendBaseUrl}/graphql/:path*`,
      },
      // Vehicle tax document upload proxy
      {
        source: '/api/vehicle-tax-documents/:path*',
        destination: `${backendBaseUrl}/vehicle-tax-documents/:path*`,
      },
      // Profile avatar upload proxy
      {
        source: '/api/profile/avatar/:path*',
        destination: `${backendBaseUrl}/profile/avatar/:path*`,
      },
      // Uploads proxy
      {
        source: '/uploads/:path*',
        destination: `${backendBaseUrl}/uploads/:path*`,
      },
    ];
  },

  // Turbopack configuration (Next.js 15.5+)
  turbopack: {
    rules: {
      // SVG loader for Turbopack
      '*.svg': ['@svgr/webpack'],
    },
    resolveAlias: {
      // Resolve alias untuk Turbopack
      '@': './',
    },
  },

  // Experimental features
  experimental: {
    // Optimize for Turbopack
    optimizeCss: true,
  },

  // Server external packages (removed @prisma/client as it's not used in frontend)
  serverExternalPackages: [],

  // Webpack fallback (for production builds if needed)
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Bundle analyzer
    if (process.env.ANALYZE) {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
        })
      );
    }

    // Handle SVG imports
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Typescript configuration
  typescript: {
    // Ignore type errors during build (for development)
    ignoreBuildErrors: false,
  },

  // Optional standalone output for no-source production artifact deployment.
  output: isStandaloneBuild ? 'standalone' : undefined,

  // Workspace root for file tracing
  outputFileTracingRoot: require('path').join(__dirname, '../../'),

  // Compression
  compress: true,

  // Generate ETags for caching
  generateEtags: true,

  // Development indicators
  devIndicators: {
    position: 'bottom-right',
  },

  // Production source maps
  productionBrowserSourceMaps: false,



  // Modularize imports for better tree shaking
  // DISABLED: Causing Turbopack compilation issues with lucide-react
  // modularizeImports: {
  //   'lucide-react': {
  //     transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
  //     preventFullImport: true,
  //   },
  //   '@heroicons/react/24/outline': {
  //     transform: '@heroicons/react/24/outline/{{ member }}',
  //     preventFullImport: true,
  //   },
  //   '@heroicons/react/24/solid': {
  //     transform: '@heroicons/react/24/solid/{{ member }}',
  //     preventFullImport: true,
  //   },
  // },
};

module.exports = withNextIntl(nextConfig);
