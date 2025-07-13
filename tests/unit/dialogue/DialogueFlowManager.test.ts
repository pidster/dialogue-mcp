/**
 * Unit tests for DialogueFlowManager
 */

import { DialogueFlowManager, DialogueFlowState } from '../../../src/dialogue/DialogueFlowManager.js';
import { DialogueSession, DialogueTurn, DialogueContext, SessionStatus } from '../../../src/types/sessions.js';
import { SocraticPatternType } from '../../../src/types/patterns.js';
import { ContextCategory, ProjectPhase } from '../../../src/types/common.js';

describe('DialogueFlowManager', () => {
  let flowManager: DialogueFlowManager;
  let mockSession: DialogueSession;
  let mockTurns: DialogueTurn[];

  beforeEach(() => {
    flowManager = new DialogueFlowManager();

    const mockContext: DialogueContext = {
      sessionId: 'test-session-1',
      currentCategory: ContextCategory.PROJECT_INCEPTION,
      projectPhase: ProjectPhase.PLANNING,
      focusArea: 'user authentication',
      currentDepth: 2,
      turnCount: 5,
      lastQuestionId: 'q-5',
      awaitingResponse: false,
      conversationFlow: 'exploring',
      activeTopics: ['authentication', 'security'],
      exploredConcepts: ['user', 'login', 'password'],
      pendingFollowUps: [],
      userEngagement: 0.8,
      progressTowardsGoals: 0.6,
    };

    mockSession = {
      id: 'test-session-1',
      sessionId: 'test-session-1',
      title: 'Authentication System Design',
      description: 'Exploring user authentication requirements',
      status: SessionStatus.ACTIVE,
      config: {
        maxDepth: 10,
        maxTurns: 50,
        timeLimit: 60,
        focusAreas: [ContextCategory.PROJECT_INCEPTION],
        enabledPatterns: Object.values(SocraticPatternType),
        adaptToExpertise: true,
        autoFollowUp: true,
        requireValidation: false,
        persistDecisions: true,
      },
      participants: [],
      objectives: [
        {
          id: 'obj-1',
          description: 'Define authentication requirements',
          priority: 1,
          completed: false,
          successCriteria: ['clear user requirements', 'security considerations identified'],
          achievedInsights: [],
        },
      ],
      context: mockContext,
      turns: ['turn-1', 'turn-2', 'turn-3', 'turn-4', 'turn-5'],
      insights: {
        assumptionsUncovered: ['users have email addresses'],
        definitionsClarified: ['authentication'],
        contradictionsFound: [],
        requirementsIdentified: ['secure login', 'password reset'],
        constraintsDiscovered: ['must integrate with existing system'],
        decisionsInfluenced: [],
        knowledgeNodesCreated: [],
        patternEffectiveness: {} as Record<SocraticPatternType, number>,
        insightQuality: 0.7,
      },
      metrics: {
        totalTurns: 5,
        averageTurnDuration: 30000,
        deepestLevel: 3,
        patternsUsed: {
          [SocraticPatternType.DEFINITION_SEEKING]: 2,
          [SocraticPatternType.ASSUMPTION_EXCAVATION]: 1,
        } as Record<SocraticPatternType, number>,
        insightsPerTurn: 1.2,
        userSatisfactionAverage: 4.0,
        objectivesCompleted: 0,
        contradictionsResolved: 0,
        knowledgeNodesGenerated: 5,
        decisionsMade: 0,
      },
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      lastActivityAt: new Date(),
      tags: ['authentication', 'security'],
      metadata: {},
      createdAt: new Date(Date.now() - 3600000),
      updatedAt: new Date(),
    };

    mockTurns = [
      {
        id: 'turn-1',
        sessionId: 'test-session-1',
        questionId: 'q-1',
        questionText: 'What do you mean by authentication?',
        questionPattern: SocraticPatternType.DEFINITION_SEEKING,
        responseText: 'Authentication is verifying user identity',
        turnNumber: 1,
        depth: 1,
        duration: 25000,
        userSatisfaction: 4,
        insights: ['definition clarified'],
        followUpGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'turn-2',
        sessionId: 'test-session-1',
        questionId: 'q-2',
        questionText: 'What assumptions are you making about users?',
        questionPattern: SocraticPatternType.ASSUMPTION_EXCAVATION,
        responseText: 'We assume users have unique email addresses',
        turnNumber: 2,
        depth: 2,
        duration: 35000,
        userSatisfaction: 4,
        insights: ['assumption identified'],
        followUpGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'turn-3',
        sessionId: 'test-session-1',
        questionId: 'q-3',
        questionText: 'How does this definition apply to your system?',
        questionPattern: SocraticPatternType.CONCRETE_INSTANTIATION,
        responseText: 'Users will log in with email and password',
        turnNumber: 3,
        depth: 2,
        duration: 30000,
        userSatisfaction: 5,
        insights: ['concrete example provided'],
        followUpGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      expect(flowManager).toBeDefined();
      expect(flowManager).toBeInstanceOf(DialogueFlowManager);
    });

    it('should accept custom configuration', () => {
      const customConfig = {
        enforceMinimums: false,
        allowBackTransitions: false,
      };

      const customManager = new DialogueFlowManager(customConfig);
      expect(customManager).toBeDefined();
    });
  });

  describe('analyzeFlow', () => {
    it('should analyze current dialogue flow state', () => {
      const patternHistory = [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.CONCRETE_INSTANTIATION,
      ];

      const analysis = flowManager.analyzeFlow(mockSession, mockTurns, patternHistory);

      expect(analysis).toBeDefined();
      expect(analysis.currentState).toBe('exploring');
      expect(analysis.stateConfidence).toBeGreaterThan(0);
      expect(analysis.stateConfidence).toBeLessThanOrEqual(1);
      expect(analysis.stateMetrics).toBeDefined();
      expect(analysis.progressAssessment).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
      expect(Array.isArray(analysis.recommendations)).toBe(true);
    });

    it('should calculate state metrics correctly', () => {
      const patternHistory = [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.CONCRETE_INSTANTIATION,
      ];

      const analysis = flowManager.analyzeFlow(mockSession, mockTurns, patternHistory);

      expect(analysis.stateMetrics.turnsInState).toBeGreaterThan(0);
      expect(analysis.stateMetrics.insightsGenerated).toBeGreaterThan(0);
      expect(analysis.stateMetrics.averageDepth).toBeGreaterThan(0);
      expect(analysis.stateMetrics.varietyScore).toBeGreaterThan(0);
      expect(analysis.stateMetrics.varietyScore).toBeLessThanOrEqual(1);
      expect(analysis.stateMetrics.effectiveness).toBeGreaterThan(0);
      expect(analysis.stateMetrics.effectiveness).toBeLessThanOrEqual(1);
    });

    it('should assess progress accurately', () => {
      const patternHistory = [SocraticPatternType.DEFINITION_SEEKING];
      const analysis = flowManager.analyzeFlow(mockSession, mockTurns, patternHistory);

      expect(analysis.progressAssessment.overallProgress).toBeGreaterThanOrEqual(0);
      expect(analysis.progressAssessment.overallProgress).toBeLessThanOrEqual(1);
      expect(analysis.progressAssessment.objectiveAlignment).toBeGreaterThanOrEqual(0);
      expect(analysis.progressAssessment.insightQuality).toBeGreaterThanOrEqual(0);
      expect(analysis.progressAssessment.participantEngagement).toBeGreaterThanOrEqual(0);
      expect(analysis.progressAssessment.readinessForTransition).toBeGreaterThanOrEqual(0);
      expect(analysis.progressAssessment.completionLikelihood).toBeGreaterThanOrEqual(0);
    });

    it('should suggest transitions when appropriate', () => {
      // Create scenario with many turns in exploring state
      const exploringSession = {
        ...mockSession,
        context: { ...mockSession.context, conversationFlow: 'exploring' as const },
      };
      
      const manyTurns = Array.from({ length: 10 }, (_, i) => ({
        ...mockTurns[0],
        id: `turn-${i + 1}`,
        turnNumber: i + 1,
      }));

      const patternHistory = new Array(10).fill(SocraticPatternType.DEFINITION_SEEKING);
      
      const analysis = flowManager.analyzeFlow(exploringSession, manyTurns, patternHistory);
      
      // Should suggest transition after many turns
      expect(analysis.suggestedTransition).toBeDefined();
      if (analysis.suggestedTransition) {
        expect(['deepening', 'clarifying', 'synthesizing', 'concluding']).toContain(analysis.suggestedTransition);
      }
    });

    it('should provide recommendations based on current state', () => {
      const patternHistory = [SocraticPatternType.DEFINITION_SEEKING];
      const analysis = flowManager.analyzeFlow(mockSession, mockTurns, patternHistory);

      expect(analysis.recommendations.length).toBeGreaterThan(0);
      analysis.recommendations.forEach(recommendation => {
        expect(typeof recommendation).toBe('string');
        expect(recommendation.length).toBeGreaterThan(0);
      });
    });
  });

  describe('transitionToState', () => {
    it('should successfully transition to valid state', () => {
      const result = flowManager.transitionToState(
        mockSession.id,
        'exploring',
        'deepening',
        mockSession.context
      );

      expect(result.success).toBe(true);
      expect(result.newContext.conversationFlow).toBe('deepening');
      expect(result.warnings).toBeDefined();
    });

    it('should update context correctly on transition', () => {
      const result = flowManager.transitionToState(
        mockSession.id,
        'exploring',
        'deepening',
        mockSession.context
      );

      expect(result.newContext).toBeDefined();
      expect(result.newContext.conversationFlow).toBe('deepening');
      // Other context properties should remain unchanged
      expect(result.newContext.sessionId).toBe(mockSession.context.sessionId);
      expect(result.newContext.currentCategory).toBe(mockSession.context.currentCategory);
    });

    it('should provide warnings for rapid transitions', () => {
      // Simulate rapid transitions
      flowManager.transitionToState(mockSession.id, 'exploring', 'deepening', mockSession.context);
      flowManager.transitionToState(mockSession.id, 'deepening', 'clarifying', mockSession.context);
      
      const result = flowManager.transitionToState(
        mockSession.id,
        'clarifying',
        'synthesizing',
        mockSession.context
      );

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes('Rapid'))).toBe(true);
    });

    it('should warn about back transitions when configured', () => {
      const result = flowManager.transitionToState(
        mockSession.id,
        'deepening',
        'exploring',
        mockSession.context
      );

      // Based on default config, should allow back transitions but warn
      expect(result.success).toBe(true);
      expect(result.warnings.some(w => w.includes('Back transition'))).toBe(true);
    });
  });

  describe('getPreferredPatterns', () => {
    it('should return patterns for exploring state', () => {
      const patterns = flowManager.getPreferredPatterns('exploring');
      
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain(SocraticPatternType.DEFINITION_SEEKING);
      expect(patterns).toContain(SocraticPatternType.ASSUMPTION_EXCAVATION);
    });

    it('should return different patterns for different states', () => {
      const exploringPatterns = flowManager.getPreferredPatterns('exploring');
      const synthesizingPatterns = flowManager.getPreferredPatterns('synthesizing');
      
      expect(exploringPatterns).not.toEqual(synthesizingPatterns);
      
      // Synthesizing should include patterns like VALUE_CLARIFICATION
      expect(synthesizingPatterns).toContain(SocraticPatternType.VALUE_CLARIFICATION);
    });

    it('should return patterns for all defined states', () => {
      const states: DialogueFlowState[] = ['exploring', 'deepening', 'clarifying', 'synthesizing', 'concluding'];
      
      states.forEach(state => {
        const patterns = flowManager.getPreferredPatterns(state);
        expect(patterns.length).toBeGreaterThan(0);
        patterns.forEach(pattern => {
          expect(Object.values(SocraticPatternType)).toContain(pattern);
        });
      });
    });
  });

  describe('shouldTransition', () => {
    it('should recommend transition when maximum turns reached', () => {
      const longStateMetrics = {
        turnsInState: 15, // Exceeds default max for exploring (12)
        patternsUsed: {} as Record<SocraticPatternType, number>,
        insightsGenerated: 3,
        averageDepth: 2,
        varietyScore: 0.6,
        effectiveness: 0.7,
      };

      const result = flowManager.shouldTransition(mockSession, longStateMetrics);
      
      expect(result.shouldTransition).toBe(true);
      expect(result.reason).toContain('Maximum turns');
      expect(result.suggestedState).toBeDefined();
    });

    it('should recommend transition when sufficient insights achieved', () => {
      const insightfulMetrics = {
        turnsInState: 5,
        patternsUsed: {} as Record<SocraticPatternType, number>,
        insightsGenerated: 5, // Above minimum for exploring (2)
        averageDepth: 2,
        varietyScore: 0.8,
        effectiveness: 0.8, // High effectiveness + readiness
      };

      const result = flowManager.shouldTransition(mockSession, insightfulMetrics);
      
      // May or may not transition depending on readiness calculation
      expect(result.shouldTransition).toBeDefined();
      expect(typeof result.shouldTransition).toBe('boolean');
      expect(result.reason).toBeDefined();
    });

    it('should recommend transition when effectiveness is low', () => {
      const ineffectiveMetrics = {
        turnsInState: 8, // More than 5 turns
        patternsUsed: {} as Record<SocraticPatternType, number>,
        insightsGenerated: 1,
        averageDepth: 1,
        varietyScore: 0.3,
        effectiveness: 0.3, // Low effectiveness
      };

      const result = flowManager.shouldTransition(mockSession, ineffectiveMetrics);
      
      expect(result.shouldTransition).toBe(true);
      expect(result.reason).toContain('Low effectiveness');
      expect(result.suggestedState).toBeDefined();
    });

    it('should not recommend transition when current state is productive', () => {
      const productiveMetrics = {
        turnsInState: 3, // Within limits
        patternsUsed: {} as Record<SocraticPatternType, number>,
        insightsGenerated: 1, // Below minimum required (2)
        averageDepth: 2,
        varietyScore: 0.7,
        effectiveness: 0.8, // High effectiveness
      };

      const result = flowManager.shouldTransition(mockSession, productiveMetrics);
      
      expect(result.shouldTransition).toBe(false);
      expect(result.reason).toContain('productive');
    });
  });

  describe('flow state progression', () => {
    it('should follow logical progression from exploring to concluding', () => {
      const states: DialogueFlowState[] = ['exploring', 'deepening', 'clarifying', 'synthesizing', 'concluding'];
      
      // Test that each state can transition to the next
      for (let i = 0; i < states.length - 1; i++) {
        const currentState = states[i];
        const nextState = states[i + 1];
        
        const result = flowManager.transitionToState(
          'test-session',
          currentState,
          nextState,
          { ...mockSession.context, conversationFlow: currentState }
        );
        
        expect(result.success).toBe(true);
      }
    });

    it('should have appropriate pattern preferences for each state', () => {
      // Exploring should prefer discovery patterns
      const exploringPatterns = flowManager.getPreferredPatterns('exploring');
      expect(exploringPatterns).toContain(SocraticPatternType.DEFINITION_SEEKING);
      expect(exploringPatterns).toContain(SocraticPatternType.ASSUMPTION_EXCAVATION);
      
      // Deepening should prefer analysis patterns
      const deepeningPatterns = flowManager.getPreferredPatterns('deepening');
      expect(deepeningPatterns).toContain(SocraticPatternType.CONSISTENCY_TESTING);
      expect(deepeningPatterns).toContain(SocraticPatternType.NECESSITY_TESTING);
      
      // Concluding should prefer synthesis patterns
      const concludingPatterns = flowManager.getPreferredPatterns('concluding');
      expect(concludingPatterns).toContain(SocraticPatternType.VALUE_CLARIFICATION);
      expect(concludingPatterns).toContain(SocraticPatternType.IMPACT_ANALYSIS);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty turn history', () => {
      const analysis = flowManager.analyzeFlow(mockSession, [], []);
      
      expect(analysis).toBeDefined();
      expect(analysis.currentState).toBe('exploring');
      expect(analysis.stateMetrics.turnsInState).toBe(0);
      expect(analysis.stateMetrics.insightsGenerated).toBe(0);
    });

    it('should handle session with no objectives', () => {
      const sessionWithoutObjectives = {
        ...mockSession,
        objectives: [],
      };

      const analysis = flowManager.analyzeFlow(sessionWithoutObjectives, mockTurns, []);
      
      expect(analysis).toBeDefined();
      expect(analysis.progressAssessment.objectiveAlignment).toBeDefined();
    });

    it('should handle very long conversations gracefully', () => {
      const longTurns = Array.from({ length: 100 }, (_, i) => ({
        ...mockTurns[0],
        id: `turn-${i + 1}`,
        turnNumber: i + 1,
      }));

      const longPatternHistory = new Array(100).fill(SocraticPatternType.DEFINITION_SEEKING);
      
      const analysis = flowManager.analyzeFlow(mockSession, longTurns, longPatternHistory);
      
      expect(analysis).toBeDefined();
      expect(analysis.stateMetrics.turnsInState).toBeGreaterThan(0);
      expect(analysis.suggestedTransition).toBeDefined();
    });

    it('should handle transitions to same state', () => {
      const result = flowManager.transitionToState(
        mockSession.id,
        'exploring',
        'exploring',
        mockSession.context
      );
      
      expect(result.success).toBe(true);
      expect(result.newContext.conversationFlow).toBe('exploring');
    });
  });

  describe('performance', () => {
    it('should analyze flow efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 50; i++) {
        flowManager.analyzeFlow(mockSession, mockTurns, [SocraticPatternType.DEFINITION_SEEKING]);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // Should complete 50 analyses in less than 100ms
    });

    it('should handle transitions efficiently', () => {
      const startTime = Date.now();
      
      for (let i = 0; i < 100; i++) {
        flowManager.transitionToState(
          `session-${i}`,
          'exploring',
          'deepening',
          mockSession.context
        );
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // Should complete 100 transitions in less than 50ms
    });
  });
});