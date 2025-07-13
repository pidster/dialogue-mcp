# dialogue-mcp

A Model Context Protocol (MCP) server that provides Socratic dialogue capabilities for problem-solving and decision-making. The server uses Streamable HTTP transport for modern MCP client compatibility.

## Features

- **10 Socratic Questioning Patterns**: Definition Seeking, Assumption Excavation, Consistency Testing, and more
- **Intelligent Pattern Selection**: Context-aware selection based on dialogue flow and user expertise
- **Dynamic Question Generation**: Template-based system with variable extraction
- **Dialogue Flow Management**: Tracks conversation states (exploring, deepening, clarifying, synthesizing, concluding)
- **Response Analysis**: Extracts insights, assumptions, and contradictions from user responses
- **Session Management**: Supports multiple concurrent dialogue sessions with stateful Streamable HTTP

## Installation

```bash
npm install
npm run build
```

## Starting the Server

```bash
npm start
```

The server will start on `http://localhost:3000` by default. You can configure the host and port using environment variables:

```bash
PORT=8080 HOST=0.0.0.0 npm start
```

## Streamable HTTP Transport

This server implements the modern Streamable HTTP transport as specified in the MCP protocol. This transport combines the benefits of traditional HTTP request/response with optional Server-Sent Events (SSE) for server-initiated messages.

### Endpoints

#### Health Check
```
GET /health
```
Returns server status and active session count.

#### MCP Endpoint
```
POST /mcp
Headers:
  - Accept: application/json, text/event-stream (optional, for SSE)
  - Content-Type: application/json
  - Mcp-Session-Id: <session-id> (optional, returned after first request)
Body: JSON-RPC 2.0 message
```

The main MCP endpoint that handles all protocol communication. On the first request, the server will return a session ID in the `Mcp-Session-Id` response header. Include this header in all subsequent requests to maintain session state.

## MCP Tools Available

### 1. `start_dialogue`
Starts a new Socratic dialogue session.

**Parameters:**
- `title` (required): Title for the dialogue session
- `focus` (required): Primary focus area or topic
- `description` (optional): Description of what to explore
- `category` (optional): Context category (e.g., PROJECT_INCEPTION, TECHNICAL_DESIGN)
- `expertise` (optional): User expertise level (BEGINNER, INTERMEDIATE, EXPERT)

### 2. `ask_question`
Generates a Socratic question based on the current context.

**Parameters:**
- `sessionId` (required): ID of the dialogue session

### 3. `submit_response`
Submits a response to the current question.

**Parameters:**
- `sessionId` (required): ID of the dialogue session
- `response` (required): User response to the question

### 4. `get_session_insights`
Retrieves insights and analysis from the dialogue session.

**Parameters:**
- `sessionId` (required): ID of the dialogue session

### 5. `analyze_flow`
Analyzes the current dialogue flow and provides recommendations.

**Parameters:**
- `sessionId` (required): ID of the dialogue session

## Complete Workflow Example

Here's a step-by-step example of a complete Socratic dialogue session:

### 1. Start the Server
```bash
npm run build && npm start
```

### 2. Initialize MCP Connection
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {}
    },
    "id": 1
  }'
```

Save the `Mcp-Session-Id` from response headers.

### 3. Start a Dialogue Session
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "start_dialogue",
      "arguments": {
        "title": "Architecture Decision",
        "description": "Deciding on database technology for a new web application",
        "category": "architecture_review",
        "focus": "database selection"
      }
    },
    "id": 2
  }'
```

**Response:**
```
Started new Socratic dialogue session: session-1752434292859
Title: Architecture Decision
Focus: database selection

Session is ready. Use 'ask_question' to generate the first question.
```

### 4. Generate First Question
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "ask_question",
      "arguments": {
        "sessionId": "session-1752434292859"
      }
    },
    "id": 3
  }'
```

**Response:**
```
Question 1 (Pattern: solution_space_mapping)

What other approaches could solve database?

Confidence: 87%
Flow State: exploring
Alternatives: definition_seeking, assumption_excavation, consistency_testing

Submit your response using 'submit_response'.
```

### 5. Submit Response
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "submit_response",
      "arguments": {
        "sessionId": "session-1752434292859",
        "response": "I think we should use PostgreSQL because it offers ACID compliance, mature ecosystem, and good performance for complex queries. However, I am concerned about scaling horizontally."
      }
    },
    "id": 4
  }'
```

**Response:**
```
Response Analysis

Clarity: 33%
Completeness: 72%

Insights Extracted:
- Concepts: scaling, ACID
- Assumptions: because it offers ACID compliance, mature ecosystem, and good performance for complex queries.
- Contradictions: However, I am concerned about scaling horizontally.

Suggested Follow-ups: definition_seeking, conceptual_clarity, assumption_excavation

Use 'ask_question' to continue the dialogue.
```

