const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const mcpClient = {
  async call(tool: string, args: any) {
    const res = await fetch(`${BACKEND_URL}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args })
    });
    return res.json();
  },
  async chat(message: string, projectId: string, timestamp?: number) {
    const res = await fetch(`${BACKEND_URL}/mcp/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, projectId, timestamp })
    });
    return res.json();
  },
  async getProjectState(projectId: string) {
    const res = await fetch(`${BACKEND_URL}/api/projects/${projectId}`);
    return res.json();
  },
  async getAllProjects() {
    const res = await fetch(`${BACKEND_URL}/api/projects`);
    return res.json();
  }
};