/**
 * Core resource template engine for dynamic resource generation
 */

import {
  ResourceTemplate,
  ResourceTemplateParams,
  ResourceTemplateResult,
  ResourceGenerator,
  ResourceGenerationContext,
  TemplateCacheEntry,
  ResourceFormat,
} from '../types/resource-templates.js';
import logger, { logError, logOperationMetrics } from '../utils/logger.js';

/**
 * Template matching result
 */
interface TemplateMatch {
  readonly template: ResourceTemplate;
  readonly generator: ResourceGenerator;
  readonly pathParams: Record<string, string>;
}

/**
 * Cache configuration
 */
interface CacheConfig {
  readonly enabled: boolean;
  readonly maxEntries: number;
  readonly defaultTtlMinutes: number;
}

/**
 * Resource template engine for generating dynamic resources
 */
export class ResourceTemplateEngine {
  private readonly templates = new Map<string, ResourceTemplate>();
  private readonly generators = new Map<string, ResourceGenerator>();
  private readonly cache = new Map<string, TemplateCacheEntry>();
  private readonly cacheConfig: CacheConfig;

  constructor(cacheConfig?: Partial<CacheConfig>) {
    this.cacheConfig = {
      enabled: true,
      maxEntries: 1000,
      defaultTtlMinutes: 15,
      ...cacheConfig,
    };
  }

  /**
   * Register a resource template with its generator
   */
  public registerTemplate(template: ResourceTemplate, generator: ResourceGenerator): void {
    if (this.templates.has(template.templateId)) {
      throw new Error(`Template already registered: ${template.templateId}`);
    }

    if (!generator.supportedFormats.some(f => template.supportedFormats.includes(f))) {
      throw new Error(
        `Generator formats ${generator.supportedFormats.join(', ')} don't match template formats ${template.supportedFormats.join(', ')}`
      );
    }

    this.templates.set(template.templateId, template);
    this.generators.set(template.generator, generator);

    logger.debug({
      operation: 'template_registered',
      templateId: template.templateId,
      generator: generator.name,
      supportedFormats: template.supportedFormats,
    }, `Registered resource template: ${template.name}`);
  }

