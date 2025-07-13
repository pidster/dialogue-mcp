/**
 * Template engine for variable substitution in question patterns
 */

import { QuestionPattern, QuestionVariable, QuestionContext } from '../types/patterns.js';

/**
 * Variable value with metadata
 */
export interface VariableValue {
  readonly value: string;
  readonly confidence: number;
  readonly source: 'user_input' | 'context_analysis' | 'knowledge_graph' | 'default';
  readonly metadata?: Record<string, unknown>;
}

/**
 * Template processing result
 */
export interface TemplateResult {
  readonly question: string;
  readonly resolvedVariables: Record<string, VariableValue>;
  readonly missingVariables: readonly string[];
  readonly confidence: number;
  readonly suggestions: readonly string[];
}

/**
 * Context-aware variable extraction
 */
export interface VariableExtractor {
  extractConcepts(text: string): readonly string[];
  extractAssumptions(text: string): readonly string[];
  extractGoals(text: string): readonly string[];
  extractConstraints(text: string): readonly string[];
}

/**
 * Template engine for processing question patterns with variable substitution
 */
export class TemplateEngine {
  private readonly variableExtractor: VariableExtractor;

  constructor(variableExtractor?: VariableExtractor) {
    this.variableExtractor = variableExtractor || new DefaultVariableExtractor();
  }

  /**
   * Process template with provided variables and context
   */
  public processTemplate(
    pattern: QuestionPattern,
    providedVariables: Record<string, string>,
    context?: QuestionContext
  ): TemplateResult {
    const resolvedVariables = this.resolveVariables(pattern, providedVariables, context);

    const missingRequired = this.findMissingRequiredVariables(pattern, resolvedVariables);

    if (missingRequired.length > 0) {
      return {
        question: pattern.template,
        resolvedVariables,
        missingVariables: missingRequired,
        confidence: 0,
        suggestions: this.generateSuggestions(pattern, missingRequired),
      };
    }

    const question = this.substituteVariables(pattern.template, resolvedVariables);
    const confidence = this.calculateConfidence(resolvedVariables);

    return {
      question,
      resolvedVariables,
      missingVariables: [],
      confidence,
      suggestions: [],
    };
  }

  /**
   * Generate multiple question variants from a template
   */
  public generateVariants(
    pattern: QuestionPattern,
    context?: QuestionContext,
    maxVariants: number = 3
  ): TemplateResult[] {
    const baseVariables = this.extractVariablesFromContext(pattern, context);
    const variants: TemplateResult[] = [];

    // Generate primary variant
    const primary = this.processTemplate(pattern, baseVariables, context);
    if (primary.confidence > 0.5) {
      variants.push(primary);
    }

    // Generate alternatives with different phrasings
    const alternativeTemplates = this.generateAlternativeTemplates(pattern);

    for (const template of alternativeTemplates.slice(0, maxVariants - 1)) {
      const variant = this.processTemplate({ ...pattern, template }, baseVariables, context);
      if (variant.confidence > 0.3) {
        variants.push(variant);
      }
    }

    return variants.slice(0, maxVariants);
  }

