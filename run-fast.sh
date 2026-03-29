#!/usr/bin/env bash
# ==============================================================================
# Zig WebUI Angular Rspack - Fast Development Pipeline
# ==============================================================================
# Features:
# - Parallel builds (frontend + backend simultaneously)
# - Incremental build detection (only rebuild what changed)
# - Watch mode for hot reload
# - Backend-only mode for fast iteration
# ==============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${SCRIPT_DIR}/frontend"
ZIG_PROJECT_DIR="${SCRIPT_DIR}"

# Configuration
BUILD_TYPE="${BUILD_TYPE:-debug}"
MODE="${MODE:-full}"         # full, backend-only, frontend-only
WATCH="${WATCH:-false}"
PARALLEL="${PARALLEL:-true}"
CLEAN="${CLEAN:-false}"

# Build state tracking
STATE_DIR="${SCRIPT_DIR}/.build-state"
FRONTEND_HASH_FILE="${STATE_DIR}/frontend-hash"
BACKEND_HASH_FILE="${STATE_DIR}/backend-hash"

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}==>${NC} $1"; }
log_watch() { echo -e "${MAGENTA}[WATCH]${NC} $1"; }

print_banner() {
    echo -e "${CYAN}"
    echo "  ╔═══════════════════════════════════════════════════════╗"
    echo "  ║     Zig WebUI Angular Rspack - Fast Dev Mode          ║"
    echo "  ╚═══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_config() {
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC} $(printf "%-61s" "Build Configuration") ${BLUE}║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "  Build Type:      ${BUILD_TYPE}"
    echo "  Mode:            ${MODE}"
    echo "  Parallel:        ${PARALLEL}"
    echo "  Watch:           ${WATCH}"
    echo "  Clean:           ${CLEAN}"
    echo ""
}

# ==============================================================================
# Build State Management (Incremental Builds)
# ==============================================================================

init_state() {
    mkdir -p "${STATE_DIR}"
}

get_directory_hash() {
    local dir="$1"
    find "$dir" -type f \( -name "*.ts" -o -name "*.html" -o -name "*.css" -o -name "*.scss" -o -name "*.json" \) ! -path "*/node_modules/*" ! -path "*/dist/*" -exec md5sum {} \; 2>/dev/null | sort | md5sum | cut -d' ' -f1
}

get_zig_hash() {
    local dir="$1"
    find "$dir" -type f \( -name "*.zig" -o -name "*.c" -o -name "*.h" \) ! -path "*/.zig-cache/*" ! -path "*/zig-out/*" -exec md5sum {} \; 2>/dev/null | sort | md5sum | cut -d' ' -f1
}

needs_rebuild() {
    local component="$1"
    local current_hash="$2"
    local hash_file="$3"
    
    if [ ! -f "$hash_file" ]; then
        return 0  # No previous hash, needs rebuild
    fi
    
    local previous_hash
    previous_hash=$(cat "$hash_file")
    
    if [ "$current_hash" != "$previous_hash" ]; then
        return 0  # Hash changed, needs rebuild
    fi
    
    return 1  # No rebuild needed
}

save_hash() {
    local hash="$1"
    local hash_file="$2"
    echo "$hash" > "$hash_file"
}

# ==============================================================================
# Build Functions
# ==============================================================================

build_frontend() {
    local start_time=$(date +%s)
    
    log_step "Building Frontend..."
    
    cd "${FRONTEND_DIR}"
    
    if [ "$BUILD_TYPE" = "debug" ]; then
        export BUILD_TYPE=debug
    else
        unset BUILD_TYPE
    fi
    
    bun run build 2>&1 | grep -E "(ERROR|SUCCESS|built|chunk)" || true
    
    cd "${SCRIPT_DIR}"
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ -d "${FRONTEND_DIR}/dist/browser" ]; then
        local file_count=$(find "${FRONTEND_DIR}/dist/browser" -type f | wc -l)
        log_success "Frontend built in ${duration}s (${file_count} files)"
        return 0
    else
        log_error "Frontend build failed"
        return 1
    fi
}

build_backend() {
    local start_time=$(date +%s)
    
    log_step "Building Zig Backend..."
    
    cd "${ZIG_PROJECT_DIR}"
    
    if [ "$BUILD_TYPE" = "debug" ]; then
        zig build -Doptimize=Debug 2>&1 | grep -E "(error|Error|SUCCESS|built)" || true
    else
        zig build -Doptimize=ReleaseFast 2>&1 | grep -E "(error|Error|SUCCESS|built)" || true
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ -f "${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack" ]; then
        log_success "Backend built in ${duration}s"
        return 0
    else
        log_error "Backend build failed"
        return 1
    fi
}

