/**
 * Registry and management for resource templates
 */

import {
  ResourceTemplate,
  ResourceVariable,
  TemplateRegistryEntry,
  ResourceGenerator,
} from '../types/resource-templates.js';
import { PatternType } from '../types/patterns.js';
import logger from '../utils/logger.js';

/**
 * Resource template library managing all available templates
 */
export class ResourceTemplateLibrary {
  private readonly registry = new Map<string, TemplateRegistryEntry>();

  constructor() {
    this.initializeBuiltInTemplates();
  }

  /**
   * Register a new template with its generator
   */
  public registerTemplate(template: ResourceTemplate, generator: ResourceGenerator): void {
    const entry: TemplateRegistryEntry = {
      template,
      generator,
      enabled: true,
      registeredAt: new Date(),
    };

    this.registry.set(template.templateId, entry);
    
    logger.info({
      operation: 'template_library_register',
      templateId: template.templateId,
      category: template.category,
      supportedFormats: template.supportedFormats,
    }, `Registered template: ${template.name}`);
  }

  /**
   * Get all registered templates
   */
  public getAllTemplates(): ResourceTemplate[] {
    return Array.from(this.registry.values())
      .filter(entry => entry.enabled)
      .map(entry => entry.template);
  }

  /**
   * Get templates by category
   */
  public getTemplatesByCategory(category: ResourceTemplate['category']): ResourceTemplate[] {
    return this.getAllTemplates().filter(template => template.category === category);
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): ResourceTemplate | undefined {
    const entry = this.registry.get(templateId);
    return entry?.enabled ? entry.template : undefined;
  }

  /**
   * Get generator for template
   */
  public getGenerator(templateId: string): ResourceGenerator | undefined {
    const entry = this.registry.get(templateId);
    return entry?.enabled ? entry.generator : undefined;
  }

