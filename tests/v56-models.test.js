import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {modelToolkit,modelInfo,fingerprint} from './helpers/model-toolkit.mjs';
import {createRoyalModels} from '../royal-models.js';
import {createRoyalAnimals} from '../animal-models.js';

const preserved=JSON.parse(readFileSync(new URL('./fixtures/v55-preserved-actors.json',import.meta.url),'utf8'));

function finiteMesh(root){
 root.traverse(m=>{if(!m.isMesh)return;const p=m.geometry.getAttribute('position');assert.ok(p?.count>2,'authored mesh has vertices');
  for(const [name,a]of Object.entries(m.geometry.attributes))for(const value of a.array)assert.ok(Number.isFinite(value),'finite '+name+' on '+m.name);
  if(m.geometry.index)for(const i of m.geometry.index.array)assert.ok(i>=0&&i<p.count,'triangle points at a real vertex');
 });
}

test('V5.6 changes only the sovereign: V5.5 residents, enemies, horse coats and pig stay geometrically identical',()=>{
 const k=modelToolkit(),people=createRoyalModels(k),animals=createRoyalAnimals(k),actual={};
 for(const job of ['worker','builder','knight','farmer','armorer','inventor','unassigned','survivor','enemy'])actual[job]=fingerprint(people.character(job));
 for(const kind of ['warden','guardian'])actual['elite-'+kind]=fingerprint(people.character('enemy',{elite:true,enemyKind:kind}));
 for(const coat of ['chestnut','ivory','night'])actual['horse-'+coat]=fingerprint(animals.horse(coat).root);
 actual.pig=fingerprint(animals.pig());
 assert.deepEqual(actual,preserved.actors,'the king redesign does not silently replace the population or animals');
});

test('V5.6 anatomical surfaces retain connected facial and finger topology with explicit reusable CC0 provenance',()=>{
 const data=JSON.parse(readFileSync(new URL('../assets/v56-king-anatomy.json',import.meta.url),'utf8'));
 assert.equal(data.source.license,'CC0-1.0');assert.match(data.source.sha256,/^[a-f0-9]{64}$/);
 function check(part,minTriangles){
  const mesh=data[part],count=mesh.positions.length/3;assert.equal(mesh.normals.length,count*3);assert.equal(mesh.uv.length,count*2);assert.equal(mesh.colors.length,count*3);assert.equal(mesh.indices.length/3,mesh.triangles);assert.ok(mesh.triangles>=minTriangles,'anatomical detail has actual topology: '+part);
  for(const key of ['positions','normals','uv','colors'])for(const value of mesh[key])assert.ok(Number.isFinite(value),'finite anatomical '+part+' '+key);
  const vertices=new Map(),welded=[],parent=[];
  for(let i=0;i<count;i++){const key=mesh.positions.slice(i*3,i*3+3).map(v=>Math.round(v*1e6)).join(',');let id=vertices.get(key);if(id===undefined){id=vertices.size;vertices.set(key,id);parent[id]=id;}welded[i]=id;
   const length=Math.hypot(...mesh.normals.slice(i*3,i*3+3));assert.ok(length>.99&&length<1.01,'anatomical surface normals are unit length');}
  const find=i=>{while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;};const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};
  for(let i=0;i<mesh.indices.length;i+=3){const ids=mesh.indices.slice(i,i+3);assert.ok(ids.every(v=>v>=0&&v<count),'valid anatomical triangle');join(welded[ids[0]],welded[ids[1]]);join(welded[ids[1]],welded[ids[2]]);}
  const components=new Map();for(const id of welded){const root=find(id);components.set(root,(components.get(root)||0)+1);}assert.ok(Math.max(...components.values())/count>.97,'facial/finger anatomy is one connected surface, including welded UV seams: '+part);
 }
 check('head',30000);check('handGrip',10000);check('handRelaxed',10000);
 assert.notDeepEqual(data.handGrip.positions,data.handRelaxed.positions,'gripping changes the actual finger anatomy');assert.equal(data.handGrip.indices.length,data.handRelaxed.indices.length,'finger poses retain their anatomical surface density');assert.equal(data.handGrip.positions.length,data.handRelaxed.positions.length,'posing does not add disconnected finger primitives');
});

