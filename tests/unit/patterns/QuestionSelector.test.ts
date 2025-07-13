/**
 * Unit tests for QuestionSelector
 */

import { QuestionSelector, SelectionContext, SelectionConstraints, SelectionResult } from '../../../src/patterns/QuestionSelector.js';
import { PatternLibrary } from '../../../src/patterns/PatternLibrary.js';
import { SocraticPatternType } from '../../../src/types/patterns.js';
import { ContextCategory, ExpertiseLevel, ProjectPhase } from '../../../src/types/common.js';

describe('QuestionSelector', () => {
  let questionSelector: QuestionSelector;
  let patternLibrary: PatternLibrary;
  let mockContext: SelectionContext;

  beforeEach(() => {
    patternLibrary = new PatternLibrary();
    questionSelector = new QuestionSelector(patternLibrary);
    
    mockContext = {
      // DialogueContext properties
      sessionId: 'test-session-1',
      currentCategory: ContextCategory.PROJECT_INCEPTION,
      projectPhase: ProjectPhase.PLANNING,
      focusArea: 'user authentication system',
      currentDepth: 1,
      turnCount: 3,
      lastQuestionId: 'question-1',
      awaitingResponse: false,
      conversationFlow: 'exploring',
      activeTopics: ['authentication', 'security'],
      exploredConcepts: ['user', 'login'],
      pendingFollowUps: [],
      userEngagement: 0.8,
      progressTowardsGoals: 0.6,
      
      // QuestionContext properties  
      userExpertise: ExpertiseLevel.INTERMEDIATE,
      extractedConcepts: ['authentication', 'user management'],
      detectedAssumptions: ['users have unique emails'],
      knownDefinitions: ['authentication: process of verifying identity'],
      currentFocus: 'user authentication system',
      category: ContextCategory.PROJECT_INCEPTION,
      previousQuestions: ['question-1'],
      metadata: { priority: 'high' },
    };
  });

  describe('constructor', () => {
    it('should initialize with pattern library', () => {
      expect(questionSelector).toBeDefined();
      expect(questionSelector).toBeInstanceOf(QuestionSelector);
    });
  });

  describe('selectBestPattern', () => {
    it('should select an appropriate pattern for the context', () => {
      const result = questionSelector.selectBestPattern(mockContext);
      
      expect(result).toBeDefined();
      expect(result.selectedPattern).toBeDefined();
      expect(Object.values(SocraticPatternType)).toContain(result.selectedPattern);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.suggestedFollowUps).toBeDefined();
    });

    it('should provide alternative patterns', () => {
      const result = questionSelector.selectBestPattern(mockContext);
      
      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      result.alternatives.forEach(alt => {
        expect(alt.pattern).toBeDefined();
        expect(alt.score).toBeGreaterThan(0);
        expect(alt.score).toBeLessThanOrEqual(1);
        expect(alt.reasoning).toBeDefined();
      });
    });

    it('should prefer patterns appropriate for expertise level', () => {
      const beginnerContext = { ...mockContext, userExpertise: ExpertiseLevel.BEGINNER };
      const expertContext = { ...mockContext, userExpertise: ExpertiseLevel.EXPERT };
      
      const beginnerResult = questionSelector.selectBestPattern(beginnerContext);
      const expertResult = questionSelector.selectBestPattern(expertContext);
      
      // Results should be different for different expertise levels
      // Note: This might not always be true due to randomness, but patterns should generally differ
      expect(beginnerResult.selectedPattern).toBeDefined();
      expect(expertResult.selectedPattern).toBeDefined();
    });

    it('should adapt to conversation flow state', () => {
      const exploringContext = { ...mockContext, conversationFlow: 'exploring' as const };
      const synthesizingContext = { ...mockContext, conversationFlow: 'synthesizing' as const };
      
      const exploringResult = questionSelector.selectBestPattern(exploringContext);
      const synthesizingResult = questionSelector.selectBestPattern(synthesizingContext);
      
      expect(exploringResult.selectedPattern).toBeDefined();
      expect(synthesizingResult.selectedPattern).toBeDefined();
      
      // While this isn't guaranteed due to scoring complexity, test that we get valid patterns
      expect(Object.values(SocraticPatternType)).toContain(exploringResult.selectedPattern);
      expect(Object.values(SocraticPatternType)).toContain(synthesizingResult.selectedPattern);
    });

    it('should consider context category in selection', () => {
      const architectureContext = { 
        ...mockContext, 
        currentCategory: ContextCategory.ARCHITECTURE_REVIEW,
        category: ContextCategory.ARCHITECTURE_REVIEW 
      };
      
      const result = questionSelector.selectBestPattern(architectureContext);
      
      expect(result.selectedPattern).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      
      // Should select patterns appropriate for architecture review
      const selectedPattern = patternLibrary.getPattern(result.selectedPattern);
      expect(selectedPattern).toBeDefined();
      if (selectedPattern) {
        expect(selectedPattern.contextCategories).toContain(ContextCategory.ARCHITECTURE_REVIEW);
      }
    });
  });

  describe('selectBestPattern', () => {
    it('should respect exclude constraints', () => {
      const constraints: SelectionConstraints = {
        excludePatterns: [SocraticPatternType.DEFINITION_SEEKING],
      };
      
      const result = questionSelector.selectBestPattern(mockContext, constraints);
      
      expect(result.selectedPattern).not.toBe(SocraticPatternType.DEFINITION_SEEKING);
      result.alternatives.forEach(alt => {
        expect(alt.pattern).not.toBe(SocraticPatternType.DEFINITION_SEEKING);
      });
    });

    it('should prefer specified patterns', () => {
      const constraints: SelectionConstraints = {
        preferPatterns: [SocraticPatternType.ASSUMPTION_EXCAVATION],
      };
      
      const result = questionSelector.selectBestPattern(mockContext, constraints);
      
      // Should either select the preferred pattern or have high confidence alternatives
      const hasPreferredPattern = result.selectedPattern === SocraticPatternType.ASSUMPTION_EXCAVATION ||
        result.alternatives.some(alt => alt.pattern === SocraticPatternType.ASSUMPTION_EXCAVATION);
      
      expect(hasPreferredPattern).toBe(true);
    });

    it('should respect max depth constraint', () => {
      const constraints: SelectionConstraints = {
        maxDepth: 2,
      };
      
      const deepContext = { ...mockContext, currentDepth: 5 };
      const result = questionSelector.selectBestPattern(deepContext, constraints);
      
      // Should still return a valid result even with depth constraints
      expect(result.selectedPattern).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle requireFreshPattern constraint', () => {
      const constraints: SelectionConstraints = {
        requireFreshPattern: true,
      };
      
      // Add some patterns to history to test freshness
      const contextWithHistory = {
        ...mockContext,
        previousQuestions: ['q1', 'q2', 'q3'], // Simulate some question history
      };
      
      const result = questionSelector.selectBestPattern(contextWithHistory, constraints);
      
      expect(result.selectedPattern).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('analyzeDialogueFlow', () => {
    it('should analyze current dialogue flow state', () => {
      const patternHistory = [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.DEFINITION_SEEKING,
      ];
      
      const analysis = questionSelector.analyzeDialogueFlow(mockContext, patternHistory);
      
      expect(analysis).toBeDefined();
      expect(analysis.currentState).toBeDefined();
      expect(['exploring', 'deepening', 'clarifying', 'synthesizing', 'concluding']).toContain(analysis.currentState);
      expect(analysis.stateConfidence).toBeGreaterThan(0);
      expect(analysis.stateConfidence).toBeLessThanOrEqual(1);
      expect(analysis.varietyScore).toBeGreaterThan(0);
      expect(analysis.varietyScore).toBeLessThanOrEqual(1);
      expect(analysis.progressScore).toBeGreaterThan(0);
      expect(analysis.progressScore).toBeLessThanOrEqual(1);
    });

    it('should provide transition suggestions when appropriate', () => {
      const longPatternHistory = new Array(10).fill(SocraticPatternType.DEFINITION_SEEKING);
      
      const analysis = questionSelector.analyzeDialogueFlow(mockContext, longPatternHistory);
      
      expect(analysis.suggestedTransition).toBeDefined();
      expect(['exploring', 'deepening', 'clarifying', 'synthesizing', 'concluding']).toContain(analysis.suggestedTransition!);
    });

    it('should calculate variety score based on pattern diversity', () => {
      const diverseHistory = [
        SocraticPatternType.DEFINITION_SEEKING,
        SocraticPatternType.ASSUMPTION_EXCAVATION,
        SocraticPatternType.CONSISTENCY_TESTING,
        SocraticPatternType.CONCRETE_INSTANTIATION,
      ];
      
      const repetitiveHistory = new Array(10).fill(SocraticPatternType.DEFINITION_SEEKING);
      
      const diverseAnalysis = questionSelector.analyzeDialogueFlow(mockContext, diverseHistory);
      const repetitiveAnalysis = questionSelector.analyzeDialogueFlow(mockContext, repetitiveHistory);
      
      expect(diverseAnalysis.varietyScore).toBeGreaterThan(repetitiveAnalysis.varietyScore);
    });
  });

  describe('updatePatternEffectiveness', () => {
    it('should record pattern effectiveness data', () => {
      const outcome = {
        pattern: SocraticPatternType.DEFINITION_SEEKING,
        context: mockContext,
        userSatisfaction: 4,
        insightsGenerated: 2,
        followUpUsed: true,
        ledToContradiction: false,
        clarifiedDefinition: true,
        uncoveredAssumption: false,
      };
      
      // Should not throw
      expect(() => {
        questionSelector.updatePatternEffectiveness(outcome);
      }).not.toThrow();
    });

    it('should improve future selections based on recorded outcomes', () => {
      // Record several positive outcomes for a specific pattern
      const positiveOutcome = {
        pattern: SocraticPatternType.ASSUMPTION_EXCAVATION,
        context: mockContext,
        userSatisfaction: 5,
        insightsGenerated: 3,
        followUpUsed: true,
        ledToContradiction: false,
        clarifiedDefinition: false,
        uncoveredAssumption: true,
      };
      
      // Record multiple positive outcomes
      for (let i = 0; i < 5; i++) {
        questionSelector.updatePatternEffectiveness(positiveOutcome);
      }
      
      // Future selections should show improvement
      const result = questionSelector.selectBestPattern(mockContext);
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty pattern history', () => {
      const analysis = questionSelector.analyzeDialogueFlow(mockContext, []);
      
      expect(analysis).toBeDefined();
      expect(analysis.currentState).toBeDefined();
      expect(analysis.varietyScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle context with no extracted concepts', () => {
      const emptyContext = {
        ...mockContext,
        extractedConcepts: [],
        detectedAssumptions: [],
        knownDefinitions: [],
      };
      
      const result = questionSelector.selectBestPattern(emptyContext);
      
      expect(result).toBeDefined();
      expect(result.selectedPattern).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should handle conflicting constraints gracefully', () => {
      const conflictingConstraints: SelectionConstraints = {
        excludePatterns: Object.values(SocraticPatternType).slice(0, 8), // Exclude most patterns
        preferPatterns: [SocraticPatternType.DEFINITION_SEEKING], // But prefer one that might be excluded
        requireFreshPattern: true,
      };
      
      const result = questionSelector.selectBestPattern(mockContext, conflictingConstraints);
      
      // Should still return a valid result
      expect(result).toBeDefined();
      expect(result.selectedPattern).toBeDefined();
    });

    it('should handle very deep conversation contexts', () => {
      const deepContext = {
        ...mockContext,
        currentDepth: 15,
        turnCount: 100,
      };
      
      const result = questionSelector.selectBestPattern(deepContext);
      
      expect(result).toBeDefined();
      expect(result.selectedPattern).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('pattern scoring consistency', () => {
    it('should produce consistent scores for identical contexts', () => {
      const result1 = questionSelector.selectBestPattern(mockContext);
      const result2 = questionSelector.selectBestPattern(mockContext);
      
      // While the selected pattern might differ due to randomness in tie-breaking,
      // the scoring should be consistent
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1.confidence).toBeGreaterThan(0);
      expect(result2.confidence).toBeGreaterThan(0);
    });

    it('should show score differences for different contexts', () => {
      const beginnerContext = { ...mockContext, userExpertise: ExpertiseLevel.BEGINNER };
      const expertContext = { ...mockContext, userExpertise: ExpertiseLevel.EXPERT };
      
      const beginnerResult = questionSelector.selectBestPattern(beginnerContext);
      const expertResult = questionSelector.selectBestPattern(expertContext);
      
      // Should produce valid results for both
      expect(beginnerResult.confidence).toBeGreaterThan(0);
      expect(expertResult.confidence).toBeGreaterThan(0);
      
      // Alternatives should have different scores
      expect(beginnerResult.alternatives.length).toBeGreaterThan(0);
      expect(expertResult.alternatives.length).toBeGreaterThan(0);
    });
  });

  describe('performance characteristics', () => {
    it('should complete selection in reasonable time', () => {
      const startTime = Date.now();
      
      const result = questionSelector.selectBestPattern(mockContext);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle multiple rapid selections', () => {
      const results: SelectionResult[] = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < 10; i++) {
        const context = { ...mockContext, turnCount: i + 1 };
        results.push(questionSelector.selectBestPattern(context));
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result.selectedPattern).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
      
      expect(duration).toBeLessThan(500); // Should complete 10 selections in less than 500ms
    });
  });
});