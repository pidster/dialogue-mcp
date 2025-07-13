/**
 * Pattern scoring algorithms for intelligent question selection
 */

import {
  SocraticPatternType,
  QuestionContext,
} from '../types/patterns.js';
import { ContextCategory, ExpertiseLevel, ConfidenceLevel } from '../types/common.js';
import { PatternLibrary } from './PatternLibrary.js';

/**
 * Extended context for scoring that includes dialogue state
 */
export interface ScoringContext extends QuestionContext {
  readonly conversationFlow?: 'exploring' | 'deepening' | 'clarifying' | 'synthesizing' | 'concluding';
  readonly currentDepth: number;
  readonly turnCount: number;
}

/**
 * Scoring factors for pattern evaluation
 */
export interface ScoringFactors {
  readonly contextRelevance: ConfidenceLevel;
  readonly expertiseMatch: ConfidenceLevel;
  readonly flowAppropriateness: ConfidenceLevel;
  readonly novelty: ConfidenceLevel;
  readonly effectiveness: ConfidenceLevel;
  readonly strategicValue: ConfidenceLevel;
}

/**
 * Scoring weights for different factors
 */
export interface ScoringWeights {
  readonly contextRelevance: number;
  readonly expertiseMatch: number;
  readonly flowAppropriateness: number;
  readonly novelty: number;
  readonly effectiveness: number;
  readonly strategicValue: number;
}

/**
 * Context-specific scoring configuration
 */
export interface ScoringConfig {
  readonly weights: ScoringWeights;
  readonly expertiseToleranceRange: number; // How many levels up/down to allow
  readonly noveltyImportance: number; // 0-1, how much to value fresh patterns
  readonly strategicPatterns: Partial<Record<SocraticPatternType, number>>; // Strategic bonuses
}

/**
 * Pattern scoring service with multiple algorithms
 */
export class PatternScorer {
  private readonly patternLibrary: PatternLibrary;
  private readonly defaultWeights: ScoringWeights;

  constructor(patternLibrary: PatternLibrary) {
    this.patternLibrary = patternLibrary;
    this.defaultWeights = {
      contextRelevance: 0.3,
      expertiseMatch: 0.2,
      flowAppropriateness: 0.25,
      novelty: 0.1,
      effectiveness: 0.1,
      strategicValue: 0.05,
    };
  }

  /**
   * Score a pattern using comprehensive multi-factor analysis
   */
  public scorePattern(
    pattern: SocraticPatternType,
    context: ScoringContext,
    recentPatterns: readonly SocraticPatternType[],
    effectivenessScore: ConfidenceLevel,
    config?: Partial<ScoringConfig>
  ): ScoringFactors & { totalScore: ConfidenceLevel } {
    const weights = { ...this.defaultWeights, ...config?.weights };
    
    const contextRelevance = this.calculateContextRelevance(pattern, context);
    const expertiseMatch = this.calculateExpertiseMatch(pattern, context, config);
    const flowAppropriateness = this.calculateFlowAppropriateness(pattern, context);
    const novelty = this.calculateNovelty(pattern, recentPatterns, config);
    const effectiveness = effectivenessScore;
    const strategicValue = this.calculateStrategicValue(pattern, context, config);

    const totalScore = Math.min(
      contextRelevance * weights.contextRelevance +
      expertiseMatch * weights.expertiseMatch +
      flowAppropriateness * weights.flowAppropriateness +
      novelty * weights.novelty +
      effectiveness * weights.effectiveness +
      strategicValue * weights.strategicValue,
      1.0
    );

    return {
      contextRelevance,
      expertiseMatch,
      flowAppropriateness,
      novelty,
      effectiveness,
      strategicValue,
      totalScore,
    };
  }