  /**
   * Validate template syntax and variables
   */
  public validateTemplate(pattern: QuestionPattern): {
    isValid: boolean;
    errors: readonly string[];
    warnings: readonly string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check template syntax
    const variablePattern = /\{\{(\w+)\}\}/g;
    const templateVariables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(pattern.template)) !== null) {
      templateVariables.add(match[1]);
    }

    // Check if all template variables are defined
    const definedVariables = new Set(pattern.variables.map(v => v.name));

    for (const templateVar of templateVariables) {
      if (!definedVariables.has(templateVar)) {
        errors.push(`Template variable '${templateVar}' is not defined in pattern variables`);
      }
    }

    // Check for unused variable definitions
    for (const variable of pattern.variables) {
      if (!templateVariables.has(variable.name)) {
        warnings.push(`Variable '${variable.name}' is defined but not used in template`);
      }
    }

    // Check for required variables without defaults
    const requiredWithoutDefault = pattern.variables.filter(v => v.required && !v.defaultValue);

    if (requiredWithoutDefault.length > 3) {
      warnings.push('Pattern has many required variables, consider providing defaults');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Resolve all variables for a pattern
   */
  private resolveVariables(
    pattern: QuestionPattern,
    providedVariables: Record<string, string>,
    context?: QuestionContext
  ): Record<string, VariableValue> {
    const resolved: Record<string, VariableValue> = {};

    for (const variable of pattern.variables) {
      const value = this.resolveVariable(variable, providedVariables, context);
      if (value) {
        resolved[variable.name] = value;
      }
    }

    return resolved;
  }

  /**
   * Resolve a single variable value
   */
  private resolveVariable(
    variable: QuestionVariable,
    providedVariables: Record<string, string>,
    context?: QuestionContext
  ): VariableValue | undefined {
    // 1. Check provided variables first
    if (providedVariables[variable.name]) {
      return {
        value: providedVariables[variable.name],
        confidence: 1.0,
        source: 'user_input',
      };
    }

    // 2. Extract from context based on variable type
    if (context) {
      const contextValue = this.extractFromContext(variable, context);
      if (contextValue) {
        return contextValue;
      }
    }

    // 3. Use default value if available
    if (variable.defaultValue) {
      return {
        value: variable.defaultValue,
        confidence: 0.3,
        source: 'default',
      };
    }

    return undefined;
  }

  /**
   * Extract variable value from context
   */
  private extractFromContext(
    variable: QuestionVariable,
    context: QuestionContext
  ): VariableValue | undefined {
    switch (variable.type) {
      case 'concept': {
        const concepts =
          context.extractedConcepts.length > 0
            ? context.extractedConcepts
            : this.variableExtractor.extractConcepts(context.currentFocus);
        if (concepts.length > 0) {
          return {
            value: this.selectMostRelevant(concepts, context.currentFocus),
            confidence: 0.7,
            source: 'context_analysis',
          };
        }
        break;
      }

      case 'assumption':
        if (context.detectedAssumptions.length > 0) {
          return {
            value: context.detectedAssumptions[0],
            confidence: 0.8,
            source: 'context_analysis',
          };
        }
        break;

      case 'goal':
        if (context.currentFocus) {
          return {
            value: context.currentFocus,
            confidence: 0.6,
            source: 'context_analysis',
          };
        }
        break;

      case 'constraint':
        // Extract constraints from known definitions or project metadata
        if (context.knownDefinitions.length > 0) {
          const constraints = context.knownDefinitions.filter(
            def =>
              def.includes('limit') || def.includes('constraint') || def.includes('restriction')
          );
          if (constraints.length > 0) {
            return {
              value: constraints[0],
              confidence: 0.6,
              source: 'context_analysis',
            };
          }
        }
        break;
    }

    return undefined;
  }

  /**
   * Find missing required variables
   */
  private findMissingRequiredVariables(
    pattern: QuestionPattern,
    resolved: Record<string, VariableValue>
  ): string[] {
    return pattern.variables.filter(v => v.required && !resolved[v.name]).map(v => v.name);
  }

  /**
   * Substitute variables in template
   */
  private substituteVariables(template: string, variables: Record<string, VariableValue>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, variableName) => {
      const variable = variables[variableName];
      return variable ? variable.value : match;
    });
  }

  /**
   * Calculate overall confidence based on variable confidence
   */
  private calculateConfidence(variables: Record<string, VariableValue>): number {
    const values = Object.values(variables);
    if (values.length === 0) return 1.0; // Perfect confidence for templates with no variables

    const totalConfidence = values.reduce((sum, v) => sum + v.confidence, 0);
    return Math.min(totalConfidence / values.length, 1.0);
  }

  /**
   * Generate suggestions for missing variables
   */
  private generateSuggestions(
    pattern: QuestionPattern,
    missingVariables: readonly string[]
  ): string[] {
    const suggestions: string[] = [];

    for (const varName of missingVariables) {
      const variable = pattern.variables.find(v => v.name === varName);
      if (!variable) continue;

      switch (variable.type) {
        case 'concept':
          suggestions.push(`Identify a key concept or term that needs clarification`);
          break;
        case 'assumption':
          suggestions.push(`Consider what assumptions might be hidden in the discussion`);
          break;
        case 'goal':
          suggestions.push(`What is the main objective or goal being pursued?`);
          break;
        case 'constraint':
          suggestions.push(`What limitations or constraints should be considered?`);
          break;
        default:
          suggestions.push(`Provide a value for '${variable.description}'`);
      }
    }

    return suggestions;
  }

  /**
   * Extract variables from context
   */
  private extractVariablesFromContext(
    pattern: QuestionPattern,
    context?: QuestionContext
  ): Record<string, string> {
    const variables: Record<string, string> = {};

    if (!context) return variables;

    // Extract based on current focus and available context data
    if (context.currentFocus) {
      // Try to map focus to appropriate variable types
      for (const variable of pattern.variables) {
        if (!variables[variable.name]) {
          switch (variable.type) {
            case 'concept':
              if (context.extractedConcepts.length > 0) {
                variables[variable.name] = this.selectMostRelevant(
                  context.extractedConcepts,
                  context.currentFocus
                );
              }
              break;
            case 'assumption':
              if (context.detectedAssumptions.length > 0) {
                variables[variable.name] = context.detectedAssumptions[0];
              }
              break;
          }
        }
      }
    }

    return variables;
  }

  /**
   * Select most relevant item based on focus
   */
  private selectMostRelevant(items: readonly string[], focus: string): string {
    // Simple relevance based on string similarity
    let bestMatch = items[0];
    let bestScore = 0;

    for (const item of items) {
      const score = this.calculateSimilarity(item.toLowerCase(), focus.toLowerCase());
      if (score > bestScore) {
        bestScore = score;
        bestMatch = item;
      }
    }

    return bestMatch;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Generate alternative templates for variety
   */
  private generateAlternativeTemplates(pattern: QuestionPattern): string[] {
    const alternatives: string[] = [];
    const template = pattern.template;

    // Generate variations based on pattern type
    switch (pattern.type) {
      case 'definition_seeking':
        alternatives.push(
          'How would you define {{concept}}?',
          'What does {{concept}} mean to you?',
          'Can you clarify what you mean by {{concept}}?'
        );
        break;
      case 'assumption_excavation':
        alternatives.push(
          'What are you taking for granted about {{area}}?',
          'Why do you assume {{assumption}}?',
          'What beliefs underlie your thinking about {{area}}?'
        );
        break;
      case 'consistency_testing':
        alternatives.push(
          'Do {{statement1}} and {{statement2}} work together?',
          'Is there tension between {{statement1}} and {{statement2}}?',
          'How do you reconcile {{statement1}} with {{statement2}}?'
        );
        break;
      default:
        // Generate simple variations by changing question starters
        alternatives.push(
          template.replace(/^What/, 'How'),
          template.replace(/^How/, 'Why'),
          template.replace(/\?$/, ' in this context?')
        );
    }

    return alternatives.filter(alt => alt !== template && alt.includes('{{'));
  }
}

