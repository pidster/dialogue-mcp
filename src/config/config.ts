/**
 * Configuration management for the Dialogue MCP Server
 */

import { ContextCategory, ExpertiseLevel } from '../types/common.js';
import { PatternType } from '../types/patterns.js';

/**
 * Server configuration
 */
export interface ServerConfig {
  readonly host: string;
  readonly port: number;
  readonly requestTimeout: number;
  readonly enableCors: boolean;
}

/**
 * Session configuration defaults
 */
export interface SessionConfig {
  readonly maxDepth: number;
  readonly maxTurns: number;
  readonly defaultCategory: ContextCategory;
  readonly defaultExpertise: ExpertiseLevel;
  readonly adaptToExpertise: boolean;
  readonly autoFollowUp: boolean;
  readonly requireValidation: boolean;
  readonly persistDecisions: boolean;
  readonly sessionTimeout: number; // in minutes
}

/**
 * Dialogue flow configuration
 */
export interface FlowConfig {
  readonly maxTurnsInState: {
    exploring: number;
    deepening: number;
    clarifying: number;
    synthesizing: number;
    concluding: number;
  };
  readonly enabledPatterns: PatternType[];
  readonly patternMaxDepth: Record<PatternType, number>;
}

/**
 * Logging configuration
 */
export interface LoggingConfig {
  readonly level: string;
  readonly pretty: boolean;
  readonly redactedFields: string[];
}

/**
 * Complete application configuration
 */
export interface AppConfig {
  readonly server: ServerConfig;
  readonly session: SessionConfig;
  readonly flow: FlowConfig;
  readonly logging: LoggingConfig;
}

/**
 * Environment variable parsers
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

function parseInt(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function parseStringArray(value: string | undefined, defaultValue: string[]): string[] {
  if (!value) return defaultValue;
  return value
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Load configuration from environment variables with defaults
 */
export function loadConfig(): AppConfig {
  // Server configuration
  const server: ServerConfig = {
    host: process.env.HOST || 'localhost',
    port: parseInt(process.env.PORT, 3000),
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS, 30000),
    enableCors: parseBoolean(process.env.ENABLE_CORS, true),
  };

  // Session configuration
  const session: SessionConfig = {
    maxDepth: parseInt(process.env.SESSION_MAX_DEPTH, 10),
    maxTurns: parseInt(process.env.SESSION_MAX_TURNS, 50),
    defaultCategory: (process.env.DEFAULT_CATEGORY as ContextCategory) || ContextCategory.GENERAL,
    defaultExpertise:
      (process.env.DEFAULT_EXPERTISE as ExpertiseLevel) || ExpertiseLevel.INTERMEDIATE,
    adaptToExpertise: parseBoolean(process.env.ADAPT_TO_EXPERTISE, true),
    autoFollowUp: parseBoolean(process.env.AUTO_FOLLOW_UP, true),
    requireValidation: parseBoolean(process.env.REQUIRE_VALIDATION, false),
    persistDecisions: parseBoolean(process.env.PERSIST_DECISIONS, true),
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES, 60),
  };

  // Flow configuration
  const flow: FlowConfig = {
    maxTurnsInState: {
      exploring: parseInt(process.env.MAX_TURNS_EXPLORING, 12),
      deepening: parseInt(process.env.MAX_TURNS_DEEPENING, 10),
      clarifying: parseInt(process.env.MAX_TURNS_CLARIFYING, 8),
      synthesizing: parseInt(process.env.MAX_TURNS_SYNTHESIZING, 8),
      concluding: parseInt(process.env.MAX_TURNS_CONCLUDING, 6),
    },
    enabledPatterns: [
      PatternType.DEFINITION_SEEKING,
      PatternType.ASSUMPTION_EXCAVATION,
      PatternType.CONSISTENCY_TESTING,
      PatternType.CONCRETE_INSTANTIATION,
      PatternType.NECESSITY_TESTING,
      PatternType.CONCEPTUAL_CLARITY,
      PatternType.EPISTEMIC_HUMILITY,
      PatternType.SOLUTION_SPACE_MAPPING,
      PatternType.IMPACT_ANALYSIS,
      PatternType.VALUE_CLARIFICATION,
    ],
    patternMaxDepth: {
      [PatternType.DEFINITION_SEEKING]: parseInt(process.env.PATTERN_DEPTH_DEFINITION_SEEKING, 3),
      [PatternType.ASSUMPTION_EXCAVATION]: parseInt(
        process.env.PATTERN_DEPTH_ASSUMPTION_EXCAVATION,
        4
      ),
      [PatternType.CONSISTENCY_TESTING]: parseInt(process.env.PATTERN_DEPTH_CONSISTENCY_TESTING, 3),
      [PatternType.CONCRETE_INSTANTIATION]: parseInt(
        process.env.PATTERN_DEPTH_CONCRETE_INSTANTIATION,
        2
      ),
      [PatternType.NECESSITY_TESTING]: parseInt(process.env.PATTERN_DEPTH_NECESSITY_TESTING, 3),
      [PatternType.CONCEPTUAL_CLARITY]: parseInt(process.env.PATTERN_DEPTH_CONCEPTUAL_CLARITY, 2),
      [PatternType.EPISTEMIC_HUMILITY]: parseInt(process.env.PATTERN_DEPTH_EPISTEMIC_HUMILITY, 3),
      [PatternType.SOLUTION_SPACE_MAPPING]: parseInt(
        process.env.PATTERN_DEPTH_SOLUTION_SPACE_MAPPING,
        3
      ),
      [PatternType.IMPACT_ANALYSIS]: parseInt(process.env.PATTERN_DEPTH_IMPACT_ANALYSIS, 4),
      [PatternType.VALUE_CLARIFICATION]: parseInt(process.env.PATTERN_DEPTH_VALUE_CLARIFICATION, 3),
    },
  };

  // Logging configuration
  const logging: LoggingConfig = {
    level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    pretty: parseBoolean(process.env.PRETTY_LOGS, false),
    redactedFields: parseStringArray(process.env.LOG_REDACTED_FIELDS, [
      'password',
      'token',
      'apiKey',
      'secret',
      'authorization',
    ]),
  };

  return {
    server,
    session,
    flow,
    logging,
  };
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Validate configuration values
 */
export function validateConfig(config: AppConfig): void {
  const errors: string[] = [];

  // Server validation
  if (config.server.port < 1 || config.server.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.server.requestTimeout < 1000) {
    errors.push('REQUEST_TIMEOUT_MS must be at least 1000ms');
  }

  // Session validation
  if (config.session.maxDepth < 1 || config.session.maxDepth > 20) {
    errors.push('SESSION_MAX_DEPTH must be between 1 and 20');
  }

  if (config.session.maxTurns < 1 || config.session.maxTurns > 1000) {
    errors.push('SESSION_MAX_TURNS must be between 1 and 1000');
  }

  if (config.session.sessionTimeout < 1 || config.session.sessionTimeout > 1440) {
    errors.push('SESSION_TIMEOUT_MINUTES must be between 1 and 1440 (24 hours)');
  }

  // Flow validation
  Object.entries(config.flow.maxTurnsInState).forEach(([state, turns]) => {
    if (turns < 1 || turns > 50) {
      errors.push(`MAX_TURNS_${state.toUpperCase()} must be between 1 and 50`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configuration on load
validateConfig(config);
