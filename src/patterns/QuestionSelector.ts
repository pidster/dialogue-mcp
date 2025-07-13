/**
 * Intelligent question selector with adaptive logic for Socratic dialogue
 */

import { PatternType, PatternEffectiveness } from '../types/patterns.js';
import { DialogueContext } from '../types/sessions.js';
import { ContextCategory, ExpertiseLevel, ConfidenceLevel, UUID } from '../types/common.js';
import { PatternLibrary } from './PatternLibrary.js';

/**
 * Extended context for question selection combining dialogue and question contexts
 */
export interface SelectionContext extends DialogueContext {
  readonly userExpertise: ExpertiseLevel;
  readonly extractedConcepts: readonly string[];
  readonly detectedAssumptions: readonly string[];
  readonly knownDefinitions: readonly string[];
  readonly currentFocus: string;
  readonly category: ContextCategory; // Map from currentCategory for compatibility
  readonly previousQuestions: readonly UUID[];
  readonly metadata: Record<string, unknown>;
}

/**
 * Constraints for pattern selection
 */
export interface SelectionConstraints {
  readonly excludePatterns?: readonly PatternType[];
  readonly preferPatterns?: readonly PatternType[];
  readonly maxDepth?: number;
  readonly requireFreshPattern?: boolean; // Avoid recently used patterns
  readonly focusOnInsights?: readonly string[]; // Target specific insight types
}

/**
 * Scored pattern candidate
 */
export interface ScoredPattern {
  readonly pattern: PatternType;
  readonly score: ConfidenceLevel;
  readonly reasoning: readonly string[];
  readonly contextRelevance: ConfidenceLevel;
  readonly expertiseMatch: ConfidenceLevel;
  readonly flowAppropriate: ConfidenceLevel;
  readonly effectiveness: ConfidenceLevel;
  readonly freshness: ConfidenceLevel;
}

/**
 * Pattern selection result
 */
export interface SelectionResult {
  readonly selectedPattern: PatternType;
  readonly confidence: ConfidenceLevel;
  readonly alternatives: readonly ScoredPattern[];
  readonly reasoning: readonly string[];
  readonly suggestedFollowUps: readonly PatternType[];
}

/**
 * Dialogue flow analysis
 */
export interface FlowAnalysis {
  readonly currentState: 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding';
  readonly stateConfidence: ConfidenceLevel;
  readonly suggestedTransition?:
    | 'exploring'
    | 'deepening'
    | 'clarifying'
    | 'synthesizing'
    | 'concluding'
    | undefined;
  readonly patternsUsedInState: readonly PatternType[];
  readonly averageDepth: number;
  readonly varietyScore: ConfidenceLevel; // How varied the patterns have been
  readonly progressScore: ConfidenceLevel; // How well objectives are being met
}

/**
 * Pattern outcome for learning
 */
export interface PatternOutcome {
  readonly pattern: PatternType;
  readonly context: SelectionContext;
  readonly userSatisfaction?: number; // 1-5 rating
  readonly insightsGenerated: number;
  readonly followUpUsed: boolean;
  readonly ledToContradiction: boolean;
  readonly clarifiedDefinition: boolean;
  readonly uncoveredAssumption: boolean;
}

/**
 * Intelligent question selector that chooses optimal Socratic patterns
 */
export class QuestionSelector {
  private readonly patternLibrary: PatternLibrary;
  private readonly effectivenessData: Map<string, PatternEffectiveness>;
  private readonly recentPatterns: Map<string, PatternType[]>; // sessionId -> recent patterns

  constructor(patternLibrary: PatternLibrary) {
    this.patternLibrary = patternLibrary;
    this.effectivenessData = new Map();
    this.recentPatterns = new Map();
    this.initializeEffectivenessData();
  }

  /**
   * Select the best pattern for the given context
   */
  public selectBestPattern(
    context: SelectionContext,
    constraints?: SelectionConstraints
  ): SelectionResult {
    const eligiblePatterns = this.filterEligiblePatterns(context, constraints);
    const scoredPatterns = this.scorePatterns(eligiblePatterns, context, constraints);

    // Sort by score descending
    scoredPatterns.sort((a, b) => b.score - a.score);

    const selectedPattern = scoredPatterns[0]?.pattern;
    if (!selectedPattern) {
      throw new Error('No eligible patterns found for the given context');
    }

    // Track usage for freshness calculation
    this.trackPatternUsage(context.sessionId, selectedPattern);

    // Generate follow-up suggestions
    const suggestedFollowUps = this.suggestFollowUpPatterns(selectedPattern, context);

    return {
      selectedPattern,
      confidence: scoredPatterns[0].score,
      alternatives: scoredPatterns.slice(1, 4), // Top 3 alternatives
      reasoning: scoredPatterns[0].reasoning,
      suggestedFollowUps,
    };
  }

