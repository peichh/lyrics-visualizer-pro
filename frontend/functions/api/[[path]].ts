interface Env {
  STUDIO_OWNER_TOKEN: string;
  CF_ACCESS_TEAM: string;
  CF_ACCESS_AUD: string;
  STUDIO_OWNER_EMAIL: string;
}

const encoder = new TextEncoder();
function decodeBase64Url(value: string): Uint8Array {
  const normalized=value.replace(/-/g,'+').replace(/_/g,'/');
  const binary=atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'='));
  return Uint8Array.from(binary,char=>char.charCodeAt(0));
}
async function verifyAccessJwt(token: string, env: Env): Promise<boolean> {
  try {
    const [headerPart,payloadPart,signaturePart]=token.split('.');
    if(!headerPart||!payloadPart||!signaturePart)return false;
    const header=JSON.parse(new TextDecoder().decode(decodeBase64Url(headerPart)));
    const payload=JSON.parse(new TextDecoder().decode(decodeBase64Url(payloadPart)));
    const now=Math.floor(Date.now()/1000);
    const team=env.CF_ACCESS_TEAM.replace(/\/$/,'');
    if(header.alg!=='RS256'||payload.iss!==`${team}`||!Array.isArray(payload.aud)||!payload.aud.includes(env.CF_ACCESS_AUD)||payload.email?.toLowerCase()!==env.STUDIO_OWNER_EMAIL.toLowerCase()||payload.exp<=now||payload.nbf>now+60)return false;
    const response=await fetch(`${team}/cdn-cgi/access/certs`,{cf:{cacheTtl:300,cacheEverything:true}} as RequestInit);
    if(!response.ok)return false;
    const keys=await response.json() as {keys:Array<JsonWebKey & {kid:string}>};
    const jwk=keys.keys.find(key=>key.kid===header.kid);
    if(!jwk)return false;
    const publicKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    return crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,decodeBase64Url(signaturePart),encoder.encode(`${headerPart}.${payloadPart}`));
  } catch { return false; }
}

export const onRequest: PagesFunction<Env> = async ({request,env}) => {
  const assertion=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!assertion||!await verifyAccessJwt(assertion,env))return Response.json({error:'Cloudflare Access authentication required'},{status:401});
  const url=new URL(request.url);
  const target=new URL(url.pathname.replace(/^\/api\//,'/api/'), 'https://lyrics-studio-preview-api.peich.workers.dev');
  target.search=url.search;
  const headers=new Headers(request.headers);
  headers.delete('cookie');
  headers.set('Authorization',`Bearer ${env.STUDIO_OWNER_TOKEN}`);
  return fetch(new Request(target,request));
};
