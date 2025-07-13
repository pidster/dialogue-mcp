/**
 * Generator for session summary resources
 */

import {
  ResourceGenerator,
  ResourceGenerationContext,
  ResourceTemplateResult,
  ResourceTemplateParams,
  ResourceFormat,
} from '../../types/resource-templates.js';
import { DialogueSession, DialogueTurn, SessionStatus } from '../../types/sessions.js';
import { PatternType } from '../../types/patterns.js';
import logger from '../../utils/logger.js';

/**
 * Session data interface for generation
 */
interface SessionData {
  session: DialogueSession;
  turns: DialogueTurn[];
}

/**
 * Generator for session summary resources
 */
export class SessionSummaryGenerator implements ResourceGenerator {
  public readonly name = 'SessionSummaryGenerator';
  public readonly description = 'Generates summaries of dialogue sessions in various formats';
  public readonly supportedFormats: readonly ResourceFormat[] = ['json', 'markdown', 'text'];

  private sessionDataProvider: (sessionId: string) => Promise<SessionData | null>;

  constructor(sessionDataProvider?: (sessionId: string) => Promise<SessionData | null>) {
    this.sessionDataProvider = sessionDataProvider || this.getDefaultSessionData;
  }

  /**
   * Generate session summary content
   */
  public async generate(context: ResourceGenerationContext): Promise<ResourceTemplateResult> {
    const sessionId = context.pathParams.sessionId;
    if (!sessionId) {
      return this.createErrorResult(context, ['Missing sessionId parameter']);
    }

    try {
      // Get session data
      const sessionData = await this.getSessionData(sessionId);
      if (!sessionData) {
        return this.createErrorResult(context, [`Session not found: ${sessionId}`]);
      }

      // Parse options
      const includeInsights = context.queryParams.includeInsights !== 'false';
      const depth = context.queryParams.depth || 'standard';

      // Generate content based on format
      let content: string;
      let mimeType: string;

      switch (context.format) {
        case 'json':
          content = this.generateJsonSummary(sessionData, { includeInsights, depth });
          mimeType = 'application/json';
          break;
        case 'markdown':
          content = this.generateMarkdownSummary(sessionData, { includeInsights, depth });
          mimeType = 'text/markdown';
          break;
        case 'text':
          content = this.generateTextSummary(sessionData, { includeInsights, depth });
          mimeType = 'text/plain';
          break;
        default:
          return this.createErrorResult(context, [`Unsupported format: ${context.format}`]);
      }

      return {
        success: true,
        content,
        mimeType,
        variables: {
          sessionId,
          includeInsights,
          depth,
          turnCount: sessionData.turns.length,
          generatedAt: new Date().toISOString(),
        },
        metadata: {
          templateId: context.templateId,
          format: context.format,
          generatedAt: new Date(),
          cacheKey: `session-summary:${sessionId}:${context.format}:${includeInsights}:${depth}`,
        },
      };

    } catch (error) {
      logger.error({
        operation: 'session_summary_generation',
        sessionId,
        error: error instanceof Error ? error.message : String(error),
      }, 'Failed to generate session summary');

      return this.createErrorResult(context, [
        error instanceof Error ? error.message : 'Unknown error occurred',
      ]);
    }
  }

