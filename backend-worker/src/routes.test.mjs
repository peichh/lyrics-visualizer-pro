import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const {default:app}=await import(pathToFileURL(process.argv[2]).href);
let reads=0;
const accounts=new Map();
const DB={prepare(sql){let values=[];return {bind(...args){values=args;return this;},async all(){reads++;return {results:[]};},async first(){reads++;if(sql.includes('FROM users WHERE api_key_hash'))return accounts.get(values[0])||null;return null;},async run(){if(sql.startsWith('INSERT INTO users'))accounts.set(values[1],{id:values[0]});return {meta:{changes:1}};}};}};
const env={FRONTEND_URL:'https://studio.example',DB};
for(const path of ['/api/projects','/api/projects/p','/api/proposals?projectId=p','/mcp','/mcp/tools']){
  assert.equal((await app.request('https://test'+path,{},env)).status,401,path);
}
assert.equal(reads,0,'Unauthenticated requests must not touch account data');

const created=await app.request('https://test/api/account',{method:'POST'},env);
assert.equal(created.status,201);
const {apiKey}=await created.json();
env.OWNER_API_KEY_HASH=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(apiKey))),b=>b.toString(16).padStart(2,'0')).join('');
assert.match(apiKey,/^lv_[a-f0-9]{64}$/);
const headers={Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json',Accept:'application/json, text/event-stream'};
assert.equal((await app.request('https://test/api/account/me',{headers},env)).status,200);
assert.equal((await (await app.request('https://test/api/account/me',{headers},env)).json()).isOwner,true);
const regular=await app.request('https://test/api/account',{method:'POST'},env);
const {apiKey:regularKey}=await regular.json();
assert.equal((await (await app.request('https://test/api/account/me',{headers:{Authorization:`Bearer ${regularKey}`}},env)).json()).isOwner,false);
assert.equal((await app.request('https://test/mcp',{method:'POST',headers:{Authorization:`Bearer ${regularKey}`,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:9,method:'initialize',params:{protocolVersion:'2025-03-26'}})},env)).status,403);
assert.equal((await app.request('https://test/api/proposals?projectId=p',{headers:{Authorization:`Bearer ${regularKey}`}},env)).status,403);
const modernMeta={'io.modelcontextprotocol/protocolVersion':'2026-07-28','io.modelcontextprotocol/clientInfo':{name:'test',version:'1'},'io.modelcontextprotocol/clientCapabilities':{}};
const modern=await app.request('https://test/mcp',{method:'POST',headers:{...headers,'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/list',Origin:'https://studio.example'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list',params:{_meta:modernMeta}})},env);
assert.equal(modern.status,200);
assert.equal((await modern.json()).result.tools.length,3);
const call=await app.request('https://test/mcp',{method:'POST',headers:{...headers,'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/call','Mcp-Name':'list_projects'},body:JSON.stringify({jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'list_projects',arguments:{},_meta:modernMeta}})},env);
assert.equal(call.status,200);
assert.equal((await call.json()).result.content[0].text,'[]');
const mismatch=await app.request('https://test/mcp',{method:'POST',headers:{...headers,'MCP-Protocol-Version':'2026-07-28','Mcp-Method':'tools/list'},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/list',params:{}})},env);
assert.equal(mismatch.status,400);
const legacy=await app.request('https://test/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:4,method:'initialize',params:{protocolVersion:'2025-03-26'}})},env);
assert.equal(legacy.status,200);
assert.equal((await legacy.json()).result.protocolVersion,'2025-03-26');
const evil=await app.request('https://test/mcp',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:JSON.stringify({jsonrpc:'2.0',id:5,method:'initialize',params:{protocolVersion:'2025-03-26'}})},env);
assert.equal(evil.status,403);
assert.equal((await app.request('https://test/mcp',{headers},env)).status,405);
console.log('Per-account auth and current/legacy MCP transports passed');
