# API Communication Patterns

This guide covers API communication patterns between the Angular frontend and C3 backend.

## Table of Contents

- [Overview](#overview)
- [Request-Response Pattern](#request-response-pattern)
- [Event-Based Pattern](#event-based-pattern)
- [Error Handling](#error-handling)
- [Data Transformation](#data-transformation)
- [Caching](#caching)
- [Best Practices](#best-practices)

---

## Overview

The application uses two main communication patterns:

1. **Request-Response** - For CRUD operations via HTTP
2. **Event-Based** - For real-time updates via WebUI events

---

## Request-Response Pattern

### Service Structure

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = '/api/users';

  constructor(
    private http: HttpClient,
    private typeConverter: TypeConverterService,
    private objectMapper: ObjectMapperService
  ) {}

  // GET all
  getAll(): Observable<User[]> {
    return this.http.get<ApiResponse>(this.apiUrl).pipe(
      map(response => this.parseUsersResponse(response))
    );
  }

  // GET by ID
  getById(id: number): Observable<User> {
    return this.http.get<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => this.parseUserResponse(response))
    );
  }

  // POST create
  create(dto: CreateUserDto): Observable<User> {
    return this.http.post<ApiResponse>(this.apiUrl, dto).pipe(
      map(response => this.parseUserResponse(response))
    );
  }

  // PUT update
  update(id: number, dto: UpdateUserDto): Observable<User> {
    return this.http.put<ApiResponse>(`${this.apiUrl}/${id}`, dto).pipe(
      map(response => this.parseUserResponse(response))
    );
  }

  // DELETE
  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => {
        if (!response.success) {
          throw new Error(response.error);
        }
      })
    );
  }

  // Private parse methods
  private parseUserResponse(response: ApiResponse): User {
    const data = response.data as any;
    
    // Convert types
    data.id = this.typeConverter.toInt(data.id);
    data.createdAt = this.dateTime.parse(data.createdAt);
    
    // Map to model
    return this.objectMapper.map<any, User>(data, User);
  }

  private parseUsersResponse(response: ApiResponse): User[] {
    const data = response.data as any[];
    return data.map(item => this.parseUserResponse({ 
      success: true, 
      data: item 
    }));
  }
}
```

### DTO Pattern

```typescript
// Request DTOs
export interface CreateUserDto {
  username: string;
  email: string;
  age: number;
  birthDate: string;  // ISO string
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  age?: number;
}

// Response DTOs
export interface UserResponse {
  id: number;
  username: string;
  email: string;
  createdAt: string;
  updatedAt?: string;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
```

---

## Event-Based Pattern

### Frontend Event Service

```typescript
@Injectable({ providedIn: 'root' })
export class WebUiEventService {
  private eventSubject = new Subject<WebUiEvent>();
  public events$ = this.eventSubject.asObservable();

  constructor(private webuiService: WebuiService) {
    // Listen for backend events
    this.webuiService.onEvent((event) => {
      this.eventSubject.next(event);
    });
  }

  // Emit event to backend
  emit(type: string, data?: any) {
    this.webuiService.emit(type, data);
  }

  // Subscribe to specific event type
  on(type: string, handler: (data: any) => void) {
    return this.events$
      .filter(event => event.type === type)
      .subscribe(event => handler(event.data));
  }
}
```

### Backend Event Service

```c3
// C3 Backend
fn void event_emit_user_created(EventService* self, User* user) {
    Event event = event_create(
        EVENT_CUSTOM, 
        "user.created", 
        user, 
        $sizeof(User)
    );
    event_emit(self, &event);
}

// Usage in service
fn bool create_user(DatabaseService* db, char* username) {
    User* user = db_create_user(db, username);
    
    if (user) {
        event_emit_user_created(event_service, user);
    }
    
    return user != null;
}
```

### Component Usage

```typescript
@Component({ ... })
export class UserListComponent implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  constructor(private webUiEvent: WebUiEventService) {}

  ngOnInit() {
    // Subscribe to user created events
    this.subscriptions.add(
      this.webUiEvent.on('user.created', (data) => {
        this.loadUsers();  // Refresh list
        this.showNotification('User created successfully');
      })
    );

    // Subscribe to user updated events
    this.subscriptions.add(
      this.webUiEvent.on('user.updated', (data) => {
        this.updateUserInList(data);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
```

---

## Error Handling

### Standardized Error Response

```typescript
export interface ErrorResponse {
  success: false;
  error: string;
  code: number;
  details?: string[];
}

// Error codes
export enum ErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  VALIDATION_ERROR = 422,
  SERVER_ERROR = 500
}
```

### HTTP Interceptor

```typescript
@Injectable({ providedIn: 'root' })
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private notification: NotificationService
  ) {}

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        let errorMessage = 'An error occurred';

        if (error.error instanceof ErrorEvent) {
          // Client-side error
          errorMessage = error.error.message;
        } else {
          // Server-side error
          const response = error.error as ErrorResponse;
          errorMessage = response.error || errorMessage;

          // Handle specific status codes
          switch (error.status) {
            case 401:
              this.router.navigate(['/login']);
              break;
            case 403:
              this.notification.showForbidden();
              break;
            case 404:
              this.router.navigate(['/not-found']);
              break;
          }
        }

        this.notification.showError(errorMessage);
        return throwError(() => error);
      })
    );
  }
}
```

### Validation Error Handling

```typescript
// Backend validation error response
export interface ValidationErrorResponse {
  success: false;
  error: string;
  code: 422;
  fieldErrors: { [field: string]: string[] };
}

