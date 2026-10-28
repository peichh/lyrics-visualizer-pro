export type CloudProject = { id: string; title: string; revision: number; lyrics: Array<{id:string;text:string;time:number;endTime?:number}>; [key:string]:unknown };
export type AIProposal = {id:string;project_id:string;summary:string;status:'pending'|'approved'|'rejected';base_revision:number;changes:Array<Record<string,unknown>>};

export class StudioApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

/** Token stays in the caller's memory; it is never included in URLs or logs. */
export class StudioApi {
  private origin: string;
  constructor(origin: string, private token: string | undefined, private request: typeof fetch = fetch) {
    const url = new URL(origin);
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('Cloud API requires HTTPS');
    if (url.username || url.password || url.search || url.hash) throw new Error('Invalid API URL');
    this.origin = url.origin;
  }
  private async json<T>(path: string, method = 'GET', value?: unknown): Promise<T> {
    const response = await this.request(this.origin + path, {
      method, credentials:'include', redirect:'error', signal:AbortSignal.timeout(30000),
      headers:{...(this.token ? {Authorization:`Bearer ${this.token}`} : {}), ...(value === undefined ? {} : {'Content-Type':'application/json'})},
      body:value === undefined ? undefined : JSON.stringify(value),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new StudioApiError(body?.error || `Cloud request failed (${response.status})`, response.status);
    if (!body || typeof body !== 'object') throw new StudioApiError('Invalid cloud response',502);
    return body as T;
  }
  listProjects() { return this.json<CloudProject[]>('/api/projects'); }
  createProject(project: Omit<CloudProject,'id'>) { return this.json<CloudProject>('/api/projects','POST',project); }
  saveProject(project: CloudProject) { return this.json<CloudProject>(`/api/projects/${encodeURIComponent(project.id)}`,'PUT',project); }
  listProposals(projectId: string) { return this.json<{proposals:AIProposal[]}>(`/api/proposals?projectId=${encodeURIComponent(projectId)}`); }
  approveProposal(id: string) { return this.json<{project:CloudProject;status:'approved'}>(`/api/proposals/${encodeURIComponent(id)}/approve`,'POST'); }
  rejectProposal(id: string) { return this.json<{status:'rejected'}>(`/api/proposals/${encodeURIComponent(id)}/reject`,'POST'); }
}
