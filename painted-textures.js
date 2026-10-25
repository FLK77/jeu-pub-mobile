import * as THREE from 'three';

// Small, deterministic painted maps. Generated locally, including in the offline ZIP.
export function createPaintedTextures(renderer) {
  const maps = new Map();
  let seed = 240577;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  function paint(kind) {
    const canvas = document.createElement('canvas');canvas.width = canvas.height = 256;
    const c = canvas.getContext('2d');
    const fill = color => { c.fillStyle = color;c.fillRect(0,0,256,256); };
    function dab(x,y,rx,ry,color) {
      c.fillStyle=color;
      // Wrap edge brush strokes for seamless ground tiling.
      for(const ox of [-256,0,256])for(const oy of [-256,0,256]){
        c.beginPath();c.ellipse(x+ox,y+oy,rx,ry,0,0,Math.PI*2);c.fill();
      }
    }
    if(kind==='grass') {
      fill('#e1edc4');
      for(let i=0;i<150;i++)dab(random()*256,random()*256,8+random()*26,4+random()*16,i%2?'#c4d6a535':'#f4f7d553');
      for(let i=0;i<500;i++){
        const x=random()*256,y=random()*256;
        c.strokeStyle=i%3?'#a3bd7f55':'#ffffdf9a';c.lineWidth=1+random();
        c.beginPath();c.moveTo(x-2,y+2);c.quadraticCurveTo(x-1,y-1,x-3,y-3);c.moveTo(x,y+2);c.lineTo(x+2,y-2);c.stroke();
      }
    } else if(kind==='dirt') {
      fill('#eee0ba');
      for(let i=0;i<70;i++)dab(random()*256,random()*256,4+random()*20,2+random()*10,i%2?'#ae8d621c':'#fff1cd40');
      for(let i=0;i<450;i++){
        const x=random()*256,y=random()*256,r=.5+random()*2;
        dab(x,y,r*1.5,r,'#97784c2b');dab(x-.5,y-.7,r,r*.5,'#fff4d470');
      }
    } else if(kind==='wood') {
      fill('#e8c995');
      for(let i=0;i<12;i++){
        const x=i*23;const grad=c.createLinearGradient(x,0,x+23,0);
        grad.addColorStop(0,'#6a422c55');grad.addColorStop(.12,'#fff0c26b');grad.addColorStop(1,'#a16f4140');c.fillStyle=grad;c.fillRect(x,0,23,256);
      }
      for(let i=0;i<75;i++){
        const x=random()*256;c.strokeStyle=i%2?'#91644148':'#fff0c25f';c.lineWidth=.6+random();
        c.beginPath();c.moveTo(x,-4);c.bezierCurveTo(x-8,70,x+10,170,x,260);c.stroke();
      }
      for(const [x,y]of[[57,80],[168,186]]){
        c.strokeStyle='#80533166';c.lineWidth=2;
        for(let r=3;r<12;r+=3){c.beginPath();c.ellipse(x,y,r/2,r*1.7,0,0,7);c.stroke();}
      }
    } else if(kind==='roof') {
      fill('#f5cc9a');
      const size=64;
      for(let row=0;row<4;row++)for(let col=-1;col<5;col++){
        const x=col*size+(row%2)*32,y=row*size;
        const grad=c.createLinearGradient(0,y,0,y+size);
        grad.addColorStop(0,'#c4835b');grad.addColorStop(.2,'#ffe5bb');grad.addColorStop(.8,'#e8bc8d');grad.addColorStop(1,'#a36a48');
        c.fillStyle=grad;c.fillRect(x+2,y+2,60,60);
        c.strokeStyle='#fff1ca';c.lineWidth=2;c.beginPath();c.moveTo(x+6,y+9);c.lineTo(x+56,y+9);c.stroke();
        c.strokeStyle='#a66c484d';c.lineWidth=1;
        for(let i=0;i<4;i++){c.beginPath();c.moveTo(x+10+i*11,y+19);c.lineTo(x+8+i*11,y+47);c.stroke();}
      }
    } else if(kind==='slate') {
      fill('#d9e4ee');
      for(let row=0;row<5;row++)for(let col=-1;col<6;col++){
        const x=col*52+(row%2)*26,y=row*52,grad=c.createLinearGradient(0,y,0,y+52);
        grad.addColorStop(0,'#687e96');grad.addColorStop(.15,'#e4eff6');grad.addColorStop(.8,'#b4c8d9');grad.addColorStop(1,'#60778e');
        c.fillStyle=grad;c.beginPath();c.moveTo(x+2,y+2);c.lineTo(x+50,y+2);c.lineTo(x+48,y+43);c.quadraticCurveTo(x+26,y+55,x+4,y+43);c.closePath();c.fill();
        c.strokeStyle='#f4f9fd9c';c.lineWidth=2;c.beginPath();c.moveTo(x+7,y+8);c.lineTo(x+43,y+8);c.stroke();
      }
    } else if(kind==='plaster') {
      fill('#f5edd5');
      for(let i=0;i<100;i++)dab(random()*256,random()*256,3+random()*15,2+random()*7,'#d6bf8a1c');
      for(let i=0;i<1400;i++)dab(random()*256,random()*256,.4+random(),.4+random(),i%2?'#fffdf17a':'#bfa47a24');
    } else if(kind==='stone') {
      fill('#e7e5ce');
      for(let y=0;y<256;y+=64)for(let x=-64;x<256;x+=80){
        const offset=(y/64)%2*40;
        c.fillStyle='#89948266';c.fillRect(x+offset,y,78,3);c.fillRect(x+offset,y,3,64);
        c.fillStyle='#fffce594';c.fillRect(x+offset+4,y+4,70,3);
      }
      for(let i=0;i<500;i++)dab(random()*256,random()*256,random()*2+.5,random()+.5,'#a5aa8b38');
    } else if(kind==='foliage') {
      fill('#e8f0d6');
      for(let i=0;i<110;i++){
        const x=random()*256,y=random()*256;
        dab(x,y,5+random()*6,2+random()*3,i%2?'#a5c48c66':'#ffffe96b');
        c.strokeStyle='#86a87642';c.lineWidth=1;c.beginPath();c.moveTo(x-5,y+1);c.lineTo(x+5,y-1);c.stroke();
      }
    } else if(kind==='cloth') {
      fill('#f4f1e2');
      c.strokeStyle='#a9a7a327';c.lineWidth=1;
      for(let i=0;i<256;i+=4){c.beginPath();c.moveTo(i,0);c.lineTo(i,256);c.moveTo(0,i);c.lineTo(256,i);c.stroke();}
      for(let i=0;i<70;i++)dab(random()*256,random()*256,2+random()*5,1,'#ffffff16');
    }
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
    map.wrapS=map.wrapT=THREE.RepeatWrapping;
    map.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    map.userData.painted=true;
    return map;
  }
  return {
    get(kind,repeat=1) {
      const key=kind+':'+repeat;
      if(!maps.has(key)){const map=paint(kind);map.repeat.set(repeat,repeat);maps.set(key,map);}
      return maps.get(key);
    },
    get count(){return maps.size;}
  };
}
