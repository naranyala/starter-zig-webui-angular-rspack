#!/usr/bin/env bash
# ==============================================================================
# Zig WebUI Angular Rspack - Build and Run Pipeline
# ==============================================================================
# This script handles the complete build pipeline:
# 1. Build the Angular frontend using Rspack
# 2. Build the Zig backend with WebUI integration
# 3. Launch the desktop application window
#
# Usage:
#   ./run.sh              # Build and run in release mode
#   ./run.sh dev          # Build and run in debug/dev mode
#   ./run.sh --debug      # Same as dev
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Project directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
ZIG_PROJECT_DIR="${SCRIPT_DIR}"

# Build configuration
BUILD_TYPE="${BUILD_TYPE:-release}"  # debug or release
FRONTEND_BUILD="${FRONTEND_BUILD:-true}"  # Build frontend by default
ZIG_BUILD="${ZIG_BUILD:-true}"  # Build Zig by default
RUN_APP="${RUN_APP:-true}"  # Run app by default
CLEAN="${CLEAN:-false}"  # Clean before build
WATCH="${WATCH:-false}"  # Watch mode for development

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "${CYAN}==>${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $(printf "%-61s" "$1") ${BLUE}║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_banner() {
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║     Zig WebUI Angular Rspack - Desktop App            ║"
    echo "  ║     Native Desktop Application with WebUI             ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        log_error "$1 is not installed or not in PATH"
        exit 1
    fi
}

# ==============================================================================
# Build Steps
# ==============================================================================

step_check_dependencies() {
    print_header "Checking Dependencies"
    
    log_info "Checking for required tools..."
    
    # Check Zig
    if check_command zig; then
        ZIG_VERSION=$(zig version)
        log_success "Zig found: v${ZIG_VERSION}"
    fi
    
    # Check Bun (for frontend)
    if [ "$FRONTEND_BUILD" = true ]; then
        if check_command bun; then
            BUN_VERSION=$(bun --version)
            log_success "Bun found: v${BUN_VERSION}"
        fi
    fi
    
    log_success "All dependencies checked"
}

step_clean() {
    if [ "$CLEAN" = false ]; then
        return
    fi
    
    print_header "Cleaning Build Artifacts"
    
    log_info "Cleaning Zig build cache..."
    rm -rf "${ZIG_PROJECT_DIR}/zig-out"
    rm -rf "${ZIG_PROJECT_DIR}/.zig-cache"
    
    log_info "Cleaning frontend build..."
    rm -rf "${FRONTEND_DIR}/dist"
    rm -rf "${FRONTEND_DIR}/.rspack_cache"
    
    log_success "Clean completed"
}

step_build_frontend() {
    if [ "$FRONTEND_BUILD" = false ]; then
        log_warning "Skipping frontend build (FRONTEND_BUILD=false)"
        return
    fi

    print_header "Step 1: Building Frontend"

    cd "${FRONTEND_DIR}"

    log_step "Installing frontend dependencies..."
    bun install --frozen-lockfile

    log_step "Building Angular app with Rspack..."

    # Set build type
    if [ "$BUILD_TYPE" = "debug" ]; then
        export BUILD_TYPE=debug
        log_info "Building in DEBUG mode (with source maps)"
    else
        unset BUILD_TYPE
        log_info "Building in RELEASE mode (optimized)"
    fi

    # Build with Rspack
    bun run build:rspack

    # Verify build output
    if [ -d "${FRONTEND_DIR}/dist/browser" ]; then
        FILE_COUNT=$(find "${FRONTEND_DIR}/dist/browser" -type f | wc -l)
        log_success "Frontend built successfully (${FILE_COUNT} files)"
        log_info "Output: ${FRONTEND_DIR}/dist/browser"
    else
        log_error "Frontend build output not found"
        exit 1
    fi

    cd "${SCRIPT_DIR}"
}

step_build_zig() {
    if [ "$ZIG_BUILD" = false ]; then
        log_warning "Skipping Zig build (ZIG_BUILD=false)"
        return
    fi

    print_header "Step 2: Building Zig Backend"

    cd "${ZIG_PROJECT_DIR}"

    log_step "Building Zig executable (${BUILD_TYPE} mode)..."

    # Build with Zig
    if [ "$BUILD_TYPE" = "debug" ]; then
        zig build -Doptimize=Debug 2>&1
    else
        zig build -Doptimize=ReleaseFast 2>&1
    fi

    # Verify build output
    if [ -f "${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack" ]; then
        log_success "Zig backend built successfully"
        log_info "Output: ${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack"
        
        # Show binary info
        if command -v file &> /dev/null; then
            FILE_INFO=$(file "${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack")
            log_info "Binary: ${FILE_INFO}"
        fi
    else
        log_error "Zig build output not found"
        exit 1
    fi

    cd "${SCRIPT_DIR}"
}

