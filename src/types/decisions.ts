/**
 * Decision tracking types for managing decision lifecycle and relationships
 */

import { BaseEntity, UUID, ConfidenceLevel, Priority } from './common.js';

/**
 * Decision status following the lifecycle: to-be-made → provisional → firm → superseded
 */
export enum DecisionStatus {
  TO_BE_MADE = 'to-be-made',
  PROVISIONAL = 'provisional',
  FIRM = 'firm',
  SUPERSEDED = 'superseded',
}

/**
 * Types of relationships between decisions
 */
export enum DecisionRelationshipType {
  DEPENDS_ON = 'depends_on',
  CONFLICTS_WITH = 'conflicts_with',
  INFLUENCES = 'influences',
  SUPERSEDES = 'supersedes',
  ENABLES = 'enables',
  REQUIRES = 'requires',
  CONTRADICTS = 'contradicts',
}

/**
 * Impact assessment for decisions
 */
export interface DecisionImpact {
  readonly area: string;
  readonly description: string;
  readonly severity: Priority;
  readonly confidence: ConfidenceLevel;
}

/**
 * Relationship between two decisions
 */
export interface DecisionRelationship {
  readonly id: UUID;
  readonly fromDecisionId: UUID;
  readonly toDecisionId: UUID;
  readonly type: DecisionRelationshipType;
  readonly description: string;
  readonly strength: ConfidenceLevel; // How strong is this relationship
  readonly detectedAt: Date;
  readonly validatedBy?: 'user' | 'system';
}

/**
 * Alternative options considered for a decision
 */
export interface DecisionAlternative {
  readonly id: UUID;
  readonly title: string;
  readonly description: string;
  readonly pros: string[];
  readonly cons: string[];
  readonly rejected: boolean;
  readonly rejectionReason?: string;
}

/**
 * History entry for decision changes
 */
export interface DecisionHistoryEntry {
  readonly id: UUID;
  readonly decisionId: UUID;
  readonly previousStatus: DecisionStatus;
  readonly newStatus: DecisionStatus;
  readonly changedAt: Date;
  readonly reason: string;
  readonly changedBy: 'user' | 'system';
  readonly context?: Record<string, unknown>;
}

/**
 * Core decision entity
 */
export interface Decision extends BaseEntity {
  readonly title: string;
  readonly description: string;
  readonly status: DecisionStatus;
  readonly context: string;
  readonly rationale?: string;
  readonly alternatives: readonly DecisionAlternative[];
  readonly impacts: readonly DecisionImpact[];
  readonly relationships: readonly UUID[]; // Decision IDs this relates to
  readonly tags: readonly string[];
  readonly priority: Priority;
  readonly confidence: ConfidenceLevel;
  readonly reviewDate?: Date;
  readonly dueDate?: Date;
}

/**
 * Decision query parameters for filtering and searching
 */
export interface DecisionQuery {
  readonly status?: DecisionStatus;
  readonly priority?: Priority;
  readonly tags?: readonly string[];
  readonly sessionId?: UUID;
  readonly hasRelationships?: boolean;
  readonly updatedAfter?: Date;
  readonly updatedBefore?: Date;
  readonly textSearch?: string;
}

/**
 * Decision validation result
 */
export interface DecisionValidation {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly canTransitionTo: readonly DecisionStatus[];
}

/**
 * Decision statistics for analysis
 */
export interface DecisionStats {
  readonly totalDecisions: number;
  readonly byStatus: Record<DecisionStatus, number>;
  readonly byPriority: Record<Priority, number>;
  readonly averageConfidence: ConfidenceLevel;
  readonly totalRelationships: number;
  readonly contradictions: number;
}
