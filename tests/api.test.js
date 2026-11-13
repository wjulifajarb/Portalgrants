import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST,GET} from '../api/grants.js';

const origFetch=globalThis.fetch;
const origURL=process.env.GAS_WEB_APP_URL;
const origTOKEN=process.env.GAS_API_TOKEN;
const okUrl='https://script.google.com/macros/s/AKfycbTest123/exec';

function request(data){return new Request('http://localhost/api/grants',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});}

test('GET reporta servicio sin filtrar secretos',async()=>{
  process.env.GAS_WEB_APP_URL=okUrl;process.env.GAS_API_TOKEN='secreto-interno';
  const result=await (await GET()).text();
  assert.match(result,/Portal Grants Educamás/);
  assert.doesNotMatch(result,/secreto-interno/);
});

test('POST reenvía acción y token únicamente desde servidor',async()=>{
  process.env.GAS_WEB_APP_URL=okUrl;process.env.GAS_API_TOKEN='token-interno';
  let payload;
  globalThis.fetch=async(_url,options)=>{
    payload=JSON.parse(options.body);
    return new Response(JSON.stringify({ok:true,data:{total:124}}),{status:200});
  };
  const res=await POST(request({action:'dashboard',payload:{year:2026}}));
  const data=await res.json();
  assert.equal(payload.token,'token-interno');
  assert.equal(payload.action,'dashboard');
  assert.equal(data.data.total,124);
  assert.equal(res.headers.get('cache-control'),'no-store, max-age=0');
  globalThis.fetch=origFetch;
});

test('acciones no autorizadas se rechazan',async()=>{
  process.env.GAS_WEB_APP_URL=okUrl;process.env.GAS_API_TOKEN='token-interno';
  const res=await POST(request({action:'deleteEverything'}));
  assert.equal(res.status,400);
});

test('variables faltantes impiden conexión',async()=>{
  delete process.env.GAS_WEB_APP_URL;
  process.env.GAS_API_TOKEN='token-interno';
  const res=await POST(request({action:'list'}));
  assert.equal(res.status,503);
});

process.on('exit',()=>{
  globalThis.fetch=origFetch;
  if(origURL===undefined)delete process.env.GAS_WEB_APP_URL;else process.env.GAS_WEB_APP_URL=origURL;
  if(origTOKEN===undefined)delete process.env.GAS_API_TOKEN;else process.env.GAS_API_TOKEN=origTOKEN;
});
