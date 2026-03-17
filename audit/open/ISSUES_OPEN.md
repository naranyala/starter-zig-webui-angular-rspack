# Open Issues Checklist

## High Priority

- [ ] 1. Review and fix EventBus memory management in `src/di.zig`
- [ ] 2. Add error handling for unsafe unwrap operations in `src/main.zig`
- [ ] 3. Complete signal handlers implementation in `src/main.zig`

## Medium Priority

- [ ] 4. Clean up unused variables in `src/main.zig` (lines 205, 225)
- [ ] 5. Add better error messages for frontend path validation
- [ ] 6. Handle window size errors properly
- [ ] 7. Add `eprintln` or similar to Result type
- [ ] 8. Implement actual NotificationService functionality
- [ ] 9. Implement actual ClipboardService functionality
- [ ] 10. Implement actual HttpService functionality
- [ ] 11. Implement actual ProcessService functionality
- [ ] 12. Optimize duplicate logger result calls
- [ ] 13. Verify settings import path in `src/utils/settings.zig`
- [ ] 14. Make EventBus.emit return errors

## Low Priority

- [ ] 15. Replace magic number 4096 with named constant
- [ ] 16. Unify error naming strategy
- [ ] 17. Create helper function for repeated API handler pattern
- [ ] 18. Add logging configuration options
- [ ] 19. Refactor tryGetXxx functions to reduce duplication
- [ ] 20. Use or remove websocket_server.zig
- [ ] 21. Add inline documentation to source files
- [ ] 22. Standardize test file organization
