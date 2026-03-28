# Dependency Injection System Guide

The backend uses a custom stb-style single-header dependency injection system inspired by Angular's DI.

## Overview

The DI system provides:

- Type-safe service registration
- Singleton and transient scopes
- Constructor injection
- Service locator pattern
- Circular dependency detection
- Automatic cleanup

## Quick Start

### 1. Define a Service

In your header file:

```c
#ifndef MY_SERVICE_H
#define MY_SERVICE_H

#include "di/di.h"

typedef struct MyService {
    DI_Service base;
    // Your fields
    int value;
} MyService;

DI_DECLARE_SERVICE(MyService, my_service);

// Your methods
void my_service_do_something(MyService* self);

#endif
```

### 2. Implement the Service

In your source file:

```c
#include "my_service.h"

// Initialize (constructor)
DI_SERVICE_INIT(MyService, my_service) {
    self->value = 42;
    return DI_OK;
}

// Cleanup (destructor)
DI_SERVICE_CLEANUP(MyService, my_service) {
    // Cleanup resources
}

// Define the provider
DI_DEFINE_SERVICE(MyService, my_service)

// Your methods
void my_service_do_something(MyService* self) {
    // Implementation
}
```

### 3. Register the Service

In `app_module.h`:

```c
DI_Error err = DI_Container_Register(
    container,
    "my_service",
    DI_SCOPE_SINGLETON,
    my_service_provider,
    my_service_destroy
);
```

### 4. Use the Service

```c
MyService* my = my_service_inject();
my_service_do_something(my);
```

## Service Scopes

### Singleton (default)

Single instance for the entire application:

```c
DI_Container_Register(container, "my_service",
    DI_SCOPE_SINGLETON, my_service_provider, my_service_destroy);
```

### Transient

New instance each time:

```c
DI_Container_Register(container, "my_service",
    DI_SCOPE_TRANSIENT, my_service_provider, my_service_destroy);
```

## Injecting Dependencies

Services can depend on other services:

```c
typedef struct ConfigService {
    DI_Service base;
    LoggerService* logger;  // Dependency
} ConfigService;

DI_SERVICE_INIT(ConfigService, config_service) {
    // Inject dependency
    self->logger = logger_service_inject();
    if (!self->logger) {
        return DI_ERROR_INIT_FAILED;
    }
    
    // Use dependency
    logger_log(self->logger, "INFO", "ConfigService initialized");
    return DI_OK;
}
```

## Error Handling

The DI system returns error codes:

```c
typedef enum {
    DI_OK = 0,
    DI_ERROR_NOT_FOUND = -1,
    DI_ERROR_ALREADY_REGISTERED = -2,
    DI_ERROR_CIRCULAR_DEPENDENCY = -3,
    DI_ERROR_INIT_FAILED = -4,
    DI_ERROR_NULL_POINTER = -5,
    DI_ERROR_OUT_OF_MEMORY = -6,
} DI_Error;
```

Handle errors appropriately:

```c
DI_SERVICE_INIT(MyService, my_service) {
    self->dep = some_service_inject();
    if (!self->dep) {
        return DI_ERROR_INIT_FAILED;
    }
    return DI_OK;
}
```

## Service Lifecycle

1. **Registration** - Service provider registered with container
2. **Instantiation** - Service instance created when first requested
3. **Initialization** - `DI_SERVICE_INIT` called
4. **Usage** - Service used throughout application
5. **Cleanup** - `DI_SERVICE_CLEANUP` called on container destroy

## Best Practices

### 1. Keep Services Focused

Each service should have a single responsibility:

```c
// Good: Focused service
typedef struct LoggerService {
    DI_Service base;
    FILE* output;
} LoggerService;

// Bad: Too many responsibilities
typedef struct EverythingService {
    DI_Service base;
    // Logging, config, file I/O, networking...
} EverythingService;
```

### 2. Document Dependencies

Clearly document service dependencies:

```c
/**
 * ConfigService - Application configuration
 * 
 * Dependencies:
 * - LoggerService: For logging configuration changes
 */
typedef struct ConfigService {
    DI_Service base;
    LoggerService* logger;
} ConfigService;
```

### 3. Handle Missing Dependencies

Always check for NULL after injection:

```c
DI_SERVICE_INIT(MyService, my_service) {
    self->logger = logger_service_inject();
    if (!self->logger) {
        fprintf(stderr, "Failed to inject LoggerService\n");
        return DI_ERROR_INIT_FAILED;
    }
    return DI_OK;
}
```

### 4. Clean Up Resources

Implement cleanup for resources:

```c
DI_SERVICE_CLEANUP(FileService, file_service) {
    if (self->working_directory) {
        free(self->working_directory);
    }
}
```

## Advanced Usage

### Checking Service Availability

```c
if (DIHAS(my_service)) {
    MyService* my = my_service_inject();
    // Use service
}
```

### Custom Container

```c
DI_Container* container = (DI_Container*)calloc(1, sizeof(DI_Container));
DI_Container_Init(container);

// Register services...

DI_Container_Destroy(container);
free(container);
```

## Troubleshooting

### Circular Dependency

```
Error: Circular dependency detected
```

Solution: Restructure services to avoid circular references.

### Service Not Found

```
Error: Service not found
```

Solution: Ensure service is registered before use.

### Initialization Failed

```
Error: Service initialization failed
```

Solution: Check that all dependencies are available.

## Related Documentation

- [Backend Overview](README.md)
- [src/di/README.md](../../src/di/README.md)
- [Service Documentation](services/)