  /**
   * Select multiple patterns with scores
   */
  public selectMultiplePatterns(
    context: SelectionContext,
    count: number,
    constraints?: SelectionConstraints
  ): ScoredPattern[] {
    const eligiblePatterns = this.filterEligiblePatterns(context, constraints);
    const scoredPatterns = this.scorePatterns(eligiblePatterns, context, constraints);

    // Sort by score and return top N with variety
    scoredPatterns.sort((a, b) => b.score - a.score);

    const selected: ScoredPattern[] = [];
    const usedTypes = new Set<PatternType>();

    for (const pattern of scoredPatterns) {
      if (selected.length >= count) break;

      // Ensure variety by avoiding duplicate pattern types
      if (!usedTypes.has(pattern.pattern)) {
        selected.push(pattern);
        usedTypes.add(pattern.pattern);
      }
    }

    return selected;
  }

  /**
   * Analyze current dialogue flow and suggest next steps
   */
  public analyzeDialogueFlow(
    context: SelectionContext,
    patternHistory: readonly PatternType[]
  ): FlowAnalysis {
    const currentState = this.determineFlowState(context, patternHistory);
    const stateConfidence = this.calculateStateConfidence(currentState, patternHistory);
    const suggestedTransition = this.suggestFlowTransition(currentState, context, patternHistory);

    const patternsUsedInState = this.getPatternsUsedInCurrentState(
      currentState,
      patternHistory.slice(-5) // Last 5 patterns
    );

    const varietyScore = this.calculateVarietyScore(patternHistory);
    const progressScore = this.calculateProgressScore(context);

    return {
      currentState,
      stateConfidence,
      suggestedTransition,
      patternsUsedInState,
      averageDepth: context.currentDepth,
      varietyScore,
      progressScore,
    };
  }

  /**
   * Update pattern effectiveness based on outcomes
   */
  public updatePatternEffectiveness(outcome: PatternOutcome): void {
    const contextKey = this.getContextKey(outcome.context);
    const existing = this.effectivenessData.get(contextKey) || this.createDefaultEffectiveness();

    // Update effectiveness metrics
    const newTimesUsed = existing.timesUsed + 1;
    const satisfactionScore = outcome.userSatisfaction || 3; // Default neutral
    const insightScore = Math.min(outcome.insightsGenerated / 3, 1); // Normalize to 0-1

    const newAvgSatisfaction =
      (existing.averageUserSatisfaction * existing.timesUsed + satisfactionScore) / newTimesUsed;
    const newAvgInsightQuality =
      (existing.averageInsightQuality * existing.timesUsed + insightScore) / newTimesUsed;

    const updatedEffectiveness: PatternEffectiveness = {
      patternType: outcome.pattern,
      timesUsed: newTimesUsed,
      averageInsightQuality: newAvgInsightQuality,
      averageUserSatisfaction: newAvgSatisfaction,
      successfulFollowUps: existing.successfulFollowUps + (outcome.followUpUsed ? 1 : 0),
      contextSuccess: {
        ...existing.contextSuccess,
        [outcome.context.category]: this.updateContextSuccess(
          existing.contextSuccess[outcome.context.category] || 0.5,
          insightScore
        ),
      } as Record<ContextCategory, ConfidenceLevel>,
      expertiseSuccess: {
        ...existing.expertiseSuccess,
        [outcome.context.userExpertise]: this.updateExpertiseSuccess(
          existing.expertiseSuccess[outcome.context.userExpertise] || 0.5,
          insightScore
        ),
      } as Record<ExpertiseLevel, ConfidenceLevel>,
    };

    this.effectivenessData.set(contextKey, updatedEffectiveness);
  }

  /**
   * Get pattern effectiveness for a specific context
   */
  public getPatternEffectiveness(pattern: PatternType, context: SelectionContext): ConfidenceLevel {
    const contextKey = this.getContextKey(context, pattern);
    const effectiveness = this.effectivenessData.get(contextKey);

    if (!effectiveness) {
      return 0.5; // Default moderate effectiveness
    }

    // Combine multiple effectiveness signals
    const contextScore = effectiveness.contextSuccess[context.category] || 0.5;
    const expertiseScore = effectiveness.expertiseSuccess[context.userExpertise] || 0.5;
    const overallScore = effectiveness.averageInsightQuality;

    return (contextScore + expertiseScore + overallScore) / 3;
  }

