import assert from 'node:assert/strict';
import { StudioApi } from './studioApi.ts';
assert.throws(() => new StudioApi('http://example.com','secret'), /HTTPS/);
let recorded;
const api = new StudioApi('https://example.com','secret', async (url,options) => {
  recorded={url,options}; return new Response(JSON.stringify({error:'Project changed'}),{status:409});
});
await assert.rejects(api.approveProposal('a/b'), error => error.status === 409);
assert.equal(recorded.url,'https://example.com/api/proposals/a%2Fb/approve');
assert.equal(recorded.options.headers.Authorization,'Bearer secret');
assert.equal(recorded.options.redirect,'error');
assert.ok(!recorded.url.includes('secret'));
