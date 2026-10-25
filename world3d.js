import * as THREE from 'three';
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
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a1cf57');
  scene.fog = new THREE.Fog('#a1cf57', 45, 95);
  const camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.5, 100);
  const hemi = new THREE.HemisphereLight('#f0f9ff', '#67953f', 1.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d4', 2.6);
  sun.position.set(-12, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
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
  const clothColors=new Set(['#238de8','#1269bd','#ee4352','#b52d48','#e6bb50','#53a8e8','#75bd52']);
  const mat = (color, metalness = 0) => {
    const surface=woodColors.has(color)?'wood':plasterColors.has(color)?'plaster':stoneColors.has(color)?'stone':clothColors.has(color)?'cloth':['#ef7740','#d95730'].includes(color)?'roof':null;
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
  const terrain=box(scene, '#80965b', 0, -0.4, 0, 90, 0.75, 80);
  terrain.material=new THREE.MeshStandardMaterial({color:'#87d32f',map:painted.get('grass',22),roughness:1});
  const yard = cylinder(scene, '#b9b484', 0, -0.005, -2, 5.1, 0.07);yard.scale.z *= 0.8;yard.castShadow = false;yard.material=new THREE.MeshStandardMaterial({color:'#e1bf78',map:painted.get('dirt',3),roughness:1});
  const road = [];
  for (let i = 0; i <= 24; i++) { const z = -2 + i * 0.65;road.push([Math.sin(z * 0.55) * 0.65 - 1.1, z]); }
  for (let i = 24; i >= 0; i--) { const z = -2 + i * 0.65;road.push([Math.sin(z * 0.55) * 0.65 + 1.1, z]); }
  groundShape(road, '#c8b68a', 0.04);
  let seed = 77;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296; }
  function tree(x, z, size = 1, pine = true) {
    const t = group(scene, x, 0, z);t.scale.setScalar(size);
    cylinder(t, '#71543d', 0, 0.8, 0, 0.15, 1.6);
    if (pine) for (let i = 0; i < 3; i++) mesh(t, coneGeo, ['#49a82f', '#6ec832', '#9bdf42'][i], 0, 1.25 + i * 0.65, 0, [1.15 - i * 0.24, 1.65, 1.15 - i * 0.24]);
    else { ball(t, '#62be35', 0, 2.1, 0, 1.2);ball(t, '#91d63b', -0.65, 1.9, 0.25, 0.85);ball(t, '#b4e658', 0.45, 2.5, -0.1, 0.85); }
  }
  for (const [x, z, size] of [[-10,-6,1.3],[-8,-7,1],[8,-6,1.4],[11,-3,1.1],[-11,3,1],[10,7,1.2],[-9,8,1],[6,-8,0.9],[-14,-1,1.5],[14,3,1.3],[-6,-9,1],[14,-8,1.5]]) tree(x,z,size);
  for (const [x,z] of [[-8,4],[9,2],[-11,-3],[11,-7],[-7,9],[8,9]]) tree(x,z,0.8,false);
  for (let i = 0; i < 35; i++) {
    const x = (random() - 0.5) * 34, z = (random() - 0.5) * 27;
    if (Math.abs(x) < 5 && z > -6 && z < 9) continue;
    const size = 0.15 + random() * 0.4;
    const rock = ball(scene, '#9b9b82', x, size * 0.35, z, size, size * 0.65, size * 0.8);rock.rotation.y = random() * 6;
  }
  // Instanced grass keeps the decorative ground inexpensive on mobile GPUs.
  const grass = new THREE.InstancedMesh(new THREE.ConeGeometry(0.06, 0.24, 3), mat('#74b92e'), 260);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 260; i++) {
    const x = (random() - 0.5) * 36, z = (random() - 0.5) * 28;
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
    const color=enemy?'#ee4352':king?'#238de8':'#75bd52';
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
    if(king){
      const cape=softBox(g,'#b52d48',0,.64,-.245,.55,.63,.075);cape.rotation.x=-.13;
      cylinder(g,'#ffd134',0,1.48,0,.35,.14,.35);
      for(let i=0;i<6;i++){
        const a=i*Math.PI/3,x=Math.sin(a)*.29,z=Math.cos(a)*.29;
        mesh(g,coneGeo,'#ffe454',x,1.66,z,[.075,.25,.075],.3);
        softBall(g,'#fff087',x,1.8,z,.043);
      }
      softBall(g,'#ff5b70',0,1.5,.354,.065,.065,.03);
      softBox(g,'#ffdf64',0,.73,.22,.075,.3,.045);
    }else if(enemy){
      softBall(g,'#b52d48',0,1.45,-.035,.35,.15,.3);
      for(const x of [-.29,.29]){
        const horn=mesh(g,coneGeo,'#ffe1b0',x,1.53,0,[.075,.28,.075]);horn.rotation.z=x<0?.6:-.6;
      }
      softBox(g,'#dbe9e5',.42,.76,.14,.1,.66,.07);
      softBox(g,'#a37342',.42,.43,.14,.28,.07,.12);
    }else{
      softBall(g,'#315668',0,1.43,-.04,.35,.16,.3);
      softBox(g,'#e8e0b5',0,.7,.23,.1,.3,.03);
      softBox(g,'#a37342',-.22,.86,-.25,.19,.5,.19);
    }
    if(!enemy){
      const bow=group(g,.43,.8,.17);mesh(bow,bowGeo,'#a37342',0,0,0);
      box(bow,'#fff0c4',0,0,0,.015,.7,.015);
    }
    const health=group(g,0,2.04,0);
    box(health,'#543b36',0,0,0,.65,.09,.035);
    const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    batch(g,[...legs,...arms,health]);
    g.userData={body,legs,arms,health,healthFill,lastX:undefined,lastZ:undefined,phase:Math.random()*6};
    return g;
  }
  batch(scene,[banner,fortifications]);
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
  const collections={allies:new Map(),enemies:new Map(),coins:new Map(),arrows:new Map(),particles:new Map()};
  function sync(map,items,make,animate){
    const alive=new Set(items);
    for(const [item,m]of map)if(!alive.has(item)){m.traverse(child=>{if(child.userData.ownedGeometry)child.geometry.dispose();});scene.remove(m);map.delete(item);}
    for(const item of items){let m=map.get(item);if(!m){m=make(item);map.set(item,m);}animate(m,item);}
  }
  function pose(g,p,time,isKing=false){
    const x=wx(p.x),z=wz(p.y),d=g.userData;
    const moving=d.lastX!==undefined&&Math.hypot(x-d.lastX,z-d.lastZ)>.002;
    if(moving&&p.aim===undefined)g.rotation.y=Math.atan2(x-d.lastX,z-d.lastZ);
    if(p.aim!==undefined)g.rotation.y=p.aim;
    d.health.visible=p.maxHp!==undefined&&p.hp<p.maxHp;
    if(d.health.visible){const ratio=Math.max(0,p.hp/p.maxHp);d.healthFill.scale.x=.58*ratio;d.healthFill.position.x=-(1-ratio)*.29;d.health.quaternion.copy(g.quaternion).invert().multiply(camera.quaternion);}
    d.lastX=x;d.lastZ=z;g.position.set(x,Math.max(0,Math.sin(time*11+d.phase))*(moving?.065:.008),z);
    for(let i=0;i<2;i++){d.legs[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.5:0;d.arms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.15:-.08;}
  }
  let aspect=1,lastWidth=0,lastHeight=0,frames=0,animationTime=0;
  function render(state,time,paused){
    if(!paused)animationTime=time;
    const rect=canvas.getBoundingClientRect();
    if(rect.width!==lastWidth||rect.height!==lastHeight){
      lastWidth=rect.width;lastHeight=rect.height;aspect=rect.width/Math.max(1,rect.height);
      renderer.setSize(rect.width,rect.height,false);
      const height=Math.max(12,Math.min(20,14/Math.sqrt(aspect)));
      camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    }
    // Follow the king, while leaving enough room above him to see incoming danger.
    const tx=wx(state.king.x)*(aspect<1?1:.72),tz=wz(state.king.y)-1.4;
    const target=new THREE.Vector3(tx,.35,tz);
    camera.position.set(tx+Math.sin(CAMERA_YAW)*23,22,tz+Math.cos(CAMERA_YAW)*23);camera.lookAt(target);camera.updateMatrixWorld();
    pose(king,state.king,animationTime,true);
    selection.position.set(wx(state.king.x),.055,wz(state.king.y));
    fortifications.visible=state.fort>0;
    banner.rotation.y=Math.sin(animationTime*2)*.12;
    for(let i=0;i<smoke.length;i++){const life=(animationTime*.28+i*.25)%1;smoke[i].position.set(1.06+life*.5,3.72+life*1.7,-.8);smoke[i].scale.setScalar(.18+life*.3);smoke[i].material.opacity=(1-life)*.18;}
    sync(collections.allies,state.allies,()=>character('ally'),(m,p)=>pose(m,p,animationTime));
    sync(collections.enemies,state.enemies,()=>character('enemy'),(m,p)=>{p.aim=Math.atan2(500-p.x,240-p.y);pose(m,p,animationTime);});
    sync(collections.coins,state.coins,coin,(m,p)=>{m.position.set(wx(p.x),.4+Math.sin(animationTime*5+p.x)*.07,wz(p.y));m.rotation.y=animationTime*2;});
    sync(collections.arrows,state.arrows,arrow,(m,p)=>{m.position.set(wx(p.x),.9,wz(p.y+12));m.rotation.y=Math.atan2(p.vx,p.vy);});
    sync(collections.particles,state.particles,()=>ball(scene,'#f0ca67',0,0,0,.055),(m,p)=>m.position.set(wx(p.x),.5+p.life,wz(p.y)));
    renderer.render(scene,camera);frames++;
    canvas.dataset.renderer='webgl2';
  }
  function project(x,y,height=0){
    const v=new THREE.Vector3(wx(x),height,wz(y)).project(camera);
    return{x:(v.x+1)*lastWidth/2,y:(1-v.y)*lastHeight/2,width:lastWidth,height:lastHeight};
  }
  return{render,project,diagnostics:()=>({renderer:'webgl2',frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fortified:fortifications.visible,actors:1+collections.allies.size+collections.enemies.size,coins:collections.coins.size,arrows:collections.arrows.size,paintedTextures:painted.count,kingBodyDepth:king.userData.body.scale.z,kingBodyWidth:king.userData.body.scale.x})};
}