  /**
   * Filter patterns based on context and constraints
   */
  private filterEligiblePatterns(
    context: SelectionContext,
    constraints?: SelectionConstraints
  ): PatternType[] {
    const allPatterns = this.patternLibrary.getAllPatterns();

    return allPatterns
      .filter(pattern => {
        // Check expertise level compatibility
        if (!this.isExpertiseCompatible(pattern.minExpertiseLevel, context.userExpertise)) {
          return false;
        }

        // Check context category relevance
        if (!pattern.contextCategories.includes(context.category)) {
          return false;
        }

        // Check depth constraints
        if (constraints?.maxDepth && context.currentDepth >= constraints.maxDepth) {
          if (pattern.maxDepth > constraints.maxDepth) {
            return false;
          }
        }

        // Check exclusion constraints
        if (constraints?.excludePatterns?.includes(pattern.type)) {
          return false;
        }

        return true;
      })
      .map(pattern => pattern.type);
  }

  /**
   * Score patterns based on multiple factors
   */
  private scorePatterns(
    patterns: readonly PatternType[],
    context: SelectionContext,
    constraints?: SelectionConstraints
  ): ScoredPattern[] {
    return patterns.map(pattern => {
      const contextRelevance = this.calculateContextRelevance(pattern, context);
      const expertiseMatch = this.calculateExpertiseMatch(pattern, context);
      const flowAppropriate = this.calculateFlowAppropriateness(pattern, context);
      const effectiveness = this.getPatternEffectiveness(pattern, context);
      const freshness = this.calculateFreshness(pattern, context.sessionId);

      // Apply preference bonuses
      let preferenceBonus = 0;
      if (constraints?.preferPatterns?.includes(pattern)) {
        preferenceBonus = 0.2;
      }

      // Calculate weighted score
      const score = Math.min(
        contextRelevance * 0.3 +
          expertiseMatch * 0.2 +
          flowAppropriate * 0.25 +
          effectiveness * 0.15 +
          freshness * 0.1 +
          preferenceBonus,
        1.0
      );

      const reasoning = this.generateReasoningForScore(
        pattern,
        contextRelevance,
        expertiseMatch,
        flowAppropriate,
        effectiveness,
        freshness
      );

      return {
        pattern,
        score,
        reasoning,
        contextRelevance,
        expertiseMatch,
        flowAppropriate,
        effectiveness,
        freshness,
      };
    });
  }

  /**
   * Calculate how relevant a pattern is to the current context
   */
  private calculateContextRelevance(
    pattern: PatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    const patternInfo = this.patternLibrary.getPattern(pattern);
    if (!patternInfo) return 0;

    // Base relevance from context category match
    let relevance = patternInfo.contextCategories.includes(context.currentCategory) ? 0.8 : 0.3;

    // Boost for specific patterns in specific contexts
    const contextBoosts: Record<ContextCategory, Partial<Record<PatternType, number>>> = {
      [ContextCategory.PROJECT_INCEPTION]: {
        [PatternType.DEFINITION_SEEKING]: 0.2,
        [PatternType.ASSUMPTION_EXCAVATION]: 0.15,
        [PatternType.VALUE_CLARIFICATION]: 0.1,
      },
      [ContextCategory.ARCHITECTURE_REVIEW]: {
        [PatternType.CONSISTENCY_TESTING]: 0.2,
        [PatternType.NECESSITY_TESTING]: 0.15,
        [PatternType.SOLUTION_SPACE_MAPPING]: 0.1,
      },
      [ContextCategory.REQUIREMENTS_REFINEMENT]: {
        [PatternType.CONCRETE_INSTANTIATION]: 0.2,
        [PatternType.DEFINITION_SEEKING]: 0.15,
      },
      [ContextCategory.IMPLEMENTATION_PLANNING]: {
        [PatternType.IMPACT_ANALYSIS]: 0.2,
        [PatternType.NECESSITY_TESTING]: 0.15,
      },
      [ContextCategory.CODE_REVIEW]: {
        [PatternType.NECESSITY_TESTING]: 0.2,
        [PatternType.CONCEPTUAL_CLARITY]: 0.15,
      },
      [ContextCategory.GENERAL]: {},
    };

    const boost = contextBoosts[context.currentCategory]?.[pattern] || 0;
    return Math.min(relevance + boost, 1.0);
  }

