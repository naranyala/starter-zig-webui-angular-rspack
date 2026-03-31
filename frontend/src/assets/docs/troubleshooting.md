# Troubleshooting Guide

🔍 Common issues and solutions

## Overview

This guide covers common issues and their solutions for the Zig WebUI Angular application.

## Database Issues

### SQLite Database Locked

**Symptom:**
```
Error: database is locked
```

**Causes:**
- Multiple processes accessing the database
- Long-running transactions
- WAL mode not enabled

**Solutions:**

1. Enable WAL mode:
```sql
PRAGMA journal_mode = WAL;
```

2. Set busy timeout:
```sql
PRAGMA busy_timeout = 5000;
```

3. Check for locked processes:
```bash
lsof data/app.db
```

4. Kill locked process:
```bash
kill <pid>
```

### DuckDB Not Initializing

**Symptom:**
```
Error: Database not initialized
```

**Causes:**
- Missing DuckDB library
- Incorrect path
- Permission issues

**Solutions:**

1. Check library exists:
```bash
ls -la thirdparty/libduckdb-linux-amd64/
```

2. Set library path:
```bash
export LD_LIBRARY_PATH=./thirdparty/libduckdb-linux-amd64:$LD_LIBRARY_PATH
```

3. Check permissions:
```bash
chmod 755 thirdparty/libduckdb-linux-amd64/*.so
```

4. Rebuild application:
```bash
zig build clean
zig build
```

## Frontend Issues

### Markdown Not Rendering

**Symptom:**
- Documentation pages show raw markdown
- No formatted content

**Causes:**
- Markdown module not imported
- HttpClient not configured
- File path incorrect

**Solutions:**

1. Verify markdown module import:
```typescript
import { MarkdownModule } from 'ngx-markdown';

@NgModule({
  imports: [MarkdownModule.forRoot()]
})
```

2. Check HttpClient configuration:
```typescript
import { provideHttpClient } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [provideHttpClient()]
});
```

3. Verify file paths:
```bash
ls -la frontend/src/assets/docs/
```

4. Check browser console for 404 errors

### API Calls Failing

**Symptom:**
```
Error: Backend function not found: getUsers
```

**Causes:**
- Backend not running
- Function not bound
- WebUI bridge not available

**Solutions:**

1. Check backend is running:
```bash
ps aux | grep zig_webui
```

2. Verify function bindings in main.zig:
```zig
webui.bind(window, "getUsers", handleSqliteGetUsers);
```

3. Check browser console for WebUI errors

4. Restart application:
```bash
./run-fast.sh dev
```

### Build Errors

**Symptom:**
```
Error: NG8001: 'app-sqlite-demo' is not a known element
```

**Causes:**
- Component not imported
- Module not compiled
- Cache issues

**Solutions:**

1. Clear cache:
```bash
cd frontend
rm -rf .angular/cache
rm -rf node_modules/.vite
bun install
```

2. Verify component imports:
```typescript
import { SqliteDemoComponent } from './views/sqlite/sqlite-demo.component';

@Component({
  imports: [SqliteDemoComponent]
})
```

3. Rebuild:
```bash
bun run build
```

## Backend Issues

### Build Failures

**Symptom:**
```
error: undefined reference to 'sqlite3_open'
```

**Causes:**
- Missing C compiler
- Missing SQLite source
- Build configuration error

**Solutions:**

1. Install build tools:
```bash
sudo apt install build-essential
```

2. Verify SQLite source:
```bash
ls -la thirdparty/sqlite3/sqlite3.c
```

3. Clean and rebuild:
```bash
zig build clean
zig build
```

### Memory Leaks

**Symptom:**
- Increasing memory usage over time
- OutOfMemory errors

**Causes:**
- Missing defer statements
- Unfreed allocations
- Circular references

**Solutions:**

1. Check for defer patterns:
```zig
// Good
var parsed = try std.json.parseFromSlice(..., .{});
defer parsed.deinit();

// Bad - memory leak
var parsed = try std.json.parseFromSlice(..., .{});
// Missing defer!
```

2. Use Zig's memory tracking:
```bash
zig build -Dsanitize=memory
```

3. Check for unfreed allocations:
```zig
const allocator = std.heap.DebugAllocator.init();
// ... run code ...
allocator.deinit(); // Reports leaks
```

