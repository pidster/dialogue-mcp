/**
 * Common types used throughout the Dialogue MCP Server
 */

export type UUID = string;

export type Timestamp = Date;

/**
 * Base interface for all entities with common metadata
 */
export interface BaseEntity {
  readonly id: UUID;
  readonly createdAt: Timestamp;
  readonly updatedAt: Timestamp;
  readonly sessionId: UUID;
}

/**
 * Confidence level for various assessments and analyses
 */
export type ConfidenceLevel = number; // 0.0 to 1.0

/**
 * Priority levels for decisions, questions, and other prioritizable items
 */
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Context categories for different problem domains
 */
export enum ContextCategory {
  PROJECT_INCEPTION = 'project_inception',
  ARCHITECTURE_REVIEW = 'architecture_review',
  REQUIREMENTS_REFINEMENT = 'requirements_refinement',
  IMPLEMENTATION_PLANNING = 'implementation_planning',
  CODE_REVIEW = 'code_review',
  GENERAL = 'general',
}

/**
 * User expertise levels for adaptive questioning
 */
export enum ExpertiseLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert',
}

/**
 * Project phases for context-aware dialogue
 */
export enum ProjectPhase {
  PLANNING = 'planning',
  DESIGN = 'design',
  IMPLEMENTATION = 'implementation',
  TESTING = 'testing',
  REVIEW = 'review',
  MAINTENANCE = 'maintenance',
}

/**
 * Error types for consistent error handling
 */
export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  CONFLICT = 'conflict',
  PERMISSION_DENIED = 'permission_denied',
  INTERNAL_ERROR = 'internal_error',
  MCP_ERROR = 'mcp_error',
}

/**
 * Custom error class for dialogue system errors
 */
export class DialogueError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorType,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DialogueError';
  }
}
