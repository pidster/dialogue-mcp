/**
 * Session and dialogue context types for managing conversation state
 */

import {
  BaseEntity,
  UUID,
  ConfidenceLevel,
  ContextCategory,
  ExpertiseLevel,
  ProjectPhase,
} from './common.js';
import { PatternType } from './patterns.js';
import { DecisionStatus } from './decisions.js';
import { KnowledgeNodeType } from './knowledge.js';

/**
 * Session status lifecycle
 */
export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

/**
 * Dialogue turn representing a single question-response exchange
 */
export interface DialogueTurn extends BaseEntity {
  readonly questionId?: UUID;
  readonly questionText: string;
  readonly questionPattern: PatternType;
  readonly responseText?: string;
  readonly responseAnalysisId?: UUID;
  readonly turnNumber: number;
  readonly depth: number;
  readonly duration?: number; // milliseconds
  readonly userSatisfaction?: number; // 1-5 rating
  readonly insights: readonly string[];
  readonly followUpGenerated: boolean;
}

/**
 * Session participant information
 */
export interface SessionParticipant {
  readonly id: UUID;
  readonly name: string;
  readonly role: 'facilitator' | 'participant' | 'observer' | 'system';
  readonly expertiseLevel: ExpertiseLevel;
  readonly joinedAt: Date;
  readonly lastActiveAt: Date;
  readonly contributionCount: number;
}

/**
 * Session objectives and goals
 */
export interface SessionObjective {
  readonly id: UUID;
  readonly description: string;
  readonly priority: number;
  readonly completed: boolean;
  readonly completedAt?: Date;
  readonly successCriteria: readonly string[];
  readonly achievedInsights: readonly string[];
}

/**
 * Session configuration and preferences
 */
export interface SessionConfig {
  readonly maxDepth: number;
  readonly maxTurns: number;
  readonly timeLimit?: number; // minutes
  readonly focusAreas: readonly ContextCategory[];
  readonly enabledPatterns: readonly PatternType[];
  readonly adaptToExpertise: boolean;
  readonly autoFollowUp: boolean;
  readonly requireValidation: boolean;
  readonly persistDecisions: boolean;
}

/**
 * Current dialogue context and state
 */
export interface DialogueContext {
  readonly sessionId: UUID;
  readonly currentCategory: ContextCategory;
  readonly projectPhase: ProjectPhase;
  readonly focusArea: string;
  readonly currentDepth: number;
  readonly turnCount: number;
  readonly lastQuestionId?: UUID;
  readonly awaitingResponse: boolean;
  readonly conversationFlow:
    | 'exploring'
    | 'deepening'
    | 'clarifying'
    | 'synthesizing'
    | 'concluding';
  readonly activeTopics: readonly string[];
  readonly exploredConcepts: readonly string[];
  readonly pendingFollowUps: readonly PatternType[];
  readonly userEngagement: ConfidenceLevel;
  readonly progressTowardsGoals: ConfidenceLevel;
}

/**
 * Session insights and discoveries
 */
export interface SessionInsights {
  readonly assumptionsUncovered: readonly string[];
  readonly definitionsClarified: readonly string[];
  readonly contradictionsFound: readonly string[];
  readonly requirementsIdentified: readonly string[];
  readonly constraintsDiscovered: readonly string[];
  readonly decisionsInfluenced: readonly UUID[];
  readonly knowledgeNodesCreated: readonly UUID[];
  readonly patternEffectiveness: Record<PatternType, ConfidenceLevel>;
  readonly insightQuality: ConfidenceLevel;
}

/**
 * Session statistics and metrics
 */
export interface SessionMetrics {
  readonly totalTurns: number;
  readonly averageTurnDuration: number;
  readonly deepestLevel: number;
  readonly patternsUsed: Record<PatternType, number>;
  readonly insightsPerTurn: number;
  readonly userSatisfactionAverage: number;
  readonly objectivesCompleted: number;
  readonly contradictionsResolved: number;
  readonly knowledgeNodesGenerated: number;
  readonly decisionsMade: number;
}

/**
 * Main session entity
 */
export interface DialogueSession extends BaseEntity {
  readonly title: string;
  readonly description?: string;
  readonly status: SessionStatus;
  readonly config: SessionConfig;
  readonly participants: readonly SessionParticipant[];
  readonly objectives: readonly SessionObjective[];
  readonly context: DialogueContext;
  readonly turns: readonly UUID[]; // DialogueTurn IDs
  readonly insights: SessionInsights;
  readonly metrics: SessionMetrics;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly lastActivityAt: Date;
  readonly tags: readonly string[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Session query parameters
 */
export interface SessionQuery {
  readonly status?: SessionStatus;
  readonly participantId?: UUID;
  readonly category?: ContextCategory;
  readonly tags?: readonly string[];
  readonly createdAfter?: Date;
  readonly createdBefore?: Date;
  readonly hasObjectives?: boolean;
  readonly minTurns?: number;
  readonly textSearch?: string;
}

/**
 * Session state snapshot for persistence
 */
export interface SessionSnapshot {
  readonly sessionId: UUID;
  readonly timestamp: Date;
  readonly context: DialogueContext;
  readonly recentTurns: readonly DialogueTurn[];
  readonly pendingQuestions: readonly string[];
  readonly knowledgeState: {
    readonly nodeCount: number;
    readonly relationshipCount: number;
    readonly lastUpdated: Date;
  };
  readonly decisionState: {
    readonly byStatus: Record<DecisionStatus, number>;
    readonly lastDecision?: UUID;
  };
}

/**
 * Session restoration data
 */
export interface SessionRestoration {
  readonly session: DialogueSession;
  readonly turns: readonly DialogueTurn[];
  readonly knowledgeNodes: readonly UUID[];
  readonly decisions: readonly UUID[];
  readonly patterns: readonly UUID[];
  readonly lastSnapshot: SessionSnapshot;
}

/**
 * Multi-session coordination for collaborative dialogues
 */
export interface SessionCoordination {
  readonly primarySessionId: UUID;
  readonly relatedSessionIds: readonly UUID[];
  readonly sharedContext: {
    readonly knowledgeGraphId: UUID;
    readonly sharedDecisions: readonly UUID[];
    readonly commonObjectives: readonly string[];
  };
  readonly coordinationRules: {
    readonly syncKnowledge: boolean;
    readonly shareDecisions: boolean;
    readonly allowConflicts: boolean;
  };
}

/**
 * Session export format
 */
export interface SessionExport {
  readonly session: DialogueSession;
  readonly fullTranscript: readonly {
    readonly turn: DialogueTurn;
    readonly analysis?: Record<string, unknown>;
  }[];
  readonly insightsSummary: readonly string[];
  readonly decisionsInfluenced: readonly {
    readonly decisionId: UUID;
    readonly influence: string;
    readonly confidence: ConfidenceLevel;
  }[];
  readonly knowledgeDiscovered: readonly {
    readonly type: KnowledgeNodeType;
    readonly content: string;
    readonly confidence: ConfidenceLevel;
  }[];
  readonly exportedAt: Date;
  readonly format: 'json' | 'markdown' | 'pdf' | 'xml';
}
