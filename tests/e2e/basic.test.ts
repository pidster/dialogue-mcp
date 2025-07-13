/**
 * Basic E2E test to verify server functionality
 */

import axios from 'axios';

describe('Basic Server Test', () => {
  const baseURL = 'http://localhost:3000';
  
  beforeAll(async () => {
    // Wait a moment for any existing server to be ready
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it('should respond to health check', async () => {
    const response = await axios.get(`${baseURL}/health`);
    
    expect(response.status).toBe(200);
    expect(response.data).toMatchObject({
      status: 'ok',
      name: 'socratic-dialogue-mcp-server',
      version: '0.1.0',
      transport: 'streamable-http',
    });
  });

  it('should handle MCP initialization', async () => {
    const response = await axios.post(`${baseURL}/mcp`, {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: {
          name: 'test-client',
          version: '1.0.0',
        },
        capabilities: {},
      },
      id: 1,
    });

    expect(response.status).toBe(200);
    expect(response.data.jsonrpc).toBe('2.0');
    expect(response.data.id).toBe(1);
    expect(response.data.result).toBeDefined();
    expect(response.headers['mcp-session-id']).toBeDefined();
  });

  it('should start dialogue session', async () => {
    // First initialize
    const initResponse = await axios.post(`${baseURL}/mcp`, {
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        clientInfo: { name: 'test', version: '1.0' },
        capabilities: {},
      },
      id: 'init',
    });

    const sessionId = initResponse.headers['mcp-session-id'];

    // Then call tool
    const response = await axios.post(`${baseURL}/mcp`, {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'start_dialogue',
        arguments: {
          title: 'Test',
          focus: 'testing',
        },
      },
      id: 'start',
    }, {
      headers: {
        'Mcp-Session-Id': sessionId,
      },
    });

    expect(response.status).toBe(200);
    expect(response.data.result).toBeDefined();
    expect(response.data.result.content[0].text).toContain('Started new Socratic dialogue session');
  });
});