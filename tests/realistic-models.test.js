import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createRoyalModels} from '../royal-models.js';
import {createRoyalAnimals} from '../animal-models.js';

// No DOM/GPU is needed to validate the authored meshes and articulated factory
// contract. World rendering tests separately exercise actual material batching.
function toolkit(){
 const scene=new THREE.Scene(),geometries=new Map(),materials=new Map();
 const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 const mat=(color,metal=0,kind=null)=>{const key=JSON.stringify([color,metal,kind]);if(!materials.has(key)){const material=new THREE.MeshStandardMaterial({color,metalness:metal});material.userData.surface=kind;materials.set(key,material);}return materials.get(key);};
 const group=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;};
 const mesh=(parent,geo,color,x=0,y=0,z=0,scale=[1,1,1],metal=0)=>{const m=new THREE.Mesh(geo,mat(color,metal));m.position.set(x,y,z);m.scale.set(...scale);parent.add(m);return m;};
 const box=(p,c,x,y,z,sx,sy,sz,m=0)=>mesh(p,geometry('test-box',()=>new THREE.BoxGeometry(1,1,1)),c,x,y,z,[sx,sy,sz],m);
 const softBox=(p,c,x,y,z,sx,sy,sz,m=0)=>mesh(p,geometry('test-rounded-box',()=>new RoundedBoxGeometry(1,1,1,2,.065)),c,x,y,z,[sx,sy,sz],m);
 const softBall=(p,c,x,y,z,sx,sy=sx,sz=sx)=>mesh(p,geometry('test-sphere',()=>new THREE.SphereGeometry(1,16,12)),c,x,y,z,[sx,sy,sz]);
 const cylinder=(p,c,x,y,z,r,h,m=0)=>mesh(p,geometry('test-cylinder',()=>new THREE.CylinderGeometry(1,1,1,16)),c,x,y,z,[r,h,r],m);
 return{scene,group,mesh,box,softBox,softBall,ball:softBall,cylinder,geometry,mat,batch(){},geometries,materials};
}
function meshInfo(root){
 root.updateMatrixWorld(true);let triangles=0,meshes=0;const surfaces=new Set();
 root.traverseVisible(m=>{if(!m.isMesh)return;meshes++;const p=m.geometry.getAttribute('position');triangles+=(m.geometry.index?.count||p.count)/3;surfaces.add(m.material.userData.surface);});
 const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());return{triangles,meshes,surfaces,box,size};
}
function validateGeometry(geometries){
 for(const [name,g]of geometries){
  const p=g.getAttribute('position');assert.ok(p?.count>2,'positions exist: '+name);
  for(const [attribute,a]of Object.entries(g.attributes))for(const value of a.array)assert.ok(Number.isFinite(value),name+' '+attribute+' contains a finite value');
  if(g.index)for(const index of g.index.array)assert.ok(index>=0&&index<p.count,'valid triangle index in '+name);
  g.computeBoundingBox();assert.ok(Number.isFinite(g.boundingBox.min.x)&&Number.isFinite(g.boundingBox.max.y),'bounds are finite: '+name);
  if(name.startsWith('realistic-loft-')||name.startsWith('anatomical-animal-loft-')){
   // Rows may run upward OR downward (forearms, thighs and boots). Their
   // radial normals must always face outside so FrontSide materials do not
   // disappear or expose the inner/back half of an anatomical surface.
   const uv=g.getAttribute('uv'),normals=g.getAttribute('normal');let columns=1;while(columns<uv.count&&Math.abs(uv.getY(columns)-uv.getY(0))<1e-7)columns++;
   const rows=Math.floor(p.count/columns),segments=columns-1;assert.ok(rows>=2&&segments>=6,'loft topology is inspectable: '+name);
   for(let row=0;row<rows;row++){const a=row*columns,b=a+segments;assert.ok(Math.hypot(normals.getX(a)-normals.getX(b),normals.getY(a)-normals.getY(b),normals.getZ(a)-normals.getZ(b))<1e-5,'UV seam normals are welded: '+name+' row'+row);}
   if(p.count-rows*columns===2){const direction=Math.sign(p.getY((rows-1)*columns)-p.getY(0));assert.ok(normals.getY(p.count-2)*direction<-.9,'bottom/end cap faces outward: '+name);assert.ok(normals.getY(p.count-1)*direction>.9,'top/end cap faces outward: '+name);}
   let radialSamples=0,outwardSamples=0,radialSum=0;const curvedAnimal=name.startsWith('anatomical-animal-');
   for(let row=1;row<rows-1;row++){
    let cx=0,cy=0,cz=0;for(let j=0;j<segments;j++){const i=row*columns+j;cx+=p.getX(i)/segments;cy+=p.getY(i)/segments;cz+=p.getZ(i)/segments;}
    for(let j=0;j<segments;j++){const i=row*columns+j,dx=p.getX(i)-cx,dy=p.getY(i)-cy,dz=p.getZ(i)-cz,r=Math.hypot(dx,dy,dz);if(r<1e-7)continue;const dot=(normals.getX(i)*dx+normals.getY(i)*dy+normals.getZ(i)*dz)/r;radialSamples++;radialSum+=dot;if(dot>0)outwardSamples++;if(!curvedAnimal)assert.ok(dot>0,'outward normal on '+name+' row'+row+' vertex'+j+'; radial dot='+dot);}
   }
   // Curved equine/porcine spines can have locally concave pole transitions.
   // Their aggregate orientation must still be outward, without requiring
   // every concave normal to point away from its own cross-section centre.
   if(curvedAnimal)assert.ok(outwardSamples/radialSamples>.9&&radialSum/radialSamples>.15,'curved loft has outward winding: '+name);
  }

 }
}

