import * as THREE from 'three';
import {createRoyalArchitecture} from './royal-architecture.js';
import {createRoyalKingFactory} from './royal-king.js';

// Original sculpted fantasy figures. Shapes are cached and surfaces are batched.
export function createRoyalModels(k) {
  const {scene,group,mesh,box,softBox,geometry,mat,batch}=k;
  const defaults={cape:'#24282d',hair:'#858b8d',beard:'long',skin:'#e1b18b',crown:'classic',outfit:'royal',emblem:'sun',hairStyle:'swept',eye:'#54737b',mountCoat:'chestnut'};
  const sculptedKing=createRoyalKingFactory(k,defaults);
  const tint=(color,amount)=>new THREE.Color(color).offsetHSL(0,0,amount).getStyle();
  const gold='#bda66b',goldLight='#d8c58d',steel='#a9b3b6',leather='#4c382c';
  const sphere=geometry('realistic-detail-sphere',()=>new THREE.SphereGeometry(1,16,12));
  const residentSphere=geometry('realistic-resident-detail',()=>new THREE.SphereGeometry(1,12,8));
  let detailed=true;
  function surface(parent,geo,color,x=0,y=0,z=0,scale=[1,1,1],metal=0,kind=null){
    const m=mesh(parent,geo,color,x,y,z,scale,metal);if(kind)m.material=mat(color,metal,kind);return m;
  }
  function oval(parent,color,x,y,z,sx,sy=sx,sz=sx,metal=0,kind=null){return surface(parent,detailed?sphere:residentSphere,color,x,y,z,[sx,sy,sz],metal,kind);}
  function tube(parent,points,color,r=.02,{taper=false,metal=0,kind=null,segments=14}={}){
    const radial=detailed?7:5;segments=detailed?segments:Math.min(10,segments);
    const geo=geometry('v4-curve-'+JSON.stringify([points,r,taper,segments,radial]),()=>{
      const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),geo=new THREE.TubeGeometry(curve,segments,r,radial,false);
      if(taper){const p=geo.attributes.position;for(let i=0;i<=segments;i++){
        const t=i/segments,c=curve.getPointAt(t),w=(.48+.66*Math.sin(Math.PI*Math.min(t*1.12,1)))*(1-Math.pow(t,3)*.97);
        for(let j=0;j<=radial;j++){const n=i*(radial+1)+j;p.setXYZ(n,c.x+(p.getX(n)-c.x)*w,c.y+(p.getY(n)-c.y)*w,c.z+(p.getZ(n)-c.z)*w);}
      }geo.computeVertexNormals();}return geo;
    });return surface(parent,geo,color,0,0,0,[1,1,1],metal,kind);
  }
  function lathe(parent,name,profile,color,x,y,z,scale=[1,1,1],kind=null,metal=0){
    return surface(parent,geometry('v4-lathe-'+name,()=>new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),24)),color,x,y,z,scale,metal,kind);
  }
  function capsule(parent,color,x,y,z,r,length,scale=[1,1,1],kind=null,metal=0){return surface(parent,geometry('v4-capsule-'+r+'-'+length+'-'+detailed,()=>new THREE.CapsuleGeometry(r,length,detailed?5:3,detailed?12:8)),color,x,y,z,scale,metal,kind);}
  function ring(parent,color,x,y,z,radius,thickness=.015,metal=.55){return surface(parent,geometry('v4-ring-'+radius+'-'+thickness+'-'+detailed,()=>new THREE.TorusGeometry(radius,thickness,detailed?6:4,detailed?32:16)),color,x,y,z,[1,1,1],metal);}
  function extrusion(parent,name,shape,color,x,y,z,depth=.04,bevel=.012,kind=null,metal=.3){
    return surface(parent,geometry('v4-extrude-'+name,()=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:8})),color,x,y,z,[1,1,1],metal,kind);
  }
  function axe(parent,x=0,y=0,z=0){
    const g=group(parent,x,y,z);tube(g,[[.015,-.43,0],[-.015,-.1,0],[0,.39,0]],'#8e6343',.035,{kind:'wood'});
    for(let i=0;i<6;i++){const wrap=ring(g,'#614a37',0,-.26+i*.031,0,.039,.012,0);wrap.rotation.x=Math.PI/2;}
    oval(g,gold,0,-.44,0,.055,.043,.055,.5);
    const s=new THREE.Shape();s.moveTo(-.02,.18);s.bezierCurveTo(.11,.19,.27,.33,.32,.3);s.bezierCurveTo(.45,.18,.45,-.05,.33,-.12);s.bezierCurveTo(.2,-.08,.15,.04,-.02,.03);s.closePath();
    extrusion(g,'royal-axe-blade',s,steel,0,.19,-.035,.07,.012,'metal',.65);
    tube(g,[[.33,.48,.045],[.405,.36,.045],[.4,.2,.045],[.33,.08,.045]],'#e5f0ea',.012,{metal:.65});oval(g,gold,0,.31,0,.068,.105,.065,.65);
    tube(g,[[-.04,.36,.055],[.02,.32,.075],[.065,.34,.055]],goldLight,.012,{metal:.5});return g;
  }
  function sword(parent,x=.43,y=.91,z=.17){
    const g=group(parent,x,y,z),s=new THREE.Shape();s.moveTo(-.045,-.13);s.lineTo(-.048,.46);s.lineTo(0,.65);s.lineTo(.048,.46);s.lineTo(.045,-.13);s.closePath();
    extrusion(g,'sword',s,'#d5e1df',0,0,-.018,.036,.006,'metal',.65);tube(g,[[0,-.1,.026],[0,.46,.027],[0,.58,.018]],'#f2f5e9',.006,{metal:.7});
    tube(g,[[-.19,-.17,0],[-.11,-.13,0],[0,-.15,0],[.11,-.13,0],[.19,-.17,0]],gold,.025,{metal:.5});
    capsule(g,leather,0,-.28,0,.036,.15,[1,1,1],'leather');oval(g,gold,0,-.4,0,.055,.055,.045,.55);return g;
  }
  function hammer(parent,x=.44,y=.85,z=.13){
    const g=group(parent,x,y,z);capsule(g,'#936c48',0,0,0,.027,.52,[1,1,1],'wood');
    const head=softBox(g,'#82979c',0,.3,0,.34,.16,.17);head.material=mat('#82979c',.55,'metal');oval(g,'#c5d4ce',-.18,.3,0,.045,.09,.09,.6);oval(g,leather,0,-.15,0,.043,.1,.043);return g;
  }
  function shield(parent,x=-.48,y=.93,z=.19){
    const g=group(parent,x,y,z),s=new THREE.Shape();s.moveTo(-.23,.29);s.quadraticCurveTo(0,.39,.23,.29);s.lineTo(.2,-.12);s.quadraticCurveTo(.12,-.3,0,-.37);s.quadraticCurveTo(-.12,-.3,-.2,-.12);s.closePath();
    extrusion(g,'shield',s,'#386794',0,0,0,.05,.018,'cloth',.15);
    tube(g,[[-.23,.29,.069],[0,.35,.069],[.23,.29,.069],[.2,-.12,.069],[0,-.37,.069],[-.2,-.12,.069],[-.23,.29,.069]],gold,.016,{metal:.5});
    tube(g,[[0,-.29,.075],[0,.27,.075]],gold,.016,{metal:.5});tube(g,[[-.17,.08,.075],[.17,.08,.075]],gold,.016,{metal:.5});oval(g,goldLight,0,.08,.086,.048,.048,.017,.6);return g;
  }
  // Continuous elliptical sections describe the anatomy and tailored garments.
  // Each section is [height, half width, half depth, front/back offset].
  // Cloth folds are displaced into the surface instead of stacked on as balls.
  function loft(parent,name,sections,color,{kind='cloth',metal=0,segments=detailed?24:16,fold=0,folds=10,open=false}={}){
    const geo=geometry('realistic-loft-'+name+'-'+segments,()=>{
      const authored=sections;
      if(sections.length>2){
        const curve=new THREE.CatmullRomCurve3(sections.map(([y,rx,rz])=>new THREE.Vector3(rx,y,rz)),false,'centripetal');
        const offsets=new THREE.CatmullRomCurve3(sections.map(([y,,,cz=0])=>new THREE.Vector3(cz,y,0)),false,'centripetal'),refined=[];
        const maxRx=Math.max(...sections.map(r=>r[1])),maxRz=Math.max(...sections.map(r=>r[2]));
        for(let i=0;i<(sections.length-1)*3;i++){const t=i/((sections.length-1)*3),v=curve.getPoint(t),c=offsets.getPoint(t);refined.push([v.y,Math.max(.002,Math.min(maxRx,v.x)),Math.max(.002,Math.min(maxRz,v.z)),c.x]);}
        refined.push(sections.at(-1));sections=refined;
      }
      const pos=[],uv=[],index=[];
      for(let row=0;row<sections.length;row++){
        const[y,rx,rz,cz=0]=sections[row],v=row/(sections.length-1);
        for(let j=0;j<=segments;j++){
          const u=j/segments,a=u*Math.PI*2,wrinkle=1+fold*Math.cos(a*folds+v*.6)*Math.sin(v*Math.PI);
          const xx=Math.sin(a)*rx*wrinkle,front=Math.max(0,Math.cos(a));let yy=y,zz=Math.cos(a)*rz*wrinkle+cz;
          if(name==='adult-tailored-torso'){
            const chest=Math.exp(-(((Math.abs(xx)-.122)/.106)**2)-(((y-1.64)/.15)**2)),abdomen=Math.exp(-(((y-1.39)/.12)**2));
            zz+=front**4*(.019*chest+.009*abdomen);zz+=front**3*Math.sin(y*62+Math.abs(xx)*24)*.003*Math.exp(-(((y-1.31)/.16)**2));
          }
          if(name==='fur-collar')yy-=front**8*.075;
          pos.push(xx,yy,zz);uv.push(u,v);
          if(row&&j){const n=row*(segments+1)+j;index.push(n,n-1,n-segments-2,n,n-segments-2,n-segments-1);}
        }
      }
      if(!open)for(const row of [0,sections.length-1]){
        const[y,,,cz=0]=sections[row],c=pos.length/3;pos.push(0,y,cz);uv.push(.5,.5);
        for(let j=0;j<segments;j++){const n=row*(segments+1)+j;row?index.push(c,n,n+1):index.push(c,n+1,n);}
      }
      // Ring profiles may run up or down a limb. Keep their skin outward in
      // both cases; a reversed leg profile must never render as an open tube.
      if(sections.at(-1)[0]<sections[0][0])for(let i=0;i<index.length;i+=3){const a=index[i];index[i]=index[i+2];index[i+2]=a;}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(index);g.computeVertexNormals();
      const normal=g.attributes.normal;
      for(let i=0;i<sections.length;i++){const a=i*(segments+1),b=a+segments,x=normal.getX(a)+normal.getX(b),y=normal.getY(a)+normal.getY(b),z=normal.getZ(a)+normal.getZ(b),n=Math.hypot(x,y,z)||1;for(const k of [a,b])normal.setXYZ(k,x/n,y/n,z/n);}
      return g;
    });return surface(parent,geo,color,0,0,0,[1,1,1],metal,kind);
  }
  function stroke(parent,points,color,r=.005,kind='hide',segments=8){return tube(parent,points,color,r,{kind,segments});}
  function strap(parent,name,points,width,color=leather,kind='hide'){
    const geo=geometry('realistic-strap-'+name,()=>{
      const pos=[],uv=[],idx=[];
      for(let i=0;i<points.length;i++){
        const p=points[i],a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1;
        for(const s of [-1,1]){pos.push(p[0]+(b[1]-a[1])/d*width*s*.5,p[1]-(b[0]-a[0])/d*width*s*.5,p[2]);uv.push((s+1)*.5,i/(points.length-1));}
        if(i){const j=i*2;idx.push(j-2,j-1,j,j-1,j+1,j);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
    });return surface(parent,geo,color,0,0,0,[1,1,1],0,kind);
  }
  function cloth(parent,name,color,{width=.28,height=.65,x=0,y=1,z=.18,split=false,kind='linen',metal=0,fold=.014,curve=0}={}){
    const geo=geometry('realistic-cloth-'+name,()=>{
      const nx=12,ny=14,pos=[],uv=[],idx=[];
      for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
        const u=i/nx,v=j/ny,xx=(u-.5)*width*(.86+.14*v+.035*Math.sin(v*Math.PI*2)),yy=y+height/2-v*height,zz=z+fold*Math.cos(u*Math.PI*8+.4*v)*v+.024*v*v-curve*Math.pow(Math.abs(u-.5)*2,2);
        pos.push(x+xx,yy,zz);uv.push(u,v);
        if(i&&j){const n=j*(nx+1)+i;idx.push(n,n-nx-2,n-1,n,n-nx-1,n-nx-2);}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
    });const m=surface(parent,geo,color,0,0,0,[1,1,1],metal,kind);m.material.side=THREE.DoubleSide;return m;
  }
  function stitches(parent,points,color='#baaa88',count=14){
    const line=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    for(let i=0;i<count;i++){const a=line.getPoint(i/count),b=line.getPoint((i+.35)/count);stroke(parent,[a.toArray(),b.toArray()],color,.0016,'cloth',2);}
  }
  function crest(parent,emblem,x,y,z,size=.54){
    const g=group(parent,x,y,z);g.scale.setScalar(size);
    if(emblem==='stag'){
      const shape=new THREE.Shape();shape.moveTo(0,-.13);shape.lineTo(-.055,-.04);shape.lineTo(-.055,.055);shape.lineTo(.055,.055);shape.lineTo(.055,-.04);shape.closePath();extrusion(g,'realistic-stag',shape,gold,0,0,0,.006,.002,'steel',.45);
      for(const s of [-1,1]){stroke(g,[[s*.035,.04,.01],[s*.085,.14,.01],[s*.07,.21,.01]],gold,.008,'steel');for(let i=0;i<2;i++)stroke(g,[[s*.06,.09+i*.055,.01],[s*(.11+i*.015),.135+i*.045,.01]],gold,.007,'steel');}
    }else if(emblem==='moon'){
      const shape=new THREE.Shape();shape.moveTo(.07,.14);shape.bezierCurveTo(-.18,.18,-.18,-.18,.07,-.14);shape.bezierCurveTo(-.045,-.07,-.045,.07,.07,.14);shape.closePath();extrusion(g,'realistic-crescent',shape,gold,0,0,0,.008,.002,'steel',.5);
    }else{
      ring(g,gold,0,0,.006,.075,.009,.45);for(let i=0;i<12;i++){const a=i*Math.PI/6;stroke(g,[[Math.cos(a)*.095,Math.sin(a)*.095,.008],[Math.cos(a)*.135,Math.sin(a)*.135,.008]],gold,.007,'steel',2);}
    }return g;
  }
  function cape(parent,color,emblem,royal=true){
    const g=group(parent,0,1.8,-.12),point=(u,v)=>[u*(.29+.16*v),-1.43*v+.026*Math.cos(u*Math.PI*2)*v,-.04-.12*v-.055*Math.cos(u*Math.PI*3)*v];
    const geo=geometry('realistic-cape',()=>{const g=new THREE.PlaneGeometry(2,1,20,20),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...point(p.getX(i),.5-p.getY(i)));g.computeVertexNormals();return g;});
    const m=surface(g,geo,color,0,0,0,[1,1,1],0,'linen');m.material.side=THREE.DoubleSide;
    for(const s of [-1,1])stroke(g,Array.from({length:10},(_,i)=>point(s,i/9)),tint(color,.12),.007,'cloth');
    stroke(g,Array.from({length:17},(_,i)=>point(-1+i/8,1)),gold,.009,'cloth');
    if(royal){const c=crest(g,emblem,0,-.9,-.19,.8);c.rotation.y=Math.PI;}
    return g;
  }
  // Facial anatomy is a single jaw/cheek/cranium mesh with eye sockets carved
  // into its front. The nose, eyelids, lips and ears use human scale features.
  function face(parent,a,{beard='none',hairStyle='short',royal=false,enemy=false}={}){
    const f=group(parent,0,2.095,.005),skin=a.skin,hair=a.hair;
    let rings=[[-.175,.067,.066,.018],[-.158,.097,.079,.008],[-.125,.119,.09,.002],[-.075,.132,.101,-.003],[-.02,.141,.108,-.008],[.035,.142,.106,-.01],[.09,.137,.107,-.012],[.145,.115,.09,-.019],[.18,.062,.052,-.02],[.19,.008,.009,-.02]];
    const headCurve=new THREE.CatmullRomCurve3(rings.map(([y,rx,rz])=>new THREE.Vector3(rx,y,rz)),false,'centripetal'),headOffset=new THREE.CatmullRomCurve3(rings.map(([y,,,z])=>new THREE.Vector3(z,y,0)),false,'centripetal');
    rings=Array.from({length:28},(_,i)=>{const t=i/27,p=headCurve.getPoint(t),c=headOffset.getPoint(t);return[p.y,p.x,p.z,c.x];});
    const geo=geometry('realistic-face-'+royal,()=>{
      const g=new THREE.BufferGeometry(),pos=[],uv=[],idx=[],n=royal?40:28;
      for(let i=0;i<rings.length;i++)for(let j=0;j<=n;j++){
        const[y,rx,rz,cz]=rings[i],a=j/n*Math.PI*2,x=Math.sin(a)*rx;let z=Math.cos(a)*rz+cz;
        if(Math.cos(a)>0){const mask=Math.cos(a)**4,eyeSocket=Math.exp(-(((Math.abs(x)-.062)/.03)**2)-(((y-.02)/.025)**2)),cheek=Math.exp(-(((Math.abs(x)-.085)/.045)**2)-(((y+.047)/.043)**2)),brow=Math.exp(-(((y-.075)/.023)**2));z+=mask*(.014*cheek-.013*eyeSocket+.007*brow);}
        pos.push(x,y,z);uv.push(j/n,i/(rings.length-1));if(i&&j){const k=i*(n+1)+j;idx.push(k,k-1,k-n-2,k,k-n-2,k-n-1);}
      }g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
    });surface(f,geo,skin,0,0,0,[1,1,1],0,'skin');
    for(const s of [-1,1]){
      const ear=loft(f,'ear-'+s,[[-.08,.018,.012],[-.05,.029,.015],[-.006,.027,.018],[.027,.017,.012],[.035,.004,.005]],skin,{kind:'skin',segments:12});ear.position.set(s*.142,-.005,-.015);ear.rotation.z=-s*.15;
      stroke(f,[[s*.146,.017,.003],[s*.16,.005,.006],[s*.158,-.045,.006],[s*.147,-.057,.009]],tint(skin,-.07),.004,'skin',8);
      oval(f,'#c9b9a8',s*.062,.021,.099,.030,.014,.014,0,'skin');
      oval(f,'#ece3d1',s*.062,.02,.111,.020,royal?.0065:.0075,.006);
      oval(f,a.eye||'#59665f',s*.062,.02,.117,.010,.008,.003);
      oval(f,'#1c211e',s*.062,.02,.120,.004,.006,.0015);oval(f,'#f7f3e8',s*.058,.023,.122,.0013,.0018,.001);
      stroke(f,[[s*.04,.021,.116],[s*.059,royal?.028:.030,.119],[s*.083,.022,.109]],tint(skin,-.065),royal?.0055:.0045,'skin');
      stroke(f,[[s*.040,.018,.117],[s*.062,royal?.015:.013,.119],[s*.083,.019,.109]],tint(skin,.035),.0035,'skin');
      stroke(f,[[s*.028,royal?.049:.059,.11],[s*.062,.063,.115],[s*.099,.062,.098]],hair,royal?.0055:.0045,'fur',8);
      // Subtle nasolabial and forehead creases, not painted cartoon strokes.
      stroke(f,[[s*.026,-.057,.119],[s*.045,-.082,.111],[s*.049,-.105,.109]],tint(skin,-.055),.0018,'skin',5);
      if(royal){
        for(let i=0;i<3;i++)stroke(f,[[s*.019,.095+i*.012,.103],[s*.057,.104+i*.011,.104],[s*.091,.095+i*.011,.097]],tint(skin,-.035),.0011,'skin',6);
        stroke(f,[[s*.086,.002,.107],[s*.104,-.006,.098],[s*.118,-.013,.089]],tint(skin,-.035),.0012,'skin',5);
      }
    }
    const nose=loft(f,'nose',[[-.077,.021,.014,.119],[-.058,.029,.024,.131],[-.036,.019,.028,.128],[.009,.014,.019,.112],[.055,.008,.006,.101]],skin,{kind:'skin',segments:16});
    for(const s of [-1,1])oval(f,tint(skin,-.15),s*.017,-.072,.137,.006,.003,.003,0,'skin');
    stroke(f,[[-.028,-.104,.117],[-.012,-.101,.124],[0,-.106,.126],[.012,-.101,.124],[.028,-.104,.117]],'#a17163',.0035,'skin',10);
    stroke(f,[[-.025,-.109,.119],[0,-.117,.124],[.025,-.109,.119]],tint(skin,-.025),.004,'skin',8);
    // A fitted scalp with groomed, fine locks replaces the old giant hair balls.
    const cap=loft(f,'scalp-'+hairStyle,[[.015,.14,.103,-.026],[.075,.143,.109,-.024],[.15,.12,.095,-.023],[.19,.064,.055,-.02],[.201,.004,.004,-.02]],hair,{kind:'fur',segments:28});
    if(hairStyle==='short'){
      for(let i=0;i<8;i++){const x=(i-3.5)*.027;tube(f,[[x-.018,.172,.006],[x+.007,.179,.06],[x+.036,.143,.091]],tint(hair,(i%3)*.012),.005,{taper:true,kind:'fur',segments:8});}
    }else if(hairStyle==='braids'){
      for(const s of [-1,1])for(let strand=0;strand<3;strand++)stroke(f,Array.from({length:13},(_,i)=>{const t=i/12,a=t*Math.PI*5+strand*Math.PI*2/3;return[s*(.146+.008*Math.cos(a)),.08-t*.29,-.01+.009*Math.sin(a)];}),tint(hair,strand*.02),.008,'fur',12);
    }else{
      for(let i=0;i<8;i++){const x=(i-3.5)*.027;tube(f,[[x-.045,.153,-.027],[x-.012,.19,.031],[x+.043,.166,.078],[x+.056,.137,.094]],tint(hair,(i%3)*.012),.008,{taper:true,kind:'fur',segments:10});}
      for(const s of [-1,1])for(let i=0;i<4;i++)stroke(f,[[s*.126,.11,-.03-i*.017],[s*.147,.01,-.034-i*.017],[s*.128,-.11,-.017-i*.017]],tint(hair,i*.018),.012,'fur',8);
    }
    if(beard!=='none'){
      const long=beard==='long',bottom=long?-.325:-.205;
      const bg=geometry('realistic-beard-'+beard,()=>{
        const pos=[],uv=[],idx=[],nx=24,ny=14;
        for(let j=0;j<=ny;j++)for(let i=0;i<=nx;i++){
          const u=(i/nx-.5)*2,v=j/ny,width=.122*(1-v)+.063*v+.008*Math.sin(v*Math.PI),x=u*width,y=(-.116+.088*Math.pow(Math.abs(u),1.3))*(1-v)+(bottom+.045*Math.pow(Math.abs(u),1.2))*v,z=.096+.067*Math.cos(u*Math.PI*.5)+.022*Math.sin(v*Math.PI)-.022*v+.0014*Math.sin(u*27+v*9)*Math.sin(v*Math.PI);
          pos.push(x,y,z);uv.push(i/nx,v);if(i&&j){const n=j*(nx+1)+i;idx.push(n,n-nx-2,n-1,n,n-nx-1,n-nx-2);}
        }const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
      });surface(f,bg,hair,0,0,0,[1,1,1],0,'fur');
      for(let i=0;i<(royal?20:10);i++){
        const n=royal?20:10,u=(i/(n-1)-.5)*2,x=u*.119,phase=i*1.71,tipX=u*.063;
        const startY=-.116+.088*Math.pow(Math.abs(u),1.3),tipY=bottom+.045*Math.pow(Math.abs(u),1.2);
        tube(f,[[x,startY,.10+.067*Math.cos(u*Math.PI*.5)],[x*.91+Math.sin(phase)*.004,startY*.5+tipY*.5,.177-.032*Math.abs(u)],[tipX+Math.sin(phase+1)*.003,tipY,.142-.039*Math.abs(u)]],tint(hair,(i%4)*.006),.0018,{taper:true,kind:'fur',segments:10});
      }
      for(const s of [-1,1]){
        stroke(f,[[s*.006,-.084,.148],[s*.028,-.086,.151],[s*.058,-.108,.138]],tint(hair,.018),.009,'fur',8);
        stroke(f,[[s*.125,-.016,.047],[s*.122,-.092,.085],[s*.087,-.16,.115]],hair,.012,'fur',8);
      }
    }return f;
  }
  function helmet(parent,style='classic',royal=true){
    const steelColor=royal?'#929b9e':'#828b8d';
    loft(parent,'conical-helm',[[2.205,.147,.116,-.013],[2.255,.151,.119,-.013],[2.325,.121,.099,-.018],[2.40,.065,.057,-.02],[2.475,.005,.008,-.02]],steelColor,{kind:'steel',metal:.52,segments:28});
    // Lower rim and nasal guard follow a historically plausible open face helm.
    const rim=ring(parent,'#bbb3a0',0,2.233,-.011,.152,.009,.5);rim.rotation.x=Math.PI/2;rim.scale.y=.79;
    strap(parent,'nasal',[[0,2.27,.112],[0,2.16,.12],[0,2.095,.14]],.018,steelColor,'steel');
    for(const s of [-1,1]){
      const p=new THREE.Shape();p.moveTo(-.04,.1);p.lineTo(.04,.1);p.lineTo(.05,-.075);p.quadraticCurveTo(0,-.1,-.04,-.07);p.closePath();const plate=extrusion(parent,'cheek-helm',p,steelColor,s*.129,2.16,-.042,.016,.005,'steel',.4);plate.rotation.y=s*.6;
      stroke(parent,[[s*.146,2.248,-.015],[s*.12,2.35,-.014],[s*.01,2.47,-.014]],'#b9bebc',.0045,'steel',8);
    }
    if(royal){
      loft(parent,'royal-circlet',[[2.265,.154,.126,-.013],[2.292,.154,.126,-.013]],gold,{kind:'steel',metal:.55,segments:32,open:true});
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4,r=.152,x=Math.sin(a)*r,z=Math.cos(a)*.124-.013,orn=group(parent,x,2.29,z);orn.rotation.y=a;
        const s=new THREE.Shape();s.moveTo(-.025,0);s.lineTo(-.018,.029);s.quadraticCurveTo(-.017,.042,0,style==='spiked'?.092:.064);s.quadraticCurveTo(.017,.042,.018,.029);s.lineTo(.025,0);s.closePath();extrusion(orn,'realistic-crown-'+style,s,gold,0,0,-.003,.006,.002,'steel',.6);
        if(i%2===0)oval(orn,i%4?'#557777':'#7e3e35',0,.014,.009,.009,.013,.004,.3,'steel');
      }
    }
  }
  function furMantle(parent,outfit='royal'){
    const base=outfit==='ranger'?'#777560':outfit==='warden'?'#838984':'#b6b1a0',light=tint(base,.08),shade=tint(base,-.075);
    for(const s of [-1,1]){
      const p=group(parent,s*.27,1.79,-.018);
      loft(p,'fur-shoulder-'+s,[[-.09,.09,.137],[-.045,.172,.181],[.02,.19,.19],[.087,.15,.155],[.115,.07,.08]],base,{kind:'fur',segments:20});p.rotation.z=s*-.18;
      // Short, tapered overlapping hairs create an actual ragged fur edge. Each
      // tuft is a small 8-triangle shell, not a sausage or a billboard texture.
      const tuft=geometry('realistic-fur-tuft',()=>{
        const pos=[-.018,0,0,.018,0,0,-.011,-.035,.008,.011,-.035,.008,0,-.088,.015,0,-.025,.022];
        const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.15,.5,.85,.5,.5,1,.5,.25],2));g.setIndex([0,1,5,0,5,2,5,3,2,1,3,5,2,3,4,0,2,4,1,4,3]);g.computeVertexNormals();return g;
      });
      for(let i=0;i<70;i++){
        const a=i*2.39996323,t=Math.sqrt((i+.5)/70),x=Math.cos(a)*.17*t,z=Math.sin(a)*.175*t,y=.083*(1-t*t)-.006;
        const m=surface(p,tuft,i%4===0?shade:i%3===0?light:base,x,y,z,[.7+(i%5)*.09,.7+(i%4)*.14,1],0,'fur');m.rotation.y=a;m.rotation.x=-.24-t*.7;
      }
      for(let i=0;i<38;i++){
        const a=i*Math.PI*2/38,x=Math.sin(a)*.175,z=Math.cos(a)*.178,y=-.02+(i%3)*.006;
        const m=surface(p,tuft,i%4===0?light:i%3===0?shade:base,x,y,z,[.85,1.08+(i%4)*.10,1],0,'fur');m.rotation.y=a;m.rotation.x=-.12;
      }
    }
    loft(parent,'fur-collar',[[1.79,.28,.142,-.028],[1.84,.34,.163,-.028],[1.88,.27,.147,-.028],[1.93,.12,.096,-.028]],base,{kind:'fur',segments:24});
    for(const s of [-1,1])for(let i=0;i<10;i++)stroke(parent,[[s*(.08+i*.013),1.905-i*.004,.089],[s*(.095+i*.015),1.84-i*.007,.153],[s*(.12+i*.017),1.79-i*.007,.163]],i%3?base:light,.009,'fur',5);
  }
  function character(type='unassigned',appearance={}){
    if(type==='king')return sculptedKing(appearance);
    const a={...defaults,...appearance},royal=type==='king',enemy=type==='enemy',elite=enemy&&!!a.elite,knight=type==='knight'||type==='ally',job=type==='survivor'?'unassigned':type;
    detailed=royal;
    const palette={worker:'#5e6d55',builder:'#a28c57',farmer:'#888455',armorer:'#526371',inventor:'#766380',knight:'#4d6d7d',ally:'#4d6d7d',unassigned:'#8c8067'},outfit=royal?a.outfit:'citizen',ranger=outfit==='ranger',warden=outfit==='warden',color=royal?(ranger?'#4b6148':warden?'#506772':'#3a5572'):enemy?(elite?'#5c5969':'#794c43'):palette[job]||'#867967',skin=royal?a.skin:'#cfa98c',hair=royal?a.hair:enemy?'#463b32':job==='inventor'?'#989185':'#51463b',s=royal?1:elite?.97:.86;
    const g=group(scene),legs=[],knees=[],arms=[],skirtPanels=[],mail=royal||knight||enemy;g.scale.setScalar(s);
    // Fitted trousers, long upper/lower legs, ankle boots and articulated knees.
    for(const sign of [-1,1]){
      const leg=group(g,sign*.115,1.08,0);
      loft(leg,'trouser-thigh',[[0,.102,.11],[-.10,.1,.105],[-.25,.082,.09],[-.39,.066,.073],[-.45,.063,.065]],royal?'#454b50':'#55584d',{kind:'linen',fold:.034,folds:7});
      const knee=group(leg,0,-.45,.008);knees.push(knee);
      loft(knee,'trouser-calf',[[.015,.064,.066],[-.06,.072,.073],[-.17,.074,.074],[-.28,.058,.058],[-.4,.047,.05]],royal?'#454b50':'#55584d',{kind:'linen',fold:.025,folds:7});
      const bootTop=royal?-.085:-.19;
      loft(knee,'leather-boot-'+royal,[[bootTop,.078,.079],[bootTop-.035,.081,.084],[-.25,.061,.071],[-.35,.055,.062],[-.44,.055,.067,.012],[-.47,.073,.109,.043],[-.50,.078,.142,.073],[-.535,.078,.143,.074]],'#4b3a2e',{kind:'hide',fold:.018,folds:6});
      const foot=loft(knee,'boot-sole',[[-.536,.082,.148,.075],[-.553,.082,.148,.075]],'#302e29',{kind:'hide',segments:20});
      for(let i=0;i<3;i++)stroke(knee,[[-.04,-.335-i*.026,.065],[.04,-.345-i*.026,.069]],'#8a7658',.003,'hide',3);
      strap(knee,'boot-ankle',[[-.059,-.401,.048],[0,-.393,.08],[.059,-.401,.048]],.023,'#624e37');
      if(royal||knight){
        const guard=loft(knee,'shin-guard',[[-.13,.064,.015,.075],[-.23,.055,.022,.081],[-.36,.038,.012,.067]],warden?'#8c9a9d':'#797f7b',{kind:'steel',metal:.4,segments:16});
        const b=ring(knee,gold,.032,-.404,.075,.014,.004,.4);b.scale.x=.8;
      }
      legs.push(leg);
    }
    // Rib cage, waist and hips form one smooth, fitted gambison silhouette.
    const body=loft(g,'adult-tailored-torso',[[1.055,.19,.135],[1.15,.212,.15],[1.27,.195,.131],[1.40,.218,.148],[1.55,.265,.165],[1.68,.296,.17],[1.77,.275,.15],[1.83,.208,.118],[1.86,.12,.089]],ranger?'#5c654b':color,{kind:royal||mail?'quilt':'linen',fold:.035,folds:12});
    loft(g,'neck',[[1.82,.075,.073],[1.96,.072,.07]],skin,{kind:'skin',segments:20});
    if(mail)loft(g,'mail-neck',[[1.75,.145,.126],[1.83,.118,.105],[1.92,.091,.084],[1.965,.079,.072]],'#89908c',{kind:'mail',metal:.25,segments:24});
    const frontZ=.166;
    const seamColor=tint(color,.08);
    for(const sign of [-1,1]){
      stroke(g,[[sign*.215,1.78,.105],[sign*.22,1.65,.146],[sign*.166,1.48,.158],[sign*.144,1.30,.122]],seamColor,.0019,'linen',12);
      stroke(g,[[sign*.06,1.847,.09],[sign*.15,1.81,.112],[sign*.237,1.775,.09]],seamColor,.0022,'linen',8);
    }
    // The fitted chest is the torso itself; no rigid floating rectangle covers it.
    if(royal||knight||elite){
      if(warden||knight||elite){
        const p=new THREE.Shape();p.moveTo(-.205,.17);p.quadraticCurveTo(0,.23,.205,.17);p.lineTo(.17,-.14);p.quadraticCurveTo(0,-.21,-.17,-.14);p.closePath();
        extrusion(g,'adult-breastplate',p,elite?'#626e77':warden?'#819398':'#8a9698',0,1.56,.145,.027,.012,'steel',.46);
        stroke(g,[[0,1.75,.19],[0,1.59,.201],[0,1.39,.184]],'#b5b9ae',.0035,'steel');
      }
      crest(g,royal?a.emblem:'sun',0,1.59,warden||knight||elite?.198:.188,royal?.65:.47);
    }
    // Long, split tabard panels leave a visible walking stride and rotate out
    // around the saddle. Their pivots are exposed for the rider pose.
    const skirtLength=royal?.76:knight?.57:.34;
    if(royal||knight||enemy){
      for(const sign of [-1,1])for(const back of [false,true]){
        const p=group(g,sign*.107,1.275,back?-.12:.14);p.userData={front:!back,side:sign};
        cloth(p,'split-tabard-'+royal+'-'+sign+'-'+back,color,{width:royal?.184:.18,height:skirtLength,y:-skirtLength*.5,z:0,kind:royal?'quilt':'linen',fold:.009,curve:.025});
        const hem=[[-.08,-skirtLength,.025],[0,-skirtLength-.006,.021],[.08,-skirtLength,.025]];stroke(p,hem,royal?gold:tint(color,.15),royal?.005:.004,'cloth');
        if(royal){stitches(p,[[-.079,-.02,.01],[-.088,-.35,.015],[-.08,-skirtLength+.02,.024]],'#a59c7a',18);stitches(p,[[.079,-.02,.01],[.088,-.35,.015],[.08,-skirtLength+.02,.024]],'#a59c7a',18);}
        skirtPanels.push(p);
      }
    }
    loft(g,'waist-belt',[[1.245,.209,.153],[1.302,.207,.15]],'#47372c',{kind:'hide',segments:28,open:true});
    const buckle=ring(g,gold,0,1.274,.164,.033,.007,.5);buckle.scale.set(1.25,.83,1);stroke(g,[[-.034,1.274,.168],[.025,1.274,.168]],goldLight,.004,'steel',2);
    for(const sign of [-1,1]){
      const arm=group(g,sign*.318,1.81,0);arm.rotation.z=sign*.045;
      loft(arm,'adult-upper-arm',[[.025,.071,.081],[-.055,.092,.09],[-.17,.085,.08],[-.3,.066,.064],[-.35,.063,.059]],mail?'#8c938d':color,{kind:mail?'mail':'quilt',metal:mail?.2:0,fold:mail?0:.026,folds:8});
      loft(arm,'adult-forearm',[[-.33,.062,.059],[-.4,.074,.069,.012],[-.50,.057,.055,.02],[-.59,.041,.043,.025]],royal||knight?'#665343':skin,{kind:royal||knight?'hide':'skin',segments:20});
      if(royal||knight||['worker','builder','armorer'].includes(job)){
        loft(arm,'forearm-bracer',[[-.382,.077,.071,.011],[-.41,.079,.074,.012],[-.54,.055,.054,.022],[-.565,.053,.052,.024]],warden?'#7e8c8f':'#554331',{kind:warden?'steel':'hide',metal:warden?.4:0,segments:20});
        for(const y of [-.415,-.527]){const r=ring(arm,gold,0,y,.02,y<-.5?.056:.079,.004,.4);r.rotation.x=Math.PI/2;}
      }
      const gloved=royal||knight||['worker','builder','armorer'].includes(job),handColor=gloved?'#63513c':skin;
      loft(arm,'adult-palm',[[-.58,.037,.03,.026],[-.615,.041,.033,.032],[-.673,.036,.027,.04]],handColor,{kind:gloved?'hide':'skin',segments:16});
      for(let i=0;i<4;i++){
        const x=(i-1.5)*.017,fy=-.707+Math.abs(i-1.4)*.005;
        const finger=loft(arm,'adult-finger-'+i,[[-.657,.009,.011],[fy,.008,.009],[fy-.012,.005,.006]],handColor,{kind:gloved?'hide':'skin',segments:8});finger.position.set(x,0,.045+i*.001);finger.rotation.x=-.1;
      }
      stroke(arm,[[sign*-.034,-.612,.035],[sign*-.056,-.642,.062],[sign*-.046,-.673,.07]],handColor,.012,gloved?'hide':'skin',6);
      arms.push(arm);
    }
    face(g,{...a,skin,hair},{beard:royal?a.beard:['armorer','builder'].includes(job)?'short':'none',hairStyle:royal?a.hairStyle:job==='farmer'?'braids':'short',royal,enemy});
    let royalCape=null,jobTool=null;
    if(royal){
      royalCape=cape(g,a.cape,a.emblem);
      furMantle(g,outfit);
      helmet(g,a.crown,true);
      for(const sign of [-1,1]){
        const clasp=ring(g,gold,sign*.17,1.80,.152,.026,.006,.5);oval(g,'#80704c',sign*.17,1.80,.156,.013,.016,.005,.4,'steel');
      }
      stroke(g,[[-.17,1.8,.162],[-.09,1.735,.197],[0,1.72,.201],[.09,1.735,.197],[.17,1.8,.162]],gold,.0045,'steel',16);
      // Individual outfit silhouettes retain the player's customization.
      if(ranger){
        strap(g,'ranger-bandolier',[[-.22,1.78,.136],[-.06,1.58,.187],[.10,1.38,.18],[.20,1.27,.15]],.055,'#59432f');
        for(let i=0;i<5;i++)oval(g,gold,-.19+i*.08,1.735-i*.088,.19,.005,.006,.004,.4,'steel');
      }else if(warden){
        for(const sign of [-1,1])for(let i=0;i<3;i++){
          const p=new THREE.Shape();p.moveTo(-.07,.04);p.quadraticCurveTo(0,.09,.07,.04);p.lineTo(.082,-.03);p.quadraticCurveTo(0,-.072,-.082,-.03);p.closePath();const plate=extrusion(g,'realistic-shoulder-scale',p,i%2?'#78898d':'#91a09f',sign*(.32+i*.025),1.79-i*.042,.065,.016,.004,'steel',.4);plate.rotation.z=sign*-.35;
        }
      }
      const pouch=group(g,-.212,1.222,.074);loft(pouch,'royal-belt-pouch',[[.02,.058,.032],[-.08,.069,.042],[-.13,.05,.033]],'#72543b',{kind:'hide',segments:16});strap(pouch,'pouch-flap',[[-.054,.01,.035],[0,-.05,.05],[.054,.01,.035]],.017,'#aa8d60');oval(pouch,gold,0,-.055,.057,.009,.012,.004,.4,'steel');
      const quiver=loft(g,'realistic-quiver',[[1.26,.067,.065,-.193],[1.72,.078,.072,-.23],[1.75,.083,.076,-.23]],'#60432f',{kind:'hide',segments:16,open:true});quiver.position.x=-.16;
      for(let i=0;i<4;i++){const x=-.205+i*.028;stroke(g,[[x,1.55,-.228],[x-.025,1.98,-.24]],'#a28b5f',.006,'wood',3);const f=cloth(g,'arrow-fletch-'+i,'#c4c4b3',{width:.027,height:.10,x:x-.023,y:1.94,z:-.244,kind:'feather',fold:0});}
    }else if(knight||enemy){
      helmet(g,enemy?'spiked':'classic',false);
      if(elite){royalCape=cape(g,enemy?'#505a65':'#596c73','moon',false);furMantle(g,'warden');}
      jobTool=sword(g,.375,1.1,.13);jobTool.scale.setScalar(.76);
      if(knight){const guard=shield(g,-.37,1.20,.14);guard.scale.setScalar(.75);}
      if(enemy)strap(g,'raider-bandolier',[[-.24,1.75,.15],[-.08,1.53,.19],[.08,1.31,.17],[.2,1.24,.12]],.05,'#48352c');
    }else{
      const hatColor=job==='inventor'?'#635773':job==='armorer'?'#4a5354':job==='farmer'?'#b29d6a':'#746047';
      loft(g,'citizen-cap',[[2.20,.145,.115,-.016],[2.26,.147,.117,-.016],[2.32,.12,.101,-.023],[2.35,.045,.055,-.034]],hatColor,{kind:job==='farmer'?'linen':'quilt',segments:24});
      if(job==='farmer'){
        const brim=ring(g,'#bda574',0,2.215,-.014,.18,.026,0);brim.rotation.x=Math.PI/2;brim.scale.y=.79;
        for(let i=0;i<3;i++){const r=ring(g,'#ccba8c',0,2.214,-.014,.17+i*.012,.0025,0);r.rotation.x=Math.PI/2;r.scale.y=.79;}
      }
      if(['worker','builder','farmer','armorer'].includes(job)){
        const apronColor=job==='armorer'?'#4f4033':job==='farmer'?'#aca386':'#887459';cloth(g,'profession-apron-'+job,apronColor,{width:.32,height:.65,y:1.175,z:.19,kind:'hide'});
        for(const sign of [-1,1])strap(g,'apron-straps-'+sign,[[sign*.16,1.74,.135],[sign*.105,1.51,.19],[sign*.10,1.39,.20]],.022,'#4f3c2b');
        cloth(g,'apron-pocket','#aa9270',{width:.17,height:.12,y:1.16,z:.217,kind:'hide',fold:.003});stitches(g,[[-.079,1.22,.221],[-.08,1.105,.224],[.08,1.105,.224],[.079,1.22,.221]],'#c9b79a',18);
      }
      if(job==='worker'){
        jobTool=axe(g,.37,1.1,.1);jobTool.scale.setScalar(.73);
        const pack=loft(g,'worker-backpack',[[1.22,.14,.06,-.18],[1.51,.15,.085,-.2],[1.65,.1,.055,-.2]],'#6e694e',{kind:'linen',segments:16});
        for(const sign of [-1,1])stroke(g,[[sign*.1,1.69,-.12],[sign*.21,1.53,.08],[sign*.16,1.31,.10]],'#4f3d2b',.014,'hide',8);
      }else if(job==='builder'||job==='armorer'){
        jobTool=hammer(g,.37,1.1,.12);jobTool.scale.setScalar(.78);
        for(let i=0;i<3;i++){
          const t=group(g,-.17+i*.042,1.26,.18);stroke(t,[[0,.01,0],[0,-.14,.005]],'#af9b6e',.009,'wood',3);stroke(t,[[-.025,.025,0],[.025,.025,0]],'#8e9794',.013,'steel',3);
        }
      }else if(job==='farmer'){
        jobTool=group(g,.37,1.1,.12);stroke(jobTool,[[0,-.56,0],[0,.49,0]],'#8d7146',.012,'wood',4);stroke(jobTool,[[-.085,.46,0],[0,.44,0],[.085,.46,0]],'#929a91',.01,'steel',6);for(const x of [-.085,0,.085])stroke(jobTool,[[x,.45,0],[x,.62,0],[x,.65,.02]],'#a6aea5',.008,'steel',5);
      }else if(job==='inventor'){
        for(const x of [-.064,.064])ring(g,gold,x,2.116,.127,.032,.004,.4);stroke(g,[[-.032,2.116,.13],[0,2.12,.137],[.032,2.116,.13]],gold,.003,'steel',5);
        for(const sign of [-1,1])cloth(g,'scholar-stole-'+sign,'#8f7c98',{width:.065,height:.55,x:sign*.165,y:1.56,z:.177,kind:'linen',fold:.005});
        jobTool=group(g,.36,1.08,.15);const book=softBox(jobTool,'#594d39',0,0,0,.19,.25,.05);book.rotation.z=-.1;softBox(jobTool,'#c6b894',0,0,.031,.165,.224,.013);for(let i=0;i<4;i++)stroke(jobTool,[[-.052,.06-i*.036,.041],[.052,.06-i*.036,.041]],'#8a8063',.0025,'cloth',2);
      }else{
        strap(g,'survivor-satchel-strap',[[.20,1.76,.09],[.06,1.51,.184],[-.16,1.25,.14]],.035,'#4f3d2b');
        const bag=loft(g,'survivor-satchel',[[1.33,.09,.055],[1.12,.1,.06],[1.08,.08,.045]],'#7c6546',{kind:'hide',segments:16});bag.position.set(-.19,0,.04);
        cloth(g,'survivor-patch','#748067',{width:.07,height:.1,x:-.10,y:1.57,z:.183,kind:'linen',fold:.002});
      }
    }
    const weapons=group(g,.375,1.12,.12),bow=group(weapons),hatchet=axe(weapons);hatchet.scale.setScalar(.83);
    tube(bow,[[0,-.50,0],[.10,-.31,.025],[.15,0,.04],[.10,.31,.025],[0,.50,0]],'#735532',.017,{kind:'wood',segments:20});stroke(bow,[[0,-.50,0],[-.008,0,0],[0,.50,0]],'#cbc2a4',.003,'cloth',3);capsule(bow,leather,.15,0,.04,.023,.11,[1,1,1],'hide');
    bow.visible=royal;hatchet.visible=false;weapons.visible=royal;
    const health=group(g,0,2.61,0);box(health,'#543b36',0,0,0,.65,.09,.035);const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    for(let i=0;i<legs.length;i++){batch(knees[i]);batch(legs[i],[knees[i]]);}for(const limb of arms)batch(limb);for(const panel of skirtPanels)batch(panel);if(jobTool)batch(jobTool);batch(bow);batch(hatchet);if(royalCape)batch(royalCape);
    batch(g,[...legs,...arms,...skirtPanels,health,weapons,...(royalCape?[royalCape]:[]),...(jobTool?[jobTool]:[])]);
    const anatomy={height:royal||knight||enemy?2.475:2.35,headHeight:.365,headWidth:.282,hipHeight:1.08,shoulderHeight:1.81,headCenter:2.095,legSpread:.115,legSpacing:.115,stanceWidth:.23,ridingLift:.46,scale:s};
    g.userData={body,cape:royalCape,jobTool,legs,knees,arms,skirtPanels,health,healthFill,weapons,bow,axe:hatchet,phase:Math.random()*6,lastX:undefined,lastZ:undefined,job,bodyDimensions:{width:.60*s,depth:.36*s,height:.805*s},anatomy,modelVersion:5,designRevision:2,modelStyle:'realistic'};return g;
  }
  const {building}=createRoyalArchitecture(k);return{character,building,axe,defaults};
}
