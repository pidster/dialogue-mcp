/**
 * Dialogue flow management for tracking and transitioning conversation states
 */

import { PatternType } from '../types/patterns.js';
import { DialogueContext, DialogueSession, DialogueTurn } from '../types/sessions.js';
import { config } from '../config/config.js';
import { UUID, ConfidenceLevel } from '../types/common.js';

/**
 * Flow state transitions and rules
 */
export interface FlowTransition {
  readonly from: DialogueFlowState;
  readonly to: DialogueFlowState;
  readonly condition: string;
  readonly confidence: ConfidenceLevel;
  readonly triggeredBy: readonly PatternType[];
  readonly minTurns: number;
  readonly maxTurns?: number;
}

/**
 * Flow analysis result
 */
export interface FlowAnalysisResult {
  readonly currentState: DialogueFlowState;
  readonly stateConfidence: ConfidenceLevel;
  readonly suggestedTransition?: DialogueFlowState | undefined;
  readonly transitionConfidence?: ConfidenceLevel | undefined;
  readonly stateMetrics: FlowStateMetrics;
  readonly progressAssessment: ProgressAssessment;
  readonly recommendations: readonly string[];
}

/**
 * Dialogue flow state
 */
export type DialogueFlowState =
  | 'exploring'
  | 'deepening'
  | 'clarifying'
  | 'synthesizing'
  | 'concluding';

/**
 * Flow state metrics
 */
export interface FlowStateMetrics {
  readonly turnsInState: number;
  readonly patternsUsed: Record<PatternType, number>;
  readonly insightsGenerated: number;
  readonly averageDepth: number;
  readonly varietyScore: ConfidenceLevel;
  readonly effectiveness: ConfidenceLevel;
}

/**
 * Progress assessment
 */
export interface ProgressAssessment {
  readonly overallProgress: ConfidenceLevel;
  readonly objectiveAlignment: ConfidenceLevel;
  readonly insightQuality: ConfidenceLevel;
  readonly participantEngagement: ConfidenceLevel;
  readonly readinessForTransition: ConfidenceLevel;
  readonly completionLikelihood: ConfidenceLevel;
}

/**
 * Flow state configuration
 */
export interface FlowStateConfig {
  readonly preferredPatterns: readonly PatternType[];
  readonly maxTurnsInState: number;
  readonly minInsightsRequired: number;
  readonly transitionTriggers: readonly string[];
  readonly successCriteria: readonly string[];
}

/**
 * Flow management configuration
 */
export interface FlowManagerConfig {
  readonly states: Record<DialogueFlowState, FlowStateConfig>;
  readonly transitions: readonly FlowTransition[];
  readonly adaptToContext: boolean;
  readonly enforceMinimums: boolean;
  readonly allowBackTransitions: boolean;
}

/**
 * Dialogue flow manager for conversation state management
 */
export class DialogueFlowManager {
  private readonly config: FlowManagerConfig;
  private readonly stateHistory: Map<UUID, DialogueFlowState[]>; // sessionId -> state history
  private readonly stateMetrics: Map<string, FlowStateMetrics>; // sessionId:state -> metrics

  constructor(config?: Partial<FlowManagerConfig>) {
    this.config = { ...this.getDefaultConfig(), ...config };
    this.stateHistory = new Map();
    this.stateMetrics = new Map();
  }

  /**
   * Analyze current dialogue flow and provide recommendations
   */
  public analyzeFlow(
    session: DialogueSession,
    recentTurns: readonly DialogueTurn[],
    patternHistory: readonly PatternType[]
  ): FlowAnalysisResult {
    const currentState = session.context.conversationFlow;
    const stateConfidence = this.calculateStateConfidence(session, recentTurns);

    const stateMetrics = this.calculateStateMetrics(
      session.id,
      currentState,
      recentTurns,
      patternHistory
    );
    const progressAssessment = this.assessProgress(session, recentTurns, stateMetrics);

    const suggestedTransition = this.suggestTransition(session, stateMetrics, progressAssessment);
    const transitionConfidence = suggestedTransition
      ? this.calculateTransitionConfidence(currentState, suggestedTransition, stateMetrics)
      : undefined;

    const recommendations = this.generateRecommendations(
      currentState,
      stateMetrics,
      progressAssessment,
      suggestedTransition
    );

    return {
      currentState,
      stateConfidence,
      suggestedTransition,
      transitionConfidence,
      stateMetrics,
      progressAssessment,
      recommendations,
    };
  }