test('V5.6 sovereign has connected anatomical assets, distinct articulated hands and complete equipment',()=>{
 const k=modelToolkit(),models=createRoyalModels(k),styles=['royal','ranger','warden'];
 for(const outfit of styles){
  const king=models.character('king',{outfit}),d=king.userData,info=modelInfo(king);
  assert.equal(d.modelVersion,5);assert.equal(d.designRevision,3);assert.equal(d.modelStyle,'sculpted');assert.equal(d.anatomySource,'makehuman-cc0-sculpted');
  assert.ok(d.head&&d.headDress,'head anatomy and hair/crown are authored separately');assert.equal(d.hands.length,2);assert.notEqual(d.hands[0],d.hands[1]);assert.ok(d.hands.every(hand=>hand.scale.x>0),'mirrored hands bake correct winding before material batching');
  assert.equal(d.legs.length,2);assert.equal(d.knees.length,2);assert.equal(d.arms.length,2);assert.ok(d.body&&d.cape&&d.weapons&&d.bow&&d.axe&&d.health&&d.healthFill);
  assert.ok(d.legs.every(l=>l.parent===king)&&d.arms.every(l=>l.parent===king),'existing walk/rider pivots remain independent');
  assert.ok(d.knees.every((n,i)=>n.parent===d.legs[i]),'the rider retains real knee hinges');
  assert.ok(d.anatomy.height/d.anatomy.headHeight>6&&d.anatomy.height/d.anatomy.headHeight<8.5,'adult anatomical proportions');
  assert.ok(info.bounds.min.y>-.065&&info.size.y<3.3,'boots and crown fit the playable world');
  assert.ok(info.triangles>80000&&info.triangles<240000,'one sculpted king has a bounded detailed mesh budget: '+info.triangles);
  assert.ok(info.surfaces.has('skin')&&info.surfaces.has('steel')&&info.surfaces.has('mail'),'skin, forged plate and mail are distinct physical surfaces');
  finiteMesh(king);
 }
 const signatures=[];for(const appearance of [{beard:'none',hairStyle:'short',crown:'classic'},{beard:'short',hairStyle:'braids',crown:'spiked'},{beard:'long',hairStyle:'swept',crown:'classic'}])signatures.push(fingerprint(models.character('king',appearance)).sha256);
 assert.equal(new Set(signatures).size,3,'the retained beard, coiffure and crown choices change actual geometry');
 // Only repeat appearances already constructed: this checks reusable resources,
 // rather than mistaking the first creation of a legitimate new asset for a leak.
 const before=k.geometries.size;for(const outfit of styles)models.character('king',{outfit});assert.equal(k.geometries.size,before,'repeated outfits reuse authored geometry');
});

// This catches the first combined preview's wrist issue: setting a local hand
// rotation alone does not cancel the posed upper arm/forearm transforms.
test('V5.6 portrait wrists reach the sword and finger axes turn inward in the king frame',()=>{
 const k=modelToolkit(),king=createRoyalModels(k).character('king'),d=king.userData;
 king.position.set(1.3,.4,-.7);king.rotation.y=.73;
 d.poseRoyal({weapon:'bow'},0,false,true);king.updateWorldMatrix(true,true);
 assert.equal(d.displaySword.visible,true);assert.equal(d.weapons.visible,false);
 const inverseRoyal=king.getWorldQuaternion(new THREE.Quaternion()).invert();
 for(const [i,hand]of d.hands.entries()){
  const direction=new THREE.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new THREE.Quaternion())).applyQuaternion(inverseRoyal);
  assert.ok(direction.x*(i?-1:1)>.99&&Math.abs(direction.y)<.015&&Math.abs(direction.z)<.015,'fingers point inward toward the hilt after inherited rotations');
  const axis=d.displaySword.position;let close=0,count=0;
  hand.traverseVisible(m=>{if(!m.isMesh)return;const p=m.geometry.attributes.position;for(let v=0;v<p.count;v++){const point=king.worldToLocal(new THREE.Vector3().fromBufferAttribute(p,v).applyMatrix4(m.matrixWorld));count++;if(Math.hypot(point.x-axis.x,point.z-axis.z)<.06&&point.y>axis.y+.04&&point.y<axis.y+.51)close++;}});
  assert.ok(close/count>.5,'most of the posed palm/fingers wrap the real hilt envelope instead of floating beside it: '+close+'/'+count);
 }
 d.poseRoyal({weapon:'axe'},0,false,false);assert.equal(d.displaySword.visible,false);assert.equal(d.weapons.visible,true);assert.equal(d.axe.visible,true);assert.equal(d.bow.visible,false);assert.equal(d.freeHand.visible,true);assert.equal(d.hands[0].visible,false);
 const curl=new THREE.Vector3(1,0,0).applyQuaternion(d.hands[1].getWorldQuaternion(new THREE.Quaternion())),shaft=new THREE.Vector3(0,1,0).applyQuaternion(d.weapons.getWorldQuaternion(new THREE.Quaternion()));assert.ok(Math.abs(curl.dot(shaft))>.99,'the held weapon shaft follows the anatomical finger curl axis in game');
});
