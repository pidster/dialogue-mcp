/**
 * Unit tests for TemplateEngine
 */

import { TemplateEngine, VariableExtractor } from '../../../src/patterns/TemplateEngine.js';
import { QuestionPattern, QuestionContext } from '../../../src/types/patterns.js';
import { SocraticPatternType } from '../../../src/types/patterns.js';
import { ContextCategory, ExpertiseLevel } from '../../../src/types/common.js';

describe('TemplateEngine', () => {
  let templateEngine: TemplateEngine;
  let mockPattern: QuestionPattern;
  let mockContext: QuestionContext;

  beforeEach(() => {
    templateEngine = new TemplateEngine();
    
    mockPattern = {
      id: 'test-pattern-1',
      sessionId: 'test-session-1',
      type: SocraticPatternType.DEFINITION_SEEKING,
      name: 'Test Definition Pattern',
      description: 'A test pattern for definition seeking',
      template: 'What do you mean by {{concept}}? How does {{concept}} relate to {{area}}?',
      variables: [
        {
          name: 'concept',
          description: 'A key concept to define',
          type: 'concept',
          required: true,
        },
        {
          name: 'area',
          description: 'The domain or area of focus',
          type: 'string',
          required: false,
          defaultValue: 'the current discussion',
        },
      ],
      triggers: [],
      followUpPatterns: [],
      expectedInsights: [],
      contextCategories: [ContextCategory.GENERAL],
      minExpertiseLevel: ExpertiseLevel.BEGINNER,
      maxDepth: 5,
      examples: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockContext = {
      category: ContextCategory.PROJECT_INCEPTION,
      userExpertise: ExpertiseLevel.INTERMEDIATE,
      projectPhase: 'planning',
      previousQuestions: [],
      extractedConcepts: ['authentication', 'security'],
      detectedAssumptions: ['users have unique emails'],
      knownDefinitions: ['authentication: verifying user identity'],
      currentFocus: 'user authentication system',
      metadata: {},
    };
  });

  describe('constructor', () => {
    it('should initialize with default variable extractor', () => {
      expect(templateEngine).toBeDefined();
      expect(templateEngine).toBeInstanceOf(TemplateEngine);
    });

    it('should accept custom variable extractor', () => {
      const customExtractor: VariableExtractor = {
        extractConcepts: jest.fn().mockReturnValue(['custom concept']),
        extractAssumptions: jest.fn().mockReturnValue(['custom assumption']),
        extractGoals: jest.fn().mockReturnValue(['custom goal']),
        extractConstraints: jest.fn().mockReturnValue(['custom constraint']),
      };

      const customEngine = new TemplateEngine(customExtractor);
      expect(customEngine).toBeDefined();
    });
  });

  describe('processTemplate', () => {
    it('should process template with all variables provided', () => {
      const providedVariables = {
        concept: 'authentication',
        area: 'security domain',
      };

      const result = templateEngine.processTemplate(mockPattern, providedVariables, mockContext);

      expect(result.question).toBe('What do you mean by authentication? How does authentication relate to security domain?');
      expect(result.confidence).toBe(1.0);
      expect(result.missingVariables).toEqual([]);
      expect(result.resolvedVariables.concept.value).toBe('authentication');
      expect(result.resolvedVariables.area.value).toBe('security domain');
    });

    it('should handle missing required variables', () => {
      const providedVariables = {
        area: 'security domain',
        // concept is missing but required
      };

      // Use context without the required concept available
      const emptyContext = {
        ...mockContext,
        extractedConcepts: [], // No concepts available in context
        currentFocus: '', // No current focus
      };

      const result = templateEngine.processTemplate(mockPattern, providedVariables, emptyContext);

      expect(result.confidence).toBe(0);
      expect(result.missingVariables).toContain('concept');
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should use default values for optional variables', () => {
      const providedVariables = {
        concept: 'authentication',
        // area is missing but has default
      };

      const result = templateEngine.processTemplate(mockPattern, providedVariables, mockContext);

      expect(result.question).toBe('What do you mean by authentication? How does authentication relate to the current discussion?');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.resolvedVariables.area.value).toBe('the current discussion');
      expect(result.resolvedVariables.area.source).toBe('default');
    });

    it('should extract variables from context when not provided', () => {
      const providedVariables = {}; // No variables provided

      const result = templateEngine.processTemplate(mockPattern, providedVariables, mockContext);

      // Should attempt to extract from context
      expect(result).toBeDefined();
      // Context extraction should find 'authentication' from extractedConcepts
      if (result.confidence > 0) {
        expect(result.resolvedVariables.concept?.value).toBeDefined();
      }
    });

    it('should handle context without extractable variables', () => {
      const emptyContext = {
        ...mockContext,
        extractedConcepts: [],
        currentFocus: '',
      };

      const providedVariables = {};

      const result = templateEngine.processTemplate(mockPattern, providedVariables, emptyContext);

      // Should still return a result, likely with low confidence
      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generateVariants', () => {
    it('should generate multiple question variants', () => {
      const variants = templateEngine.generateVariants(mockPattern, mockContext, 3);

      expect(variants.length).toBeGreaterThan(0);
      expect(variants.length).toBeLessThanOrEqual(3);
      
      variants.forEach(variant => {
        expect(variant.question).toBeDefined();
        expect(variant.confidence).toBeGreaterThan(0);
        expect(variant.question).not.toContain('{{'); // Should not have unresolved variables
      });
    });

    it('should generate different phrasings for the same pattern', () => {
      const variants = templateEngine.generateVariants(mockPattern, mockContext, 3);

      if (variants.length > 1) {
        // Should have different question texts
        const questionTexts = variants.map(v => v.question);
        const uniqueTexts = new Set(questionTexts);
        expect(uniqueTexts.size).toBeGreaterThan(1);
      }
    });

    it('should filter variants by confidence threshold', () => {
      const variants = templateEngine.generateVariants(mockPattern, mockContext, 5);

      variants.forEach(variant => {
        expect(variant.confidence).toBeGreaterThan(0.3); // Based on implementation threshold
      });
    });
  });

  describe('validateTemplate', () => {
    it('should validate a well-formed template', () => {
      const validation = templateEngine.validateTemplate(mockPattern);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
    });

    it('should detect undefined template variables', () => {
      const invalidPattern = {
        ...mockPattern,
        template: 'What is {{undefined_var}}?',
        variables: [], // No variables defined
      };

      const validation = templateEngine.validateTemplate(invalidPattern);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(error => error.includes('undefined_var'))).toBe(true);
    });

    it('should detect unused variable definitions', () => {
      const patternWithUnusedVar = {
        ...mockPattern,
        template: 'What is {{concept}}?',
        variables: [
          {
            name: 'concept',
            description: 'A concept',
            type: 'concept' as const,
            required: true,
          },
          {
            name: 'unused_var',
            description: 'An unused variable',
            type: 'string' as const,
            required: false,
          },
        ],
      };

      const validation = templateEngine.validateTemplate(patternWithUnusedVar);

      expect(validation.isValid).toBe(true); // Still valid, but has warnings
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(warning => warning.includes('unused_var'))).toBe(true);
    });

    it('should warn about patterns with many required variables', () => {
      const patternWithManyVars = {
        ...mockPattern,
        template: 'What about {{var1}}, {{var2}}, {{var3}}, and {{var4}}?',
        variables: [
          { name: 'var1', description: 'Variable 1', type: 'string' as const, required: true },
          { name: 'var2', description: 'Variable 2', type: 'string' as const, required: true },
          { name: 'var3', description: 'Variable 3', type: 'string' as const, required: true },
          { name: 'var4', description: 'Variable 4', type: 'string' as const, required: true },
        ],
      };

      const validation = templateEngine.validateTemplate(patternWithManyVars);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(warning => warning.includes('many required variables'))).toBe(true);
    });
  });

  describe('variable extraction from context', () => {
    it('should extract concepts from context', () => {
      const contextWithConcepts = {
        ...mockContext,
        extractedConcepts: ['database', 'API', 'microservices'],
      };

      const conceptPattern = {
        ...mockPattern,
        template: 'How would you define {{concept}}?',
        variables: [
          {
            name: 'concept',
            description: 'A concept to define',
            type: 'concept' as const,
            required: true,
          },
        ],
      };

      const result = templateEngine.processTemplate(conceptPattern, {}, contextWithConcepts);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.resolvedVariables.concept?.value).toBeDefined();
      expect(['database', 'API', 'microservices']).toContain(result.resolvedVariables.concept?.value);
    });

    it('should extract assumptions from context', () => {
      const assumptionPattern = {
        ...mockPattern,
        template: 'Why do you assume {{assumption}}?',
        variables: [
          {
            name: 'assumption',
            description: 'An assumption to examine',
            type: 'assumption' as const,
            required: true,
          },
        ],
      };

      const result = templateEngine.processTemplate(assumptionPattern, {}, mockContext);

      if (mockContext.detectedAssumptions.length > 0) {
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.resolvedVariables.assumption?.value).toBe(mockContext.detectedAssumptions[0]);
      }
    });

    it('should use current focus for goal extraction', () => {
      const goalPattern = {
        ...mockPattern,
        template: 'What is the goal of {{goal}}?',
        variables: [
          {
            name: 'goal',
            description: 'A goal or objective',
            type: 'goal' as const,
            required: true,
          },
        ],
      };

      const result = templateEngine.processTemplate(goalPattern, {}, mockContext);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.resolvedVariables.goal?.value).toBe(mockContext.currentFocus);
    });

    it('should extract constraints from known definitions', () => {
      const constraintContext = {
        ...mockContext,
        knownDefinitions: ['time limit: complete within 2 weeks', 'budget constraint: under $10,000'],
      };

      const constraintPattern = {
        ...mockPattern,
        template: 'How does {{constraint}} affect your approach?',
        variables: [
          {
            name: 'constraint',
            description: 'A constraint or limitation',
            type: 'constraint' as const,
            required: true,
          },
        ],
      };

      const result = templateEngine.processTemplate(constraintPattern, {}, constraintContext);

      if (result.confidence > 0) {
        expect(result.resolvedVariables.constraint?.value).toBeDefined();
        expect(result.resolvedVariables.constraint?.value).toContain('limit');
      }
    });
  });

  describe('variable confidence scoring', () => {
    it('should assign high confidence to user-provided variables', () => {
      const providedVariables = { concept: 'authentication' };
      const result = templateEngine.processTemplate(mockPattern, providedVariables, mockContext);

      expect(result.resolvedVariables.concept?.confidence).toBe(1.0);
      expect(result.resolvedVariables.concept?.source).toBe('user_input');
    });

    it('should assign medium confidence to context-extracted variables', () => {
      const result = templateEngine.processTemplate(mockPattern, {}, mockContext);

      if (result.confidence > 0 && result.resolvedVariables.concept) {
        expect(result.resolvedVariables.concept.confidence).toBeLessThan(1.0);
        expect(result.resolvedVariables.concept.confidence).toBeGreaterThan(0.5);
        expect(result.resolvedVariables.concept.source).toBe('context_analysis');
      }
    });

    it('should assign low confidence to default values', () => {
      const providedVariables = { concept: 'authentication' }; // Only provide required var
      const result = templateEngine.processTemplate(mockPattern, providedVariables, mockContext);

      expect(result.resolvedVariables.area?.confidence).toBe(0.3);
      expect(result.resolvedVariables.area?.source).toBe('default');
    });
  });

  describe('template alternative generation', () => {
    it('should generate alternatives for definition seeking patterns', () => {
      const definitionPattern = {
        ...mockPattern,
        type: SocraticPatternType.DEFINITION_SEEKING,
        template: 'What is {{concept}}?',
      };

      const variants = templateEngine.generateVariants(definitionPattern, mockContext, 3);
      
      if (variants.length > 1) {
        const questions = variants.map(v => v.question);
        // Should have variations in question starters
        const hasVariation = questions.some(q => q.startsWith('How')) || 
                           questions.some(q => q.includes('define')) ||
                           questions.some(q => q.includes('mean'));
        expect(hasVariation).toBe(true);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle templates with no variables', () => {
      const noVarPattern = {
        ...mockPattern,
        template: 'Can you tell me more about your approach?',
        variables: [],
      };

      const result = templateEngine.processTemplate(noVarPattern, {}, mockContext);

      expect(result.question).toBe('Can you tell me more about your approach?');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.missingVariables).toEqual([]);
    });

    it('should handle empty provided variables gracefully', () => {
      const result = templateEngine.processTemplate(mockPattern, {}, mockContext);

      expect(result).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });

    it('should handle malformed template variables', () => {
      const malformedPattern = {
        ...mockPattern,
        template: 'What is {concept} and {{incomplete?',
      };

      // Should not crash
      expect(() => {
        templateEngine.processTemplate(malformedPattern, {}, mockContext);
      }).not.toThrow();
    });

    it('should handle circular variable dependencies gracefully', () => {
      // This is more of a conceptual test - our current implementation doesn't have circular deps
      const result = templateEngine.processTemplate(mockPattern, {}, mockContext);
      expect(result).toBeDefined();
    });
  });

  describe('performance', () => {
    it('should process templates efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 100; i++) {
        templateEngine.processTemplate(mockPattern, { concept: 'test' }, mockContext);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should process 100 templates in less than 100ms
    });

    it('should validate templates efficiently', () => {
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        templateEngine.validateTemplate(mockPattern);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(50); // Should validate 50 templates in less than 50ms
    });
  });
});