/**
 * Default implementation of variable extractor
 */
export class DefaultVariableExtractor implements VariableExtractor {
  extractConcepts(text: string): readonly string[] {
    // Simple concept extraction - look for nouns and technical terms
    const concepts: string[] = [];

    // Look for capitalized words (proper nouns) and technical terms
    const technicalPatterns = [
      /\b(api|database|server|client|service|component|module|framework|library)\b/gi,
      /\b[A-Z][a-z]+(Service|Controller|Manager|Handler|Provider)\b/g,
      /\b\w+ing\b/g, // gerunds often represent concepts
    ];

    for (const pattern of technicalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        concepts.push(...matches);
      }
    }

    return [...new Set(concepts)]; // Remove duplicates
  }

  extractAssumptions(text: string): readonly string[] {
    const assumptions: string[] = [];

    // Look for assumption indicator phrases
    const assumptionPatterns = [
      /assume.*?[.!?]/gi,
      /obviously.*?[.!?]/gi,
      /of course.*?[.!?]/gi,
      /clearly.*?[.!?]/gi,
      /naturally.*?[.!?]/gi,
    ];

    for (const pattern of assumptionPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        assumptions.push(...matches.map(m => m.trim()));
      }
    }

    return assumptions;
  }

  extractGoals(text: string): readonly string[] {
    const goals: string[] = [];

    // Look for goal indicator phrases
    const goalPatterns = [
      /(?:want to|need to|should|must|goal is to|aim to|trying to)\s+([^.!?]+)/gi,
      /in order to\s+([^.!?]+)/gi,
      /so that\s+([^.!?]+)/gi,
    ];

    for (const pattern of goalPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        goals.push(...matches.map(m => m.trim()));
      }
    }

    return goals;
  }

  extractConstraints(text: string): readonly string[] {
    const constraints: string[] = [];

    // Look for constraint indicator phrases
    const constraintPatterns = [
      /(?:can't|cannot|unable to|limited by|constrained by|restricted by)\s+([^.!?]+)/gi,
      /(?:budget|time|resource|performance|security)\s+(?:limit|constraint|restriction)[^.!?]*/gi,
      /within\s+\d+\s+(?:days|weeks|months|hours|minutes)/gi,
    ];

    for (const pattern of constraintPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        constraints.push(...matches.map(m => m.trim()));
      }
    }

    return constraints;
  }
}
