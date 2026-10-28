import * as THREE from 'three';
import anatomicalData from './assets/v56-king-anatomy.json' with {type:'json'};

// Only the brows use this anatomical fit. Projected barycentric samples come
// from the exact final head surface, not an estimated forehead ellipsoid.
const browSkinTriangles=(()=>{const d=anatomicalData.head,p=d.positions,triangles=[];for(let i=0;i<d.indices.length;i+=3){const a=d.indices[i]*3,b=d.indices[i+1]*3,c=d.indices[i+2]*3,minX=Math.min(p[a],p[b],p[c]),maxX=Math.max(p[a],p[b],p[c]),minY=Math.min(p[a+1],p[b+1],p[c+1]),maxY=Math.max(p[a+1],p[b+1],p[c+1]);if(maxX<-.15||minX>.15||maxY<.02||minY>.10)continue;const det=(p[b+1]-p[c+1])*(p[a]-p[c])+(p[c]-p[b])*(p[a+1]-p[c+1]);if(Math.abs(det)>1e-12)triangles.push({a,b,c,minX,maxX,minY,maxY,det});}return triangles;})();
function browSkinZ(x,y){const p=anatomicalData.head.positions;let front=-Infinity;for(const t of browSkinTriangles){if(x<t.minX-1e-7||x>t.maxX+1e-7||y<t.minY-1e-7||y>t.maxY+1e-7)continue;const u=((p[t.b+1]-p[t.c+1])*(x-p[t.c])+(p[t.c]-p[t.b])*(y-p[t.c+1]))/t.det,v=((p[t.c+1]-p[t.a+1])*(x-p[t.c])+(p[t.a]-p[t.c])*(y-p[t.c+1]))/t.det,w=1-u-v;if(u>=-1e-6&&v>=-1e-6&&w>=-1e-6)front=Math.max(front,u*p[t.a+2]+v*p[t.b+2]+w*p[t.c+2]);}if(!Number.isFinite(front))throw Error('Royal eyebrow lies outside the anatomical head');return front;}


