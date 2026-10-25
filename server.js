import http from 'node:http';
import {readFile} from 'node:fs/promises';
const files={'/':'index.html','/game.js':'game.js','/style.css':'style.css'};
http.createServer(async(req,res)=>{const file=files[new URL(req.url,'http://localhost').pathname];if(!file){res.writeHead(404);return res.end('Introuvable');}try{const data=await readFile(new URL(file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);}catch{res.writeHead(500);res.end('Erreur');}}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
