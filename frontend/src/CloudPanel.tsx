import React, {useState} from 'react';
import {RemoteMcpPanel} from './RemoteMcpPanel';

const DEFAULT_API_URL = import.meta.env.VITE_STUDIO_API_URL || import.meta.env.VITE_BACKEND_URL || 'https://lyrics-studio-multitenant-preview.peich.workers.dev';
import {StudioApi, type CloudProject, type AIProposal} from './lib/studioApi';

type Props = {snapshot:()=>Omit<CloudProject,'id'>; restore:(project:CloudProject)=>void};
export function CloudPanel({snapshot,restore}:Props) {
  const [origin,setOrigin]=useState(DEFAULT_API_URL);
  const [token,setToken]=useState(typeof localStorage!=='undefined'?localStorage.getItem('lyrics-studio-account-key')||'':'');
  const [client,setClient]=useState<StudioApi|null>(null);
  const [projects,setProjects]=useState<CloudProject[]>([]);
  const [isOwner,setIsOwner]=useState(false);
  const [active,setActive]=useState<CloudProject|null>(null);
  const [proposals,setProposals]=useState<AIProposal[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('เชื่อม API เพื่อบันทึกงานบนคลาวด์');
  const [newKey,setNewKey]=useState('');
  async function run(action:()=>Promise<void>) {
    setBusy(true);
    try {await action();} catch(error) {setMessage(error instanceof Error?error.message:'เชื่อมต่อไม่สำเร็จ');}
    finally {setBusy(false);}
  }
  async function refresh(api:StudioApi,project:CloudProject) {
    setProposals((await api.listProposals(project.id)).proposals);
  }
  const draft=snapshot();
  const hasUnsavedChanges=!!active && ['lyrics','ts','aspect','bgFade','seqMode','loopPreview'].some(key=>JSON.stringify(draft[key])!==JSON.stringify(active[key]));
  const button='border border-[var(--border)] px-3 py-2 text-xs disabled:opacity-40';
  return <section className="space-y-4" aria-label="Cloud storage">
    <h2 className="mono text-sm">CLOUD STORAGE</h2>
    <p className="text-xs">บันทึกและเปิดงานบนคลาวด์ได้จากที่นี่</p>
    {!client?<><form className="space-y-3" onSubmit={e=>{e.preventDefault();void run(async()=>{
      const api=new StudioApi(origin,token || undefined);setProjects(await api.listProjects());const role=await api.accountInfo();setIsOwner(role.isOwner);setClient(api);if(token)localStorage.setItem('lyrics-studio-account-key',token);setMessage('เชื่อมต่อแล้ว เลือกงานหรือบันทึกเป็นงานใหม่');
    });}}>
      <label className="block text-xs">API URL<input required type="url" value={origin} onChange={e=>setOrigin(e.target.value)} placeholder="https://your-api.workers.dev" className="mt-1 w-full border p-2" readOnly={!!import.meta.env.VITE_STUDIO_API_URL}/></label>
      <label className="block text-xs">Cloud storage key ส่วนตัวของคุณ (ถ้ามี)<input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)} className="mt-1 w-full border p-2"/></label>
      <p className="text-xs text-[var(--muted)]">ไม่ต้องใช้คีย์กลางของเจ้าของเว็บ สร้างบัญชีส่วนตัวเพื่อบันทึกงานบนคลาวด์</p>
      <button disabled={busy} className={button}>เชื่อมต่อ</button>
    </form><button disabled={busy} className={button} onClick={()=>void run(async()=>{
      const account=await StudioApi.createAccount(origin);setNewKey(account.apiKey);setToken(account.apiKey);localStorage.setItem('lyrics-studio-account-key',account.apiKey);
      const api=new StudioApi(origin,account.apiKey);setProjects(await api.listProjects());const role=await api.accountInfo();setIsOwner(role.isOwner);setClient(api);setMessage('สร้างบัญชีแล้ว คัดลอก API key ไปเก็บก่อนออกจากหน้านี้');
    })}>สร้างบัญชีใหม่</button></>:<>
      {newKey && <article className="space-y-2 border border-[var(--border)] p-3"><strong className="text-xs">Cloud storage key ส่วนตัว</strong><p className="text-xs">คีย์นี้ใช้เฉพาะกับบัญชีคลาวด์ของคุณ ไม่ใช่คีย์กลาง และไม่ใช่ข้อมูลเชื่อม MCP ภายนอก</p><code className="block break-all text-xs">{newKey}</code><button className={button} onClick={()=>void navigator.clipboard.writeText(newKey)}>คัดลอก API key</button></article>}
      <button disabled={busy} className={button} onClick={()=>void run(async()=>{
        const current=snapshot();
        const saved=active?await client.saveProject({...current,id:active.id,revision:active.revision} as CloudProject):await client.createProject(current);
        setActive(saved);setProjects(await client.listProjects());await refresh(client,saved);setMessage('บันทึกเนื้อเพลงและการตั้งค่าบนคลาวด์แล้ว ไฟล์สื่อยังต้องเลือกในเครื่อง');
      })}>{active?'บันทึกงานนี้บนคลาวด์':'บันทึกเป็นงานใหม่บนคลาวด์'}</button>
      <label className="block text-xs">เปิดงาน<select disabled={busy} value={active?.id||''} className="mt-1 w-full border p-2" onChange={e=>{
        const project=projects.find(p=>p.id===e.target.value);if(!project)return;
        void run(async()=>{restore(project);setActive(project);await refresh(client,project);setMessage('เปิดงานแล้ว');});
      }}><option value="">เลือกงาน</option>{projects.map(p=><option key={p.id} value={p.id}>{p.title} · r{p.revision}</option>)}</select></label>
      {isOwner && <>
      <div className="space-y-3 border-t border-[var(--border)] pt-3"><h3 className="mono text-xs">OWNER AI / MCP</h3><p className="text-xs text-[var(--muted)]">MCP สำหรับเจ้าของเว็บ · endpoint: <code>{new URL('/mcp',origin).href}</code></p><RemoteMcpPanel /></div>
      <button disabled={busy||!active} className={button} onClick={()=>void run(async()=>{await refresh(client,active!);setMessage('อัปเดตข้อเสนอแล้ว');})}>ตรวจข้อเสนอ AI</button>
      {hasUnsavedChanges && <p role="alert" className="text-xs">มีการแก้ไขที่ยังไม่บันทึก กรุณาบันทึกก่อนยืนยันข้อเสนอ AI เพื่อไม่ให้งานหาย</p>}
      {proposals.filter(p=>p.status==='pending').map(proposal=><article key={proposal.id} className="space-y-2 border p-3">
        <h3 className="text-sm font-bold">{proposal.summary}</h3>
        <p className="text-xs">อ้างอิงงานรุ่น {proposal.base_revision} · {proposal.changes.length} รายการ</p>
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(proposal.changes,null,2)}</pre>
        <div className="flex gap-2"><button disabled={busy||hasUnsavedChanges} className={button} onClick={()=>void run(async()=>{
          const result=await client.approveProposal(proposal.id);restore(result.project);setActive(result.project);setProjects(await client.listProjects());await refresh(client,result.project);setMessage('ยืนยันและใช้การแก้ไขแล้ว');
        })}>ยืนยันและใช้</button><button disabled={busy} className={button} onClick={()=>void run(async()=>{await client.rejectProposal(proposal.id);await refresh(client,active!);setMessage('ปฏิเสธข้อเสนอแล้ว');})}>ปฏิเสธ</button></div>
      </article>)}
      </>}
      <button disabled={busy} className={button} onClick={()=>{setClient(null);setActive(null);setProposals([]);setProjects([]);setIsOwner(false);setMessage('ตัดการเชื่อมต่อแล้ว');}}>ตัดการเชื่อมต่อ</button>
    </>}
    <p role="status" className="text-xs">{busy?'กำลังดำเนินการ…':message}</p>
  </section>;
}
