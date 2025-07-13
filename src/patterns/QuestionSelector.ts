/**
 * Intelligent question selector with adaptive logic for Socratic dialogue
 */

import {
  SocraticPatternType,
  PatternEffectiveness,
} from '../types/patterns.js';
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
  readonly excludePatterns?: readonly SocraticPatternType[];
  readonly preferPatterns?: readonly SocraticPatternType[];
  readonly maxDepth?: number;
  readonly requireFreshPattern?: boolean; // Avoid recently used patterns
  readonly focusOnInsights?: readonly string[]; // Target specific insight types
}

/**
 * Scored pattern candidate
 */
export interface ScoredPattern {
  readonly pattern: SocraticPatternType;
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
  readonly selectedPattern: SocraticPatternType;
  readonly confidence: ConfidenceLevel;
  readonly alternatives: readonly ScoredPattern[];
  readonly reasoning: readonly string[];
  readonly suggestedFollowUps: readonly SocraticPatternType[];
}

/**
 * Dialogue flow analysis
 */
export interface FlowAnalysis {
  readonly currentState: 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding';
  readonly stateConfidence: ConfidenceLevel;
  readonly suggestedTransition?: 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding' | undefined;
  readonly patternsUsedInState: readonly SocraticPatternType[];
  readonly averageDepth: number;
  readonly varietyScore: ConfidenceLevel; // How varied the patterns have been
  readonly progressScore: ConfidenceLevel; // How well objectives are being met
}

/**
 * Pattern outcome for learning
 */