step_run_app() {
    if [ "$RUN_APP" = false ]; then
        log_warning "Skipping app run (RUN_APP=false)"
        return
    fi

    print_header "Step 3: Launching Desktop Application"

    cd "${ZIG_PROJECT_DIR}"

    APP_BINARY="${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack"
    
    if [ ! -f "$APP_BINARY" ]; then
        log_error "Application binary not found. Build failed."
        exit 1
    fi

    log_step "Starting Zig WebUI Angular Rspack desktop app..."
    log_info "Communication: WebUI WebSocket Bridge (NO HTTP/HTTPS)"
    log_info "Working directory: ${ZIG_PROJECT_DIR}"
    echo ""
    
    # Run the application (this will open the desktop window)
    "$APP_BINARY" "$@"
}

step_show_help() {
    print_banner
    print_header "Zig WebUI Angular Rspack - Build Pipeline"

    echo "Usage: ./run.sh [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  (no command)          Build and run in release mode"
    echo "  dev                   Build and run in debug/dev mode"
    echo ""
    echo "Options:"
    echo "  --help, -h            Show this help message"
    echo "  --clean               Clean build artifacts before building"
    echo "  --debug               Build in debug mode (same as 'dev')"
    echo "  --no-frontend         Skip frontend build"
    echo "  --no-zig              Skip Zig build"
    echo "  --no-run              Build only, don't launch the app"
    echo "  --build-only          Same as --no-run"
    echo ""
    echo "Environment Variables:"
    echo "  BUILD_TYPE=debug|release    Set build type"
    echo "  FRONTEND_BUILD=true|false   Enable/disable frontend build"
    echo "  ZIG_BUILD=true|false        Enable/disable Zig build"
    echo "  RUN_APP=true|false          Enable/disable running the app"
    echo "  CLEAN=true|false            Clean before build"
    echo ""
    echo "Examples:"
    echo "  ./run.sh                    # Build and launch desktop app (release)"
    echo "  ./run.sh dev                # Build and launch desktop app (debug)"
    echo "  ./run.sh --clean --debug    # Clean build in debug mode"
    echo "  ./run.sh --no-run           # Build only, don't launch"
    echo "  ./run.sh dev --clean        # Clean debug build and run"
    echo "  BUILD_TYPE=debug ./run.sh   # Debug build using env var"
    echo ""
    echo "Output:"
    echo "  Frontend:  frontend/dist/browser/"
    echo "  Backend:   zig-out/bin/zig_webui_angular_rspack"
    echo ""
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    # Check for 'dev' command as first argument
    if [ "${1:-}" = "dev" ]; then
        BUILD_TYPE=debug
        shift
    fi

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --help|-h)
                step_show_help
                exit 0
                ;;
            --clean)
                CLEAN=true
                shift
                ;;
            --debug)
                BUILD_TYPE=debug
                shift
                ;;
            --no-frontend)
                FRONTEND_BUILD=false
                shift
                ;;
            --no-zig)
                ZIG_BUILD=false
                shift
                ;;
            --no-run|--build-only)
                RUN_APP=false
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
                ;;
        esac
    done

    # Print banner and build configuration
    print_banner
    print_header "Build Configuration"
    echo "  Build Type:      ${BUILD_TYPE}"
    echo "  Clean:           ${CLEAN}"
    echo "  Build Frontend:  ${FRONTEND_BUILD}"
    echo "  Build Zig:       ${ZIG_BUILD}"
    echo "  Launch App:      ${RUN_APP}"
    echo ""

    # Execute build pipeline
    step_check_dependencies
    step_clean
    step_build_frontend
    step_build_zig
    step_run_app "$@"

    if [ "$RUN_APP" = true ]; then
        print_header "Application Running"
        log_success "Desktop window should now be visible"
        log_info "Press Ctrl+C in this terminal to stop the app"
    else
        print_header "Build Pipeline Complete"
        log_success "Build completed successfully!"
        log_info "Run './run.sh' to launch the application"
    fi
}

# Run main function
main "$@"
