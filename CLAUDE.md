# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Socratic Dialogue MCP Server** - An MCP server providing LLM clients with Socratic questioning capabilities for problem-solving and decision tracking in software development.

## Architecture & Design

The system follows a comprehensive design documented in `docs/design/socratic-dialogue-design.md`. Key components:

- **Dialogue Engine**: Question pattern library, adaptive questioning, response analysis
- **Decision Tracking**: Knowledge graph of decisions with status transitions (to-be-made → provisional → firm → superseded)
- **MCP Integration**: Tools for decision CRUD, resources for question patterns
- **Knowledge Management**: Graph-based storage of assumptions, requirements, constraints, contradictions

## Development Commands

### Project Setup
```bash
npm install          # Install dependencies
npm run build        # Build TypeScript
npm run dev          # Development with hot reload
npm run test         # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # ESLint check
npm run lint:fix     # Fix linting issues
npm run format       # Prettier formatting
```

### MCP Server
```bash
npm run start        # Start MCP server
npm run mcp:test     # Test MCP integration
```

## Code Architecture

### Core Directory Structure
```
src/
├── types/           # TypeScript interfaces and types
├── dialogue/        # Socratic dialogue engine
├── decisions/       # Decision tracking service
├── knowledge/       # Knowledge graph implementation
├── mcp/            # MCP server implementation
├── patterns/       # Question pattern library
├── sessions/       # Session management
└── utils/          # Shared utilities

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test data
```

### Key Data Models

**Decision Model**: Track decisions with status transitions and relationships
**Question Pattern**: Socratic questioning templates with context triggers
**Knowledge Node**: Graph nodes for assumptions, definitions, requirements, constraints
**Session Context**: Persistent dialogue state and accumulated insights

## Development Guidelines

### Testing Requirements
- **100% test coverage** for core dialogue logic and decision tracking
- Unit tests for all question patterns and knowledge graph operations
- Integration tests for MCP server functionality
- Test fixtures for various dialogue scenarios

### Code Quality Standards
- Follow TypeScript strict mode
- Use ESLint + Prettier configuration
- Document all public APIs with TSDoc
- Implement proper error handling and logging

### Socratic Pattern Implementation
When adding new question patterns:
1. Define pattern type in `types/patterns.ts`
2. Add template and triggers to pattern library
3. Implement selection logic in question selector
4. Add comprehensive tests with example dialogues
5. Update pattern documentation

### Decision Tracking
When working with decisions:
- Always validate status transitions (to-be-made → provisional → firm → superseded)
- Update knowledge graph relationships when decisions change
- Run contradiction detection after decision updates
- Persist decision history for audit trails

### MCP Integration
- Expose decision operations as MCP tools
- Provide question patterns as MCP resources
- Implement proper error handling for MCP calls
- Test with actual MCP clients during development

## Key Implementation Notes

1. **Question Pattern Library**: Implement all 10 Socratic patterns from design document
2. **Adaptive Questioning**: Context-aware selection based on project phase and user expertise
3. **Knowledge Graph**: Use adjacency lists for decision relationships and contradiction detection
4. **Session Persistence**: JSON-based storage initially, SQLite for production
5. **Contradiction Detection**: Algorithm to identify conflicts in decision chains

## Testing Strategy

### Unit Tests
- All question pattern generators
- Decision status transition logic
- Knowledge graph operations
- Session management functions

### Integration Tests
- Full dialogue flows with multiple question patterns
- Decision tracking across session boundaries
- MCP server tool and resource operations
- Knowledge graph consistency validation

### User Acceptance Tests
- Real-world dialogue scenarios
- Decision tracking effectiveness
- Contradiction detection accuracy
- Overall system usability

## Project Organization

- Store plans in a plans/ directory using a file name format {year-month-day}-{version}-{brief topic}.md

## References

- Implementation Plan: `plans/2025-07-13-v1-socratic-dialogue-mcp-server.md`
- Design Document: `docs/design/socratic-dialogue-design.md`
- MCP SDK Documentation: https://modelcontextprotocol.io/
- TypeScript Style Guide: Follow Airbnb conventions