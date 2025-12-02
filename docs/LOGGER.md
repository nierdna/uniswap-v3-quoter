# Logger Documentation

## Overview

Custom lightweight logger với log levels và zero dependencies.

## Features

- ✅ **Log levels**: DEBUG, INFO, WARN, ERROR, SILENT
- ✅ **Configurable**: Enable/disable timestamp, set log level
- ✅ **Zero dependencies**: No external logging libraries
- ✅ **Lightweight**: ~120 lines of code
- ✅ **Dependency injection**: ILogger interface for testing
- ✅ **Environment variable**: LOG_LEVEL support

## Basic Usage

### Default Logger

```typescript
import { createLogger } from './src/utils';

const logger = createLogger('MyModule');

logger.info('Application started');
logger.debug('Debug information');
logger.warn('Warning message');
logger.error('Error occurred');
```

### With Configuration

```typescript
import { createLogger, LogLevel } from './src/utils';

const logger = createLogger('MyModule', {
  level: LogLevel.DEBUG,  // Show all logs including DEBUG
  enableTimestamp: true,  // Add ISO timestamp to logs
});

logger.debug('This will show because level is DEBUG');
```

## Log Levels

```typescript
enum LogLevel {
  DEBUG = 0,   // Detailed debugging information
  INFO = 1,    // General informational messages
  WARN = 2,    // Warning messages
  ERROR = 3,   // Error messages only
  SILENT = 4,  // No logging
}
```

### Setting Log Level

```typescript
const logger = createLogger('App');

// Change at runtime
logger.setLevel(LogLevel.DEBUG);

// Or via environment variable
// export LOG_LEVEL=DEBUG
const level = getDefaultLogLevel(); // Reads from process.env.LOG_LEVEL
```

## Environment Variables

Control logging via environment variables:

```bash
# Show only errors
export LOG_LEVEL=ERROR

# Show everything (debug mode)
export LOG_LEVEL=DEBUG

# Silent mode (no logs)
export LOG_LEVEL=SILENT

# Default (if not set)
# LOG_LEVEL=INFO
```

## Advanced Usage

### Dependency Injection

```typescript
import type { ILogger } from './src/utils';

class MyService {
  constructor(private logger: ILogger) {}

  doSomething() {
    this.logger.info('Doing something...');
  }
}

// In production
const service = new MyService(createLogger('MyService'));

// In tests
const service = new MyService(new SilentLogger());
```

### Silent Logger for Tests

```typescript
import { SilentLogger } from './src/utils';

describe('MyTests', () => {
  it('should work without logging', () => {
    const logger = new SilentLogger();
    const quoter = new QuoterV3(stateFetcher, logger);
    // No logs in test output
  });
});
```

## Usage in Library

### StateFetcher

```typescript
import { StateFetcher, createLogger, LogLevel } from './src';

// Default logger (INFO level)
const fetcher = new StateFetcher(provider);

// Custom logger
const logger = createLogger('Fetcher', { level: LogLevel.DEBUG });
const fetcher = new StateFetcher(provider, undefined, undefined, logger);
```

### WebSocketSubscriber

Logger is automatically created và passed from StateFetcher:

```typescript
// StateFetcher creates WS logger with same level
const fetcher = new StateFetcher(provider, undefined, wsConfig);
// WebSocket will use logger with [WS] prefix
```

## Output Format

### Without Timestamp

```
[StateFetcher] Pool state fetched in 123ms
[WS] Connected! Network: bnb (chainId: 56), Block: 70218474
[WS] Pool 0x36696169... updated (tick: -67226, liquidity: 730992689024036222658063)
```

### With Timestamp

```typescript
const logger = createLogger('App', { enableTimestamp: true });
```

```
2024-12-02T15:30:45.123Z [App] Application started
2024-12-02T15:30:45.456Z [App] Processing data...
```

## Benefits

### vs console.log Directly

| Feature | console.log | Logger |
|---------|-------------|--------|
| **Control verbosity** | ❌ | ✅ |
| **Disable in production** | ❌ | ✅ (SILENT) |
| **Prefix/context** | Manual | ✅ Auto |
| **Testing** | Hard | ✅ SilentLogger |
| **Different levels** | Manual | ✅ Built-in |
| **Environment control** | ❌ | ✅ LOG_LEVEL |

### vs winston/pino Libraries

| Feature | Logger (Custom) | winston/pino |
|---------|-----------------|--------------|
| **Bundle size** | 0KB (inline) | 500KB-1.5MB |
| **Dependencies** | 0 | Multiple |
| **Speed** | Fastest | Fast |
| **Features** | Basic | Advanced |
| **Complexity** | Simple | Complex |
| **For this project** | ✅ Perfect | ❌ Overkill |

## Examples

### Example 1: Control Verbosity

```typescript
// Development: Show everything
const logger = createLogger('Dev', { level: LogLevel.DEBUG });
logger.debug('Detailed info');
logger.info('Normal info');

// Production: Only errors
const logger = createLogger('Prod', { level: LogLevel.ERROR });
logger.debug('Hidden');
logger.info('Hidden');
logger.error('Shown!');
```

### Example 2: Module-specific Loggers

```typescript
const quoterLogger = createLogger('Quoter');
const wsLogger = createLogger('WebSocket');
const stateLogger = createLogger('State');

quoterLogger.info('Quote calculated');
wsLogger.info('Event received');
stateLogger.info('State updated');

// Output:
// [Quoter] Quote calculated
// [WebSocket] Event received
// [State] State updated
```

### Example 3: Testing

```typescript
import { SilentLogger } from './src/utils';

describe('StateFetcher', () => {
  it('should fetch without logging', async () => {
    const fetcher = new StateFetcher(
      provider,
      undefined,
      undefined,
      new SilentLogger()  // No log spam in tests!
    );
    
    await fetcher.fetchPoolState(poolAddress);
    // Clean test output
  });
});
```

## Future Extensions

If advanced features needed later:

### Add File Logging

```typescript
private log(level: string, message: string, ...args: any[]): void {
  const fullMessage = `${timestamp}${prefix} ${message}`;
  
  // Also write to file
  if (this.fileStream) {
    this.fileStream.write(fullMessage + '\n');
  }
  
  console.log(fullMessage, ...args);
}
```

### Add Structured Logging

```typescript
info(message: string, context?: object): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: 'INFO',
    prefix: this.prefix,
    message,
    ...context,
  };
  console.log(JSON.stringify(logEntry));
}
```

### Migrate to Library

Easy to swap implementation:

```typescript
// Currently
const logger: ILogger = createLogger('App');

// Migrate to winston
import winston from 'winston';
const logger: ILogger = winston.createLogger(...); // Same interface!
```

## Best Practices

1. **Create logger per module**
   ```typescript
   const logger = createLogger('ModuleName');
   ```

2. **Use appropriate levels**
   - `debug()` - Detailed debugging info
   - `info()` - General information
   - `warn()` - Warnings but not errors
   - `error()` - Errors and exceptions

3. **Control in production**
   ```bash
   # Production: Errors only
   LOG_LEVEL=ERROR node app.js
   
   # Development: Everything
   LOG_LEVEL=DEBUG node app.js
   ```

4. **Inject for testability**
   ```typescript
   class MyClass {
     constructor(private logger: ILogger) {}
   }
   
   // Production: real logger
   // Testing: SilentLogger
   ```

---

**Status**: ✅ Implemented  
**Lines of code**: ~120  
**Dependencies**: 0  
**Performance impact**: Negligible  
**Recommended**: Use everywhere instead of console.log