  /**
   * Calculate context relevance score
   */
  public calculateContextRelevance(
    pattern: SocraticPatternType,
    context: ScoringContext
  ): ConfidenceLevel {
    const patternInfo = this.patternLibrary.getPattern(pattern);
    if (!patternInfo) return 0;

    // Base score from context category match
    const categoryMatch = patternInfo.contextCategories.includes(context.category);
    let score = categoryMatch ? 0.8 : 0.2;

    // Context-specific pattern preferences
    const contextPreferences = this.getContextPatternPreferences();
    const preference = contextPreferences[context.category]?.[pattern];
    if (preference) {
      score = Math.min(score + preference, 1.0);
    }

    // Project phase considerations
    const phaseBonus = this.getProjectPhaseBonus(pattern, context.projectPhase);
    score = Math.min(score + phaseBonus, 1.0);

    // Current focus alignment
    if (context.currentFocus) {
      const focusAlignment = this.calculateFocusAlignment(pattern, context.currentFocus);
      score = Math.min(score + focusAlignment, 1.0);
    }

    return score;
  }

  /**
   * Calculate expertise level match score
   */
  public calculateExpertiseMatch(
    pattern: SocraticPatternType,
    context: ScoringContext,
    config?: Partial<ScoringConfig>
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
    const tolerance = config?.expertiseToleranceRange || 1;

    // Calculate distance and apply tolerance
    const distance = Math.abs(patternLevel - userLevel);
    
    if (distance <= tolerance) {
      // Within tolerance - calculate match quality
      if (distance === 0) return 1.0; // Perfect match
      return Math.max(1.0 - (distance * 0.2), 0.6); // Gradual decrease
    } else {
      // Outside tolerance - low score but not zero
      return Math.max(0.3 - (distance - tolerance) * 0.1, 0.1);
    }
  }

  /**
   * Calculate flow appropriateness score
   */
  public calculateFlowAppropriateness(
    pattern: SocraticPatternType,
    context: ScoringContext
  ): ConfidenceLevel {
    const flowState = context.conversationFlow || 'exploring';
    const currentDepth = context.currentDepth;
    
    // Pattern appropriateness by flow state
    const flowMappings = this.getFlowPatternMappings();
    const statePatterns = flowMappings[flowState];
    
    let baseScore = statePatterns?.includes(pattern) ? 0.9 : 0.4;

    // Depth-based adjustments
    const depthAdjustment = this.calculateDepthAppropriatenesss(pattern, currentDepth);
    baseScore = Math.min(baseScore + depthAdjustment, 1.0);

    // Turn count considerations
    const turnAdjustment = this.calculateTurnApproppriateness(pattern, context.turnCount);
    baseScore = Math.min(baseScore + turnAdjustment, 1.0);

    return baseScore;
  }

  /**
   * Calculate novelty/freshness score
   */
  public calculateNovelty(
    pattern: SocraticPatternType,
    recentPatterns: readonly SocraticPatternType[],
    config?: Partial<ScoringConfig>
  ): ConfidenceLevel {
    const importance = config?.noveltyImportance || 1.0;
    
    // Count recent usage (last 10 patterns)
    const recentUsage = recentPatterns.slice(-10).filter(p => p === pattern).length;
    
    // Calculate freshness (1.0 = never used recently, decreases with usage)
    const freshness = Math.max(1.0 - (recentUsage * 0.2), 0.1);
    
    // Apply importance weighting
    return freshness * importance + (1 - importance) * 0.5; // Blend with neutral score
  }

  /**
   * Calculate strategic value score
   */
  public calculateStrategicValue(
    pattern: SocraticPatternType,
    context: ScoringContext,
    config?: Partial<ScoringConfig>
  ): ConfidenceLevel {
    let strategicScore = 0.5; // Base neutral score

    // Apply strategic pattern bonuses
    const strategicBonus = config?.strategicPatterns?.[pattern] || 0;
    strategicScore = Math.min(strategicScore + strategicBonus, 1.0);

    // Context-specific strategic considerations
    const contextStrategic = this.getContextStrategicValue(pattern, context);
    strategicScore = Math.min(strategicScore + contextStrategic, 1.0);

    // Objective-based strategic value
    const objectiveValue = this.calculateObjectiveAlignment(pattern, context);
    strategicScore = Math.min(strategicScore + objectiveValue, 1.0);

    return strategicScore;
  }

