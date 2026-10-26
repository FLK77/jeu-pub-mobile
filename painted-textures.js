import * as THREE from 'three';
import {MATERIAL_ATLAS_URL} from './art-assets.js';

// Original painted maps + restrained physical surface detail. Every map remains
// local, including in the downloadable single-file edition.
const SIZE=512;
const ATLAS_CELLS={grass:[0,0],dirt:[1,0],slate:[2,0],roof:[2,0],wood:[0,1],plaster:[1,1],stone:[2,1]};
export function createPaintedTextures(renderer){
  const bases=new Map(),records=new Map();let atlas=null,ready=!MATERIAL_ATLAS_URL,failed=false;
  let resolveReady;const readyPromise=new Promise(resolve=>{resolveReady=resolve;});
  const makeCanvas=()=>{const c=document.createElement('canvas');c.width=c.height=SIZE;return c;};
  const randomFor=kind=>{let seed=17777;for(const c of kind)seed=(Math.imul(seed,31)+c.charCodeAt(0))>>>0;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};};
  function fallback(kind,canvas){
    const c=canvas.getContext('2d'),r=randomFor(kind),fill=color=>{c.fillStyle=color;c.fillRect(0,0,SIZE,SIZE);};
    function ellipse(x,y,rx,ry,color,angle=0){c.fillStyle=color;for(const ox of [-SIZE,0,SIZE])for(const oy of [-SIZE,0,SIZE]){c.beginPath();c.ellipse(x+ox,y+oy,rx,ry,angle,0,Math.PI*2);c.fill();}}
    if(kind==='grass'){
      fill('#a8b47c');for(let i=0;i<100;i++)ellipse(r()*SIZE,r()*SIZE,14+r()*70,8+r()*35,i%2?'#758b5c16':'#e1dba520');
      for(let i=0;i<1000;i++){const x=r()*SIZE,y=r()*SIZE;c.lineWidth=.7+r();c.strokeStyle=i%3?'#677d4b32':'#d5d49b4a';c.beginPath();c.moveTo(x,y+4);c.quadraticCurveTo(x+2,y-3,x-3,y-6);c.moveTo(x+1,y+4);c.quadraticCurveTo(x+4,y,x+5,y-2);c.stroke();}
    }else if(kind==='dirt'){
      fill('#c4ae89');for(let i=0;i<160;i++)ellipse(r()*SIZE,r()*SIZE,5+r()*50,2+r()*20,i%2?'#725f4510':'#f1d7a91a');
      for(let i=0;i<400;i++){const x=r()*SIZE,y=r()*SIZE,size=.7+r()*2;ellipse(x,y,size*1.5,size,'#86725736');ellipse(x-.3,y-.6,size*1.1,size*.65,'#e8d1a95a');}
    }else if(kind==='wood'){
      fill('#d9c19b');for(let i=0;i<180;i++){const x=r()*SIZE;c.strokeStyle=i%3?'#76533227':'#fff0cf49';c.lineWidth=.4+r()*1.1;c.beginPath();c.moveTo(x,-5);c.bezierCurveTo(x+18,150,x-13,370,x+4,517);c.stroke();}
      for(const[x,y]of[[115,170],[340,390]])for(let i=0;i<7;i++){c.strokeStyle='#7d5c3523';c.lineWidth=1;c.beginPath();c.ellipse(x,y,2+i*2,5+i*6,.05,0,Math.PI*2);c.stroke();}
    }else if(kind==='slate'||kind==='roof'){
      fill('#8193a4');for(let row=-1;row<9;row++)for(let col=-1;col<9;col++){
        const x=col*64+(row%2)*32,y=row*64,v=r();
        const grad=c.createLinearGradient(x,y,x+8,y+65);grad.addColorStop(0,'#526b82');grad.addColorStop(.13,v>.4?'#b5c6d0':'#9eb4c4');grad.addColorStop(.88,'#748fa4');grad.addColorStop(1,'#455e75');
        c.fillStyle=grad;c.beginPath();c.moveTo(x+2,y+2);c.lineTo(x+61,y+3);c.lineTo(x+60,y+50);c.quadraticCurveTo(x+32,y+70,x+3,y+51);c.closePath();c.fill();c.strokeStyle='#dee4dd55';c.lineWidth=1;c.beginPath();c.moveTo(x+7,y+8);c.lineTo(x+54,y+9);c.stroke();
      }
    }else if(kind==='stone'){
      fill('#a4a696');for(let row=-1;row<8;row++)for(let col=-1;col<6;col++){
        const x=col*102+(row%2)*51,y=row*75,grad=c.createLinearGradient(x,y,x+50,y+75);grad.addColorStop(0,'#e2ddc9');grad.addColorStop(.18,'#d2d0bf');grad.addColorStop(.87,'#b8bdac');grad.addColorStop(1,'#9ca797');c.fillStyle=grad;c.beginPath();c.roundRect(x+2,y+2,99,72,5+r()*3);c.fill();c.strokeStyle='#f3ead73b';c.lineWidth=1;c.stroke();
      }
      for(let i=0;i<900;i++)ellipse(r()*SIZE,r()*SIZE,.3+r()*1.4,.3+r()*.7,'#54635212');
    }else if(kind==='plaster'){
      fill('#eee8d8');for(let i=0;i<180;i++)ellipse(r()*SIZE,r()*SIZE,5+r()*35,2+r()*10,i%2?'#aa8d6210':'#fff8e616',r()*2);
      for(let i=0;i<1500;i++)ellipse(r()*SIZE,r()*SIZE,.4+r(),.3+r()*.5,i%2?'#a5937512':'#ffffff24');
    }else if(kind==='foliage'){
      fill('#e1e4d1');for(let i=0;i<200;i++){const x=r()*SIZE,y=r()*SIZE,a=r()*Math.PI;ellipse(x,y,4+r()*9,2+r()*4,i%2?'#9cac8852':'#fcf5d355',a);c.strokeStyle='#7c946229';c.lineWidth=.7;c.beginPath();c.moveTo(x-Math.cos(a)*5,y-Math.sin(a)*5);c.lineTo(x+Math.cos(a)*6,y+Math.sin(a)*6);c.stroke();}
    }else if(kind==='cloth'){
      fill('#eee9db');for(let i=0;i<SIZE;i+=3){c.strokeStyle=i%2?'#5b5b5717':'#ffffff24';c.lineWidth=.55;c.beginPath();c.moveTo(i,0);c.lineTo(i,SIZE);c.moveTo(0,i);c.lineTo(SIZE,i);c.stroke();}
      const grad=c.createLinearGradient(0,0,SIZE,0);grad.addColorStop(0,'#a9a6a40a');grad.addColorStop(.5,'#ffffff12');grad.addColorStop(1,'#a9a6a40a');c.fillStyle=grad;c.fillRect(0,0,SIZE,SIZE);
    }else if(kind==='leather'){
      fill('#e5dacc');for(let i=0;i<3000;i++)ellipse(r()*SIZE,r()*SIZE,.4+r()*1.7,.3+r(),i%3?'#6d584318':'#fff4d82d');
      for(let i=0;i<50;i++){c.strokeStyle='#76593c15';c.lineWidth=.8;c.beginPath();const x=r()*SIZE,y=r()*SIZE;c.moveTo(x,y);c.quadraticCurveTo(x+15,y+8,x+23,y-2);c.stroke();}
    }else if(kind==='skin'){
      fill('#f8f3eb');for(let i=0;i<2400;i++)ellipse(r()*SIZE,r()*SIZE,.3+r()*.6,.3+r()*.5,i%2?'#c7aa9710':'#ffffff18');
    }else if(kind==='metal'){
      fill('#ebedeb');for(let i=0;i<600;i++){c.strokeStyle=i%2?'#89948d17':'#ffffff3a';c.lineWidth=.3+r()*.6;const y=r()*SIZE;c.beginPath();c.moveTo(0,y);c.lineTo(SIZE,y+r()*2);c.stroke();}
    }else fill('#ece7da');
  }
  function drawColor(base,kind){
    if(atlas&&ATLAS_CELLS[kind]){
      const[col,row]=ATLAS_CELLS[kind],tw=atlas.naturalWidth/3,th=atlas.naturalHeight/2,c=base.color.getContext('2d');
      c.clearRect(0,0,SIZE,SIZE);c.drawImage(atlas,col*tw,row*th,tw,th,0,0,SIZE,SIZE);
      // Match opposite border pixels with a narrow feather, keeping the painted
      // centre untouched and avoiding visible tile seams on large surfaces.
      const pixels=c.getImageData(0,0,SIZE,SIZE),data=pixels.data,edge=20;
      const join=(a,b,weight)=>{for(let channel=0;channel<3;channel++){const average=(data[a+channel]+data[b+channel])*.5;data[a+channel]+=(average-data[a+channel])*weight;data[b+channel]+=(average-data[b+channel])*weight;}};
      for(let n=0;n<edge;n++){const weight=(1-n/edge)**2;for(let y=0;y<SIZE;y++)join((y*SIZE+n)*4,(y*SIZE+SIZE-1-n)*4,weight);}
      for(let n=0;n<edge;n++){const weight=(1-n/edge)**2;for(let x=0;x<SIZE;x++)join((n*SIZE+x)*4,((SIZE-1-n)*SIZE+x)*4,weight);}
      c.putImageData(pixels,0,0);
    }else fallback(kind,base.color);
    updateChannels(base,kind);
  }
  function updateChannels(base,kind){
    const color=base.color.getContext('2d').getImageData(0,0,SIZE,SIZE),height=base.bump.getContext('2d').createImageData(SIZE,SIZE),rough=base.roughness.getContext('2d').createImageData(SIZE,SIZE);
    const r=randomFor(kind+'-physical');const target=kind==='metal'?80:kind==='skin'?155:kind==='leather'?175:kind==='slate'?195:kind==='cloth'?232:238;
    for(let i=0;i<color.data.length;i+=4){const lum=color.data[i]*.2126+color.data[i+1]*.7152+color.data[i+2]*.0722;
      const bump=kind==='skin'?128+(lum-245)*.1:Math.max(50,Math.min(220,128+(lum-170)*.65));const roughness=Math.max(0,Math.min(255,target+(r()-.5)*10));
      for(let j=0;j<3;j++){height.data[i+j]=bump;rough.data[i+j]=roughness;}height.data[i+3]=rough.data[i+3]=255;
    }
    base.bump.getContext('2d').putImageData(height,0,0);base.roughness.getContext('2d').putImageData(rough,0,0);
    for(const record of records.values())if(record.kind===kind)for(const texture of Object.values(record.maps))texture.needsUpdate=true;
  }
  function baseFor(kind){if(!bases.has(kind)){const base={color:makeCanvas(),bump:makeCanvas(),roughness:makeCanvas()};bases.set(kind,base);drawColor(base,kind);}return bases.get(kind);}
  function texture(canvas,repeat,color=false){const map=new THREE.CanvasTexture(canvas);map.wrapS=map.wrapT=THREE.RepeatWrapping;map.repeat.set(repeat,repeat);if(color)map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());map.userData.painted=true;return map;}
  function recordFor(kind,repeat){const key=kind+':'+repeat;if(!records.has(key)){const base=baseFor(kind);records.set(key,{kind,maps:{color:texture(base.color,repeat,true),bump:texture(base.bump,repeat),roughness:texture(base.roughness,repeat)}});}return records.get(key);}
  if(MATERIAL_ATLAS_URL){
    const image=new Image();image.onload=()=>{atlas=image;for(const[kind,base]of bases)drawColor(base,kind);ready=true;resolveReady();};image.onerror=()=>{failed=true;ready=true;resolveReady();};image.src=MATERIAL_ATLAS_URL;
  }else resolveReady();
  return{get:(kind,repeat=1)=>recordFor(kind,repeat).maps.color,getBump:(kind,repeat=1)=>recordFor(kind,repeat).maps.bump,getRoughness:(kind,repeat=1)=>recordFor(kind,repeat).maps.roughness,get count(){return records.size;},get ready(){return ready;},get source(){return atlas?'original-painted-atlas':failed?'procedural-fallback':'procedural-painted';},colored:true,readyPromise};
}
