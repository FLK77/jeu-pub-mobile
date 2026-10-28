import * as THREE from 'three';

// Authored continuous body/neck and limb lofts keep woodland animals readable
// while the four leg pivots, head and tail each merge to one physical surface.
export function createWildlifeModels(k){
  const {scene,group,mesh,geometry,mat,batch}=k,vertexMaterials=new Map();
  function surface(parent,g,color,x=0,y=0,z=0,scale=[1,1,1],kind='horsehide'){
    const m=mesh(parent,g,color,x,y,z,scale),base=mat(color,0,kind);
    if(g.attributes.color){if(!vertexMaterials.has(base)){const a=base.clone();a.vertexColors=true;vertexMaterials.set(base,a);}m.material=vertexMaterials.get(base);}else m.material=base;return m;
  }
  const sphere=geometry('v6-wildlife-detail',()=>new THREE.SphereGeometry(1,10,6));
  const oval=(p,c,x,y,z,sx,sy=sx,sz=sx,kind='horsehide')=>surface(p,sphere,c,x,y,z,[sx,sy,sz],kind);
  function curve(parent,points,color,r=.012,taper=true){
    const key='v6-wildlife-curve-'+JSON.stringify([points,r,taper]);
    const geo=geometry(key,()=>{
      const spine=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),rows=Math.max(3,points.length*3),sides=5,g=new THREE.TubeGeometry(spine,rows,r,sides,false),p=g.attributes.position;
      if(taper)for(let i=0;i<=rows;i++){const t=i/rows,c=spine.getPointAt(t),w=Math.max(.035,1-t*.94);for(let j=0;j<=sides;j++){const n=i*(sides+1)+j;p.setXYZ(n,c.x+(p.getX(n)-c.x)*w,c.y+(p.getY(n)-c.y)*w,c.z+(p.getZ(n)-c.z)*w);}}g.computeVertexNormals();return g;
    });return surface(parent,geo,color);
  }
  // [y, z, halfWidth, halfDepth] sections follow a sagittal spine. Their smooth
  // frames make a real shoulder/neck transition and tapered, closed extremities.
  function loft(parent,name,sections,color,{rows=24,sides=14,muscle=.025}={}){
    const g=geometry('v6-wildlife-loft-'+name,()=>{
      const spine=new THREE.CatmullRomCurve3(sections.map(v=>new THREE.Vector3(0,v[0],v[1]))),radii=new THREE.CatmullRomCurve3(sections.map(v=>new THREE.Vector3(v[2],v[3],0))),pos=[],uv=[],colors=[],idx=[];
      for(let i=0;i<=rows;i++){
        const t=i/rows,c=spine.getPoint(t),v=spine.getTangent(t).normalize(),n=new THREE.Vector3(0,v.z,-v.y),r=radii.getPoint(t);
        for(let j=0;j<=sides;j++){
          const a=j/sides*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a),rx=Math.max(.0004,r.x),rz=Math.max(.0004,r.y),contour=1+muscle*Math.sin(t*Math.PI*4)*cs**4;
          pos.push(cs*rx*contour,c.y+n.y*sn*rz,c.z+n.z*sn*rz);uv.push(j/sides,t);
          const shade=1-.11*Math.max(0,-sn)+.035*Math.sin(t*7);colors.push(shade,shade,shade);
          if(i<rows&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();
      const normals=g.attributes.normal;for(let row=0;row<=rows;row++){const a=row*(sides+1),b=a+sides,n=new THREE.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}return g;
    });return surface(parent,g,color);
  }
  function ear(parent,name,color,x,y,z,{height=.22,width=.075,lean=-.04,rotation=0,inner='#9b8771'}={}){
    const sections=[[0,0,.012,.012],[height*.16,0,width*.7,.025],[height*.45,lean*.3,width,.022],[height*.75,lean*.65,width*.65,.014],[height,lean,.0005,.0005]];
    const root=group(parent,x,y,z);root.rotation.z=rotation;loft(root,'ear-'+name,sections,color,{rows:12,sides:8});
    const inset=loft(root,'ear-inset-'+name,sections.map(([y,z,w,d])=>[y*.79+.02,z+.02,w*.55,d*.26]),inner,{rows:9,sides:8});return root;
  }
  function eyes(parent,{x=.1,y=0,z=.1,shade='#5b4936',amber='#9d8b55'}={}){
    for(const sign of [-1,1]){
      oval(parent,shade,sign*x,y,z,.018,.027,.032);
      oval(parent,'#141c18',sign*(x+.008),y+.002,z+.009,.009,.017,.020,'skin');
      oval(parent,amber,sign*(x+.014),y+.003,z+.015,.004,.011,.011,'skin');
      oval(parent,'#e2ddbf',sign*(x+.017),y+.009,z+.02,.0018,.003,.003,'skin');
      curve(parent,[[sign*(x-.008),y+.025,z-.006],[sign*(x+.014),y+.03,z+.009],[sign*(x+.018),y+.014,z+.027]],shade,.004,false);
    }
  }
  function leg(root,kind,name,x,z,sections,color,{hoof=true,hoofWidth=.035,hoofDepth=.055,hoofY=.015}={}){
    const top=sections.at(-1)[0],p=group(root,x,top,z);
    const profile=sections.map(([y,zz,w,d])=>[y-top,zz,w,d]);loft(p,kind+'-'+name,profile,color,{rows:18,sides:10});
    if(hoof){
      for(const s of [-1,1]){
        const h=oval(p,'#3e3d32',s*hoofWidth*.48,hoofY-top,profile[0][1]+hoofDepth*.25,hoofWidth*.58,.029,hoofDepth);h.rotation.x=-.08;
      }
    }
    return p;
  }
  function deer(){
    const root=group(scene),legs=[],color='#956a42',light='#c2a67b',dark='#67513b';
    loft(root,'deer-body-neck',[[.93,-.76,.003,.003],[.94,-.66,.20,.21],[.91,-.36,.225,.255],[.92,-.02,.22,.25],[1.02,.28,.19,.23],[1.19,.40,.13,.17],[1.43,.47,.10,.12],[1.56,.49,.07,.085],[1.62,.51,.002,.003]],color,{rows:38,sides:18});
    // Pale throat and chest are fitted continuous surfaces with their own folds.
    loft(root,'deer-throat',[[.92,.40,.025,.026],[1.10,.51,.067,.043],[1.32,.57,.052,.03],[1.49,.59,.019,.018]],light,{rows:16,sides:10});
    for(let i=0;i<4;i++){
      const rear=i>1,x=(i%2?1:-1)*(rear?.155:.14),z=rear?-.56:.24;
      const sections=rear?[[.035,.05,.025,.032],[.13,.024,.022,.025],[.37,-.04,.027,.03],[.51,.08,.04,.047],[.70,.05,.067,.083],[.95,0,.08,.105]]:[[.035,.03,.022,.03],[.19,.017,.019,.023],[.47,.012,.025,.029],[.61,.012,.035,.042],[.81,0,.043,.055],[1.04,0,.068,.087]];
      legs.push(leg(root,'deer',rear?'hind':'front',x,z,sections,color));
    }
    const head=group(root,0,1.54,.51);
    loft(head,'deer-skull',[[.07,-.08,.003,.003],[.08,.01,.09,.10],[.035,.14,.087,.09],[-.04,.27,.061,.06],[-.09,.35,.059,.049],[-.09,.38,.005,.005]],color,{rows:22,sides:16});
    oval(head,'#37382e',0,-.083,.367,.055,.032,.017);
    eyes(head,{x:.082,y:.042,z:.075,shade:dark});
    for(const sign of [-1,1]){
      ear(head,'deer',color,sign*.08,.13,-.025,{height:.23,width:.066,lean:-.015,rotation:sign*-.66,inner:light});
      // Branched antlers grow from two pedicles, with tapered individual tines.
      curve(head,[[sign*.055,.145,-.016],[sign*.10,.30,-.055],[sign*.15,.48,-.10],[sign*.14,.65,-.15]],'#a49a7f',.022);
      curve(head,[[sign*.105,.32,-.065],[sign*.19,.42,.015],[sign*.22,.52,.07]],'#b1a68a',.015);
      curve(head,[[sign*.142,.46,-.10],[sign*.24,.57,-.13],[sign*.29,.64,-.16]],'#b1a68a',.014);
      curve(head,[[sign*.14,.58,-.13],[sign*.07,.66,-.17]],'#b1a68a',.011);
    }
    const tail=group(root,0,1.01,-.70);loft(tail,'deer-tail',[[0,0,.04,.025],[.02,-.10,.065,.035],[-.04,-.20,.039,.025],[-.08,-.22,.002,.002]],light,{rows:12,sides:10});
    return finish(root,legs,head,tail,'deer',{height:2.21,length:1.72});
  }
  function wolf(){
    const root=group(scene),legs=[],base='#717468',light='#aaa994',shade='#4b5047';
    loft(root,'wolf-body-neck',[[.72,-.82,.003,.003],[.74,-.70,.18,.19],[.72,-.43,.20,.22],[.72,-.12,.19,.235],[.80,.18,.205,.25],[.97,.37,.18,.215],[1.10,.44,.135,.16],[1.18,.48,.06,.08],[1.20,.49,.002,.002]],base,{rows:32,sides:16});
    loft(root,'wolf-chest-bib',[[.43,.28,.02,.02],[.57,.40,.10,.05],[.78,.43,.16,.055],[.98,.51,.10,.045],[1.09,.56,.035,.025]],light,{rows:20,sides:12});
    for(let i=0;i<4;i++){
      const rear=i>1,x=(i%2?1:-1)*(rear?.14:.145),z=rear?-.61:.24;
      const sections=rear?[[.035,.05,.036,.06],[.11,.02,.035,.046],[.25,-.03,.03,.034],[.39,-.075,.035,.04],[.52,.045,.065,.08],[.76,0,.092,.12]]:[[.035,.07,.038,.065],[.10,.025,.035,.047],[.30,.01,.027,.032],[.49,.01,.04,.05],[.73,0,.052,.07],[.88,0,.07,.09]];
      const p=leg(root,'wolf',rear?'hind':'front',x,z,sections,base,{hoof:false});
      for(let toe=0;toe<3;toe++)oval(p,'#555b4f',(toe-1)*.022,.027-sections.at(-1)[0],.082,.014,.017,.032);
      legs.push(p);
    }
    const head=group(root,0,1.12,.47);
    loft(head,'wolf-skull',[[.07,-.10,.003,.003],[.10,-.02,.12,.12],[.10,.09,.125,.125],[.035,.19,.085,.085],[-.015,.30,.061,.052],[-.015,.38,.051,.044],[-.02,.405,.003,.003]],base,{rows:24,sides:16});
    loft(head,'wolf-muzzle',[[.0,.22,.025,.025],[-.045,.29,.058,.045],[-.052,.36,.058,.035],[-.047,.39,.02,.022]],light,{rows:10,sides:12});
    oval(head,'#222a24',0,-.005,.391,.051,.035,.025);
    eyes(head,{x:.108,y:.075,z:.085,shade,amber:'#bca05b'});
    for(const sign of [-1,1]){
      ear(head,'wolf',base,sign*.085,.16,-.012,{height:.19,width:.06,lean:-.04,rotation:sign*-.21,inner:'#a49e87'});
      curve(head,[[sign*.065,-.055,.36],[sign*.075,-.068,.26],[sign*.102,-.033,.18]],shade,.003,false);
      for(let i=0;i<5;i++)curve(root,[[sign*.14,.99-i*.057,.37-i*.011],[sign*(.20+i*.008),.88-i*.06,.32-i*.018],[sign*.16,.79-i*.065,.22-i*.016]],i%2?shade:base,.024);
      for(let i=0;i<5;i++)curve(head,[[sign*.10,.07-i*.028,.05],[sign*.16,.02-i*.032,.015],[sign*.15,-.04-i*.03,-.055]],i%2?light:base,.018);
    }
    const tail=group(root,0,.83,-.73);loft(tail,'wolf-tail',[[0,0,.055,.05],[-.03,-.14,.09,.08],[-.15,-.31,.10,.09],[-.32,-.43,.075,.065],[-.45,-.46,.03,.027],[-.47,-.45,.002,.002]],shade,{rows:24,sides:12});
    return finish(root,legs,head,tail,'wolf',{height:1.48,length:2.1});
  }
  function boar(){
    const root=group(scene),legs=[],base='#665342',shade='#3f3d33',light='#9a8a70';
    loft(root,'boar-body-neck',[[.57,-.69,.003,.003],[.59,-.57,.22,.24],[.57,-.29,.285,.30],[.58,.07,.29,.32],[.73,.27,.255,.34],[.82,.37,.20,.23],[.83,.44,.09,.13],[.82,.46,.003,.003]],base,{rows:32,sides:18,muscle:.045});
    for(let i=0;i<4;i++){
      const rear=i>1,x=(i%2?1:-1)*.20,z=rear?-.44:.25;
      const sections=[[.035,.03,.037,.051],[.12,.005,.035,.045],[.25,rear?-.035:0,.046,.05],[.43,.006,.07,.077],[.62,0,.085,.11]];
      legs.push(leg(root,'boar',rear?'hind':'front',x,z,sections,base,{hoofWidth:.039,hoofDepth:.049}));
    }
    const head=group(root,0,.78,.36);
    loft(head,'boar-skull',[[.08,-.09,.003,.003],[.11,.015,.18,.18],[.02,.19,.145,.145],[-.12,.36,.095,.09],[-.18,.48,.08,.068],[-.18,.53,.075,.06],[-.18,.55,.002,.002]],base,{rows:24,sides:16});
    oval(head,'#80725b',0,-.177,.532,.081,.062,.019);
    for(const sign of [-1,1]){
      oval(head,'#2b3028',sign*.03,-.17,.55,.013,.019,.006);
      ear(head,'boar',base,sign*.14,.16,.04,{height:.16,width:.065,lean:.05,rotation:sign*-.58,inner:'#8e7961'});
      // Two ivory upper canines curve out of the cheek and back toward the eye.
      curve(head,[[sign*.08,-.18,.40],[sign*.133,-.14,.48],[sign*.151,-.05,.48],[sign*.145,.025,.43]],'#d0c4a2',.028);
    }
    eyes(head,{x:.155,y:.064,z:.145,shade,amber:'#927e49'});
    for(let i=0;i<15;i++){
      const z=-.45+i*.065,y=.86+.22*Math.exp(-(((z-.25)/.30)**2));
      for(const sign of [-1,1])curve(root,[[sign*.018,y-.025,z],[sign*.022,y+.055,z-.03],[sign*.035,y+.10,z-.085]],i%3?shade:light,.012);
    }
    const tail=group(root,0,.70,-.63);curve(tail,[[0,0,0],[.025,-.07,-.15],[.04,-.19,-.21],[.03,-.29,-.19]],shade,.018);
    return finish(root,legs,head,tail,'boar',{height:1.20,length:1.61});
  }
  function rabbit(){
    const root=group(scene),legs=[],base='#9a8b71',light='#c6bda6',shade='#6b6556';
    loft(root,'rabbit-body',[[.28,-.37,.003,.003],[.32,-.29,.13,.17],[.36,-.15,.16,.20],[.34,.02,.13,.15],[.37,.13,.10,.11],[.43,.20,.075,.08],[.47,.21,.003,.003]],base,{rows:24,sides:14});
    for(let i=0;i<4;i++){
      const rear=i>1,x=(i%2?1:-1)*(rear?.105:.074),z=rear?-.20:.12;
      const sections=rear?[[.025,.10,.042,.10],[.07,.025,.045,.06],[.14,-.025,.065,.075],[.30,0,.086,.105]]:[[.024,.04,.024,.052],[.08,0,.022,.03],[.18,0,.026,.031],[.34,0,.035,.042]];
      legs.push(leg(root,'rabbit',rear?'hind':'front',x,z,sections,base,{hoof:false}));
    }
    const head=group(root,0,.43,.21);
    loft(head,'rabbit-skull',[[.02,-.035,.003,.003],[.065,.02,.09,.09],[.035,.10,.084,.08],[-.005,.17,.056,.046],[-.01,.20,.014,.015]],base,{rows:18,sides:14});
    oval(head,light,0,-.012,.162,.055,.035,.036);oval(head,'#66574c',0,-.004,.197,.014,.01,.008);
    eyes(head,{x:.077,y:.049,z:.059,shade,amber:'#594d38'});
    for(const sign of [-1,1]){
      ear(head,'rabbit',base,sign*.048,.105,-.018,{height:.32,width:.040,lean:-.055,rotation:sign*-.19,inner:'#b7a08d'});
      for(let i=0;i<3;i++)curve(head,[[sign*.025,-.01,.18],[sign*.072,-.015+i*.014,.19],[sign*.12,-.018+i*.026,.18]],'#c6beab',.0015);
    }
    const tail=group(root,0,.30,-.34);oval(tail,light,0,0,0,.065,.07,.065);
    return finish(root,legs,head,tail,'rabbit',{height:.88,length:.75});
  }
  function finish(root,legs,head,tail,kind,anatomy){
    for(const part of [...legs,head,tail])batch(part);batch(root,[...legs,head,tail]);
    root.userData={animal:kind,wildlife:true,modelVersion:6,designRevision:6,modelStyle:'realistic',anatomy,legs,head,tail};
    return{root,legs,head,tail};
  }
  function create(kind){return kind==='wolf'?wolf():kind==='boar'?boar():kind==='rabbit'?rabbit():deer();}
  return{create};
}
