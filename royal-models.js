import * as THREE from 'three';
import {createRoyalArchitecture} from './royal-architecture.js';

// Original sculpted fantasy figures. Shapes are cached and surfaces are batched.
export function createRoyalModels(k) {
  const {scene,group,mesh,box,softBox,geometry,mat,batch}=k;
  const defaults={cape:'#315ba4',hair:'#42464e',beard:'long',skin:'#e1b18b',crown:'classic'};
  const tint=(color,amount)=>new THREE.Color(color).offsetHSL(0,0,amount).getStyle();
  const gold='#e0b95b',goldLight='#f5d68a',steel='#bacbd0',leather='#604735';
  const sphere=geometry('v4-sculpt-sphere',()=>new THREE.SphereGeometry(1,20,14));
  const residentSphere=geometry('v4-resident-sphere',()=>new THREE.SphereGeometry(1,12,8));
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
    return surface(parent,geometry('v4-extrude-'+name,()=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:10})),color,x,y,z,[1,1,1],metal,kind);
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
  function clothPanel(parent,name,color,width,height,x,y,z){
    const geo=geometry('v4-cloth-'+name,()=>{const geo=new THREE.PlaneGeometry(width,height,12,14),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const px=p.getX(i),py=p.getY(i),t=(height/2-py)/height;p.setXYZ(i,px*(1-.13*t),py,z+Math.cos(px/width*Math.PI*6)*.012*t+.025*t*t);}geo.computeVertexNormals();return geo;});
    return surface(parent,geo,color,x,y,0,[1,1,1],0,'cloth');
  }
  function royalCape(parent,color){
    const g=group(parent,0,1.45,-.2),point=(u,v)=>[u*(.44+.2*Math.sin(v*Math.PI*.6)),-1.23*v+.055*Math.cos(u*Math.PI/2)*v,-.07-.27*v-.045*Math.cos(u*Math.PI*3)*(v+.15)];
    const geo=geometry('v4-draped-cape',()=>{const geo=new THREE.PlaneGeometry(2,1,24,20),p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setXYZ(i,...point(p.getX(i),.5-p.getY(i)));geo.computeVertexNormals();return geo;});
    surface(g,geo,color,0,0,0,[1,1,1],0,'cloth');
    const backGeo=geometry('v4-draped-cape-back',()=>{const back=geo.clone(),indices=back.index.array;for(let i=0;i<indices.length;i+=3){const first=indices[i];indices[i]=indices[i+2];indices[i+2]=first;}back.computeVertexNormals();return back;});
    surface(g,backGeo,tint(color,-.06),0,0,-.007,[1,1,1],0,'cloth');
    for(const sign of [-1,1])tube(g,Array.from({length:9},(_,i)=>point(sign,i/8)),gold,.014,{metal:.1});tube(g,Array.from({length:17},(_,i)=>point(-1+i/8,1)),gold,.019,{metal:.15});
    const emblem=ring(g,gold,0,-.65,-.31,.115,.012,.15);emblem.rotation.x=-.1;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;tube(g,[[Math.cos(a)*.145,-.65+Math.sin(a)*.145,-.32],[Math.cos(a)*.185,-.65+Math.sin(a)*.185,-.32]],gold,.009,{metal:.15});}return g;
  }
  const hairLock=(parent,points,color,r=.07)=>tube(parent,points,color,r,{taper:true,segments:16});
  function face(parent,{skin,hair,beard,royal,enemy=false},hy,size=1){
    const f=group(parent,0,hy,0);f.scale.setScalar(size);
    const head=geometry('v4-sculpted-jaw-'+royal,()=>{const geo=new THREE.SphereGeometry(1,royal?24:16,royal?18:12),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const y=p.getY(i),x=p.getX(i),z=p.getZ(i),jaw=y<-.15?1-Math.max(0,-y-.15)*.21:1,cheek=1+.035*Math.exp(-Math.pow((y+.03)*5,2));p.setXYZ(i,x*jaw*cheek,y,z*(y<-.5?.92:1));}geo.computeVertexNormals();return geo;});
    surface(f,head,skin,0,0,0,[.33,.39,.29],0,'skin');
    for(const sign of [-1,1]){
      oval(f,skin,sign*.218,-.07,.19,.075,.095,.075,0,'skin');oval(f,skin,sign*.329,-.015,-.012,.062,.106,.052,0,'skin');oval(f,tint(skin,-.08),sign*.35,-.018,.024,.022,.062,.02,0,'skin');
      tube(f,[[sign*.348,.043,.031],[sign*.365,.017,.042],[sign*.35,-.047,.036]],tint(skin,.04),.012,{kind:'skin'});
      oval(f,'#a77160',sign*.13,.06,.264,.086,.06,.027,0,'skin');oval(f,'#f4edda',sign*.13,.065,.279,.075,.044,.022);
      oval(f,enemy?'#775447':'#54737b',sign*.13,.065,.3,.028,.033,.011);oval(f,'#202a2b',sign*.13,.064,.309,.013,.024,.006);oval(f,'#fff8df',sign*.13-.009,.079,.314,.008,.01,.003);
      tube(f,[[sign*.055,.075,.298],[sign*.12,.11,.292],[sign*.2,.081,.266]],tint(skin,-.07),.014,{kind:'skin'});tube(f,[[sign*.065,.04,.291],[sign*.13,.026,.297],[sign*.195,.053,.272]],tint(skin,.035),.009,{kind:'skin'});
      hairLock(f,[[sign*.055,.163,.258],[sign*.13,.176,.273],[sign*.215,.144,.239]],tint(hair,.04),.035);oval(f,tint(skin,.028),sign*.213,-.052,.228,.065,.055,.026,0,'skin');
    }
    oval(f,skin,0,-.005,.282,.055,.105,.063,0,'skin');oval(f,tint(skin,.04),0,-.066,.336,.071,.052,.058,0,'skin');for(const sign of [-1,1])oval(f,tint(skin,-.1),sign*.045,-.088,.337,.017,.009,.013,0,'skin');
    oval(f,tint(skin,-.07),0,-.153,.276,.087,.025,.023,0,'skin');tube(f,[[-.067,-.148,.295],[0,-.159,.302],[.067,-.148,.295]],'#9e6658',.008,{kind:'skin'});oval(f,tint(skin,.04),0,-.207,.247,.095,.052,.049,0,'skin');
    oval(f,hair,0,.223,-.071,.329,.19,.264);
    // Swept forelocks and layered side curls are flowing, tapered S curves.
    for(let i=0;i<5;i++){const x=(i-2)*.1;hairLock(f,[[x-.09,.27,-.04],[x-.04,.324,.105],[x+.055,.26,.235],[x+.07,.165,.252]],tint(hair,(i%3)*.025),.061);}
    for(const sign of [-1,1])for(let i=0;i<3;i++){const z=-.09-i*.075;hairLock(f,[[sign*.25,.22,z],[sign*.33,.11,z+.025],[sign*.34,-.08,z+.018],[sign*.29,-.21,z+.065]],tint(hair,i*.025),.067);}
    if(royal&&beard!=='none'){
      const long=beard==='long',bottom=long?-.54:-.31;
      for(let i=0;i<7;i++){const u=(i-3)/3,x=u*.235,tipX=x*(long?.72:.85),tipY=bottom+Math.pow(Math.abs(u),1.5)*.11;
        hairLock(f,[[x,-.16+Math.abs(u)*.045,.235-Math.abs(u)*.055],[x*1.06,-.27,.3-Math.abs(u)*.025],[tipX-.015*Math.sign(u),tipY+.07,.32],[tipX+.028*Math.sign(u),tipY,.285]],tint(hair,(i%3)*.025),long?.078:.067);}
      for(const sign of [-1,1]){hairLock(f,[[sign*.015,-.127,.355],[sign*.1,-.125,.363],[sign*.18,-.17,.319],[sign*.205,-.145,.27]],tint(hair,.055),.049);hairLock(f,[[sign*.264,-.035,.12],[sign*.284,-.16,.17],[sign*.21,-.275,.25]],tint(hair,.015),.064);}
    }return f;
  }
  function crown(parent,style,hy){
    const g=group(parent,0,hy+.342,0);lathe(g,'crown-band',[[.316,-.025],[.342,-.025],[.35,.005],[.35,.13],[.336,.148],[.315,.13],[.316,-.025]],gold,0,0,0,[1,1,1],null,.65);
    for(const y of [-.006,.128]){const band=ring(g,goldLight,0,y,0,.345,.015,.65);band.rotation.x=Math.PI/2;}
    const leaf=new THREE.Shape();leaf.moveTo(-.085,0);leaf.bezierCurveTo(-.09,.09,-.032,.12,-.028,.18);leaf.quadraticCurveTo(-.025,.215,0,.25);leaf.quadraticCurveTo(.025,.215,.028,.18);leaf.bezierCurveTo(.032,.12,.09,.09,.085,0);leaf.quadraticCurveTo(0,.027,-.085,0);leaf.closePath();
    const spear=new THREE.Shape();spear.moveTo(-.07,0);spear.bezierCurveTo(-.065,.1,-.025,.24,0,.34);spear.bezierCurveTo(.025,.24,.065,.1,.07,0);spear.closePath();
    const count=style==='spiked'?6:8;
    for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,ornament=group(g,Math.sin(angle)*.322,.105,Math.cos(angle)*.322);ornament.rotation.y=angle;
      extrusion(ornament,style==='spiked'?'crown-spear':'crown-fleur',style==='spiked'?spear:leaf,gold,0,0,-.017,.034,.009,null,.65);oval(ornament,goldLight,0,style==='spiked'?.343:.25,0,.023,.027,.023,.65);
      const gem=oval(g,['#b74856','#5e9fa0','#477ca8'][i%3],Math.sin(angle)*.355,.063,Math.cos(angle)*.355,.045,.057,.02,.4);gem.rotation.y=angle;
      const setting=ring(g,goldLight,Math.sin(angle)*.354,.063,Math.cos(angle)*.354,.055,.009,.65);setting.rotation.y=angle;setting.scale.x=.78;
    }return g;
  }
  function character(type='unassigned',appearance={}){
    const a={...defaults,...appearance},royal=type==='king',enemy=type==='enemy',knight=type==='knight'||type==='ally',job=type==='survivor'?'unassigned':type;
    detailed=royal;
    const palette={worker:'#708a67',builder:'#b58a53',farmer:'#94a652',armorer:'#607b89',inventor:'#826ba1',knight:'#447b9f',ally:'#447b9f',unassigned:'#c3ac86'},color=royal?'#315b8d':enemy?'#a34651':palette[job]||'#bba883';
    const g=group(scene),legs=[],arms=[],skin=royal?a.skin:'#deb28c',hair=royal?a.hair:enemy?'#633b32':'#654b38',scale=royal?1:.79,hip=royal?.65:.52,shoulder=royal?1.39:1.11,hy=royal?1.86:1.46;
    for(const sign of [-1,1]){
      const leg=group(g,sign*.13,hip,0);const thigh=capsule(leg,royal?'#4a5b68':'#586453',0,-.13*scale,0,.106*scale,.15*scale,[1,1,.9],'cloth');thigh.rotation.x=-.055;
      oval(leg,royal?'#899fa8':'#68705a',0,-.31*scale,.012,.1*scale,.095*scale,.097*scale,royal?.35:0,royal?'metal':'cloth');capsule(leg,leather,0,-.385*scale,.015,.09*scale,.09*scale,[1,1,1],'leather');
      oval(leg,'#4d3a2b',0,-.52*scale,.075,.12*scale,.084*scale,.185*scale,0,'leather');oval(leg,'#312f2b',0,-.57*scale,.071,.122*scale,.023*scale,.184*scale);
      if(royal){const buckle=ring(leg,gold,0,-.37,.106,.035,.01,.5);buckle.scale.y=.74;}legs.push(leg);
    }
    const body=lathe(g,'tailored-torso',[[0,-.39],[.39,-.39],[.43,-.34],[.37,-.16],[.4,.05],[.49,.22],[.43,.31],[.24,.365],[.19,.38],[0,.38]],royal?steel:color,0,royal?1.01:.815,0,[royal?.94:.72,royal?1:.79,royal?.64:.54],royal?'metal':'cloth',royal?.32:0);
    clothPanel(g,royal?'royal-tabard':'citizen-tunic',color,royal?.45:.34,royal?.61:.46,0,royal?.94:.75,royal?.292:.235);
    lathe(g,'waist-belt',[[.365,-.035],[.385,-.035],[.385,.035],[.365,.035]],leather,0,royal?.72:.58,0,[royal?1.04:.8,1,royal?.86:.74],'leather');
    const buckle=ring(g,gold,0,royal?.72:.58,royal?.347:.294,royal?.061:.047,.015,.45);buckle.scale.x=1.25;oval(g,'#b78f45',0,royal?.72:.58,royal?.347:.294,.023,.031,.009,.5);
    capsule(g,skin,0,royal?1.43:1.14,0,.14*scale,.12*scale,[1,1,.86],'skin');face(g,{skin,hair,beard:a.beard,royal,enemy},hy,royal?1:.84);
    for(const sign of [-1,1]){
      const arm=group(g,sign*(royal?.47:.36),shoulder,0),sleeve=capsule(arm,royal?steel:color,sign*.025,-.105*scale,0,.12*scale,.13*scale,[1,1,.92],royal?'metal':'cloth',royal?.32:0);sleeve.rotation.z=sign*.16;
      oval(arm,royal?'#8da3ae':color,sign*.052,-.25*scale,.015,.101*scale,.1*scale,.1*scale,royal?.3:0,royal?'metal':'cloth');const forearm=capsule(arm,royal?leather:skin,sign*.03,-.35*scale,.041,.086*scale,.12*scale,[1,1,.9],royal?'leather':'skin');forearm.rotation.x=-.17;
      oval(arm,skin,sign*.025,-.49*scale,.075,.084*scale,.103*scale,.073*scale,0,'skin');oval(arm,tint(skin,-.025),sign*-.037,-.46*scale,.112,.035*scale,.055*scale,.04*scale,0,'skin');if(royal){const cuff=ring(arm,gold,sign*.035,-.32,.043,.09,.014,.45);cuff.rotation.x=Math.PI/2;}arms.push(arm);
    }
    let cape=null,jobTool=null;
    if(royal){
      cape=royalCape(g,a.cape);
      for(const sign of [-1,1]){
        oval(g,steel,sign*.42,1.39,-.005,.23,.13,.25,.4,'metal');tube(g,[[sign*.22,1.41,.18],[sign*.4,1.47,.23],[sign*.57,1.37,.1]],gold,.015,{metal:.5});
        for(let i=0;i<4;i++){const z=.08-i*.095,y=1.43+Math.sin(i/3*Math.PI)*.04;oval(g,i%2?'#e8ddbf':'#f6ecd6',sign*(.29+i*.018),y,z,.14,.095,.11);hairLock(g,[[sign*.35,y+.025,z],[sign*.44,y-.04,z+.025],[sign*.48,y-.11,z+.035]],i%2?'#e6dcc7':'#f6ecd6',.045);}
      }
      tube(g,[[-.27,1.4,.21],[-.2,1.3,.28],[0,1.25,.319],[.2,1.3,.28],[.27,1.4,.21]],gold,.018,{metal:.5});oval(g,goldLight,0,1.25,.327,.073,.083,.025,.55);oval(g,'#b44e58',0,1.252,.351,.042,.054,.018,.3);crown(g,a.crown,hy);
      const quiver=lathe(g,'quiver',[[.1,-.3],[.115,-.29],[.115,.27],[.14,.3],[.14,.34],[.1,.34]],'#865a3c',-.27,1.18,-.31,[1,1,1],'leather');quiver.rotation.z=-.15;
      for(let i=0;i<3;i++){tube(g,[[-.31+i*.07,1.25,-.34],[-.35+i*.07,1.86,-.35]],'#cdb382',.013,{kind:'wood'});const feather=oval(g,'#e7e7d0',-.35+i*.07,1.82,-.35,.032,.1,.014);feather.rotation.z=-.25;}
    }else if(enemy){
      oval(g,'#843e48',0,hy+.235,-.035,.288,.145,.263,0,'leather');for(const sign of [-1,1])hairLock(g,[[sign*.23,hy+.25,-.025],[sign*.33,hy+.33,-.04],[sign*.36,hy+.45,-.015]],'#d9c9a2',.06);jobTool=sword(g,.38,.78,.13);
    }else if(knight){
      lathe(g,'knight-helmet',[[0,-.07],[.29,-.07],[.305,0],[.29,.12],[.23,.21],[0,.255]],'#9eb5be',0,hy+.12,-.045,[1,1,.88],'metal',.45);tube(g,[[0,hy+.32,.03],[0,hy+.24,.22],[0,hy+.08,.25]],gold,.018,{metal:.5});for(const sign of [-1,1])oval(g,'#9eb5be',sign*.25,hy-.005,-.02,.06,.13,.11,.4,'metal');jobTool=sword(g,.4,.8,.17);shield(g,-.4,.8,.18);
    }else{
      const hat=job==='inventor'?'#705c8d':job==='armorer'?'#465962':job==='farmer'?'#c5af6d':'#866a45';lathe(g,'citizen-cap',[[0,-.04],[.285,-.04],[.295,0],[.28,.09],[.2,.15],[0,.17]],hat,0,hy+.22,-.045,[1,1,.9],'cloth');
      if(job==='farmer'){const brim=ring(g,'#c4a462',0,hy+.205,-.03,.31,.047,0);brim.rotation.x=Math.PI/2;brim.scale.y=.8;}
      if(['worker','builder','farmer','armorer'].includes(job)){clothPanel(g,'apron',job==='armorer'?'#584c40':job==='farmer'?'#b8ad76':'#9d8661',.32,.42,0,.71,.25);tube(g,[[-.15,.91,.24],[-.12,.64,.27],[-.14,.48,.27]],leather,.015,{kind:'leather'});}
      if(job==='worker')jobTool=axe(g,.39,.76,.14);else if(job==='builder'||job==='armorer')jobTool=hammer(g,.39,.74,.14);
      else if(job==='farmer'){
        jobTool=group(g,.38,.74,.13);capsule(jobTool,'#9d784b',0,.05,0,.024,.82,[1,1,1],'wood');tube(jobTool,[[-.1,.42,0],[0,.4,0],[.1,.42,0]],'#9eaea7',.019,{metal:.45});for(const x of [-.1,0,.1])tube(jobTool,[[x,.41,0],[x,.57,0],[x,.62,.035]],'#b1c2ba',.015,{metal:.5});
      }else if(job==='inventor'){
        for(const x of [-.109,.109])ring(g,gold,x,hy+.055,.271,.06,.011,.4);tube(g,[[-.05,hy+.055,.274],[0,hy+.065,.283],[.05,hy+.055,.274]],gold,.009,{metal:.4});jobTool=group(g,.4,.72,.16);const book=softBox(jobTool,'#80684e',0,0,0,.28,.34,.085);book.rotation.z=-.1;softBox(jobTool,'#e4d7ac',0,0,.047,.245,.31,.018);for(let i=0;i<3;i++)tube(jobTool,[[-.08,.07-i*.055,.06],[.07,.07-i*.055,.06]],'#aa956e',.006);
      }else{oval(g,'#8a6748',-.13,.91,-.24,.19,.24,.12,0,'leather');tube(g,[[-.27,1.12,-.05],[-.28,.91,.12],[-.19,.65,.11]],leather,.029,{kind:'leather'});}
    }
    const weapons=group(g,royal?.52:.39,royal?.98:.79,.16),bow=group(weapons),hatchet=axe(weapons);
    tube(bow,[[0,-.41,0],[.125,-.25,.035],[.165,0,.045],[.125,.25,.035],[0,.41,0]],'#a57442',.031,{kind:'wood',segments:20});tube(bow,[[0,-.41,0],[-.009,0,0],[0,.41,0]],'#eee1be',.008);capsule(bow,leather,.16,0,.044,.035,.13,[1,1,1],'leather');for(const y of [-.33,.33])oval(bow,gold,.065,y,.019,.037,.025,.037,.4);
    bow.visible=royal;hatchet.visible=false;weapons.visible=royal;
    const health=group(g,0,royal?2.86:2.17,0);box(health,'#543b36',0,0,0,.65,.09,.035);const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    for(const limb of [...legs,...arms])batch(limb);if(jobTool)batch(jobTool);batch(bow);batch(hatchet);if(cape)batch(cape);
    batch(g,[...legs,...arms,health,weapons,...(cape?[cape]:[]),...(jobTool?[jobTool]:[])]);
    g.userData={body,cape,jobTool,legs,arms,health,healthFill,weapons,bow,axe:hatchet,phase:Math.random()*6,lastX:undefined,lastZ:undefined,job,bodyDimensions:{width:royal?.921:.706,depth:royal?.627:.529,height:royal?.77:.608},modelVersion:4};return g;
  }
  const {building}=createRoyalArchitecture(k);return{character,building,axe,defaults};
}