  /**
   * Calculate how well pattern matches user expertise
   */
  private calculateExpertiseMatch(
    pattern: PatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    const patternInfo = this.patternLibrary.getPattern(pattern);
    if (!patternInfo) return 0;

    const expertiseLevels = {
      [ExpertiseLevel.BEGINNER]: 0,
      [ExpertiseLevel.INTERMEDIATE]: 1,
      [ExpertiseLevel.ADVANCED]: 2,
      [ExpertiseLevel.EXPERT]: 3,
    };

    const patternLevel = expertiseLevels[patternInfo.minExpertiseLevel];
    const userLevel = expertiseLevels[context.userExpertise];

    // Perfect match gets 1.0, each level difference reduces by 0.2
    const levelDifference = Math.abs(patternLevel - userLevel);
    return Math.max(1.0 - levelDifference * 0.2, 0.2);
  }

  /**
   * Calculate how appropriate pattern is for current dialogue flow
   */
  private calculateFlowAppropriateness(
    pattern: PatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    // Patterns appropriate for different flow states
    const flowPatterns = {
      exploring: [
        PatternType.DEFINITION_SEEKING,
        PatternType.ASSUMPTION_EXCAVATION,
        PatternType.SOLUTION_SPACE_MAPPING,
      ],
      deepening: [
        PatternType.CONSISTENCY_TESTING,
        PatternType.NECESSITY_TESTING,
        PatternType.EPISTEMIC_HUMILITY,
      ],
      clarifying: [
        PatternType.CONCRETE_INSTANTIATION,
        PatternType.CONCEPTUAL_CLARITY,
        PatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        PatternType.IMPACT_ANALYSIS,
        PatternType.VALUE_CLARIFICATION,
        PatternType.CONSISTENCY_TESTING,
      ],
      concluding: [PatternType.VALUE_CLARIFICATION, PatternType.IMPACT_ANALYSIS],
    };

    const currentFlow = context.conversationFlow || 'exploring';
    const appropriatePatterns = flowPatterns[currentFlow];

    return appropriatePatterns.includes(pattern) ? 0.9 : 0.4;
  }

  /**
   * Calculate pattern freshness (avoid overuse)
   */
  private calculateFreshness(pattern: PatternType, sessionId: string): ConfidenceLevel {
    const recent = this.recentPatterns.get(sessionId) || [];
    const recentUsage = recent.filter(p => p === pattern).length;

    // Fresh pattern gets 1.0, each recent use reduces freshness
    return Math.max(1.0 - recentUsage * 0.3, 0.1);
  }

