/** Stateless JSON response mode of MCP Streamable HTTP, protocol 2025-03-26. */
export const mcpTools = [
  {name:'list_projects',description:'List saved projects and revisions.',inputSchema:{type:'object',properties:{},additionalProperties:false}},
  {name:'get_project',description:'Read a project before proposing edits.',inputSchema:{type:'object',properties:{projectId:{type:'string'}},required:['projectId'],additionalProperties:false}},
  {name:'propose_lyric_changes',description:'Submit proposed edits. The owner must approve in the studio before anything changes.',inputSchema:{type:'object',properties:{projectId:{type:'string'},baseRevision:{type:'integer',minimum:0},summary:{type:'string'},changes:{type:'array',minItems:1,maxItems:200,items:{type:'object',properties:{cueId:{type:'string'},text:{type:'string'},time:{type:'number',minimum:0},endTime:{type:'number',minimum:0},x:{type:'number',minimum:0,maximum:100},y:{type:'number',minimum:0,maximum:100},preset:{type:'string'}},required:['cueId'],additionalProperties:false}}},required:['projectId','baseRevision','summary','changes'],additionalProperties:false}},
];
export async function rpcMessage(message:unknown,call:(name:string,args:Record<string,unknown>)=>Promise<unknown>) {
  const m=message as Record<string,any>;
  if (!m || typeof m!=='object' || m.jsonrpc!=='2.0' || typeof m.method!=='string') return {jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid request'}};
  const id=m.id;
  if (id===undefined) return null;
  const result=(value:unknown)=>({jsonrpc:'2.0',id,result:value});
  if (m.method==='initialize') return result({protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'lyrics-studio',version:'0.1.0'},instructions:'Edits are proposals only. The owner must explicitly approve every proposal in the studio.'});
  if (m.method==='ping') return result({});
  if (m.method==='tools/list') return result({tools:mcpTools});
  if (m.method==='tools/call') {
    if (!m.params || !mcpTools.some(t=>t.name===m.params.name)) return {jsonrpc:'2.0',id,error:{code:-32602,message:'Unknown tool'}};
    try {return result({content:[{type:'text',text:JSON.stringify(await call(m.params.name,m.params.arguments||{}))}]});}
    catch(error) {return result({isError:true,content:[{type:'text',text:error instanceof Error?error.message:'Tool failed'}]});}
  }
  return {jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}};
}
