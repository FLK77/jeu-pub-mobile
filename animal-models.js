import * as THREE from 'three';

// Original animal designs. All coats use shared painted fur; finer facial,
// tack and grooming details are geometric so they survive the game camera.
export function createRoyalAnimals(k){
  const {scene,group,mesh,geometry,mat,batch}=k;
  const sphere=geometry('v5-animal-sphere',()=>new THREE.SphereGeometry(1,16,10));
  const smallSphere=geometry('v5-animal-detail-sphere',()=>new THREE.SphereGeometry(1,10,7));
  function surface(p,geo,c,x=0,y=0,z=0,scale=[1,1,1],kind='fur',metal=0){const m=mesh(p,geo,c,x,y,z,scale,metal);m.material=mat(c,metal,kind);return m;}
  function oval(p,c,x,y,z,sx,sy=sx,sz=sx,kind='fur',detail=false){return surface(p,detail?smallSphere:sphere,c,x,y,z,[sx,sy,sz],kind);}
  function capsule(p,c,x,y,z,r,length,scale=[1,1,1],kind='fur'){return surface(p,geometry('v5-animal-capsule-'+r+'-'+length,()=>new THREE.CapsuleGeometry(r,length,3,10)),c,x,y,z,scale,kind);}
  function curve(p,points,c,r=.02,kind='leather',segments=12){return surface(p,geometry('v5-animal-curve-'+JSON.stringify([points,r,segments]),()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),segments,r,5,false)),c,0,0,0,[1,1,1],kind);}
  function metalRing(p,x,y,z,r=.04){return surface(p,geometry('v5-animal-ring-'+r,()=>new THREE.TorusGeometry(r,.009,5,18)),'#d9bd79',x,y,z,[1,1,1],null,.4);}
  function ribbon(p,name,points,width,c,kind='leather'){
    const geo=geometry('v5-animal-ribbon-'+name,()=>{const vertices=[],uv=[],indices=[];
      for(let i=0;i<points.length;i++){
        const point=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],length=Math.hypot(b[0]-a[0],b[1]-a[1])||1,nx=(b[1]-a[1])/length,ny=-(b[0]-a[0])/length;
        for(const side of [-1,1]){vertices.push(point[0]+nx*width*.5*side,point[1]+ny*width*.5*side,point[2]);uv.push((side+1)/2,i/(points.length-1));}
        if(i<points.length-1){const j=i*2;indices.push(j,j+1,j+2,j+1,j+3,j+2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(indices);g.computeVertexNormals();return g;
    });return surface(p,geo,c,0,0,0,[1,1,1],kind);
  }
  const coats={
    chestnut:{body:'#b7814d',light:'#cb9b65',shade:'#90633e',mane:'#493c32',muzzle:'#d3b48a',socks:'#e9ddc1',blanket:'#ad3656'},
    ivory:{body:'#e0ddca',light:'#f4ebd3',shade:'#b7bbaa',mane:'#b3a081',muzzle:'#bdac96',socks:'#8e968e',blanket:'#337e97'},
    night:{body:'#454c59',light:'#646f7c',shade:'#343c49',mane:'#272d38',muzzle:'#a0a397',socks:'#d1cbb8',blanket:'#66549a'}
  };
  function horse(coat='chestnut'){
    const c=coats[coat]||coats.chestnut,root=group(scene),legs=[];
    // Broad barrel, defined chest and haunches; the shoulder and hip muscles
    // blend into a tapered neck instead of a rectangular toy body.
    oval(root,c.body,0,1.05,-.035,.39,.39,.74);
    oval(root,c.light,0,1.07,.43,.365,.37,.37);
    oval(root,c.shade,0,1.08,-.5,.38,.36,.34);
    for(const side of [-1,1]){
      oval(root,c.light,side*.275,1.08,.36,.14,.29,.3);
      oval(root,c.body,side*.27,1.11,-.48,.15,.28,.29);
      curve(root,[[side*.32,1.21,.48],[side*.35,.97,.43],[side*.3,.8,.32]],c.shade,.009,'fur');
    }
    const neck=oval(root,c.body,0,1.5,.55,.255,.55,.28);neck.rotation.x=.39;
    oval(root,c.light,0,1.75,.7,.23,.31,.24);
    for(const [i,x,z]of[[0,-.25,.48],[1,.25,.48],[2,-.25,-.49],[3,.25,-.49]]){
      const leg=group(root,x,.91,z),rear=i>1;
      const upper=capsule(leg,c.body,0,-.12,rear?-.018:0,.095,.2,[1,1,1.1]);upper.rotation.x=rear?-.13:.04;
      oval(leg,c.shade,0,-.32,.01,.085,.09,.092);
      const cannon=capsule(leg,c.body,0,-.5,.025,.058,.24,[1,1,.95]);cannon.rotation.x=rear?.08:-.04;
      capsule(leg,c.socks,0,-.68,.04,.066,.12,[1,1,1]);
      oval(leg,'#423c35',0,-.815,.08,.093,.075,.135,'leather');
      curve(leg,[[-.075,-.823,.13],[0,-.842,.19],[.075,-.823,.13]],'#b2a08a',.006,'leather',8);
      legs.push(leg);
    }
    const head=group(root,0,1.91,.82),skull=oval(head,c.body,0,.01,.11,.205,.255,.335);skull.rotation.x=-.22;
    // Nasal bridge and soft muzzle, inset nostrils, fleshy eyelids and eye glints.
    oval(head,c.light,0,.055,.285,.13,.19,.14);
    oval(head,c.muzzle,0,-.135,.43,.19,.145,.225);
    oval(head,c.shade,0,-.205,.43,.155,.065,.2);
    for(const side of [-1,1]){
      const ear=oval(head,c.body,side*.135,.34,-.04,.066,.205,.057);ear.rotation.z=side*-.24;
      const inner=oval(head,coat==='night'?'#9c9594':'#d8b6a1',side*.135,.354,.009,.03,.137,.015,'skin',true);inner.rotation.z=side*-.24;
      oval(head,c.shade,side*.184,.073,.22,.037,.061,.07,'fur',true);
      oval(head,'#eee6d4',side*.204,.076,.24,.017,.038,.04,null,true);
      oval(head,'#26312e',side*.214,.075,.257,.014,.032,.029,null,true);
      oval(head,'#fff8df',side*.224,.092,.273,.007,.009,.011,null,true);
      curve(head,[[side*.205,.112,.19],[side*.218,.126,.23],[side*.214,.098,.274]],c.shade,.009,'fur',8);
      oval(head,coat==='night'?'#555b5b':'#80664e',side*.105,-.104,.605,.032,.041,.016,'skin',true);
      oval(head,'#3e3d38',side*.105,-.109,.619,.021,.028,.007,null,true);
      curve(head,[[side*.12,-.207,.575],[side*.16,-.21,.5],[side*.17,-.188,.38]],'#6c5d4f',.006,'skin',8);
      // A continuous bridle follows the cheek and poll; the bits sit outside.
      curve(head,[[side*.15,.2,-.07],[side*.22,.08,.13],[side*.205,-.08,.36],[side*.154,-.15,.49]],'#624832',.016,'leather');
      metalRing(head,side*.193,-.096,.39,.032).rotation.y=side*Math.PI/2;
      curve(root,[[side*.192,1.82,1.2],[side*.3,1.53,.8],[side*.31,1.45,.2],[side*.22,1.55,-.05]],'#82603c',.009,'leather',18);
    }
    curve(head,[[-.17,-.12,.51],[0,-.075,.612],[.17,-.12,.51]],'#684c34',.02,'leather');
    curve(head,[[-.15,.2,-.035],[0,.27,-.085],[.15,.2,-.035]],'#755335',.02,'leather');
    ribbon(head,'v5-horse-blaze',[[0,.2,.315],[0,.075,.405],[0,-.015,.477],[0,-.055,.541]],.05,c.socks,'fur');
    for(let i=0;i<5;i++){
      const x=(i-2)*.035;curve(head,[[x,.26,-.03],[x-.035,.28,.12],[x-.02,.15,.28],[x+.015,.13,.3]],i%2?c.mane:c.shade,.027,'fur',14);
    }
    // The mane and tail use individual flowing locks with a few relief strands.
    for(let i=0;i<8;i++){
      const y=1.4+i*.075,z=.33+i*.056;
      curve(root,[[0,y+.12,z-.08],[-.035,y+.05,z],[-.075,y-.11,z+.06]],i%2?c.mane:c.shade,.048,'fur',10);
    }
    const tail=group(root,0,1.13,-.72);tail.rotation.x=.25;
    for(let i=0;i<6;i++){
      const side=(i-2.5)*.018;curve(tail,[[side,0,0],[side*.8,-.19,-.11],[side*1.7,-.52,-.13],[side*1.8,-.68,-.2]],i%2?c.mane:c.shade,.032,'fur',14);
    }
    // Embroidered saddle blanket, shaped leather seat, padded rolls and straps.
    const blanketGeo=geometry('v5-saddle-blanket',()=>{
      const g=new THREE.PlaneGeometry(1.02,.84,14,12),p=g.attributes.position;
      for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getY(i);p.setXYZ(i,x,1.39-Math.pow(Math.abs(x)/.51,2)*.35+Math.sin(z*6)*.012,z-.07);}const indices=g.index.array;for(let i=0;i<indices.length;i+=3){const a=indices[i];indices[i]=indices[i+2];indices[i+2]=a;}g.computeVertexNormals();return g;
    });surface(root,blanketGeo,c.blanket,0,0,0,[1,1,1],'brocade');
    for(const sign of [-1,1]){
      curve(root,[[sign*.5,1.04,-.48],[sign*.505,1.12,-.07],[sign*.5,1.04,.35]],'#e8cf87',.009,'cloth');
      curve(root,[[sign*.49,1.055,-.46],[sign*.28,1.31,-.46],[0,1.4,-.46]],'#d4b778',.008,'cloth');
      curve(root,[[sign*.49,1.055,.33],[sign*.28,1.31,.33],[0,1.4,.33]],'#d4b778',.008,'cloth');
      for(let i=0;i<5;i++)oval(root,'#f0d995',sign*.505,1.10,-.35+i*.14,.008,.01,.008,null,true);
    }
    const seat=oval(root,'#6d4b32',0,1.44,-.075,.295,.065,.29,'leather');
    oval(root,'#8b6442',0,1.5,.2,.31,.092,.075,'leather');oval(root,'#8b6442',0,1.5,-.37,.31,.09,.08,'leather');
    for(const side of [-1,1]){
      curve(root,[[side*.27,1.46,.12],[side*.35,1.28,.08],[side*.37,.99,.005]],'#745338',.024,'leather');
      const stirrup=metalRing(root,side*.37,.955,.005,.081);stirrup.scale.y=.86;
      curve(root,[[side*.29,1.11,.08],[side*.39,.89,.01],[side*.32,.79,-.14]],'#7f5a3c',.027,'leather');
      const pouch=oval(root,'#8b6240',side*.32,1.32,-.34,.12,.14,.16,'leather');
      curve(root,[[side*.34,1.42,-.2],[side*.42,1.35,-.3],[side*.36,1.36,-.46]],'#c19e65',.009,'leather',8);
    }
    for(const part of [...legs,head,tail])batch(part);batch(root,[...legs,head,tail]);
    root.userData={animal:'horse',coat,modelVersion:5};return{root,legs,head,tail,coat};
  }
  function pig(parent=scene,x=0,z=0){
    const g=group(parent,x,.29,z),pink='#dca18c',light='#efb49b';
    oval(g,pink,0,.05,0,.27,.22,.39);oval(g,light,0,.11,.31,.2,.195,.21);
    oval(g,'#d28c81',0,.07,.49,.13,.089,.052,'skin');
    for(const side of [-1,1]){
      oval(g,'#864f4e',side*.058,.078,.538,.018,.024,.009,null,true);
      oval(g,'#eee3c9',side*.115,.197,.462,.027,.031,.017,null,true);
      oval(g,'#343b33',side*.118,.195,.477,.018,.024,.008,null,true);
      const ear=oval(g,pink,side*.16,.29,.27,.103,.14,.035);ear.rotation.z=side*-.6;
      const inner=oval(g,'#c47f79',side*.16,.295,.299,.059,.083,.009,'skin',true);inner.rotation.z=side*-.6;
      for(const zz of [-.2,.16]){
        capsule(g,'#be7a6b',side*.16,-.11,zz,.058,.1);oval(g,'#75544a',side*.16,-.21,zz+.015,.067,.042,.085,'leather');
        curve(g,[[side*.16,-.202,zz+.092],[side*.16,-.235,zz+.078]],'#483d35',.006,'leather',5);
      }
    }
    oval(g,'#c58a78',-.16,.16,-.14,.085,.06,.15);curve(g,[[.03,.12,-.37],[.13,.16,-.43],[.12,.25,-.48],[.03,.25,-.47],[.025,.18,-.44]],'#b9756e',.022,'fur',18);
    curve(g,[[-.08,.011,.477],[0,-.013,.509],[.08,.011,.477]],'#a65f5e',.006,'skin',8);
    batch(g);return g;
  }
  return{horse,pig};
}
