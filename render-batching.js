import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Rigid skinning keeps the authored surfaces and existing joint animation.
// Sharing a draw across the torso and limbs avoids a separate submission for
// every boot, cuff and finger surface. No vertices are removed or simplified.
export function createRigBatcher(){
  const sharedMaterials=new Map();
  const materialKey=a=>[a.type,a.map?.uuid||'',a.normalMap?.uuid||'',a.bumpMap?.uuid||'',a.bumpScale,a.roughnessMap?.uuid||'',a.roughness,a.metalness,a.envMapIntensity,a.side,a.flatShading,a.polygonOffset,a.polygonOffsetFactor,a.polygonOffsetUnits].join(':');
  return function batchRig(root,{exclude=[]}={}){
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert(),bones=[root],boneIds=new Map([[root,0]]),buckets=new Map(),removed=[];
    const excluded=node=>{for(let n=node;n&&n!==root;n=n.parent)if(exclude.includes(n))return true;return false;};
    root.traverse(m=>{
      if(!m.isMesh||m.isSkinnedMesh||m.isInstancedMesh||Array.isArray(m.material)||m.material.transparent||excluded(m))return;
      const parent=m.parent;
      if(!boneIds.has(parent)){boneIds.set(parent,bones.length);bones.push(parent);}
      const a=m.material,key=materialKey(a)+':'+m.receiveShadow;
      if(!buckets.has(key))buckets.set(key,{material:a,parts:[],castShadow:false,receiveShadow:m.receiveShadow});
      const bucket=buckets.get(key),g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
      const p=g.getAttribute('position'),old=g.getAttribute('color'),colors=new Float32Array(p.count*3),indices=new Uint16Array(p.count*4),weights=new Float32Array(p.count*4);
      for(let i=0;i<p.count;i++){
        colors[i*3]=a.color.r*(a.vertexColors&&old?old.getX(i):1);colors[i*3+1]=a.color.g*(a.vertexColors&&old?old.getY(i):1);colors[i*3+2]=a.color.b*(a.vertexColors&&old?old.getZ(i):1);
        indices[i*4]=boneIds.get(parent);weights[i*4]=1;
      }
      for(const name of Object.keys(g.attributes))if(!['position','normal','uv'].includes(name))g.deleteAttribute(name);
      if(!g.getAttribute('uv'))g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(p.count*2),2));
      if(!g.getAttribute('normal'))g.computeVertexNormals();
      g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));bucket.parts.push(g);bucket.castShadow ||= m.castShadow;removed.push(m);
    });
    if(!removed.length)return root;
    const skeleton=new THREE.Skeleton(bones);skeleton.calculateInverses();
    for(const [key,bucket] of buckets){
      const combined=mergeGeometries(bucket.parts);bucket.parts.forEach(g=>g.dispose());
      if(!combined)throw new Error('Rigid skin batch has incompatible surfaces');
      if(!sharedMaterials.has(key)){const a=bucket.material.clone();a.color.set('#ffffff');a.vertexColors=true;sharedMaterials.set(key,a);}
      const mesh=new THREE.SkinnedMesh(combined,sharedMaterials.get(key));mesh.castShadow=bucket.castShadow;mesh.receiveShadow=bucket.receiveShadow;
      mesh.userData.ownedGeometry=true;mesh.userData.rigidBatch=true;
      // A whole animated character is tiny compared with a world sector; use
      // its owner visibility instead of recomputing a deformed sphere per frame.
      mesh.frustumCulled=false;root.add(mesh);mesh.bind(skeleton,root.matrixWorld);
    }
    const disposed=new Set();
    for(const m of removed){if(m.userData.ownedGeometry&&!disposed.has(m.geometry)){disposed.add(m.geometry);m.geometry.dispose();}m.removeFromParent();}
    root.userData.rigidSkeleton=skeleton;root.userData.rigidBatches=buckets.size;
    return root;
  };
}
