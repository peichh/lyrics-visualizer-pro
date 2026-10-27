
export const mcpClient = {
  async call(tool: string, args: any) {
    const res = await fetch('http://localhost:4000/mcp/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args })
    });
    return res.json();
  },
  async chat(message: string, projectId: string, timestamp?: number) {
    const res = await fetch('http://localhost:4000/mcp/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, projectId, timestamp })
    });
    return res.json();
  },
  async getProjectState(projectId: string) {
    const res = await fetch(`http://localhost:4000/api/projects/${projectId}`);
    return res.json();
  }
};