  /**
   * Enable or disable a template
   */
  public setTemplateEnabled(templateId: string, enabled: boolean): void {
    const entry = this.registry.get(templateId);
    if (entry) {
      this.registry.set(templateId, { ...entry, enabled });
      logger.debug({
        operation: 'template_toggle',
        templateId,
        enabled,
      }, `Template ${enabled ? 'enabled' : 'disabled'}: ${templateId}`);
    }
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltInTemplates(): void {
    // Session summary template
    this.defineTemplate({
      templateId: 'session-summary',
      name: 'Session Summary',
      description: 'Generate a summary of a dialogue session',
      uriPattern: 'template://session/{sessionId}/summary',
      supportedFormats: ['json', 'markdown', 'text'],
      variables: [
        {
          name: 'sessionId',
          description: 'ID of the dialogue session',
          type: 'string',
          required: true,
        },
        {
          name: 'includeInsights',
          description: 'Include detailed insights in summary',
          type: 'boolean',
          required: false,
          defaultValue: 'true',
        },
        {
          name: 'depth',
          description: 'Level of detail in summary',
          type: 'enum',
          required: false,
          defaultValue: 'standard',
          enumValues: ['brief', 'standard', 'detailed'],
        },
      ],
      generator: 'SessionSummaryGenerator',
      examples: [
        'template://session/session-123/summary',
        'template://session/session-123/summary?format=markdown&depth=detailed',
      ],
      category: 'session',
    });

    // Session insights template
    this.defineTemplate({
      templateId: 'session-insights',
      name: 'Session Insights',
      description: 'Extract and format insights from a dialogue session',
      uriPattern: 'template://session/{sessionId}/insights',
      supportedFormats: ['json', 'markdown'],
      variables: [
        {
          name: 'sessionId',
          description: 'ID of the dialogue session',
          type: 'string',
          required: true,
        },
        {
          name: 'insightType',
          description: 'Type of insights to include',
          type: 'enum',
          required: false,
          defaultValue: 'all',
          enumValues: ['all', 'assumptions', 'definitions', 'contradictions', 'requirements'],
        },
      ],
      generator: 'SessionInsightsGenerator',
      examples: [
        'template://session/session-123/insights',
        'template://session/session-123/insights?insightType=assumptions',
      ],
      category: 'session',
    });

    // Pattern documentation template
    this.defineTemplate({
      templateId: 'pattern-docs',
      name: 'Pattern Documentation',
      description: 'Generate documentation for questioning patterns',
      uriPattern: 'template://patterns/{patternType}/docs',
      supportedFormats: ['markdown', 'json', 'html'],
      variables: [
        {
          name: 'patternType',
          description: 'Type of questioning pattern',
          type: 'enum',
          required: true,
          enumValues: Object.values(PatternType),
        },
        {
          name: 'includeExamples',
          description: 'Include example questions',
          type: 'boolean',
          required: false,
          defaultValue: 'true',
        },
        {
          name: 'expertise',
          description: 'Target expertise level for examples',
          type: 'enum',
          required: false,
          defaultValue: 'intermediate',
          enumValues: ['beginner', 'intermediate', 'expert'],
        },
      ],
      generator: 'PatternDocumentationGenerator',
      examples: [
        'template://patterns/definition_seeking/docs',
        'template://patterns/assumption_excavation/docs?format=markdown&expertise=beginner',
      ],
      category: 'pattern',
    });

    // Pattern comparison template
    this.defineTemplate({
      templateId: 'pattern-comparison',
      name: 'Pattern Comparison',
      description: 'Compare multiple questioning patterns',
      uriPattern: 'template://patterns/compare',
      supportedFormats: ['markdown', 'json', 'html'],
      variables: [
        {
          name: 'patterns',
          description: 'Comma-separated list of pattern types to compare',
          type: 'string',
          required: true,
          validation: '^[a-z_,]+$',
        },
        {
          name: 'compareBy',
          description: 'Comparison criteria',
          type: 'enum',
          required: false,
          defaultValue: 'all',
          enumValues: ['all', 'usage', 'effectiveness', 'context'],
        },
      ],
      generator: 'PatternComparisonGenerator',
      examples: [
        'template://patterns/compare?patterns=definition_seeking,assumption_excavation',
        'template://patterns/compare?patterns=all&format=html&compareBy=effectiveness',
      ],
      category: 'pattern',
    });

    // Flow guide template
    this.defineTemplate({
      templateId: 'flow-guide',
      name: 'Flow State Guide',
      description: 'Generate guidance for dialogue flow states',
      uriPattern: 'template://flow/{state}/guide',
      supportedFormats: ['markdown', 'json', 'text'],
      variables: [
        {
          name: 'state',
          description: 'Dialogue flow state',
          type: 'enum',
          required: true,
          enumValues: ['exploring', 'deepening', 'clarifying', 'synthesizing', 'concluding'],
        },
        {
          name: 'includePatterns',
          description: 'Include recommended patterns for this state',
          type: 'boolean',
          required: false,
          defaultValue: 'true',
        },
        {
          name: 'expertise',
          description: 'Target user expertise level',
          type: 'enum',
          required: false,
          defaultValue: 'intermediate',
          enumValues: ['beginner', 'intermediate', 'expert'],
        },
      ],
      generator: 'FlowGuideGenerator',
      examples: [
        'template://flow/exploring/guide',
        'template://flow/deepening/guide?format=markdown&expertise=expert',
      ],
      category: 'flow',
    });

    logger.info({
      operation: 'templates_initialized',
      count: this.registry.size,
    }, 'Initialized built-in resource templates');
  }

  /**
   * Helper to define a template (creates the ResourceTemplate object)
   */
  private defineTemplate(config: {
    templateId: string;
    name: string;
    description: string;
    uriPattern: string;
    supportedFormats: ResourceTemplate['supportedFormats'];
    variables: ResourceVariable[];
    generator: string;
    examples: string[];
    category: ResourceTemplate['category'];
  }): void {
    const template: ResourceTemplate = {
      id: `template-${config.templateId}`,
      sessionId: `template-session-${config.templateId}`, // Add required sessionId field
      templateId: config.templateId,
      name: config.name,
      description: config.description,
      uriPattern: config.uriPattern,
      supportedFormats: config.supportedFormats,
      variables: config.variables,
      generator: config.generator,
      examples: config.examples,
      category: config.category,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Note: Generators will be registered separately when they're instantiated
    const placeholderGenerator: ResourceGenerator = {
      name: config.generator,
      description: `Placeholder for ${config.generator}`,
      supportedFormats: config.supportedFormats,
      generate: async () => ({
        success: false,
        content: '',
        mimeType: 'application/json',
        variables: {},
        metadata: {
          templateId: config.templateId,
          format: 'json',
          generatedAt: new Date(),
        },
        errors: [`Generator ${config.generator} not yet implemented`],
      }),
      validateParams: async () => ({ valid: false, errors: ['Generator not implemented'] }),
    };

    this.registerTemplate(template, placeholderGenerator);
  }
}