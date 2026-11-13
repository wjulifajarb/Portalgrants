/** Servidor local SIN dependencias. Para Vercel solo se usa /api/grants.js. */
import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {GET,POST} from './api/grants.js';

const root=path.dirname(fileURLToPath(import.meta.url));
const types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
  try {
    const u=new URL(req.url,`http://localhost:${process.env.PORT||3000}`);
    if(u.pathname==='/api/grants') {
      if(!['POST','GET'].includes(req.method)) {res.writeHead(405);res.end();return;}
      let response;
      if(req.method==='GET') response=await GET();
      else {
        const chunks=[];let size=0;
        for await(const chunk of req){size+=chunk.length;if(size>110000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
        response=await POST(new Request(u.toString(),{method:'POST',headers:{'content-type':'application/json'},body:Buffer.concat(chunks)}));
      }
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const relative=u.pathname==='/'?'index.html':decodeURIComponent(u.pathname.slice(1));
    const full=path.resolve(root,relative);
    if(!full.startsWith(root+path.sep) && full!==path.join(root,'index.html')) {res.writeHead(403);res.end();return;}
    if(relative.startsWith('.')||relative.startsWith('google-apps-script/')||relative.startsWith('api/')||relative.startsWith('tests/')) {res.writeHead(404);res.end();return;}
    let file;
    try{file=await readFile(full);}catch{res.writeHead(404);res.end('No encontrado');return;}
    res.writeHead(200,{'content-type':types[path.extname(full)]||'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});
    res.end(file);
  }catch(err){res.writeHead(500);res.end('Error interno: '+err.message);}
});
const port=Number(process.env.PORT||3000);
server.listen(port,()=>console.log(`Portal Educamás listo en http://localhost:${port}`));