  /**
   * Get context-specific pattern preferences
   */
  private getContextPatternPreferences(): Record<ContextCategory, Partial<Record<SocraticPatternType, number>>> {
    return {
      [ContextCategory.PROJECT_INCEPTION]: {
        [SocraticPatternType.DEFINITION_SEEKING]: 0.15,
        [SocraticPatternType.ASSUMPTION_EXCAVATION]: 0.12,
        [SocraticPatternType.VALUE_CLARIFICATION]: 0.1,
        [SocraticPatternType.SOLUTION_SPACE_MAPPING]: 0.08,
      },
      [ContextCategory.ARCHITECTURE_REVIEW]: {
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.15,
        [SocraticPatternType.NECESSITY_TESTING]: 0.12,
        [SocraticPatternType.IMPACT_ANALYSIS]: 0.1,
        [SocraticPatternType.CONCEPTUAL_CLARITY]: 0.08,
      },
      [ContextCategory.REQUIREMENTS_REFINEMENT]: {
        [SocraticPatternType.CONCRETE_INSTANTIATION]: 0.15,
        [SocraticPatternType.DEFINITION_SEEKING]: 0.12,
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.1,
      },
      [ContextCategory.IMPLEMENTATION_PLANNING]: {
        [SocraticPatternType.IMPACT_ANALYSIS]: 0.15,
        [SocraticPatternType.NECESSITY_TESTING]: 0.12,
        [SocraticPatternType.EPISTEMIC_HUMILITY]: 0.1,
      },
      [ContextCategory.CODE_REVIEW]: {
        [SocraticPatternType.NECESSITY_TESTING]: 0.15,
        [SocraticPatternType.CONCEPTUAL_CLARITY]: 0.12,
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.1,
      },
      [ContextCategory.GENERAL]: {
        [SocraticPatternType.DEFINITION_SEEKING]: 0.05,
        [SocraticPatternType.ASSUMPTION_EXCAVATION]: 0.05,
      },
    };
  }

  /**
   * Get project phase bonus for patterns
   */
  private getProjectPhaseBonus(pattern: SocraticPatternType, phase: string): number {
    const phaseBonuses: Record<string, Partial<Record<SocraticPatternType, number>>> = {
      planning: {
        [SocraticPatternType.DEFINITION_SEEKING]: 0.1,
        [SocraticPatternType.ASSUMPTION_EXCAVATION]: 0.08,
        [SocraticPatternType.VALUE_CLARIFICATION]: 0.06,
      },
      design: {
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.1,
        [SocraticPatternType.CONCEPTUAL_CLARITY]: 0.08,
        [SocraticPatternType.SOLUTION_SPACE_MAPPING]: 0.06,
      },
      implementation: {
        [SocraticPatternType.NECESSITY_TESTING]: 0.1,
        [SocraticPatternType.CONCRETE_INSTANTIATION]: 0.08,
      },
      testing: {
        [SocraticPatternType.CONSISTENCY_TESTING]: 0.1,
        [SocraticPatternType.IMPACT_ANALYSIS]: 0.08,
      },
      review: {
        [SocraticPatternType.IMPACT_ANALYSIS]: 0.1,
        [SocraticPatternType.VALUE_CLARIFICATION]: 0.08,
        [SocraticPatternType.EPISTEMIC_HUMILITY]: 0.06,
      },
    };

    return phaseBonuses[phase]?.[pattern] || 0;
  }

  /**
   * Calculate alignment with current focus area
   */
  private calculateFocusAlignment(pattern: SocraticPatternType, focus: string): number {
    // Simple keyword-based alignment
    const patternKeywords = this.getPatternKeywords(pattern);
    const focusWords = focus.toLowerCase().split(/\s+/);
    
    const overlap = focusWords.filter(word => 
      patternKeywords.some(keyword => keyword.includes(word) || word.includes(keyword))
    ).length;
    
    return Math.min(overlap * 0.02, 0.1); // Small bonus for alignment
  }

