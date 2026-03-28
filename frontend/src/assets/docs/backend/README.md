# Backend Documentation

The backend is built with C99 and features a custom dependency injection system inspired by Angular and stb libraries.

## Architecture Overview

```
src/
├── main.c              # Application entry point
├── app_module.h        # Service registration
├── di/                 # Dependency Injection System
│   ├── di.h            # Single header DI library
│   ├── di_impl.c       # DI implementation
│   └── README.md       # DI documentation
└── services/           # Application services (9 total)
```

## Service Layers

### Foundation Layer (no dependencies)

These services form the base of the application and have no dependencies on other services:

- **LoggerService** - Logging with timestamps and levels
- **EventService** - Pub/sub event bus for decoupled communication
- **FileService** - File system operations
- **TimerService** - Timing and scheduling utilities
- **JsonService** - JSON parsing and generation
- **HashService** - Cryptographic hashing (MD5, SHA1, SHA256, CRC32)

### Middle Layer (depends on foundation)

- **ConfigService** - Application configuration (depends on LoggerService)
- **HttpService** - HTTP client (depends on LoggerService)

### High-level Layer (depends on multiple services)

- **WebuiService** - WebUI window management (depends on LoggerService, ConfigService)

## Dependency Injection System

The backend uses an stb-style single-header DI system that provides:

- Type-safe service registration
- Singleton and transient scopes
- Constructor injection
- Service locator pattern
- Circular dependency detection

### Basic Usage

```c
// 1. Include the DI header
#include "di/di.h"

// 2. Inject a service
LoggerService* logger = logger_service_inject();

// 3. Use the service
logger_log(logger, "INFO", "Hello, World!");
```

### Service Registration

Services are registered in `app_module.h`:

```c
static inline int app_module_init(void) {
    DI_Container* container = DI_GetGlobalContainer();
    
    // Register foundation services first
    DI_Container_Register(container, "logger_service", 
        DI_SCOPE_SINGLETON, logger_service_provider, logger_service_destroy);
    
    // Register dependent services
    DI_Container_Register(container, "config_service",
        DI_SCOPE_SINGLETON, config_service_provider, config_service_destroy);
    
    // Freeze container
    container->frozen = 1;
    return 0;
}
```

## Service Documentation

Detailed documentation for each service:

| Service | Documentation |
|---------|---------------|
| LoggerService | [logger.md](services/logger.md) |
| ConfigService | [config.md](services/config.md) |
| EventService | [event.md](services/event.md) |
| FileService | [file.md](services/file.md) |
| TimerService | [timer.md](services/timer.md) |
| JsonService | [json.md](services/json.md) |
| HashService | [hash.md](services/hash.md) |
| HttpService | [http.md](services/http.md) |
| WebuiService | [webui.md](services/webui.md) |

## Build System

The backend is built using nob.h, a single-header C build library.

```bash
# Build only
./run.sh build

# Build and run
./run.sh dev

# Clean build
./run.sh clean
```

## Related Documentation

- [DI System Guide](di-system.md) - Detailed DI usage
- [src/di/README.md](../../src/di/README.md) - Technical DI documentation
- [../README.md](../README.md) - Project overview
