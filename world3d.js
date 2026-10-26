import * as THREE from 'three';
import {FOREST_TREES,RESCUE_SITES,LANDMARKS} from './world-data.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {createPaintedTextures} from './painted-textures.js';
import {createRoyalModels} from './royal-models.js';
import {BUILDINGS,RESOURCE_NODES} from './kingdom-data.js';

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
  renderer.toneMappingExposure = 1.08;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bacbb2');
  scene.fog = new THREE.Fog('#bacbb2', 45, 88);
  const camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.5, 160);
  const hemi = new THREE.HemisphereLight('#dae9ff', '#8d8064', 1.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff1d9', 3.1);
  sun.position.set(-12, 24, 12);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 1536, mobile ? 1024 : 1536);
  Object.assign(sun.shadow.camera, { left: -23, right: 23, top: 23, bottom: -23, near: 0.5, far: 65 });
  sun.shadow.normalBias = 0.035;
  sun.shadow.radius = 3;
  sun.shadow.bias = -0.0002;
  scene.add(sun);
  const skyFill=new THREE.DirectionalLight('#b4d4f6',.55);skyFill.position.set(12,9,-10);scene.add(skyFill);
  // A tiny, locally painted sky supplies broad reflections on crowns, eyes and metal.
  // The PMREM is generated once; there are no screen-space effects or remote assets.
  const skyCanvas=document.createElement('canvas');skyCanvas.width=256;skyCanvas.height=128;
  const skyContext=skyCanvas.getContext('2d'),skyGradient=skyContext.createLinearGradient(0,0,0,128);
  skyGradient.addColorStop(0,'#b0c8e5');skyGradient.addColorStop(.4,'#edf2f0');skyGradient.addColorStop(.58,'#ede5d2');skyGradient.addColorStop(1,'#9e927e');
  skyContext.fillStyle=skyGradient;skyContext.fillRect(0,0,256,128);
  const skyGlow=skyContext.createRadialGradient(65,42,0,65,42,52);skyGlow.addColorStop(0,'#fff7e9');skyGlow.addColorStop(1,'#fff7e900');skyContext.fillStyle=skyGlow;skyContext.fillRect(0,0,128,105);
  const skyTexture=new THREE.CanvasTexture(skyCanvas);skyTexture.mapping=THREE.EquirectangularReflectionMapping;skyTexture.colorSpace=THREE.SRGBColorSpace;
  const skyGenerator=new THREE.PMREMGenerator(renderer),skyEnvironment=skyGenerator.fromEquirectangular(skyTexture);
  scene.environment=skyEnvironment.texture;scene.environmentIntensity=.38;skyTexture.dispose();skyGenerator.dispose();

  const painted=createPaintedTextures(renderer);
  const materials = new Map();
  const geometries = new Map();
  const batchMaterials=new Map();
  const woodColors=new Set(['#71543d','#73543a','#ab8557','#c09a64','#79573a','#72583c','#8e704b','#84613d','#725234','#754b36','#725a3d','#ad8350','#76553b','#a37342','#b8884c','#e4b56d','#674c37','#a98760','#876343']);
  const plasterColors=new Set(['#ead4a1','#dfc797','#ffe0a1','#e8ddbf','#eae1cd']);
  const stoneColors=new Set(['#918c75','#b0a68b','#8b8a77','#b5ad91','#909a8b','#b6bfac','#bdc2b5','#d7d2b4','#c5c0a8','#c6c8bb','#9b9b82','#a6aea0','#8c978d','#c4c8b9','#dedac1']);
  const foliageColors=new Set(['#3e8b36','#65b740','#9cd846','#6eb23d','#91c94b','#3f7350','#528650','#77a360','#96b56d','#476f49','#65945b','#a8bd7c','#4e7956','#6f995e']);
  const clothColors=new Set(['#238de8','#1269bd','#ee4352','#b52d48','#e6bb50','#53a8e8','#75bd52']);
  const mat = (color, metalness = 0, surfaceOverride=null) => {
    // Nearby metallic responses share a batch; the colored metal and all
    // sculpted details remain intact. Three levels cover embroidery, armor, gold.
    metalness=metalness>0?(metalness<.25?.15:metalness<.53?.4:.65):0;
    const surface=surfaceOverride||(['#3865a2','#4b7dbb','#31588d'].includes(color)?'slate':null)|| (foliageColors.has(color)?'foliage':woodColors.has(color)?'wood':plasterColors.has(color)?'plaster':stoneColors.has(color)?'stone':clothColors.has(color)?'cloth':['#ef7740','#d95730'].includes(color)?'roof':null);
    const key = `${color}:${metalness}:${surface||''}`;
    if (!materials.has(key)) {
      const tint=new THREE.Color(color);
      if(painted.colored&&['wood','stone','slate','plaster','roof'].includes(surface))tint.lerp(new THREE.Color('#ffffff'),.78);
      const bumpScale={wood:.025,stone:.035,slate:.04,plaster:.012,foliage:.014,cloth:.008,skin:0,leather:.006,metal:.003}[surface]??.015;
      materials.set(key,new THREE.MeshStandardMaterial({color:tint,map:surface?painted.get(surface):null,bumpMap:surface?painted.getBump?.(surface):null,bumpScale,roughnessMap:surface&&surface!=='skin'&&!metalness?painted.getRoughness?.(surface):null,flatShading:false,roughness:surface==='skin'?.76:metalness?.32:surface==='leather'?.86:.95,metalness,envMapIntensity:metalness?.85:.28}));
    }
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
  const bevelGeo=geometry('architectureBevel',()=>new RoundedBoxGeometry(1,1,1,2,.065));
  const sphereGeo = geometry('sphere', () => new THREE.IcosahedronGeometry(1, 2));
  const coneGeo = geometry('cone', () => new THREE.ConeGeometry(1, 1, 12));
  const cylinderGeo = geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 16));
  const box = (p, c, x, y, z, sx, sy, sz, metal = 0) => mesh(p, boxGeo, c, x, y, z, [sx, sy, sz], metal);
  const bevelBox=(p,c,x,y,z,sx,sy,sz,metal=0)=>mesh(p,bevelGeo,c,x,y,z,[sx,sy,sz],metal);
  const ball = (p, c, x, y, z, sx, sy = sx, sz = sx) => mesh(p, sphereGeo, c, x, y, z, [sx, sy, sz]);
  const cylinder = (p, c, x, y, z, radius, height, metal = 0) => mesh(p, cylinderGeo, c, x, y, z, [radius, height, radius], metal);
  function group(parent, x = 0, y = 0, z = 0) { const g = new THREE.Group();g.position.set(x, y, z);parent.add(g);return g; }
  // Merge immobile parts by material; share geometry and animate only limbs.
  function batch(root, exclusions = []) {
    root.updateWorldMatrix(true,true);
    const inverse=root.matrixWorld.clone().invert(),buckets=new Map();
    root.traverse(m=>{
      if(!m.isMesh||m.isInstancedMesh||Array.isArray(m.material)||m.material.transparent)return;
      for(let node=m;node&&node!==root;node=node.parent)if(exclusions.includes(node))return;
      const a=m.material;
      const materialKey=[a.type,a.map?.uuid||'',a.normalMap?.uuid||'',a.bumpMap?.uuid||'',a.bumpScale,a.roughnessMap?.uuid||'',a.roughness,a.metalness,a.envMapIntensity,a.side,a.flatShading,a.polygonOffset,a.polygonOffsetFactor,a.polygonOffsetUnits].join(':');
      const key=materialKey+':'+m.castShadow+':'+m.receiveShadow;
      if(!buckets.has(key))buckets.set(key,{materialKey,meshes:[]});buckets.get(key).meshes.push(m);
    });
    for(const {materialKey,meshes}of buckets.values()){
      if(meshes.length<2)continue;
      const parts=meshes.map(m=>{
        const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone(),old=g.getAttribute('color'),count=g.getAttribute('position').count,colors=new Float32Array(count*3),color=m.material.color;
        for(let i=0;i<count;i++){colors[i*3]=color.r*(old?old.getX(i):1);colors[i*3+1]=color.g*(old?old.getY(i):1);colors[i*3+2]=color.b*(old?old.getZ(i):1);}
        g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
        return g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));
      });
      const combined=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!combined)continue;
      if(!batchMaterials.has(materialKey)){const material=meshes[0].material.clone();material.color.set('#ffffff');material.vertexColors=true;batchMaterials.set(materialKey,material);}
      const m=new THREE.Mesh(combined,batchMaterials.get(materialKey));m.castShadow=meshes[0].castShadow;m.receiveShadow=meshes[0].receiveShadow;m.userData.ownedGeometry=true;
      meshes.forEach(old=>old.removeFromParent());root.add(m);
    }
  }
  // Soil fades into the meadow instead of ending in a bright geometric disc.
  function groundMask(path=false){
    const c=document.createElement('canvas');c.width=c.height=128;const context=c.getContext('2d'),pixels=context.createImageData(128,128);
    for(let y=0;y<128;y++)for(let x=0;x<128;x++){
      const u=(x-63.5)/63.5,v=(y-63.5)/63.5,a=Math.atan2(v,u),r=Math.hypot(u,v);
      const edge=path?Math.abs(u):r/(.85+.055*Math.sin(a*5)+.035*Math.cos(a*9));
      let opacity=Math.max(0,Math.min(1,(1-edge)/.28));opacity=opacity*opacity*(3-2*opacity);
      if(path)opacity*=Math.min(1,(1-Math.abs(v))*8);
      const index=(y*128+x)*4,value=Math.round(opacity*255);pixels.data[index]=pixels.data[index+1]=pixels.data[index+2]=value;pixels.data[index+3]=255;
    }
    context.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(c);texture.generateMipmaps=true;return texture;
  }
  const dirtMaterial=(mask,repeat)=>new THREE.MeshStandardMaterial({color:'#eee7d8',map:painted.get('dirt',repeat),bumpMap:painted.getBump?.('dirt',repeat),bumpScale:.025,roughnessMap:painted.getRoughness?.('dirt',repeat),alphaMap:mask,transparent:true,roughness:1,depthWrite:false});
  const terrain=box(scene, '#80965b', 0, -0.4, 0, 280, 0.75, 260);
  terrain.material=new THREE.MeshStandardMaterial({color:'#e1e6cc',map:painted.get('grass',76),bumpMap:painted.getBump?.('grass',76),bumpScale:.018,roughnessMap:painted.getRoughness?.('grass',76),roughness:1});terrain.castShadow=false;
  const yard=new THREE.Mesh(new THREE.PlaneGeometry(12,9.5),dirtMaterial(groundMask(),3));yard.rotation.x=-Math.PI/2;yard.position.set(0,-.009,-1.7);yard.receiveShadow=true;scene.add(yard);
  const roadPositions=[],roadUV=[],roadIndices=[],roadSegments=40;
  for(let i=0;i<=roadSegments;i++){
    const z=-2+i*.47,center=Math.sin(z*.38)*.62,width=1.26+Math.sin(z*.7)*.12;
    for(const side of [-1,1]){roadPositions.push(center+side*width,-.004,z);roadUV.push((side+1)/2,i/roadSegments*6);}
    if(i<roadSegments){const j=i*2;roadIndices.push(j,j+2,j+1,j+1,j+2,j+3);}
  }
  const roadGeometry=new THREE.BufferGeometry();roadGeometry.setAttribute('position',new THREE.Float32BufferAttribute(roadPositions,3));roadGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(roadUV,2));roadGeometry.setIndex(roadIndices);roadGeometry.computeVertexNormals();
  const roadMask=groundMask(true);roadMask.repeat.y=1/6;const road=new THREE.Mesh(roadGeometry,dirtMaterial(roadMask,1.01));road.receiveShadow=true;scene.add(road);
  let seed = 77;
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0;return seed / 4294967296; }
  function branch(parent,from,to,radius,color='#71543d'){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),delta=b.clone().sub(a);
    const m=cylinder(parent,color,(a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2,radius,delta.length());
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  const leafGeometry=geometry('roundedLeafCloud',()=>{
    const g=new THREE.SphereGeometry(1,12,8),positions=g.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),swell=1+.065*Math.sin(x*7+z*4)*Math.cos(y*5-z*3);
      positions.setXYZ(i,x*swell,y*(1+.035*Math.sin(z*8)),z*swell);
    }
    g.computeVertexNormals();return g;
  });
  const farLeafGeometry=geometry('distantLeafCloud',()=>new THREE.IcosahedronGeometry(1,1));
  const trunkGeometry=geometry('livingTrunk',()=>{
    const g=new THREE.CylinderGeometry(.105,.235,2.75,9,5),positions=g.getAttribute('position');
    for(let i=0;i<positions.count;i++){const y=positions.getY(i),t=(y+1.375)/2.75;positions.setX(i,positions.getX(i)+Math.sin(t*2.7)*.095);positions.setZ(i,positions.getZ(i)+t*t*.11);}
    g.computeVertexNormals();return g;
  });
  const pineGeometry=geometry('pineCanopy',()=>{
    const profile=[[0,1.2],[.35,1.3],[1.04,1.48],[1.13,1.66],[.82,2.05],[.98,2.18],[.72,2.68],[.78,2.81],[.46,3.29],[.52,3.42],[.26,3.91],[.21,4.08],[0,4.6]].map(([r,y])=>new THREE.Vector2(r,y));
    const g=new THREE.LatheGeometry(profile,12),positions=g.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),a=Math.atan2(z,x),swell=1+.08*Math.sin(a*5+y*2)+.035*Math.cos(a*3-y*4);
      positions.setXYZ(i,x*swell+.06*Math.sin(y),y+.05*Math.sin(a*3+y*2),z*swell);
    }
    g.computeVertexNormals();return g;
  });
  const fernLeafGeometry=geometry('fernLeaf',()=>{
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([0,.05,-1,-.55,0,-.36,.55,0,-.36,-.55,0,.36,.55,0,.36,0,.12,1,0,.24,0],3));g.setAttribute('uv',new THREE.Float32BufferAttribute([.5,0,.225,.32,.775,.32,.225,.68,.775,.68,.5,1,.5,.5],2));g.setIndex([0,1,6,0,6,2,1,3,6,2,6,4,3,5,6,4,6,5]);g.computeVertexNormals();return g;
  });
  function fern(parent,x,z,size=1){
    const f=group(parent,x,.025,z);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3,reach=.3*size;
      const leaf=mesh(f,fernLeafGeometry,i%2?'#528650':'#77a360',Math.sin(a)*reach*.52,.12*size,Math.cos(a)*reach*.52,[.065*size,.035*size,.25*size]);
      leaf.rotation.y=a;leaf.rotation.x=-.28;
      for(let j=1;j<3;j++){
        const r=j*.08*size;for(const side of [-1,1]){
          const blade=mesh(f,fernLeafGeometry,'#65945b',Math.sin(a)*r+Math.cos(a)*side*.06*size,(.12-j*.025)*size,Math.cos(a)*r-Math.sin(a)*side*.06*size,[.05*size,.019*size,.105*size]);blade.rotation.y=a+side*.6;
        }
      }
    }
    return f;
  }
  function treeModel(species){
    const t=group(scene);mesh(t,trunkGeometry,'#71543d',0,1.36,0);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+.2,r=.47+(i%2)*.12;
      branch(t,[.04,.29,.02],[Math.sin(a)*r*.6,.07,Math.cos(a)*r*.6],.095);
      branch(t,[Math.sin(a)*r*.6,.07,Math.cos(a)*r*.6],[Math.sin(a)*r,.005,Math.cos(a)*r],.045);
    }
    if(species==='pine'){
      mesh(t,pineGeometry,'#3f7350',0,0,0);
      for(let i=0;i<11;i++){
        const a=i*2.399,y=1.65+i*.225,r=1.04-i*.065;
        branch(t,[0,y+.1,0],[Math.sin(a)*r*.83,y-.12,Math.cos(a)*r*.83],.026);
        const bough=mesh(t,leafGeometry,['#528650','#65945b','#77a360'][i%3],Math.sin(a)*r*.69,y+.05,Math.cos(a)*r*.69,[r*.42,.19,r*.65]);bough.rotation.y=a;bough.rotation.x=-.16;
      }
      mesh(t,leafGeometry,'#96b56d',.01,4.2,.01,[.13,.32,.13]);
    }else{
      const crowns=[[-.7,2.65,.4,.9],[-.91,3.11,-.25,.87],[.85,2.8,.4,.98],[.7,3.45,-.4,.88],[.01,3.72,.01,1.02],[-.25,3.15,.88,.81],[.05,2.88,-.89,.82],[-.47,3.71,-.58,.74],[.2,3.7,.64,.73]];
      for(let i=0;i<crowns.length;i++){
        const[x,y,z,r]=crowns[i];branch(t,[.06,1.22,.06],[x*.75,y-.35,z*.75],.065-i*.002);
        const leaves=mesh(t,leafGeometry,['#476f49','#528650','#77a360','#65945b','#96b56d'][i%5],x,y,z,[r,r*.76,r*.9]);leaves.rotation.y=i*1.7;leaves.rotation.z=Math.sin(i)*.13;
      }
      fern(t,.62,.4,.75);
      cylinder(t,'#e8dab4',-.46,.1,.2,.032,.17);ball(t,'#c77758',-.46,.19,.2,.12,.055,.12);
      cylinder(t,'#e8dab4',-.61,.055,.13,.02,.1);ball(t,'#e5bd7c',-.61,.11,.13,.072,.035,.072);
    }
    batch(t);t.updateWorldMatrix(true,true);t.removeFromParent();return t;
  }
  function distantTree(species){
    const t=group(scene);cylinder(t,'#71543d',0,1.1,0,.16,2.2);
    if(species==='pine'){
      mesh(t,pineGeometry,'#4e7956',0,0,0);
      for(let i=0;i<4;i++){const a=i*2.4,r=.95-i*.14;mesh(t,farLeafGeometry,i%2?'#77a360':'#528650',Math.sin(a)*r*.6,1.7+i*.6,Math.cos(a)*r*.6,[r*.63,.3,r*.6]);}
    }else{
      const crowns=[[-.65,2.75,.2,.94],[.7,2.98,.25,1.06],[0,3.55,-.25,1.1],[-.42,3.4,-.65,.75],[.2,3.45,.72,.77]];
      for(let i=0;i<crowns.length;i++){const[x,y,z,r]=crowns[i];mesh(t,farLeafGeometry,['#528650','#77a360','#65945b'][i%3],x,y,z,[r,r*.83,r]);}
    }
    batch(t);t.updateWorldMatrix(true,true);t.removeFromParent();return t;
  }
  const contactCanvas=document.createElement('canvas');contactCanvas.width=contactCanvas.height=32;
  const contactContext=contactCanvas.getContext('2d'),gradient=contactContext.createRadialGradient(16,16,1,16,16,16);
  gradient.addColorStop(0,'#ffffffff');gradient.addColorStop(1,'#ffffff00');contactContext.fillStyle=gradient;contactContext.fillRect(0,0,32,32);
  const contactTexture=new THREE.CanvasTexture(contactCanvas),contactMaterial=new THREE.MeshBasicMaterial({color:'#304a32',map:contactTexture,transparent:true,opacity:.21,depthWrite:false});
  const forestChunks=[],forestInstances=[],treeIndices=new Map(FOREST_TREES.map((tree,i)=>[tree,i]));
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
          instances.castShadow=lod===0;instances.receiveShadow=true;instances.computeBoundingSphere();level.add(instances);forestInstances.push({mesh:instances,indices:trees.map(t=>treeIndices.get(t)),original:instances.instanceMatrix.array.slice()});
        });
      }
      const contacts=new THREE.InstancedMesh(new THREE.PlaneGeometry(3.2,3.2),contactMaterial,trees.length),dummy=new THREE.Object3D();
      for(let i=0;i<trees.length;i++){const tree=trees[i];dummy.position.set(wx(tree.x)-cx*12,.015,wz(tree.y)-cz*12);dummy.rotation.x=-Math.PI/2;dummy.scale.setScalar(tree.size);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);}
      contacts.computeBoundingSphere();chunk.add(contacts);forestInstances.push({mesh:contacts,indices:trees.map(t=>treeIndices.get(t)),original:contacts.instanceMatrix.array.slice()});chunk.userData.levels=levels;forestChunks.push(chunk);
    }
  }
  const fieldStoneGeometry=geometry('fieldStone',()=>{
    const g=new THREE.IcosahedronGeometry(1,1),positions=g.getAttribute('position');
    for(let i=0;i<positions.count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),shift=1+.11*Math.sin(x*6+z*7)*Math.cos(y*4);
      positions.setXYZ(i,x*shift,y*(.87+.08*Math.cos(x*5)),z*shift);
    }
    g.computeVertexNormals();return g;
  });
  for(let i=0;i<100;i++){
    const x=(random()-.5)*110,z=(random()-.5)*105;if(Math.abs(x)<5&&z>-6&&z<9)continue;
    const size=.15+random()*.4,rock=mesh(scene,fieldStoneGeometry,i%3?'#a6aea0':'#8c978d',x,size*.32,z,[size,size*.68,size*.82]);rock.rotation.y=random()*6;
    if(i%4===0){const moss=mesh(scene,leafGeometry,'#77a360',x-.035,size*.7,z,[size*.65,size*.09,size*.55]);moss.castShadow=false;}
    if(i%6===0)fern(scene,x+.4,z-.2,.8+random()*.5);
  }
  // Curved blades grow in small tufts and share one draw call across the map.
  const grassGeometry=geometry('meadowTuft',()=>{
    const parts=[];
    for(let i=0;i<4;i++){
      const blade=new THREE.BufferGeometry(),height=.18+i%3*.035;
      blade.setAttribute('position',new THREE.Float32BufferAttribute([-.026,0,0,.026,0,0,-.018,height*.58,.018,.018,height*.58,.018,.025,height,.065],3));blade.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.15,.58,.85,.58,.5,1],2));blade.setIndex([0,2,1,1,2,3,2,4,3]);blade.rotateY(i*2.2);blade.computeVertexNormals();parts.push(blade);
    }
    const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());return merged;
  });
  const grassMaterial=mat('#77a360').clone();grassMaterial.side=THREE.DoubleSide;
  const grass=new THREE.InstancedMesh(grassGeometry,grassMaterial,1400),dummy=new THREE.Object3D();
  for(let i=0;i<1400;i++){
    const x=(random()-.5)*120,z=(random()-.5)*115,pathX=Math.sin(z*.38)*.62;
    const clear=(Math.abs(x-pathX)<1.18&&z>-4&&z<16)||(Math.abs(x)<2.5&&z>-4.2&&z<.8);
    dummy.position.set(x,clear?-1:-.015,z);dummy.rotation.y=random()*6;dummy.scale.setScalar(.7+random()*.7);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);
    grass.setColorAt(i,new THREE.Color(['#a6b58a','#c4cba0','#8ea77c'][i%3]));
  }
  grass.receiveShadow=true;grass.computeBoundingSphere();scene.add(grass);
  const petalGeometry=geometry('flowerPetal',()=>new THREE.SphereGeometry(1,6,4));
  for(let i=0;i<40;i++){
    const x=(random()-.5)*40,z=(random()-.5)*30;if(Math.abs(x)<4.5&&z<3&&z>-6)continue;
    for(let j=0;j<3;j++){
      const px=x+j*.14,pz=z+Math.sin(j)*.12,py=.18+(j%2)*.08;
      branch(scene,[px,-.01,pz],[px,py,pz],.012,'#528650');
      for(let k=0;k<5;k++){const a=k*Math.PI*2/5;const petal=mesh(scene,petalGeometry,['#f5dd9c','#d9c9ea','#f3c2c6','#e8ead6'][i%4],px+Math.sin(a)*.057,py,pz+Math.cos(a)*.057,[.044,.022,.065]);petal.rotation.y=a;petal.castShadow=false;}
      const heart=ball(scene,'#d6a54f',px,py+.02,pz,.03,.02,.03);heart.castShadow=false;
    }
  }
  // Worn stepping stones lead to the hall; small verge stones break the path edge.
  for(let i=0;i<9;i++){
    const z=.35+i*.6,x=Math.sin(z*.38)*.62+(i%2?-.2:.22),stone=bevelBox(scene,'#c4c8b9',x,.007,z,.43,.045,.31);stone.rotation.y=Math.sin(i*2)*.22;stone.castShadow=false;
  }

  function fence(x1, z1, x2, z2) {
    const length = Math.hypot(x2-x1,z2-z1), f = group(scene, x1, 0, z1);f.rotation.y = Math.atan2(x2-x1,z2-z1);
    for (const y of [0.36,0.82]) box(f,'#73543a',0,y,length/2,0.12,0.13,length+0.1);
    for(let d=0;d<=length;d+=.38){box(f,'#ab8557',0,.58,d,.22,1.15,.19);mesh(f,coneGeo,'#c09a64',0,1.23,d,[.17,.25,.15]);}
  }

  // The refuge keeps its original footprint, dressed as a warm royal manor.
  const house = group(scene, 0, 0, wz(240));
  bevelBox(house,'#918c75',0,.13,0,4,.26,3.6);
  bevelBox(house,'#eae1cd',0,1.18,0,3.7,2.1,3.2);
  for(const x of [-1.77,1.77])for(const z of [-1.52,1.52])bevelBox(house,'#72583c',x,1.2,z,.16,2.3,.16);
  for(const y of [.32,2.15])bevelBox(house,'#8e704b',0,y,1.63,3.72,.14,.14);
  function archGeometry(width,height,depth){
    return geometry(`arch:${width}:${height}:${depth}`,()=>{
      const r=width/2,shape=new THREE.Shape();shape.moveTo(-r,0);shape.lineTo(r,0);shape.lineTo(r,height-r);shape.absarc(0,height-r,r,0,Math.PI,false);shape.closePath();
      return new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1,curveSegments:10});
    });
  }
  mesh(house,archGeometry(1.04,1.87,.12),'#c4c8b9',-.55,.16,1.64);
  mesh(house,archGeometry(.79,1.65,.055),'#84613d',-.55,.18,1.79);
  for(const x of [-.75,-.54,-.33])bevelBox(house,'#725234',x,.86,1.79,.025,1.43,.035);
  ball(house,'#edca6a',-.36,.87,1.83,.055);
  mesh(house,archGeometry(.99,1.04,.1),'#594b39',.95,.78,1.65);
  mesh(house,archGeometry(.76,.87,.035),'#a6d0d6',.95,.85,1.78);
  bevelBox(house,'#e6c88d',.95,1.3,1.79,.065,.8,.07);
  bevelBox(house,'#e6c88d',.95,1.3,1.79,.8,.065,.07);
  for(const x of [.36,1.54]){const shutter=bevelBox(house,'#3ba7a1',x,1.3,1.78,.25,.8,.09);shutter.rotation.y=x<1?-.25:.25;}
  const manorRoofGeometry=geometry('manorRoofCurve',()=>{
    const shape=new THREE.Shape();
    for(let i=0;i<=12;i++){const t=i/12,x=t*2.2,y=3.4-1.5*t+.26*t**5;i?shape.lineTo(x,y):shape.moveTo(x,y);}
    for(let i=12;i>=0;i--){const t=i/12;shape.lineTo(t*2.2,3.28-1.5*t+.26*t**5);}shape.closePath();
    return new THREE.ExtrudeGeometry(shape,{depth:3.94,bevelEnabled:true,bevelThickness:.025,bevelSize:.02,bevelSegments:1,curveSegments:6,steps:1});
  });
  for(const side of [-1,1]){
    mesh(house,manorRoofGeometry,side<0?'#31588d':'#4b7dbb',0,0,-1.97,[side,1,1]);
    // Raised eaves and the generous roof thickness read well at phone scale.
    bevelBox(house,'#31588d',side*2.17,2.16,0,.12,.12,4.06);
    for(const z of [-1.96,1.96]){
      for(let i=0;i<5;i++){
        const t=(i+.5)/5,x=side*t*2.2,y=3.46-1.5*t+.26*t**5;
        const trim=bevelBox(house,'#3865a2',x,y,z,.49,.07,.11);trim.rotation.z=side*Math.atan((-1.5+1.3*t**4)/2.2);
      }
    }
  }
  bevelBox(house,'#754b36',0,3.37,0,.16,.14,4.02);
  const gableShape=new THREE.Shape();gableShape.moveTo(-1.82,0);gableShape.lineTo(0,1.08);gableShape.lineTo(1.82,0);gableShape.closePath();
  const gable=new THREE.Mesh(new THREE.ShapeGeometry(gableShape),mat('#e8ddbf'));gable.position.set(0,2.18,1.61);house.add(gable);
  for(const side of [-1,1]){const beam=bevelBox(house,'#72583c',side*.9,2.72,1.73,2.15,.12,.12);beam.rotation.z=side*-.53;}
  bevelBox(house,'#72583c',0,2.68,1.72,.1,1.1,.12);
  bevelBox(house,'#8b8a77',1.06,3.12,-.8,.48,.94,.48);bevelBox(house,'#b5ad91',1.06,3.62,-.8,.62,.16,.62);
  cylinder(house,'#725a3d',-1.5,3.38,-.7,.045,2.2);
  const banner=bevelBox(house,'#e6bb50',-1.06,4.12,-.7,.85,.48,.045);
  bevelBox(house,'#bc8c39',-1.06,4.12,-.663,.09,.3,.015);
  const step=bevelBox(house,'#b0a68b',-.5,.12,2,1.3,.22,.6);step.castShadow=false;
  for(let i=0;i<3;i++)bevelBox(house,'#c0ae7f',-2.2+i*.3,.08,2.2,.25,.12,.27);
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
  const towerSpireGeometry=geometry('royalSpire',()=>new THREE.LatheGeometry([[.52,0],[.6,.06],[.57,.16],[.4,.42],[.2,.8],[.09,1.1],[0,1.18]].map(([r,y])=>new THREE.Vector2(r,y)),16));
  for(const x of [-1.8,1.8]){
    cylinder(house,'#bdc2b5',x,1.45,-1.15,.42,2.9);cylinder(house,'#dedac1',x,2.95,-1.15,.51,.18);
    cylinder(house,'#c4c8b9',x,.2,-1.15,.48,.27);
    mesh(house,towerSpireGeometry,'#3865a2',x,3.03,-1.15);ball(house,'#d8b765',x,4.23,-1.15,.065);
    mesh(house,archGeometry(.28,.66,.025),'#527b88',x,1.95,-.725);
    bevelBox(house,'#c4c8b9',x,1.88,-.7,.39,.1,.12);
  }
  const crest=group(house,0,2.55,1.73);cylinder(crest,'#dabb60',0,0,0,.18,.04,.4).rotation.x=Math.PI/2;
  for(const x of [-.1,0,.1])mesh(crest,coneGeo,'#ffe29b',x,.12,.06,[.055,.17,.025],.3);
  const fortifications = group(house);
  for(const x of [-2,2])for(const z of [-1.7,1.7]){
    bevelBox(fortifications,'#909a8b',x,.6,z,.55,1.2,.6);
    for(const ox of [-.2,.2])bevelBox(fortifications,'#b6bfac',x+ox,1.3,z,.17,.3,.6);
  }
  const smoke=[];
  for(let i=0;i<4;i++){
    const sm=new THREE.Mesh(sphereGeo,new THREE.MeshStandardMaterial({color:'#e0dfc6',transparent:true,opacity:.18,depthWrite:false,flatShading:true}));house.add(sm);smoke.push(sm);
  }

  const softBoxGeo=geometry('softBox',()=>new RoundedBoxGeometry(1,1,1,2,.13));
  const headGeo=geometry('head',()=>new THREE.SphereGeometry(1,16,12));
  const softBox=(p,c,x,y,z,sx,sy,sz)=>mesh(p,softBoxGeo,c,x,y,z,[sx,sy,sz]);
  const softBall=(p,c,x,y,z,sx,sy=sx,sz=sx)=>mesh(p,headGeo,c,x,y,z,[sx,sy,sz]);
  const royal=createRoyalModels({scene,group,mesh,box,ball,cylinder,softBox,softBall,geometry,mat,batch,coneGeo,headGeo});
  const character=royal.character;
  function tent(parent,x,z,color='#d6c58c'){
    const t=group(parent,x,0,z);
    for(const side of [-1,1]){const cloth=box(t,color,side*.45,.65,0,1.25,.06,1.65);cloth.rotation.z=side*-.8;}
    box(t,'#71543d',0,.55,.82,.06,1.1,.06);box(t,'#71543d',0,1.12,0,.06,.06,1.85);return t;
  }
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
  const mount=group(scene),horseLegs=[];
  const horseBody=softBall(mount,'#ad7950',0,1.04,-.05,.37,.38,.75);
  softBall(mount,'#ba875a',0,1.04,.43,.35,.41,.37);softBall(mount,'#a8754f',0,1.03,-.48,.37,.4,.38);
  for(const x of [-.24,.24])for(const z of [-.45,.45]){
    const leg=group(mount,x,.94,z);
    const thigh=softBall(leg,'#ae7950',0,-.19,0,.115,.29,.14);thigh.rotation.x=z<0?-.13:.08;
    softBall(leg,'#a16a45',0,-.5,.015,.064,.24,.075);softBall(leg,'#ddc9a4',0,-.68,.027,.067,.14,.078);
    softBall(leg,'#433e36',0,-.825,.062,.088,.075,.13);horseLegs.push(leg);
  }
  const neck=softBall(mount,'#ba875a',0,1.43,.57,.215,.49,.25);neck.rotation.x=.42;
  const horseHead=group(mount,0,1.88,.8);
  const skull=softBall(horseHead,'#b98154',0,0,.12,.205,.25,.33);skull.rotation.x=-.2;
  softBall(horseHead,'#d4af84',0,-.135,.4,.19,.14,.21);softBall(horseHead,'#eee1c7',0,.045,.39,.043,.145,.03);
  for(const side of [-1,1]){
    const ear=softBall(horseHead,'#a96f48',side*.13,.33,-.045,.065,.2,.055);ear.rotation.z=side*-.22;
    const inner=softBall(horseHead,'#d6b49a',side*.13,.34,-.003,.03,.132,.015);inner.rotation.z=side*-.22;
    softBall(horseHead,'#28332f',side*.194,.072,.22,.027,.045,.05);softBall(horseHead,'#fff5dc',side*.215,.087,.238,.009);
    softBall(horseHead,'#6a5441',side*.11,-.115,.57,.028,.035,.012);
    const cheek=softBall(horseHead,'#604c3b',side*.2,-.075,.2,.018,.035,.245);cheek.rotation.x=-.18;
  }
  for(let i=0;i<7;i++){
    const lock=softBall(mount,i%2?'#443b34':'#514439',0,1.4+i*.11,.32+i*.056,.09,.17,.115);lock.rotation.x=.3;
  }
  const tail=group(mount,0,1.05,-.72);tail.rotation.x=.35;
  for(let i=0;i<4;i++){const lock=softBall(tail,i%2?'#514439':'#443b34',(i%2-.5)*.045,-.22-i*.1,-.06-i*.045,.075-i*.008,.3,.075);lock.rotation.x=.2;}
  softBall(mount,'#b52d48',0,1.36,-.07,.43,.075,.45);
  const saddle=softBox(mount,'#654b36',0,1.435,-.08,.57,.1,.55);saddle.rotation.x=.04;
  softBall(mount,'#70533a',0,1.48,.18,.3,.09,.07);softBall(mount,'#70533a',0,1.48,-.35,.3,.09,.07);
  for(const x of [-.39,.39]){
    const strap=softBox(mount,'#71543d',x,1.18,-.05,.03,.55,.07);strap.rotation.z=x>0?-.08:.08;
    mesh(mount,geometry('stirrup',()=>new THREE.TorusGeometry(.09,.018,5,12)),'#c6c4a3',x,.96,-.02,[1,1,1],.45);
  }
  for(const part of [...horseLegs,horseHead,tail])batch(part);
  batch(mount,[...horseLegs,horseHead,tail]);
  for(const node of RESOURCE_NODES){
    const site=group(scene,wx(node.x),0,wz(node.y));
    if(node.kind==='stone'){
      for(let i=0;i<8;i++){const a=i*2.4,r=.25+(i%3)*.25;const stone=ball(site,i%2?'#bdc2b5':'#909a8b',Math.sin(a)*r,.23+(i%2)*.1,Math.cos(a)*r,.3,.27,.32);stone.rotation.y=a;}
      box(site,'#ad8350',-.65,.28,.65,.5,.5,.5);box(site,'#72583c',-.65,.55,.65,.57,.06,.57);
    }else{
      ball(site,'#6c7c7e',0,.45,0,.82,.62,.63);box(site,'#263735',0,.4,.56,.55,.75,.025);
      for(const x of [-.38,.38]){const post=box(site,'#806044',x,.45,.65,.12,.95,.12);post.rotation.z=x<0?-.1:.1;}
      box(site,'#ad8350',0,.95,.65,.9,.15,.17);
      for(let i=0;i<5;i++)ball(site,'#c49063',Math.sin(i*2)*.6,.4+(i%2)*.12,Math.cos(i*2)*.5,.085,.06,.05);
    }
  }
  batch(scene,[banner,fortifications,mount,...[...camps.values()].map(c=>c.root)]);

  let king=character('king'),kingSignature='';
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
  const collections={allies:new Map(),enemies:new Map(),coins:new Map(),arrows:new Map(),particles:new Map(),followers:new Map(),caravans:new Map(),buildings:new Map(),stumps:new Map()};
  function disposeTree(node){
    const geo=new Set(),material=new Set();node.traverse(child=>{if(child.userData.ownedGeometry)geo.add(child.geometry);if(child.userData.ownedMaterial){const values=Array.isArray(child.material)?child.material:[child.material];values.forEach(m=>material.add(m));}});
    geo.forEach(g=>g.dispose());material.forEach(m=>m?.dispose());node.removeFromParent();
  }
  function sync(map,items,make,animate,signature=null){
    const alive=new Set(items);
    for(const [item,m]of map)if(!alive.has(item)){disposeTree(m);map.delete(item);}
    for(const item of items){let m=map.get(item);const value=signature?signature(item):null;
      if(m&&signature&&m.userData.signature!==value){disposeTree(m);map.delete(item);m=null;}
      if(!m){m=make(item);m.userData.signature=value;map.set(item,m);}animate(m,item);
    }
  }
  function pose(g,p,time,mounted=false,facing=null){
    const x=wx(p.x),z=wz(p.y),d=g.userData;
    const moving=d.lastX!==undefined&&Math.hypot(x-d.lastX,z-d.lastZ)>.002;
    if(moving&&p.aim===undefined)g.rotation.y=Math.atan2(x-d.lastX,z-d.lastZ);
    if(facing!==null)g.rotation.y=facing;else if(p.aim!==undefined)g.rotation.y=p.aim;
    d.health.visible=p.maxHp!==undefined&&p.hp<p.maxHp;
    if(d.health.visible){const ratio=Math.max(0,p.hp/p.maxHp);d.healthFill.scale.x=.58*ratio;d.healthFill.position.x=-(1-ratio)*.29;d.health.quaternion.copy(g.quaternion).invert().multiply(camera.quaternion);}
    d.lastX=x;d.lastZ=z;g.position.set(x,(mounted?1:0)+Math.max(0,Math.sin(time*11+d.phase))*(moving?.065:.008),z);
    if(d.cape)d.cape.rotation.x=-.1+Math.sin(time*3)*.04;
    if(d.weapons?.visible){const axe=p.weapon==='axe';d.axe.visible=axe;d.bow.visible=!axe;d.weapons.rotation.x=axe&&p.axeSwing>0?-.15-Math.sin((.32-p.axeSwing)/.32*Math.PI)*1.4:0;d.weapons.rotation.z=axe?-.15:0;}
    if(d.jobTool)d.jobTool.rotation.x=p.job==='knight'&&p.meleeCool>0?Math.sin(time*13)*.5:['worker','builder','farmer','armorer'].includes(p.job)?Math.sin(time*3)*.08:0;
    for(let i=0;i<2;i++){d.legs[i].position.x=(i?1:-1)*(mounted?.3:.13);d.legs[i].rotation.x=mounted?-.7:moving?Math.sin(time*11+i*Math.PI)*.5:0;d.arms[i].rotation.x=moving?Math.sin(time*11+i*Math.PI)*.15:-.08;}
  }
  const portraitScene=new THREE.Scene();portraitScene.environment=skyEnvironment.texture;portraitScene.environmentIntensity=.65;
  const portraitBackdrop=document.createElement('canvas');portraitBackdrop.width=portraitBackdrop.height=256;const portraitContext=portraitBackdrop.getContext('2d'),portraitGradient=portraitContext.createRadialGradient(88,104,12,100,118,205);portraitGradient.addColorStop(0,'#617886');portraitGradient.addColorStop(.5,'#304b60');portraitGradient.addColorStop(1,'#15283c');portraitContext.fillStyle=portraitGradient;portraitContext.fillRect(0,0,256,256);portraitScene.background=new THREE.CanvasTexture(portraitBackdrop);portraitScene.background.colorSpace=THREE.SRGBColorSpace;
  portraitScene.add(new THREE.HemisphereLight('#e4ecfa','#a58c74',1.8));
  const portraitLight=new THREE.DirectionalLight('#fff1dd',3.4);portraitLight.position.set(-4,7,5);portraitScene.add(portraitLight);
  const rim=new THREE.DirectionalLight('#a9cffa',2.1);rim.position.set(4,3,-3);portraitScene.add(rim);
  const pedestal=cylinder(portraitScene,'#304c64',0,-.13,0,.85,.22);cylinder(portraitScene,'#d2b36a',0,-.025,0,.87,.035,.4);
  const halo=mesh(portraitScene,geometry('portraitHalo',()=>new THREE.TorusGeometry(1.65,.025,5,64)),'#8c8055',0,1.3,-.55);halo.rotation.z=.2;
  const portraitCamera=new THREE.OrthographicCamera(-3,3,2.3,-2.3,.1,40);
  let portraitKing=null,portraitSignature='',portraitMode=false,lastPortraitMode=false,harvestSignature='';
  const raycaster=new THREE.Raycaster(),groundPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
  let placement=null,placementRoot=null,placementType=null,placementMaterials=[];
  function appearanceSignature(s){const a={...royal.defaults,...s.king.appearance};return JSON.stringify([a.cape,a.hair,a.beard,a.skin,a.crown,s.king.weapon||'bow']);}
  function setPlacement(value){
    placement=value;
    if(!value){if(placementRoot)disposeTree(placementRoot);placementRoot=null;placementType=null;placementMaterials=[];return;}
    if(!placementRoot||placementType!==value.type){
      if(placementRoot)disposeTree(placementRoot);placementMaterials=[];placementRoot=group(scene);placementType=value.type;
      const model=royal.building({type:value.type,level:1,complete:true},{preview:true});placementRoot.add(model);
      const cloned=new Map();model.traverse(m=>{if(!m.isMesh)return;const old=m.material;if(!cloned.has(old)){const clone=old.clone();clone.transparent=true;clone.opacity=.35;clone.depthWrite=false;clone.emissive?.set('#244c39');cloned.set(old,clone);placementMaterials.push(clone);}
        if(m.userData.ownedMaterial)old.dispose();m.material=cloned.get(old);m.userData.ownedMaterial=true;m.castShadow=false;m.receiveShadow=false;});
      const def=BUILDINGS[value.type],w=def.width/UNIT,d=def.depth/UNIT;
      const footprint=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:'#77d59e',transparent:true,opacity:.22,side:THREE.DoubleSide,depthWrite:false}));footprint.rotation.x=-Math.PI/2;footprint.position.y=.09;footprint.userData.ownedGeometry=true;footprint.userData.ownedMaterial=true;placementRoot.add(footprint);placementMaterials.push(footprint.material);
      const outlineBox=new THREE.BoxGeometry(w,.035,d),outlineGeometry=new THREE.EdgesGeometry(outlineBox);outlineBox.dispose();
      const outline=new THREE.LineSegments(outlineGeometry,new THREE.LineBasicMaterial({color:'#a4f0c4',transparent:true,opacity:.9,depthTest:false}));outline.position.y=.1;outline.userData.ownedGeometry=true;outline.userData.ownedMaterial=true;placementRoot.add(outline);placementMaterials.push(outline.material);
      const grid=new THREE.GridHelper(Math.max(10,w+4,d+4),40,'#c6e6bb','#abc9a1');grid.position.y=.075;grid.material.transparent=true;grid.material.opacity=.18;grid.material.depthWrite=false;grid.userData.ownedGeometry=true;grid.userData.ownedMaterial=true;placementRoot.add(grid);
    }
    placementRoot.position.set(wx(value.x),.025,wz(value.y));placementRoot.rotation.y=value.rotation||0;
    for(const material of placementMaterials){material.color.set(value.valid?'#69d89c':'#ee7a72');material.emissive?.set(value.valid?'#164328':'#561c20');}
  }
  function updateHarvest(state){
    const signature=(state.harvested||[]).join(',');if(signature===harvestSignature)return;harvestSignature=signature;
    const removed=new Set(state.harvested||[]),zero=new THREE.Matrix4().makeScale(0,0,0);
    for(const record of forestInstances){record.mesh.instanceMatrix.array.set(record.original);for(let i=0;i<record.indices.length;i++)if(removed.has(record.indices[i]))record.mesh.setMatrixAt(i,zero);record.mesh.instanceMatrix.needsUpdate=true;record.mesh.computeBoundingSphere();}
  }
  let aspect=1,lastWidth=0,lastHeight=0,frames=0,animationTime=0,zoom=1,lastZoom=0,horseLast=null;
  function render(state,time,paused){
    if(!paused)animationTime=time;
    const rect=canvas.getBoundingClientRect();
    if(rect.width!==lastWidth||rect.height!==lastHeight||zoom!==lastZoom||portraitMode!==lastPortraitMode){
      lastPortraitMode=portraitMode;lastZoom=zoom;lastWidth=rect.width;lastHeight=rect.height;aspect=rect.width/Math.max(1,rect.height);
      renderer.setSize(rect.width,rect.height,false);
      const height=Math.max(14,Math.min(25,17/Math.sqrt(aspect)))/zoom;
      camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();
    }
    const signature=appearanceSignature(state);
    if(signature!==kingSignature){disposeTree(king);king=character('king',state.king.appearance);kingSignature=signature;}
    if(portraitMode){
      if(signature!==portraitSignature){if(portraitKing)disposeTree(portraitKing);portraitKing=character('king',state.king.appearance);portraitScene.add(portraitKing);
        const portraitMaterials=new Map();portraitKing.traverse(m=>{if(!m.isMesh||!m.material.metalness)return;const original=m.material;if(!portraitMaterials.has(original)){const material=original.clone();material.metalness=Math.min(.55,material.metalness);material.roughness=.32;material.envMapIntensity=1;portraitMaterials.set(original,material);}m.material=portraitMaterials.get(original);m.userData.ownedMaterial=true;});portraitSignature=signature;}
      const tall=rect.width<600&&rect.height>rect.width,h=tall?5.7:4.55,w=h*aspect;
      portraitCamera.left=-w*(tall?.5:.68);portraitCamera.right=w*(tall?.5:.32);portraitCamera.top=h*(tall?.3:.5);portraitCamera.bottom=-h*(tall?.7:.5);portraitCamera.updateProjectionMatrix();
      portraitCamera.position.set(3.4,2.45,6.5);portraitCamera.lookAt(0,1.1,0);portraitCamera.updateMatrixWorld();pose(portraitKing,{x:500,y:325,aim:.15,weapon:state.king.weapon||'bow'},0,false);renderer.toneMappingExposure=1.08;renderer.render(portraitScene,portraitCamera);renderer.toneMappingExposure=1.08;frames++;canvas.dataset.renderer='webgl2';return;
    }
    updateHarvest(state);
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
    selection.position.set(wx(state.king.x),.055,wz(state.king.y));
    fortifications.visible=(state.buildings?.find(b=>b.isRefuge)?.level||1)>1||state.fort>0;
    banner.rotation.y=Math.sin(animationTime*2)*.12;
    for(let i=0;i<smoke.length;i++){const life=(animationTime*.28+i*.25)%1;smoke[i].position.set(1.06+life*.5,3.72+life*1.7,-.8);smoke[i].scale.setScalar(.18+life*.3);smoke[i].material.opacity=(1-life)*.18;}
    sync(collections.allies,state.allies,p=>character(p.job||((p.role==='archer')?'knight':p.role==='builder'?'builder':'unassigned')),(m,p)=>pose(m,p,animationTime),p=>p.job||p.role);
    sync(collections.followers,state.followers,()=>character('survivor'),(m,p)=>pose(m,p,animationTime));
    sync(collections.caravans,state.caravans,()=>character('survivor'),(m,p)=>pose(m,p,animationTime));
    sync(collections.enemies,state.enemies,()=>character('enemy'),(m,p)=>pose(m,p,animationTime,false,Math.atan2(500-p.x,240-p.y)));
    sync(collections.coins,state.coins,coin,(m,p)=>{m.position.set(wx(p.x),.4+Math.sin(animationTime*5+p.x)*.07,wz(p.y));m.rotation.y=animationTime*2;});
    sync(collections.arrows,state.arrows,arrow,(m,p)=>{m.position.set(wx(p.x),p.height||1,wz(p.y));m.rotation.y=Math.atan2(p.vx,p.vy);});
    sync(collections.particles,state.particles,()=>ball(scene,'#f0ca67',0,0,0,.055),(m,p)=>m.position.set(wx(p.x),.5+p.life,wz(p.y)));
    sync(collections.buildings,(state.buildings||[]).filter(b=>!b.isRefuge&&!b.destroyed),b=>royal.building(b),(m,b)=>{
      m.position.set(wx(b.x),0,wz(b.y));m.rotation.y=b.rotation||0;
      if(m.userData.progressBar){m.userData.progressBar.quaternion.copy(m.quaternion).invert().multiply(camera.quaternion);const fraction=Math.max(0,Math.min(1,(b.upgrading?b.upgradeProgress:b.progress)/Math.max(1,b.upgrading?b.upgradeWork:b.work)));m.userData.progressFill.scale.x=1.16*fraction;m.userData.progressFill.position.x=-.58+.58*fraction;}
    },b=>[b.type,b.level,b.complete,b.upgrading].join(':'));
    sync(collections.stumps,state.harvested||[],index=>{const tree=FOREST_TREES[index],g=group(scene,wx(tree.x),0,wz(tree.y));cylinder(g,'#8b6440',0,.13,0,.23*tree.size,.26);cylinder(g,'#d5b682',0,.265,0,.21*tree.size,.025);const log=cylinder(g,'#96734d',.5,.14,.16,.11,.8);log.rotation.z=Math.PI/2;return g;},()=>{});
    renderer.render(scene,camera);frames++;
    canvas.dataset.renderer='webgl2';
  }
  function stateWeapon(){return(portraitMode?portraitKing:king)?.userData.axe?.visible?'axe':'bow';}
  function project(x,y,height=0){
    const v=new THREE.Vector3(wx(x),height,wz(y)).project(camera);
    return{x:(v.x+1)*lastWidth/2,y:(1-v.y)*lastHeight/2,width:lastWidth,height:lastHeight};
  }
  return{render,project,screenToWorld:(clientX,clientY)=>{if(portraitMode)return null;const rect=canvas.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((clientX-rect.left)/rect.width*2-1,-(clientY-rect.top)/rect.height*2+1),camera);if(!raycaster.ray.intersectPlane(groundPlane,hit))return null;return{x:hit.x*UNIT+500,y:hit.z*UNIT+325};},setPlacement,setPortrait:value=>{portraitMode=!!value;},setZoom:value=>{zoom=value;},diagnostics:()=>({renderer:'webgl2',frames,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fortified:fortifications.visible,actors:1+collections.allies.size+collections.enemies.size,coins:collections.coins.size,arrows:collections.arrows.size,forestTrees:FOREST_TREES.length,mounted:!!king.position.y&&king.position.y>.7,followers:collections.followers.size,paintedTextures:painted.count,texturesReady:painted.ready,textureSource:painted.source,portrait:portraitMode,equippedWeapon:stateWeapon(),placedBuildings:collections.buildings.size,harvested:collections.stumps.size,kingBodyDepth:king.userData.bodyDimensions?.depth??king.userData.body.scale.z,kingBodyWidth:king.userData.bodyDimensions?.width??king.userData.body.scale.x,modelVersion:king.userData.modelVersion||3,memory:{geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,programs:renderer.info.programs?.length||0}})};
}
