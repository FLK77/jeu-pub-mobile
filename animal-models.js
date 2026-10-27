import * as THREE from 'three';

// Sculpted anatomical animals. The large surfaces are continuous lofts rather
// than intersecting ellipsoids; their fixed topology is shared by every coat.
export function createRoyalAnimals(k){
  const {scene,group,mesh,geometry,mat,batch}=k;
  const vertexMaterials=new Map();
  const detailSphere=geometry('anatomical-animal-detail',()=>new THREE.SphereGeometry(1,10,6));
  function surface(parent,geo,color,x=0,y=0,z=0,scale=[1,1,1],kind='horsehide',metal=0){
    const m=mesh(parent,geo,color,x,y,z,scale,metal),base=mat(color,metal,kind);
    if(geo.attributes.color){if(!vertexMaterials.has(base)){const material=base.clone();material.vertexColors=true;vertexMaterials.set(base,material);}m.material=vertexMaterials.get(base);}else m.material=base;return m;
  }
  function oval(parent,color,x,y,z,rx,ry=rx,rz=rx,kind='horsehide'){
    return surface(parent,detailSphere,color,x,y,z,[rx,ry,rz],kind);
  }
  function curve(parent,points,color,r=.012,kind='hide',segments=14,radial=5,taper=false){
    const geo=geometry('anatomical-animal-curve-'+JSON.stringify([points,r,segments,radial,taper]),()=>{
      const spine=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),g=new THREE.TubeGeometry(spine,segments,r,radial,false);
      if(taper){const p=g.attributes.position;for(let i=0;i<=segments;i++){const t=i/segments,c=spine.getPointAt(t),width=Math.max(.015,Math.pow(1-t, .55));for(let j=0;j<=radial;j++){const n=i*(radial+1)+j;p.setXYZ(n,c.x+(p.getX(n)-c.x)*width,c.y+(p.getY(n)-c.y)*width,c.z+(p.getZ(n)-c.z)*width);}}g.computeVertexNormals();}return g;
    });
    return surface(parent,geo,color,0,0,0,[1,1,1],kind);
  }
  // Sagittal loft: each section gives [height,forward,width,depth]. Smooth
  // interpolation follows the anatomical centreline and closes both poles.
  function loft(parent,name,sections,color,{rows=28,sides=24,kind='horsehide',muscle=0,pointsColor=null}={}){
    const geo=geometry('anatomical-animal-loft-'+name,()=>{
      const spine=new THREE.CatmullRomCurve3(sections.map(p=>new THREE.Vector3(0,p[0],p[1]))),
        radii=new THREE.CatmullRomCurve3(sections.map(p=>new THREE.Vector3(p[2],p[3],0))),vertices=[],uv=[],indices=[],colors=[];
      for(let i=0;i<=rows;i++){
        const t=i/rows,c=spine.getPoint(t),tangent=spine.getTangent(t).normalize(),normal=new THREE.Vector3(0,tangent.z,-tangent.y),r=radii.getPoint(t);
        for(let j=0;j<=sides;j++){
          const angle=j/sides*Math.PI*2,cs=Math.cos(angle),sn=Math.sin(angle),contour=1+muscle*Math.sin(t*Math.PI*3.5)*Math.pow(Math.abs(cs),5)*Math.sin(Math.PI*t);
          vertices.push(c.x+cs*Math.max(.0003,r.x)*contour,c.y+normal.y*sn*Math.max(.0003,r.y),c.z+normal.z*sn*Math.max(.0003,r.y));uv.push(j/sides,t);
          const shade=1-.07*Math.max(0,-sn)+.025*Math.sin(t*9)*Math.abs(cs);if(pointsColor){const blend=1-THREE.MathUtils.smoothstep(vertices[vertices.length-2],pointsColor.y-.045,pointsColor.y+.045),a=new THREE.Color(pointsColor.color),b=new THREE.Color(color);colors.push(shade*(1+blend*(a.r/Math.max(.0001,b.r)-1)),shade*(1+blend*(a.g/Math.max(.0001,b.g)-1)),shade*(1+blend*(a.b/Math.max(.0001,b.b)-1)));}else colors.push(shade,shade,shade);
          if(i<rows&&j<sides){const a=i*(sides+1)+j,b=a+1,c=a+sides+1,d=c+1;indices.push(a,b,c,b,d,c);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();
      const normals=g.attributes.normal;for(let row=0;row<=rows;row++){const a=row*(sides+1),b=a+sides,n=new THREE.Vector3(normals.getX(a)+normals.getX(b),normals.getY(a)+normals.getY(b),normals.getZ(a)+normals.getZ(b)).normalize();normals.setXYZ(a,n.x,n.y,n.z);normals.setXYZ(b,n.x,n.y,n.z);}return g;
    });return surface(parent,geo,color,0,0,0,[1,1,1],kind);
  }
  function strap(parent,name,points,width,color='#30261e',kind='hide',thickness=.006){
    const geo=geometry('anatomical-animal-strap-'+name+'-'+width+'-'+thickness,()=>{
      const path=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),vertices=[],uv=[],indices=[],rows=points.length*2,sideFacing=points.every(p=>p[0]>.08)||points.every(p=>p[0]<-.08),outward=new THREE.Vector3(sideFacing?Math.sign(points[0][0]):0,0,sideFacing?0:1);
      for(let i=0;i<=rows;i++){
        const t=i/rows,p=path.getPoint(t),v=path.getTangent(t),n=new THREE.Vector3().crossVectors(outward,v);if(n.length()<.01)n.set(1,0,0);n.normalize();
        for(let j=0;j<4;j++){const side=j%2?1:-1,depth=j<2?1:-1;vertices.push(p.x+n.x*width*.5*side+outward.x*depth*thickness,p.y+n.y*width*.5*side,p.z+n.z*width*.5*side+outward.z*depth*thickness);uv.push((side+1)/2,t*3);}
        if(i<rows){const a=i*4,b=a+4;indices.push(a,b,a+1,a+1,b,b+1,a+2,a+3,b+2,a+3,b+3,b+2,a,a+2,b,a+2,b+2,b,a+1,b+1,a+3,a+3,b+1,b+3);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
    });return surface(parent,geo,color,0,0,0,[1,1,1],kind);
  }
  function ring(parent,x,y,z,r=.035,metal=.65){
    return surface(parent,geometry('anatomical-animal-ring-'+r,()=>new THREE.TorusGeometry(r,.006,4,16)),'#b7b7ae',x,y,z,[1,1,1],'steel',metal);
  }
  function ear(parent,name,color,x,y,z,scale=1,pig=false){
    const geo=geometry('anatomical-animal-ear-'+name,()=>{
      const vertices=[],uv=[],indices=[],rows=8,sides=8;
      for(let i=0;i<=rows;i++){
        const t=i/rows,w=(pig?.095:.052)*Math.sin(Math.PI*Math.pow(t,.75)),h=(pig?.16:.245)*t;
        for(let j=0;j<=sides;j++){
          const a=j/sides*Math.PI*2;vertices.push(w*Math.cos(a)+(pig?.06:0)*t,h-(pig?.1:0)*t*t,.025*Math.sin(a)*Math.sin(Math.PI*t)+(pig?.1:-.035)*t*t);uv.push(j/sides,t);
          if(i<rows&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;indices.push(a,a+1,b,a+1,b+1,b);}
        }
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
    });return surface(parent,geo,color,x,y,z,[scale,scale,scale],pig?'skin':'horsehide');
  }
  const coats={
    chestnut:{body:'#713a20',light:'#95532d',shade:'#4b291e',mane:'#181815',muzzle:'#39382f',leg:'#26231e',mark:'#d0c4a6',blanket:'#624932'},
    ivory:{body:'#c3bda8',light:'#ded5bc',shade:'#a6a18f',mane:'#b7ac8b',muzzle:'#908776',leg:'#a49b84',mark:'#e0d9c4',blanket:'#344f56'},
    night:{body:'#252a2b',light:'#3d4140',shade:'#181d1f',mane:'#121719',muzzle:'#5c5d54',leg:'#181d1f',mark:'#aaa99a',blanket:'#464453'}
  };
  function horse(coat='chestnut'){
    const c=coats[coat]||coats.chestnut,root=group(scene),legs=[];
    // One continuous anatomical skin runs from croup to poll. The bent spine
    // blends the longer ribcage, deep shoulder and arched neck with shared normals.
    loft(root,'equine-body-neck',[[1.055,-1.17,.003,.004],[1.055,-1.07,.235,.245],[1.055,-.92,.35,.325],[1.055,-.62,.325,.335],[1.045,-.24,.305,.325],[1.12,.08,.325,.335],[1.3,.43,.275,.28],[1.52,.65,.225,.265],[1.73,.8,.18,.22],[1.89,.92,.14,.15],[1.97,.96,.09,.09],[2.01,.97,.003,.004]],c.body,{rows:64,sides:28,muscle:.035});
    for(const[i,x,z]of[[0,-.224,.48],[1,.224,.48],[2,-.245,-.83],[3,.245,-.83]]){
      const rear=i>1,leg=group(root,x,.98,z);
      const profile=rear?[[.31,-.015,.003,.004],[.14,-.015,.112,.13],[-.035,.015,.12,.145],[-.2,.115,.088,.1],[-.35,.085,.067,.075],[-.46,-.005,.055,.061],[-.59,-.005,.046,.05],[-.73,.03,.046,.05],[-.84,.05,.06,.071],[-.91,.095,.052,.058]]:
        [[.29,0,.003,.004],[.14,0,.092,.125],[-.04,.01,.087,.105],[-.24,.015,.06,.067],[-.38,.025,.064,.07],[-.48,.03,.045,.05],[-.62,.035,.04,.046],[-.77,.04,.05,.057],[-.86,.075,.055,.065],[-.91,.105,.043,.045]];
      // One uninterrupted limb surface carries the black coat points in its
      // vertex colors; no overlapping stockings or discontinuous joint normals.
      loft(leg,'equine-leg-'+(rear?'rear':'front')+'-'+coat,profile.slice().reverse(),c.body,{rows:28,sides:14,muscle:.025,pointsColor:{color:c.leg,y:rear?-.43:-.37}});
      // The hard horn capsule has a flat bearing sole, tilted wall and crisp
      // coronet, rather than the soft rounded profile of hide-covered joints.
      const hoofGeo=geometry('anatomical-equine-hoof-wall',()=>{const g=new THREE.CylinderGeometry(1,1,1,20,1,false),p=g.attributes.position;for(let v=0;v<p.count;v++){const top=p.getY(v)>.0,rx=top?.055:.073,rz=top?.068:.1,center=top?.087:.13;p.setXYZ(v,p.getX(v)*rx,top?-.89:-.979,p.getZ(v)*rz+center);}g.computeVertexNormals();return g;});
      surface(leg,hoofGeo,'#332e26',0,0,0,[1,1,1],'hoof');
      curve(leg,[[-.052,-.893,.118],[0,-.893,.155],[.052,-.893,.118]],'#756b58',.003,'hoof',9);
      legs.push(leg);
    }
    // A long wedge-shaped skull, narrow nasal bridge, cheekbone and soft muzzle.
    const head=group(root,0,1.88,.91);
    loft(head,'equine-skull',[[.075,-.105,.003,.003],[.08,-.035,.115,.14],[.025,.11,.142,.165],[-.075,.255,.119,.135],[-.205,.405,.09,.105],[-.32,.535,.109,.102],[-.365,.605,.105,.085],[-.37,.65,.055,.055],[-.37,.665,.003,.003]],c.body,{rows:26,sides:24,muscle:.04});
    loft(head,'equine-muzzle',[[-.32,.515,.061,.064],[-.335,.555,.113,.1],[-.365,.622,.112,.088],[-.375,.67,.086,.071],[-.37,.685,.006,.006]],c.muzzle,{rows:12,sides:20,kind:'skin'});
    for(const sign of [-1,1]){
      // Adult eyes are lateral and dark: no exposed cartoon white sclera.
      oval(head,c.shade,sign*.137,.033,.095,.019,.032,.043);
      oval(head,'#151a16',sign*.145,.035,.11,.009,.018,.025,'skin');
      oval(head,'#9e9977',sign*.15,.039,.118,.003,.007,.012,'skin');
      oval(head,'#ebe6ce',sign*.152,.045,.123,.002,.003,.004,'steel');
      curve(head,[[sign*.146,.055,.075],[sign*.153,.063,.107],[sign*.147,.053,.139]],c.shade,.006,'horsehide',9);
      curve(head,[[sign*.145,.021,.083],[sign*.153,.014,.108],[sign*.145,.02,.137]],c.shade,.004,'horsehide',9);
      const e=ear(head,'equine',c.body,sign*.084,.16,-.01);e.rotation.z=sign*-.18;e.rotation.x=-.08;
      const inner=ear(head,'equine-inner','#5b4940',sign*.084,.175,.006,.72);inner.rotation.z=sign*-.18;inner.rotation.x=-.08;
      // Nostril rim sits over an inset, outward-facing opening.
      const nostril=oval(head,'#151c18',sign*.092,-.322,.637,.025,.022,.009,'skin');nostril.rotation.y=sign*.62;nostril.rotation.z=sign*.3;
      curve(head,[[sign*.083,-.301,.641],[sign*.111,-.31,.638],[sign*.114,-.334,.623]],c.shade,.005,'skin',8);
      curve(head,[[sign*.091,-.411,.642],[sign*.11,-.409,.58],[sign*.106,-.365,.488]],'#292820',.0035,'skin',10);
      // Fitted flat bridle straps, adjustment buckles and actual bit rings.
      strap(head,'cheek-'+sign,[[sign*.124,.157,-.02],[sign*.165,.042,.069],[sign*.146,-.13,.29],[sign*.126,-.326,.525]],.027,'#29271f');
      const bit=ring(head,sign*.13,-.338,.525,.032);bit.rotation.y=Math.PI/2;
      const buckle=ring(head,sign*.158,-.061,.184,.017);buckle.rotation.y=Math.PI/2;buckle.scale.y=1.45;
      curve(root,[[sign*.126,1.542,1.435],[sign*.237,1.41,1.13],[sign*.29,1.31,.57],[sign*.24,1.5,.07]],'#322c22',.008,'hide',22,4);
    }
    strap(head,'poll',[[-.124,.157,-.025],[0,.215,-.082],[.124,.157,-.025]],.032);
    curve(head,[[-.157,.071,.135],[-.115,.137,.177],[0,.169,.198],[.115,.137,.177],[.157,.071,.135]],'#29271f',.011,'hide',18,6);
    curve(head,[[-.128,-.32,.558],[-.09,-.252,.598],[0,-.224,.615],[.09,-.252,.598],[.128,-.32,.558]],'#29271f',.014,'hide',18,6);
    curve(head,[[-.122,-.322,.52],[0,-.373,.48],[.122,-.322,.52]],'#30271e',.009,'hide',12,4);
    // The mane and tail have closed volumetric silhouettes from every angle.
    // Fine flowing locks sit over those masses rather than replacing their body.
    loft(root,'equine-mane',[[1.25,.19,.035,.04],[1.43,.22,.068,.075],[1.64,.34,.07,.082],[1.83,.53,.06,.075],[2.005,.79,.045,.07],[2.06,.9,.008,.012]],c.mane,{rows:28,sides:12,kind:'fur'});
    for(let i=0;i<10;i++){
      const t=i/9,y=1.34+t*.64,z=.19+t*.6;
      curve(root,[[-.025,y+.09,z],[-.065,y+.015,z-.065],[-.105,y-.115,z-.11],[-.105,y-.2,z-.1]],c.mane,.02,'fur',11,5,true);
    }
    for(let i=0;i<5;i++){
      const x=(i-2)*.021;curve(head,[[x,.188,-.016],[x*.8,.17,.093],[x+.016,.092,.195],[x+.025,.045,.225]],c.mane,.012,'fur',10,4,true);
    }
    const tail=group(root,0,1.24,-1.1);
    loft(tail,'equine-tail',[[-1.105,-.235,.0003,.0003],[-1.045,-.215,.018,.025],[-.93,-.17,.042,.047],[-.62,-.12,.066,.065],[-.33,-.08,.063,.059],[-.12,-.035,.05,.051],[.02,0,.025,.03]],c.mane,{rows:26,sides:12,kind:'fur'});
    for(let i=0;i<11;i++){
      const x=(i-5)*.012,length=1.01+Math.sin(i*1.7)*.07;curve(tail,[[x,-.08,-.035],[x*1.2,-.38,-.145],[x*1.4,-.7,-.18],[x*1.1,-length,-.25-Math.cos(i)*.015]],c.mane,.015,'fur',18,5,true);
    }
    // A fitted quilted pad follows the back; flaps, girth, breastplate, seat,
    // cantle and stirrup leathers are separate constructive layers.
    const pad=geometry('anatomical-saddle-pad',()=>{
      const vertices=[],uv=[],index=[],rows=20,columns=16;
      for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){
        const u=i/columns*2-1,z=j/rows*.88-.46,x=u*.405,y=1.418-.37*Math.pow(Math.abs(u),1.55)+.018*Math.cos(z*5);vertices.push(x,y,z);uv.push(i/columns*2,j/rows*2);
        if(i<columns&&j<rows){const a=j*(columns+1)+i,b=a+columns+1;index.push(a,b,a+1,a+1,b,b+1);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();return g;
    });surface(root,pad,c.blanket,0,0,0,[1,1,1],'quilt');
    for(const sign of [-1,1]){
      curve(root,[[sign*.405,1.058,-.46],[sign*.405,1.066,-.02],[sign*.405,1.058,.42]],'#9c8155',.008,'hide',14);
      // Saddle skirts cover the pad top and bend down alongside the ribcage.
      strap(root,'saddle-flap-'+sign,[[sign*.18,1.438,.12],[sign*.31,1.34,.09],[sign*.357,1.18,-.01],[sign*.36,1.04,-.06]],.31,'#3b2b21','hide',.009);
      strap(root,'girth-'+sign,[[sign*.25,1.32,.17],[sign*.327,1.11,.17],[sign*.29,.83,.17],[sign*.1,.735,.17]],.065,'#3b3025');
      strap(root,'stirrup-leather-'+sign,[[sign*.227,1.46,.015],[sign*.36,1.25,-.015],[sign*.39,.92,-.035]],.032,'#34291f');
      // Forged flattened stirrup, with an open loop and a horizontal footbed.
      curve(root,[[sign*.39,.93,-.036],[sign*.48,.86,-.036],[sign*.47,.785,-.036],[sign*.31,.785,-.036],[sign*.3,.86,-.036],[sign*.39,.93,-.036]],'#a6a59a',.009,'steel',18);
      curve(root,[[sign*.31,.785,-.02],[sign*.39,.78,-.02],[sign*.47,.785,-.02]],'#b8b8a9',.015,'steel',5,4);
      strap(root,'breastplate-'+sign,[[sign*.26,1.39,.22],[sign*.335,1.24,.47],[sign*.24,1.02,.66],[0,.93,.728]],.033,'#30271e');
      const br=ring(root,sign*.25,1.05,.66,.027);br.rotation.y=sign*.6;
    }
    loft(root,'saddle-seat',[[1.444,-.35,.22,.018],[1.463,-.27,.245,.028],[1.452,-.06,.23,.025],[1.476,.16,.21,.038],[1.48,.22,.15,.025]],'#463124',{rows:14,sides:18,kind:'hide'});
    curve(root,[[-.23,1.464,-.32],[-.17,1.485,-.36],[0,1.505,-.37],[.17,1.485,-.36],[.23,1.464,-.32]],'#51402b',.029,'hide',18,6);
    curve(root,[[-.19,1.47,.19],[-.1,1.49,.22],[0,1.505,.225],[.1,1.49,.22],[.19,1.47,.19]],'#51402b',.022,'hide',15,6);
    for(const part of [...legs,head,tail])batch(part);batch(root,[...legs,head,tail]);
    root.userData={animal:'horse',coat,modelVersion:5,designRevision:2,modelStyle:'realistic',anatomy:'adult-equine',saddleHeight:1.46,hoofHeight:0,headLength:.77,bodyLength:1.91,continuousBodyNeck:true};
    return{root,legs,head,tail,coat};
  }
  function pig(parent=scene,x=0,z=0){
    const root=group(parent,x,.3,z),skin='#b99b8c',shade='#947d72';
    loft(root,'porcine-barrel',[[.04,-.47,.004,.005],[.055,-.36,.18,.19],[.03,-.15,.255,.245],[.015,.1,.23,.23],[.04,.29,.17,.19],[.06,.4,.07,.12]],skin,{rows:24,sides:20,kind:'skin',muscle:.025});
    loft(root,'porcine-head',[[.07,.25,.13,.16],[.055,.38,.14,.145],[.005,.5,.095,.1],[-.016,.63,.082,.068],[-.014,.665,.08,.06]],skin,{rows:14,sides:18,kind:'skin'});
    // Broad cartilaginous snout with two deep nostrils and a subtle philtrum.
    const snout=oval(root,'#a27d70',0,-.009,.669,.088,.064,.016,'skin');
    for(const sign of [-1,1]){
      oval(root,'#51483d',sign*.033,-.009,.684,.014,.02,.006,'skin');
      oval(root,'#171e19',sign*.124,.117,.408,.012,.014,.017,'skin');
      curve(root,[[sign*.11,.128,.405],[sign*.124,.138,.411],[sign*.132,.128,.419]],shade,.004,'skin',7);
      const e=ear(root,'porcine',skin,sign*.13,.16,.288,1,true);e.rotation.z=sign*-.42;
      for(const zz of [-.28,.2]){
        const leg=loft(root,'porcine-leg',[[ -.255,0,.048,.047],[-.17,-.006,.045,.045],[-.075,-.01,.065,.059],[.045,0,.075,.09]],skin,{rows:10,sides:10,kind:'skin'});leg.position.set(sign*.17,0,zz);
        for(const hoofSide of [-1,1]){
          const hoof=loft(root,'porcine-cloven-hoof',[[-.301,.015,.019,.04],[-.285,.018,.024,.047],[-.232,0,.021,.033]],'#554f43',{rows:5,sides:8,kind:'hide'});hoof.position.set(sign*.17+hoofSide*.022,0,zz);
        }
      }
      curve(root,[[sign*.08,-.058,.606],[sign*.101,-.06,.535],[sign*.111,-.04,.48]],shade,.003,'skin',8);
    }
    curve(root,[[.015,.11,-.432],[.07,.14,-.49],[.086,.21,-.49],[.04,.23,-.481],[.025,.18,-.477]],shade,.012,'skin',18);
    for(let i=0;i<11;i++){
      const zz=-.31+i*.054;curve(root,[[(i%2?.015:-.013),.258-((zz+.05)**2)*.2,zz],[(i%2?.018:-.02),.279-((zz+.05)**2)*.2,zz-.006]],'#8d8771',.0017,'fur',2,3);
    }
    batch(root);root.userData={animal:'pig',modelVersion:5,designRevision:2,modelStyle:'realistic',anatomy:'adult-porcine'};return root;
  }
  return{horse,pig};
}
