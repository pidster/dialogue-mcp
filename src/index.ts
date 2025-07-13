#!/usr/bin/env node
/**
 * Main entry point for the Socratic Dialogue MCP Server with Streamable HTTP transport
 */

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHttpServerTransport } from './streamable-http-transport.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { PatternLibrary } from './patterns/PatternLibrary.js';
import { QuestionSelector } from './patterns/QuestionSelector.js';
import { TemplateEngine } from './patterns/TemplateEngine.js';
import { DialogueFlowManager } from './dialogue/DialogueFlowManager.js';
import { ResponseAnalyzer } from './dialogue/ResponseAnalyzer.js';
import { 
  DialogueSession, 
  DialogueContext, 
  SessionStatus,
  DialogueTurn,
} from './types/sessions.js';
import {
  ContextCategory,
  ExpertiseLevel,
  ProjectPhase,
} from './types/common.js';
import { SelectionContext } from './patterns/QuestionSelector.js';
import logger, { 
  createSessionLogger,
  logOperationMetrics,
  logPatternSelection,
  logResponseAnalysis,
  logSessionInsights,
  logError
} from './utils/logger.js';
import { config } from './config/config.js';

// Express app setup
const app = express();
if (config.server.enableCors) {
  app.use(cors());
}
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach request ID to request
  (req as any).id = requestId;
  
  // Log request
  logger.info({
    type: 'http_request',
    requestId,
    method: req.method,
    url: req.url,
    headers: {
      'content-type': req.headers['content-type'],
      'mcp-session-id': req.headers['mcp-session-id'],
    },
  }, 'Incoming HTTP request');
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      type: 'http_response',
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
    }, 'HTTP response sent');
  });
  
  next();
});

// In-memory session storage (in production, use a database)
const sessions = new Map<string, DialogueSession>();
const turns = new Map<string, DialogueTurn[]>();
const transports = new Map<string, StreamableHttpServerTransport>();
const servers = new Map<string, Server>();

// Initialize core components
const patternLibrary = new PatternLibrary();
const questionSelector = new QuestionSelector(patternLibrary);
const templateEngine = new TemplateEngine();
const flowManager = new DialogueFlowManager();
const responseAnalyzer = new ResponseAnalyzer(patternLibrary);

