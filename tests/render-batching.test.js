import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRigBatcher} from '../render-batching.js';

test('rig batches preserve detailed vertices, material color and articulated world positions',()=>{
  const root=new THREE.Group(),hip=new THREE.Group(),knee=new THREE.Group();root.add(hip);hip.add(knee);
  root.position.set(5,0,-4);hip.position.set(.2,1,0);knee.position.set(0,-.5,0);
  const geometry=new THREE.SphereGeometry(.2,12,8),material=new THREE.MeshStandardMaterial({color:'#a47e42'}),parts=[];
  for(const [parent,y]of [[root,1.5],[hip,-.2],[knee,-.2]]){
    const m=new THREE.Mesh(geometry,material);m.position.y=y;parent.add(m);parts.push(m);
  }
  root.updateMatrixWorld(true);
  const rest=parts.map(m=>{const v=new THREE.Vector3().fromBufferAttribute(m.geometry.attributes.position,m.geometry.index.getX(0));return m.localToWorld(v);});
  const count=parts.reduce((n,m)=>n+m.geometry.index.count,0);
  const batch=createRigBatcher();batch(root);root.updateMatrixWorld(true);
  const mesh=root.children.find(m=>m.isSkinnedMesh);assert.ok(mesh);assert.equal(root.userData.rigidBatches,1);assert.equal(mesh.geometry.attributes.position.count,count);
  const expected=new THREE.Color('#a47e42');assert.ok(Math.abs(mesh.geometry.attributes.color.getX(0)-expected.r)<1e-6);
  for(const [i,offset]of [0,geometry.index.count,geometry.index.count*2].entries()){
    const v=mesh.localToWorld(mesh.getVertexPosition(offset,new THREE.Vector3()));assert.ok(v.distanceTo(rest[[2,1,0][i]])<1e-6,'rest vertex stays on authored surface');
  }
  root.position.set(8,.4,3);root.rotation.y=.7;hip.rotation.x=.45;knee.rotation.x=-.7;root.updateMatrixWorld(true);
  for(const [i,offset]of [0,geometry.index.count,geometry.index.count*2].entries()){
    const source=parts[[2,1,0][i]],v=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,geometry.index.getX(0));
    // Original mesh has been detached; evaluate it under the same living joint.
    source.updateMatrix();v.applyMatrix4(source.matrix).applyMatrix4([knee,hip,root][i].matrixWorld);
    mesh.bindMatrixInverse.copy(mesh.matrixWorld).invert();
    const actual=mesh.localToWorld(mesh.getVertexPosition(offset,new THREE.Vector3()));assert.ok(actual.distanceTo(v)<1e-5,'animated vertices follow the original joint without changing silhouette');
  }
  root.userData.rigidSkeleton.dispose();mesh.geometry.dispose();geometry.dispose();material.dispose();
});

test('visibility-changing equipment and health remain independent of rigid batches',()=>{
  const root=new THREE.Group(),hand=new THREE.Group(),health=new THREE.Group(),weapon=new THREE.Group();root.add(hand,health);hand.add(weapon);
  const geometry=new THREE.BoxGeometry(.1,.1,.1),material=new THREE.MeshStandardMaterial();
  const add=p=>{const m=new THREE.Mesh(geometry,material);p.add(m);return m;};
  add(root);add(hand);const bar=add(health),blade=add(weapon);createRigBatcher()(root,{exclude:[health,weapon]});
  assert.equal(blade.parent,weapon);assert.equal(bar.parent,health);weapon.visible=false;health.visible=false;
  const skin=root.children.find(m=>m.isSkinnedMesh);assert.ok(skin);assert.equal(skin.geometry.attributes.position.count,72);
  root.userData.rigidSkeleton.dispose();skin.geometry.dispose();geometry.dispose();material.dispose();
});
