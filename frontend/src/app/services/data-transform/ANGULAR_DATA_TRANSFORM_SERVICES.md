# Angular Frontend Data Transformation Services

## Overview

This module provides comprehensive data transformation, conversion, and serialization services for the Angular frontend that seamlessly integrate with the C3 backend.

## Module Structure

```
src/app/services/data-transform/
├── index.ts                          # Barrel exports
├── data-transform.types.ts           # Shared types and interfaces
├── data-transform.services.ts        # Core services (JSON, Type, Date, Number)
├── data-transform.services2.ts       # String, Object services
├── array-transform.service.ts        # Array operations
├── encoding.service.ts               # Encoding/decoding
├── validation.service.ts             # Validation
├── dto.service.ts                    # DTO transformations
├── api-response.service.ts           # API response handling
└── data-shape.utils.ts               # Utility functions
```

## Services

### 1. JsonSerializerService

```typescript
@Injectable({ providedIn: 'root' })
export class JsonSerializerService {
  serialize<T>(data: T): string;
  deserialize<T>(json: string): TransformResult<T>;
  pretty<T>(data: T): string;
  compact<T>(data: T): string;
}
```

**Usage:**
```typescript
constructor(private jsonSerializer: JsonSerializerService) {}

// Serialize
const json = this.jsonSerializer.serialize(user);

// Deserialize
const result = this.jsonSerializer.deserialize<User>(json);
if (result.success) {
  const user = result.data;
}
```

### 2. TypeConverterService

```typescript
@Injectable({ providedIn: 'root' })
export class TypeConverterService {
  toInt(value: any): number;
  toDouble(value: any): number;
  toBool(value: any): boolean;
  toString(value: any): string;
  toTimestamp(value: any): number;
  toIsoString(value: any): string;
  toIntArray(value: any): number[];
  toStringArray(value: any): string[];
}
```

**Usage:**
```typescript
constructor(private typeConverter: TypeConverterService) {}

// Form value conversion
const age = this.typeConverter.toInt(formValue.age);  // "25" → 25
const active = this.typeConverter.toBool(formValue.active);  // "true" → true

// Date conversion
const timestamp = this.typeConverter.toTimestamp("2024-01-15T10:30:00Z");
```

### 3. DateTimeService

```typescript
@Injectable({ providedIn: 'root' })
export class DateTimeService {
  parse(input: any): Date | null;
  format(date: Date | number | string): string;
  formatIso(date: Date | number | string): string;
  formatRelative(date: Date | number | string): string;  // "2 hours ago"
  toUtc(date: Date | number | string): Date | null;
  toTimezone(date: Date | number | string, timezone: string): string;
  getYear(date: Date | number | string): number;
  getMonth(date: Date | number | string): number;
  isValid(input: any): boolean;
}
```

**Usage:**
```typescript
constructor(private dateTime: DateTimeService) {}

// Parse
const date = this.dateTime.parse("2024-01-15T10:30:00Z");

// Format
const iso = this.dateTime.formatIso(new Date());
const relative = this.dateTime.formatRelative(timestamp);  // "2 hours ago"

// Timezone
const tokyoTime = this.dateTime.toTimezone(date, 'Asia/Tokyo');

// Validate
const isValid = this.dateTime.isValid(dateString);
```

### 4. NumberFormatService

```typescript
@Injectable({ providedIn: 'root' })
export class NumberFormatService {
  formatInt(value: number): string;
  formatDouble(value: number): string;
  formatCurrency(value: number, currencyCode: string): string;
  formatUsd(value: number): string;
  formatEur(value: number): string;
  formatPercent(value: number, places: number): string;
  formatScientific(value: number): string;
  parse(formatted: string): number;
  round(value: number, places: number): number;
}
```

**Usage:**
```typescript
constructor(private numberFormat: NumberFormatService) {}

// Currency
const price = this.numberFormat.formatUsd(1234.56);  // "$1,234.56"
const eur = this.numberFormat.formatEur(1234.56);  // "€1,234.56"

// Percentage
const percent = this.numberFormat.formatPercent(0.875, 1);  // "87.5%"

// Parse
const value = this.numberFormat.parse("$1,234.56");  // 1234.56
```

### 5. StringTransformService

```typescript
@Injectable({ providedIn: 'root' })
export class StringTransformService {
  toCamel(input: string): string;
  toPascal(input: string): string;
  toSnake(input: string): string;
  toKebab(input: string): string;
  toConstant(input: string): string;
  trim(input: string): string;
  truncate(input: string, maxLength: number): string;
  replaceAll(input: string, search: string, replace: string): string;
  split(input: string, delimiter: string): string[];
  isEmail(input: string): boolean;
  isUrl(input: string): boolean;
  isNumeric(input: string): boolean;
}
```