  /**
   * Validate generation parameters
   */
  public async validateParams(params: ResourceTemplateParams): Promise<{
    valid: boolean;
    errors: readonly string[];
  }> {
    const errors: string[] = [];

    // Validate sessionId
    if (!params.pathParams.sessionId) {
      errors.push('sessionId is required');
    }

    // Validate depth parameter
    const depth = params.queryParams.depth;
    if (depth && !['brief', 'standard', 'detailed'].includes(depth)) {
      errors.push('depth must be one of: brief, standard, detailed');
    }

    // Validate includeInsights parameter
    const includeInsights = params.queryParams.includeInsights;
    if (includeInsights && !['true', 'false'].includes(includeInsights)) {
      errors.push('includeInsights must be true or false');
    }

    // Validate format
    if (!this.supportedFormats.includes(params.format)) {
      errors.push(`Unsupported format: ${params.format}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get session data from provider
   */
  private async getSessionData(sessionId: string): Promise<SessionData | null> {
    return await this.sessionDataProvider(sessionId);
  }

  /**
   * Get default/mock session data for testing
   */
  private async getDefaultSessionData(sessionId: string): Promise<SessionData | null> {
    // Return mock data for testing
    return {
      session: {
        id: sessionId,
        sessionId,
        title: 'Mock Session',
        description: 'A mock dialogue session for testing',
        status: SessionStatus.COMPLETED,
        config: {} as any,
        participants: [],
        objectives: [],
        context: {} as any,
        turns: [],
        insights: {
          assumptionsUncovered: ['Test assumption'],
          definitionsClarified: ['Test concept'],
          contradictionsFound: [],
          requirementsIdentified: [],
          constraintsDiscovered: [],
          decisionsInfluenced: [],
          knowledgeNodesCreated: [],
          patternEffectiveness: {} as Record<PatternType, number>,
          insightQuality: 0.8,
        },
        metrics: {
          totalTurns: 0,
          averageTurnDuration: 0,
          deepestLevel: 0,
          patternsUsed: {} as Record<PatternType, number>,
          insightsPerTurn: 0,
          userSatisfactionAverage: 0,
          objectivesCompleted: 0,
          contradictionsResolved: 0,
          knowledgeNodesGenerated: 0,
          decisionsMade: 0,
        },
        startedAt: new Date(),
        lastActivityAt: new Date(),
        tags: ['test'],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      turns: [
        {
          id: 'turn-1',
          sessionId,
          questionId: 'q1',
          questionText: 'What is your main goal?',
          questionPattern: PatternType.DEFINITION_SEEKING,
          responseText: 'To build a scalable system',
          turnNumber: 1,
          depth: 1,
          insights: ['User wants scalability'],
          followUpGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    };
  }

  /**
   * Generate JSON format summary
   */
  private generateJsonSummary(
    sessionData: SessionData,
    options: { includeInsights: boolean; depth: string }
  ): string {
    const { session, turns } = sessionData;

    const summary = {
      sessionId: session.id,
      title: session.title,
      description: session.description,
      status: session.status,
      startedAt: session.startedAt.toISOString(),
      duration: this.calculateDuration(session),
      statistics: {
        totalTurns: turns.length,
        averageDepth: turns.length > 0 ? turns.reduce((sum, t) => sum + t.depth, 0) / turns.length : 0,
        patternsUsed: this.getUniquePatterns(turns),
      },
      ...(options.includeInsights && {
        insights: {
          assumptions: session.insights.assumptionsUncovered,
          definitions: session.insights.definitionsClarified,
          contradictions: session.insights.contradictionsFound,
          requirements: session.insights.requirementsIdentified,
        },
      }),
      ...(options.depth === 'detailed' && {
        turns: turns.map(turn => ({
          turnNumber: turn.turnNumber,
          questionPattern: turn.questionPattern,
          questionText: turn.questionText,
          responseLength: turn.responseText?.length || 0,
          insights: turn.insights,
          depth: turn.depth,
        })),
      }),
    };

    return JSON.stringify(summary, null, 2);
  }

  /**
   * Generate Markdown format summary
   */
  private generateMarkdownSummary(
    sessionData: SessionData,
    options: { includeInsights: boolean; depth: string }
  ): string {
    const { session, turns } = sessionData;
    const duration = this.calculateDuration(session);

    let markdown = `# Session Summary: ${session.title}\n\n`;
    markdown += `**Description:** ${session.description || 'No description provided'}\n\n`;
    markdown += `**Status:** ${session.status}\n`;
    markdown += `**Duration:** ${duration}\n`;
    markdown += `**Total Turns:** ${turns.length}\n\n`;

    // Statistics
    markdown += `## Statistics\n\n`;
    markdown += `- **Average Depth:** ${turns.length > 0 ? (turns.reduce((sum, t) => sum + t.depth, 0) / turns.length).toFixed(1) : 0}\n`;
    markdown += `- **Patterns Used:** ${this.getUniquePatterns(turns).join(', ')}\n\n`;

    // Insights
    if (options.includeInsights) {
      markdown += `## Key Insights\n\n`;
      
      if (session.insights.assumptionsUncovered.length > 0) {
        markdown += `### Assumptions Uncovered\n`;
        session.insights.assumptionsUncovered.forEach(assumption => {
          markdown += `- ${assumption}\n`;
        });
        markdown += '\n';
      }

      if (session.insights.definitionsClarified.length > 0) {
        markdown += `### Concepts Defined\n`;
        session.insights.definitionsClarified.forEach(concept => {
          markdown += `- ${concept}\n`;
        });
        markdown += '\n';
      }

      if (session.insights.contradictionsFound.length > 0) {
        markdown += `### Contradictions Found\n`;
        session.insights.contradictionsFound.forEach(contradiction => {
          markdown += `- ${contradiction}\n`;
        });
        markdown += '\n';
      }
    }

    // Detailed turn information
    if (options.depth === 'detailed') {
      markdown += `## Turn Details\n\n`;
      turns.forEach(turn => {
        markdown += `### Turn ${turn.turnNumber} (${turn.questionPattern})\n\n`;
        markdown += `**Question:** ${turn.questionText}\n\n`;
        if (turn.responseText) {
          markdown += `**Response:** ${turn.responseText.substring(0, 200)}${turn.responseText.length > 200 ? '...' : ''}\n\n`;
        }
        if (turn.insights.length > 0) {
          markdown += `**Insights:** ${turn.insights.join(', ')}\n\n`;
        }
      });
    }

    return markdown;
  }

  /**
   * Generate plain text summary
   */
  private generateTextSummary(
    sessionData: SessionData,
    options: { includeInsights: boolean; depth: string }
  ): string {
    const { session, turns } = sessionData;
    const duration = this.calculateDuration(session);

    let text = `SESSION SUMMARY: ${session.title.toUpperCase()}\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Description: ${session.description || 'No description provided'}\n`;
    text += `Status: ${session.status}\n`;
    text += `Duration: ${duration}\n`;
    text += `Total Turns: ${turns.length}\n\n`;

    if (options.includeInsights && session.insights.assumptionsUncovered.length > 0) {
      text += `KEY INSIGHTS:\n`;
      text += `- Assumptions: ${session.insights.assumptionsUncovered.length}\n`;
      text += `- Definitions: ${session.insights.definitionsClarified.length}\n`;
      text += `- Contradictions: ${session.insights.contradictionsFound.length}\n\n`;
    }

    if (options.depth === 'detailed') {
      text += `TURN SUMMARY:\n`;
      turns.forEach(turn => {
        text += `  ${turn.turnNumber}. ${turn.questionPattern}: ${turn.questionText.substring(0, 100)}...\n`;
      });
    }

    return text;
  }

  /**
   * Calculate session duration
   */
  private calculateDuration(session: DialogueSession): string {
    const start = session.startedAt;
    const end = session.lastActivityAt;
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    return `${minutes} minutes`;
  }

  /**
   * Get unique patterns used in session
   */
  private getUniquePatterns(turns: DialogueTurn[]): string[] {
    const patterns = new Set(turns.map(turn => turn.questionPattern));
    return Array.from(patterns);
  }

  /**
   * Create error result
   */
  private createErrorResult(context: ResourceGenerationContext, errors: string[]): ResourceTemplateResult {
    return {
      success: false,
      content: '',
      mimeType: 'application/json',
      variables: {},
      metadata: {
        templateId: context.templateId,
        format: context.format,
        generatedAt: new Date(),
      },
      errors,
    };
  }
}