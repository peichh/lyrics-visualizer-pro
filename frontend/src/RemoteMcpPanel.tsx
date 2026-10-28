import React, {useState} from 'react';
import {callRemoteMcpTool, connectRemoteMcp, type RemoteMcpTool} from './lib/remoteMcp';

const button = 'border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-40';
const SAVED_URL = 'lyrics-studio:remote-mcp-url';

export function RemoteMcpPanel() {
  const [endpoint, setEndpoint] = useState(localStorage.getItem(SAVED_URL) || '');
  const [token, setToken] = useState(sessionStorage.getItem('lyrics-studio:remote-mcp-token') || '');
  const [tools, setTools] = useState<RemoteMcpTool[]>([]);
  const [toolName, setToolName] = useState('');
  const [args, setArgs] = useState('{}');
  const [result, setResult] = useState('');
  const [message, setMessage] = useState('เชื่อม MCP server ของคุณเองได้');
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'เชื่อมต่อ MCP ไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  return <article className="space-y-3 border border-[var(--border)] p-3" aria-label="Connect your own MCP server">
    <div><strong className="text-xs">MCP ของคุณ</strong><p className="mt-1 text-xs text-[var(--muted)]">ใส่ URL MCP server และ Bearer token ของคุณเอง ถ้า server ต้องใช้ การเชื่อมต่อเก็บไว้ในเบราว์เซอร์นี้</p></div>
    <label className="block text-xs">MCP URL<input type="url" value={endpoint} onChange={e=>setEndpoint(e.target.value)} placeholder="https://your-mcp.example.com/mcp" className="mt-1 w-full border p-2" /></label>
    <label className="block text-xs">Bearer token (ถ้ามี)<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} placeholder="เก็บไว้ใน session ของเบราว์เซอร์นี้" className="mt-1 w-full border p-2" /></label>
    <div className="flex flex-wrap gap-2">
      <button className={button} disabled={busy || !endpoint} onClick={()=>void run(async()=>{
        const url = new URL(endpoint);
        if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('MCP URL ต้องเป็น HTTPS');
        const found = await connectRemoteMcp(endpoint, token);
        setTools(found); setToolName(found[0]?.name || ''); setResult('');
        localStorage.setItem(SAVED_URL, endpoint);
        if (token) sessionStorage.setItem('lyrics-studio:remote-mcp-token', token); else sessionStorage.removeItem('lyrics-studio:remote-mcp-token');
        setMessage(`เชื่อมต่อแล้ว · พบ ${found.length} tools`);
      })}>เชื่อมและอ่าน tools</button>
      <button className={button} disabled={busy} onClick={()=>{setTools([]);setResult('');sessionStorage.removeItem('lyrics-studio:remote-mcp-token');setToken('');setMessage('ล้าง token และตัดการเชื่อมต่อแล้ว');}}>ตัดการเชื่อมต่อ</button>
    </div>
    {tools.length>0 && <div className="space-y-2 border-t border-[var(--border)] pt-3">
      <label className="block text-xs">เลือก MCP tool<select value={toolName} onChange={e=>setToolName(e.target.value)} className="mt-1 w-full border p-2">{tools.map(tool=><option key={tool.name} value={tool.name}>{tool.name}</option>)}</select></label>
      {tools.find(tool=>tool.name===toolName)?.description && <p className="text-xs text-[var(--muted)]">{tools.find(tool=>tool.name===toolName)?.description}</p>}
      <label className="block text-xs">Arguments (JSON)<textarea value={args} onChange={e=>setArgs(e.target.value)} rows={4} spellCheck={false} className="mt-1 w-full border p-2 font-mono" /></label>
      <button className={button} disabled={busy||!toolName} onClick={()=>void run(async()=>{const data=await callRemoteMcpTool(endpoint,token,toolName,JSON.parse(args));setResult(JSON.stringify(data,null,2));setMessage(`เรียก ${toolName} สำเร็จ`);})}>เรียก tool</button>
      {result && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words border border-[var(--border)] p-2 text-xs">{result}</pre>}
    </div>}
    <p role="status" className="text-xs">{busy?'กำลังเชื่อมต่อ…':message}</p>
    <p className="text-xs text-[var(--muted)]">MCP server ต้องอนุญาต browser CORS จากเว็บนี้ การเชื่อมต่อกับ localhost ใช้ได้เฉพาะเมื่อ MCP ทำงานบนเครื่องเดียวกัน</p>
  </article>;
}
