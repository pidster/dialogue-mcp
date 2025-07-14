# Testing Standards for Dialogue MCP

## Overview

This document outlines the testing standards and practices specific to the Dialogue MCP Server project.

## Test Coverage Requirements

### Mandatory Coverage Targets
- **Core dialogue logic**: 100% coverage required
- **Decision tracking**: 100% coverage required
- **Question patterns**: 100% coverage required
- **MCP integration**: 95% minimum coverage
- **Utilities**: 90% minimum coverage

### Coverage Metrics
```bash
npm run test:coverage

# Expected output:
# - Line coverage: 100%
# - Branch coverage: 100%
# - Function coverage: 100%
# - Statement coverage: 100%
```

## Test Structure

### Directory Organization
```
tests/
├── unit/                  # Unit tests for individual components
│   ├── dialogue/         # Dialogue engine tests
│   ├── patterns/         # Question pattern tests
│   ├── decisions/        # Decision tracking tests
│   └── utils/           # Utility function tests
├── integration/          # Integration tests
│   ├── mcp/             # MCP server tests
│   ├── sessions/        # Session management tests
│   └── storage/         # Persistence tests
└── fixtures/            # Test data and mocks
    ├── dialogues/       # Sample dialogue flows
    ├── patterns/        # Pattern test cases
    └── responses/       # Mock responses
```

## Testing Patterns

### Unit Test Template
```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should handle normal cases', () => {
      // Arrange
      const input = createTestInput();
      
      // Act
      const result = component.method(input);
      
      // Assert
      expect(result).toMatchExpectedOutput();
    });
    
    it('should handle edge cases', () => {
      // Test boundary conditions
    });
    
    it('should handle error cases', () => {
      // Test error scenarios
    });
  });
});
```

### Dialogue Testing Pattern
```typescript
describe('Dialogue Flow', () => {
  it('should follow expected question sequence', () => {
    const session = createSession('architecture');
    
    // Initial question
    const q1 = session.start();
    expect(q1).toMatchPattern('definition-seeking');
    
    // Response and follow-up
    const q2 = session.respond('We need microservices');
    expect(q2).toMatchPattern('assumption-excavation');
    
    // Verify insights captured
    const insights = session.getInsights();
    expect(insights.assumptions).toContain({
      type: 'implicit',
      statement: 'Microservices are necessary'
    });
  });
});
```

### Pattern Testing Requirements
Each question pattern must have tests for:
1. Pattern selection logic
2. Question generation with variables
3. Response analysis
4. Follow-up generation
5. Edge case handling

## Test Data Management

### Fixtures
- Use realistic dialogue examples
- Include edge cases and error scenarios
- Version control all test data
- Document fixture purpose

### Mock Data Guidelines
```typescript
// Good: Descriptive, realistic mock
const mockDialogue = {
  topic: 'API Design',
  context: 'REST vs GraphQL decision',
  expertiseLevel: 'intermediate'
};

// Bad: Generic, unclear mock
const data = { t: 'test', c: 'ctx', e: 2 };
```

## Integration Testing

### MCP Server Tests
```typescript
describe('MCP Integration', () => {
  let server: DialogueMCPServer;
  
  beforeEach(() => {
    server = new DialogueMCPServer({ test: true });
  });
  
  it('should handle tool calls', async () => {
    const result = await server.callTool('start_dialogue', {
      topic: 'Database Selection'
    });
    
    expect(result).toHaveProperty('sessionId');
    expect(result).toHaveProperty('question');
  });
});
```

### Session Persistence Tests
- Test session creation and retrieval
- Verify data integrity across restarts
- Test concurrent session handling
- Validate session timeout behavior

## Performance Testing

### Response Time Requirements
```typescript
it('should respond within 200ms', async () => {
  const start = Date.now();
  await dialogueEngine.generateQuestion(context);
  const duration = Date.now() - start;
  
  expect(duration).toBeLessThan(200);
});
```

### Load Testing
- 100 concurrent sessions minimum
- Memory usage under 10MB per session
- No memory leaks over extended runs

## Test Execution

### Development Workflow
```bash
# Before committing
npm run test          # Run all tests
npm run test:unit     # Run unit tests only
npm run test:int      # Run integration tests
npm run lint          # Check code style
npm run format        # Format code
```

### CI/CD Requirements
- All tests must pass before merge
- Coverage reports generated for PRs
- Performance benchmarks tracked
- Integration tests run on multiple Node versions

## Special Testing Considerations

### Socratic Pattern Validation
- Each pattern must demonstrate its purpose
- Test cases should show pattern effectiveness
- Include counter-examples where pattern fails

### Knowledge Graph Testing
- Test relationship creation and traversal
- Verify contradiction detection accuracy
- Validate graph serialization/deserialization
- Test performance with large graphs

### Decision Tracking Tests
- Verify status transition rules
- Test decision relationship management
- Validate contradiction detection
- Ensure audit trail completeness

## Error Handling Tests

### Required Error Scenarios
1. Invalid session IDs
2. Malformed responses
3. Storage failures
4. Timeout conditions
5. Concurrent modification conflicts

### Error Message Standards
```typescript
// Good: Informative error
throw new Error('Session not found: ' + sessionId);

// Bad: Generic error
throw new Error('Error');
```

## Documentation Requirements

### Test Documentation
- Each test file must have a header comment explaining its purpose
- Complex test scenarios need inline documentation
- Maintain a test scenario catalog in fixtures/README.md

### Coverage Reports
- Generate HTML coverage reports
- Track coverage trends over time
- Document any justified coverage exceptions