### 6. Get Session Insights
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "get_session_insights",
      "arguments": {
        "sessionId": "session-1752434292859"
      }
    },
    "id": 5
  }'
```

**Response:**
```
Session Insights

Progress: 2 turns, depth 2

Discoveries:
- Assumptions: 1
- Definitions: 2  
- Contradictions: 1

Key Insights:
- Assumption: because it offers ACID compliance, mature ecosystem, and good performance for complex queries.
- Definition: scaling
- Definition: ACID
- Contradiction: However, I am concerned about scaling horizontally.
```

## Example Client Usage

### Using curl:

1. **Initialize and start a dialogue:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {}
    },
    "id": 1
  }'
```

Save the `Mcp-Session-Id` from the response headers.

2. **Call a tool (with session ID):**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "start_dialogue",
      "arguments": {
        "title": "System Architecture Design",
        "focus": "microservices architecture"
      }
    },
    "id": 2
  }'
```

### JavaScript/TypeScript Client Example:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client';

// When official Streamable HTTP transport is available in the SDK
const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  { capabilities: {} }
);

// Connect to the server
const transport = new StreamableHttpClientTransport('http://localhost:3000/mcp');
await client.connect(transport);

// Use the tools
const result = await client.callTool('start_dialogue', {
  title: 'Problem Solving Session',
  focus: 'system optimization'
});
```

### Using with SSE for server-initiated messages:

```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Mcp-Session-Id: YOUR_SESSION_ID" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "ask_question",
      "arguments": {
        "sessionId": "session-123"
      }
    },
    "id": 3
  }'
```

## Structured Logging

The server uses Pino for high-performance structured logging, providing production-ready observability:

### Features
- **JSON-structured logs** for easy parsing and aggregation
- **Session-aware logging** with automatic context propagation
- **Performance metrics** tracking operation durations
- **Request/response logging** with correlation IDs
- **Sensitive data redaction** (passwords, tokens, etc.)
- **Single-line JSON** by default (log aggregator friendly)
- **Optional pretty printing** for local development

### Configuration
```bash
# Set log level (debug, info, warn, error)
LOG_LEVEL=debug npm start

# Production mode (always JSON output)
NODE_ENV=production npm start

# Development mode with pretty printing (multi-line, colored)
PRETTY_LOGS=true npm start

# Development mode without pretty printing (single-line JSON, default)
npm start

# Custom hostname
HOSTNAME=my-server npm start
```

### Log Structure
Each log entry includes:
- `time`: ISO timestamp
- `level`: Log level (debug/info/warn/error)
- `service`: Always "dialogue-mcp"
- `environment`: development/production
- `sessionId`: Dialogue session ID (when applicable)
- `operation`: Current operation being performed
- `duration`: Operation duration in milliseconds
- Additional context fields based on the operation

### Example Log Output
```json
{
  "level": "info",
  "time": "2025-07-13T19:30:00.000Z",
  "pid": 12345,
  "hostname": "server-1",
  "service": "dialogue-mcp",
  "environment": "production",
  "sessionId": "session-1752434292859",
  "operation": "ask_question",
  "pattern": "solution_space_mapping",
  "confidence": 0.87,
  "flowState": "exploring",
  "duration": 45,
  "msg": "Generated Socratic question"
}
```

### Monitored Operations
- **Server lifecycle**: startup, shutdown, errors
- **HTTP requests**: method, URL, duration, status
- **Session management**: creation, closure
- **Dialogue operations**: 
  - `start_dialogue`: Session initialization
  - `ask_question`: Pattern selection and question generation
  - `submit_response`: Response analysis and insight extraction
  - `get_session_insights`: Insight summarization
  - `analyze_flow`: Flow state analysis
- **Pattern effectiveness**: tracking which patterns generate insights
- **Error scenarios**: with full stack traces and context

## Development

```bash
# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Architecture

The server consists of several key components:

- **PatternLibrary**: Manages 10 different Socratic questioning patterns
- **QuestionSelector**: Intelligently selects the best pattern based on context
- **TemplateEngine**: Generates questions from templates with variable substitution
- **DialogueFlowManager**: Manages conversation state transitions
- **ResponseAnalyzer**: Extracts insights from user responses
- **StreamableHttpServerTransport**: Custom implementation of the Streamable HTTP transport

## Transport Implementation

The Streamable HTTP transport implementation (`streamable-http-transport.ts`) provides:

- Single endpoint for all MCP communication
- Session management with secure session IDs
- Support for both request/response and SSE streaming
- Automatic cleanup on session disconnect
- Compatibility with the latest MCP specification

## Contributing

Contributions are welcome! Please ensure all tests pass and code is properly formatted before submitting a pull request.

## License

MIT