export interface PatternOutcome {
  readonly pattern: SocraticPatternType;
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
  private readonly recentPatterns: Map<string, SocraticPatternType[]>; // sessionId -> recent patterns

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
    const usedTypes = new Set<SocraticPatternType>();

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
    patternHistory: readonly SocraticPatternType[]
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
  public getPatternEffectiveness(
    pattern: SocraticPatternType,
    context: SelectionContext
  ): ConfidenceLevel {
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
  ): SocraticPatternType[] {
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
    patterns: readonly SocraticPatternType[],
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
        (contextRelevance * 0.3 +
         expertiseMatch * 0.2 +
         flowAppropriate * 0.25 +
         effectiveness * 0.15 +
         freshness * 0.1 +
         preferenceBonus), 
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
    pattern: SocraticPatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    const patternInfo = this.patternLibrary.getPattern(pattern);
    if (!patternInfo) return 0;

    // Base relevance from context category match
    let relevance = patternInfo.contextCategories.includes(context.currentCategory) ? 0.8 : 0.3;

    // Boost for specific patterns in specific contexts
    const contextBoosts: Record<ContextCategory, Partial<Record<SocraticPatternType, number>>> = {
      [ContextCategory.PROJECT_INCEPTION]: {
        [SocraticPatternType.DEFINITION_SEEKING]: 0.2,
        [SocraticPatternType.ASSUMPTION_EXCAVATION]: 0.15,
        [SocraticPatternType.VALUE_CLARIFICATION]: 0.1,
      },
      [ContextCategory.ARCHITECTURE_REVIEW]: {
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.2,
        [SocraticPatternType.NECESSITY_TESTING]: 0.15,
        [SocraticPatternType.SOLUTION_SPACE_MAPPING]: 0.1,
      },
      [ContextCategory.REQUIREMENTS_REFINEMENT]: {
        [SocraticPatternType.CONCRETE_INSTANTIATION]: 0.2,
        [SocraticPatternType.DEFINITION_SEEKING]: 0.15,
      },
      [ContextCategory.IMPLEMENTATION_PLANNING]: {
        [SocraticPatternType.IMPACT_ANALYSIS]: 0.2,
        [SocraticPatternType.NECESSITY_TESTING]: 0.15,
      },
      [ContextCategory.CODE_REVIEW]: {
        [SocraticPatternType.NECESSITY_TESTING]: 0.2,
        [SocraticPatternType.CONCEPTUAL_CLARITY]: 0.15,
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
    pattern: SocraticPatternType,
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
    return Math.max(1.0 - (levelDifference * 0.2), 0.2);
  }

  /**
   * Calculate how appropriate pattern is for current dialogue flow
   */
  private calculateFlowAppropriateness(
    pattern: SocraticPatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    // Patterns appropriate for different flow states
    const flowPatterns = {
      exploring: [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.SOLUTION_SPACE_MAPPING,
      ],
      deepening: [
        SocraticPatternType.CONSISTENCY_TESTING,
        SocraticPatternType.NECESSITY_TESTING,
        SocraticPatternType.EPISTEMIC_HUMILITY,
      ],
      clarifying: [
        SocraticPatternType.CONCRETE_INSTANTIATION,
        SocraticPatternType.CONCEPTUAL_CLARITY,
        SocraticPatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        SocraticPatternType.IMPACT_ANALYSIS,
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.CONSISTENCY_TESTING,
      ],
      concluding: [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
    };

    const currentFlow = context.conversationFlow || 'exploring';
    const appropriatePatterns = flowPatterns[currentFlow];
    
    return appropriatePatterns.includes(pattern) ? 0.9 : 0.4;
  }

  /**
   * Calculate pattern freshness (avoid overuse)
   */
  private calculateFreshness(pattern: SocraticPatternType, sessionId: string): ConfidenceLevel {
    const recent = this.recentPatterns.get(sessionId) || [];
    const recentUsage = recent.filter(p => p === pattern).length;
    
    // Fresh pattern gets 1.0, each recent use reduces freshness
    return Math.max(1.0 - (recentUsage * 0.3), 0.1);
  }

  /**
   * Suggest follow-up patterns based on current pattern
   */
  private suggestFollowUpPatterns(
    currentPattern: SocraticPatternType,
    context: SelectionContext
  ): SocraticPatternType[] {
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
    currentPattern: SocraticPatternType,
    context: SelectionContext
  ): SocraticPatternType[] {
    const followUps: SocraticPatternType[] = [];

    // Context-driven follow-up logic
    switch (currentPattern) {
      case SocraticPatternType.DEFINITION_SEEKING:
        // If we got definitions, test for consistency or ask for examples
        if (context.knownDefinitions.length > 0) {
          followUps.push(SocraticPatternType.CONSISTENCY_TESTING);
          followUps.push(SocraticPatternType.CONCRETE_INSTANTIATION);
        }
        break;

      case SocraticPatternType.ASSUMPTION_EXCAVATION:
        // If we found assumptions, test their necessity or consistency
        if (context.detectedAssumptions.length > 0) {
          followUps.push(SocraticPatternType.NECESSITY_TESTING);
          followUps.push(SocraticPatternType.CONSISTENCY_TESTING);
        }
        break;

      case SocraticPatternType.CONCRETE_INSTANTIATION:
        // After examples, clarify concepts or test assumptions
        followUps.push(SocraticPatternType.CONCEPTUAL_CLARITY);
        followUps.push(SocraticPatternType.ASSUMPTION_EXCAVATION);
        break;

      case SocraticPatternType.CONSISTENCY_TESTING:
        // After finding inconsistencies, clarify values or impacts
        followUps.push(SocraticPatternType.VALUE_CLARIFICATION);
        followUps.push(SocraticPatternType.IMPACT_ANALYSIS);
        break;

      case SocraticPatternType.NECESSITY_TESTING:
        // After questioning necessity, explore alternatives or impacts
        followUps.push(SocraticPatternType.SOLUTION_SPACE_MAPPING);
        followUps.push(SocraticPatternType.IMPACT_ANALYSIS);
        break;
    }

    // Context category specific follow-ups
    if (context.currentCategory === ContextCategory.ARCHITECTURE_REVIEW) {
      followUps.push(SocraticPatternType.IMPACT_ANALYSIS);
      followUps.push(SocraticPatternType.CONSISTENCY_TESTING);
    } else if (context.currentCategory === ContextCategory.REQUIREMENTS_REFINEMENT) {
      followUps.push(SocraticPatternType.CONCRETE_INSTANTIATION);
      followUps.push(SocraticPatternType.DEFINITION_SEEKING);
    }

    return followUps;
  }

  /**
   * Score follow-up pattern relevance
   */
  private scoreFollowUpRelevance(
    followUpPattern: SocraticPatternType,
    currentPattern: SocraticPatternType,
    context: SelectionContext
  ): ConfidenceLevel {
    let score = 0.5; // Base score

    // Boost score for logical progressions
    const progressions: Partial<Record<SocraticPatternType, SocraticPatternType[]>> = {
      [SocraticPatternType.DEFINITION_SEEKING]: [
        SocraticPatternType.CONCRETE_INSTANTIATION,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
      ],
      [SocraticPatternType.ASSUMPTION_EXCAVATION]: [
        SocraticPatternType.CONSISTENCY_TESTING,
        SocraticPatternType.NECESSITY_TESTING,
      ],
      [SocraticPatternType.CONSISTENCY_TESTING]: [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
      [SocraticPatternType.CONCRETE_INSTANTIATION]: [
        SocraticPatternType.CONCEPTUAL_CLARITY,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
      ],
      [SocraticPatternType.NECESSITY_TESTING]: [
        SocraticPatternType.SOLUTION_SPACE_MAPPING,
        SocraticPatternType.IMPACT_ANALYSIS,
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
  private trackPatternUsage(sessionId: string, pattern: SocraticPatternType): void {
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
    pattern: SocraticPatternType,
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
  private getPatternSpecificReasoning(pattern: SocraticPatternType): string | undefined {
    const patternReasons: Record<SocraticPatternType, string> = {
      [SocraticPatternType.DEFINITION_SEEKING]: 'Clarifies ambiguous terminology and establishes common understanding',
      [SocraticPatternType.ASSUMPTION_EXCAVATION]: 'Uncovers hidden beliefs that may impact decision-making',
      [SocraticPatternType.CONSISTENCY_TESTING]: 'Identifies potential contradictions in requirements or design',
      [SocraticPatternType.CONCRETE_INSTANTIATION]: 'Transforms abstract concepts into testable, specific examples',
      [SocraticPatternType.NECESSITY_TESTING]: 'Questions complexity and identifies truly essential requirements',
      [SocraticPatternType.CONCEPTUAL_CLARITY]: 'Distinguishes between similar concepts to prevent confusion',
      [SocraticPatternType.EPISTEMIC_HUMILITY]: 'Acknowledges knowledge gaps and identifies areas needing research',
      [SocraticPatternType.SOLUTION_SPACE_MAPPING]: 'Explores alternative approaches to avoid premature optimization',
      [SocraticPatternType.IMPACT_ANALYSIS]: 'Evaluates consequences and ripple effects of decisions',
      [SocraticPatternType.VALUE_CLARIFICATION]: 'Prioritizes competing objectives and clarifies trade-offs',
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
      patternType: SocraticPatternType.DEFINITION_SEEKING, // Will be overridden
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
  private getContextKey(context: SelectionContext, pattern?: SocraticPatternType): string {
    const patternPart = pattern ? `${pattern}-` : '';
    return `${patternPart}${context.category}-${context.userExpertise}`;
  }

  /**
   * Update context success score using exponential moving average
   */
  private updateContextSuccess(current: ConfidenceLevel, newScore: ConfidenceLevel): ConfidenceLevel {
    const alpha = 0.2; // Learning rate
    return current * (1 - alpha) + newScore * alpha;
  }

  /**
   * Update expertise success score using exponential moving average
   */
  private updateExpertiseSuccess(current: ConfidenceLevel, newScore: ConfidenceLevel): ConfidenceLevel {
    const alpha = 0.2; // Learning rate
    return current * (1 - alpha) + newScore * alpha;
  }

  /**
   * Check if expertise levels are compatible
   */
  private isExpertiseCompatible(
    patternLevel: ExpertiseLevel,
    userLevel: ExpertiseLevel
  ): boolean {
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
    patternHistory: readonly SocraticPatternType[]
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
        case SocraticPatternType.DEFINITION_SEEKING:
        case SocraticPatternType.ASSUMPTION_EXCAVATION:
        case SocraticPatternType.SOLUTION_SPACE_MAPPING:
          patternCounts.exploring++;
          break;
        case SocraticPatternType.CONSISTENCY_TESTING:
        case SocraticPatternType.NECESSITY_TESTING:
        case SocraticPatternType.EPISTEMIC_HUMILITY:
          patternCounts.deepening++;
          break;
        case SocraticPatternType.CONCRETE_INSTANTIATION:
        case SocraticPatternType.CONCEPTUAL_CLARITY:
          patternCounts.clarifying++;
          break;
        case SocraticPatternType.IMPACT_ANALYSIS:
        case SocraticPatternType.VALUE_CLARIFICATION:
          patternCounts.synthesizing++;
          break;
      }
    }

    // Find the most common pattern type
    const maxCount = Math.max(...Object.values(patternCounts));
    const dominantState = Object.entries(patternCounts).find(([, count]) => count === maxCount)?.[0];

    // Use pattern-based detection if clear pattern exists
    if (maxCount >= 2 && dominantState) {
      return dominantState as 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding';
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
    patternHistory: readonly SocraticPatternType[]
  ): ConfidenceLevel {
    if (patternHistory.length === 0) return 0.5; // Neutral confidence with no history
    
    const recentPatterns = patternHistory.slice(-5);
    
    // Define expected patterns for each state
    const statePatterns: Record<string, SocraticPatternType[]> = {
      exploring: [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.SOLUTION_SPACE_MAPPING,
        SocraticPatternType.EPISTEMIC_HUMILITY,
      ],
      deepening: [
        SocraticPatternType.CONSISTENCY_TESTING,
        SocraticPatternType.NECESSITY_TESTING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
      clarifying: [
        SocraticPatternType.CONCRETE_INSTANTIATION,
        SocraticPatternType.CONCEPTUAL_CLARITY,
        SocraticPatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        SocraticPatternType.IMPACT_ANALYSIS,
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.CONSISTENCY_TESTING,
      ],
      concluding: [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
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
    patternHistory: readonly SocraticPatternType[]
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
    
    const patternSaturation = recentPatterns.length > 0 ? 
      recentCurrentStateCount / recentPatterns.length : 0;
    
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
    return nextState as 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding' | undefined;
  }

  /**
   * Get patterns for a specific flow state
   */
  private getPatternsForFlowState(state: string): SocraticPatternType[] {
    const statePatterns: Record<string, SocraticPatternType[]> = {
      exploring: [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.SOLUTION_SPACE_MAPPING,
        SocraticPatternType.EPISTEMIC_HUMILITY,
      ],
      deepening: [
        SocraticPatternType.CONSISTENCY_TESTING,
        SocraticPatternType.NECESSITY_TESTING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
      clarifying: [
        SocraticPatternType.CONCRETE_INSTANTIATION,
        SocraticPatternType.CONCEPTUAL_CLARITY,
        SocraticPatternType.DEFINITION_SEEKING,
      ],
      synthesizing: [
        SocraticPatternType.IMPACT_ANALYSIS,
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.CONSISTENCY_TESTING,
      ],
      concluding: [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ],
    };
    
    return statePatterns[state] || [];
  }

  /**
   * Check if context suggests skipping to synthesis
   */
  private shouldSkipToSynthesis(context: SelectionContext): boolean {
    // Skip to synthesis if we have many concepts and assumptions already
    return context.extractedConcepts.length > 5 && 
           context.detectedAssumptions.length > 3;
  }

  /**
   * Check if context needs clarification
   */
  private needsClarification(context: SelectionContext): boolean {
    // Need clarification if we have concepts but they seem unclear
    return context.extractedConcepts.length > 0 && 
           context.knownDefinitions.length < context.extractedConcepts.length / 2;
  }

  /**
   * Check if dialogue should conclude
   */
  private shouldConclude(context: SelectionContext, patternHistory: readonly SocraticPatternType[]): boolean {
    // Should conclude if conversation is long and we have good insights
    return context.turnCount > 15 && 
           context.extractedConcepts.length > 4 &&
           patternHistory.filter(p => 
             p === SocraticPatternType.VALUE_CLARIFICATION || 
             p === SocraticPatternType.IMPACT_ANALYSIS
           ).length > 2;
  }

  /**
   * Get patterns used in current dialogue state
   */
  private getPatternsUsedInCurrentState(
    state: string,
    recentPatterns: readonly SocraticPatternType[]
  ): SocraticPatternType[] {
    const statePatterns = this.getPatternsForFlowState(state);
    return [...new Set(recentPatterns.filter(p => statePatterns.includes(p)))];
  }

  /**
   * Calculate variety score based on pattern diversity
   */
  private calculateVarietyScore(patternHistory: readonly SocraticPatternType[]): ConfidenceLevel {
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