**Usage:**
```typescript
constructor(private stringTransform: StringTransformService) {}

// Case conversion
const camel = this.stringTransform.toCamel("user_name");  // "userName"
const snake = this.stringTransform.toSnake("userName");  // "user_name"
const kebab = this.stringTransform.toKebab("userName");  // "user-name"

// Validation
const isValidEmail = this.stringTransform.isEmail(input);
const isValidUrl = this.stringTransform.isUrl(input);

// Transform
const truncated = this.stringTransform.truncate(longText, 100);
```

### 6. ObjectMapperService

```typescript
@Injectable({ providedIn: 'root' })
export class ObjectMapperService {
  map<T, U>(source: T, targetConstructor?: new () => U): U;
  mapFields<T>(source: T, fields: string[]): Partial<T>;
  excludeFields<T>(source: T, exclude: string[]): Partial<T>;
  getProperty<T>(obj: T, path: string): any;
  setProperty<T>(obj: T, path: string, value: any): void;
  clone<T>(source: T): T;
  cloneDeep<T>(source: T): T;
  merge<T>(target: T, source: Partial<T>): T;
  mergeDeep<T>(target: T, source: Partial<T>): T;
  flatten<T>(obj: T): any;
  unflatten<T>(flat: T): any;
  pick<T>(obj: T, keys: string[]): Partial<T>;
  omit<T>(obj: T, keys: string[]): Partial<T>;
}
```

**Usage:**
```typescript
constructor(private objectMapper: ObjectMapperService) {}

// Map API response to Angular model
const user = this.objectMapper.map<ApiResponse, User>(response, User);

// Deep clone
const clone = this.objectMapper.cloneDeep(original);

// Merge
const merged = this.objectMapper.mergeDeep(target, source);

// Path operations
const city = this.objectMapper.getProperty(user, 'address.city');
this.objectMapper.setProperty(user, 'address.zip', '12345');

// Flatten/unflatten
const flat = this.objectMapper.flatten(nestedObject);
const nested = this.objectMapper.unflatten(flat);

// Pick/omit
const safe = this.objectMapper.omit(sensitiveData, ['password', 'ssn']);
```

### 7. ArrayTransformService

```typescript
@Injectable({ providedIn: 'root' })
export class ArrayTransformService {
  map<T, U>(arr: T[], transform: (item: T) => U): U[];
  filter<T>(arr: T[], predicate: (item: T) => boolean): T[];
  reduce<T, U>(arr: T[], initial: U, reducer: (acc: U, item: T) => U): U;
  sort<T>(arr: T[], compare: (a: T, b: T) => number): T[];
  unique<T>(arr: T[]): T[];
  chunk<T>(arr: T[], chunkSize: number): T[][];
  flatten<T>(arr: T[][]): T[];
  union<T>(...arrays: T[][]): T[];
  intersection<T>(arr1: T[], arr2: T[]): T[];
  find<T>(arr: T[], predicate: (item: T) => boolean): T | undefined;
  every<T>(arr: T[], predicate: (item: T) => boolean): boolean;
  some<T>(arr: T[], predicate: (item: T) => boolean): boolean;
}
```

**Usage:**
```typescript
constructor(private arrayTransform: ArrayTransformService) {}

// Map
const names = this.arrayTransform.map(users, u => u.name);

// Filter
const adults = this.arrayTransform.filter(users, u => u.age >= 18);

// Sort
const sorted = this.arrayTransform.sortInt(numbers, true);

// Unique
const unique = this.arrayTransform.unique(duplicates);

// Chunk for pagination
const pages = this.arrayTransform.chunk(items, 10);
```

### 8. EncodingService

```typescript
@Injectable({ providedIn: 'root' })
export class EncodingService {
  base64Encode(data: string | Uint8Array): string;
  base64Decode(base64: string): string;
  urlEncode(str: string): string;
  urlDecode(encoded: string): string;
  htmlEncode(str: string): string;
  htmlDecode(encoded: string): string;
}
```

**Usage:**
```typescript
constructor(private encoding: EncodingService) {}

// Base64 for file uploads
const base64 = this.encoding.base64Encode(imageData);

// URL encoding for query params
const encoded = this.encoding.urlEncode(searchTerm);

// HTML encoding for XSS prevention
const safe = this.encoding.htmlEncode(userInput);
```

### 9. ValidationService

