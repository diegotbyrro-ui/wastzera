import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('..',import.meta.url));
const html=new Set(['/PREVIA.html','/PREVIA_ADMIN.html','/PREVIA_PARTICIPANTES.html']);
const types={'.html':'text/html; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.mp3':'audio/mpeg'};
createServer(async(req,res)=>{try{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return}
 const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
 if(pathname==='/'){res.writeHead(302,{Location:'/PREVIA_ADMIN.html'});res.end();return}
 const ext=extname(pathname).toLowerCase();
 if(!html.has(pathname)&&!(pathname.startsWith('/public/')&&ext in types&&ext!=='.html')){res.writeHead(404);res.end('Arquivo indisponível.');return}
 const target=resolve(root,'.'+pathname);if(!target.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return}
 const info=await stat(target);if(!info.isFile())throw new Error('Not a file');
 const headers={'Content-Type':types[ext]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store','Accept-Ranges':'bytes'};
 let start=0,end=info.size-1,status=200;
 if(req.headers.range){const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
  if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
  if(!match[1])start=Math.max(0,info.size-Number(match[2]));else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]))}
  if(start>end||start>=info.size||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)){res.writeHead(416,{'Content-Range':`bytes */${info.size}`});res.end();return}
  status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
 }
 headers['Content-Length']=end-start+1;res.writeHead(status,headers);
 if(req.method==='HEAD'){res.end();return}
 createReadStream(target,{start,end}).on('error',()=>res.destroy()).pipe(res);
}catch{res.writeHead(404);res.end('Arquivo não encontrado.')}}).on('error',error=>{console.error('Não foi possível abrir a prévia:',error.message);process.exitCode=1}).listen(4173,'127.0.0.1',()=>console.log('Prévia: http://127.0.0.1:4173/PREVIA_ADMIN.html\nUse Ctrl+C para encerrar.'));