### Performance Issues

**Symptom:**
- Slow query execution
- High CPU usage
- Slow UI response

**Causes:**
- Missing indexes
- Inefficient queries
- Large result sets

**Solutions:**

1. Add indexes:
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```

2. Use LIMIT for large queries:
```sql
SELECT * FROM users LIMIT 100;
```

3. Enable query logging:
```zig
const start = std.time.microTimestamp();
try db.exec(query);
const elapsed = std.time.microTimestamp() - start;
log.info("Query took {d}μs", .{elapsed});
```

## Security Issues

### SQL Injection Attempts

**Symptom:**
```
[SECURITY] SQL_INJECTION_ATTEMPT: Blocked malicious query
```

**Action:**
- This is expected behavior - the attack was blocked
- Review logs for source IP
- Consider additional monitoring

**Solutions:**

1. Review application logs:
```bash
grep SQL_INJECTION logs/app.log
```

2. Verify input validation is working:
```zig
if (!security.isValidSelectQuery(query)) {
    // Correctly blocked
    return;
}
```

3. No action needed if from your own testing

### Rate Limit Exceeded

**Symptom:**
```
Error: Rate limit exceeded
Code: 429
```

**Causes:**
- Too many requests in short time
- Shared IP with other users
- Aggressive polling

**Solutions:**

1. Reduce request frequency:
```typescript
// Bad: Poll every 100ms
setInterval(() => loadUsers(), 100);

// Good: Poll every 5s
setInterval(() => loadUsers(), 5000);
```

2. Implement caching:
```typescript
// Cache for 30 seconds
const cached = this.cache.get('users');
if (cached && Date.now() - cached.time < 30000) {
  return cached.data;
}
```

3. Increase rate limit (if appropriate):
```zig
var api_rate_limiter = RateLimiter.init(allocator, 200, 60); // 200 req/min
```

## Common Error Messages

### "Database not initialized"

**Meaning:** Database connection failed

**Fix:**
1. Check database file exists
2. Verify file permissions
3. Restart application

### "Invalid email format"

**Meaning:** Email validation failed

**Fix:**
1. Use format: user@domain.com
2. Check for typos
3. No spaces allowed

### "Age must be between 0 and 150"

**Meaning:** Age validation failed

**Fix:**
1. Enter a number between 0 and 150
2. Check for non-numeric characters

### "Only SELECT queries are allowed"

**Meaning:** Non-SELECT query attempted

**Fix:**
1. Use SELECT only
2. For modifications, use CRUD endpoints
3. Check query doesn't contain blocked keywords

### "User has dependent records"

**Meaning:** Cannot delete user with related orders

**Fix:**
1. Delete orders first, OR
2. Use "Force Delete" option

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Run application
./run-fast.sh dev
```

### Browser DevTools

1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for API calls
4. Use Application tab to inspect storage

### Backend Debugging

```zig
// Add debug prints
std.debug.print("[DEBUG] User ID: {d}\n", .{user_id});

// Log with levels
logger.debug("Detailed info: {}", .{data});
logger.info("Normal operation: {}", .{data});
logger.warn("Warning: {}", .{data});
logger.err("Error: {}", .{err});
```

### Network Monitoring

```bash
# Monitor WebSocket connections
netstat -an | grep webui

# Monitor database file access
inotifywait -m data/
```

## Getting Help

### Information to Include

When reporting issues, include:

1. **Environment:**
   - OS version
   - Zig version (`zig version`)
   - Bun version (`bun --version`)

2. **Error Details:**
   - Full error message
   - Stack trace
   - Browser console output

3. **Steps to Reproduce:**
   - Exact steps
   - Expected behavior
   - Actual behavior

4. **Logs:**
   - Application logs
   - Browser console
   - Network tab

### Support Channels

- 📖 Check documentation
- 🔍 Search existing issues
- 📝 Create new issue with details

## Next Steps

- 📖 Read [Error Handling](/docs/production/error-handling) guide
- 🧪 Review [Testing Guide](/docs/production/testing-guide)
- 🔒 Check [Security Checklist](/docs/production/security-checklist)

---

**Last Updated**: 2026-03-31  
**Read Time**: 15 min