  /**
   * Suggest follow-up patterns based on current pattern
   */
  private suggestFollowUpPatterns(
    currentPattern: PatternType,
    context: SelectionContext
  ): PatternType[] {
    const patternInfo = this.patternLibrary.getPattern(currentPattern);
    if (!patternInfo) return [];

    // Get base follow-up patterns from library
    const baseFollowUps = patternInfo.followUpPatterns
      .filter(followUp => followUp.priority > 0.6)
      .map(followUp => followUp.nextPatternType);

    // Add context-specific follow-ups based on current pattern and context
    const contextFollowUps = this.getContextSpecificFollowUps(currentPattern, context);

    // Combine and prioritize
    const allFollowUps = [...baseFollowUps, ...contextFollowUps];

    // Remove duplicates and prioritize based on context relevance
    const uniqueFollowUps = [...new Set(allFollowUps)];

    // Score each follow-up for relevance
    const scoredFollowUps = uniqueFollowUps.map(pattern => ({
      pattern,
      score: this.scoreFollowUpRelevance(pattern, currentPattern, context),
    }));

    // Return top 3 highest scoring follow-ups
    return scoredFollowUps
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.pattern);
  }

  /**
   * Get context-specific follow-up patterns
   */
  private getContextSpecificFollowUps(
    currentPattern: PatternType,
    context: SelectionContext
  ): PatternType[] {
    const followUps: PatternType[] = [];

    // Context-driven follow-up logic
    switch (currentPattern) {
      case PatternType.DEFINITION_SEEKING:
        // If we got definitions, test for consistency or ask for examples
        if (context.knownDefinitions.length > 0) {
          followUps.push(PatternType.CONSISTENCY_TESTING);
          followUps.push(PatternType.CONCRETE_INSTANTIATION);
        }
        break;

      case PatternType.ASSUMPTION_EXCAVATION:
        // If we found assumptions, test their necessity or consistency
        if (context.detectedAssumptions.length > 0) {
          followUps.push(PatternType.NECESSITY_TESTING);
          followUps.push(PatternType.CONSISTENCY_TESTING);
        }
        break;

      case PatternType.CONCRETE_INSTANTIATION:
        // After examples, clarify concepts or test assumptions
        followUps.push(PatternType.CONCEPTUAL_CLARITY);
        followUps.push(PatternType.ASSUMPTION_EXCAVATION);
        break;

      case PatternType.CONSISTENCY_TESTING:
        // After finding inconsistencies, clarify values or impacts
        followUps.push(PatternType.VALUE_CLARIFICATION);
        followUps.push(PatternType.IMPACT_ANALYSIS);
        break;

      case PatternType.NECESSITY_TESTING:
        // After questioning necessity, explore alternatives or impacts
        followUps.push(PatternType.SOLUTION_SPACE_MAPPING);
        followUps.push(PatternType.IMPACT_ANALYSIS);
        break;
    }

    // Context category specific follow-ups
    if (context.currentCategory === ContextCategory.ARCHITECTURE_REVIEW) {
      followUps.push(PatternType.IMPACT_ANALYSIS);
      followUps.push(PatternType.CONSISTENCY_TESTING);
    } else if (context.currentCategory === ContextCategory.REQUIREMENTS_REFINEMENT) {
      followUps.push(PatternType.CONCRETE_INSTANTIATION);
      followUps.push(PatternType.DEFINITION_SEEKING);
    }

    return followUps;
  }

  /**
   * Score follow-up pattern relevance
   */
  private scoreFollowUpRelevance(
    followUpPattern: PatternType,
    currentPattern: PatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    let score = 0.5; // Base score

    // Boost score for logical progressions
    const progressions: Partial<Record<PatternType, PatternType[]>> = {
      [PatternType.DEFINITION_SEEKING]: [
        PatternType.CONCRETE_INSTANTIATION,
        PatternType.ASSUMPTION_EXCAVATION,
      ],
      [PatternType.ASSUMPTION_EXCAVATION]: [
        PatternType.CONSISTENCY_TESTING,
        PatternType.NECESSITY_TESTING,
      ],
      [PatternType.CONSISTENCY_TESTING]: [
        PatternType.VALUE_CLARIFICATION,
        PatternType.IMPACT_ANALYSIS,
      ],
      [PatternType.CONCRETE_INSTANTIATION]: [
        PatternType.CONCEPTUAL_CLARITY,
        PatternType.ASSUMPTION_EXCAVATION,
      ],
      [PatternType.NECESSITY_TESTING]: [
        PatternType.SOLUTION_SPACE_MAPPING,
        PatternType.IMPACT_ANALYSIS,
      ],
    };

    if (progressions[currentPattern]?.includes(followUpPattern)) {
      score += 0.3;
    }

    // Context relevance boost
    const contextRelevance = this.calculateContextRelevance(followUpPattern, context);
    score += contextRelevance * 0.2;

    return Math.min(score, 1.0);
  }

  /**
   * Track pattern usage for freshness calculation
   */
  private trackPatternUsage(sessionId: string, pattern: PatternType): void {
    const recent = this.recentPatterns.get(sessionId) || [];
    recent.push(pattern);

    // Keep only last 10 patterns
    if (recent.length > 10) {
      recent.shift();
    }

    this.recentPatterns.set(sessionId, recent);
  }

  /**
   * Generate reasoning text for pattern score
   */
  private generateReasoningForScore(
    pattern: PatternType,
    contextRelevance: ConfidenceLevel,
    expertiseMatch: ConfidenceLevel,
    flowAppropriate: ConfidenceLevel,
    effectiveness: ConfidenceLevel,
    freshness: ConfidenceLevel
  ): string[] {
    const reasons: string[] = [];

    // Pattern-specific reasoning
    const patternReasons = this.getPatternSpecificReasoning(pattern);
    if (patternReasons) {
      reasons.push(patternReasons);
    }

    // General scoring reasons
    if (contextRelevance > 0.7) {
      reasons.push('Highly relevant to current context');
    } else if (contextRelevance < 0.4) {
      reasons.push('Limited relevance to current context');
    }

    if (expertiseMatch > 0.8) {
      reasons.push('Perfect match for user expertise level');
    } else if (expertiseMatch < 0.5) {
      reasons.push('May be too complex/simple for user level');
    }

    if (flowAppropriate > 0.8) {
      reasons.push('Excellent fit for current dialogue flow');
    }

    if (effectiveness > 0.7) {
      reasons.push('Has proven effective in similar contexts');
    } else if (effectiveness < 0.4) {
      reasons.push('Lower effectiveness in similar situations');
    }

    if (freshness < 0.5) {
      reasons.push('Recently used - may benefit from variety');
    }

    return reasons;
  }

  /**
   * Get pattern-specific reasoning
   */
  private getPatternSpecificReasoning(pattern: PatternType): string | undefined {
    const patternReasons: Record<PatternType, string> = {
      [PatternType.DEFINITION_SEEKING]:
        'Clarifies ambiguous terminology and establishes common understanding',
      [PatternType.ASSUMPTION_EXCAVATION]:
        'Uncovers hidden beliefs that may impact decision-making',
      [PatternType.CONSISTENCY_TESTING]:
        'Identifies potential contradictions in requirements or design',
      [PatternType.CONCRETE_INSTANTIATION]:
        'Transforms abstract concepts into testable, specific examples',
      [PatternType.NECESSITY_TESTING]:
        'Questions complexity and identifies truly essential requirements',
      [PatternType.CONCEPTUAL_CLARITY]:
        'Distinguishes between similar concepts to prevent confusion',
      [PatternType.EPISTEMIC_HUMILITY]:
        'Acknowledges knowledge gaps and identifies areas needing research',
      [PatternType.SOLUTION_SPACE_MAPPING]:
        'Explores alternative approaches to avoid premature optimization',
      [PatternType.IMPACT_ANALYSIS]: 'Evaluates consequences and ripple effects of decisions',
      [PatternType.VALUE_CLARIFICATION]:
        'Prioritizes competing objectives and clarifies trade-offs',
    };

    return patternReasons[pattern];
  }

  /**
   * Initialize default effectiveness data for all patterns
   */
  private initializeEffectivenessData(): void {
    const allPatterns = this.patternLibrary.getAllPatterns();

    for (const pattern of allPatterns) {
      for (const category of Object.values(ContextCategory)) {
        for (const expertise of Object.values(ExpertiseLevel)) {
          const contextKey = `${pattern.type}-${category}-${expertise}`;
          this.effectivenessData.set(contextKey, this.createDefaultEffectiveness());
        }
      }
    }
  }

  /**
   * Create default effectiveness data
   */
  private createDefaultEffectiveness(): PatternEffectiveness {
    // Create complete records with all enum values
    const contextSuccess: Record<ContextCategory, ConfidenceLevel> = {
      [ContextCategory.PROJECT_INCEPTION]: 0.5,
      [ContextCategory.ARCHITECTURE_REVIEW]: 0.5,
      [ContextCategory.REQUIREMENTS_REFINEMENT]: 0.5,
      [ContextCategory.IMPLEMENTATION_PLANNING]: 0.5,
      [ContextCategory.CODE_REVIEW]: 0.5,
      [ContextCategory.GENERAL]: 0.5,
    };

    const expertiseSuccess: Record<ExpertiseLevel, ConfidenceLevel> = {
      [ExpertiseLevel.BEGINNER]: 0.5,
      [ExpertiseLevel.INTERMEDIATE]: 0.5,
      [ExpertiseLevel.ADVANCED]: 0.5,
      [ExpertiseLevel.EXPERT]: 0.5,
    };

    return {
      patternType: PatternType.DEFINITION_SEEKING, // Will be overridden
      timesUsed: 0,
      averageInsightQuality: 0.5,
      averageUserSatisfaction: 0.5,
      successfulFollowUps: 0,
      contextSuccess,
      expertiseSuccess,
    };
  }

  /**
   * Generate context key for effectiveness tracking
   */
  private getContextKey(context: SelectionContext, pattern?: PatternType): string {
    const patternPart = pattern ? `${pattern}-` : '';
    return `${patternPart}${context.category}-${context.userExpertise}`;
  }

  /**
   * Update context success score using exponential moving average
   */
  private updateContextSuccess(
    current: ConfidenceLevel,
    newScore: ConfidenceLevel
  ): ConfidenceLevel {
    const alpha = 0.2; // Learning rate
    return current * (1 - alpha) + newScore * alpha;
  }

  /**
   * Update expertise success score using exponential moving average
   */
  private updateExpertiseSuccess(
    current: ConfidenceLevel,
    newScore: ConfidenceLevel
  ): ConfidenceLevel {
    const alpha = 0.2; // Learning rate
    return current * (1 - alpha) + newScore * alpha;
  }

  /**
   * Check if expertise levels are compatible
   */
  private isExpertiseCompatible(patternLevel: ExpertiseLevel, userLevel: ExpertiseLevel): boolean {
    const levels = {
      [ExpertiseLevel.BEGINNER]: 0,
      [ExpertiseLevel.INTERMEDIATE]: 1,
      [ExpertiseLevel.ADVANCED]: 2,
      [ExpertiseLevel.EXPERT]: 3,
    };

    return levels[userLevel] >= levels[patternLevel];
  }

  /**
   * Determine current dialogue flow state
   */
  private determineFlowState(
    context: SelectionContext,
    patternHistory: readonly PatternType[]
  ): 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding' {
    // Analyze recent patterns to determine flow state
    const recentPatterns = patternHistory.slice(-5); // Last 5 patterns

    // Count patterns by their typical flow association
    const patternCounts = {
      exploring: 0,
      deepening: 0,
      clarifying: 0,
      synthesizing: 0,
      concluding: 0,
    };

    // Classify each recent pattern
    for (const pattern of recentPatterns) {
      switch (pattern) {
        case PatternType.DEFINITION_SEEKING:
        case PatternType.ASSUMPTION_EXCAVATION:
        case PatternType.SOLUTION_SPACE_MAPPING:
          patternCounts.exploring++;
          break;
        case PatternType.CONSISTENCY_TESTING:
        case PatternType.NECESSITY_TESTING:
        case PatternType.EPISTEMIC_HUMILITY:
          patternCounts.deepening++;
          break;
        case PatternType.CONCRETE_INSTANTIATION:
        case PatternType.CONCEPTUAL_CLARITY:
          patternCounts.clarifying++;
          break;
        case PatternType.IMPACT_ANALYSIS:
        case PatternType.VALUE_CLARIFICATION:
          patternCounts.synthesizing++;
          break;
      }
    }

    // Find the most common pattern type
    const maxCount = Math.max(...Object.values(patternCounts));
    const dominantState = Object.entries(patternCounts).find(
      ([, count]) => count === maxCount
    )?.[0];

    // Use pattern-based detection if clear pattern exists
    if (maxCount >= 2 && dominantState) {
      return dominantState as
        | 'exploring'
        | 'deepening'
        | 'clarifying'
        | 'synthesizing'
        | 'concluding';
    }

    // Fall back to depth and turn-based heuristics
    if (context.currentDepth <= 2) return 'exploring';
    if (context.currentDepth <= 4) return 'deepening';
    if (context.currentDepth <= 6) return 'clarifying';
    if (context.turnCount > 15) return 'concluding';
    return 'synthesizing';
  }

  /**
   * Calculate confidence in current flow state determination
   */
  private calculateStateConfidence(
    state: string,
    patternHistory: readonly PatternType[]
  ): ConfidenceLevel {
    if (patternHistory.length === 0) return 0.5; // Neutral confidence with no history

    const recentPatterns = patternHistory.slice(-5);

    // Define expected patterns for each state
    const statePatterns: Record<string, PatternType[]> = {
      exploring: [
        PatternType.DEFINITION_SEEKING,
        PatternType.ASSUMPTION_EXCAVATION,
        PatternType.SOLUTION_SPACE_MAPPING,
        PatternType.EPISTEMIC_HUMILITY,
      ],
      deepening: [
        PatternType.CONSISTENCY_TESTING,
        PatternType.NECESSITY_TESTING,
        PatternType.ASSUMPTION_EXCAVATION,
        PatternType.IMPACT_ANALYSIS,
      ],
      clarifying: [
        PatternType.CONCRETE_INSTANTIATION,
        PatternType.CONCEPTUAL_CLARITY,
        PatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        PatternType.IMPACT_ANALYSIS,
        PatternType.VALUE_CLARIFICATION,
        PatternType.CONSISTENCY_TESTING,
      ],
      concluding: [PatternType.VALUE_CLARIFICATION, PatternType.IMPACT_ANALYSIS],
    };

    const expectedPatterns = statePatterns[state] || [];

    // Calculate how many recent patterns match the expected state
    const matchingPatterns = recentPatterns.filter(pattern =>
      expectedPatterns.includes(pattern)
    ).length;

    // Calculate confidence based on pattern alignment
    const alignmentRatio = recentPatterns.length > 0 ? matchingPatterns / recentPatterns.length : 0;

    // High alignment = high confidence, low alignment = low confidence
    const baseConfidence = alignmentRatio * 0.8 + 0.2; // Scale to 0.2-1.0 range

    // Boost confidence if we have more data points
    const dataBonus = Math.min(recentPatterns.length / 5, 1) * 0.1;

    return Math.min(baseConfidence + dataBonus, 1.0);
  }

  /**
   * Suggest next flow state transition
   */
  private suggestFlowTransition(
    currentState: string,
    context: SelectionContext,
    patternHistory: readonly PatternType[]
  ): 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding' | undefined {
    const recentPatterns = patternHistory.slice(-5);

    // Count patterns in current state vs others
    const currentStatePatterns = this.getPatternsForFlowState(currentState);
    const recentCurrentStateCount = recentPatterns.filter(p =>
      currentStatePatterns.includes(p)
    ).length;

    // Suggest transition if:
    // 1. We've used many patterns from current state (pattern saturation)
    // 2. We have sufficient depth
    // 3. We have enough concepts/insights to move forward

    const patternSaturation =
      recentPatterns.length > 0 ? recentCurrentStateCount / recentPatterns.length : 0;

    const shouldTransition =
      patternSaturation > 0.6 || // >60% patterns from current state
      context.currentDepth > 4 || // Sufficient depth
      context.extractedConcepts.length > 3; // Sufficient insights

    if (!shouldTransition) {
      return undefined;
    }

    // Intelligent progression based on context and progress
    const progressions: Record<string, string | undefined> = {
      exploring: this.shouldSkipToSynthesis(context) ? 'synthesizing' : 'deepening',
      deepening: this.needsClarification(context) ? 'clarifying' : 'synthesizing',
      clarifying: 'synthesizing',
      synthesizing: this.shouldConclude(context, patternHistory) ? 'concluding' : undefined,
      concluding: undefined,
    };

    const nextState = progressions[currentState];
    return nextState as
      | 'exploring'
      | 'deepening'
      | 'clarifying'
      | 'synthesizing'
      | 'concluding'
      | undefined;
  }

  /**
   * Get patterns for a specific flow state
   */
  private getPatternsForFlowState(state: string): PatternType[] {
    const statePatterns: Record<string, PatternType[]> = {
      exploring: [
        PatternType.DEFINITION_SEEKING,
        PatternType.ASSUMPTION_EXCAVATION,
        PatternType.SOLUTION_SPACE_MAPPING,
        PatternType.EPISTEMIC_HUMILITY,
      ],
      deepening: [
        PatternType.CONSISTENCY_TESTING,
        PatternType.NECESSITY_TESTING,
        PatternType.ASSUMPTION_EXCAVATION,
        PatternType.IMPACT_ANALYSIS,
      ],
      clarifying: [
        PatternType.CONCRETE_INSTANTIATION,
        PatternType.CONCEPTUAL_CLARITY,
        PatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        PatternType.IMPACT_ANALYSIS,
        PatternType.VALUE_CLARIFICATION,
        PatternType.CONSISTENCY_TESTING,
      ],
      concluding: [PatternType.VALUE_CLARIFICATION, PatternType.IMPACT_ANALYSIS],
    };

    return statePatterns[state] || [];
  }

  /**
   * Check if context suggests skipping to synthesis
   */
  private shouldSkipToSynthesis(context: SelectionContext): boolean {
    // Skip to synthesis if we have many concepts and assumptions already
    return context.extractedConcepts.length > 5 && context.detectedAssumptions.length > 3;
  }

  /**
   * Check if context needs clarification
   */
  private needsClarification(context: SelectionContext): boolean {
    // Need clarification if we have concepts but they seem unclear
    return (
      context.extractedConcepts.length > 0 &&
      context.knownDefinitions.length < context.extractedConcepts.length / 2
    );
  }

  /**
   * Check if dialogue should conclude
   */
  private shouldConclude(
    context: SelectionContext,
    patternHistory: readonly PatternType[]
  ): boolean {
    // Should conclude if conversation is long and we have good insights
    return (
      context.turnCount > 15 &&
      context.extractedConcepts.length > 4 &&
      patternHistory.filter(
        p => p === PatternType.VALUE_CLARIFICATION || p === PatternType.IMPACT_ANALYSIS
      ).length > 2
    );
  }

  /**
   * Get patterns used in current dialogue state
   */
  private getPatternsUsedInCurrentState(
    state: string,
    recentPatterns: readonly PatternType[]
  ): PatternType[] {
    const statePatterns = this.getPatternsForFlowState(state);
    return [...new Set(recentPatterns.filter(p => statePatterns.includes(p)))];
  }

  /**
   * Calculate variety score based on pattern diversity
   */
  private calculateVarietyScore(patternHistory: readonly PatternType[]): ConfidenceLevel {
    if (patternHistory.length === 0) return 1.0;

    const uniquePatterns = new Set(patternHistory.slice(-10)); // Last 10 patterns
    const recentPatterns = patternHistory.slice(-10).length;

    return recentPatterns > 0 ? uniquePatterns.size / recentPatterns : 1.0;
  }

  /**
   * Calculate progress score based on context indicators
   */
  private calculateProgressScore(context: SelectionContext): ConfidenceLevel {
    // Simple heuristic - could be enhanced with objective tracking
    const baseProgress = Math.min(context.currentDepth / 8, 1.0);
    const insightBonus = context.extractedConcepts.length * 0.1;

    return Math.min(baseProgress + insightBonus, 1.0);
  }
}
