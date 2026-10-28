import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
await build({absWorkingDir:root,entryPoints:['game.js'],bundle:true,minify:true,format:'iife',target:['safari16','chrome100','firefox100'],loader:{'.png':'dataurl'},outfile:'game.bundle.js',legalComments:'inline'});
const [threeLicense,anatomyNotice]=await Promise.all([
  readFile(new URL('../node_modules/three/LICENSE',import.meta.url),'utf8'),
  readFile(new URL('../assets/licenses/makehuman-cc0.txt',import.meta.url),'utf8')
]);
await writeFile(new URL('../THIRD-PARTY-NOTICES.txt',import.meta.url),['THREE.JS - MIT License',threeLicense.trimEnd(),anatomyNotice.trimEnd()].join('\n\n')+'\n');
console.log('Built self-contained 3D game.bundle.js');