  /**
   * Transition to a new flow state
   */
  public transitionToState(
    sessionId: UUID,
    fromState: DialogueFlowState,
    toState: DialogueFlowState,
    context: DialogueContext
  ): {
    success: boolean;
    newContext: DialogueContext;
    warnings: readonly string[];
  } {
    const warnings: string[] = [];

    // Validate transition
    const validTransition = this.validateTransition(fromState, toState, context);
    if (!validTransition.isValid) {
      return {
        success: false,
        newContext: context,
        warnings: validTransition.warnings,
      };
    }

    // Record state history
    const history = this.stateHistory.get(sessionId) || [];
    history.push(toState);
    this.stateHistory.set(sessionId, history);

    // Update context
    const newContext: DialogueContext = {
      ...context,
      conversationFlow: toState,
    };

    // Check for transition warnings
    if (this.isRapidTransition(history)) {
      warnings.push('Rapid state transitions detected - consider slowing down');
    }

    if (this.isBackTransition(fromState, toState)) {
      if (!this.config.allowBackTransitions) {
        warnings.push('Back transition may indicate confusion or inadequate exploration');
      } else {
        warnings.push('Back transition detected - consider if more exploration is needed');
      }
    }

    return {
      success: true,
      newContext,
      warnings,
    };
  }

  /**
   * Get preferred patterns for current flow state
   */
  public getPreferredPatterns(state: DialogueFlowState): readonly PatternType[] {
    return this.config.states[state]?.preferredPatterns || [];
  }

  /**
   * Check if state transition is needed
   */
  public shouldTransition(
    session: DialogueSession,
    stateMetrics: FlowStateMetrics
  ): {
    shouldTransition: boolean;
    reason: string;
    suggestedState?: DialogueFlowState;
  } {
    const currentState = session.context.conversationFlow;
    const stateConfig = this.config.states[currentState];

    // Check max turns in state
    if (stateMetrics.turnsInState >= stateConfig.maxTurnsInState) {
      const nextState = this.getNextLogicalState(currentState);
      return {
        shouldTransition: true,
        reason: 'Maximum turns in current state reached',
        suggestedState: nextState,
      };
    }

    // Check if minimum insights achieved
    if (stateMetrics.insightsGenerated >= stateConfig.minInsightsRequired) {
      const readinessScore = this.calculateTransitionReadiness(session, stateMetrics);
      if (readinessScore > 0.7) {
        return {
          shouldTransition: true,
          reason: 'Sufficient insights generated and high readiness score',
          suggestedState: this.getNextLogicalState(currentState),
        };
      }
    }

    // Check for effectiveness plateau
    if (stateMetrics.effectiveness < 0.4 && stateMetrics.turnsInState > 5) {
      return {
        shouldTransition: true,
        reason: 'Low effectiveness in current state',
        suggestedState: this.getRecoveryState(currentState),
      };
    }

    return {
      shouldTransition: false,
      reason: 'Current state is productive',
    };
  }