  /**
   * Generate resource content from a template URI
   */
  public async generateResource(uri: string, format?: ResourceFormat): Promise<ResourceTemplateResult> {
    const startTime = Date.now();
    
    try {
      // Parse URI and find matching template
      const match = this.findTemplateMatch(uri);
      if (!match) {
        return {
          success: false,
          content: '',
          mimeType: 'application/json',
          variables: {},
          metadata: {
            templateId: '',
            format: format || 'json',
            generatedAt: new Date(),
          },
          errors: [`No template found for URI: ${uri}`],
        };
      }

      // Extract query parameters from URI
      const queryParams = this.extractQueryParams(uri);
      
      // Use format from query params if not explicitly provided
      const finalFormat = format || (queryParams.format as ResourceFormat) || 'json';
      
      // Create template parameters
      const params: ResourceTemplateParams = {
        templateId: match.template.templateId,
        pathParams: match.pathParams,
        queryParams,
        format: finalFormat,
      };

      // Validate parameters
      const validation = await match.generator.validateParams(params);
      if (!validation.valid) {
        return {
          success: false,
          content: '',
          mimeType: 'application/json',
          variables: {},
          metadata: {
            templateId: match.template.templateId,
            format: finalFormat,
            generatedAt: new Date(),
          },
          errors: validation.errors,
        };
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(params);
      if (this.cacheConfig.enabled) {
        const cached = this.getCachedResult(cacheKey);
        if (cached) {
          logger.debug({
            operation: 'template_cache_hit',
            templateId: match.template.templateId,
            cacheKey,
          }, 'Returning cached template result');
          
          return {
            success: true,
            content: cached.content,
            mimeType: cached.mimeType,
            variables: {},
            metadata: {
              templateId: match.template.templateId,
              format: finalFormat,
              generatedAt: cached.generatedAt,
              cacheKey,
            },
          };
        }
      }

      // Generate resource content
      const context: ResourceGenerationContext = {
        templateId: match.template.templateId,
        pathParams: match.pathParams,
        queryParams,
        format: finalFormat,
      };

      const result = await match.generator.generate(context);

      // Cache successful results
      if (result.success && this.cacheConfig.enabled) {
        this.cacheResult(cacheKey, result);
      }

      logOperationMetrics(logger, 'generate_resource', startTime, {
        templateId: match.template.templateId,
        format: finalFormat,
        success: result.success,
        cached: false,
      });

      return result;

    } catch (error) {
      logError(logger, error, {
        operation: 'generate_resource',
        uri,
        format,
      });

      return {
        success: false,
        content: '',
        mimeType: 'application/json',
        variables: {},
        metadata: {
          templateId: '',
          format: format || 'json',
          generatedAt: new Date(),
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * List all available template resources
   */
  public listTemplates(): ResourceTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  public getTemplate(templateId: string): ResourceTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Clear template cache
   */
  public clearCache(): void {
    this.cache.clear();
    logger.debug({
      operation: 'cache_cleared',
    }, 'Resource template cache cleared');
  }

  /**
   * Find template that matches the given URI
   */
  private findTemplateMatch(uri: string): TemplateMatch | null {
    // Remove query parameters for pattern matching
    const baseUri = uri.split('?')[0];
    
    for (const template of this.templates.values()) {
      const pathParams = this.matchUriPattern(baseUri, template.uriPattern);
      if (pathParams) {
        const generator = this.generators.get(template.generator);
        if (generator) {
          return {
            template,
            generator,
            pathParams,
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Match URI against template pattern and extract path parameters
   */
  private matchUriPattern(uri: string, pattern: string): Record<string, string> | null {
    // Convert pattern like "template://session/{sessionId}/summary" to regex
    const regexPattern = pattern.replace(/\{([^}]+)\}/g, '([^/]+)');
    const regex = new RegExp(`^${regexPattern}$`);
    
    const match = uri.match(regex);
    if (!match) {
      return null;
    }

    // Extract parameter names from pattern
    const paramNames = Array.from(pattern.matchAll(/\{([^}]+)\}/g), m => m[1]);
    
    // Build parameter object
    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = match[i + 1];
    }
    
    return params;
  }

  /**
   * Extract query parameters from URI
   */
  private extractQueryParams(uri: string): Record<string, string> {
    const queryString = uri.split('?')[1];
    if (!queryString) {
      return {};
    }

    const params: Record<string, string> = {};
    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[decodeURIComponent(key)] = decodeURIComponent(value);
      }
    }
    
    return params;
  }

  /**
   * Generate cache key for template parameters
   */
  private generateCacheKey(params: ResourceTemplateParams): string {
    const keyParts = [
      params.templateId,
      params.format,
      JSON.stringify(params.pathParams),
      JSON.stringify(params.queryParams),
    ];
    return `template:${keyParts.join(':')}`;
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult(cacheKey: string): TemplateCacheEntry | null {
    const entry = this.cache.get(cacheKey);
    if (!entry) {
      return null;
    }

    if (entry.expiresAt < new Date()) {
      this.cache.delete(cacheKey);
      return null;
    }

    return entry;
  }

  /**
   * Cache generation result
   */
  private cacheResult(cacheKey: string, result: ResourceTemplateResult): void {
    if (!result.success) {
      return;
    }

    // Enforce cache size limit
    if (this.cache.size >= this.cacheConfig.maxEntries) {
      // Remove oldest entries (simple LRU)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.cacheConfig.defaultTtlMinutes);

    const entry: TemplateCacheEntry = {
      key: cacheKey,
      content: result.content,
      mimeType: result.mimeType,
      generatedAt: result.metadata.generatedAt,
      expiresAt,
      metadata: result.variables,
    };

    this.cache.set(cacheKey, entry);
  }
}