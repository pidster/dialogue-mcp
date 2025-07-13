/**
 * Structured logging configuration using Pino
 */

import pino from 'pino';
import type { Logger } from 'pino';
import { hostname } from 'os';
import { config } from '../config/config.js';

// Determine if we're in production
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Base logger configuration
const loggerOptions: pino.LoggerOptions = {
  level: config.logging.level,
  base: {
    service: 'dialogue-mcp',
    environment: process.env.NODE_ENV || 'development',
    pid: process.pid,
    hostname: process.env.HOSTNAME || hostname(),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: config.logging.redactedFields,
    remove: true,
  },
  // Serializers for common objects
  serializers: {
    error: pino.stdSerializers.err,
    req: (req: any) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      headers: {
        'content-type': req.headers['content-type'],
        'mcp-session-id': req.headers['mcp-session-id'],
      },
    }),
    res: (res: any) => ({
      statusCode: res.statusCode,
      headers: {
        'mcp-session-id': res.getHeader('mcp-session-id'),
      },
    }),
  },
};

// Add transport configuration based on environment
// Use pino-pretty only if explicitly requested via configuration
if (isDevelopment && config.logging.pretty) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss.l',
      ignore: 'pid,hostname',
      messageFormat: '{msg} {sessionId} {operation}',
      singleLine: true, // Force single-line output
    },
  };
}

const baseLogger = pino(loggerOptions);

/**
 * Create a child logger with session context
 */
export function createSessionLogger(sessionId: string, transportSessionId?: string): Logger {
  return baseLogger.child({
    sessionId,
    transportSessionId,
  });
}

/**
 * Create a child logger for a specific operation
 */
export function createOperationLogger(
  logger: Logger,
  operation: string,
  metadata?: Record<string, unknown>
): Logger {
  return logger.child({
    operation,
    ...metadata,
  });
}

/**
 * Log operation performance metrics
 */
export function logOperationMetrics(
  logger: Logger,
  operation: string,
  startTime: number,
  metadata?: Record<string, unknown>
): void {
  const duration = Date.now() - startTime;
  logger.info(
    {
      operation,
      duration,
      ...metadata,
    },
    `Operation completed: ${operation}`
  );
}

/**
 * Log pattern selection details
 */
export function logPatternSelection(
  logger: Logger,
  pattern: string,
  confidence: number,
  alternatives: string[],
  flowState: string
): void {
  logger.debug(
    {
      operation: 'pattern_selection',
      pattern,
      confidence,
      alternatives,
      flowState,
    },
    'Selected question pattern'
  );
}

/**
 * Log response analysis results
 */
export function logResponseAnalysis(
  logger: Logger,
  clarity: number,
  completeness: number,
  insightsCount: number,
  concepts: string[],
  assumptions: string[],
  contradictions: string[]
): void {
  logger.info(
    {
      operation: 'response_analysis',
      clarity,
      completeness,
      insightsCount,
      extractedConcepts: concepts,
      detectedAssumptions: assumptions,
      identifiedContradictions: contradictions,
    },
    'Analyzed user response'
  );
}

/**
 * Log session insights
 */
export function logSessionInsights(
  logger: Logger,
  turnCount: number,
  depth: number,
  discoveries: {
    assumptions: number;
    definitions: number;
    contradictions: number;
  }
): void {
  logger.info(
    {
      operation: 'session_insights',
      turnCount,
      depth,
      discoveries,
    },
    'Generated session insights'
  );
}

/**
 * Log error with context
 */
export function logError(
  logger: Logger,
  error: Error | unknown,
  context?: Record<string, unknown>
): void {
  logger.error(
    {
      error: error instanceof Error ? error : { message: String(error) },
      ...context,
    },
    error instanceof Error ? error.message : 'An error occurred'
  );
}

export default baseLogger;
