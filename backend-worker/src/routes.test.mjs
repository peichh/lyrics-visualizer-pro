import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const {default:app}=await import(pathToFileURL(process.argv[2]).href);
let reads=0;
const env={OWNER_TOKEN:'owner-test',AI_TOKEN:'ai-test',FRONTEND_URL:'https://studio.example',DB:{prepare(){reads++;return {bind(){return this},async all(){return {results:[]}},async first(){return null}}}}};
for(const path of ['/api/projects','/api/projects/p','/api/proposals?projectId=p','/mcp','/mcp/tools']){
  assert.equal((await app.request('https://test'+path,{},env)).status,401,path);
}
assert.equal(reads,0,'Unauthorized requests must not touch data');
assert.equal((await app.request('https://test/api/projects',{headers:{Authorization:'Bearer ai-test'}},env)).status,401);
assert.equal((await app.request('https://test/api/proposals/p/approve',{method:'POST',headers:{Authorization:'Bearer ai-test'}},env)).status,401);
assert.equal((await app.request('https://test/api/projects',{headers:{Authorization:'Bearer owner-test'}},env)).status,200);
const headers={Authorization:'Bearer ai-test','Content-Type':'application/json',Accept:'application/json, text/event-stream'};
const init=await app.request('https://test/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26'}})},env);
assert.equal(init.status,200);assert.equal((await init.json()).result.serverInfo.name,'lyrics-studio');
assert.equal((await app.request('https://test/mcp',{method:'POST',headers:{...headers,Origin:'https://evil.example'},body:'{}'},env)).status,403);
assert.equal((await app.request('https://test/mcp',{headers},env)).status,405);
assert.equal((await app.request('https://test/mcp',{method:'POST',headers,body:JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})},env)).status,202);
assert.equal((await app.request('https://test/api/proposals',{method:'POST',headers:{...headers,Authorization:'Bearer owner-test'},body:'{}'},env)).status,401);
console.log('API authorization and MCP transport passed');
