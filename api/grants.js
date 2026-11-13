/**
 * Proxy Vercel -> Google Apps Script.
 * La clave EDU_API_TOKEN nunca sale de este servidor.
 * IMPORTANTE: el portal NO tiene login. Todos los visitantes de su URL
 * pueden invocar las acciones permitidas; NO publicarlo con datos sensibles.
 */
const READ = new Set(['ping','dashboard','list','detail','options','diagnostics']);
const WRITE = new Set(['saveGrant','saveOutcome','saveReview','saveStep','suggestSteps']);
const MAX_BYTES = 110_000;

function reply(data, status=200) {
  return Response.json(data, {
    status,
    headers: {
      'cache-control':'no-store, max-age=0',
      'x-content-type-options':'nosniff'
    }
  });
}

export async function GET() {
  return reply({ok:true,service:'Portal Grants Educamás',connected:Boolean(process.env.GAS_WEB_APP_URL && process.env.GAS_API_TOKEN)});
}

export async function POST(request) {
  try {
    const url=process.env.GAS_WEB_APP_URL?.trim();
    const token=process.env.GAS_API_TOKEN?.trim();
    if(!url || !token) return reply({ok:false,error:'Faltan GAS_WEB_APP_URL o GAS_API_TOKEN en el servidor.'},503);
    if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url)) {
      return reply({ok:false,error:'La URL de Apps Script debe terminar en /exec.'},503);
    }
    const raw=await request.text();
    if(Buffer.byteLength(raw,'utf8')>MAX_BYTES) return reply({ok:false,error:'Solicitud demasiado grande.'},413);
    let input;
    try { input=JSON.parse(raw); } catch { return reply({ok:false,error:'JSON inválido.'},400); }
    const action=input?.action;
    if(typeof action!=='string' || !(READ.has(action) || WRITE.has(action))) {
      return reply({ok:false,error:'Acción no autorizada.'},400);
    }
    const payload=input.payload && typeof input.payload==='object' && !Array.isArray(input.payload) ? input.payload : {};
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),26000);
    let response;
    try {
      response=await fetch(url,{
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},
        body:JSON.stringify({token,action,payload}),
        redirect:'follow',
        cache:'no-store',
        signal:controller.signal
      });
    } finally {clearTimeout(timer);}
    const rawResponse=await response.text();
    if(!response.ok) {
      return reply({ok:false,error:`Google Apps Script respondió HTTP ${response.status}. Revisa implementación y permisos.`},502);
    }
    let result;
    try {result=JSON.parse(rawResponse);} catch {
      const hint=/<html/i.test(rawResponse)?'Google devolvió HTML: revisa el acceso de la implementación.':'Respuesta no JSON.';
      return reply({ok:false,error:hint},502);
    }
    if(!result || result.ok!==true) return reply({ok:false,error:result?.error || 'Error no identificado en Apps Script.'},400);
    return reply({ok:true,data:result.data});
  } catch(err) {
    return reply({ok:false,error:err.name==='AbortError'?'Tiempo agotado al conectar con Apps Script.':`Fallo de conexión: ${err.message}`},502);
  }
}