build_frontend_incremental() {
    local current_hash
    current_hash=$(get_directory_hash "${FRONTEND_DIR}/src")
    
    if needs_rebuild "frontend" "$current_hash" "${FRONTEND_HASH_FILE}"; then
        build_frontend
        save_hash "$current_hash" "${FRONTEND_HASH_FILE}"
    else
        log_info "Frontend unchanged, skipping build"
    fi
}

build_backend_incremental() {
    local current_hash
    current_hash=$(get_zig_hash "${ZIG_PROJECT_DIR}/src")
    
    if needs_rebuild "backend" "$current_hash" "${BACKEND_HASH_FILE}"; then
        build_backend
        save_hash "$current_hash" "${BACKEND_HASH_FILE}"
    else
        log_info "Backend unchanged, skipping build"
    fi
}

# ==============================================================================
# Watch Mode
# ==============================================================================

watch_frontend() {
    log_watch "Starting frontend watch mode..."
    
    cd "${FRONTEND_DIR}"
    
    if command -v bun &> /dev/null; then
        bun run rspack serve --watch 2>&1 | while read -r line; do
            echo -e "${MAGENTA}[Frontend]${NC} $line"
        done
    else
        log_error "Bun not found, cannot start watch mode"
        return 1
    fi
}

watch_backend() {
    log_watch "Starting backend watch mode..."
    
    cd "${ZIG_PROJECT_DIR}"
    
    # Zig 0.14+ supports --watch
    if zig version | grep -q "0.14"; then
        zig build --watch 2>&1 | while read -r line; do
            echo -e "${BLUE}[Backend]${NC} $line"
        done
    else
        # Fallback: manual watch with inotifywait
        if command -v inotifywait &> /dev/null; then
            log_info "Using inotifywait for file watching..."
            
            while true; do
                inotifywait -q -r -e modify,create,delete \
                    --exclude 'node_modules|.git|zig-out|.zig-cache' \
                    src/ thirdparty/ 2>/dev/null
                
                log_watch "Changes detected, rebuilding..."
                build_backend
            done
        else
            log_warning "inotifywait not found, using poll-based watch"
            
            while true; do
                sleep 2
                build_backend_incremental
            done
        fi
    fi
}

# ==============================================================================
# Backend-Only Mode (Fast Iteration)
# ==============================================================================

