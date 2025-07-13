/**
 * Unit tests for PatternLibrary
 */

import { PatternLibrary } from '../../../src/patterns/PatternLibrary.js';
import { SocraticPatternType } from '../../../src/types/patterns.js';
import { ContextCategory, ExpertiseLevel } from '../../../src/types/common.js';

describe('PatternLibrary', () => {
  let patternLibrary: PatternLibrary;

  beforeEach(() => {
    patternLibrary = new PatternLibrary();
  });

  describe('constructor', () => {
    it('should initialize with all 10 Socratic patterns', () => {
      const allPatterns = patternLibrary.getAllPatterns();
      expect(allPatterns).toHaveLength(10);
      
      // Verify all pattern types are present
      const patternTypes = allPatterns.map(p => p.type);
      expect(patternTypes).toContain(SocraticPatternType.DEFINITION_SEEKING);
      expect(patternTypes).toContain(SocraticPatternType.ASSUMPTION_EXCAVATION);
      expect(patternTypes).toContain(SocraticPatternType.CONSISTENCY_TESTING);
      expect(patternTypes).toContain(SocraticPatternType.CONCRETE_INSTANTIATION);
      expect(patternTypes).toContain(SocraticPatternType.NECESSITY_TESTING);
      expect(patternTypes).toContain(SocraticPatternType.CONCEPTUAL_CLARITY);
      expect(patternTypes).toContain(SocraticPatternType.EPISTEMIC_HUMILITY);
      expect(patternTypes).toContain(SocraticPatternType.SOLUTION_SPACE_MAPPING);
      expect(patternTypes).toContain(SocraticPatternType.IMPACT_ANALYSIS);
      expect(patternTypes).toContain(SocraticPatternType.VALUE_CLARIFICATION);
    });

    it('should create patterns with valid structure', () => {
      const patterns = patternLibrary.getAllPatterns();
      
      patterns.forEach(pattern => {
        expect(pattern.id).toBeDefined();
        expect(pattern.type).toBeDefined();
        expect(pattern.name).toBeTruthy();
        expect(pattern.description).toBeTruthy();
        expect(pattern.template).toBeTruthy();
        expect(pattern.variables).toBeDefined();
        expect(pattern.triggers).toBeDefined();
        expect(pattern.followUpPatterns).toBeDefined();
        expect(pattern.expectedInsights).toBeDefined();
        expect(pattern.contextCategories).toBeDefined();
        expect(pattern.minExpertiseLevel).toBeDefined();
        expect(pattern.maxDepth).toBeGreaterThan(0);
        expect(pattern.examples).toBeDefined();
        expect(pattern.createdAt).toBeInstanceOf(Date);
        expect(pattern.updatedAt).toBeInstanceOf(Date);
      });
    });
  });

  describe('getPattern', () => {
    it('should return pattern by type', () => {
      const pattern = patternLibrary.getPattern(SocraticPatternType.DEFINITION_SEEKING);
      
      expect(pattern).toBeDefined();
      expect(pattern?.type).toBe(SocraticPatternType.DEFINITION_SEEKING);
      expect(pattern?.name).toBe('Definition Seeking');
      expect(pattern?.template).toContain('{{');
    });

    it('should return undefined for invalid pattern type', () => {
      const pattern = patternLibrary.getPattern('invalid_pattern' as SocraticPatternType);
      expect(pattern).toBeUndefined();
    });
  });

  describe('getPatternsForContext', () => {
    it('should return patterns for project inception with beginner expertise', () => {
      const patterns = patternLibrary.getPatternsForContext(
        ContextCategory.PROJECT_INCEPTION, 
        ExpertiseLevel.BEGINNER
      );
      
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(pattern.contextCategories).toContain(ContextCategory.PROJECT_INCEPTION);
      });
    });

    it('should return patterns for architecture review with expert expertise', () => {
      const patterns = patternLibrary.getPatternsForContext(
        ContextCategory.ARCHITECTURE_REVIEW,
        ExpertiseLevel.EXPERT
      );
      
      expect(patterns.length).toBeGreaterThan(0);
      patterns.forEach(pattern => {
        expect(pattern.contextCategories).toContain(ContextCategory.ARCHITECTURE_REVIEW);
      });
    });

    it('should filter by expertise level', () => {
      const beginnerPatterns = patternLibrary.getPatternsForContext(
        ContextCategory.GENERAL,
        ExpertiseLevel.BEGINNER
      );
      const expertPatterns = patternLibrary.getPatternsForContext(
        ContextCategory.GENERAL,
        ExpertiseLevel.EXPERT
      );
      
      expect(beginnerPatterns).toBeDefined();
      expect(expertPatterns).toBeDefined();
      // Expert should have access to at least as many patterns as beginner
      expect(expertPatterns.length).toBeGreaterThanOrEqual(beginnerPatterns.length);
    });
  });



  describe('specific pattern validation', () => {
    describe('Definition Seeking pattern', () => {
      it('should have appropriate structure', () => {
        const pattern = patternLibrary.getPattern(SocraticPatternType.DEFINITION_SEEKING);
        
        expect(pattern).toBeDefined();
        expect(pattern?.template).toContain('{{concept}}');
        expect(pattern?.variables.some(v => v.name === 'concept')).toBe(true);
        expect(pattern?.contextCategories).toContain(ContextCategory.PROJECT_INCEPTION);
        expect(pattern?.minExpertiseLevel).toBe(ExpertiseLevel.BEGINNER);
      });

      it('should have relevant examples', () => {
        const pattern = patternLibrary.getPattern(SocraticPatternType.DEFINITION_SEEKING);
        
        expect(pattern?.examples.length).toBeGreaterThan(0);
        pattern?.examples.forEach(example => {
          expect(example).toBeTruthy();
          expect(typeof example).toBe('string');
        });
      });
    });

    describe('Assumption Excavation pattern', () => {
      it('should target assumption discovery', () => {
        const pattern = patternLibrary.getPattern(SocraticPatternType.ASSUMPTION_EXCAVATION);
        
        expect(pattern).toBeDefined();
        expect(pattern?.expectedInsights.some(insight => insight.type === 'assumption')).toBe(true);
        expect(pattern?.description.toLowerCase()).toContain('assumption');
      });
    });

    describe('Consistency Testing pattern', () => {
      it('should focus on contradictions', () => {
        const pattern = patternLibrary.getPattern(SocraticPatternType.CONSISTENCY_TESTING);
        
        expect(pattern).toBeDefined();
        expect(pattern?.expectedInsights.some(insight => insight.type === 'contradiction')).toBe(true);
        expect(pattern?.template.toLowerCase()).toContain('align');
      });
    });
  });

  describe('integration with expertise levels', () => {
    it('should have appropriate distribution across expertise levels', () => {
      const allPatterns = patternLibrary.getAllPatterns();
      
      const beginnerCount = allPatterns.filter(p => p.minExpertiseLevel === ExpertiseLevel.BEGINNER).length;
      const intermediateCount = allPatterns.filter(p => p.minExpertiseLevel === ExpertiseLevel.INTERMEDIATE).length;
      const advancedCount = allPatterns.filter(p => p.minExpertiseLevel === ExpertiseLevel.ADVANCED).length;
      const expertCount = allPatterns.filter(p => p.minExpertiseLevel === ExpertiseLevel.EXPERT).length;
      
      // Should have patterns for beginners
      expect(beginnerCount).toBeGreaterThan(0);
      
      // Should have some progression in complexity
      expect(beginnerCount + intermediateCount + advancedCount + expertCount).toBe(10);
    });
  });

  describe('template variable consistency', () => {
    it('should have consistent variable usage across patterns', () => {
      const allPatterns = patternLibrary.getAllPatterns();
      
      allPatterns.forEach(pattern => {
        // Extract variables from template
        const templateVariables = (pattern.template.match(/\{\{(\w+)\}\}/g) || [])
          .map(match => match.replace(/[{}]/g, ''));
        
        // Check that all template variables are defined
        templateVariables.forEach(templateVar => {
          const isDefined = pattern.variables.some(v => v.name === templateVar);
          expect(isDefined).toBe(true);
        });
        
        // Check that all defined variables are used (allow some flexibility)
        const definedVariables = pattern.variables.map(v => v.name);
        const unusedVariables = definedVariables.filter(defVar => 
          !templateVariables.includes(defVar)
        );
        
        // Allow up to 1 unused variable (for flexibility)
        expect(unusedVariables.length).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('context category coverage', () => {
    it('should cover all major context categories', () => {
      const allPatterns = patternLibrary.getAllPatterns();
      const coveredCategories = new Set<ContextCategory>();
      
      allPatterns.forEach(pattern => {
        pattern.contextCategories.forEach(category => {
          coveredCategories.add(category);
        });
      });
      
      // Should cover key categories
      expect(coveredCategories.has(ContextCategory.PROJECT_INCEPTION)).toBe(true);
      expect(coveredCategories.has(ContextCategory.ARCHITECTURE_REVIEW)).toBe(true);
      expect(coveredCategories.has(ContextCategory.REQUIREMENTS_REFINEMENT)).toBe(true);
      expect(coveredCategories.has(ContextCategory.IMPLEMENTATION_PLANNING)).toBe(true);
      expect(coveredCategories.has(ContextCategory.CODE_REVIEW)).toBe(true);
      expect(coveredCategories.has(ContextCategory.GENERAL)).toBe(true);
    });
  });
});