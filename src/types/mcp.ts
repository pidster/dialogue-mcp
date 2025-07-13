/**
 * MCP (Model Context Protocol) integration types for server tools and resources
 */

import { UUID, ConfidenceLevel } from './common.js';
import { Decision, DecisionStatus, DecisionQuery } from './decisions.js';
import { QuestionPattern, SocraticPatternType } from './patterns.js';
import { DialogueSession } from './sessions.js';
import { KnowledgeNode, KnowledgeNodeType, GraphQuery } from './knowledge.js';

/**
 * MCP Tool definitions for decision operations
 */
export interface McpDecisionTools {
  /**
   * Create a new decision
   */
  createDecision: {
    arguments: {
      title: string;
      description: string;
      context: string;
      sessionId: UUID;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      tags?: string[];
    };
    result: Decision;
  };

  /**
   * Update an existing decision
   */
  updateDecision: {
    arguments: {
      id: UUID;
      title?: string;
      description?: string;
      status?: DecisionStatus;
      rationale?: string;
      confidence?: ConfidenceLevel;
    };
    result: Decision;
  };

  /**
   * Get decisions by query
   */
  getDecisions: {
    arguments: DecisionQuery;
    result: Decision[];
  };

  /**
   * Add relationship between decisions
   */
  addDecisionRelationship: {
    arguments: {
      fromDecisionId: UUID;
      toDecisionId: UUID;
      type: 'depends_on' | 'conflicts_with' | 'influences' | 'supersedes' | 'enables' | 'requires';
      description: string;
    };
    result: { success: boolean; relationshipId: UUID };
  };

  /**
   * Detect contradictions in decision chain
   */
  detectContradictions: {
    arguments: {
      sessionId?: UUID;
      decisionIds?: UUID[];
    };
    result: {
      contradictions: Array<{
        decisionIds: UUID[];
        description: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        confidence: ConfidenceLevel;
      }>;
    };
  };
}

/**
 * MCP Tool definitions for dialogue operations
 */
export interface McpDialogueTools {
  /**
   * Start a new dialogue session
   */
  startDialogue: {
    arguments: {
      title: string;
      description?: string;
      category:
        | 'project_inception'
        | 'architecture_review'
        | 'requirements_refinement'
        | 'implementation_planning'
        | 'code_review';
      objectives: string[];
      participantExpertise: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    };
    result: DialogueSession;
  };

  /**
   * Generate next Socratic question
   */
  generateQuestion: {
    arguments: {
      sessionId: UUID;
      context?: string;
      focusArea?: string;
      maxDepth?: number;
      preferredPatterns?: SocraticPatternType[];
      excludePatterns?: SocraticPatternType[];
    };
    result: {
      question: string;
      pattern: SocraticPatternType;
      depth: number;
      expectedInsights: string[];
      questionId: UUID;
    };
  };

  /**
   * Submit response to question
   */
  submitResponse: {
    arguments: {
      questionId: UUID;
      response: string;
      sessionId: UUID;
    };
    result: {
      analysis: {
        extractedConcepts: string[];
        detectedAssumptions: string[];
        identifiedContradictions: string[];
        clarityScore: ConfidenceLevel;
        suggestedFollowUps: SocraticPatternType[];
      };
      generatedInsights: string[];
      createdKnowledgeNodes: UUID[];
    };
  };

  /**
   * Get session insights summary
   */
  getSessionInsights: {
    arguments: {
      sessionId: UUID;
    };
    result: {
      assumptionsUncovered: string[];
      definitionsClarified: string[];
      contradictionsFound: string[];
      decisionsInfluenced: UUID[];
      insightQuality: ConfidenceLevel;
    };
  };
}

/**
 * MCP Tool definitions for knowledge graph operations
 */
export interface McpKnowledgeTools {
  /**
   * Add knowledge node
   */
  addKnowledgeNode: {
    arguments: {
      type: KnowledgeNodeType;
      title: string;
      content: string;
      sessionId: UUID;
      confidence?: ConfidenceLevel;
      tags?: string[];
    };
    result: KnowledgeNode;
  };

  /**
   * Query knowledge graph
   */
  queryKnowledge: {
    arguments: GraphQuery;
    result: {
      nodes: KnowledgeNode[];
      relationships: Array<{
        id: UUID;
        fromNodeId: UUID;
        toNodeId: UUID;
        type: string;
        strength: ConfidenceLevel;
      }>;
      totalCount: number;
    };
  };

  /**
   * Validate knowledge consistency
   */
  validateConsistency: {
    arguments: {
      sessionId?: UUID;
      nodeIds?: UUID[];
    };
    result: {
      isConsistent: boolean;
      violations: Array<{
        nodeIds: UUID[];
        rule: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        description: string;
      }>;
      consistencyScore: ConfidenceLevel;
    };
  };
}

/**
 * MCP Resource definitions for question patterns
 */
export interface McpQuestionPatternResources {
  /**
   * List all available question patterns
   */
  'question-patterns': {
    uri: 'question-patterns://list';
    mimeType: 'application/json';
    content: QuestionPattern[];
  };

  /**
   * Get specific pattern by type
   */
  'question-pattern': {
    uri: `question-patterns://${SocraticPatternType}`;
    mimeType: 'application/json';
    content: QuestionPattern;
  };

  /**
   * Get pattern effectiveness metrics
   */
  'pattern-effectiveness': {
    uri: 'question-patterns://effectiveness';
    mimeType: 'application/json';
    content: Record<
      SocraticPatternType,
      {
        timesUsed: number;
        averageInsightQuality: ConfidenceLevel;
        contextSuccess: Record<string, ConfidenceLevel>;
      }
    >;
  };
}

/**
 * MCP Resource definitions for session data
 */
export interface McpSessionResources {
  /**
   * Get session transcript
   */
  'session-transcript': {
    uri: `sessions://${UUID}/transcript`;
    mimeType: 'text/markdown';
    content: string;
  };

  /**
   * Get session knowledge graph
   */
  'session-knowledge': {
    uri: `sessions://${UUID}/knowledge`;
    mimeType: 'application/json';
    content: {
      nodes: KnowledgeNode[];
      relationships: Array<{
        fromNodeId: UUID;
        toNodeId: UUID;
        type: string;
        strength: ConfidenceLevel;
      }>;
    };
  };

  /**
   * Get session decisions
   */
  'session-decisions': {
    uri: `sessions://${UUID}/decisions`;
    mimeType: 'application/json';
    content: Decision[];
  };
}

/**
 * Combined MCP server interface
 */
export interface McpServerInterface {
  tools: McpDecisionTools & McpDialogueTools & McpKnowledgeTools;
  resources: McpQuestionPatternResources & McpSessionResources;
}

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly capabilities: {
    readonly tools: readonly string[];
    readonly resources: readonly string[];
  };
  readonly maxSessions: number;
  readonly sessionTimeout: number; // minutes
  readonly persistentStorage: boolean;
  readonly enableLogging: boolean;
}

/**
 * MCP error responses
 */
export interface McpError {
  readonly code: number;
  readonly message: string;
  readonly data?: {
    readonly type: string;
    readonly details: Record<string, unknown>;
  };
}

/**
 * MCP tool execution context
 */
export interface McpToolContext {
  readonly toolName: string;
  readonly sessionId?: UUID;
  readonly userId?: string;
  readonly timestamp: Date;
  readonly metadata: Record<string, unknown>;
}
