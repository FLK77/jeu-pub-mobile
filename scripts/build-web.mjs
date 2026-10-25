import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['game.js'],bundle:true,minify:true,format:'iife',target:['safari16','chrome100','firefox100'],outfile:'game.bundle.js',legalComments:'inline'});
const license=await readFile(new URL('../node_modules/three/LICENSE',import.meta.url),'utf8');
await writeFile(new URL('../THIRD-PARTY-NOTICES.txt',import.meta.url),'THREE.JS - MIT License\n\n'+license);
console.log('Built self-contained 3D game.bundle.js');
