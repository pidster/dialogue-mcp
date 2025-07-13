/**
 * Core pattern library implementing all 10 Socratic questioning patterns
 */

import { QuestionPattern, SocraticPatternType } from '../types/patterns.js';
import { ContextCategory, ExpertiseLevel } from '../types/common.js';

/**
 * Pattern library containing all implemented Socratic questioning patterns
 */
export class PatternLibrary {
  private readonly patterns: Map<SocraticPatternType, QuestionPattern>;

  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  /**
   * Get all available patterns
   */
  public getAllPatterns(): QuestionPattern[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Get specific pattern by type
   */
  public getPattern(type: SocraticPatternType): QuestionPattern | undefined {
    return this.patterns.get(type);
  }

  /**
   * Get patterns suitable for given context
   */
  public getPatternsForContext(
    category: ContextCategory,
    expertise: ExpertiseLevel
  ): QuestionPattern[] {
    return this.getAllPatterns().filter(
      pattern =>
        pattern.contextCategories.includes(category) &&
        this.isExpertiseSuitable(pattern.minExpertiseLevel, expertise)
    );
  }

  /**
   * Initialize all 10 Socratic patterns
   */
  private initializePatterns(): void {
    // 1. Definition-Seeking Pattern
    this.patterns.set(SocraticPatternType.DEFINITION_SEEKING, {
      id: 'pattern-definition-seeking',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.DEFINITION_SEEKING,
      name: 'Definition Seeking',
      description: 'Clarifies vague terminology and undefined concepts',
      template: 'What exactly do you mean by {{concept}}?',
      variables: [
        {
          name: 'concept',
          description: 'The concept or term that needs definition',
          type: 'concept',
          required: true,
        },
      ],
      triggers: [
        {
          keyword: 'undefined_term',
          contextCategory: ContextCategory.GENERAL,
          weight: 0.9,
        },
        {
          keyword: 'vague_concept',
          contextCategory: ContextCategory.REQUIREMENTS_REFINEMENT,
          weight: 0.8,
        },
        {
          keyword: 'ambiguous_requirement',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.85,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'vague_answer',
          triggerPattern: 'sort of|kind of|basically|generally',
          nextPatternType: SocraticPatternType.CONCRETE_INSTANTIATION,
          priority: 0.8,
        },
      ],
      expectedInsights: [
        {
          type: 'definition',
          description: 'Clear, specific definition of key concepts',
          likelihood: 0.9,
        },
        {
          type: 'assumption',
          description: 'Hidden assumptions about terminology',
          likelihood: 0.7,
        },
      ],
      contextCategories: [
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.REQUIREMENTS_REFINEMENT,
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.BEGINNER,
      maxDepth: 3,
      examples: [
        'What exactly do you mean by "scalable"?',
        'How would you define "user-friendly" in this context?',
        'What does "real-time" mean for your system?',
      ],
    });

    // 2. Assumption Excavation Pattern
    this.patterns.set(SocraticPatternType.ASSUMPTION_EXCAVATION, {
      id: 'pattern-assumption-excavation',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.ASSUMPTION_EXCAVATION,
      name: 'Assumption Excavation',
      description: 'Uncovers hidden assumptions and implicit beliefs',
      template: 'What assumptions are you making about {{area}}?',
      variables: [
        {
          name: 'area',
          description: 'The domain or area being assumed about',
          type: 'concept',
          required: true,
        },
        {
          name: 'assumption',
          description: 'Specific assumption to examine',
          type: 'assumption',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'implicit_assumption',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.95,
        },
        {
          keyword: 'unvalidated_belief',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.9,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'assumption_detected',
          triggerPattern: 'assume|obviously|of course|naturally',
          nextPatternType: SocraticPatternType.CONSISTENCY_TESTING,
          priority: 0.85,
        },
      ],
      expectedInsights: [
        {
          type: 'assumption',
          description: 'Previously hidden assumptions made explicit',
          likelihood: 0.95,
        },
        {
          type: 'constraint',
          description: 'Constraints implied by assumptions',
          likelihood: 0.7,
        },
      ],
      contextCategories: [
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.BEGINNER,
      maxDepth: 4,
      examples: [
        'What assumptions are you making about user behavior?',
        'Why do you believe the database will handle this load?',
        'What are we assuming about the existing infrastructure?',
      ],
    });

    // 3. Consistency Testing Pattern
    this.patterns.set(SocraticPatternType.CONSISTENCY_TESTING, {
      id: 'pattern-consistency-testing',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.CONSISTENCY_TESTING,
      name: 'Consistency Testing',
      description: 'Tests for contradictions and logical consistency',
      template: 'How does {{statement1}} align with {{statement2}}?',
      variables: [
        {
          name: 'statement1',
          description: 'First statement or position',
          type: 'string',
          required: true,
        },
        {
          name: 'statement2',
          description: 'Second statement that may conflict',
          type: 'string',
          required: true,
        },
      ],
      triggers: [
        {
          keyword: 'potential_contradiction',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.9,
        },
        {
          keyword: 'conflicting_requirements',
          contextCategory: ContextCategory.REQUIREMENTS_REFINEMENT,
          weight: 0.85,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'contradiction',
          triggerPattern: 'but|however|although|despite',
          nextPatternType: SocraticPatternType.VALUE_CLARIFICATION,
          priority: 0.8,
        },
      ],
      expectedInsights: [
        {
          type: 'contradiction',
          description: 'Logical inconsistencies identified',
          likelihood: 0.8,
        },
        {
          type: 'requirement',
          description: 'Need for prioritization or clarification',
          likelihood: 0.75,
        },
      ],
      contextCategories: [
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.REQUIREMENTS_REFINEMENT,
        ContextCategory.CODE_REVIEW,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 3,
      examples: [
        'How does requiring high performance align with the tight budget constraint?',
        'What if the security requirement conflicts with usability?',
        'How do these two design principles work together?',
      ],
    });

    // 4. Concrete Instantiation Pattern
    this.patterns.set(SocraticPatternType.CONCRETE_INSTANTIATION, {
      id: 'pattern-concrete-instantiation',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.CONCRETE_INSTANTIATION,
      name: 'Concrete Instantiation',
      description: 'Transforms abstract concepts into specific examples',
      template: 'Can you give me a specific example of {{concept}}?',
      variables: [
        {
          name: 'concept',
          description: 'Abstract concept needing concrete examples',
          type: 'concept',
          required: true,
        },
        {
          name: 'context',
          description: 'Specific context for the example',
          type: 'string',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'abstract_statement',
          contextCategory: ContextCategory.REQUIREMENTS_REFINEMENT,
          weight: 0.85,
        },
        {
          keyword: 'general_requirement',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.8,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'vague_answer',
          triggerPattern: 'depends|varies|different|multiple',
          nextPatternType: SocraticPatternType.DEFINITION_SEEKING,
          priority: 0.7,
        },
      ],
      expectedInsights: [
        {
          type: 'requirement',
          description: 'Specific, testable requirements',
          likelihood: 0.85,
        },
        {
          type: 'constraint',
          description: 'Practical limitations and constraints',
          likelihood: 0.7,
        },
      ],
      contextCategories: [
        ContextCategory.REQUIREMENTS_REFINEMENT,
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.BEGINNER,
      maxDepth: 2,
      examples: [
        'Can you give me a specific example of a "responsive" interface?',
        'What would "good performance" look like in practice?',
        'Show me a concrete scenario where this feature would be used.',
      ],
    });

    // 5. Necessity Testing Pattern
    this.patterns.set(SocraticPatternType.NECESSITY_TESTING, {
      id: 'pattern-necessity-testing',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.NECESSITY_TESTING,
      name: 'Necessity Testing',
      description: 'Questions the necessity of features and complexity',
      template: 'What would happen if we removed {{component}}?',
      variables: [
        {
          name: 'component',
          description: 'Feature, component, or requirement to test',
          type: 'concept',
          required: true,
        },
        {
          name: 'alternative',
          description: 'Simpler alternative to consider',
          type: 'string',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'complex_solution',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.8,
        },
        {
          keyword: 'feature_creep',
          contextCategory: ContextCategory.IMPLEMENTATION_PLANNING,
          weight: 0.85,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'new_concept',
          triggerPattern: 'need|require|must have|essential',
          nextPatternType: SocraticPatternType.VALUE_CLARIFICATION,
          priority: 0.75,
        },
      ],
      expectedInsights: [
        {
          type: 'requirement',
          description: 'Core vs. nice-to-have requirements',
          likelihood: 0.8,
        },
        {
          type: 'constraint',
          description: 'Simplification opportunities',
          likelihood: 0.7,
        },
      ],
      contextCategories: [
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.CODE_REVIEW,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 3,
      examples: [
        'What would happen if we removed the caching layer?',
        'Is this microservice truly necessary?',
        'Could we solve this problem without this complex framework?',
      ],
    });

    // Continue with remaining patterns...
    this.initializeRemainingPatterns();
  }

  /**
   * Initialize patterns 6-10
   */
  private initializeRemainingPatterns(): void {
    // 6. Conceptual Clarity Pattern
    this.patterns.set(SocraticPatternType.CONCEPTUAL_CLARITY, {
      id: 'pattern-conceptual-clarity',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.CONCEPTUAL_CLARITY,
      name: 'Conceptual Clarity',
      description: 'Clarifies relationships between concepts and ideas',
      template: 'How is {{concept1}} different from {{concept2}}?',
      variables: [
        {
          name: 'concept1',
          description: 'First concept to compare',
          type: 'concept',
          required: true,
        },
        {
          name: 'concept2',
          description: 'Second concept to compare',
          type: 'concept',
          required: true,
        },
      ],
      triggers: [
        {
          keyword: 'confused_concepts',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.8,
        },
        {
          keyword: 'unclear_distinction',
          contextCategory: ContextCategory.GENERAL,
          weight: 0.75,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'vague_answer',
          triggerPattern: 'similar|same|basically',
          nextPatternType: SocraticPatternType.DEFINITION_SEEKING,
          priority: 0.8,
        },
      ],
      expectedInsights: [
        {
          type: 'definition',
          description: 'Clear conceptual boundaries',
          likelihood: 0.85,
        },
        {
          type: 'assumption',
          description: 'Assumptions about concept relationships',
          likelihood: 0.7,
        },
      ],
      contextCategories: [
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.CODE_REVIEW,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 2,
      examples: [
        'How is a service different from a microservice?',
        'What distinguishes authentication from authorization?',
        'How does caching differ from memoization?',
      ],
    });

    // 7. Epistemic Humility Pattern
    this.patterns.set(SocraticPatternType.EPISTEMIC_HUMILITY, {
      id: 'pattern-epistemic-humility',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.EPISTEMIC_HUMILITY,
      name: 'Epistemic Humility',
      description: 'Acknowledges knowledge boundaries and uncertainties',
      template: "What don't we know about {{area}}?",
      variables: [
        {
          name: 'area',
          description: 'Domain or area with potential unknowns',
          type: 'concept',
          required: true,
        },
      ],
      triggers: [
        {
          keyword: 'overconfidence',
          contextCategory: ContextCategory.IMPLEMENTATION_PLANNING,
          weight: 0.9,
        },
        {
          keyword: 'missing_information',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.85,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'new_concept',
          triggerPattern: 'unknown|unsure|unclear|uncertain',
          nextPatternType: SocraticPatternType.IMPACT_ANALYSIS,
          priority: 0.8,
        },
      ],
      expectedInsights: [
        {
          type: 'constraint',
          description: 'Knowledge gaps and risks',
          likelihood: 0.9,
        },
        {
          type: 'requirement',
          description: 'Need for research or validation',
          likelihood: 0.8,
        },
      ],
      contextCategories: [
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 3,
      examples: [
        "What don't we know about user behavior patterns?",
        'Where might our performance assumptions be wrong?',
        'What uncertainties exist in our technology choices?',
      ],
    });

    // 8. Solution Space Mapping Pattern
    this.patterns.set(SocraticPatternType.SOLUTION_SPACE_MAPPING, {
      id: 'pattern-solution-space-mapping',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.SOLUTION_SPACE_MAPPING,
      name: 'Solution Space Mapping',
      description: 'Explores alternative approaches and solutions',
      template: 'What other approaches could solve {{problem}}?',
      variables: [
        {
          name: 'problem',
          description: 'Problem or challenge to solve',
          type: 'concept',
          required: true,
        },
        {
          name: 'current_solution',
          description: 'Currently proposed solution',
          type: 'string',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'single_solution',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.85,
        },
        {
          keyword: 'limited_exploration',
          contextCategory: ContextCategory.IMPLEMENTATION_PLANNING,
          weight: 0.8,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'new_concept',
          triggerPattern: 'alternative|different|other way',
          nextPatternType: SocraticPatternType.IMPACT_ANALYSIS,
          priority: 0.75,
        },
      ],
      expectedInsights: [
        {
          type: 'assumption',
          description: 'Assumptions about solution constraints',
          likelihood: 0.8,
        },
        {
          type: 'requirement',
          description: 'Alternative solution requirements',
          likelihood: 0.75,
        },
      ],
      contextCategories: [
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 3,
      examples: [
        'What other approaches could solve the scaling problem?',
        'What alternatives did you consider for data storage?',
        'How else might we handle user authentication?',
      ],
    });

    // 9. Impact Analysis Pattern
    this.patterns.set(SocraticPatternType.IMPACT_ANALYSIS, {
      id: 'pattern-impact-analysis',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.IMPACT_ANALYSIS,
      name: 'Impact Analysis',
      description: 'Examines consequences and ripple effects',
      template: 'What are the consequences of {{decision}}?',
      variables: [
        {
          name: 'decision',
          description: 'Decision or change to analyze',
          type: 'string',
          required: true,
        },
        {
          name: 'stakeholder',
          description: 'Specific stakeholder to consider',
          type: 'string',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'narrow_impact',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.85,
        },
        {
          keyword: 'stakeholder_blindness',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.8,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'new_concept',
          triggerPattern: 'affect|impact|consequence|result',
          nextPatternType: SocraticPatternType.VALUE_CLARIFICATION,
          priority: 0.7,
        },
      ],
      expectedInsights: [
        {
          type: 'constraint',
          description: 'Unintended consequences and side effects',
          likelihood: 0.85,
        },
        {
          type: 'requirement',
          description: 'Additional requirements from impacts',
          likelihood: 0.75,
        },
      ],
      contextCategories: [
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.IMPLEMENTATION_PLANNING,
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.INTERMEDIATE,
      maxDepth: 4,
      examples: [
        'What are the consequences of choosing microservices?',
        'Who else would be affected by this API change?',
        'What ripple effects might this optimization have?',
      ],
    });

    // 10. Value Clarification Pattern
    this.patterns.set(SocraticPatternType.VALUE_CLARIFICATION, {
      id: 'pattern-value-clarification',
      createdAt: new Date(),
      updatedAt: new Date(),
      sessionId: 'system',
      type: SocraticPatternType.VALUE_CLARIFICATION,
      name: 'Value Clarification',
      description: 'Clarifies priorities, values, and trade-offs',
      template: 'Why is {{goal}} important?',
      variables: [
        {
          name: 'goal',
          description: 'Goal or objective to examine',
          type: 'goal',
          required: true,
        },
        {
          name: 'tradeoff',
          description: 'Specific trade-off to consider',
          type: 'string',
          required: false,
        },
      ],
      triggers: [
        {
          keyword: 'unclear_priorities',
          contextCategory: ContextCategory.PROJECT_INCEPTION,
          weight: 0.9,
        },
        {
          keyword: 'competing_objectives',
          contextCategory: ContextCategory.ARCHITECTURE_REVIEW,
          weight: 0.85,
        },
      ],
      followUpPatterns: [
        {
          triggerType: 'new_concept',
          triggerPattern: 'priority|important|valuable|critical',
          nextPatternType: SocraticPatternType.NECESSITY_TESTING,
          priority: 0.7,
        },
      ],
      expectedInsights: [
        {
          type: 'assumption',
          description: 'Hidden value assumptions',
          likelihood: 0.85,
        },
        {
          type: 'requirement',
          description: 'Priority and trade-off clarity',
          likelihood: 0.8,
        },
      ],
      contextCategories: [
        ContextCategory.PROJECT_INCEPTION,
        ContextCategory.ARCHITECTURE_REVIEW,
        ContextCategory.REQUIREMENTS_REFINEMENT,
        ContextCategory.GENERAL,
      ],
      minExpertiseLevel: ExpertiseLevel.BEGINNER,
      maxDepth: 3,
      examples: [
        'Why is performance more important than simplicity here?',
        'What trade-offs are you willing to make for security?',
        'Why prioritize this feature over user experience?',
      ],
    });
  }

  /**
   * Check if expertise level is suitable for pattern
   */
  private isExpertiseSuitable(patternLevel: ExpertiseLevel, userLevel: ExpertiseLevel): boolean {
    const levels = {
      [ExpertiseLevel.BEGINNER]: 0,
      [ExpertiseLevel.INTERMEDIATE]: 1,
      [ExpertiseLevel.ADVANCED]: 2,
      [ExpertiseLevel.EXPERT]: 3,
    };

    return levels[userLevel] >= levels[patternLevel];
  }
}