// Frontend handling
this.userService.create(dto).subscribe({
  next: (user) => this.onSuccess(user),
  error: (error: HttpErrorResponse) => {
    if (error.status === 422) {
      const validationError = error.error as ValidationErrorResponse;
      
      // Map field errors to form
      Object.entries(validationError.fieldErrors).forEach(
        ([field, messages]) => {
          this.form.controls[field].setErrors({ 
            serverError: messages 
          });
        }
      );
    }
  }
});
```

---

## Data Transformation

### Request Transformation

```typescript
createUser(formData: any): Observable<User> {
  // Transform form data to DTO
  const dto: CreateUserDto = {
    username: this.stringTransform.trim(formData.username),
    email: this.stringTransform.toLower(formData.email),
    age: this.typeConverter.toInt(formData.age),
    birthDate: this.dateTime.toIsoString(formData.birthDate),
    active: this.typeConverter.toBool(formData.active)
  };

  // Validate
  const validation = this.validation.validate(dto);
  if (!validation.isValid) {
    return throwError(() => new ValidationError(validation));
  }

  return this.http.post<ApiResponse>('/api/users', dto);
}
```

### Response Transformation

```typescript
getUser(id: number): Observable<User> {
  return this.http.get<ApiResponse>(`/api/users/${id}`).pipe(
    map(response => {
      if (!response.success) {
        throw new ApiError(response.error);
      }

      const data = response.data as any;

      // Transform response
      return {
        id: this.typeConverter.toInt(data.id),
        username: data.username,
        email: data.email,
        age: this.typeConverter.toInt(data.age),
        birthDate: this.dateTime.parse(data.birthDate),
        active: this.typeConverter.toBool(data.active),
        createdAt: this.dateTime.parse(data.createdAt),
        updatedAt: this.dateTime.parse(data.updatedAt)
      } as User;
    })
  );
}
```

---

## Caching

### Service-Level Caching

```typescript
@Injectable({ providedIn: 'root' })
export class CachedUserService {
  private cache = new Map<number, User>();
  private cacheTimestamps = new Map<number, number>();
  private readonly CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

  constructor(private http: HttpClient) {}

  getUser(id: number): Observable<User> {
    // Check cache
    const cached = this.getCached(id);
    if (cached) {
      return of(cached);
    }

    // Fetch from API
    return this.http.get<ApiResponse>(`/api/users/${id}`).pipe(
      tap(response => {
        const user = this.parseUserResponse(response);
        this.setCache(id, user);
      }),
      map(response => this.parseUserResponse(response))
    );
  }

  private getCached(id: number): User | null {
    const user = this.cache.get(id);
    const timestamp = this.cacheTimestamps.get(id);

    if (!user || !timestamp) return null;

    // Check if expired
    if (Date.now() - timestamp > this.CACHE_TTL) {
      this.cache.delete(id);
      this.cacheTimestamps.delete(id);
      return null;
    }

    return user;
  }

  private setCache(id: number, user: User) {
    this.cache.set(id, user);
    this.cacheTimestamps.set(id, Date.now());
  }

  // Invalidate cache
  invalidateCache(id?: number) {
    if (id) {
      this.cache.delete(id);
      this.cacheTimestamps.delete(id);
    } else {
      this.cache.clear();
      this.cacheTimestamps.clear();
    }
  }
}
```

---

## Best Practices

### 1. Use Standardized Responses

```typescript
// Backend always returns standardized response
{
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
}
```

### 2. Transform at Service Layer

```typescript
// Good - Transform in service
@Injectable()
export class UserService {
  getUser(id: number): Observable<User> {
    return this.http.get<ApiResponse>(...).pipe(
      map(response => this.transformUser(response))
    );
  }
}

// Avoid - Transform in component
@Component()
export class UserComponent {
  ngOnInit() {
    this.userService.getUser(id).subscribe(response => {
      // Don't transform here
      const user = this.transformUser(response);
    });
  }
}
```

### 3. Handle Errors Centrally

```typescript
// Use HTTP interceptor for global error handling
@Injectable({ providedIn: 'root' })
export class ErrorInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    return next.handle(req).pipe(
      catchError(error => {
        // Handle error centrally
        return throwError(() => error);
      })
    );
  }
}
```

### 4. Use DTOs for API Contracts

```typescript
// Define clear API contracts
export interface CreateUserRequest {
  username: string;
  email: string;
}

export interface CreateUserResponse {
  id: number;
  username: string;
  createdAt: string;
}

// Map between DTO and domain model
const user = this.objectMapper.map<CreateUserResponse, User>(response, User);
```

### 5. Implement Retry Logic

```typescript
getUser(id: number): Observable<User> {
  return this.http.get<ApiResponse>(`/api/users/${id}`).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        if (retryCount === 3) throw error;
        return timer(1000 * retryCount);
      }
    })
  );
}
```

### 6. Use Request/Response Interceptors

```typescript
// Add auth token to requests
@Injectable({ providedIn: 'root' })
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler) {
    const token = this.authService.getToken();
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req);
  }
}
```

---

## Related Documentation

- [Data Transform Services](02-DATA_TRANSFORM_SERVICES.md)
- [Testing Guide](04-TESTING_GUIDE.md)
- [Backend API Reference](../../docs/API_REFERENCE.md)