```typescript
@Injectable({ providedIn: 'root' })
export class ValidationService {
  addRule(field: string, ruleType: string, message: string, params?: any): void;
  validate<T>(data: T): ValidationResult;
  isValid<T>(data: T): boolean;
  
  // Built-in validators
  static required(value: any): boolean;
  static minLength(value: string, min: number): boolean;
  static maxLength(value: string, max: number): boolean;
  static email(value: string): boolean;
  static url(value: string): boolean;
  static pattern(value: string, pattern: RegExp): boolean;
}
```

**Usage:**
```typescript
constructor(private validation: ValidationService) {}

// Define rules
this.validation.addRule('email', 'required', 'Email is required');
this.validation.addRule('email', 'email', 'Invalid email format');
this.validation.addRule('password', 'minLength', 'Min 8 characters', 8);

// Validate
const result = this.validation.validate(formData);
if (result.isValid) {
  // Submit
} else {
  // Show errors
  console.log(result.errors);
}
```

### 10. DtoService

```typescript
@Injectable({ providedIn: 'root' })
export class DtoService {
  create<T>(schemaName: string, data: any): T;
  validateAndCreate<T>(schemaName: string, data: any): TransformResult<T>;
  transform<T, U>(fromSchema: string, toSchema: string, data: T): U;
  
  // Common DTOs
  createUserResponse(userData: any): UserResponse;
  createProductResponse(productData: any): ProductResponse;
  createOrderResponse(orderData: any): OrderResponse;
  createErrorResponse(message: string, code: number): ErrorResponse;
  createPaginatedResponse<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResponse<T>;
}
```

**Usage:**
```typescript
constructor(private dto: DtoService) {}

// Create DTO from API response
const user = this.dto.create<User>('User', apiData);

// Standardized responses
const response = this.dto.createPaginatedResponse(items, total, page, pageSize);
```

### 11. ApiResponseService

```typescript
@Injectable({ providedIn: 'root' })
export class ApiResponseService {
  success<T>(data: T): ApiResponse<T>;
  successMessage<T>(data: T, message: string): ApiResponse<T>;
  error(message: string, code: number): ApiResponse<null>;
  errorDetailed(message: string, code: number, errors: string[]): ApiResponse<null>;
  notFound(resource: string): ApiResponse<null>;
  unauthorized(): ApiResponse<null>;
  forbidden(): ApiResponse<null>;
  validationError(validation: ValidationResult): ApiResponse<null>;
}
```

**Usage:**
```typescript
constructor(private apiResponse: ApiResponseService) {}

// In HTTP interceptor
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return next.handle(req).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        const response = event.body as ApiResponse<any>;
        if (!response.success) {
          // Handle error
        }
      }
      return event;
    })
  );
}
```

## Integration with C3 Backend

### Request/Response Flow

```
Angular Frontend                    C3 Backend
─────────────                       ────────────
                                   
User Input →                        
    ↓                               
Form Value →                        
    ↓                               
TypeConverterService                
    ↓ (string → number/date)        
DTO →                               
    ↓                               
JsonSerializerService               
    ↓ (JSON string)                 
HTTP Request ─────────────────────→ JsonSerializerService
                                    ↓ (deserialize)
                                    TypeConverterService
                                    ↓ (convert types)
                                    Business Logic
                                    ↓
                                    DTO
                                    ↓
                                    JsonSerializerService
                                    ↓ (serialize)
HTTP Response ←──────────────────── JSON string
    ↓
JsonSerializerService
    ↓ (deserialize)
DateTimeService (dates)
NumberFormatService (numbers)
    ↓
Angular Component
```

### Example: User Registration

```typescript
// Angular Component
@Component({ ... })
export class RegisterComponent {
  constructor(
    private typeConverter: TypeConverterService,
    private dateTime: DateTimeService,
    private validation: ValidationService,
    private userService: UserService
  ) {}

  async register(formValue: any) {
    // Convert types
    const data = {
      username: formValue.username,
      email: formValue.email,
      age: this.typeConverter.toInt(formValue.age),
      birthDate: this.dateTime.parse(formValue.birthDate),
      agreedToTerms: this.typeConverter.toBool(formValue.agreed),
    };

    // Validate
    const result = this.validation.validate(data);
    if (!result.isValid) {
      this.errors = result.errors;
      return;
    }

    // Send to backend
    const response = await this.userService.register(data);
    
    // Backend (C3) receives and converts:
    // - age: string → int
    // - birthDate: ISO string → timestamp
    // - agreedToTerms: string → bool
  }
}
```

## Best Practices

1. **Use services consistently** - Don't mix manual conversion with services
2. **Validate on both ends** - Frontend for UX, backend for security
3. **Use DTOs** - Define clear data contracts between frontend and backend
4. **Handle dates properly** - Always use ISO strings for API communication
5. **Sanitize user input** - Use validation and encoding services
