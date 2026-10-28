import * as THREE from 'three';
import {createHash} from 'node:crypto';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

// CPU-only factory contracts. The browser suite separately uses the production
// batching, physical maps, lighting, picking and rendering implementation.
export function modelToolkit(){
 const scene=new THREE.Scene(),geometries=new Map(),materials=new Map();
 const geometry=(key,make)=>{if(!geometries.has(key))geometries.set(key,make());return geometries.get(key);};
 const mat=(color,metal=0,kind=null)=>{const key=JSON.stringify([color,metal,kind]);if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color,metalness:metal});m.userData.surface=kind;materials.set(key,m);}return materials.get(key);};
 const group=(parent,x=0,y=0,z=0)=>{const g=new THREE.Group();g.position.set(x,y,z);parent?.add(g);return g;};
 const mesh=(parent,geo,color,x=0,y=0,z=0,scale=[1,1,1],metal=0)=>{const m=new THREE.Mesh(geo,mat(color,metal));m.position.set(x,y,z);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent?.add(m);return m;};
 const boxGeo=geometry('test-box',()=>new THREE.BoxGeometry(1,1,1));
 const box=(p,c,x,y,z,sx,sy,sz,m=0)=>mesh(p,boxGeo,c,x,y,z,[sx,sy,sz],m);
 const softBox=(p,c,x,y,z,sx,sy,sz,m=0)=>mesh(p,geometry('test-rounded-box',()=>new RoundedBoxGeometry(1,1,1,2,.065)),c,x,y,z,[sx,sy,sz],m);
 const softBall=(p,c,x,y,z,sx,sy=sx,sz=sx)=>mesh(p,geometry('test-sphere',()=>new THREE.SphereGeometry(1,16,12)),c,x,y,z,[sx,sy,sz]);
 const cylinder=(p,c,x,y,z,r,h,m=0)=>mesh(p,geometry('test-cylinder',()=>new THREE.CylinderGeometry(1,1,1,16)),c,x,y,z,[r,h,r],m);
 const coneGeo=geometry('test-cone',()=>new THREE.ConeGeometry(1,1,12)),headGeo=geometry('test-head',()=>new THREE.SphereGeometry(1,16,12));
 return{scene,group,mesh,box,softBox,softBall,ball:softBall,cylinder,geometry,mat,batch(){},geometries,materials,coneGeo,headGeo};
}
export function modelInfo(root){
 root.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3());let meshes=0,triangles=0,vertices=0;const surfaces=new Set();
 root.traverseVisible(m=>{if(!m.isMesh)return;meshes++;const p=m.geometry.attributes.position;vertices+=p.count;triangles+=(m.geometry.index?.count||p.count)/3;for(const a of Array.isArray(m.material)?m.material:[m.material])surfaces.add(a.userData.surface||'plain');});
 return{bounds,size,meshes,triangles,vertices,surfaces};
}
export function fingerprint(root){
 root.updateWorldMatrix(true,true);const digest=createHash('sha256');let meshes=0,triangles=0;
 root.traverse(m=>{if(!m.isMesh)return;meshes++;triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;
  digest.update(JSON.stringify({visible:m.visible,matrix:m.matrixWorld.elements,materials:(Array.isArray(m.material)?m.material:[m.material]).map(a=>({color:a.color?.getHexString(),surface:a.userData.surface,side:a.side,metalness:a.metalness,roughness:a.roughness}))}));
  for(const name of Object.keys(m.geometry.attributes).sort()){const a=m.geometry.attributes[name];digest.update(name+':'+a.itemSize+':'+a.array.constructor.name);digest.update(Buffer.from(a.array.buffer,a.array.byteOffset,a.array.byteLength));}
  if(m.geometry.index){const a=m.geometry.index.array;digest.update('index:'+a.constructor.name);digest.update(Buffer.from(a.buffer,a.byteOffset,a.byteLength));}
 });return{sha256:digest.digest('hex'),meshes,triangles};
}
