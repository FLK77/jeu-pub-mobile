import * as THREE from 'three';
import {TessellateModifier} from 'three/addons/modifiers/TessellateModifier.js';

// V5.6: a fitted suit of forged plate. Silhouette, rolled edges, articulated
// lames and relief are actual geometry; the steel map supplies only micrograin.
export function createKingArmor(k, appearance={}) {
  const {scene,group,mesh,geometry,mat}=k;
  const C={steel:'#30383e',dark:'#1c242a',edge:'#7f898e',bright:'#a2aaa9',gold:'#a08b4e',goldLight:'#c4b06e',mail:'#666f70',leather:'#302821',cloth:'#242a2e'};
  if(appearance.outfit==='warden'){C.steel='#37454b';C.edge='#87989b';}
  if(appearance.outfit==='ranger'){C.steel='#35403b';C.edge='#8c9589';}
  const root=group(scene),legs=[],knees=[],arms=[],forearms=[],handSockets=[],skirtPanels=[];
  const sphere=geometry('v56-armor-rivet',()=>new THREE.SphereGeometry(1,8,5));
  function surface(p,g,c,x=0,y=0,z=0,scale=[1,1,1],kind='steel',metal=.55){const m=mesh(p,g,c,x,y,z,scale,metal);m.material=mat(c,metal,kind);return m;}
  // Production batching bakes transforms into vertices. Author reflected
  // details with corrected triangle order instead of a negative parent scale.
  function reflectParts(parent){parent.traverse(m=>{if(!m.isMesh)return;const source=m.geometry;m.geometry=geometry('v56-armor-reflect-'+source.uuid,()=>{const g=source.clone();g.scale(-1,1,1);if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));const a=g.index.array;for(let i=0;i<a.length;i+=3){const t=a[i];a[i]=a[i+2];a[i+2]=t;}return g;});m.position.x=-m.position.x;});}
  function rivet(p,x,y,z,r=.009,c=C.bright){return surface(p,sphere,c,x,y,z,[r,r,r*.52]);}
  function line(p,name,points,c=C.edge,r=.004,{kind='steel',metal=.55,segments=points.length*3,radial=5}={}){
    const g=geometry('v56-armor-line-'+name,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),segments,r,radial,false));
    return surface(p,g,c,0,0,0,[1,1,1],kind,metal);
  }
  // A continuous, anatomically varying oval section. Extra radial shaping
  // makes knee/calf/pectoral volumes differ from simple rotational cylinders.
  function loft(p,name,profile,c,{kind='steel',metal=.55,sides=32,sub=3,fold=0,shape=null,open=false}={}){
    const g=geometry('v56-armor-loft-'+name,()=>{
      const coords=new THREE.CatmullRomCurve3(profile.map(q=>new THREE.Vector3(q[1],q[0],q[2])),false,'centripetal'),offsets=new THREE.CatmullRomCurve3(profile.map(q=>new THREE.Vector3(q[3]||0,q[0],0)),false,'centripetal');
      const rows=(profile.length-1)*sub,positions=[],uv=[],indices=[];
      for(let i=0;i<=rows;i++){
        const v=i/rows,q=coords.getPoint(v),cz=offsets.getPoint(v).x;
        for(let j=0;j<=sides;j++){
          const u=j/sides,a=u*Math.PI*2,s=Math.sin(a),co=Math.cos(a),f=1+fold*Math.sin(a*9+v*1.7)*Math.sin(v*Math.PI);
          let point=[s*Math.max(.002,q.x)*f,q.y,co*Math.max(.002,q.z)*f+cz];if(shape)point=shape(point,a,v);
          positions.push(...point);uv.push(u,v);
          if(i&&j){const n=i*(sides+1)+j;indices.push(n,n-1,n-sides-2,n,n-sides-2,n-sides-1);}
        }
      }
      if(!open)for(const row of[0,rows]){const q=coords.getPoint(row/rows),cidx=positions.length/3;positions.push(0,q.y,offsets.getPoint(row/rows).x);uv.push(.5,.5);for(let j=0;j<sides;j++){const a=row*(sides+1)+j;if(row)indices.push(cidx,a,a+1);else indices.push(cidx,a+1,a);}}
      if(profile.at(-1)[0]<profile[0][0])for(let i=0;i<indices.length;i+=3){const t=indices[i];indices[i]=indices[i+2];indices[i+2]=t;}
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
      const n=geo.attributes.normal;for(let i=0;i<=rows;i++){const a=i*(sides+1),b=a+sides,v=new THREE.Vector3(n.getX(a)+n.getX(b),n.getY(a)+n.getY(b),n.getZ(a)+n.getZ(b)).normalize();n.setXYZ(a,v.x,v.y,v.z);n.setXYZ(b,v.x,v.y,v.z);}return geo;
    });return surface(p,g,c,0,0,0,[1,1,1],kind,metal);
  }
  // Bevelled forged plates have a closed edge and measurable thickness. The
  // surface bends after extrusion to follow the wearer instead of floating flat.
  function plate(p,name,shape,c,{z=0,depth=.018,bevel=.006,bend=()=>0,kind='steel',metal=.55}={}){
    const geo=geometry('v56-armor-plate-'+name,()=>{
      const blank=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,bevelThickness:bevel,bevelSize:bevel,curveSegments:10,steps:1});
      // Extruded caps contain broad polygon-spanning triangles. Subdivide them
      // BEFORE bending: otherwise their planar chords cut through the padding
      // and make the chest read as a faceted shield rather than forged steel.
      const g=new TessellateModifier(.048,8).modify(blank);blank.dispose();
      const a=g.attributes.position,n=g.attributes.normal,e=.0001;
      for(let i=0;i<a.count;i++){
        const x=a.getX(i),y=a.getY(i),nz=n.getZ(i),dx=(bend(x+e,y)-bend(x-e,y))/(e*2),dy=(bend(x,y+e)-bend(x,y-e))/(e*2);
        a.setZ(i,a.getZ(i)+bend(x,y));n.setXYZ(i,n.getX(i)-nz*dx,n.getY(i)-nz*dy,nz);
      }
      // The analytic inverse-transpose keeps the original bevel discontinuity
      // and smooth cap normals. Recomputing non-indexed face normals would
      // bring the large triangular highlights back even after subdivision.
      g.normalizeNormals();return g;
    });return surface(p,geo,c,0,0,z,[1,1,1],kind,metal);
  }
  function shieldShape(w,h,point=.12){const s=new THREE.Shape();s.moveTo(-w*.43,h*.5);s.quadraticCurveTo(0,h*.61,w*.43,h*.5);s.quadraticCurveTo(w*.56,h*.15,w*.39,-h*.3);s.lineTo(0,-h*.5-point);s.lineTo(-w*.39,-h*.3);s.quadraticCurveTo(-w*.56,h*.15,-w*.43,h*.5);s.closePath();return s;}
  function scroll(p,name,x,y,z,size=1,{gold=false,mirror=1,rotation=0,conform=null}={}){
    const g=group(p,x,y,z);g.scale.setScalar(size);g.rotation.z=rotation;
    line(g,name+'-stem',[[0,-.12,0],[.015,-.06,.001],[.01,.015,.002],[-.028,.07,.001],[-.065,.075,0],[-.082,.046,0],[-.062,.022,0],[-.036,.027,0]],gold?C.gold:C.edge,.0035,{segments:18,radial:4});
    line(g,name+'-sprig',[[.012,-.047,.002],[.06,-.019,.003],[.079,.016,.002],[.06,.038,.001],[.039,.021,.002],[.045,.001,.003]],gold?C.gold:C.edge,.0032,{segments:14,radial:4});
    for(const [side,v]of[[1,-.09],[-1,-.034],[1,.025]]){
      const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(side*.018,.014,side*.034,.014,side*.042,.031);s.bezierCurveTo(side*.013,.04,side*.003,.025,0,0);s.closePath();
      const leaf=plate(g,name+'-leaf-'+side+'-'+v,s,gold?C.gold:C.edge,{z:.001,depth:.002,bevel:.001,bend:(x,y)=>Math.sin(y*55)*.002});leaf.position.y=v;
    }
    if(mirror<0)reflectParts(g);
    if(conform)g.traverse(m=>{if(!m.isMesh)return;const source=m.geometry,angle=rotation,co=Math.cos(angle),si=Math.sin(angle),centre=conform(x,y),mx=m.position.x,my=m.position.y;
      m.geometry=geometry('v56-armor-conform-'+source.uuid+'-'+x+'-'+y+'-'+rotation,()=>{const geo=source.clone(),a=geo.attributes.position,n=geo.attributes.normal,e=.0001;
        const bend=(u,v)=>(conform(x+size*(co*(u+mx)-si*(v+my)),y+size*(si*(u+mx)+co*(v+my)))-centre)/size;
        for(let i=0;i<a.count;i++){const u=a.getX(i),v=a.getY(i),nz=n.getZ(i),dx=(bend(u+e,v)-bend(u-e,v))/(2*e),dy=(bend(u,v+e)-bend(u,v-e))/(2*e);a.setZ(i,a.getZ(i)+bend(u,v));n.setXYZ(i,n.getX(i)-nz*dx,n.getY(i)-nz*dy,nz);}geo.normalizeNormals();return geo;});
    });return g;
  }
  // Ribcage, abdomen and back are a continuous, weighted adult torso.
  const body=loft(root,'padded-anatomy',[[1.075,.235,.168],[1.20,.252,.18],[1.36,.25,.181],[1.54,.31,.213],[1.72,.357,.221],[1.84,.339,.19],[1.95,.245,.15],[2.01,.112,.105]],C.dark,{kind:'mail',metal:.2,sides:40,sub:3,shape:(p)=>[p[0],p[1],p[2]*.72]});
  const breast=new THREE.Shape();breast.moveTo(-.125,1.945);breast.quadraticCurveTo(0,1.895,.125,1.945);breast.quadraticCurveTo(.268,1.925,.325,1.82);breast.bezierCurveTo(.355,1.74,.324,1.59,.255,1.475);breast.quadraticCurveTo(.235,1.42,.217,1.385);breast.quadraticCurveTo(.105,1.326,0,1.344);breast.quadraticCurveTo(-.105,1.326,-.217,1.385);breast.quadraticCurveTo(-.235,1.42,-.255,1.475);breast.bezierCurveTo(-.324,1.59,-.355,1.74,-.325,1.82);breast.quadraticCurveTo(-.268,1.925,-.125,1.945);breast.closePath();
  const front=(x,y)=>.142+.117*Math.sqrt(Math.max(0,1-(x/.39)**2))+.037*Math.exp(-(((Math.abs(x)-.155)/.126)**2)-(((y-1.744)/.145)**2))-.013*Math.exp(-(((y-1.43)/.092)**2));
  plate(root,'cuirass-front',breast,C.steel,{depth:.022,bevel:.008,bend:front});
  const back=group(root);back.rotation.y=Math.PI;plate(back,'cuirass-back',breast,C.dark,{depth:.02,bevel:.009,bend:(x,y)=>front(x,y)*.79});
  // The medial keel and scrolling breast relief are forged into the cuirass.
  const keel=new THREE.Shape();keel.moveTo(0,1.91);keel.bezierCurveTo(-.027,1.81,-.046,1.69,-.04,1.56);keel.quadraticCurveTo(-.031,1.43,0,1.367);keel.quadraticCurveTo(.031,1.43,.04,1.56);keel.bezierCurveTo(.046,1.69,.027,1.81,0,1.91);keel.closePath();plate(root,'cuirass-keel',keel,C.steel,{depth:.004,bevel:.002,bend:(x,y)=>front(x,y)+.023+.006*(1-Math.min(1,Math.abs(x)/.05))});
  line(root,'sternum-highlight',[[0,1.88,front(0,1.88)+.034],[0,1.70,front(0,1.70)+.036],[0,1.53,front(0,1.53)+.034],[0,1.395,front(0,1.395)+.031]],'#657178',.0024,{segments:22,radial:4});
  for(const sign of[-1,1]){
    const outline=[[sign*.129,1.944],[sign*.262,1.915],[sign*.324,1.81],[sign*.327,1.69],[sign*.254,1.49],[sign*.215,1.388],[sign*.105,1.348],[0,1.344]].map(([x,y])=>[x,y,front(x,y)+.028]);
    line(root,'cuirass-rolled-'+sign,outline,'#59666f',.004,{segments:30,radial:5});
    const rib=[[sign*.15,1.88],[sign*.233,1.79],[sign*.253,1.65],[sign*.177,1.53],[sign*.06,1.44]].map(([x,y])=>[x,y,front(x,y)+.029]);
    line(root,'cuirass-repousse-'+sign,rib,C.dark,.007,{segments:24,radial:5});
    line(root,'cuirass-inlay-'+sign,rib.map(v=>[v[0]+sign*.008,v[1],v[2]+.001]),C.edge,.0026,{segments:24,radial:4});
    for(const [i,[x,y]]of[[.206,1.752],[.118,1.61],[.174,1.46]].entries()){
      scroll(root,'chest-'+sign+'-'+i,sign*x,y,front(sign*x,y)+.029,.9-i*.14,{mirror:sign,rotation:sign*(i===0?-.25:.32),conform:front});
    }
    for(const [x,y]of[[.28,1.84],[.312,1.73],[.244,1.50],[.196,1.405]])rivet(root,sign*x,y,front(sign*x,y)+.037,.006);
    line(root,'cuirass-clavicle-'+sign,[[sign*.12,1.915,front(sign*.12,1.915)+.03],[sign*.23,1.87,front(sign*.23,1.87)+.033],[sign*.29,1.81,front(sign*.29,1.81)+.035]],C.gold,.0035,{segments:12});
  }
  // Layered neck protection has a true hollow rim around the exposed neck.
  loft(root,'gorget-mail',[[1.87,.155,.14],[1.99,.123,.111],[2.057,.105,.097]],C.mail,{kind:'mail',metal:.25,sides:32,sub:2,open:true});
  loft(root,'gorget-lower',[[1.88,.19,.15],[1.926,.186,.148],[1.96,.146,.125]],C.steel,{sides:40,sub:2,open:true,shape:(p,a)=>[p[0],p[1]-.048*Math.max(0,Math.cos(a))**5,p[2]]});
  line(root,'gorget-rim',Array.from({length:31},(_,i)=>{const a=i/30*Math.PI*2;return[Math.sin(a)*.148,1.955-.05*Math.max(0,Math.cos(a))**5,Math.cos(a)*.126];}),C.edge,.006,{segments:42});
  // Four overlapping fauld lames flex between the cuirass and leather girdle.
  for(let i=0;i<4;i++){
    const y=1.39-i*.048,rx=.263+i*.004,rz=.191+i*.003;
    loft(root,'fauld-'+i,[[y+.032,rx-.007,rz-.006],[y+.019,rx+.004,rz+.004],[y-.031,rx+.015,rz+.013]],i%2?C.dark:C.steel,{sides:40,sub:2,open:true,shape:(p,a)=>[p[0],p[1]+.012*Math.cos(a*2),p[2]]});
    line(root,'fauld-hem-'+i,Array.from({length:23},(_,j)=>{const a=-Math.PI*.49+j/22*Math.PI*.98;return[Math.sin(a)*(rx+.017),y-.031+.012*Math.cos(a*2),Math.cos(a)*(rz+.015)];}),C.edge,.004,{segments:32});
  }
  loft(root,'waist-leather',[[1.18,.269,.201],[1.237,.263,.197]],C.leather,{kind:'hide',metal:0,sides:40,sub:1,open:true});
  const buckleShape=shieldShape(.145,.078,.01),buckle=plate(root,'girdle-buckle',buckleShape,C.gold,{z:.215,depth:.008,bevel:.004,bend:(x)=>-.5*x*x});buckle.position.y=1.21;
  const ruby=surface(root,geometry('v56-armor-ruby',()=>new THREE.OctahedronGeometry(1,1)),'#7e1820',0,1.21,.24,[.017,.026,.012],'steel',.25);ruby.rotation.z=.15;
  for(const sign of[-1,1])for(let i=0;i<4;i++)rivet(root,sign*(.11+i*.037),1.206,.214-i*.007,.004,C.gold);
  // Cloth-backed tassets hang in separate articulated groups over the thighs.
  for(const sign of[-1,1])for(const backSide of[false,true]){
    const panel=group(root,sign*.15,1.215,backSide?-.17:.19);panel.userData={front:!backSide,side:sign};skirtPanels.push(panel);
    const backing=geometry('v56-armor-tabard-'+sign+'-'+backSide,()=>{
      const p=[],uv=[],idx=[],nx=12,ny=18;
      for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
        const u=i/nx,v=j/ny,x=(u-.5)*(.24+.055*v),y=-.49*v,z=.009+.027*Math.sin(u*Math.PI*5+.3)*v-.013*Math.sin(v*Math.PI*2)+.025*v*v;
        p.push(x,y,z);uv.push(u,v);if(i&&j){const n=j*(nx+1)+i;idx.push(n,n-nx-2,n-1,n,n-nx-1,n-nx-2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
    });const cloth=surface(panel,backing,C.cloth,0,0,0,[1,1,1],'linen',0);cloth.material.side=THREE.DoubleSide;
    for(const side of[-1,1])line(panel,'tasset-cloth-border-'+sign+'-'+backSide+'-'+side,Array.from({length:10},(_,i)=>{const v=i/9;return[side*(.12+.0275*v),-.49*v,.012+.027*Math.sin((side>0?1:0)*Math.PI*5+.3)*v+.025*v*v];}),C.gold,.004,{kind:'linen',metal:0,segments:14});
    if(!backSide){
      for(let i=0;i<3;i++){
        const s=shieldShape(.233+i*.004,.112,.025);const plateMesh=plate(panel,'tasset-lame-'+i,s,i%2?C.dark:C.steel,{z:.034+i*.002,depth:.012,bevel:.005,bend:(x,y)=>.025*(1-(x/.16)**2)+.012*Math.sin(y*15)});plateMesh.position.y=-.07-i*.111;
        const hem=[[-.092,.042],[-.098,-.015],[0,-.079],[.098,-.015],[.092,.042]].map(([x,y])=>[x,y-.07-i*.111,.055+i*.002+.025*(1-(x/.16)**2)]);line(panel,'tasset-hem-'+sign+'-'+i,hem,C.edge,.0034,{segments:18,radial:4});
        for(const x of[-.078,.078])rivet(panel,x,-.042-i*.111,.089+i*.002,.0055);
      }
      scroll(panel,'tasset-scroll-'+sign,0,-.19,.089,.75,{mirror:sign});
    }else{cloth.rotation.y=Math.PI;}
  }
  for(const sign of[-1,1]){
    // The thigh follows the quadriceps, pinches above the knee, then the calf
    // swells below it; plates follow that anatomy with their own hard edges.
    const leg=group(root,sign*.14,1.10,0),knee=group(leg,0,-.47,.011);legs.push(leg);knees.push(knee);
    loft(leg,'thigh-underlayer',[[.05,.131,.143],[-.06,.13,.14],[-.23,.112,.126],[-.39,.087,.09],[-.48,.079,.081]],C.dark,{kind:'quilt',metal:0,sides:28,sub:3,fold:.025});
    const thigh=shieldShape(.22,.34,.018);const cuisse=plate(leg,'cuisse',thigh,C.steel,{z:.058,depth:.016,bevel:.007,bend:(x,y)=>.066*Math.sqrt(Math.max(0,1-(x/.14)**2))});cuisse.position.y=-.216;
    line(leg,'cuisse-ridge',[[0,-.055,.128],[0,-.21,.147],[0,-.395,.133]],C.edge,.004,{segments:14});
    for(const side of[-1,1])line(leg,'cuisse-edge-'+side,[[side*.086,-.055,.112],[side*.112,-.15,.118],[side*.088,-.33,.112],[0,-.402,.134]],C.edge,.004,{segments:18});
    scroll(leg,'cuisse-scroll',0,-.23,.149,.65,{mirror:sign});
    loft(knee,'lower-leg-underlayer',[[.02,.08,.083],[-.075,.096,.093],[-.20,.082,.086],[-.34,.057,.062],[-.43,.057,.066]],C.dark,{kind:'hide',metal:0,sides:28,sub:3});
    const poleyn=shieldShape(.235,.18,.045),kneePlate=plate(knee,'poleyn',poleyn,C.steel,{z:.065,depth:.022,bevel:.012,bend:(x,y)=>.038*(1-(x/.15)**2)+.016*Math.cos(y*14)});kneePlate.position.y=-.015;
    line(knee,'poleyn-keel',[[0,.091,.12],[0,-.006,.159],[0,-.152,.115]],C.edge,.006,{segments:10});
    for(const side of[-1,1])line(knee,'poleyn-border-'+side,[[0,-.152,.115],[side*.105,-.04,.126],[side*.104,.065,.113],[0,.102,.123]],C.edge,.004,{segments:18});
    // Projecting lateral knee wing is an anatomical articulation, not a ball.
    const wing=new THREE.Shape();wing.moveTo(0,.062);wing.bezierCurveTo(.068,.1,.12,.046,.131,-.015);wing.bezierCurveTo(.078,-.01,.066,-.07,0,-.069);wing.closePath();const wingGroup=group(knee,sign*.095,-.015,.02);plate(wingGroup,'knee-wing',wing,C.dark,{depth:.012,bevel:.007,bend:(x,y)=>.02+x*.05});if(sign<0)reflectParts(wingGroup);
    const greave=shieldShape(.158,.30,.02),shin=plate(knee,'greave',greave,C.steel,{z:.038,depth:.015,bevel:.007,bend:(x,y)=>.052*(1-(x/.109)**2)});shin.position.y=-.258;
    line(knee,'greave-ridge',[[0,-.106,.096],[0,-.24,.115],[0,-.421,.09]],C.edge,.005,{segments:15});
    for(const side of[-1,1])line(knee,'greave-edge-'+side,[[side*.065,-.101,.075],[side*.079,-.21,.08],[side*.052,-.38,.073],[0,-.43,.09]],C.edge,.0035,{segments:17});
    scroll(knee,'greave-scroll',0,-.24,.118,.53,{mirror:sign});
    // Anatomical boot last: arched instep, wide toe box, heel and flat sole.
    loft(knee,'boot-last',[[-.349,.061,.063,.014],[-.41,.064,.076,.025],[-.458,.079,.137,.084],[-.50,.089,.164,.103],[-.548,.091,.168,.104]],'#292825',{kind:'hide',metal:0,sides:32,sub:3,shape:(p,a)=>[p[0],p[1],p[2]+.009*Math.cos(a*2)]});
    loft(knee,'boot-sole',[[-.548,.093,.171,.105],[-.567,.093,.17,.105]],'#171c1e',{kind:'hide',metal:0,sides:32,sub:1});
    // Five overlapping sabaton scales bend across the instep and toe.
    for(let i=0;i<5;i++){
      const z=.027+i*.044,y=-.419-i*.021,w=.12+i*.012;
      const scale=new THREE.Shape();scale.moveTo(-w/2,.022);scale.quadraticCurveTo(0,.045,w/2,.022);scale.lineTo(w*.54,-.016);scale.quadraticCurveTo(0,-.032,-w*.54,-.016);scale.closePath();
      const s=plate(knee,'sabaton-scale-'+i,scale,i%2?C.dark:C.steel,{depth:.012,bevel:.004,bend:(x,y)=>.014*(1-(x/(w*.7))**2)});s.position.set(0,y,z);s.rotation.x=-1.12+i*.035;
      for(const side of[-1,1])rivet(knee,side*w*.39,y+.01,z+.016,.004);
    }
    // Full shoulder envelope and three independently visible overlapping lames.
    const arm=group(root,sign*.39,1.94,0),forearm=group(arm,0,-.40,.025),socket=group(forearm,0,-.38,.01);arms.push(arm);forearms.push(forearm);handSockets.push(socket);
    loft(arm,'upper-arm-mail',[[.025,.113,.116],[-.1,.116,.112],[-.245,.094,.095],[-.39,.076,.078]],C.mail,{kind:'mail',metal:.2,sides:28,sub:3});
    loft(forearm,'forearm-mail',[[.035,.078,.08],[-.08,.095,.089],[-.23,.07,.07],[-.38,.052,.054]],C.mail,{kind:'mail',metal:.2,sides:28,sub:3});
    for(let i=0;i<3;i++){
      const top=[.123,.022,-.092][i],low=[-.105,-.208,-.322][i],rx=.231-i*.029,rz=.21-i*.026;
      const sweep=(p,a,v)=>[p[0]+sign*.018*v,p[1]-.016*Math.cos(a*2)*(v**3)-(.042+i*.009)*Math.max(0,sign*Math.sin(a))**2*v*v-.026*Math.max(0,Math.cos(a))**6*(v**3),p[2]-.008*i*Math.cos(a)*(v**2)];
      loft(arm,'pauldron-lame-'+sign+'-'+i,[[top,i===0?.048:rx*.81,i===0?.046:rz*.81],[top-.042,rx*.88,rz*.9],[low+.037,rx,rz],[low,rx*.97,rz*.985]],i%2?C.dark:C.steel,{sides:36,sub:3,open:i>0,shape:sweep});
      line(arm,'pauldron-hem-'+sign+'-'+i,Array.from({length:33},(_,j)=>{const a=j/32*Math.PI*2;return sweep([Math.sin(a)*rx*.97,low,Math.cos(a)*rz*.985],a,1);}),i===1?'#606d75':C.edge,.0045,{segments:44,radial:5});
      if(i===0){
        for(const side of[-1,1])line(arm,'pauldron-flute-'+sign+'-'+side,[[side*.055,.12,.035],[side*.123,.056,.117],[side*.178,-.03,.145],[side*.172,-.094,.14]],C.edge,.004,{segments:16});
        scroll(arm,'shoulder-scroll-'+sign,0,-.005,.218,.85,{mirror:sign});
        for(const x of[-.14,0,.14])rivet(arm,x,-.079,.181,.008);
      }
    }
    // Leaf-shaped rear shoulder fin gives the reference its broad dark profile.
    const fin=new THREE.Shape();fin.moveTo(-.11,.05);fin.bezierCurveTo(.02,.14,.18,.14,.25,.018);fin.bezierCurveTo(.175,.023,.11,-.055,-.018,-.066);fin.closePath();const finGroup=group(arm,sign*.04,.04,-.115);const finMesh=plate(finGroup,'pauldron-fin',fin,C.dark,{depth:.02,bevel:.008,bend:(x,y)=>.025*Math.sin(x*6)});finMesh.rotation.x=-.26;if(sign<0)reflectParts(finGroup);
    // Deep-fluted vambrace with a rolled open cuff and elbow overlap.
    loft(forearm,'vambrace',[[.024,.083,.085],[-.025,.10,.095],[-.11,.098,.091],[-.225,.077,.076],[-.337,.061,.06]],C.steel,{sides:32,sub:3,open:true,shape:(p,a,v)=>[p[0],p[1],p[2]+.007*Math.cos(a*6)*Math.sin(Math.PI*v)]});
    for(const y of[.005,-.33])line(forearm,'vambrace-cuff-'+sign+'-'+y,Array.from({length:29},(_,j)=>{const a=j/28*Math.PI*2,r=y>-.1?.086:.063;return[Math.sin(a)*r,y,Math.cos(a)*(r+.001)];}),C.edge,.005,{segments:34});
    for(const side of[-1,1])line(forearm,'vambrace-ridge-'+sign+'-'+side,[[side*.043,-.025,.085],[side*.047,-.12,.089],[side*.027,-.292,.062]],C.edge,.0038,{segments:18});
    scroll(forearm,'vambrace-scroll-'+sign,0,-.16,.105,.73,{mirror:sign});
    const elbow=shieldShape(.19,.14,.025);plate(forearm,'couter',elbow,C.dark,{z:.069,depth:.018,bevel:.009,bend:(x,y)=>.027*(1-(x/.13)**2)});
    for(const side of[-1,1])rivet(forearm,side*.065,.027,.102,.007);
    // Sparse real links around the uncovered lower sleeve supplement the
    // physically textured dense weave without a needless high-poly ring field.
    const ringGeo=geometry('v56-armor-mail-ring',()=>new THREE.TorusGeometry(.014,.0024,4,8));
    for(let row=0;row<3;row++)for(let col=0;col<6;col++){
      const a=-.78+col*.31+(row%2)*.1,r=.094;const link=surface(arm,ringGeo,C.mail,Math.sin(a)*r,-.255-row*.022,Math.cos(a)*r,[1,1,1],'steel',.4);link.rotation.y=a;link.rotation.z=(row%2?.22:-.22);
    }
  }
  const anatomy={height:2.72,headHeight:.42,headWidth:.36,hipHeight:1.10,shoulderHeight:1.94,headCenter:2.23,legSpread:.14,legSpacing:.14,stanceWidth:.28,ridingLift:.44,scale:1};
  root.userData.armorVersion=6;root.userData.armorStyle='forged-royal-plate';
  return{root,body,legs,knees,arms,forearms,handSockets,skirtPanels,anatomy,colors:C};
}
