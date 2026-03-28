# Project Documentation

This directory contains comprehensive documentation for the C + Angular WebUI desktop application.

## Documentation Index

### Getting Started

| Document | Description |
|----------|-------------|
| ../README.md | Project overview and quick start |
| ../run.sh | Build script commands |

### Backend Documentation

| Document | Description |
|----------|-------------|
| backend/README.md | Backend architecture and service registry |
| backend/di-system.md | Dependency injection system guide |
| backend/services/ | Individual service documentation |

#### Service Documentation

| Service | Document |
|---------|----------|
| Logger | backend/services/logger.md |
| Event | backend/services/event.md |
| File | backend/services/file.md |
| Timer | backend/services/timer.md |
| JSON | backend/services/json.md |
| Hash | backend/services/hash.md |
| Config | backend/services/config.md |
| HTTP | backend/services/http.md |
| SQLite | backend/services/sqlite.md |
| DuckDB | backend/services/duckdb.md |
| SQL Query Builder | backend/services/sql-query-builder.md |
| Auth | backend/services/auth.md |
| Error | backend/services/error.md |
| Updater | backend/services/updater.md |
| WebUI | backend/services/webui.md |
| CRUD API | backend/services/crud-api.md |

### Frontend Documentation

| Document | Description |
|----------|-------------|
| ../frontend/README.md | Frontend architecture |
| frontend/services/ | Service documentation |
| frontend/components/ | Component documentation |

### Database Documentation

| Document | Description |
|----------|-------------|
| DUCKDB_INTEGRATION.md | DuckDB setup and usage |
| DUCKDB_QUERY_BUILDER.md | Fluent query builder API |

### Testing Documentation

| Document | Description |
|----------|-------------|
| TESTING.md | Testing infrastructure overview |
| BACKEND_TESTING.md | Backend test suite guide |

### Enterprise Features

| Document | Description |
|----------|-------------|
| ENTERPRISE_READINESS_AUDIT.md | Enterprise readiness checklist |
| IMPLEMENTATION_SUMMARY.md | Feature implementation details |
| REFACTORING_SUMMARY.md | Codebase refactoring history |

## Documentation Structure

```
docs/
|-- README.md                      # This file - Documentation index
|
|-- General Documentation
|-- BACKEND_TESTING.md           # Testing guide
|-- TESTING.md                  # Testing infrastructure
|-- DUCKDB_INTEGRATION.md       # DuckDB setup
|-- DUCKDB_QUERY_BUILDER.md     # Query builder API
|-- ENTERPRISE_READINESS_AUDIT.md
|-- IMPLEMENTATION_SUMMARY.md
|-- REFACTORING_SUMMARY.md
|
|-- backend/                     # Backend documentation
|   |-- README.md               # Backend overview
|   |-- di-system.md           # DI system guide
|   |-- services/               # Service documentation
|
|-- frontend/                    # Frontend documentation
    |-- README.md              # Frontend overview
    |-- angular-architecture.md
    |-- services/              # Service docs
    |-- components/            # Component docs
```

## Code Examples

### C (Backend)

```c
// Inject and use a service
LoggerService* logger = logger_service_inject();
logger_log(logger, "INFO", "Message: %s", value);

// Create database service
SQLiteService* db = sqlite_service_inject();
sqlite_open(db, "app.db");
```

### TypeScript (Frontend)

```typescript
// Inject and use a service
constructor(private api: ApiService) {}

// Call backend API
const users = await this.api.callOrThrow<User[]>('getUsers');
```

## Contributing to Documentation

1. Keep documentation close to the code it describes
2. Update documentation when changing functionality
3. Use clear, concise language without emojis
4. Include practical examples
5. Link to related documentation
6. Follow the naming convention: lowercase with hyphens

## Quick Reference

### Build Commands

```bash
./run.sh dev      # Build and run
./run.sh build    # Build only
./run.sh clean    # Clean artifacts
./run.sh test    # Run tests
```

### Service Dependencies

```
WebuiService -> ConfigService, LoggerService
    |
    +-> CRUD_API -> SQLiteService, LoggerService
    |
Enterprise Services -> LoggerService
    |
Foundation Services -> LoggerService
```

### Database Tables

| Table | Purpose |
|-------|---------|
| users | User accounts |
| categories | Product categories |
| products | Products with categories |
| orders | Customer orders |
| order_items | Order line items |
| schema_migrations | Migration tracking |