// Create MCP server factory
function createMCPServer() {
  const server = new Server(
    {
      name: 'socratic-dialogue-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'start_dialogue',
          description: 'Start a new Socratic dialogue session',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Title for the dialogue session',
              },
              description: {
                type: 'string',
                description: 'Description of what to explore',
              },
              category: {
                type: 'string',
                enum: Object.values(ContextCategory),
                description: 'Context category for the dialogue',
              },
              expertise: {
                type: 'string',
                enum: Object.values(ExpertiseLevel),
                description: 'User expertise level',
              },
              focus: {
                type: 'string',
                description: 'Primary focus area or topic',
              },
            },
            required: ['title', 'focus'],
          },
        },
        {
          name: 'ask_question',
          description: 'Generate a question based on current context',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID of the dialogue session',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'submit_response',
          description: 'Submit a response to the current question',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID of the dialogue session',
              },
              response: {
                type: 'string',
                description: 'User response to the question',
              },
            },
            required: ['sessionId', 'response'],
          },
        },
        {
          name: 'get_session_insights',
          description: 'Get insights and analysis from the dialogue session',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID of the dialogue session',
              },
            },
            required: ['sessionId'],
          },
        },
        {
          name: 'analyze_flow',
          description: 'Analyze current dialogue flow and get recommendations',
          inputSchema: {
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                description: 'ID of the dialogue session',
              },
            },
            required: ['sessionId'],
          },
        },
      ],
    };
  });

  // List available resources
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = [];
    
    // Add session resources
    for (const [sessionId, session] of sessions) {
      resources.push({
        uri: `session://${sessionId}`,
        name: session.title,
        description: `Dialogue session: ${session.description || 'No description'}`,
        mimeType: 'application/json',
      });
    }
    
    // Add pattern library resource
    resources.push({
      uri: 'patterns://library',
      name: 'Pattern Library',
      description: 'All available questioning patterns',
      mimeType: 'application/json',
    });
    
    return { resources };
  });

  // Read resources
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    
    if (uri === 'patterns://library') {
      const patterns = patternLibrary.getAllPatterns();
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(patterns, null, 2),
          },
        ],
      };
    }
    
    if (uri.startsWith('session://')) {
      const sessionId = uri.replace('session://', '');
      const session = sessions.get(sessionId);
      
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      const sessionTurns = turns.get(sessionId) || [];
      
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify({ session, turns: sessionTurns }, null, 2),
          },
        ],
      };
    }
    
    throw new Error(`Resource not found: ${uri}`);
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    switch (name) {
      case 'start_dialogue': {
        const startTime = Date.now();
        const sessionId = `session-${Date.now()}`;
        const sessionLogger = createSessionLogger(sessionId);
        
        sessionLogger.info({
          operation: 'start_dialogue',
          title: args?.title,
          focus: args?.focus,
          category: args?.category || 'general',
          description: args?.description,
        }, 'Starting new Socratic dialogue session');
        
        const context: DialogueContext = {
          sessionId,
          currentCategory: (args?.category as ContextCategory) || ContextCategory.GENERAL,
          projectPhase: ProjectPhase.PLANNING,
          focusArea: args?.focus as string,
          currentDepth: 0,
          turnCount: 0,
          awaitingResponse: false,
          conversationFlow: 'exploring',
          activeTopics: [args?.focus as string],
          exploredConcepts: [],
          pendingFollowUps: [],
          userEngagement: 0.8,
          progressTowardsGoals: 0,
        };
        
        const session: DialogueSession = {
          id: sessionId,
          sessionId,
          title: args?.title as string,
          description: (args?.description as string) || '',
          status: SessionStatus.ACTIVE,
          config: {
            maxDepth: config.session.maxDepth,
            maxTurns: config.session.maxTurns,
            focusAreas: [(args?.category as ContextCategory) || config.session.defaultCategory],
            enabledPatterns: config.flow.enabledPatterns,
            adaptToExpertise: config.session.adaptToExpertise,
            autoFollowUp: config.session.autoFollowUp,
            requireValidation: config.session.requireValidation,
            persistDecisions: config.session.persistDecisions,
          },
          participants: [],
          objectives: [],
          context,
          turns: [],
          insights: {
            assumptionsUncovered: [],
            definitionsClarified: [],
            contradictionsFound: [],
            requirementsIdentified: [],
            constraintsDiscovered: [],
            decisionsInfluenced: [],
            knowledgeNodesCreated: [],
            patternEffectiveness: {} as any,
            insightQuality: 0.5,
          },
          metrics: {
            totalTurns: 0,
            averageTurnDuration: 0,
            deepestLevel: 0,
            patternsUsed: {} as any,
            insightsPerTurn: 0,
            userSatisfactionAverage: 0,
            objectivesCompleted: 0,
            contradictionsResolved: 0,
            knowledgeNodesGenerated: 0,
            decisionsMade: 0,
          },
          startedAt: new Date(),
          lastActivityAt: new Date(),
          tags: [args?.focus as string],
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        sessions.set(sessionId, session);
        turns.set(sessionId, []);
        
        logOperationMetrics(sessionLogger, 'start_dialogue', startTime, {
          title: args?.title,
          category: session.context.currentCategory,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `Started new Socratic dialogue session: ${sessionId}\nTitle: ${args?.title}\nFocus: ${args?.focus}\n\nSession is ready. Use 'ask_question' to generate the first question.`,
            },
          ],
        };
      }
      
      case 'ask_question': {
        const startTime = Date.now();
        const session = sessions.get(args?.sessionId as string);
        if (!session) {
          logError(logger, new Error(`Session not found: ${args?.sessionId}`), {
            operation: 'ask_question',
            sessionId: args?.sessionId,
          });
          throw new Error(`Session not found: ${args?.sessionId}`);
        }
        
        const sessionLogger = createSessionLogger(session.sessionId);
        
        const sessionTurns = turns.get(args?.sessionId as string) || [];
        const patternHistory = sessionTurns.map(t => t.questionPattern);
        
        // Create selection context
        const selectionContext: SelectionContext = {
          ...session.context,
          userExpertise: (args?.expertise as ExpertiseLevel) || ExpertiseLevel.INTERMEDIATE,
          extractedConcepts: session.insights.definitionsClarified,
          detectedAssumptions: session.insights.assumptionsUncovered,
          knownDefinitions: session.insights.definitionsClarified,
          currentFocus: session.context.focusArea,
          category: session.context.currentCategory,
          previousQuestions: sessionTurns.map(t => t.questionId || t.id),
          metadata: {},
        };
        
        // Select best pattern
        const selection = questionSelector.selectBestPattern(selectionContext);
        
        // Log pattern selection details
        logPatternSelection(
          sessionLogger,
          selection.selectedPattern,
          selection.confidence,
          selection.alternatives.map(a => a.pattern),
          session.context.conversationFlow
        );
        
        // Get pattern details
        const pattern = patternLibrary.getPattern(selection.selectedPattern);
        if (!pattern) {
          logError(sessionLogger, new Error(`Pattern not found: ${selection.selectedPattern}`), {
            operation: 'ask_question',
            pattern: selection.selectedPattern,
          });
          throw new Error(`Pattern not found: ${selection.selectedPattern}`);
        }
        
        // Generate question
        const templateResult = templateEngine.processTemplate(pattern, {}, {
          category: session.context.currentCategory,
          userExpertise: ExpertiseLevel.INTERMEDIATE,
          projectPhase: session.context.projectPhase,
          previousQuestions: [],
          extractedConcepts: session.insights.definitionsClarified,
          detectedAssumptions: session.insights.assumptionsUncovered,
          knownDefinitions: session.insights.definitionsClarified,
          currentFocus: session.context.focusArea,
          metadata: {},
        });
        
        // Create turn
        const turnId = `turn-${Date.now()}`;
        const turn: DialogueTurn = {
          id: turnId,
          sessionId: args?.sessionId as string,
          questionId: turnId,
          questionText: templateResult.question,
          questionPattern: selection.selectedPattern,
          turnNumber: sessionTurns.length + 1,
          depth: session.context.currentDepth + 1,
          insights: [],
          followUpGenerated: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        sessionTurns.push(turn);
        turns.set(args?.sessionId as string, sessionTurns);
        
        // Update session - create new context object
        const updatedContext: DialogueContext = {
          ...session.context,
          turnCount: session.context.turnCount + 1,
          currentDepth: turn.depth,
          lastQuestionId: turnId,
          awaitingResponse: true,
        };
        
        // Update session with new values
        const updatedSession: DialogueSession = {
          ...session,
          context: updatedContext,
          metrics: {
            ...session.metrics,
            totalTurns: session.metrics.totalTurns + 1,
          },
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        };
        
        sessions.set(args?.sessionId as string, updatedSession);
        
        // Analyze flow
        const flowAnalysis = flowManager.analyzeFlow(session, sessionTurns, patternHistory);
        
        sessionLogger.info({
          operation: 'flow_analysis',
          turnNumber: turn.turnNumber,
          flowState: flowAnalysis.currentState,
          stateConfidence: flowAnalysis.stateConfidence,
        }, 'Analyzed dialogue flow state');
        
        logOperationMetrics(sessionLogger, 'ask_question', startTime, {
          pattern: selection.selectedPattern,
          turnNumber: turn.turnNumber,
          flowState: flowAnalysis.currentState,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `**Question ${turn.turnNumber}** (Pattern: ${selection.selectedPattern})\n\n${templateResult.question}\n\nConfidence: ${(selection.confidence * 100).toFixed(0)}%\nFlow State: ${flowAnalysis.currentState}\nAlternatives: ${selection.alternatives.map(a => a.pattern).join(', ')}\n\nSubmit your response using 'submit_response'.`,
            },
          ],
        };
      }
      
      case 'submit_response': {
        const startTime = Date.now();
        const session = sessions.get(args?.sessionId as string);
        if (!session) {
          logError(logger, new Error(`Session not found: ${args?.sessionId}`), {
            operation: 'submit_response',
            sessionId: args?.sessionId,
          });
          throw new Error(`Session not found: ${args?.sessionId}`);
        }
        
        const sessionLogger = createSessionLogger(session.sessionId);
        
        const sessionTurns = turns.get(args?.sessionId as string) || [];
        const currentTurn = sessionTurns[sessionTurns.length - 1];
        
        if (!currentTurn) {
          throw new Error('No active question to respond to');
        }
        
        // Analyze response
        const question = {
          id: currentTurn.questionId || currentTurn.id,
          sessionId: args?.sessionId as string,
          patternId: 'pattern-' + currentTurn.questionPattern,
          patternType: currentTurn.questionPattern,
          text: currentTurn.questionText,
          context: {
            category: session.context.currentCategory,
            userExpertise: ExpertiseLevel.INTERMEDIATE,
            projectPhase: session.context.projectPhase,
            previousQuestions: [],
            extractedConcepts: session.insights.definitionsClarified,
            detectedAssumptions: session.insights.assumptionsUncovered,
            knownDefinitions: session.insights.definitionsClarified,
            currentFocus: session.context.focusArea,
            metadata: {},
          },
          variables: {},
          depth: currentTurn.depth,
          expectedResponseType: 'explanation' as const,
          createdAt: currentTurn.createdAt,
          updatedAt: new Date(),
        };
        
        const analysis = responseAnalyzer.analyzeResponse(
          question,
          args?.response as string,
          question.context
        );
        
        // Log response analysis results
        logResponseAnalysis(
          sessionLogger,
          analysis.clarityScore,
          analysis.completenessScore,
          analysis.newInsights.length,
          [...analysis.extractedConcepts],
          [...analysis.detectedAssumptions],
          [...analysis.identifiedContradictions]
        );
        
        // Create updated turn
        const updatedTurn: DialogueTurn = {
          ...currentTurn,
          responseText: args?.response as string,
          insights: analysis.newInsights,
          duration: Date.now() - currentTurn.createdAt.getTime(),
          updatedAt: new Date(),
        };
        
        // Update turns array
        sessionTurns[sessionTurns.length - 1] = updatedTurn;
        turns.set(args?.sessionId as string, sessionTurns);
        
        // Update session with new insights and context
        const updatedSessionContext: DialogueContext = {
          ...session.context,
          awaitingResponse: false,
        };
        
        const updatedSessionInsights = {
          ...session.insights,
          assumptionsUncovered: [...session.insights.assumptionsUncovered, ...analysis.detectedAssumptions],
          definitionsClarified: [...session.insights.definitionsClarified, ...analysis.extractedConcepts],
          contradictionsFound: [...session.insights.contradictionsFound, ...analysis.identifiedContradictions],
        };
        
        const updatedSession: DialogueSession = {
          ...session,
          context: updatedSessionContext,
          insights: updatedSessionInsights,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        };
        
        sessions.set(args?.sessionId as string, updatedSession);
        
        // Record pattern effectiveness
        questionSelector.updatePatternEffectiveness({
          pattern: currentTurn.questionPattern,
          context: {
            ...updatedSession.context,
            userExpertise: ExpertiseLevel.INTERMEDIATE,
            extractedConcepts: updatedSession.insights.definitionsClarified,
            detectedAssumptions: updatedSession.insights.assumptionsUncovered,
            knownDefinitions: updatedSession.insights.definitionsClarified,
            currentFocus: updatedSession.context.focusArea,
            category: updatedSession.context.currentCategory,
            previousQuestions: sessionTurns.map(t => t.questionId || t.id),
            metadata: {},
          },
          insightsGenerated: analysis.newInsights.length,
          followUpUsed: false,
          ledToContradiction: analysis.identifiedContradictions.length > 0,
          clarifiedDefinition: analysis.extractedConcepts.length > 0,
          uncoveredAssumption: analysis.detectedAssumptions.length > 0,
        });
        
        logOperationMetrics(sessionLogger, 'submit_response', startTime, {
          responseLength: (args?.response as string).length,
          insightsGenerated: analysis.newInsights.length,
          clarity: analysis.clarityScore,
        });
        
        return {
          content: [
            {
              type: 'text',
              text: `**Response Analysis**\n\nClarity: ${(analysis.clarityScore * 100).toFixed(0)}%\nCompleteness: ${(analysis.completenessScore * 100).toFixed(0)}%\n\n**Insights Extracted:**\n- Concepts: ${analysis.extractedConcepts.join(', ') || 'None'}\n- Assumptions: ${analysis.detectedAssumptions.join(', ') || 'None'}\n- Contradictions: ${analysis.identifiedContradictions.join(', ') || 'None'}\n\n**Suggested Follow-ups:** ${analysis.suggestedFollowUps.join(', ')}\n\nUse 'ask_question' to continue the dialogue.`,
            },
          ],
        };
      }
      
      case 'get_session_insights': {
        const startTime = Date.now();
        const session = sessions.get(args?.sessionId as string);
        if (!session) {
          logError(logger, new Error(`Session not found: ${args?.sessionId}`), {
            operation: 'get_session_insights',
            sessionId: args?.sessionId,
          });
          throw new Error(`Session not found: ${args?.sessionId}`);
        }
        
        const sessionLogger = createSessionLogger(session.sessionId);
        
        logSessionInsights(
          sessionLogger,
          session.context.turnCount,
          session.context.currentDepth,
          {
            assumptions: session.insights.assumptionsUncovered.length,
            definitions: session.insights.definitionsClarified.length,
            contradictions: session.insights.contradictionsFound.length,
          }
        );
        
        logOperationMetrics(sessionLogger, 'get_session_insights', startTime);
        
        return {
          content: [
            {
              type: 'text',
              text: `**Session Insights**\n\n**Progress:** ${session.context.turnCount} turns, depth ${session.context.currentDepth}\n\n**Discoveries:**\n- Assumptions: ${session.insights.assumptionsUncovered.length}\n- Definitions: ${session.insights.definitionsClarified.length}\n- Contradictions: ${session.insights.contradictionsFound.length}\n\n**Key Insights:**\n${session.insights.assumptionsUncovered.map(a => `- Assumption: ${a}`).join('\n')}\n${session.insights.definitionsClarified.map(d => `- Definition: ${d}`).join('\n')}\n${session.insights.contradictionsFound.map(c => `- Contradiction: ${c}`).join('\n')}\n\n**Pattern Usage:**\n${Object.entries(session.metrics.patternsUsed || {}).map(([p, count]) => `- ${p}: ${count} times`).join('\n') || 'No patterns tracked yet'}`,
            },
          ],
        };
      }
      
      case 'analyze_flow': {
        const startTime = Date.now();
        const session = sessions.get(args?.sessionId as string);
        if (!session) {
          logError(logger, new Error(`Session not found: ${args?.sessionId}`), {
            operation: 'analyze_flow',
            sessionId: args?.sessionId,
          });
          throw new Error(`Session not found: ${args?.sessionId}`);
        }
        
        const sessionLogger = createSessionLogger(session.sessionId);
        
        const sessionTurns = turns.get(args?.sessionId as string) || [];
        const patternHistory = sessionTurns.map(t => t.questionPattern);
        
        const analysis = flowManager.analyzeFlow(session, sessionTurns, patternHistory);
        
        sessionLogger.info({
          operation: 'flow_analysis_detailed',
          currentState: analysis.currentState,
          stateConfidence: analysis.stateConfidence,
          stateMetrics: analysis.stateMetrics,
          progressAssessment: analysis.progressAssessment,
          recommendationsCount: analysis.recommendations.length,
          suggestedTransition: analysis.suggestedTransition,
        }, 'Generated detailed flow analysis');
        
        logOperationMetrics(sessionLogger, 'analyze_flow', startTime);
        
        return {
          content: [
            {
              type: 'text',
              text: `**Dialogue Flow Analysis**\n\n**Current State:** ${analysis.currentState} (confidence: ${(analysis.stateConfidence * 100).toFixed(0)}%)\n\n**State Metrics:**\n- Turns in state: ${analysis.stateMetrics.turnsInState}\n- Insights generated: ${analysis.stateMetrics.insightsGenerated}\n- Variety score: ${(analysis.stateMetrics.varietyScore * 100).toFixed(0)}%\n- Effectiveness: ${(analysis.stateMetrics.effectiveness * 100).toFixed(0)}%\n\n**Progress Assessment:**\n- Overall progress: ${(analysis.progressAssessment.overallProgress * 100).toFixed(0)}%\n- Objective alignment: ${(analysis.progressAssessment.objectiveAlignment * 100).toFixed(0)}%\n- Insight quality: ${(analysis.progressAssessment.insightQuality * 100).toFixed(0)}%\n- Engagement: ${(analysis.progressAssessment.participantEngagement * 100).toFixed(0)}%\n\n**Recommendations:**\n${analysis.recommendations.map(r => `- ${r}`).join('\n')}\n\n${analysis.suggestedTransition ? `**Suggested Transition:** Move to '${analysis.suggestedTransition}' state` : ''}`,
            },
          ],
        };
      }
      
      default:
        logError(logger, new Error(`Unknown tool: ${name}`), {
          operation: 'unknown_tool',
          toolName: name,
        });
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  return server;
}

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    name: 'socratic-dialogue-mcp-server',
    version: '0.1.0',
    transport: 'streamable-http',
    sessions: sessions.size,
    transports: transports.size
  });
});

