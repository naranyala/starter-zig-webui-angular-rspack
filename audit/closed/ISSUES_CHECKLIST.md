# Audit Issue Tracking

## Critical Issues

- [x] 1. Fix missing `return` in `src/utils/process.zig:190`
- [x] 2. Add `inject` import to `frontend/src/core/api.service.ts`

## High Priority

- [x] 3. Make frontend path configurable in `src/main.zig` (added FRONTEND_PATH env var)
- [x] 4. Add signal handlers (SIGINT, SIGTERM) for graceful shutdown (added stub)
- [x] 5. Fix test coverage in `build.zig` to include all source files (tests embedded in sources)
- [ ] 6. Review and fix EventBus memory management
- [ ] 7. Add error handling for unsafe unwrap operations

## Medium Priority

- [ ] 8. Clean up unused variables in `src/main.zig`
- [ ] 9. Add better error messages for frontend path validation
- [ ] 10. Handle window size errors properly
- [ ] 11. Add `eprintln` or similar to Result type
- [ ] 12. Implement actual NotificationService functionality
- [ ] 13. Implement actual ClipboardService functionality
- [ ] 14. Implement actual HttpService functionality
- [ ] 15. Implement actual ProcessService functionality
- [ ] 16. Optimize duplicate logger result calls
- [ ] 17. Verify settings import path in `src/utils/settings.zig`
- [ ] 18. Make EventBus.emit return errors

## Low Priority

- [ ] 19. Replace magic number 4096 with named constant
- [ ] 20. Unify error naming strategy
- [ ] 21. Create helper function for repeated API handler pattern
- [ ] 22. Add logging configuration options
- [ ] 23. Refactor tryGetXxx functions to reduce duplication
- [ ] 24. Use or remove websocket_server.zig
- [ ] 25. Add inline documentation to source files
- [ ] 26. Standardize test file organization