test('Realistic adults retain articulated, cached meshes for every job and royal style',()=>{
 const k=toolkit(),models=createRoyalModels(k),styles=['royal','ranger','warden'],jobs=['worker','builder','knight','farmer','armorer','inventor','unassigned','survivor','enemy'];
 const build=(type,appearance={})=>{const actor=models.character(type,appearance),d=actor.userData,info=meshInfo(actor);assert.equal(d.modelStyle,type==='king'?'sculpted':'realistic');assert.equal(d.designRevision,type==='king'?3:2);assert.equal(d.legs.length,2);assert.equal(d.arms.length,2);assert.ok(d.body&&d.weapons&&d.bow&&d.axe&&d.health&&d.healthFill);assert.ok(d.legs.every(l=>l.parent===actor)&&d.arms.every(l=>l.parent===actor),'animation pivots remain direct actor children');
  assert.ok(d.anatomy.height/d.anatomy.headHeight>=6&&d.anatomy.height/d.anatomy.headHeight<8.5,'adult proportions have6–8.5 heads of height');assert.ok(d.anatomy.hipHeight>d.anatomy.height*.35&&d.anatomy.hipHeight<d.anatomy.height*.55,'hips support long adult legs');assert.ok(info.box.min.y>-.06,'standing feet stay above terrain');assert.ok(info.size.y>1.8&&info.size.y<3.3,'adult height remains compatible with world camera');assert.ok(info.triangles<(type==='king'?240000:40000),'sculpted mesh has a finite triangle budget: '+info.triangles);assert.ok(info.surfaces.has('skin')&&(info.surfaces.has('leather')||info.surfaces.has('hide')),'skin and leather remain distinct surfaces');return actor;};
 for(const outfit of styles)build('king',{outfit});for(const job of jobs)build(job);build('enemy',{elite:true,enemyKind:'warden'});build('enemy',{elite:true,enemyKind:'guardian'});
 const before=k.geometries.size;for(const outfit of styles)build('king',{outfit});for(const job of jobs)build(job);build('enemy',{elite:true,enemyKind:'warden'});build('enemy',{elite:true,enemyKind:'guardian'});assert.equal(k.geometries.size,before,'identical factories reuse cached geometry');validateGeometry(k.geometries);
});

test('Realistic animals keep independently animated limbs, selectable coats and finite sculpted surfaces',()=>{
 const k=toolkit(),models=createRoyalAnimals(k);
 for(const coat of ['chestnut','ivory','night']){const horse=models.horse(coat),info=meshInfo(horse.root);assert.equal(horse.coat,coat);assert.equal(horse.legs.length,4);assert.ok(horse.head&&horse.tail);assert.ok(horse.legs.every(l=>l.parent===horse.root));assert.equal(horse.root.userData.modelStyle,'realistic');assert.ok(info.box.min.y>-.08,'hooves rest on the terrain');assert.ok(info.size.y>1.6&&info.size.y<3,'horse height remains compatible with rider');assert.ok(info.size.z>1.8&&info.size.z<4.5,'adult horse length is bounded');assert.ok(info.triangles<55000,'horse detail remains bounded');assert.ok(info.surfaces.has('hide')||info.surfaces.has('leather'),'saddle and bridle use separate leather surfaces');}
 const pig=models.pig(),info=meshInfo(pig);assert.ok(info.triangles>1000&&info.triangles<20000);assert.ok(info.size.z>info.size.x,'pig body has a long realistic silhouette');const before=k.geometries.size;for(const coat of ['chestnut','ivory','night'])models.horse(coat);models.pig();assert.equal(k.geometries.size,before,'animal factories reuse cached meshes');validateGeometry(k.geometries);
});