// The king's silhouette is carried by authored sculptural surfaces: flowing
// grooved locks, a connected fur mantle, pierced metalwork and a closed drape.
// These meshes have no animation or scenery side effects and can be batched by
// the royal factory after the anatomical head and armour have been assembled.
export function createKingRegalia(k, appearance={}) {
  const a={hair:'#858b8d',beard:'long',hairStyle:'swept',crown:'classic',cape:'#252a31',emblem:'sun',...appearance};
  const headDress=new THREE.Group(),hair=new THREE.Group(),beard=new THREE.Group(),crown=new THREE.Group(),mantle=new THREE.Group(),cape=new THREE.Group();
  headDress.name='Royal hair, beard and pierced crown';hair.name='Sculpted swept hair';beard.name='Wavy anatomical beard';crown.name='Pierced founders crown';mantle.name='Connected grey fur mantle';cape.name='Heavy woven royal cape';
  headDress.add(hair,beard,crown);cape.position.set(0,1.94,-.12);
  const grey=a.hair,gold='#a78b42',goldEdge='#d0bb76',silver='#8b959c',ruby='#7e1523';
  const shade=(c,l)=>new THREE.Color(c).offsetHSL(0,0,l).getStyle();
  const geo=(key,make)=>k.geometry('king56-regalia-'+key,make);
  function surface(parent,g,color,kind='kingHair',metal=0){const m=new THREE.Mesh(g,k.mat(color,metal,kind));m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function geometry(positions,uv,index,colors=null){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(colors)g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(index);g.computeVertexNormals();return g;}
  function weldRings(g,rows,sides){const n=g.attributes.normal;for(let i=0;i<=rows;i++){const p=i*(sides+1),q=p+sides,v=new THREE.Vector3(n.getX(p)+n.getX(q),n.getY(p)+n.getY(q),n.getZ(p)+n.getZ(q)).normalize();n.setXYZ(p,v.x,v.y,v.z);n.setXYZ(q,v.x,v.y,v.z);}return g;}
  function lock(parent,name,points,width,color=grey,{depth=.53,rows=16,sides=12,grooves=5,kind='kingHair',tip=.025,root=.68,twist=.45,fitSkin=false}={}){
    const g=geo('lock-'+name,()=>{
      const path=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)),false,'centripetal'),frames=path.computeFrenetFrames(rows,false),p=[],uv=[],idx=[],fittedCenters=[];
      for(let i=0;i<=rows;i++){
        const t=i/rows,c=path.getPointAt(t),envelope=(root+(1-root)*Math.sin(Math.min(1,t*1.55)*Math.PI*.5))*Math.pow(1-t, .48)+tip*t;
        for(let j=0;j<=sides;j++){
          const u=j/sides,angle=u*Math.PI*2+twist*t,groove=1+.12*Math.cos(u*Math.PI*2*grooves+t*.7)+.035*Math.sin(u*Math.PI*2*(grooves+2)-t*2.3),r=width*envelope*groove;
          const v=c.clone().addScaledVector(frames.normals[i],Math.cos(angle)*r).addScaledVector(frames.binormals[i],Math.sin(angle)*r*depth);p.push(v.x,v.y,v.z);uv.push(u,t*1.4);
          if(i<rows&&j<sides){const v=i*(sides+1)+j,n=v+sides+1;idx.push(v,v+1,n,v+1,n+1,n);}
        }
        if(fitSkin){
          const start=i*(sides+1),deltas=[];let minimum=Infinity;
          for(let j=0;j<=sides;j++){const dz=p[(start+j)*3+2]-c.z;deltas.push(dz);minimum=Math.min(minimum,dz);}
          const lift=-minimum-.0012;
          for(let j=0;j<=sides;j++){const index=(start+j)*3;p[index+2]=browSkinZ(p[index],p[index+1])+lift+deltas[j];}
          fittedCenters[i]=[c.x,c.y,browSkinZ(c.x,c.y)+lift];
        }
      }
      // Closed roots and sharpened, irregular tips remain solid in side views.
      for(const [row,reverse] of [[0,true],[rows,false]]){const v=path.getPointAt(row/rows),center=p.length/3;p.push(...(fitSkin?fittedCenters[row]:[v.x,v.y,v.z]));uv.push(.5,row/rows);for(let j=0;j<sides;j++){const r=row*(sides+1)+j;reverse?idx.push(center,r+1,r):idx.push(center,r,r+1);}}
      return weldRings(geometry(p,uv,idx),rows,sides);
    });return surface(parent,g,color,kind);
  }
  function stroke(parent,name,points,color,r=.003,kind='steel',metal=.45,rows=12){
    return surface(parent,geo('stroke-'+name,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),rows,r,5,false)),color,kind,metal);
  }
  function extrude(parent,name,shape,color,{depth=.009,bevel=.0025,kind='steel',metal=.55,curve=0,segments=8}={}){
    const g=geo('extrude-'+name,()=>{const g=new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:segments});if(curve){g.computeBoundingBox();const b=g.boundingBox,w=Math.max(.001,b.max.x-b.min.x),h=Math.max(.001,b.max.y-b.min.y),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i)/w,y=(p.getY(i)-b.min.y)/h;p.setZ(i,p.getZ(i)+curve*(y*y+.65*x*x));}g.computeVertexNormals();}return g;});return surface(parent,g,color,kind,metal);
  }
  function gem(parent,name,x,y,z,sx,sy,sz,color=ruby){const m=surface(parent,geo('gem-cut',()=>new THREE.IcosahedronGeometry(1,0)),color,'steel',.15);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.name=name;return m;}

  // Scalp follows the real cranial surface but leaves the forehead, temples,
  // eyes and ears visible. Its back extends under the long layered locks.
  const scalp=geo('scalp-'+a.hairStyle,()=>{
    const p=[],uv=[],idx=[],rows=16,sides=40;
    for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){
      const t=i/rows,angle=j/sides*Math.PI*2,front=Math.max(0,Math.cos(angle)),end=2.70-front*1.58,phi=.015+t*end;
      p.push(Math.sin(angle)*Math.sin(phi)*.183,.024+Math.cos(phi)*.227,-.017+Math.cos(angle)*Math.sin(phi)*.195);uv.push(j/sides,t);
      if(i<rows&&j<sides){const v=i*(sides+1)+j,n=v+sides+1;idx.push(v,n,v+1,v+1,n,n+1);}
    }return weldRings(geometry(p,uv,idx),rows,sides);
  });surface(hair,scalp,shade(grey,-.07));
  const short=a.hairStyle==='short',length=short?.58:1;
  // Locks sweep under the circlet and then form overlapping S-shaped curls.
  // They are rounded sculpted masses, not straight ribbons or a white wig.
  for(let i=0;i<18;i++){
    const theta=1.02+i/17*4.24,s=Math.sin(theta),c=Math.cos(theta),phase=i*1.71,tipY=(-.24-.055*Math.sin(i*2.3))*length,turn=(i%2?1:-1);
    lock(hair,'back-'+a.hairStyle+'-'+i,[[s*.143,.166,c*.152-.028],[s*(.181+.010*Math.sin(phase)),.082,c*.195-.035],[s*(.215+.016*turn),-.022*length,c*.217-.044],[s*(.190-.011*turn),-.115*length,c*.211-.061],[s*(.223+.019*turn),tipY+.045,c*.183-.073],[s*(.207+.012*turn),tipY,c*.165-.074]],.029+(i%3)*.004,shade(grey,(i%4-2)*.020),{rows:19,depth:.74,grooves:5,twist:.62});
  }
  for(const sign of [-1,1])for(let i=0;i<5;i++){
    const y=.174-i*.012,x=sign*(.030+i*.021),z=.106+i*.009,tail=-.11-i*.027;
    lock(hair,'sweep-'+a.hairStyle+'-'+sign+'-'+i,[[x,y,z],[sign*(.112+i*.011),.143-i*.016,.163],[sign*(.183+i*.008),.055-i*.019,.135],[sign*(.199-i*.003),-.024-i*.021,.098],[sign*(.227+i*.005),tail+.04,.042],[sign*(.207+i*.006),tail,-.001]],.022+i*.0015,shade(grey,(i%3-1)*.020),{rows:20,depth:.72,grooves:5,twist:.8});
  }
  // Brows sit in front of the newly sculpted supraorbital ridges. Their inward
  // descent, tapered ends and individual swept hairs give the king a severe
  // expression without painted black lines or oversized cartoon eyes.
  const browColor=new THREE.Color(grey).lerp(new THREE.Color('#30383d'),.47).getStyle();
  for(const sign of[-1,1]){
    lock(hair,'heavy-brow-'+sign,[[sign*.023,.042,.185],[sign*.048,.053,.191],[sign*.075,.065,.178],[sign*.103,.066,.147],[sign*.122,.057,.114]],.0125,browColor,{rows:18,sides:12,depth:.67,grooves:5,root:.76,tip:.03,twist:.22,fitSkin:true});
    for(let j=0;j<4;j++)lock(hair,'brow-hair-'+sign+'-'+j,[[sign*(.033+j*.016),.046+j*.005,.196-Math.max(0,.033+j*.016-.055)*1.08],[sign*(.045+j*.016),.061+j*.003,.199-Math.max(0,.045+j*.016-.055)*1.08],[sign*(.060+j*.016),.067+j*.002,.194-Math.max(0,.060+j*.016-.055)*1.08]],.0036,shade(browColor,j*.012),{rows:8,sides:7,depth:.65,grooves:2,tip:.02,fitSkin:true});
  }
  if(a.hairStyle==='braids')for(const sign of [-1,1]){
    for(let strand=0;strand<3;strand++)lock(hair,'braid-'+sign+'-'+strand,Array.from({length:8},(_,i)=>{const t=i/7,angle=t*Math.PI*6+strand*Math.PI*2/3;return[sign*(.205+.015*Math.cos(angle)),-.09-t*.31,-.045+.014*Math.sin(angle)];}),.012,shade(grey,strand*.025),{rows:21,depth:.75,grooves:3});
  }

  if(a.beard!=='none'){
    const long=a.beard!=='short',beardLength=long?.335:.165,forward=long?1:.52;
    // A genuinely closed convex jaw mass supports the surface locks. Its top
    // contracts to a buried root instead of ending in a horizontal open rim.
    // Keeping this core recessed lets the visible S-curled locks carry relief.
    const core=geo('closed-jaw-beard-'+long,()=>{
      const rows=24,sides=40,p=[],uv=[],idx=[];
      for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){
        const t=i/rows,u=j/sides,angle=u*Math.PI*2,envelope=Math.pow(Math.max(0,Math.sin(Math.PI*t)),.56),rx=.153*envelope*(1-.23*t)+.00025,rz=.035*envelope+.00025,
          centerZ=.128+.079*t*forward+.016*Math.sin(t*Math.PI),centerY=-.114-t*beardLength,
          relief=(.0035*Math.sin(angle*7+t*8)+.002*Math.sin(angle*11-t*5))*envelope;
        p.push(Math.sin(angle)*(rx+relief),centerY,centerZ+Math.cos(angle)*(rz+relief*.45));uv.push(u,t);
        if(i<rows&&j<sides){const v=i*(sides+1)+j,n=v+sides+1;idx.push(v,n,v+1,v+1,n,n+1);}
      }
      for(const[row,reverse]of[[0,false],[rows,true]]){const i=row/rows,c=p.length/3;p.push(0,-.114-i*beardLength,.128+.079*i*forward);uv.push(.5,i);for(let j=0;j<sides;j++){const a=row*(sides+1)+j;reverse?idx.push(c,a+1,a):idx.push(c,a,a+1);}}
      return weldRings(geometry(p,uv,idx),rows,sides);
    });surface(beard,core,shade(grey,-.13));
    for(let i=0;i<17;i++){
      const u=(i-8)/8,x=u*.122,startY=-.132+.072*Math.pow(Math.abs(u),.8)+(i%3)*.003,finishY=-.114-beardLength+Math.abs(u)*.074+(i%3-1)*.014,phase=i*1.31,turn=i%2?1:-1,
        finishX=x*.52+.010*Math.sin(phase),front=.224+.027*forward;
      lock(beard,'wavy-front-'+long+'-'+i,[[x,startY,.179-Math.abs(u)*.048],[x+.010*turn,startY-.042,.212-Math.abs(u)*.030],[x*.90-.013*turn,startY-.103,.230-Math.abs(u)*.019],[x*.82+.016*turn,finishY+.117,front+.012-Math.abs(u)*.014],[finishX-.018*turn,finishY+.054,front-.003],[finishX+.012*turn,finishY+.017,front-.020],[finishX,finishY,front-.034]],.020+(1-Math.abs(u))*.004,shade(grey,(i%5-2)*.017),{rows:23,sides:12,depth:.78,grooves:5,twist:.9,tip:.022});
    }
    for(const sign of [-1,1]){
      for(let j=0;j<3;j++)lock(beard,'cheek-wave-'+long+'-'+sign+'-'+j,[[sign*(.138-j*.014),-.036-j*.015,.069+j*.027],[sign*(.144-j*.012),-.090-j*.018,.126+j*.018],[sign*(.123-j*.013),-.157-j*.018,.175+j*.016],[sign*(.134-j*.018),-.221-j*.019,.206+j*.010],[sign*(.103-j*.015),-.258-j*.023,.204]],.0185+(j===0?.003:0),shade(grey,-.025+j*.018),{rows:20,depth:.78,grooves:5,twist:.75});
      for(let i=0;i<3;i++)lock(beard,'moustache-'+sign+'-'+i,[[sign*.008,-.073+i*.002,.177],[sign*.035,-.067+i*.002,.191],[sign*.060,-.081-i*.001,.198],[sign*.080,-.093-i*.003,.187],[sign*.089,-.083-i*.005,.175]],.0085+i*.0018,shade(grey,.015-i*.018),{rows:18,depth:.72,grooves:4,twist:.65});
    }
  }

  // A low, wide forged circlet carries one dominant front crest and smaller
  // broad side leaves. Every petal bows in depth and its relief is modelled.
  const band=geo('heavy-crown-band',()=>{
    const sides=64,p=[],uv=[],idx=[],outer=[[.163,.184,.195],[.168,.190,.201],[.196,.194,.204],[.231,.193,.203],[.244,.187,.198],[.247,.182,.193]],profile=[...outer,...outer.slice().reverse().map(([y,x,z])=>[y,x-.011,z-.011]),outer[0]],rows=profile.length-1;
    for(let row=0;row<=rows;row++)for(let j=0;j<=sides;j++){
      const angle=j/sides*Math.PI*2,[y,rx,rz]=profile[row],ornament=.0015*Math.cos(angle*24);p.push(Math.sin(angle)*(rx+ornament),y,Math.cos(angle)*(rz+ornament)-.014);uv.push(j/sides,row/rows);
      if(row<rows&&j<sides){const n=row*(sides+1)+j,b=n+sides+1;idx.push(n,n+1,b,n+1,b+1,b);}
    }return weldRings(geometry(p,uv,idx),rows,sides);
  });surface(crown,band,gold,'steel',.65);
  for(const y of [.171,.238]){
    const points=Array.from({length:41},(_,i)=>{const a=i/40*Math.PI*2;return[Math.sin(a)*.192,y,Math.cos(a)*.203-.014];});stroke(crown,'heavy-circlet-cord-'+y,points,goldEdge,.0044,'steel',.65,56);
  }
  const count=6;
  for(let i=0;i<count;i++){
    const angle=i/count*Math.PI*2,front=Math.cos(angle),main=i===0,rear=i===3,ornament=new THREE.Group();ornament.position.set(Math.sin(angle)*.188,.227,Math.cos(angle)*.200-.014);ornament.rotation.y=angle;crown.add(ornament);
    const h=(main?.191:rear?.145:.125)+(a.crown==='spiked'?.018:0),w=main?.090:rear?.075:.073,shape=new THREE.Shape();
    shape.moveTo(-w,0);shape.bezierCurveTo(-w*.82,h*.18,-w*.96,h*.28,-w*.91,h*.43);shape.bezierCurveTo(-w*.66,h*.36,-w*.40,h*.38,-w*.34,h*.57);shape.bezierCurveTo(-w*.29,h*.76,-w*.07,h*.84,0,h);shape.bezierCurveTo(w*.07,h*.84,w*.29,h*.76,w*.34,h*.57);shape.bezierCurveTo(w*.40,h*.38,w*.66,h*.36,w*.91,h*.43);shape.bezierCurveTo(w*.96,h*.28,w*.82,h*.18,w,0);shape.closePath();
    const aperture=new THREE.Path();aperture.moveTo(0,h*.43);aperture.bezierCurveTo(-w*.16,h*.53,-w*.14,h*.62,0,h*.76);aperture.bezierCurveTo(w*.14,h*.62,w*.16,h*.53,0,h*.43);shape.holes.push(aperture);
    extrude(ornament,'forged-leaf-'+i+'-'+a.crown,shape,gold,{depth:.017,bevel:.003,curve:.018,segments:7});
    for(const sign of [-1,1]){
      stroke(ornament,'raised-crown-scroll-'+i+'-'+sign,[[sign*w*.80,.012,.023],[sign*w*.61,h*.27,.031],[sign*w*.34,h*.36,.036],[sign*w*.20,h*.28,.036],[sign*w*.32,h*.18,.029],[sign*w*.42,h*.20,.030]],goldEdge,.0034,'steel',.65,14);
      const leaf=new THREE.Shape();leaf.moveTo(0,0);leaf.bezierCurveTo(-.012,.012,-.011,.030,0,.042);leaf.bezierCurveTo(.013,.031,.013,.011,0,0);leaf.closePath();
      const raised=extrude(ornament,'crown-embossed-leaf-'+i+'-'+sign,leaf,goldEdge,{depth:.005,bevel:.0015,curve:.007,segments:5});raised.position.set(sign*w*.52,h*.23,.028);raised.rotation.z=-sign*.55;
      stroke(ornament,'crown-leaf-vein-'+i+'-'+sign,[[sign*w*.52,h*.24,.039],[sign*(w*.52+.005),h*.26,.043],[sign*(w*.52+.014),h*.27,.044]],gold,.0015,'steel',.65,6);
    }
    const setting=new THREE.Shape();setting.absellipse(0,h*.18,w*.285,h*.16,0,Math.PI*2,false);const hole=new THREE.Path();hole.absellipse(0,h*.18,w*.205,h*.12,0,Math.PI*2,true);setting.holes.push(hole);extrude(ornament,'deep-ruby-setting-'+i,setting,goldEdge,{depth:.018,bevel:.0025,segments:6});
    gem(ornament,'Royal ruby '+i,0,h*.18,.034,w*.205,h*.12,.016,front>.2?ruby:'#533f22');
    if(main)gem(ornament,'Central upper ruby',0,h*.86,.039,.009,.013,.008,ruby);
  }
  // Embossed interlaced arches run around the broad band between the crests.
  for(let i=0;i<18;i++){
    const a=i/18*Math.PI*2,points=Array.from({length:7},(_,j)=>{const t=j/6,angle=a+(t-.5)*.28;return[Math.sin(angle)*.195,.190+.024*Math.sin(t*Math.PI),Math.cos(angle)*.206-.014];});stroke(crown,'circlet-emboss-'+i,points,i%2?gold:goldEdge,.0025,'steel',.65,10);
  }

  // A high horseshoe collar follows the nape and shoulder plates, leaving
  // an actual front opening for the beard. Its compact rounded fur curls hug
  // this continuous surface instead of poking through the breastplate.
  function mantlePoint(t,r){const angle=.62+t*(Math.PI*2-1.24),front=Math.max(0,Math.cos(angle)),back=Math.max(0,-Math.cos(angle)),rx=.158+r*.455,rz=.144+r*.163;return[Math.sin(angle)*rx,2.159-r*.057-front*r*.020+back*.015*Math.sin(Math.PI*r)-Math.sin(angle)**2*r*.004,Math.cos(angle)*rz-.055];}
  const mantleGeo=geo('high-horseshoe-mantle',()=>{
    const rows=10,sides=64,p=[],uv=[],idx=[];
    for(let i=0;i<=rows;i++)for(let j=0;j<=sides;j++){const t=j/sides,r=i/rows,v=mantlePoint(t,r);v[1]+=.004*Math.sin(j*2.1+i*.55)*Math.sin(Math.PI*r);p.push(...v);uv.push(t*3,r);if(i<rows&&j<sides){const a=i*(sides+1)+j,b=a+sides+1;idx.push(a,b,a+1,a+1,b,b+1);}}
    return geometry(p,uv,idx);
  });surface(mantle,mantleGeo,'#626b70','kingFur');
  const furTufts=170;
  for(let i=0;i<furTufts;i++){
    const t=(i*.61803398875)%1,r=.08+.92*Math.sqrt((i+.5)/furTufts),p=mantlePoint(t,r),angle=.62+t*(Math.PI*2-1.24),length=.025+(i%5)*.003,dx=Math.sin(angle),dz=Math.cos(angle),turn=i%2?1:-1;
    lock(mantle,'rounded-collar-fur-'+i,[[p[0],p[1]+.009,p[2]],[p[0]+dx*.005,p[1]+.006,p[2]+dz*.004],[p[0]+dx*.012+turn*.003,p[1]-.003,p[2]+dz*.009],[p[0]+dx*.017,p[1]-length*.65,p[2]+dz*.013],[p[0]+dx*.013-turn*.002,p[1]-length,p[2]+dz*.011]],.009+(i%4)*.0011,['#626b70','#747d81','#596267','#81898c'][i%4],{rows:5,sides:7,grooves:2,depth:.85,tip:.07,root:.72,kind:'kingFur',twist:.35});
  }
  // Raised eight-spoked clasps with a real backing plate and a rolled border.
  for(const sign of [-1,1]){
    const g=new THREE.Group();g.position.set(sign*.245,2.012,.220);g.rotation.y=sign*.12;mantle.add(g);
    stroke(mantle,'clasp-anchor-'+sign,[[sign*.251,2.092,.177],[sign*.245,2.054,.201],[sign*.245,2.014,.220]],'#737e86',.008,'steel',.4,8);
    const disc=surface(g,geo('mantle-clasp-disc',()=>new THREE.CylinderGeometry(.062,.066,.012,32,1)), '#434b53','steel',.4);disc.rotation.x=Math.PI/2;
    const outer=surface(g,geo('mantle-clasp-ring',()=>new THREE.TorusGeometry(.057,.0048,6,40)),silver,'steel',.55);outer.position.z=.010;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;stroke(g,'clasp-spoke-'+sign+'-'+i,[[Math.cos(a)*.012,Math.sin(a)*.012,.016],[Math.cos(a+.13)*.033,Math.sin(a+.13)*.033,.023],[Math.cos(a)*.050,Math.sin(a)*.050,.015]],'#a7aeb0',.003,'steel',.5,7);}
    gem(g,'Clasp centre',0,0,.024,.009,.009,.007,'#4d565e');
  }

  const clothColor=a.cape||'#252a31';
  const drape=(u,v,inner=false)=>{
    const width=.375+.255*Math.pow(v,.64),fold=Math.sin(u*Math.PI*5.0+v*.35)*(.018+.041*v)+Math.sin(u*Math.PI*9-v*.9)*.009*v,
      sideLift=.16*Math.pow(Math.abs(u),2.2)*Math.pow(v,1.35),hem=.018*Math.sin(u*23)+.009*Math.sin(u*41+.5),thickness=inner?.010:0;
    return[u*width+.075*Math.sin(v*Math.PI*.8)*v,-1.66*v+sideLift+hem*Math.pow(v,12),-.10-.25*Math.pow(v,.72)+fold-thickness];
  };
  const capeGeo=geo('closed-weighted-cape',()=>{
    const nx=36,ny=32,p=[],uv=[],idx=[],layer=(nx+1)*(ny+1);
    for(let side=0;side<2;side++)for(let y=0;y<=ny;y++)for(let x=0;x<=nx;x++){const u=x/nx*2-1,v=y/ny;p.push(...drape(u,v,!!side));uv.push(x/nx*2,v*2.6);if(x<nx&&y<ny){const a=side*layer+y*(nx+1)+x,b=a+nx+1;side?idx.push(a,a+1,b,a+1,b+1,b):idx.push(a,b,a+1,a+1,b,b+1);}}
    for(let x=0;x<nx;x++)for(const y of[0,ny]){const a=y*(nx+1)+x,b=a+1,c=a+layer,d=b+layer;y===0?idx.push(a,b,c,b,d,c):idx.push(a,c,b,b,c,d);}
    for(let y=0;y<ny;y++)for(const x of[0,nx]){const a=y*(nx+1)+x,b=a+nx+1,c=a+layer,d=b+layer;x===0?idx.push(a,c,b,b,c,d):idx.push(a,b,c,b,d,c);}
    return geometry(p,uv,idx);
  });surface(cape,capeGeo,clothColor,'linen');
  for(const sign of [-1,1]){
    const edge=Array.from({length:18},(_,i)=>drape(sign,i/17));stroke(cape,'cape-rolled-edge-'+sign,edge,shade(clothColor,.045),.006,'linen',0,24);
    const seam=Array.from({length:18},(_,i)=>drape(sign*.966,i/17));stroke(cape,'cape-stitched-edge-'+sign,seam,shade(clothColor,.10),.0017,'linen',0,24);
  }
  const bottom=Array.from({length:29},(_,i)=>drape(-1+i/14,1));stroke(cape,'cape-weighted-hem',bottom,shade(clothColor,.055),.0065,'linen',0,36);

  const metrics={hairLocks:28+(a.hairStyle==='braids'?6:0),beardLocks:a.beard==='none'?0:29,eyebrowLocks:10,closedBeardCore:true,furTufts:170,crownFleurs:count,closedCape:true,crownHelmet:false};
  headDress.userData={royalRegalia:true,modelStyle:'sculpted',...metrics};mantle.userData={continuousShoulderMantle:true};cape.userData={closedShell:true,thickness:.010};
  return{headDress,hair,beard,crown,mantle,cape,metrics};
}
