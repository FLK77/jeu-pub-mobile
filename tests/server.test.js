import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout} from 'node:timers/promises';
test('le serveur fournit le jeu et rejette les routes inconnues',async()=>{const child=spawn(process.execPath,['server.js'],{env:{...process.env,PORT:'3101'}});try{let response;for(let i=0;i<40;i++){try{response=await fetch('http://127.0.0.1:3101/');break;}catch{await setTimeout(50);}}assert.equal(response.status,200);assert.match(await response.text(),/id="game"/);for(const path of ['game.js','style.css']){const r=await fetch('http://127.0.0.1:3101/'+path);assert.equal(r.status,200);assert.ok((await r.text()).length>100);}assert.equal((await fetch('http://127.0.0.1:3101/missing')).status,404);}finally{child.kill();}});
