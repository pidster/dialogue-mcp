/**
 * Question pattern types for structured dialogue
 */

import { BaseEntity, UUID, ConfidenceLevel, ContextCategory, ExpertiseLevel } from './common.js';

/**
 * The 10 question pattern types from the design document
 */
export enum PatternType {
  DEFINITION_SEEKING = 'definition_seeking',
  ASSUMPTION_EXCAVATION = 'assumption_excavation',
  CONSISTENCY_TESTING = 'consistency_testing',
  CONCRETE_INSTANTIATION = 'concrete_instantiation',
  NECESSITY_TESTING = 'necessity_testing',
  CONCEPTUAL_CLARITY = 'conceptual_clarity',
  EPISTEMIC_HUMILITY = 'epistemic_humility',
  SOLUTION_SPACE_MAPPING = 'solution_space_mapping',
  IMPACT_ANALYSIS = 'impact_analysis',
  VALUE_CLARIFICATION = 'value_clarification',
}

/**
 * Context triggers that determine when a pattern should be used
 */
export interface PatternTrigger {
  readonly keyword: string;
  readonly contextCategory: ContextCategory;
  readonly weight: ConfidenceLevel;
  readonly requiredExpertise?: ExpertiseLevel;
}

/**
 * Variables that can be substituted in question templates
 */
export interface QuestionVariable {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'concept' | 'assumption' | 'goal' | 'constraint';
  readonly required: boolean;
  readonly defaultValue?: string;
}

/**
 * Follow-up pattern triggered by specific response types
 */
export interface FollowUpPattern {
  readonly triggerType: 'assumption_detected' | 'vague_answer' | 'contradiction' | 'new_concept';
  readonly triggerPattern: string; // Regex or keyword pattern
  readonly nextPatternType: PatternType;
  readonly priority: ConfidenceLevel;
}

/**
 * Expected insights from using this pattern
 */
export interface ExpectedInsight {
  readonly type: 'assumption' | 'definition' | 'constraint' | 'requirement' | 'contradiction';
  readonly description: string;
  readonly likelihood: ConfidenceLevel;
}

/**
 * Core question pattern definition
 */
export interface QuestionPattern extends BaseEntity {
  readonly type: PatternType;
  readonly name: string;
  readonly description: string;
  readonly template: string; // Template with variables like {{concept}} or {{assumption}}
  readonly variables: readonly QuestionVariable[];
  readonly triggers: readonly PatternTrigger[];
  readonly followUpPatterns: readonly FollowUpPattern[];
  readonly expectedInsights: readonly ExpectedInsight[];
  readonly contextCategories: readonly ContextCategory[];
  readonly minExpertiseLevel: ExpertiseLevel;
  readonly maxDepth: number; // Maximum recursion depth for this pattern
  readonly examples: readonly string[]; // Example questions using this pattern
}

/**
 * Generated question instance
 */
export interface GeneratedQuestion extends BaseEntity {
  readonly patternId: UUID;
  readonly patternType: PatternType;
  readonly text: string;
  readonly context: QuestionContext;
  readonly variables: Record<string, string>; // Resolved variable values
  readonly depth: number; // How deep in the questioning chain
  readonly parentQuestionId?: UUID;
  readonly expectedResponseType:
    | 'definition'
    | 'explanation'
    | 'example'
    | 'justification'
    | 'clarification';
}

/**
 * Context for question generation
 */
export interface QuestionContext {
  readonly category: ContextCategory;
  readonly userExpertise: ExpertiseLevel;
  readonly projectPhase: string;
  readonly previousQuestions: readonly UUID[];
  readonly extractedConcepts: readonly string[];
  readonly detectedAssumptions: readonly string[];
  readonly knownDefinitions: readonly string[];
  readonly currentFocus: string;
  readonly metadata: Record<string, unknown>;
}

/**
 * User response analysis
 */
export interface ResponseAnalysis {
  readonly questionId: UUID;
  readonly response: string;
  readonly analyzedAt: Date;
  readonly extractedConcepts: readonly string[];
  readonly detectedAssumptions: readonly string[];
  readonly identifiedContradictions: readonly string[];
  readonly clarityScore: ConfidenceLevel; // How clear/specific the response was
  readonly completenessScore: ConfidenceLevel; // How complete the response was
  readonly suggestedFollowUps: readonly PatternType[];
  readonly newInsights: readonly string[];
}

/**
 * Question selection criteria
 */
export interface QuestionSelection {
  readonly context: QuestionContext;
  readonly excludePatterns?: readonly PatternType[];
  readonly preferPatterns?: readonly PatternType[];
  readonly maxDepth?: number;
  readonly focusArea?: string;
  readonly urgentInsights?: readonly string[];
}

/**
 * Pattern effectiveness metrics
 */
export interface PatternEffectiveness {
  readonly patternType: PatternType;
  readonly timesUsed: number;
  readonly averageInsightQuality: ConfidenceLevel;
  readonly averageUserSatisfaction: ConfidenceLevel;
  readonly successfulFollowUps: number;
  readonly contextSuccess: Record<ContextCategory, ConfidenceLevel>;
  readonly expertiseSuccess: Record<ExpertiseLevel, ConfidenceLevel>;
}

/**
 * Dialogue flow state
 */
export interface DialogueFlow {
  readonly sessionId: UUID;
  readonly currentDepth: number;
  readonly questionHistory: readonly UUID[];
  readonly conceptsExplored: readonly string[];
  readonly assumptionsUncovered: readonly string[];
  readonly contradictionsFound: readonly string[];
  readonly insightsGained: readonly string[];
  readonly nextSuggestedPatterns: readonly PatternType[];
  readonly flowState: 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding';
}