create_dev_stub() {
    local stub_dir="${FRONTEND_DIR}/dev-stub"
    mkdir -p "$stub_dir"
    
    cat > "${stub_dir}/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Backend Dev Mode</title>
    <style>
        body { font-family: system-ui; padding: 20px; background: #1a1a2e; color: #eee; }
        h1 { color: #94a3b8; }
        .card { background: #16213e; padding: 20px; border-radius: 8px; margin: 10px 0; }
        button { background: #0f3460; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        button:hover { background: #1a4a7a; }
        #output { background: #0f0f23; padding: 15px; border-radius: 4px; font-family: monospace; white-space: pre-wrap; margin-top: 10px; min-height: 200px; }
        .success { color: #4ade80; }
        .error { color: #f87171; }
    </style>
</head>
<body>
    <h1>🔧 Backend Development Mode</h1>
    
    <div class="card">
        <h3>Quick Tests</h3>
        <button onclick="testPing()">Ping Backend</button>
        <button onclick="testGetData()">Get Data</button>
        <button onclick="testGetUsers()">Get Users (SQLite)</button>
        <button onclick="clearOutput()">Clear</button>
    </div>
    
    <div class="card">
        <h3>Output</h3>
        <div id="output">Click a button to test backend functions...</div>
    </div>
    
    <script>
        const output = document.getElementById('output');
        
        function log(message, type = 'info') {
            const timestamp = new Date().toLocaleTimeString();
            const className = type === 'error' ? 'error' : type === 'success' ? 'success' : '';
            output.innerHTML += `\n<span class="${className}">[${timestamp}] ${message}</span>`;
            output.scrollTop = output.scrollHeight;
        }
        
        function clearOutput() {
            output.innerHTML = 'Output cleared';
        }
        
        async function testPing() {
            try {
                log('Calling ping()...');
                const result = await window.ping();
                log('Ping response: ' + JSON.stringify(result), 'success');
            } catch (err) {
                log('Ping failed: ' + err.message, 'error');
            }
        }
        
        async function testGetData() {
            try {
                log('Calling getData()...');
                const result = await window.getData();
                log('GetData response: ' + JSON.stringify(result), 'success');
            } catch (err) {
                log('GetData failed: ' + err.message, 'error');
            }
        }
        
        async function testGetUsers() {
            try {
                log('Calling getUsers()...');
                const result = await window.getUsers();
                log('GetUsers response: ' + JSON.stringify(result, null, 2), 'success');
            } catch (err) {
                log('GetUsers failed: ' + err.message, 'error');
            }
        }
        
        // Auto-detect WebUI availability
        window.addEventListener('DOMContentLoaded', () => {
            if (typeof window.webui !== 'undefined') {
                log('✓ WebUI bridge available', 'success');
            } else {
                log('⚠ WebUI bridge not detected - backend may not be ready', 'error');
            }
        });
    </script>
</body>
</html>
EOF

    log_success "Dev stub created at ${stub_dir}"
}

build_backend_only() {
    log_info "Using backend-only mode (dev stub frontend)"
    
    create_dev_stub
    
    # Set frontend path to stub
    export FRONTEND_PATH="${FRONTEND_DIR}/dev-stub"
    
    # Build only backend
    build_backend
    
    # Run with stub
    run_app
}

# ==============================================================================
# Run Application
# ==============================================================================

run_app() {
    log_step "Starting application..."
    
    local binary="${ZIG_PROJECT_DIR}/zig-out/bin/zig_webui_angular_rspack"
    
    if [ ! -f "$binary" ]; then
        log_error "Binary not found: $binary"
        return 1
    fi
    
    log_info "Running: $binary"
    log_info "Press Ctrl+C to stop"
    echo ""
    
    "$binary" "$@"
}

# ==============================================================================
# Main
# ==============================================================================

main() {
    print_banner
    print_config
    
    init_state
    
    # Clean if requested
    if [ "$CLEAN" = "true" ]; then
        log_step "Cleaning build artifacts..."
        rm -rf "${ZIG_PROJECT_DIR}/zig-out"
        rm -rf "${ZIG_PROJECT_DIR}/.zig-cache"
        rm -rf "${FRONTEND_DIR}/dist"
        rm -rf "${FRONTEND_DIR}/.rspack_cache"
        rm -rf "${STATE_DIR}"
        log_success "Clean complete"
    fi
    
    # Backend-only mode
    if [ "$MODE" = "backend-only" ]; then
        build_backend_only "$@"
        return
    fi
    
    # Frontend-only mode
    if [ "$MODE" = "frontend-only" ]; then
        build_frontend
        return
    fi
    
    # Full build
    if [ "$WATCH" = "true" ]; then
        # Watch mode: build once, then watch
        log_step "Initial build..."
        
        if [ "$PARALLEL" = "true" ]; then
            build_frontend &
            FRONTEND_PID=$!
            build_backend &
            BACKEND_PID=$!
            wait $FRONTEND_PID
            wait $BACKEND_PID
        else
            build_frontend
            build_backend
        fi
        
        log_success "Initial build complete, starting watch mode..."
        echo ""
        
        # Start both watchers
        watch_frontend &
        watch_backend
    else
        # Normal build
        if [ "$PARALLEL" = "true" ]; then
            log_info "Building in parallel mode..."
            build_frontend &
            FRONTEND_PID=$!
            build_backend &
            BACKEND_PID=$!
            
            # Wait for both
            local build_success=true
            wait $FRONTEND_PID || build_success=false
            wait $BACKEND_PID || build_success=false
            
            if [ "$build_success" = "true" ]; then
                run_app "$@"
            else
                log_error "Build failed"
                exit 1
            fi
        else
            build_frontend
            build_backend
            run_app "$@"
        fi
    fi
}

# ==============================================================================
# CLI Parsing
# ==============================================================================

while [[ $# -gt 0 ]]; do
    case $1 in
        dev)
            BUILD_TYPE=debug
            shift
            ;;
        watch)
            WATCH=true
            shift
            ;;
        backend-only)
            MODE=backend-only
            shift
            ;;
        frontend-only)
            MODE=frontend-only
            shift
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --no-parallel)
            PARALLEL=false
            shift
            ;;
        --clean)
            CLEAN=true
            shift
            ;;
        --help|-h)
            echo "Usage: ./run-fast.sh [OPTIONS]"
            echo ""
            echo "Modes:"
            echo "  dev              Debug mode with source maps"
            echo "  watch            Watch mode with auto-rebuild"
            echo "  backend-only     Skip Angular, use dev stub"
            echo "  frontend-only    Build frontend only"
            echo ""
            echo "Options:"
            echo "  --parallel       Build frontend+backend simultaneously (default)"
            echo "  --no-parallel    Build sequentially"
            echo "  --clean          Clean before build"
            echo "  --help           Show this help"
            echo ""
            echo "Examples:"
            echo "  ./run-fast.sh dev              # Debug build"
            echo "  ./run-fast.sh watch            # Watch mode"
            echo "  ./run-fast.sh backend-only     # Fast backend iteration"
            echo "  ./run-fast.sh --clean dev      # Clean debug build"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

main "$@"
