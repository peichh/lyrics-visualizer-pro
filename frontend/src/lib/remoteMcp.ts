export type RemoteMcpTool = { name: string; description?: string; inputSchema?: Record<string, unknown> };

type RpcResult = { result?: Record<string, unknown>; error?: { message?: string } };

async function post(endpoint: string, token: string, body: unknown): Promise<RpcResult> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`MCP ตอบกลับ ${response.status}: ${text.slice(0, 240)}`);
  if (!text) return {};
  try { return JSON.parse(text) as RpcResult; } catch {
    const data = text.split(/\r?\n/).filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).find(Boolean);
    if (data) return JSON.parse(data) as RpcResult;
    throw new Error('อ่านคำตอบ MCP ไม่ได้');
  }
}

export async function connectRemoteMcp(endpoint: string, token: string) {
  const initialized = await post(endpoint, token, {
    jsonrpc: '2.0', id: 1, method: 'initialize',
    params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'Lyrics Visualizer Pro', version: '1.0.0' } },
  });
  if (initialized.error) throw new Error(initialized.error.message || 'MCP initialize ไม่สำเร็จ');
  await post(endpoint, token, { jsonrpc: '2.0', method: 'notifications/initialized' });
  const listed = await post(endpoint, token, { jsonrpc: '2.0', id: 2, method: 'tools/list' });
  if (listed.error) throw new Error(listed.error.message || 'อ่านรายการ MCP tools ไม่สำเร็จ');
  const tools = listed.result?.tools;
  return Array.isArray(tools) ? tools as RemoteMcpTool[] : [];
}

export async function callRemoteMcpTool(endpoint: string, token: string, name: string, args: unknown) {
  const response = await post(endpoint, token, {
    jsonrpc: '2.0', id: Date.now(), method: 'tools/call', params: { name, arguments: args },
  });
  if (response.error) throw new Error(response.error.message || 'MCP tool ทำงานไม่สำเร็จ');
  return response.result;
}