// Main MCP endpoint - handles both regular JSON-RPC and SSE upgrade
app.all('/mcp', async (req, res): Promise<void> => {
  // For SSE, accept GET requests
  if (req.method === 'GET' && req.headers.accept?.includes('text/event-stream')) {
    const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
    
    if (!sessionIdHeader || !transports.has(sessionIdHeader)) {
      res.status(400).json({ error: 'Session required for SSE' });
      return;
    }
    
    const transport = transports.get(sessionIdHeader)!;
    await transport.handleRequest(req, res);
    return;
  }
  
  // For regular requests, only accept POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  
  const sessionIdHeader = req.headers['mcp-session-id'] as string | undefined;
  
  // Get or create transport for this session
  let transport: StreamableHttpServerTransport;
  let server: Server;
  
  if (sessionIdHeader && transports.has(sessionIdHeader)) {
    transport = transports.get(sessionIdHeader)!;
    server = servers.get(sessionIdHeader)!;
  } else {
    // Create new transport and server for this session
    transport = new StreamableHttpServerTransport();
    server = createMCPServer();
    
    // Connect server to transport
    await server.connect(transport);
    
    // Store transport and server
    transports.set(transport.sessionId, transport);
    servers.set(transport.sessionId, server);
    
    // Set session ID header on response
    res.setHeader('Mcp-Session-Id', transport.sessionId);
    
    // Cleanup on transport close
    transport.onclose = () => {
      transports.delete(transport.sessionId);
      servers.delete(transport.sessionId);
      logger.info({
        operation: 'session_close',
        transportSessionId: transport.sessionId,
      }, 'MCP transport session closed');
    };
    
    logger.info({
      operation: 'session_create',
      transportSessionId: transport.sessionId,
    }, 'New MCP transport session created');
  }
  
  // Handle the request
  await transport.handleRequest(req, res);
});

// Start HTTP server
app.listen(config.server.port, config.server.host, () => {
  logger.info({
    operation: 'server_start',
    host: config.server.host,
    port: config.server.port,
    mcpEndpoint: `http://${config.server.host}:${config.server.port}/mcp`,
    healthEndpoint: `http://${config.server.host}:${config.server.port}/health`,
    requestTimeout: config.server.requestTimeout,
    maxDepth: config.session.maxDepth,
    maxTurns: config.session.maxTurns,
  }, `dialogue-mcp server started on http://${config.server.host}:${config.server.port}`);
});