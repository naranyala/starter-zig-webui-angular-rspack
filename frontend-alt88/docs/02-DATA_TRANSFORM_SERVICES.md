# Data Transform Services Guide

This guide covers the Angular data transformation services for API communication and data shape conversion.

## Table of Contents

- [Overview](#overview)
- [JsonSerializerService](#jsonserializerservice)
- [TypeConverterService](#typeconverterservice)
- [DateTimeService](#datetimeservice)
- [NumberFormatService](#numberformatservice)
- [StringTransformService](#stringtransformservice)
- [ObjectMapperService](#objectmapperservice)
- [ArrayTransformService](#arraytransformservice)
- [ValidationService](#validationservice)
- [ApiResponseService](#apiresponseservice)

---

## Overview

Location: `frontend/src/app/services/data-transform/`

The data transform services provide:

- **Type-safe serialization** - JSON serialization with date handling
- **Type conversion** - String to number, boolean, date conversions
- **Formatting** - Number, currency, date, percentage formatting
- **String manipulation** - Case conversion, trimming, validation
- **Object mapping** - Field mapping, cloning, merging
- **Array operations** - Map, filter, reduce, sort
- **Validation** - Rule-based validation
- **API responses** - Standardized response handling

---

## JsonSerializerService

### Usage

```typescript
constructor(private jsonSerializer: JsonSerializerService) {}

// Serialize
const json = this.jsonSerializer.serialize(user);

// Deserialize
const result = this.jsonSerializer.deserialize<User>(json);
if (result.success) {
  const user = result.data;
}

// Pretty print
const pretty = this.jsonSerializer.pretty(data);

// Compact (no whitespace)
const compact = this.jsonSerializer.compact(data);
```

### Configuration

```typescript
this.jsonSerializer.configure({
  prettyPrint: true,
  indentSize: 2,
  skipNulls: true,
  dateAsIso: true,
  bigintAsString: true
});
```

---

## TypeConverterService

### Usage

```typescript
constructor(private typeConverter: TypeConverterService) {}

// Form value conversion
const age = this.typeConverter.toInt(formValue.age);  // "25" -> 25
const active = this.typeConverter.toBool(formValue.active);  // "true" -> true
const price = this.typeConverter.toDouble(formValue.price);

// Date conversion
const timestamp = this.typeConverter.toTimestamp("2024-01-15T10:30:00Z");
const isoString = this.typeConverter.toIsoString(new Date());

// Array conversion
const numbers = this.typeConverter.toIntArray(stringArray);
const strings = this.typeConverter.toStringArray(numberArray);
```

---

## DateTimeService

### Usage

```typescript
constructor(private dateTime: DateTimeService) {}

// Parse
const date = this.dateTime.parse("2024-01-15T10:30:00Z");
const date2 = this.dateTime.parseIso("2024-01-15");
const date3 = this.dateTime.parseRfc("Mon, 15 Jan 2024 10:30:00 GMT");

// Format
const iso = this.dateTime.formatIso(new Date());
const rfc = this.dateTime.formatRfc(new Date());
const relative = this.dateTime.formatRelative(timestamp);  // "2 hours ago"

// Timezone
const tokyoTime = this.dateTime.toTimezone(date, 'Asia/Tokyo');
const utc = this.dateTime.toUtc(localDate);

// Components
const year = this.dateTime.getYear(date);
const month = this.dateTime.getMonth(date);  // 1-12
const day = this.dateTime.getDay(date);  // 1-31
const hour = this.dateTime.getHour(date);  // 0-23

// Validate
const isValid = this.dateTime.isValid(dateString);
const isValidIso = this.dateTime.isValidIso(isoString);
```

### Configuration

```typescript
this.dateTime.configure({
  timezone: 'UTC',
  outputFormat: DateFormat.ISO,
  locale: 'en-US'
});
```

---

## NumberFormatService

### Usage

```typescript
constructor(private numberFormat: NumberFormatService) {}

// Currency
const price = this.numberFormat.formatUsd(1234.56);  // "$1,234.56"
const eur = this.numberFormat.formatEur(1234.56);  // "1 234,56 €"
const gbp = this.numberFormat.formatGbp(1234.56);  // "£1,234.56"
const jpy = this.numberFormat.formatJpy(1234);  // "¥1,234"

// Percentage
const percent = this.numberFormat.formatPercent(0.875, 1);  // "87.5%"

// Scientific notation
const scientific = this.numberFormat.formatScientific(1234567);  // "1.23e+6"

// Parse
const value = this.numberFormat.parse("$1,234.56");  // 1234.56
const intVal = this.numberFormat.parseInt("1,234");  // 1234

// Rounding
const rounded = this.numberFormat.round(3.14159, 2);  // 3.14
const floored = this.numberFormat.floor(3.9);  // 3
const ceiled = this.numberFormat.ceil(3.1);  // 4
```

### Configuration

```typescript
this.numberFormat.configure({
  decimalPlaces: 2,
  decimalSeparator: '.',
  thousandsSeparator: ',',
  showThousands: true
}, 'en-US');
```

---

## StringTransformService

### Usage

```typescript
constructor(private stringTransform: StringTransformService) {}

// Case conversion
const camel = this.stringTransform.toCamel("user_name");  // "userName"
const pascal = this.stringTransform.toPascal("user_name");  // "UserName"
const snake = this.stringTransform.toSnake("userName");  // "user_name"
const kebab = this.stringTransform.toKebab("userName");  // "user-name"
const constant = this.stringTransform.toConstant("userName");  // "USER_NAME"

// Trimming
const trimmed = this.stringTransform.trim("  hello  ");
const trimmedLeft = this.stringTransform.trimLeft("  hello");
const trimmedRight = this.stringTransform.trimRight("hello  ");

// Transformation
const capitalized = this.stringTransform.capitalize("hello");  // "Hello"
const truncated = this.stringTransform.truncate(longText, 100);
const reversed = this.stringTransform.reverse("hello");  // "olleh"

// Replacement
const replaced = this.stringTransform.replaceAll(text, "old", "new");

// Splitting
const parts = this.stringTransform.split("a,b,c", ",");  // ["a", "b", "c"]
const lines = this.stringTransform.splitLines(multilineText);
const joined = this.stringTransform.join(parts, ",");  // "a,b,c"

// Validation
const isValidEmail = this.stringTransform.isEmail(input);
const isValidUrl = this.stringTransform.isUrl(input);
const isValidPhone = this.stringTransform.isPhone(input);
const isNumeric = this.stringTransform.isNumeric(input);
```

---

## ObjectMapperService

### Usage

```typescript
constructor(private objectMapper: ObjectMapperService) {}

// Map API response to model
const user = this.objectMapper.map<ApiResponse, User>(response, User);

// Configure field mappings
this.objectMapper.addMapping("user_name", "username");
this.objectMapper.addMapping("first_name", "firstName");
this.objectMapper.addMapping("birth_date", "age", (v) => calculateAge(v));

// Deep clone
const clone = this.objectMapper.cloneDeep(original);

// Merge
const merged = this.objectMapper.mergeDeep(target, source);

// Path operations
const city = this.objectMapper.getProperty(user, 'address.city');
this.objectMapper.setProperty(user, 'address.zip', '12345');
const hasPath = this.objectMapper.hasPath(user, 'user.email');

// Flatten/unflatten
const flat = this.objectMapper.flatten(nestedObject);
const nested = this.objectMapper.unflatten(flatObject);

// Pick/omit
const safe = this.objectMapper.omit(sensitiveData, ['password', 'ssn']);
const selected = this.objectMapper.pick(fullObject, ['id', 'name']);
```

---

## ArrayTransformService

### Usage

```typescript
constructor(private arrayTransform: ArrayTransformService) {}

// Map
const names = this.arrayTransform.map(users, u => u.name);

// Filter
const adults = this.arrayTransform.filter(users, u => u.age >= 18);

// Reduce
const sum = this.arrayTransform.reduce(numbers, 0, (acc, n) => acc + n);

// Sort
const sorted = this.arrayTransform.sortInt(numbers, true);  // ascending
const sortedDesc = this.arrayTransform.sortInt(numbers, false);  // descending

// Unique
const unique = this.arrayTransform.unique(duplicates);

// Chunk for pagination
const pages = this.arrayTransform.chunk(items, 10);

// Set operations
const union = this.arrayTransform.union(arr1, arr2);
const intersection = this.arrayTransform.intersection(arr1, arr2);
const difference = this.arrayTransform.difference(arr1, arr2);

// Finding
const found = this.arrayTransform.find(items, item => item.id === targetId);
const index = this.arrayTransform.findIndex(items, item => item.active);

// Checking
const allValid = this.arrayTransform.every(items, item => item.valid);
const anyMatch = this.arrayTransform.some(items, item => item.selected);
const exists = this.arrayTransform.includes(items, targetItem);
```

---

## ValidationService

### Usage

```typescript
constructor(private validation: ValidationService) {}

// Define rules
this.validation.addRule('email', 'required', 'Email is required');
this.validation.addRule('email', 'email', 'Invalid email format');
this.validation.addRule('password', 'minLength', 'Min 8 characters', 8);
this.validation.addRule('password', 'pattern', 'Must contain numbers', '[0-9]');
this.validation.addRule('age', 'min', 'Must be 18+', 18);

// Validate
const result = this.validation.validate(formData);
if (result.isValid) {
  // Submit
} else {
  // Show errors
  console.log(result.errors);
  console.log(result.fieldErrors);
}

// Custom validator
this.validation.addCustomRule('username', 
  (value) => checkUsernameAvailable(value),
  'Username taken'
);

// Built-in validators
ValidationService.required(value);
ValidationService.minLength(value, 8);
ValidationService.maxLength(value, 100);
ValidationService.email(value);
ValidationService.url(value);
ValidationService.pattern(value, /^[a-z]+$/);
```

---

## ApiResponseService

### Usage

```typescript
constructor(private apiResponse: ApiResponseService) {}

// In HTTP interceptor
intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
  return next.handle(req).pipe(
    map(event => {
      if (event instanceof HttpResponse) {
        const response = this.apiResponse.parseHttpResponse(event.body);
        if (!response.success) {
          // Handle error
        }
      }
      return event;
    })
  );
}

// Create responses
const success = this.apiResponse.success(data);
const withMessage = this.apiResponse.successMessage(data, 'Operation completed');
const error = this.apiResponse.error('Something went wrong', 500);
const notFound = this.apiResponse.notFound('User');
const validationErr = this.apiResponse.validationError(validationResult);
```

---

## Integration Example

### Complete API Call Flow

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(
    private http: HttpClient,
    private typeConverter: TypeConverterService,
    private dateTime: DateTimeService,
    private objectMapper: ObjectMapperService,
    private apiResponse: ApiResponseService
  ) {}

  getUser(id: string): Observable<User> {
    return this.http.get<ApiResponse>(`/api/users/${id}`).pipe(
      map(response => {
        // Parse API response
        const parsed = this.apiResponse.parseHttpResponse(response);
        
        if (!parsed.success) {
          throw new Error(parsed.error);
        }

        // Convert types
        const data = parsed.data;
        data.id = this.typeConverter.toInt(data.id);
        data.createdAt = this.dateTime.parse(data.createdAt);
        
        // Map to model
        return this.objectMapper.map<ApiResponse, User>(data, User);
      })
    );
  }

  createUser(formData: any): Observable<User> {
    // Convert form values
    const dto = {
      username: formData.username,
      email: formData.email,
      age: this.typeConverter.toInt(formData.age),
      birthDate: this.dateTime.toIsoString(formData.birthDate),
      active: this.typeConverter.toBool(formData.active)
    };

    return this.http.post<ApiResponse>('/api/users', dto).pipe(
      map(response => {
        const parsed = this.apiResponse.parseHttpResponse(response);
        return this.objectMapper.map<ApiResponse, User>(parsed.data, User);
      })
    );
  }
}
```

---

## Best Practices

### 1. Use Services Consistently

```typescript
// Good
const age = this.typeConverter.toInt(formValue.age);

// Avoid
const age = Number(formValue.age);
```

### 2. Validate on Both Ends

```typescript
// Frontend validation
const result = this.validation.validate(formData);
if (!result.isValid) {
  return;
}

// Backend also validates
```

### 3. Use DTOs

```typescript
// Define clear data contracts
interface UserDto {
  id: number;
  username: string;
  email: string;
  createdAt: string;  // ISO string
}

// Map to domain model
const user = this.objectMapper.map<UserDto, User>(dto, User);
```

### 4. Handle Dates Properly

```typescript
// Always use ISO strings for API
const isoString = this.dateTime.toIsoString(date);

// Parse on receive
const date = this.dateTime.parse(isoString);
```

### 5. Sanitize User Input

```typescript
// Use validation and encoding
const isValid = this.stringTransform.isEmail(input);
const safeHtml = this.encodingService.htmlEncode(userInput);
```

---

## Related Documentation

- [API Patterns](03-API_PATTERNS.md)
- [Testing Guide](04-TESTING_GUIDE.md)
- [Backend Data Transform](../../docs/DATA_TRANSFORM_GUIDE.md)
