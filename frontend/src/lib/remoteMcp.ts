export type RemoteMcpTool = { name: string; description?: string; inputSchema?: Record<string, unknown> };
export type RemoteMcpConnection = { protocol: '2026-07-28' | '2025-03-26'; sessionId?: string };

type RpcMessage = { jsonrpc: '2.0'; id?: number; method: string; params?: Record<string, unknown> };
type RpcReply = { result?: Record<string, unknown>; error?: { code?: number; message?: string; data?: unknown } };

async function post(endpoint: string, token: string, message: RpcMessage, connection: RemoteMcpConnection): Promise<RpcReply> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    'MCP-Protocol-Version': connection.protocol,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(connection.sessionId ? { 'Mcp-Session-Id': connection.sessionId } : {}),
  };
  if (connection.protocol === '2026-07-28') {
    headers['Mcp-Method'] = message.method;
    if (message.method === 'tools/call' && typeof message.params?.name === 'string') headers['Mcp-Name'] = message.params.name;
  }
  const params = { ...message.params };
  if (message.id !== undefined && connection.protocol === '2026-07-28') {
    params._meta = {
      'io.modelcontextprotocol/protocolVersion': connection.protocol,
      'io.modelcontextprotocol/clientInfo': { name: 'Lyrics Visualizer Pro', version: '1.0.0' },
      'io.modelcontextprotocol/clientCapabilities': {},
    };
  }
  const response = await fetch(endpoint, {
    method: 'POST', headers,
    body: JSON.stringify({ ...message, ...(Object.keys(params).length ? { params } : {}) }),
    credentials: 'omit', redirect: 'error', signal: AbortSignal.timeout(30_000),
  });
  const session = response.headers.get('Mcp-Session-Id');
  if (session) connection.sessionId = session;
  const text = await response.text();
  if (!response.ok) throw new Error(`MCP HTTP ${response.status}: ${text.slice(0, 240)}`);
  if (!text) return {};
  try { return JSON.parse(text) as RpcReply; } catch {
    const events = text.split(/\r?\n\r?\n/).map(event => event.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')).filter(Boolean);
    for (const data of events.reverse()) {
      try { return JSON.parse(data) as RpcReply; } catch { /* try the final event */ }
    }
    throw new Error('อ่านคำตอบ MCP ไม่ได้');
  }
}

function toolsFrom(reply: RpcReply): RemoteMcpTool[] {
  if (reply.error) throw new Error(reply.error.message || 'MCP tools/list ไม่สำเร็จ');
  return Array.isArray(reply.result?.tools) ? reply.result.tools as RemoteMcpTool[] : [];
}

export async function connectRemoteMcp(endpoint: string, token: string) {
  const modern: RemoteMcpConnection = { protocol: '2026-07-28' };
  try {
    const tools = toolsFrom(await post(endpoint, token, { jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }, modern));
    return { tools, connection: modern };
  } catch (error) {
    const reason = error instanceof Error ? error.message : '';
    if (!/MCP HTTP (400|404)|method not found|not initialized|unsupported protocol/i.test(reason)) throw error;
    // Older stateful Streamable HTTP servers require the 2025 initialize handshake.
    const legacy: RemoteMcpConnection = { protocol: '2025-03-26' };
    const initialized = await post(endpoint, token, {
      jsonrpc: '2.0', id: 2, method: 'initialize',
      params: { protocolVersion: legacy.protocol, capabilities: {}, clientInfo: { name: 'Lyrics Visualizer Pro', version: '1.0.0' } },
    }, legacy);
    if (initialized.error) throw new Error(initialized.error.message || (error instanceof Error ? error.message : 'MCP initialize ไม่สำเร็จ'));
    await post(endpoint, token, { jsonrpc: '2.0', method: 'notifications/initialized' }, legacy);
    const listed = await post(endpoint, token, { jsonrpc: '2.0', id: 3, method: 'tools/list', params: {} }, legacy);
    return { tools: toolsFrom(listed), connection: legacy };
  }
}

export async function callRemoteMcpTool(endpoint: string, token: string, connection: RemoteMcpConnection, name: string, args: unknown) {
  const response = await post(endpoint, token, {
    jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args },
  }, connection);
  if (response.error) throw new Error(response.error.message || 'MCP tool ทำงานไม่สำเร็จ');
  return response.result;
}
