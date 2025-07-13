/**
 * Custom Streamable HTTP transport implementation for MCP
 * Based on the MCP specification for Streamable HTTP transport
 */

import { Request, Response } from 'express';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import logger, { logError } from './utils/logger.js';
import { config } from './config/config.js';
import { EventEmitter } from 'events';

export class StreamableHttpServerTransport implements Transport {
  private eventEmitter = new EventEmitter();
  private _sessionId: string;
  private sseResponse?: Response;
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  constructor(sessionId?: string) {
    this._sessionId = sessionId || this.generateSessionId();
  }

  /**
   * Start the transport (required by Transport interface)
   */
  async start(): Promise<void> {
    // For Streamable HTTP, start is a no-op as connection is established per request
    return Promise.resolve();
  }

  /**
   * Handle incoming HTTP request (supports both JSON and SSE upgrade)
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    const acceptHeader = req.headers.accept || '';
    const wantsSSE = acceptHeader.includes('text/event-stream');
    
    // For Streamable HTTP, we need to handle JSON-RPC requests first
    // SSE is only for streaming responses, not for initial communication
    // Only switch to SSE if this is a GET request specifically asking for SSE
    if (req.method === 'GET' && wantsSSE) {
      this.setupSSE(res);
      return;
    }

    // Otherwise, handle as regular JSON-RPC request
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    try {
      const message = req.body as JSONRPCMessage;
      
      // Validate basic JSON-RPC structure
      if (!message || typeof message !== 'object' || !('jsonrpc' in message)) {
        res.json({
          jsonrpc: '2.0',
          error: {
            code: -32600,
            message: 'Invalid Request',
          }
        });
        return;
      }
      
      // Process the message
      if (this.onmessage) {
        this.onmessage(message);
      }

      // For regular JSON requests, we'll wait for the response
      // The protocol handler will call send() with the response
      if ('id' in message && message.id !== undefined) {
        this.eventEmitter.once(`response-${message.id}`, (response: JSONRPCMessage) => {
          res.json(response);
        });
        
        // Set a timeout for the response
        setTimeout(() => {
          if (!res.headersSent) {
            res.status(504).json({ error: 'Response timeout' });
          }
        }, config.server.requestTimeout);
      } else {
        // This is a notification (no id), acknowledge receipt immediately
        res.status(200).json({ status: 'ok' });
      }
    } catch (error) {
      logError(logger, error, {
        operation: 'handle_request',
        sessionId: this.sessionId,
      });
      res.status(400).json({ error: 'Invalid request' });
    }
  }

  /**
   * Set up SSE connection
   */
  private setupSSE(res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    
    // Don't send session ID as SSE event - it's already in the header
    this.sseResponse = res;

    // Handle client disconnect
    res.on('close', () => {
      this.closed = true;
      if (this.onclose) {
        this.onclose();
      }
    });
  }

  /**
   * Send a message to the client
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error('Transport is closed');
    }

    // If we have an SSE connection, send via SSE
    if (this.sseResponse && !this.sseResponse.headersSent) {
      const data = JSON.stringify(message);
      this.sseResponse.write(`data: ${data}\n\n`);
    } else if ('id' in message && message.id !== undefined) {
      // Otherwise, emit the response for the waiting handler
      this.eventEmitter.emit(`response-${message.id}`, message);
    }
  }

  /**
   * Close the transport
   */
  async close(): Promise<void> {
    this.closed = true;
    
    if (this.sseResponse) {
      this.sseResponse.end();
    }
    
    if (this.onclose) {
      this.onclose();
    }
  }

  /**
   * Get the session ID
   */
  get sessionId(): string {
    return this._sessionId;
  }

  /**
   * Generate a secure session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }
}