  /**
   * Calculate state confidence based on current context
   */
  private calculateStateConfidence(
    session: DialogueSession,
    recentTurns: readonly DialogueTurn[]
  ): ConfidenceLevel {
    const currentState = session.context.conversationFlow;
    const preferredPatterns = this.config.states[currentState].preferredPatterns;

    // Analyze recent pattern alignment
    const recentPatterns = recentTurns.slice(-5).map(turn => turn.questionPattern);
    const alignedPatterns = recentPatterns.filter(pattern =>
      preferredPatterns.includes(pattern)
    ).length;

    const patternAlignment =
      recentPatterns.length > 0 ? alignedPatterns / recentPatterns.length : 0.5;

    // Factor in turn progression and insights
    const avgInsights =
      recentTurns.length > 0
        ? recentTurns.reduce((sum, turn) => sum + turn.insights.length, 0) / recentTurns.length
        : 0;

    const insightFactor = Math.min(avgInsights / 2, 1); // Normalize to 0-1

    // Combine factors
    return Math.min(patternAlignment * 0.6 + insightFactor * 0.4, 1.0);
  }

  /**
   * Calculate metrics for current state
   */
  private calculateStateMetrics(
    sessionId: UUID,
    state: DialogueFlowState,
    recentTurns: readonly DialogueTurn[],
    patternHistory: readonly PatternType[]
  ): FlowStateMetrics {
    const stateKey = `${sessionId}:${state}`;

    // Count turns in current state (from recent history)
    let turnsInState = 0;
    for (let i = recentTurns.length - 1; i >= 0; i--) {
      // This is approximate - in a real implementation we'd track state transitions
      turnsInState++;
      if (turnsInState > 20) break; // Reasonable limit
    }

    // Analyze pattern usage
    const patternsUsed: Record<PatternType, number> = {} as Record<PatternType, number>;
    for (const pattern of Object.values(PatternType)) {
      patternsUsed[pattern] = patternHistory.filter(p => p === pattern).length;
    }

    // Calculate insights generated
    const insightsGenerated = recentTurns.reduce((sum, turn) => sum + turn.insights.length, 0);

    // Calculate average depth
    const averageDepth =
      recentTurns.length > 0
        ? recentTurns.reduce((sum, turn) => sum + turn.depth, 0) / recentTurns.length
        : 0;

    // Calculate variety score
    const uniquePatterns = new Set(patternHistory.slice(-10)).size;
    const varietyScore = Math.min(uniquePatterns / 6, 1.0); // Normalize against reasonable max

    // Calculate effectiveness
    const avgSatisfaction =
      recentTurns.length > 0
        ? recentTurns
            .filter(turn => turn.userSatisfaction !== undefined)
            .reduce((sum, turn) => sum + (turn.userSatisfaction || 0), 0) / recentTurns.length
        : 0.5;

    const effectiveness = Math.min(avgSatisfaction / 5, 1.0); // Normalize 1-5 scale to 0-1

    const metrics: FlowStateMetrics = {
      turnsInState,
      patternsUsed,
      insightsGenerated,
      averageDepth,
      varietyScore,
      effectiveness,
    };

    // Cache metrics
    this.stateMetrics.set(stateKey, metrics);

    return metrics;
  }

  /**
   * Assess overall progress in the dialogue
   */
  private assessProgress(
    session: DialogueSession,
    recentTurns: readonly DialogueTurn[],
    stateMetrics: FlowStateMetrics
  ): ProgressAssessment {
    const objectivesCompleted = session.objectives.filter(obj => obj.completed).length;
    const totalObjectives = session.objectives.length;

    // Calculate objective alignment
    const objectiveAlignment = totalObjectives > 0 ? objectivesCompleted / totalObjectives : 0.5;

    // Calculate insight quality based on recent insights
    const recentInsights = recentTurns.flatMap(turn => turn.insights);
    const insightQuality =
      recentInsights.length > 0
        ? Math.min(recentInsights.length / (recentTurns.length || 1), 1.0)
        : 0;

    // Participant engagement from satisfaction scores
    const participantEngagement = stateMetrics.effectiveness;

    // Readiness for transition based on state metrics
    const readinessForTransition = this.calculateTransitionReadiness(session, stateMetrics);

    // Overall progress combines multiple factors
    const overallProgress =
      objectiveAlignment * 0.3 +
      insightQuality * 0.25 +
      participantEngagement * 0.25 +
      stateMetrics.varietyScore * 0.2;

    // Completion likelihood based on progress and remaining objectives
    const completionLikelihood = Math.min(
      overallProgress * 1.2, // Boost if making good progress
      1.0
    );

    return {
      overallProgress,
      objectiveAlignment,
      insightQuality,
      participantEngagement,
      readinessForTransition,
      completionLikelihood,
    };
  }

