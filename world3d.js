import * as THREE from 'three';
import {FOREST_TREES,RESCUE_SITES,LANDMARKS} from './world-data.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createPaintedTextures} from './painted-textures.js';

// All scenery is modelled here: the downloadable edition has no remote assets.
const UNIT = 40;
const wx = x => (x - 500) / UNIT;
const wz = y => (y - 325) / UNIT;
export const CAMERA_YAW = 0.22;

export function createWorld(canvas) {
  const mobile = matchMedia('(pointer: coarse)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a1cf57');
  scene.fog = new THREE.Fog('#a1cf57', 48, 90);
  const camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.5, 160);
  const hemi = new THREE.HemisphereLight('#f0f9ff', '#67953f', 1.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d4', 2.6);
  sun.position.set(-12, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 1536, mobile ? 1024 : 1536);
  Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 23, bottom: -23, near: 0.5, far: 65 });
  sun.shadow.normalBias = 0.065;
  sun.shadow.radius = 2.5;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  const painted=createPaintedTextures(renderer);
  const materials = new Map();
  const geometries = new Map();
  const woodColors=new Set(['#71543d','#73543a','#ab8557','#c09a64','#79573a','#72583c','#8e704b','#84613d','#725234','#754b36','#725a3d','#ad8350','#76553b','#a37342','#b8884c','#e4b56d']);
  const plasterColors=new Set(['#ead4a1','#dfc797','#ffe0a1']);
  const stoneColors=new Set(['#918c75','#b0a68b','#8b8a77','#b5ad91','#909a8b','#b6bfac']);
  const foliageColors=new Set(['#3e8b36','#65b740','#9cd846','#6eb23d','#91c94b']);
  const clothColors=new Set(['#238de8','#1269bd','#ee4352','#b52d48','#e6bb50','#53a8e8','#75bd52']);
  const mat = (color, metalness = 0) => {
    const surface=foliageColors.has(color)?'foliage':woodColors.has(color)?'wood':plasterColors.has(color)?'plaster':stoneColors.has(color)?'stone':clothColors.has(color)?'cloth':['#ef7740','#d95730'].includes(color)?'roof':null;
    const key = `${color}:${metalness}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({color,map:surface?painted.get(surface):null,flatShading:false,roughness:metalness?.35:.85,metalness}));
    return materials.get(key);
  };
  const geometry = (key, make) => {
    if (!geometries.has(key)) geometries.set(key, make());
    return geometries.get(key);
  };
  function mesh(parent, geo, color, x, y, z, scale = [1, 1, 1], metal = 0) {
    const m = new THREE.Mesh(geo, mat(color, metal));
    m.position.set(x, y, z);m.scale.set(...scale);
    m.castShadow = true;m.receiveShadow = true;parent.add(m);return m;
  }
  const boxGeo = geometry('box', () => new THREE.BoxGeometry(1, 1, 1));
  const sphereGeo = geometry('sphere', () => new THREE.IcosahedronGeometry(1, 2));
  const coneGeo = geometry('cone', () => new THREE.ConeGeometry(1, 1, 12));
  const cylinderGeo = geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const box = (p, c, x, y, z, sx, sy, sz, metal = 0) => mesh(p, boxGeo, c, x, y, z, [sx, sy, sz], metal);
  const ball = (p, c, x, y, z, sx, sy = sx, sz = sx) => mesh(p, sphereGeo, c, x, y, z, [sx, sy, sz]);
  const cylinder = (p, c, x, y, z, radius, height, metal = 0) => mesh(p, cylinderGeo, c, x, y, z, [radius, height, radius], metal);
  function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group();g.position.set(x, y, z);parent.add(g);return g; }
  // Merge immobile parts by material; share geometry and animate only limbs.
  function batch(root, exclusions = []) {
    root.updateWorldMatrix(true,true);
    const inverse = root.matrixWorld.clone().invert(), buckets = new Map();
    root.traverse(m => {
      if(!m.isMesh || m.isInstancedMesh || m.material.transparent)return;
      for(let node=m;node && node!==root;node=node.parent)if(exclusions.includes(node))return;
      const key=m.material.uuid+':'+m.castShadow+':'+m.receiveShadow;
      if(!buckets.has(key))buckets.set(key,[]);
      buckets.get(key).push(m);
    });
    for(const meshes of buckets.values()){
      if(meshes.length<2)continue;
      const parts=meshes.map(m=>{
        const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();
        return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));
      });
      const combined=mergeGeometries(parts);
      parts.forEach(g=>g.dispose());
      if(!combined)continue;
      const m=new THREE.Mesh(combined,meshes[0].material);
      m.castShadow=meshes[0].castShadow;m.receiveShadow=meshes[0].receiveShadow;m.userData.ownedGeometry=true;
      meshes.forEach(old=>old.removeFromParent());root.add(m);
    }
  }
  function groundShape(points, color, y = 0.025) {
    const shape = new THREE.Shape();points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    const m = new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:'#eac47c',map:painted.get('dirt',.35),roughness:1,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1}));m.rotation.x = -Math.PI / 2;m.position.y = y;m.receiveShadow = true;scene.add(m);
  }
  const terrain=box(scene, '#80965b', 0, -0.4, 0, 280, 0.75, 260);
  terrain.material=new THREE.MeshStandardMaterial({color:'#87d32f',map:painted.get('grass',68),roughness:1});
  const yard = cylinder(scene, '#b9b484', 0, -0.005, -2, 5.1, 0.07);yard.scale.z *= 0.8;yard.castShadow = false;yard.material=new THREE.MeshStandardMaterial({color:'#e1bf78',map:painted.get('dirt',3),roughness:1});
  const road = [];
  for (let i = 0; i <= 24; i++) { const z = -2 + i * 0.65;road.push([Math.sin(z * 0.55) * 0.65 - 1.1, z]); }
  for (let i = 24; i >= 0; i--) { const z = -2 + i * 0.65;road.push([Math.sin(z * 0.55) * 0.65 + 1.1, z]); }
  groundShape(road, '#c8b68a', 0.04);
  let seed = 77;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296; }
  function branch(parent,from,to,radius,color='#71543d'){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const m=cylinder(parent,color,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,delta.length());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function treeModel(species){
    const t=group(scene);
    const trunk=mesh(t,geometry('trunk',()=>new THREE.CylinderGeometry(.12,.24,2.7,10)), '#71543d',0,1.3,0);
    for(let i=0;i<5;i++){const a=i*Math.PI*.4;branch(t,[0,.3,0],[Math.sin(a)*.55,.02,Math.cos(a)*.55],.08);}
    if(species==='pine'){
      for(let level=0;level<5;level++){
        const y=1.2+level*.53,r=1.15-level*.17;
        mesh(t,coneGeo,['#3e8b36','#65b740','#9cd846'][level%3],0,y+.48,0,[r,1.28,r]);
        for(let j=0;j<5;j++){
          const a=j*Math.PI*.4+level*.5;
          branch(t,[0,y,0],[Math.sin(a)*r*.85,y-.12,Math.cos(a)*r*.85],.038);
          const frond=mesh(t,coneGeo,level%2?'#65b740':'#3e8b36',Math.sin(a)*r*.64,y+.08,Math.cos(a)*r*.64,[r*.38,.65,r*.38]);
          frond.rotation.z=Math.sin(a)*.3;frond.rotation.x=Math.cos(a)*.3;
        }
      }
      mesh(t,coneGeo,'#9cd846',0,4.1,0,[.28,.9,.28]);
    }else{
      const crowns=[[0,3,0,1.3],[-.9,2.65,.25,.95],[.85,2.75,.45,1],[-.5,3.5,-.55,.9],[.5,3.6,.1,.9],[.25,2.9,-.95,.8]];
      for(let i=0;i<crowns.length;i++){const[x,y,z,r]=crowns[i];branch(t,[0,1.1,0],[x,y-.2,z],.07);ball(t,['#3e8b36','#6eb23d','#91c94b'][i%3],x,y,z,r,r*.85,r);}
    }
    // Bark scars, ferns and mushrooms make a tree readable at close range.
    for(let i=0;i<4;i++){const a=i*1.9;const scar=box(t,'#ab8557',Math.sin(a)*.19,.65+i*.32,Math.cos(a)*.19,.05,.22,.04);scar.rotation.y=a;}
    for(let i=0;i<3;i++){const a=i*2.1;branch(t,[.48,.05,.4],[.48+Math.sin(a)*.35,.35,.4+Math.cos(a)*.35],.025,'#6eb23d');}
    cylinder(t,'#e8dab4',-.45,.11,.2,.035,.2);const cap=ball(t,'#e97650',-.45,.23,.2,.14,.08,.14);ball(t,'#fff1ce',-.49,.28,.23,.026);
    batch(t);t.updateWorldMatrix(true,true);t.removeFromParent();return t;
  }
  function distantTree(species){
    const t=group(scene);cylinder(t,'#71543d',0,1.1,0,.17,2.2);
    if(species==='pine')for(let i=0;i<3;i++)mesh(t,coneGeo,['#3e8b36','#65b740','#9cd846'][i],0,1.55+i*.8,0,[1.15-i*.25,1.8,1.15-i*.25]);
    else for(const [x,y,z,r]of[[0,3.1,0,1.3],[-.8,2.8,.1,.9],[.7,3,.4,1]])mesh(t,geometry('distantLeaves',()=>new THREE.IcosahedronGeometry(1,1)),'#6eb23d',x,y,z,[r,r*.85,r]);
    batch(t);t.updateWorldMatrix(true,true);t.removeFromParent();return t;
  }
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=32;
  const contactContext=contactCanvas.getContext('2d'),gradient=contactContext.createRadialGradient(16,16,1,16,16,16);
  gradient.addColorStop(0,'#ffffffff');gradient.addColorStop(1,'#ffffff00');contactContext.fillStyle=gradient;contactContext.fillRect(0,0,32,32);
  const contactTexture=new THREE.CanvasTexture(contactCanvas),contactMaterial=new THREE.MeshBasicMaterial({color:'#244b20',map:contactTexture,transparent:true,opacity:.22,depthWrite:false});
  const forestChunks=[];
  for(const species of ['pine','oak']){
    const models=[treeModel(species),distantTree(species)],chunks=new Map();
    for(const tree of FOREST_TREES.filter(t=>t.species===species)){
      const key=Math.floor(wx(tree.x)/12)+','+Math.floor(wz(tree.y)/12);
      if(!chunks.has(key))chunks.set(key,[]);chunks.get(key).push(tree);
    }
    for(const [key,trees]of chunks){
      const [cx,cz]=key.split(',').map(Number),chunk=group(scene,cx*12,0,cz*12),levels=[];
      for(let lod=0;lod<2;lod++){
        const level=group(chunk);levels.push(level);
        models[lod].traverse(source=>{if(!source.isMesh)return;
          const instances=new THREE.InstancedMesh(source.geometry,source.material,trees.length),dummy=new THREE.Object3D();
          for(let i=0;i<trees.length;i++){
            const tree=trees[i];dummy.position.set(wx(tree.x)-cx*12,0,wz(tree.y)-cz*12);dummy.rotation.y=tree.rotation;dummy.scale.setScalar(tree.size);dummy.updateMatrix();
            instances.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(dummy.matrix,source.matrixWorld));
          }
          instances.castShadow=lod===0;instances.receiveShadow=true;instances.computeBoundingSphere();level.add(instances);
        });
      }
      const contacts=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.2,3.2),contactMaterial,trees.length),dummy=new THREE.Object3D();
      for(let i=0;i<trees.length;i++){const tree=trees[i];dummy.position.set(wx(tree.x)-cx*12,.005,wz(tree.y)-cz*12);dummy.rotation.x=-Math.PI/2;dummy.scale.setScalar(tree.size);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);}
      contacts.computeBoundingSphere();chunk.add(contacts);chunk.userData.levels=levels;forestChunks.push(chunk);
    }
  }
  for (let i = 0; i < 100; i++) {
    const x = (random() - 0.5) * 110, z = (random() - 0.5) * 105;
    if (Math.abs(x) < 5 && z > -6 && z < 9) continue;
    const size = 0.15 + random() * 0.4;
    const rock = ball(scene, '#9b9b82', x, size * 0.35, z, size, size * 0.65, size * 0.8);rock.rotation.y = random() * 6;
  }
  // Instanced grass keeps the decorative ground inexpensive on mobile GPUs.
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.24, 3), mat('#74b92e'), 900);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 900; i++) {
    const x = (random() - 0.5) * 120, z = (random() - 0.5) * 115;
    dummy.position.set(x, Math.abs(x) < 2.1 && z > -5 ? -1 : 0.1, z);dummy.rotation.y = random() * 6;dummy.updateMatrix();grass.setMatrixAt(i, dummy.matrix);
  }
  scene.add(grass);
  for(let i=0;i<28;i++){
    const x=(random()-.5)*28,z=(random()-.5)*20;
    if(Math.abs(x)<5&&z<4&&z>-6)continue;
    for(let j=0;j<3;j++)ball(scene,i%3?'#ffd85a':'#fff7d3',x+j*.12,.14,z+j*.1,.065);
  }

  function fence(x1, z1, x2, z2) {
    const length = Math.hypot(x2-x1,z2-z1), f = group(scene, x1, 0, z1);f.rotation.y = Math.atan2(x2-x1,z2-z1);
    for (const y of [0.36,0.82]) box(f,'#73543a',0,y,length/2,0.12,0.13,length+0.1);
    for(let d=0;d<=length;d+=.38){box(f,'#ab8557',0,.58,d,.22,1.15,.19);mesh(f,coneGeo,'#c09a64',0,1.23,d,[.17,.25,.15]);}
  }
  fence(-5.25,-3,-5.25,1);fence(5.25,-3,5.25,1);fence(-5.25,1,-1.6,1);fence(1.6,1,5.25,1);
  for(const x of [-1.65,1.65]){cylinder(scene,'#79573a',x,.7,1,.15,1.4);ball(scene,'#d6b973',x,1.45,1,.2);}
  // Cottage: solid walls, a gabled tiled roof, timber framing and a moving banner.
  const house = group(scene, 0, 0, wz(240));
  box(house,'#918c75',0,.13,0,4,.26,3.6);
  box(house,'#ead4a1',0,1.18,0,3.7,2.1,3.2);
  for(const x of [-1.77,1.77])for(const z of [-1.52,1.52])box(house,'#72583c',x,1.2,z,.16,2.3,.16);
  for(const y of [.32,2.15])box(house,'#8e704b',0,y,1.63,3.72,.14,.14);
  box(house,'#4d4935',-.55,.92,1.65,.85,1.65,.12);
  box(house,'#84613d',-.55,.86,1.73,.66,1.45,.09);
  for(const x of [-.75,-.54,-.33])box(house,'#725234',x,.86,1.79,.025,1.43,.035);
  ball(house,'#edca6a',-.36,.87,1.83,.055);
  box(house,'#594b39',.95,1.3,1.65,.91,.9,.15);
  box(house,'#a6e6db',.95,1.3,1.74,.7,.7,.03);
  box(house,'#e6c88d',.95,1.3,1.79,.065,.8,.07);
  box(house,'#e6c88d',.95,1.3,1.79,.8,.065,.07);
  for(const x of [.36,1.54]){const shutter=box(house,'#3ba7a1',x,1.3,1.78,.25,.8,.09);shutter.rotation.y=x<1?-.25:.25;}
  for(const side of [-1,1]){
    const roof=box(house,side<0?'#d95730':'#ef7740',side*.99,2.72,0,2.44,.18,3.85);roof.rotation.z=side*-.53;
    for(let i=0;i<6;i++){
      const strip=box(house,'#8c543b',side*.99,2.83,-1.78+i*.67,2.45,.035,.035);strip.rotation.z=side*-.53;
    }
  }
  box(house,'#754b36',0,3.37,0,.16,.14,4.02);
  const gableShape=new THREE.Shape();gableShape.moveTo(-1.82,0);gableShape.lineTo(0,1.08);gableShape.lineTo(1.82,0);gableShape.closePath();
  const gable=new THREE.Mesh(new THREE.ShapeGeometry(gableShape),mat('#dfc797'));gable.position.set(0,2.18,1.61);house.add(gable);
  for(const side of [-1,1]){const beam=box(house,'#72583c',side*.9,2.72,1.73,2.15,.12,.12);beam.rotation.z=side*-.53;}
  box(house,'#72583c',0,2.68,1.72,.1,1.1,.12);
  box(house,'#8b8a77',1.06,3.12,-.8,.48,.94,.48);box(house,'#b5ad91',1.06,3.62,-.8,.62,.16,.62);
  cylinder(house,'#725a3d',-1.5,3.38,-.7,.045,2.2);
  const banner=box(house,'#e6bb50',-1.06,4.12,-.7,.85,.48,.045);
  box(house,'#bc8c39',-1.06,4.12,-.663,.09,.3,.015);
  const step=box(house,'#b0a68b',-.5,.12,2,1.3,.22,.6);step.castShadow=false;
  for(let i=0;i<3;i++)box(house,'#c0ae7f',-2.2+i*.3,.08,2.2,.25,.12,.27);
  const barrels=group(house,-2.25,0,.6);
  for(const [x,z]of[[0,0],[.3,.7]]){cylinder(barrels,'#ad8350',x,.38,z,.3,.72);for(const y of [.17,.58])cylinder(barrels,'#625e4a',x,y,z,.312,.06);}
  for(const [x,z] of [[1.35,2.12],[-1.65,1.9]]){
    cylinder(house,'#d86d43',x,.22,z,.25,.42);
    cylinder(house,'#f0975c',x,.43,z,.29,.1);
    for(let i=0;i<3;i++){
      const px=x+(i-1)*.13,py=.66+(i%2)*.16;
      cylinder(house,'#63ae37',px,(py+.45)/2,z,.025,py-.4);
      for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball(house,'#ff91b1',px+Math.sin(a)*.065,py+Math.cos(a)*.065,z,.046);}
      ball(house,'#ffda49',px,py,z+.04,.04);
    }
  }
  const fortifications = group(house);
  for(const x of [-2,2])for(const z of [-1.7,1.7]){
    box(fortifications,'#909a8b',x,.6,z,.55,1.2,.6);
    for(const ox of [-.2,.2])box(fortifications,'#b6bfac',x+ox,1.3,z,.17,.3,.6);
  }
  const smoke=[];
  for(let i=0;i<4;i++){
    const sm=new THREE.Mesh(sphereGeo,new THREE.MeshStandardMaterial({color:'#e0dfc6',transparent:true,opacity:.18,depthWrite:false,flatShading:true}));house.add(sm);smoke.push(sm);
  }

  const bowCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.35,0),new THREE.Vector3(.12,-.15,.08),new THREE.Vector3(.15,.15,.08),new THREE.Vector3(0,.35,0)]);
  const bowGeo=geometry('bow',()=>new THREE.TubeGeometry(bowCurve,8,.035,4,false));
  const softBoxGeo=geometry('softBox',()=>new RoundedBoxGeometry(1,1,1,2,.13));
  const headGeo=geometry('head',()=>new THREE.SphereGeometry(1,16,12));
  const softBox=(p,c,x,y,z,sx,sy,sz)=>mesh(p,softBoxGeo,c,x,y,z,[sx,sy,sz]);
  const softBall=(p,c,x,y,z,sx,sy=sx,sz=sx)=>mesh(p,headGeo,c,x,y,z,[sx,sy,sz]);
  const smileCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.065,1.03,.296),new THREE.Vector3(0,1.012,.318),new THREE.Vector3(.065,1.03,.296)]);
  const smileGeo=geometry('smile',()=>new THREE.TubeGeometry(smileCurve,7,.012,4,false));
  function character(type){
    const g=group(scene),king=type==='king',enemy=type==='enemy';
    const civilian=type==='survivor'||type==='builder';
    const color=enemy?'#ee4352':king?'#238de8':civilian?'#d6b57d':'#75bd52';
    const legs=[],arms=[];
    for(const x of [-.13,.13]){
      const leg=group(g,x,.34,0);
      softBox(leg,enemy?'#742b39':'#344752',0,-.1,0,.18,.3,.2);
      softBox(leg,'#634b35',0,-.265,.06,.22,.15,.31);legs.push(leg);
    }
    // Uniform dimensions: the old cylinder's depth was overwritten instead of scaled.
    const body=softBox(g,color,0,.65,0,.57,.55,.41);
    softBox(g,'#73502e',0,.48,0,.6,.075,.43);
    softBox(g,'#f8ce49',0,.49,.235,.13,.11,.045);
    softBall(g,'#ffd39f',0,1.15,0,.34,.35,.31);
    softBall(g,enemy?'#9e3540':'#754b30',0,1.38,-.065,.32,.15,.265);
    softBall(g,'#f0ad80',0,1.15,.303,.07,.065,.065);
    for(const x of [-.115,.115]){
      softBall(g,'#293d43',x,1.22,.282,.046,.061,.032);
      softBall(g,'#ffffff',x-.012,1.24,.311,.014);
      softBall(g,'#f29b8e',Math.sign(x)*.23,1.105,.246,.055,.027,.018);
    }
    mesh(g,smileGeo,'#a75d47',0,0,0);
    for(const x of [-.355,.355]){
      const arm=group(g,x,.85,0);
      softBox(arm,color,0,-.09,0,.205,.3,.225);
      softBall(arm,'#ffd39f',0,-.28,.03,.108);arms.push(arm);
    }
    let cape;
    if(king){
      cape=softBox(g,'#b52d48',0,.64,-.245,.55,.63,.075);cape.rotation.x=-.13;
      cylinder(g,'#ffd134',0,1.48,0,.35,.14,.35);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3,x=Math.sin(a)*.29,z=Math.cos(a)*.29;
        mesh(g,coneGeo,'#ffe454',x,1.66,z,[.075,.25,.075],.3);
        softBall(g,'#fff087',x,1.8,z,.043);
      }
      softBall(g,'#ff5b70',0,1.5,.354,.065,.065,.03);
      softBox(g,'#ffdf64',0,.73,.22,.075,.3,.045);
      for(const x of [-.29,.29]){
        softBall(g,'#d5e0d5',x,.94,0,.15,.09,.2);
        softBox(g,'#ffcf57',x,.97,.08,.19,.04,.25);
      }
      const clasp=mesh(g,geometry('clasp',()=>new THREE.TorusGeometry(.11,.025,5,12)),'#ffdf64',0,.82,.24);
      softBall(g,'#64dfd6',0,.82,.27,.06,.075,.035);
      softBox(g,'#a37342',-.2,.91,-.3,.2,.65,.2);
      for(let i=0;i<3;i++){const shaft=box(g,'#e6cf9a',-.28+i*.07,1.32,-.31,.025,.55,.025);softBox(g,'#faf1d0',-.28+i*.07,1.61,-.31,.075,.13,.035);}
      for(const x of [-.11,.11])softBox(g,'#b78c42',x,.3,.13,.1,.04,.03);

    }else if(enemy){
      softBall(g,'#b52d48',0,1.45,-.035,.35,.15,.3);
      for(const x of [-.29,.29]){
        const horn=mesh(g,coneGeo,'#ffe1b0',x,1.53,0,[.075,.28,.075]);horn.rotation.z=x<0?.6:-.6;
      }
      softBox(g,'#dbe9e5',.42,.76,.14,.1,.66,.07);
      softBox(g,'#a37342',.42,.43,.14,.28,.07,.12);
    }else if(civilian){
      softBall(g,'#876a46',0,1.4,-.07,.35,.17,.3);
      softBox(g,type==='builder'?'#597c59':'#95764e',0,.65,.23,.36,.4,.035);
      softBox(g,'#84613d',-.2,.78,-.28,.3,.4,.18);
    }else{
      softBall(g,'#315668',0,1.43,-.04,.35,.16,.3);
      softBox(g,'#e8e0b5',0,.7,.23,.1,.3,.03);
      softBox(g,'#a37342',-.22,.86,-.25,.19,.5,.19);
    }
    if(!enemy&&!civilian){
      const bow=group(g,.43,.8,.17);mesh(bow,bowGeo,'#a37342',0,0,0);
      box(bow,'#fff0c4',0,0,0,.015,.7,.015);
    }
    const health=group(g,0,2.04,0);
    box(health,'#543b36',0,0,0,.65,.09,.035);
    const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    batch(g,[...legs,...arms,health,...(cape?[cape]:[])]);
    g.userData={body,cape,legs,arms,health,healthFill,lastX:undefined,lastZ:undefined,phase:Math.random()*6};
    return g;
  }
  const settlement=group(scene),housing=group(settlement);
  function tent(parent,x,z,color='#d6c58c'){
    const t=group(parent,x,0,z);
    for(const side of [-1,1]){const cloth=box(t,color,side*.45,.65,0,1.25,.06,1.65);cloth.rotation.z=side*-.8;}
    box(t,'#71543d',0,.55,.82,.06,1.1,.06);box(t,'#71543d',0,1.12,0,.06,.06,1.85);return t;
  }
  for(const [x,z]of[[-3,3.5],[3,3.5],[-4,5.8],[4,5.8]])tent(settlement,x,z);
  for(const x of [-7.5,7.5]){
    const hut=group(housing,x,0,4.3);
    box(hut,'#ead4a1',0,.7,0,2.5,1.4,2.2);
    for(const side of [-1,1]){const roof=box(hut,'#d95730',side*.68,1.85,0,1.65,.13,2.55);roof.rotation.z=side*-.53;}
    box(hut,'#754b36',0,2.29,0,.1,.1,2.65);box(hut,'#84613d',0,.52,1.13,.6,1.05,.08);
    for(const z of [-1.08,1.08])for(const side of [-1,1])box(hut,'#72583c',side*1.2,.75,z,.12,1.5,.12);
  }
  batch(housing);
  const camps=new Map();
  function fire(parent,x=0,z=0){
    for(let i=0;i<5;i++){const a=i*1.26;ball(parent,'#9b9b82',x+Math.sin(a)*.3,.08,z+Math.cos(a)*.3,.12,.08,.12);}
    const flames=group(parent,x,.1,z);
    const outer=new THREE.Mesh(coneGeo,new THREE.MeshBasicMaterial({color:'#ff9d36'}));outer.scale.set(.19,.55,.19);outer.position.y=.25;flames.add(outer);
    const inner=new THREE.Mesh(coneGeo,new THREE.MeshBasicMaterial({color:'#ffe886'}));inner.scale.set(.11,.36,.11);inner.position.set(0,.2,.08);flames.add(inner);return flames;
  }
  for(const p of RESCUE_SITES){
    const c=group(scene,wx(p.x),0,wz(p.y));tent(c,-1.3,-.7);const flames=fire(c,.5,.5);
    const npc=character('survivor');scene.remove(npc);c.add(npc);npc.position.set(.7,0,-.15);
    const marker=mesh(c,coneGeo,'#ffdb69',.7,2.5,-.15,[.11,.32,.11]);marker.rotation.z=Math.PI;
    camps.set(p.id,{root:c,npc,marker,flames});
  }
  for(const p of LANDMARKS){
    const ruin=group(scene,wx(p.x),0,wz(p.y));
    if(p.kind==='ruins'){
      for(let i=0;i<5;i++){box(ruin,'#909a8b',-1.5+i*.6,.4+(.5*(i%2)),.3,.55,.8+(i%2),.6);box(ruin,'#b6bfac',-1.2+i*.6,.15,-1,.5,.3,.5);}
      cylinder(ruin,'#8b8a77',1.3,.9,-.8,.22,1.8);box(ruin,'#b52d48',1.65,1.5,-.8,.6,.4,.05);
    }else if(p.kind==='stones'){for(let i=0;i<5;i++){const a=i*1.26;const stone=ball(ruin,'#909a8b',Math.sin(a)*1.5,.6,Math.cos(a)*1.5,.4,.9,.35);stone.rotation.z=Math.sin(a)*.2;}}
    else if(p.kind==='oak'){
      const model=treeModel('oak');model.position.set(-1,0,-1);model.scale.setScalar(1.7);ruin.add(model);
    }
    const chest=box(ruin,'#ad8350',.5,.3,.5,.85,.6,.6);for(const x of [.2,.8])box(ruin,'#efc654',x,.32,.5,.08,.65,.64);box(ruin,'#efc654',.5,.35,.82,.13,.15,.04);
  }
  const mount=group(scene);
  const horseLegs=[];
  const horseBody=mesh(mount,softBoxGeo,'#b57a4a',0,1,0,[.68,.65,1.35]);
  softBall(mount,'#bf8651',0,1.02,.5,.34,.37,.4);
  for(const x of [-.23,.23])for(const z of [-.45,.45]){
    const leg=group(mount,x,.95,z);softBox(leg,'#9b6035',0,-.35,0,.15,.7,.16);softBox(leg,'#eedbb7',0,-.67,0,.16,.2,.17);softBox(leg,'#44372e',0,-.85,.03,.19,.15,.23);horseLegs.push(leg);
  }
  const neck=softBox(mount,'#bf8651',0,1.4,.58,.42,.85,.5);neck.rotation.x=-.4;
  const horseHead=group(mount,0,1.88,.83);
  softBox(horseHead,'#ba7a46',0,0,.12,.4,.5,.63);softBox(horseHead,'#dfb78b',0,-.12,.4,.38,.25,.25);
  softBox(horseHead,'#fff1d8',0,.02,.43,.11,.28,.03);
  for(const side of [-1,1]){
    const ear=mesh(horseHead,coneGeo,'#a26737',side*.14,.38,-.07,[.09,.35,.08]);ear.rotation.z=side*-.15;
    softBall(horseHead,'#28352e',side*.205,.08,.22,.025,.05,.05);softBall(horseHead,'#ffffff',side*.218,.095,.23,.012);
    softBox(horseHead,'#604833',side*.21,-.1,.2,.025,.05,.43);
  }
  for(let i=0;i<6;i++)softBox(mount,'#4a352b',0,1.35+i*.12,.35+i*.06,.18,.25,.15);
  const tail=softBox(mount,'#4a352b',0,.9,-.85,.16,.75,.2);tail.rotation.x=.45;
  softBox(mount,'#b52d48',0,1.31,-.05,.8,.12,.8);softBox(mount,'#654332',0,1.43,-.05,.59,.18,.6);
  for(const x of [-.4,.4]){box(mount,'#71543d',x,1.03,-.05,.035,.6,.07);const stirrup=mesh(mount,geometry('stirrup',()=>new THREE.TorusGeometry(.09,.018,5,12)),'#c6c4a3',x,.72,-.02);}
  batch(mount,[...horseLegs,horseHead,tail]);
  batch(scene,[banner,fortifications,settlement,mount,...[...camps.values()].map(c=>c.root)]);

  const king = character('king');
  const selection=new THREE.Mesh(new THREE.RingGeometry(.55,.59,40),new THREE.MeshBasicMaterial({color:'#fff1b1',transparent:true,opacity:.85,depthWrite:false}));
  selection.rotation.x=-Math.PI/2;scene.add(selection);
  function coin(){
    const g=group(scene),disc=cylinder(g,'#ffcc24',0,0,0,.2,.075,.65);disc.rotation.x=Math.PI/2;
    const ringGeo=geometry('coinRing',()=>new THREE.TorusGeometry(.15,.018,4,14));
    for(const z of [-.046,.046])mesh(g,ringGeo,'#fff18a',0,0,z,[1,1,1],.5);
    box(g,'#c18512',0,0,.055,.05,.18,.02,.4);return g;
  }
  function arrow(){
    const g=group(scene);const shaft=box(g,'#cdb078',0,0,0,.035,.035,.65);shaft.castShadow=false;
    const tip=mesh(g,coneGeo,'#dfe5df',0,0,.4,[.09,.2,.09],.35);tip.rotation.x=Math.PI/2;
    box(g,'#eee6d0',0,0,-.26,.18,.025,.14);return g;
  }
  const collections={allies:new Map(),enemies:new Map(),coins:new Map(),arrows:new Map(),particles:new Map(),followers:new Map(),caravans:new Map()};
  function sync(map,items,make,animate){
    const alive=new Set(items);
    for(const [item,m]of map)if(!alive.has(item)){m.traverse(child=>{if(child.userData.ownedGeometry)child.geometry.dispose();});scene.remove(m);map.delete(item);}
    for(const item of items){let m=map.get(item);if(!m){m=make(item);map.set(item,m);}animate(m,item);}
  }
  function pose(g,p,time,mounted=false){
    const x=wx(p.x),z=wz(p.y),d=g.userData;
    const moving=d.lastX!==undefined&&Math.hypot(x-d.lastX,z-d.lastZ)>.002;
    if(moving&&p.aim===undefined)g.rotation.y=Math.atan2(x-d.lastX,z-d.lastZ);
    if(p.aim!==undefined)g.rotation.y=p.aim;
    d.health.visible=p.maxHp!==undefined&&p.hp<p.maxHp;
    if(d.health.visible){const ratio=Math.max(0,p.hp/p.maxHp);d.healthFill.scale.x=.58*ratio;d.healthFill.position.x=-(1-ratio)*.29;d.health.quaternion.copy(g.quaternion).invert().multiply(camera.quaternion);}
    d.lastX=x;d.lastZ=z;g.position.set(x,(mounted?1.15:0)+Math.max(0,Math.sin(time*11+d.phase))*(moving?.065:.008),z);
    if(d.cape)d.cape.rotation.x=-.13+Math.sin(time*3)*.04;
    for(let i=0;i<2;i++){d.legs[i].position.x=(i?1:-1)*(mounted?.3:.13);d.legs[i].rotation.x=mounted?-.7:moving?Math.sin(time*11+i*Math.PI)*.5:0;d.arms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.15:-.08;}
  }
  let aspect=1,lastWidth=0,lastHeight=0,frames=0,animationTime=0,zoom=1,lastZoom=0,horseLast=null;
  function render(state,time,paused){
    if(!paused)animationTime=time;
    const rect=canvas.getBoundingClientRect();
    if(rect.width!==lastWidth||rect.height!==lastHeight||zoom!==lastZoom){
      lastZoom=zoom;lastWidth=rect.width;lastHeight=rect.height;aspect=rect.width/Math.max(1,rect.height);
      renderer.setSize(rect.width,rect.height,false);
      const height=Math.max(14,Math.min(25,17/Math.sqrt(aspect)))/zoom;
      camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    }
    // Follow the king, while leaving enough room above him to see incoming danger.
    const tx=wx(state.king.x),tz=wz(state.king.y)-1.4;
    const target=new THREE.Vector3(tx,.35,tz);
    camera.position.set(tx+Math.sin(CAMERA_YAW)*23,27,tz+Math.cos(CAMERA_YAW)*23);camera.lookAt(target);camera.updateMatrixWorld();
    pose(king,state.king,animationTime,state.king.mounted);
    const texel=46/(mobile?1024:1536),lightDir=new THREE.Vector3(-12,24,12).normalize(),right=new THREE.Vector3(0,1,0).cross(lightDir).normalize(),up=lightDir.clone().cross(right);
    const shadowTarget=new THREE.Vector3(tx,0,tz);shadowTarget.addScaledVector(right,Math.round(shadowTarget.dot(right)/texel)*texel-shadowTarget.dot(right));shadowTarget.addScaledVector(up,Math.round(shadowTarget.dot(up)/texel)*texel-shadowTarget.dot(up));
    sun.target.position.copy(shadowTarget);sun.target.updateMatrixWorld();sun.position.copy(shadowTarget).add(new THREE.Vector3(-12,24,12));
    for(const chunk of forestChunks){const d=Math.hypot(chunk.position.x+6-tx,chunk.position.z+6-tz);chunk.visible=d<46;chunk.userData.levels[0].visible=d<15;chunk.userData.levels[1].visible=d>=15;}
    const horseMoving=horseLast&&Math.hypot(state.horse.x-horseLast.x,state.horse.y-horseLast.y)>.1;
    mount.position.set(wx(state.horse.x),horseMoving?Math.abs(Math.sin(animationTime*12))*.035:0,wz(state.horse.y));mount.rotation.y=state.horse.aim||0;
    for(let i=0;i<horseLegs.length;i++)horseLegs[i].rotation.x=horseMoving?Math.sin(animationTime*12+(i%3)*Math.PI)*.5:0;
    tail.rotation.z=Math.sin(animationTime*2)*.12;horseHead.rotation.x=state.king.mounted?0:.1+Math.sin(animationTime)*.08;horseLast={...state.horse};
    for(const p of state.camps){const c=camps.get(p.id);c.root.visible=Math.hypot(wx(p.x)-tx,wz(p.y)-tz)<38;c.npc.visible=!p.rescued;c.marker.visible=!p.rescued;c.marker.position.y=2.5+Math.sin(animationTime*2)*.13;c.flames.scale.y=1+Math.sin(animationTime*9)*.12;}
    settlement.visible=state.fort>0;housing.visible=state.fort>1;
    selection.position.set(wx(state.king.x),.055,wz(state.king.y));
    fortifications.visible=state.fort>0;
    banner.rotation.y=Math.sin(animationTime*2)*.12;
    for(let i=0;i<smoke.length;i++){const life=(animationTime*.28+i*.25)%1;smoke[i].position.set(1.06+life*.5,3.72+life*1.7,-.8);smoke[i].scale.setScalar(.18+life*.3);smoke[i].material.opacity=(1-life)*.18;}
    sync(collections.allies,state.allies,p=>character(p.role==='archer'?'ally':'builder'),(m,p)=>pose(m,p,animationTime));
    sync(collections.followers,state.followers,()=>character('survivor'),(m,p)=>pose(m,p,animationTime));
    sync(collections.caravans,state.caravans,()=>character('survivor'),(m,p)=>pose(m,p,animationTime));
    sync(collections.enemies,state.enemies,()=>character('enemy'),(m,p)=>{p.aim=Math.atan2(500-p.x,240-p.y);pose(m,p,animationTime);});
    sync(collections.coins,state.coins,coin,(m,p)=>{m.position.set(wx(p.x),.4+Math.sin(animationTime*5+p.x)*.07,wz(p.y));m.rotation.y=animationTime*2;});
    sync(collections.arrows,state.arrows,arrow,(m,p)=>{m.position.set(wx(p.x),p.height||1,wz(p.y));m.rotation.y=Math.atan2(p.vx,p.vy);});
    sync(collections.particles,state.particles,()=>ball(scene,'#f0ca67',0,0,0,.055),(m,p)=>m.position.set(wx(p.x),.5+p.life,wz(p.y)));
    renderer.render(scene,camera);frames++;
    canvas.dataset.renderer='webgl2';
  }
  function project(x,y,height=0){
    const v=new THREE.Vector3(wx(x),height,wz(y)).project(camera);
    return{x:(v.x+1)*lastWidth/2,y:(1-v.y)*lastHeight/2,width:lastWidth,height:lastHeight};
  }
  return{render,project,setZoom:value=>{zoom=value;},diagnostics:()=>({renderer:'webgl2',frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fortified:fortifications.visible,actors:1+collections.allies.size+collections.enemies.size,coins:collections.coins.size,arrows:collections.arrows.size,forestTrees:FOREST_TREES.length,mounted:!!king.position.y&&king.position.y>.7,followers:collections.followers.size,paintedTextures:painted.count,kingBodyDepth:king.userData.body.scale.z,kingBodyWidth:king.userData.body.scale.x})};
}
