/**
 * Unit tests for ResourceTemplateEngine
 */

import { ResourceTemplateEngine } from '../../../src/resources/ResourceTemplateEngine.js';
import { ResourceTemplate, ResourceFormat, ResourceGenerator, ResourceTemplateParams, ResourceGenerationContext } from '../../../src/types/resource-templates.js';

describe('ResourceTemplateEngine', () => {
  let templateEngine: ResourceTemplateEngine;
  let mockGenerator: ResourceGenerator;

  beforeEach(() => {
    templateEngine = new ResourceTemplateEngine({ enabled: false }); // Disable cache for tests
    
    // Create a simple mock generator for testing
    mockGenerator = {
      name: 'MockGenerator',
      description: 'A mock generator for testing',
      supportedFormats: ['json', 'markdown', 'text'],
      
      async generate(context: ResourceGenerationContext) {
        const mimeTypes: Record<ResourceFormat, string> = {
          json: 'application/json',
          markdown: 'text/markdown',
          text: 'text/plain',
          html: 'text/html',
        };

        return {
          success: true,
          content: `Mock content for ${context.templateId} in ${context.format} format`,
          mimeType: mimeTypes[context.format] || 'application/json',
          variables: { ...context.pathParams, ...context.queryParams },
          metadata: {
            templateId: context.templateId,
            format: context.format,
            generatedAt: new Date(),
          },
        };
      },

      async validateParams(_params: ResourceTemplateParams) {
        return { valid: true, errors: [] };
      },
    };
  });

  describe('Template Registration', () => {
    it('should register templates successfully', () => {
      const template: ResourceTemplate = {
        id: 'test-template',
        sessionId: 'test-session',
        templateId: 'test',
        name: 'Test Template',
        description: 'A test template',
        uriPattern: 'template://test/{id}',
        supportedFormats: ['json'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(() => {
        templateEngine.registerTemplate(template, mockGenerator);
      }).not.toThrow();

      expect(templateEngine.getTemplate('test')).toEqual(template);
    });

    it('should prevent duplicate template registration', () => {
      const template: ResourceTemplate = {
        id: 'test-template',
        sessionId: 'test-session',
        templateId: 'duplicate',
        name: 'Duplicate Template',
        description: 'A duplicate template',
        uriPattern: 'template://duplicate/{id}',
        supportedFormats: ['json'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateEngine.registerTemplate(template, mockGenerator);

      expect(() => {
        templateEngine.registerTemplate(template, mockGenerator);
      }).toThrow('Template already registered: duplicate');
    });
  });

  describe('URI Pattern Matching', () => {
    beforeEach(() => {
      const template: ResourceTemplate = {
        id: 'session-summary',
        sessionId: 'test-session',
        templateId: 'session-summary',
        name: 'Session Summary',
        description: 'Generate session summaries',
        uriPattern: 'template://session/{sessionId}/summary',
        supportedFormats: ['json', 'markdown'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateEngine.registerTemplate(template, mockGenerator);
    });

    it('should generate resources for valid URIs', async () => {
      const result = await templateEngine.generateResource(
        'template://session/test-123/summary',
        'json'
      );

      if (!result.success) {
        console.log('Generation failed:', result.errors);
      }

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/json');
      expect(result.content).toBeTruthy();
      expect(result.metadata.templateId).toBe('session-summary');
    });

    it('should handle format query parameters', async () => {
      const result = await templateEngine.generateResource(
        'template://session/test-123/summary?format=markdown&depth=detailed'
      );

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/markdown');
    });

    it('should return error for non-matching URIs', async () => {
      const result = await templateEngine.generateResource(
        'template://unknown/resource',
        'json'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No template found for URI: template://unknown/resource');
    });
  });

  describe('Format Support', () => {
    beforeEach(() => {
      const template: ResourceTemplate = {
        id: 'multi-format',
        sessionId: 'test-session',
        templateId: 'multi-format',
        name: 'Multi Format Template',
        description: 'Supports multiple formats',
        uriPattern: 'template://multi/{id}',
        supportedFormats: ['json', 'markdown', 'text'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateEngine.registerTemplate(template, mockGenerator);
    });

    it('should generate JSON format', async () => {
      const result = await templateEngine.generateResource(
        'template://multi/test',
        'json'
      );

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('application/json');
    });

    it('should generate Markdown format', async () => {
      const result = await templateEngine.generateResource(
        'template://multi/test',
        'markdown'
      );

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/markdown');
    });

    it('should generate Text format', async () => {
      const result = await templateEngine.generateResource(
        'template://multi/test',
        'text'
      );

      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('text/plain');
    });
  });

  describe('Error Handling', () => {
    it('should handle generator errors gracefully', async () => {
      const failingGenerator = {
        name: 'FailingGenerator',
        description: 'A generator that always fails',
        supportedFormats: ['json'] as readonly ResourceFormat[],
        generate: async () => ({
          success: false,
          content: '',
          mimeType: 'application/json',
          variables: {},
          metadata: {
            templateId: 'failing',
            format: 'json' as ResourceFormat,
            generatedAt: new Date(),
          },
          errors: ['Generator intentionally failed'],
        }),
        validateParams: async () => ({ valid: true, errors: [] }),
      };

      const template: ResourceTemplate = {
        id: 'failing-template',
        sessionId: 'test-session',
        templateId: 'failing',
        name: 'Failing Template',
        description: 'A template that fails',
        uriPattern: 'template://failing/{id}',
        supportedFormats: ['json'],
        variables: [],
        generator: 'FailingGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateEngine.registerTemplate(template, failingGenerator);

      const result = await templateEngine.generateResource(
        'template://failing/test',
        'json'
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Generator intentionally failed');
    });
  });

  describe('Template Listing', () => {
    beforeEach(() => {
      const template1: ResourceTemplate = {
        id: 'template-1',
        sessionId: 'test-session-1',
        templateId: 'template-1',
        name: 'Template 1',
        description: 'First template',
        uriPattern: 'template://test1/{id}',
        supportedFormats: ['json'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'session',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const template2: ResourceTemplate = {
        id: 'template-2',
        sessionId: 'test-session-2',
        templateId: 'template-2',
        name: 'Template 2',
        description: 'Second template',
        uriPattern: 'template://test2/{id}',
        supportedFormats: ['markdown'],
        variables: [],
        generator: 'MockGenerator',
        examples: [],
        category: 'pattern',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      templateEngine.registerTemplate(template1, mockGenerator);
      templateEngine.registerTemplate(template2, mockGenerator);
    });

    it('should list all registered templates', () => {
      const templates = templateEngine.listTemplates();
      expect(templates).toHaveLength(2);
      expect(templates.map(t => t.templateId)).toContain('template-1');
      expect(templates.map(t => t.templateId)).toContain('template-2');
    });

    it('should get specific template by ID', () => {
      const template = templateEngine.getTemplate('template-1');
      expect(template).toBeTruthy();
      expect(template?.name).toBe('Template 1');
    });

    it('should return undefined for non-existent template', () => {
      const template = templateEngine.getTemplate('non-existent');
      expect(template).toBeUndefined();
    });
  });
});