  /**
   * Suggest next flow state transition
   */
  private suggestTransition(
    session: DialogueSession,
    stateMetrics: FlowStateMetrics,
    progressAssessment: ProgressAssessment
  ): DialogueFlowState | undefined {
    const currentState = session.context.conversationFlow;

    // Don't suggest transition if we're effective in current state
    if (stateMetrics.effectiveness > 0.7 && progressAssessment.readinessForTransition < 0.6) {
      return undefined;
    }

    // Suggest based on progress and state
    switch (currentState) {
      case 'exploring':
        if (stateMetrics.varietyScore > 0.6 || stateMetrics.turnsInState > 8) {
          return 'deepening';
        }
        break;

      case 'deepening':
        if (stateMetrics.insightsGenerated > 3 || progressAssessment.insightQuality > 0.7) {
          return 'clarifying';
        }
        break;

      case 'clarifying':
        if (progressAssessment.objectiveAlignment > 0.6) {
          return 'synthesizing';
        }
        break;

      case 'synthesizing':
        if (progressAssessment.overallProgress > 0.8) {
          return 'concluding';
        }
        break;

      case 'concluding':
        // Stay in concluding state
        return undefined;
    }

    return undefined;
  }

  /**
   * Calculate confidence in a proposed transition
   */
  private calculateTransitionConfidence(
    fromState: DialogueFlowState,
    toState: DialogueFlowState,
    stateMetrics: FlowStateMetrics
  ): ConfidenceLevel {
    const validTransitions = this.config.transitions.filter(
      t => t.from === fromState && t.to === toState
    );

    if (validTransitions.length === 0) {
      return 0.1; // Low confidence for invalid transitions
    }

    // Base confidence from transition rules
    const baseConfidence = validTransitions[0].confidence;

    // Adjust based on state metrics
    const effectivenessBonus = stateMetrics.effectiveness > 0.5 ? 0.1 : -0.1;
    const varietyBonus = stateMetrics.varietyScore > 0.6 ? 0.1 : 0;

    return Math.min(Math.max(baseConfidence + effectivenessBonus + varietyBonus, 0), 1.0);
  }

  /**
   * Generate flow recommendations
   */
  private generateRecommendations(
    currentState: DialogueFlowState,
    stateMetrics: FlowStateMetrics,
    progressAssessment: ProgressAssessment,
    suggestedTransition?: DialogueFlowState
  ): readonly string[] {
    const recommendations: string[] = [];

    // State-specific recommendations
    if (stateMetrics.effectiveness < 0.4) {
      recommendations.push(
        `Consider different patterns - current effectiveness is low in ${currentState} state`
      );
    }

    if (stateMetrics.varietyScore < 0.3) {
      recommendations.push('Increase pattern variety to explore different perspectives');
    }

    if (progressAssessment.participantEngagement < 0.5) {
      recommendations.push(
        'Focus on improving participant engagement through more relevant questions'
      );
    }

    // Transition recommendations
    if (suggestedTransition) {
      recommendations.push(
        `Consider transitioning to ${suggestedTransition} state for better progress`
      );
    }

    // Progress-specific recommendations
    if (progressAssessment.objectiveAlignment < 0.3) {
      recommendations.push('Realign dialogue with session objectives');
    }

    if (progressAssessment.insightQuality < 0.4) {
      recommendations.push(
        'Focus on generating higher quality insights through deeper questioning'
      );
    }

    return recommendations;
  }

