import * as THREE from 'three';
import anatomicalData from './assets/v56-king-anatomy.json' with {type:'json'};

// An actual anatomical surface with connected orbital, nasal, lip and ear
// topology. Its CC0 data provenance and reproducible sculpt are documented in
// scripts/build-king-anatomy.py and assets/licenses/makehuman-cc0.txt.
const materialVariants=new WeakMap();
export function createKingAnatomy(k,appearance={}){
  const skin=appearance.skin||'#d6b094';
  function dataGeometry(name,side=1){return k.geometry('king56-anatomical-'+name+(side<0?'-left':''),()=>{
    const data=anatomicalData[name],g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(data.positions,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(data.normals,3));
    g.setAttribute('uv',new THREE.Float32BufferAttribute(data.uv,2));
    g.setAttribute('color',new THREE.Float32BufferAttribute(data.colors,3));
    g.setIndex(data.indices);
    // Bake handedness into the cached geometry. A negative Object3D scale
    // would invert winding when the renderer later merges static surfaces.
    if(side<0){
      const p=g.attributes.position,n=g.attributes.normal,index=g.index;
      for(let i=0;i<p.count;i++){p.setX(i,-p.getX(i));n.setX(i,-n.getX(i));}
      for(let i=0;i<index.count;i+=3){const a=index.getX(i);index.setX(i,index.getX(i+2));index.setX(i+2,a);}
    }
    g.computeBoundingBox();g.computeBoundingSphere();
    g.userData={anatomical:true,source:'MakeHuman CC0, original mature-king derivative',part:name};return g;
  });}
  function skinMesh(parent,name,side=1){
    const m=k.mesh(parent,dataGeometry(name,side),skin,0,0,0),base=k.mat(skin,0,'skin');
    if(!materialVariants.has(base)){const material=base.clone();material.vertexColors=true;materialVariants.set(base,material);}
    m.material=materialVariants.get(base);m.userData.anatomical=true;return m;
  }
  const head=k.group(k.scene);skinMesh(head,'head');
  const eyeball=k.geometry('king56-human-eye',()=>new THREE.SphereGeometry(1,24,16));
  const pupil=k.geometry('king56-human-pupil',()=>new THREE.SphereGeometry(1,16,12));
  for(const[x,y,z]of anatomicalData.features.eyes){
    const sclera=k.mesh(head,eyeball,'#b8b6a8',x,y,z,[.029,.023,.0255]);sclera.castShadow=false;
    const iris=k.mesh(head,pupil,appearance.eye||'#657365',x,y,z+.0246,[.0095,.0091,.0021]);iris.castShadow=false;
    const centre=k.mesh(head,pupil,'#11140f',x,y,z+.0264,[.0041,.0045,.0012]);centre.castShadow=false;
    const glint=k.mesh(head,pupil,'#e5e6d7',x-.0025,y+.0032,z+.0274,[.0014,.0014,.0006]);glint.castShadow=false;
  }
  head.userData={anatomical:true,part:'mature-head',modelStyle:'sculpted',sourceLicense:'CC0-1.0',features:anatomicalData.features};
  function createHand(parent,side=1,{grip=true}={}){
    const hand=k.group(parent);skinMesh(hand,grip?'handGrip':'handRelaxed',side);
    hand.userData={anatomical:true,part:'hand',grip,sourceLicense:'CC0-1.0'};return hand;
  }
  return{head,createHand,features:anatomicalData.features};
}
