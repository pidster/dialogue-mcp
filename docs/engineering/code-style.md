# Code Style Guide for Dialogue MCP

## Overview

This document defines the coding standards and style guidelines for the Dialogue MCP Server project.

## TypeScript Standards

### General Principles
- Use TypeScript strict mode
- Prefer explicit types over inference for public APIs
- Avoid `any` type; use `unknown` when type is truly unknown
- Enable all strict compiler options

### Naming Conventions

#### Files and Directories
```typescript
// Files: kebab-case
dialogue-engine.ts
question-patterns.ts
decision-tracker.ts

// Test files: component.test.ts
dialogue-engine.test.ts

// Directories: kebab-case
src/dialogue-engine/
src/question-patterns/
```

#### Code Naming
```typescript
// Interfaces: PascalCase with 'I' prefix avoided
interface DialogueSession { }
interface QuestionPattern { }

// Classes: PascalCase
class DialogueEngine { }
class DecisionTracker { }

// Functions/Methods: camelCase
function generateQuestion() { }
function analyzeResponse() { }

// Constants: UPPER_SNAKE_CASE
const MAX_QUESTION_DEPTH = 10;
const DEFAULT_TIMEOUT = 30000;

// Enums: PascalCase with PascalCase values
enum QuestionType {
  DefinitionSeeking = 'definition-seeking',
  AssumptionExcavation = 'assumption-excavation'
}
```

### Type Definitions

#### Interface Structure
```typescript
// Good: Clear, well-documented interface
interface DialogueContext {
  /** Unique session identifier */
  sessionId: string;
  
  /** Current dialogue topic */
  topic: string;
  
  /** User's expertise level */
  expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  
  /** Accumulated insights from dialogue */
  insights: Insight[];
  
  /** Current question depth */
  depth: number;
}

// Bad: Unclear, undocumented
interface Context {
  id: string;
  t: string;
  e: number;
  i: any[];
}
```

#### Type vs Interface
```typescript
// Use interface for object shapes
interface SessionConfig {
  timeout: number;
  maxDepth: number;
}

// Use type for unions, intersections, and aliases
type SessionStatus = 'active' | 'paused' | 'completed';
type SessionId = string;
type ExtendedConfig = SessionConfig & { debug: boolean };
```

### Function Guidelines

#### Function Signatures
```typescript
// Good: Clear parameters and return type
function selectQuestionPattern(
  context: DialogueContext,
  previousResponses: Response[]
): QuestionPattern {
  // Implementation
}

// Bad: Unclear purpose and types
function process(data: any): any {
  // Implementation
}
```

#### Arrow Functions
```typescript
// Use for simple operations
const isActive = (session: Session): boolean => session.status === 'active';

// Use regular functions for methods
class DialogueEngine {
  // Good: Method as regular function
  generateQuestion(context: DialogueContext): Question {
    return this.selectPattern(context).generate();
  }
  
  // Avoid: Arrow function as method
  generateQuestion = (context: DialogueContext): Question => {
    return this.selectPattern(context).generate();
  }
}
```

### Error Handling

#### Custom Error Classes
```typescript
// Define specific error types
class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

class InvalidResponseError extends Error {
  constructor(response: string, reason: string) {
    super(`Invalid response: ${reason}`);
    this.name = 'InvalidResponseError';
  }
}
```

#### Error Handling Pattern
```typescript
// Good: Specific error handling
try {
  const session = await loadSession(sessionId);
  return session.process(response);
} catch (error) {
  if (error instanceof SessionNotFoundError) {
    logger.warn('Session not found, creating new session');
    return createNewSession(sessionId);
  }
  
  logger.error('Unexpected error processing response', { error });
  throw new ProcessingError('Failed to process response', { cause: error });
}

// Bad: Generic catch-all
try {
  // ... operations
} catch (e) {
  console.log('Error: ' + e);
  throw e;
}
```

### Async/Await Patterns

#### Consistent Async Usage
```typescript
// Good: Clear async flow
async function processDialogue(
  sessionId: string,
  response: string
): Promise<DialogueResult> {
  const session = await loadSession(sessionId);
  const analysis = await analyzeResponse(response);
  const nextQuestion = await generateFollowUp(session, analysis);
  
  await saveSession(session);
  
  return {
    analysis,
    nextQuestion,
    insights: session.insights
  };
}

// Avoid: Mixing promises and async/await
async function processDialogue(sessionId: string, response: string) {
  return loadSession(sessionId).then(session => {
    // Inconsistent style
  });
}
```