  /**
   * Validate state transition
   */
  private validateTransition(
    fromState: DialogueFlowState,
    toState: DialogueFlowState,
    context: DialogueContext
  ): { isValid: boolean; warnings: readonly string[] } {
    const warnings: string[] = [];

    // Allow same-state transitions (staying in current state)
    if (fromState === toState) {
      return {
        isValid: true,
        warnings: [],
      };
    }

    // Check if transition exists in configuration
    const validTransition = this.config.transitions.find(
      t => t.from === fromState && t.to === toState
    );

    if (!validTransition) {
      return {
        isValid: false,
        warnings: [`No valid transition from ${fromState} to ${toState}`],
      };
    }

    // Check minimum turns requirement
    if (context.turnCount < validTransition.minTurns) {
      warnings.push(
        `Transition may be premature - minimum ${validTransition.minTurns} turns recommended`
      );
    }

    // Check maximum turns if specified
    if (validTransition.maxTurns && context.turnCount > validTransition.maxTurns) {
      warnings.push(`Transition is overdue - maximum ${validTransition.maxTurns} turns exceeded`);
    }

    return {
      isValid: true,
      warnings,
    };
  }

  /**
   * Check for rapid state transitions
   */
  private isRapidTransition(stateHistory: readonly DialogueFlowState[]): boolean {
    if (stateHistory.length < 3) return false;

    // Check if last 3 states are all different
    const recent = stateHistory.slice(-3);
    return new Set(recent).size === 3;
  }

  /**
   * Check if this is a backwards transition
   */
  private isBackTransition(fromState: DialogueFlowState, toState: DialogueFlowState): boolean {
    const stateOrder: DialogueFlowState[] = [
      'exploring',
      'deepening',
      'clarifying',
      'synthesizing',
      'concluding',
    ];
    const fromIndex = stateOrder.indexOf(fromState);
    const toIndex = stateOrder.indexOf(toState);
    return toIndex < fromIndex;
  }

  /**
   * Get next logical state in progression
   */
  private getNextLogicalState(currentState: DialogueFlowState): DialogueFlowState {
    const progressionMap: Record<DialogueFlowState, DialogueFlowState> = {
      exploring: 'deepening',
      deepening: 'clarifying',
      clarifying: 'synthesizing',
      synthesizing: 'concluding',
      concluding: 'concluding', // Stay in final state
    };

    return progressionMap[currentState];
  }

  /**
   * Get recovery state for when current state is ineffective
   */
  private getRecoveryState(currentState: DialogueFlowState): DialogueFlowState {
    // Generally go back one state to re-establish foundation
    const recoveryMap: Record<DialogueFlowState, DialogueFlowState> = {
      exploring: 'exploring', // Stay and try different patterns
      deepening: 'exploring',
      clarifying: 'deepening',
      synthesizing: 'clarifying',
      concluding: 'synthesizing',
    };

    return recoveryMap[currentState];
  }

  /**
   * Calculate readiness for transition
   */
  private calculateTransitionReadiness(
    session: DialogueSession,
    stateMetrics: FlowStateMetrics
  ): ConfidenceLevel {
    const stateConfig = this.config.states[session.context.conversationFlow];

    // Factor in insights generated vs required
    const insightRatio =
      stateConfig.minInsightsRequired > 0
        ? Math.min(stateMetrics.insightsGenerated / stateConfig.minInsightsRequired, 1.0)
        : 1.0;

    // Factor in variety and effectiveness
    const readiness =
      insightRatio * 0.4 + stateMetrics.varietyScore * 0.3 + stateMetrics.effectiveness * 0.3;

    return Math.min(readiness, 1.0);
  }

