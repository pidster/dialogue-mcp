# Development Runbook

## Overview

This runbook covers the current development setup and operations for the Dialogue MCP Server. Note: The server is currently in development phase with in-memory storage only.

## Current State

The Dialogue MCP Server is a development-stage implementation with:
- HTTP server with MCP endpoint
- In-memory session storage (not persistent)
- Basic health monitoring
- Environment-based configuration

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm package manager
- Git

### Initial Setup
```bash
# Clone repository
git clone https://github.com/pidster/dialogue-mcp.git
cd dialogue-mcp

# Install dependencies
npm install

# Run tests to verify setup
npm test
```

### Running the Server

#### Development Mode (with hot reload)
```bash
npm run dev
```

#### Production Build
```bash
# Build TypeScript
npm run build

# Run compiled server
npm start
```

### Environment Configuration

Create a `.env` file for local configuration:

```bash
# Server Configuration
HOST=localhost
PORT=3000
REQUEST_TIMEOUT_MS=30000
ENABLE_CORS=true

# Session Configuration
SESSION_MAX_DEPTH=10
SESSION_MAX_TURNS=50
SESSION_TIMEOUT_MINUTES=30

# Logging
LOG_LEVEL=info
PRETTY_LOGS=true
```

## Available Endpoints

### Health Check
```bash
GET http://localhost:3000/health

# Response:
{
  "status": "healthy",
  "name": "dialogue-mcp",
  "version": "1.0.0",
  "activeSessions": 0,
  "activeTransports": 0
}
```

### MCP Endpoint
```bash
POST http://localhost:3000/mcp
Content-Type: application/json

# List available tools
{
  "jsonrpc": "2.0",
  "method": "tools/list",
  "id": 1
}
```

## Development Workflow

### Code Quality Checks
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Testing a Dialogue Session

1. Start the server:
   ```bash
   npm run dev
   ```

2. Use an MCP client to connect to `http://localhost:3000/mcp`

3. Start a dialogue:
   ```json
   {
     "jsonrpc": "2.0",
     "method": "tools/call",
     "params": {
       "name": "start_dialogue",
       "arguments": {
         "topic": "API Design",
         "context": "Choosing between REST and GraphQL",
         "expertise_level": "intermediate"
       }
     },
     "id": 2
   }
   ```

## Current Limitations

### Storage
- **Sessions are in-memory only** - all data lost on restart
- No database integration yet
- No backup/restore capability

### Production Readiness
- No clustering support
- No rate limiting
- No authentication
- Basic error handling only
- No metric collection beyond health check

## Monitoring During Development

### Log Monitoring
```bash
# View logs with pretty printing
LOG_LEVEL=debug PRETTY_LOGS=true npm run dev

# View raw JSON logs
PRETTY_LOGS=false npm run dev
```

### Session Monitoring
- Check `/health` endpoint for active session count
- Use debug logs to track session lifecycle
- Monitor memory usage as sessions accumulate

## Common Development Issues

### Port Already in Use
```bash
# Find process using port 3000
lsof -i :3000

# Use different port
PORT=3001 npm run dev
```

### TypeScript Build Errors
```bash
# Clean and rebuild
rm -rf dist/
npm run build
```

### Test Failures
```bash
# Run specific test file
npm test -- dialogue-engine.test.ts

# Update snapshots if needed
npm test -- -u
```

## Performance Considerations

### Memory Usage
- Each session stores full dialogue history
- No automatic session cleanup (only on transport close)
- Monitor memory usage during extended testing

### Response Times
- Target: <200ms for question generation
- Use `DEBUG=*` to see timing information
- Health endpoint useful for basic latency check

## Next Steps for Production

Before production deployment, the following must be implemented:

1. **Persistent Storage**
   - Replace in-memory Maps with database
   - Implement session persistence
   - Add backup/restore capability

2. **Operational Features**
   - Process management (PM2 or similar)
   - Graceful shutdown
   - Cluster mode support
   - Rate limiting

3. **Security**
   - Authentication mechanism
   - Request validation
   - Security headers
   - HTTPS support

4. **Monitoring**
   - Metrics collection
   - Distributed tracing
   - Log aggregation
   - Alert configuration

## Development Tips

### Debugging
```bash
# Enable all debug output
DEBUG=* npm run dev

# Debug specific module
DEBUG=dialogue:* npm run dev
```

### Testing Patterns
- Use the test fixtures in `tests/fixtures/`
- Each pattern has example test cases
- Run integration tests to verify MCP protocol

### Code Organization
- Follow the established directory structure
- Keep test coverage at 100% for core modules
- Document any new environment variables