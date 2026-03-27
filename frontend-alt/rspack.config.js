// ==============================================================================
// Rspack Configuration for Angular with Modern Optimizations
// ==============================================================================
// Features:
// - Tree shaking
// - Code splitting
// - Bundle analysis
// - Source maps
// - Performance optimizations
// ==============================================================================

const path = require('path');
const HtmlRspackPlugin = require('html-rspack-plugin');
const { rspack } = require('@rspack/core');

// Environment detection
const isDev = process.env.BUILD_TYPE === 'debug';
const isProd = !isDev;
const isCI = process.env.CI === 'true';

// Configuration
const config = {
  // Entry point
  entry: {
    main: './src/main.ts',
  },

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist/browser'),
    filename: isProd ? '[name].[contenthash].js' : '[name].js',
    chunkFilename: isProd ? '[name].[contenthash].chunk.js' : '[name].chunk.js',
    assetModuleFilename: 'assets/[hash][ext][query]',
    clean: true,
    publicPath: '/',
  },

  // Module resolution
  resolve: {
    extensions: ['.ts', '.js', '.mjs', '.json'],
    alias: {
      '@core': path.resolve(__dirname, 'src/core'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@environments': path.resolve(__dirname, 'src/environments'),
    },
  },

  // Module rules for loaders
  module: {
    rules: [
      // TypeScript with esbuild
      {
        test: /\.[cm]?ts$/,
        exclude: /[/\\](?:core-js|zone\.js|node_modules)[/\\]/,
        use: {
          loader: 'esbuild-loader',
          options: {
            target: 'es2022',
            format: 'esm',
            tsconfigRaw: {
              compilerOptions: {
                target: 'es2022',
                module: 'es2022',
                moduleResolution: 'bundler',
                experimentalDecorators: true,
                useDefineForClassFields: false,
                esModuleInterop: true,
                skipLibCheck: true,
                strict: true,
              },
            },
          },
        },
        type: 'javascript/auto',
      },

      // HTML templates
      {
        test: /\.html$/,
        oneOf: [
          {
            resourceQuery: /raw/,
            type: 'asset/source',
          },
          {
            use: 'raw-loader',
          },
        ],
      },

      // CSS styles
      {
        test: /\.css$/,
        oneOf: [
          {
            resourceQuery: /raw/,
            type: 'asset/source',
          },
          {
            use: [
              'style-loader',
              {
                loader: 'css-loader',
                options: {
                  importLoaders: 1,
                  modules: {
                    auto: true,
                    localIdentName: isDev
                      ? '[name]__[local]___[hash:base64:5]'
                      : '[hash:base64:5]',
                  },
                },
              },
            ],
          },
        ],
      },

      // SCSS/Sass styles
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 2,
            },
          },
          'sass-loader',
        ],
      },

      // Images
      {
        test: /\.(png|jpe?g|gif|svg|webp|avif)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8kb - inline smaller images
          },
        },
      },

      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[hash][ext][query]',
        },
      },

      // Icons
      {
        test: /\.ico$/,
        type: 'asset/resource',
        generator: {
          filename: '[name][ext]',
        },
      },
    ],
  },

  // Plugins
  plugins: [
    // HTML plugin
    new HtmlRspackPlugin({
      template: './src/index.html',
      scriptLoading: 'defer',
      inject: 'body',
      minify: isProd
        ? {
            collapseWhitespace: true,
            removeComments: true,
            removeRedundantAttributes: true,
            removeScriptTypeAttributes: true,
            removeStyleLinkTypeAttributes: true,
            useShortDoctype: true,
            minifyCSS: true,
            minifyJS: true,
          }
        : false,
    }),

    // Define global constants
    new rspack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isProd ? 'production' : 'development'),
      'process.env.CI': JSON.stringify(process.env.CI || 'false'),
    }),
  ],

  // Optimization settings
  optimization: {
    minimize: isProd,
    minimizer: [
      '...', // Use default minimizers
    ],
    splitChunks: isProd
      ? {
          chunks: 'all',
          minSize: 20 * 1024, // 20kb minimum
          maxSize: 244 * 1024, // 244kb maximum per chunk
          minChunks: 1,
          maxAsyncRequests: 30,
          maxInitialRequests: 30,
          enforceSizeThreshold: 50 * 1024,
          cacheGroups: {
            // Vendor chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 10,
            },
            // Angular core
            angular: {
              test: /[\\/]node_modules[\\/]@angular[\\/]/,
              name: 'angular',
              chunks: 'all',
              priority: 20,
            },
            // Zone.js
            zone: {
              test: /[\\/]node_modules[\\/]zone\.js[\\/]/,
              name: 'zone',
              chunks: 'all',
              priority: 30,
            },
            // Common code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 5,
              reuseExistingChunk: true,
            },
          },
        }
      : false,
    runtimeChunk: isProd ? 'single' : false,
    removeAvailableModules: isProd,
    removeEmptyChunks: isProd,
    mergeDuplicateChunks: isProd,
    flagIncludedChunks: isProd,
    sideEffects: isProd,
    providedExports: isProd,
    usedExports: isProd,
    concatenateModules: isProd,
  },

  // Performance hints
  performance: {
    hints: isProd ? 'warning' : false,
    maxEntrypointSize: 512 * 1024, // 512kb
    maxAssetSize: 512 * 1024, // 512kb
    assetFilter(assetFilename) {
      // Only analyze JS files
      return assetFilename.endsWith('.js');
    },
  },

  // Experiments
  experiments: {
    rspackFuture: {
      bundlerInfo: {
        force: false,
      },
    },
    // Enable top-level await
    topLevelAwait: true,
  },

  // Development server
  devServer: {
    port: 4200,
    host: 'localhost',
    hot: true,
    liveReload: true,
    historyApiFallback: true,
    compress: true,
    static: {
      directory: path.resolve(__dirname, 'src'),
      publicPath: '/',
      watch: {
        ignored: ['**/node_modules', '**/.git', '**/dist'],
      },
    },
    client: {
      logging: 'warn',
      progress: true,
      overlay: {
        errors: true,
        warnings: false,
      },
    },
  },

  // Stats output
  stats: {
    preset: isDev ? 'normal' : 'summary',
    children: false,
    modules: false,
    chunks: false,
    assets: true,
    colors: true,
    timings: true,
    builtAt: true,
    version: false,
  },

  // Infrastructure logging
  infrastructureLogging: {
    level: isDev ? 'info' : 'warn',
  },

  // Watch options
  watchOptions: {
    aggregateTimeout: 300,
    poll: undefined,
    ignored: [
      '**/node_modules',
      '**/.git',
      '**/dist',
      '**/*.test.ts',
      '**/*.spec.ts',
    ],
  },

  // Cache configuration
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.rspack_cache'),
    buildDependencies: {
      config: [__filename],
    },
  },
};

// Bundle analysis (optional)
if (process.env.ANALYZE === 'true') {
  const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
  config.plugins.push(
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'bundle-report.html',
      openAnalyzer: false,
    })
  );
}

module.exports = config;