  /**
   * Get default flow manager configuration
   */
  private getDefaultConfig(): FlowManagerConfig {
    return {
      states: {
        exploring: {
          preferredPatterns: [
            PatternType.DEFINITION_SEEKING,
            PatternType.ASSUMPTION_EXCAVATION,
            PatternType.SOLUTION_SPACE_MAPPING,
            PatternType.EPISTEMIC_HUMILITY,
          ],
          maxTurnsInState: config.flow.maxTurnsInState.exploring,
          minInsightsRequired: 2,
          transitionTriggers: ['multiple_concepts_identified', 'assumptions_surfaced'],
          successCriteria: ['domain_mapped', 'key_concepts_defined'],
        },
        deepening: {
          preferredPatterns: [
            PatternType.CONSISTENCY_TESTING,
            PatternType.NECESSITY_TESTING,
            PatternType.ASSUMPTION_EXCAVATION,
            PatternType.IMPACT_ANALYSIS,
          ],
          maxTurnsInState: config.flow.maxTurnsInState.deepening,
          minInsightsRequired: 3,
          transitionTriggers: ['contradictions_found', 'deep_insights_generated'],
          successCriteria: ['assumptions_tested', 'consistency_validated'],
        },
        clarifying: {
          preferredPatterns: [
            PatternType.CONCRETE_INSTANTIATION,
            PatternType.CONCEPTUAL_CLARITY,
            PatternType.DEFINITION_SEEKING,
          ],
          maxTurnsInState: config.flow.maxTurnsInState.clarifying,
          minInsightsRequired: 2,
          transitionTriggers: ['definitions_clarified', 'examples_provided'],
          successCriteria: ['concepts_clarified', 'examples_concrete'],
        },
        synthesizing: {
          preferredPatterns: [
            PatternType.IMPACT_ANALYSIS,
            PatternType.VALUE_CLARIFICATION,
            PatternType.CONSISTENCY_TESTING,
          ],
          maxTurnsInState: config.flow.maxTurnsInState.synthesizing,
          minInsightsRequired: 2,
          transitionTriggers: ['insights_connected', 'values_clarified'],
          successCriteria: ['insights_synthesized', 'priorities_clear'],
        },
        concluding: {
          preferredPatterns: [PatternType.VALUE_CLARIFICATION, PatternType.IMPACT_ANALYSIS],
          maxTurnsInState: config.flow.maxTurnsInState.concluding,
          minInsightsRequired: 1,
          transitionTriggers: ['conclusions_reached'],
          successCriteria: ['objectives_met', 'decisions_informed'],
        },
      },
      transitions: [
        {
          from: 'exploring',
          to: 'deepening',
          condition: 'sufficient_exploration',
          confidence: 0.8,
          triggeredBy: [PatternType.ASSUMPTION_EXCAVATION],
          minTurns: 3,
        },
        {
          from: 'deepening',
          to: 'clarifying',
          condition: 'insights_generated',
          confidence: 0.8,
          triggeredBy: [PatternType.CONSISTENCY_TESTING],
          minTurns: 2,
        },
        {
          from: 'clarifying',
          to: 'synthesizing',
          condition: 'concepts_clear',
          confidence: 0.8,
          triggeredBy: [PatternType.CONCRETE_INSTANTIATION],
          minTurns: 2,
        },
        {
          from: 'synthesizing',
          to: 'concluding',
          condition: 'ready_to_conclude',
          confidence: 0.8,
          triggeredBy: [PatternType.VALUE_CLARIFICATION],
          minTurns: 2,
        },
        // Back transitions for recovery
        {
          from: 'deepening',
          to: 'exploring',
          condition: 'need_more_exploration',
          confidence: 0.6,
          triggeredBy: [PatternType.EPISTEMIC_HUMILITY],
          minTurns: 1,
        },
        {
          from: 'clarifying',
          to: 'deepening',
          condition: 'need_deeper_analysis',
          confidence: 0.6,
          triggeredBy: [PatternType.NECESSITY_TESTING],
          minTurns: 1,
        },
        {
          from: 'synthesizing',
          to: 'clarifying',
          condition: 'concepts_unclear',
          confidence: 0.6,
          triggeredBy: [PatternType.CONCEPTUAL_CLARITY],
          minTurns: 1,
        },
      ],
      adaptToContext: true,
      enforceMinimums: true,
      allowBackTransitions: true,
    };
  }
}