### Import Organization

#### Import Order
```typescript
// 1. Node built-ins
import { readFile } from 'fs/promises';
import { join } from 'path';

// 2. External dependencies
import { z } from 'zod';
import pino from 'pino';

// 3. Internal modules (absolute paths)
import { DialogueEngine } from '@/dialogue-engine';
import { QuestionPattern } from '@/patterns';

// 4. Internal modules (relative paths)
import { validateResponse } from './validators';
import { SessionStorage } from './storage';

// 5. Types
import type { DialogueContext, Question } from './types';
```

## Code Organization

### Module Structure
```typescript
// Good: Clear separation of concerns
// dialogue-engine/index.ts
export { DialogueEngine } from './engine';
export { DialogueContext, DialogueResult } from './types';
export { createDefaultEngine } from './factory';

// dialogue-engine/engine.ts
export class DialogueEngine {
  // Implementation
}

// dialogue-engine/types.ts
export interface DialogueContext { }
export interface DialogueResult { }
```

### File Length Guidelines
- Keep files under 300 lines
- Split large classes into multiple files
- Use barrel exports for clean imports

## Documentation Standards

### TSDoc Comments
```typescript
/**
 * Generates a Socratic question based on the current dialogue context.
 * 
 * @param context - The current dialogue state and history
 * @param options - Optional configuration for question generation
 * @returns A question object with pattern type and follow-up strategy
 * 
 * @example
 * ```typescript
 * const question = engine.generateQuestion(context, {
 *   maxDepth: 5,
 *   pattern: 'assumption-excavation'
 * });
 * ```
 * 
 * @throws {InvalidContextError} If context is missing required fields
 */
function generateQuestion(
  context: DialogueContext,
  options?: QuestionOptions
): Question {
  // Implementation
}
```

### Inline Comments
```typescript
// Good: Explains why, not what
// Use exponential backoff to avoid overwhelming the system
const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);

// Bad: Explains what (obvious from code)
// Increment counter by 1
counter++;
```

## Testing Standards

### Test File Naming
```typescript
// Component tests
dialogue-engine.test.ts
question-selector.test.ts

// Integration tests
mcp-integration.test.ts
session-persistence.test.ts
```

### Test Structure
```typescript
describe('DialogueEngine', () => {
  let engine: DialogueEngine;
  
  beforeEach(() => {
    engine = new DialogueEngine(testConfig);
  });
  
  describe('generateQuestion', () => {
    it('should select appropriate pattern for beginner', () => {
      // Test implementation
    });
    
    it('should increase depth for follow-up questions', () => {
      // Test implementation
    });
  });
});
```

## Linting and Formatting

### ESLint Configuration
- Extends: `@typescript-eslint/recommended`
- Additional rules for MCP project standards
- No console.log in production code
- Enforce consistent return types

### Prettier Configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "always"
}
```

## Git Commit Standards

### Commit Message Format
```
type(scope): subject

body

footer
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test additions/changes
- `chore`: Build/tool changes

### Examples
```
feat(dialogue): add assumption excavation pattern

Implements the "why chain" questioning technique to uncover
hidden assumptions in user responses.

Closes #123
```

## Performance Guidelines

### Optimization Rules
1. Profile before optimizing
2. Avoid premature optimization
3. Document performance-critical code
4. Use appropriate data structures

### Memory Management
```typescript
// Good: Clear lifecycle management
class SessionManager {
  private sessions = new Map<string, Session>();
  private readonly maxSessions = 1000;
  
  addSession(session: Session): void {
    if (this.sessions.size >= this.maxSessions) {
      this.evictOldestSession();
    }
    this.sessions.set(session.id, session);
  }
  
  private evictOldestSession(): void {
    // LRU eviction logic
  }
}
```

## Security Guidelines

### Input Validation
```typescript
// Always validate external input
const ResponseSchema = z.object({
  sessionId: z.string().uuid(),
  response: z.string().min(1).max(10000),
  metadata: z.record(z.unknown()).optional()
});

function processResponse(input: unknown): ProcessedResponse {
  const validated = ResponseSchema.parse(input);
  // Process validated input
}
```

### Sensitive Data
- Never log sensitive information
- Sanitize error messages
- Use environment variables for secrets
- Implement proper session isolation