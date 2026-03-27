# Angular Rspack Starter

A modern Angular 19 starter project configured with Rspack bundler and Bun runtime for improved build performance.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Configuration](#configuration)
- [Build System Comparison](#build-system-comparison)
- [Key Dependencies](#key-dependencies)
- [Code Quality](#code-quality)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This project provides a starter template for Angular applications using:

- **Angular 19.2** - Latest Angular framework with all modern features
- **Rspack 1.3.5** - Fast Rust-based bundler (webpack-compatible)
- **Bun 1.3** - Fast JavaScript runtime and package manager
- **Biome** - Fast linter and formatter written in Rust

The setup maintains compatibility with traditional Angular CLI builds while offering faster build times through Rspack and Bun.

## Prerequisites

- Node.js v18+ (or use Bun as runtime)
- Bun v1.3+ (recommended for package management and running scripts)
- npm or yarn (alternative package managers)

Install Bun if not already installed:

```bash
curl -fsSL https://bun.sh/install | bash
```

## Project Structure

```
├── src/
│   ├── app/              # Angular application components
│   ├── assets/           # Static assets
│   ├── favicon.ico
│   ├── index.html        # Main HTML template
│   ├── main.ts           # Application entry point
│   └── styles.css        # Global styles
├── angular.json          # Angular CLI configuration
├── rspack.config.js      # Rspack bundler configuration
├── bunfig.toml           # Bun runtime configuration
├── tsconfig.json         # TypeScript configuration
├── tsconfig.app.json     # TypeScript config for app
├── tsconfig.spec.json    # TypeScript config for tests
├── karma.conf.js         # Karma test runner configuration
├── biome.json            # Biome linter/formatter configuration
├── custom-webpack.config.js  # Custom webpack configuration
└── package.json          # Project dependencies and scripts
```

## Getting Started

### Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>
cd starter-angular-rspack
bun install
```

### Development Server

Start the development server with Rspack:

```bash
bun run dev
# or
bun run serve:rspack
```

The application will be available at `http://localhost:4200`.

### Production Build

Create a production build with Rspack:

```bash
bun run build:rspack
```

Output will be in the `dist/` directory.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run start` | Start Angular CLI dev server (webpack) |
| `bun run dev` | Start Rspack dev server with HMR |
| `bun run serve:rspack` | Start Rspack dev server |
| `bun run build` | Production build with Angular CLI |
| `bun run build:rspack` | Production build with Rspack |
| `bun run test` | Run unit tests with Karma |
| `bun run lint` | Check code with Biome |
| `bun run lint:fix` | Auto-fix linting issues with Biome |
| `bun run format` | Check formatting with Biome |
| `bun run format:fix` | Auto-fix formatting with Biome |
| `bun run e2e` | Run end-to-end tests |

## Configuration

### Rspack Configuration

The `rspack.config.js` file configures the Rspack bundler:

- Uses `esbuild-loader` for fast TypeScript compilation
- Configures `raw-loader` for HTML templates
- Processes CSS/SCSS with standard loaders
- Generates HTML with `html-rspack-plugin`
- Supports hot module replacement (HMR)

### Bun Configuration

The `bunfig.toml` file configures the Bun runtime:

- Defines script aliases
- Configures runtime behavior

### TypeScript Configuration

- `tsconfig.json` - Base TypeScript configuration for Angular 19
- `tsconfig.app.json` - Application-specific TypeScript settings
- `tsconfig.spec.json` - Test-specific TypeScript settings

### Angular CLI Configuration

The `angular.json` file maintains compatibility with traditional Angular CLI commands and webpack-based builds.

## Build System Comparison

### Rspack + Bun (Recommended for Development)

- Faster cold starts
- Faster incremental builds
- Lower memory usage
- Hot module replacement enabled

### Angular CLI + Webpack (Traditional)

- Full Angular CLI feature set
- More plugins and loaders available
- Better for complex custom configurations

## Key Dependencies

### Runtime Dependencies

- `@angular/*` (19.2.0) - Angular framework packages
- `rxjs` (7.8.x) - Reactive Extensions for JavaScript
- `zone.js` (0.15.x) - Zone.js for change detection
- `tslib` (2.6.x) - TypeScript runtime library
- `winbox` (0.2.x) - Window management library

### Development Dependencies

- `@rspack/core` (1.3.5) - Rspack bundler
- `@rspack/cli` (1.3.5) - Rspack CLI tools
- `@biomejs/biome` (2.4.2) - Linter and formatter
- `esbuild-loader` (4.4.2) - Fast TypeScript compilation
- `sass` (1.97.x) - SCSS/SASS preprocessor
- `karma` (6.4.x) - Test runner
- `jasmine` (5.1.x) - Testing framework

## Code Quality

### Linting

This project uses Biome for linting and formatting, which is significantly faster than ESLint and Prettier.

Check for linting issues:

```bash
bun run lint
```

Auto-fix issues:

```bash
bun run lint:fix
```

### Formatting

Check formatting:

```bash
bun run format
```

Auto-fix formatting:

```bash
bun run format:fix
```

Biome configuration is in `biome.json`.

## Troubleshooting

### Clean Installation

If you encounter dependency issues:

```bash
rm -rf node_modules bun.lock
bun install
```

### Clear Build Cache

If builds are failing:

```bash
rm -rf dist
bun run build:rspack
```

### Check Versions

Verify tool versions:

```bash
bun --version    # Should be 1.3+
node --version   # Should be v18+
```

### Rspack-Specific Issues

If Rspack build fails but webpack succeeds:

1. Check `rspack.config.js` for loader compatibility
2. Ensure all required loaders are installed
3. Compare with `angular.json` webpack configuration

### Performance Issues

For large bundle sizes:

1. Enable production mode in Angular
2. Implement lazy loading for routes
3. Analyze bundle with `bun run build:rspack --analyze`

## License

This project is provided as-is for educational and starter purposes.
