import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {modelToolkit,modelInfo,fingerprint} from './helpers/model-toolkit.mjs';
import {createEnemyModels} from '../enemy-models.js';
import {createWildlifeModels} from '../wildlife-models.js';

function validMeshTree(root){
  root.updateWorldMatrix(true,true);let triangles=0;
  root.traverse(m=>{
    assert.ok(m.matrixWorld.determinant()>0,'all parts keep outward positive transforms');
    if(!m.isMesh)return;const g=m.geometry,p=g.attributes.position,n=g.attributes.normal;
    assert.ok(p&&n,'all surfaces have physical normals');
    for(const a of Object.values(g.attributes))for(const v of a.array)assert.ok(Number.isFinite(v),'no invalid vertex attributes');
    if(g.index)for(const v of g.index.array)assert.ok(v>=0&&v<p.count,'indices reference authored vertices');
    triangles+=(g.index?.count||p.count)/3;
  });assert.ok(triangles>1000);
}

test('V6 enemy silhouettes retain articulated combat rigs and distinct ranked equipment',()=>{
  const k=modelToolkit(),factory=createEnemyModels(k),hashes=new Set();
  for(const kind of ['raider','skirmisher','breaker','brute','captain']){
    const low=factory.character({kind,tier:1}),high=factory.character({kind,tier:3}),d=low.userData;
    validMeshTree(low);validMeshTree(high);
    assert.equal(d.enemyKind,kind);assert.equal(d.legs.length,2);assert.equal(d.knees.length,2);assert.equal(d.arms.length,2);
    assert.ok(d.jobTool&&d.health&&d.healthFill&&d.weapons,'production animation/health API retained');
    assert.equal(d.features.shield,['raider','captain'].includes(kind));
    assert.equal(d.features.ranged,kind==='skirmisher');assert.equal(d.features.banner,kind==='captain');
    assert.equal(high.userData.features.tierArmor,true);assert.ok(modelInfo(high).triangles>modelInfo(low).triangles,'rank adds actual armor geometry');
    assert.notEqual(fingerprint(low).sha256,fingerprint(high).sha256);
    assert.ok(modelInfo(low).size.y>2&&modelInfo(low).size.y<3.1,'adult human proportions');
    hashes.add(fingerprint(low).sha256);
  }
  assert.equal(hashes.size,5,'five different silhouettes, not aliases');
});

test('V6 woodland fauna has species anatomy, four leg pivots and stable cached topology',()=>{
  const k=modelToolkit(),factory=createWildlifeModels(k),heights={};
  for(const kind of ['deer','rabbit','boar','wolf']){
    const a=factory.create(kind);validMeshTree(a.root);const info=modelInfo(a.root);heights[kind]=info.size.y;
    assert.equal(a.legs.length,4);assert.ok(a.head&&a.tail);assert.equal(a.root.userData.animal,kind);assert.equal(a.root.userData.wildlife,true);
    assert.ok(info.triangles<12000,'forest populations use bounded authored detail');
    assert.ok(info.surfaces.has('horsehide'),'short-coat textures preserved');
    for(const limb of a.legs){limb.rotation.x=.3;limb.updateMatrixWorld(true);assert.ok(new THREE.Box3().setFromObject(limb).isEmpty()===false);}
  }
  assert.ok(heights.deer>heights.wolf&&heights.wolf>heights.boar&&heights.boar>heights.rabbit,'different species retain believable relative scale');
  const geometryCount=k.geometries.size;
  for(let repeat=0;repeat<5;repeat++)for(const kind of ['deer','rabbit','boar','wolf'])factory.create(kind);
  assert.equal(k.geometries.size,geometryCount,'population churn reuses every authored mesh topology');
});