  /**
   * Get flow state to pattern mappings
   */
  private getFlowPatternMappings(): Record<string, SocraticPatternType[]> {
    return {
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
  }

  /**
   * Calculate depth appropriateness adjustment
   */
  private calculateDepthAppropriatenesss(pattern: SocraticPatternType, depth: number): number {
    // Shallow depths favor exploration, deep depths favor synthesis
    if (depth <= 2) {
      const explorationPatterns = [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.SOLUTION_SPACE_MAPPING,
      ];
      return explorationPatterns.includes(pattern) ? 0.05 : -0.05;
    } else if (depth >= 6) {
      const synthesisPatterns = [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
        SocraticPatternType.CONSISTENCY_TESTING,
      ];
      return synthesisPatterns.includes(pattern) ? 0.05 : -0.05;
    }
    
    return 0; // Neutral for medium depths
  }

  /**
   * Calculate turn count appropriateness
   */
  private calculateTurnApproppriateness(pattern: SocraticPatternType, turnCount: number): number {
    // Long conversations should move toward conclusion
    if (turnCount > 20) {
      const concludingPatterns = [
        SocraticPatternType.VALUE_CLARIFICATION,
        SocraticPatternType.IMPACT_ANALYSIS,
      ];
      return concludingPatterns.includes(pattern) ? 0.1 : -0.05;
    }
    
    return 0;
  }

  /**
   * Get context-specific strategic value
   */
  private getContextStrategicValue(pattern: SocraticPatternType, context: ScoringContext): number {
    // Boost patterns that are particularly valuable in current context
    if (context.extractedConcepts.length === 0 && pattern === SocraticPatternType.DEFINITION_SEEKING) {
      return 0.1; // High value when no concepts identified yet
    }
    
    if (context.detectedAssumptions.length === 0 && pattern === SocraticPatternType.ASSUMPTION_EXCAVATION) {
      return 0.1; // High value when no assumptions detected yet
    }
    
    return 0;
  }

  /**
   * Calculate objective alignment score
   */
  private calculateObjectiveAlignment(_pattern: SocraticPatternType, _context: ScoringContext): number {
    // This would integrate with session objectives when available
    // For now, return neutral score
    return 0;
  }

  /**
   * Get keywords associated with pattern types
   */
  private getPatternKeywords(pattern: SocraticPatternType): string[] {
    const keywords: Record<SocraticPatternType, string[]> = {
      [SocraticPatternType.DEFINITION_SEEKING]: ['define', 'meaning', 'concept', 'term'],
      [SocraticPatternType.ASSUMPTION_EXCAVATION]: ['assume', 'believe', 'given', 'obvious'],
      [SocraticPatternType.CONSISTENCY_TESTING]: ['conflict', 'align', 'consistent', 'contradict'],
      [SocraticPatternType.CONCRETE_INSTANTIATION]: ['example', 'specific', 'instance', 'concrete'],
      [SocraticPatternType.NECESSITY_TESTING]: ['necessary', 'required', 'essential', 'remove'],
      [SocraticPatternType.CONCEPTUAL_CLARITY]: ['difference', 'similar', 'distinguish', 'compare'],
      [SocraticPatternType.EPISTEMIC_HUMILITY]: ['unknown', 'uncertain', 'unclear', 'knowledge'],
      [SocraticPatternType.SOLUTION_SPACE_MAPPING]: ['alternative', 'option', 'approach', 'solution'],
      [SocraticPatternType.IMPACT_ANALYSIS]: ['consequence', 'effect', 'impact', 'result'],
      [SocraticPatternType.VALUE_CLARIFICATION]: ['important', 'priority', 'value', 'goal'],
    };

    return keywords[pattern] || [];
  }
}