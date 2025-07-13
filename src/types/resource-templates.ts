/**
 * Resource template types for dynamic resource generation
 */

import { BaseEntity } from './common.js';

/**
 * Supported output formats for templated resources
 */
export type ResourceFormat = 'json' | 'markdown' | 'html' | 'text';

/**
 * Template variable for resource generation
 */
export interface ResourceVariable {
  readonly name: string;
  readonly description: string;
  readonly type: 'string' | 'number' | 'boolean' | 'enum';
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly enumValues?: readonly string[];
  readonly validation?: string; // Regex pattern for validation
}

/**
 * Resource template definition
 */
export interface ResourceTemplate extends BaseEntity {
  readonly templateId: string;
  readonly name: string;
  readonly description: string;
  readonly uriPattern: string; // Pattern like "template://session/{sessionId}/summary"
  readonly supportedFormats: readonly ResourceFormat[];
  readonly variables: readonly ResourceVariable[];
  readonly generator: string; // Name of the generator class to use
  readonly examples: readonly string[];
  readonly category: 'session' | 'pattern' | 'flow' | 'analysis';
}

/**
 * Parameters for template resource generation
 */
export interface ResourceTemplateParams {
  readonly templateId: string;
  readonly pathParams: Record<string, string>;
  readonly queryParams: Record<string, string>;
  readonly format: ResourceFormat;
}

/**
 * Result of template processing
 */
export interface ResourceTemplateResult {
  readonly success: boolean;
  readonly content: string;
  readonly mimeType: string;
  readonly variables: Record<string, unknown>;
  readonly metadata: {
    readonly templateId: string;
    readonly format: ResourceFormat;
    readonly generatedAt: Date;
    readonly cacheKey?: string;
  };
  readonly errors?: readonly string[];
}

/**
 * Context provided to resource generators
 */
export interface ResourceGenerationContext {
  readonly templateId: string;
  readonly pathParams: Record<string, string>;
  readonly queryParams: Record<string, string>;
  readonly format: ResourceFormat;
  readonly sessionData?: unknown;
  readonly patternData?: unknown;
  readonly flowData?: unknown;
}

/**
 * Interface for resource generators
 */
export interface ResourceGenerator {
  readonly name: string;
  readonly description: string;
  readonly supportedFormats: readonly ResourceFormat[];
  
  /**
   * Generate resource content based on context
   */
  generate(context: ResourceGenerationContext): Promise<ResourceTemplateResult>;
  
  /**
   * Validate generation parameters
   */
  validateParams(params: ResourceTemplateParams): Promise<{
    valid: boolean;
    errors: readonly string[];
  }>;
}

/**
 * Template cache entry
 */
export interface TemplateCacheEntry {
  readonly key: string;
  readonly content: string;
  readonly mimeType: string;
  readonly generatedAt: Date;
  readonly expiresAt: Date;
  readonly metadata: Record<string, unknown>;
}

/**
 * Resource template registry entry
 */
export interface TemplateRegistryEntry {
  readonly template: ResourceTemplate;
  readonly generator: ResourceGenerator;
  readonly enabled: boolean;
  readonly registeredAt: Date;
}