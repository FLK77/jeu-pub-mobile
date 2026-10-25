import * as THREE from 'three';
import {BUILDINGS} from './kingdom-data.js';

// Original procedural models inspired by sculpted fantasy figures and blue-roof towns.
export function createRoyalModels(k) {
  const {scene,group,mesh,box,ball,cylinder,softBox,softBall,geometry,mat,batch,coneGeo,headGeo}=k;
  const defaults={cape:'#315ba4',hair:'#42464e',beard:'long',skin:'#e1b18b',crown:'classic'};
  const tint=(color,amount)=>new THREE.Color(color).offsetHSL(0,0,amount).getStyle();
  function tube(parent,points,color,r=.02){return mesh(parent,geometry('tube-'+color+JSON.stringify(points)+r,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,5,false)),color,0,0,0);}
  function axe(parent,x=0,y=0,z=0){
    const g=group(parent,x,y,z);cylinder(g,'#9b7044',0,.07,0,.035,.88);
    softBox(g,'#efc563',0,-.27,0,.09,.07,.09);softBox(g,'#6b4e36',0,-.07,0,.08,.2,.08);
    const shape=new THREE.Shape();shape.moveTo(-.025,.17);shape.lineTo(.22,.28);shape.quadraticCurveTo(.44,.2,.39,-.05);shape.quadraticCurveTo(.26,-.16,.08,.035);shape.lineTo(-.025,.035);shape.closePath();
    const blade=mesh(g,geometry('axeBlade',()=>new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.012,bevelThickness:.012})), '#c7d6db',0,.22,-.0275,[1,1,1],.45);
    tube(g,[[.22,.5,.04],[.39,.4,.04],[.37,.22,.04]],'#f4faf6',.018);cylinder(g,'#e6bb63',0,.34,0,.06,.22,.3);return g;
  }
  function sword(parent,x=.4,y=.8,z=.15){const g=group(parent,x,y,z);box(g,'#cbd8df',0,.1,0,.075,.72,.045,.3);mesh(g,coneGeo,'#e5efef',0,.52,0,[.045,.15,.025],.4);box(g,'#ddb75b',0,-.23,0,.28,.055,.1,.3);box(g,'#604b36',0,-.35,0,.065,.2,.065);ball(g,'#e6c266',0,-.47,0,.065);return g;}
  function hammer(parent,x=.4,y=.7,z=.12){const g=group(parent,x,y,z);cylinder(g,'#957047',0,0,0,.035,.58);softBox(g,'#9aa8a9',0,.28,0,.32,.18,.18);softBox(g,'#d9dfd5',-.16,.28,0,.05,.17,.17);return g;}
  function shield(parent,x=-.43,y=.8,z=.15){const g=group(parent,x,y,z);const shape=new THREE.Shape();shape.moveTo(-.24,.3);shape.lineTo(.24,.3);shape.lineTo(.21,-.12);shape.quadraticCurveTo(.12,-.32,0,-.39);shape.quadraticCurveTo(-.12,-.32,-.21,-.12);shape.closePath();mesh(g,geometry('shield',()=>new THREE.ExtrudeGeometry(shape,{depth:.06,bevelEnabled:true,bevelSize:.02,bevelThickness:.015,bevelSegments:1})), '#315d97',0,0,0);box(g,'#e5c568',0,0,.09,.045,.55,.015);box(g,'#e5c568',0,.09,.09,.4,.045,.015);ball(g,'#e9d89a',0,.09,.12,.07,.07,.025);return g;}
  function royalCape(parent,color){
    const g=group(parent,0,1.24,-.23);const geo=geometry('royalCape',()=>{
      const geo=new THREE.PlaneGeometry(1,1,6,7),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const depth=.5-p.getY(i),x=p.getX(i)*(1+depth*.45);p.setXYZ(i,x,-depth*1.1,-depth*.21-Math.cos(x*9)*.025);}
      geo.computeVertexNormals();return geo;
    });
    const cloth=mesh(g,geo,color,0,0,0);cloth.material=mat(color,0,'cloth');cloth.material.side=THREE.DoubleSide;
    tube(g,[[-.49,0,.01],[-.59,-.58,-.1],[-.69,-1.09,-.2]],'#d9b75c',.022);
    tube(g,[[.49,0,.01],[.59,-.58,-.1],[.69,-1.09,-.2]],'#d9b75c',.022);
    tube(g,[[-.69,-1.09,-.2],[0,-1.12,-.2],[.69,-1.09,-.2]],'#d9b75c',.025);return g;
  }
  function character(type='unassigned',appearance={}){
    const a={...defaults,...appearance},royal=type==='king',enemy=type==='enemy',knight=type==='knight'||type==='ally';
    const job=type==='survivor'?'unassigned':type;
    const palette={worker:'#74936b',builder:'#b58b58',farmer:'#8ba44c',armorer:'#6b8290',inventor:'#8072ad',knight:'#4079aa',ally:'#4079aa',unassigned:'#c8b18a'};
    const color=royal?'#2c5b92':enemy?'#ac4550':palette[job]||'#bba883';
    const g=group(scene),legs=[],arms=[],skin=royal?a.skin:'#e2b58e',hair=royal?a.hair:enemy?'#6f3939':'#654b38';
    for(const x of [-.15,.15]){
      const leg=group(g,x,.43,0);softBox(leg,royal?'#495963':'#526052',0,-.12,0,.21,.36,.22);softBox(leg,'#534332',0,-.335,.065,.24,.19,.35);if(royal)softBox(leg,'#bf9e51',0,-.28,.19,.16,.04,.025);legs.push(leg);
    }
    const body=softBox(g,color,0,royal?.88:.72,0,royal?.75:.6,royal?.73:.57,royal?.48:.43);
    if(royal){body.material=mat('#bac8cb',.18);softBox(g,'#335e96',0,.82,.25,.48,.51,.045);}
    softBox(g,'#725239',0,royal?.61:.5,0,royal?.78:.63,.085,royal?.5:.45);softBox(g,'#e4bf64',0,royal?.62:.51,royal?.28:.24,.16,.13,.05);
    const hy=royal?1.56:1.2;
    softBall(g,skin,0,hy,0,royal?.365:.33,royal?.43:.35,royal?.32:.3);
    for(const sign of [-1,1]){softBall(g,skin,sign*(royal?.36:.32),hy-.015,0,.08,.12,.07);softBall(g,'#c7856c',sign*(royal?.37:.33),hy-.015,.04,.036,.065,.015);}
    softBall(g,hair,0,hy+.25,-.07,royal?.36:.32,.2,.29);
    if(royal)for(const sign of [-1,1])for(let i=0;i<3;i++){const curl=softBall(g,tint(hair,i*.025),sign*(.28+i*.02),hy+.2-i*.16,-.1,.12,.15,.16);curl.rotation.z=sign*-.3;}
    softBall(g,royal?tint(skin,-.025):'#e6aa7b',0,hy-.01,.31,royal?.09:.065,royal?.11:.06,.08);
    for(const x of [-.125,.125]){
      softBall(g,'#26323a',x,hy+.08,.287,.047,.059,.035);softBall(g,'#eaf5f3',x-.012,hy+.1,.32,.014);
      const brow=softBox(g,hair,x,hy+.19,.278,.17,.055,.08);brow.rotation.z=x<0?-.14:.14;
      softBall(g,royal?tint(skin,-.035):'#d99a83',Math.sign(x)*.23,hy-.07,.255,.06,.035,.02);
    }
    if(royal&&a.beard!=='none'){
      const long=a.beard==='long';
      for(const sign of [-1,1]){const moustache=softBall(g,tint(hair,.06),sign*.11,hy-.15,.365,.155,.055,.075);moustache.rotation.z=sign*.18;}
      for(let i=0;i<5;i++){
        const x=(i-2)*.085,shade=tint(hair,(i%3)*.025);
        softBall(g,shade,x,hy-(long?.37:.26)+Math.abs(i-2)*.025,.31,.11,long?.25:.12,.13);
        if(long){const tuft=mesh(g,coneGeo,tint(hair,(i%3)*.035),x,hy-.58+Math.abs(i-2)*.045,.32,[.087,.18,.1]);tuft.rotation.z=Math.PI+(i-2)*.1;}
      }
    }else tube(g,[[-.065,hy-.15,.29],[0,hy-.17,.31],[.065,hy-.15,.29]],'#9e6650',.012);
    for(const sign of [-1,1]){const arm=group(g,sign*(royal?.46:.36),royal?1.14:.9,0);softBox(arm,royal?'#9caeb8':color,0,-.15,0,royal?.25:.21,royal?.43:.32,.25);softBox(arm,'#685341',0,-.37,0,.2,.12,.23);softBall(arm,skin,0,-.46,.025,.115);arms.push(arm);}
    let cape=null,jobTool=null;
    if(royal){
      cape=royalCape(g,a.cape);
      for(let i=0;i<9;i++){const angle=(i/8)*Math.PI;softBall(g,i%2?'#e9dfc9':'#fff0d3',Math.cos(angle)*.43,1.24+Math.sin(angle)*.07,-Math.sin(angle)*.24,.13,.13,.14);}
      for(const sign of [-1,1]){softBall(g,'#c2cdd1',sign*.39,1.25,.025,.22,.11,.27);softBox(g,'#e0bd60',sign*.39,1.3,.1,.24,.045,.28);}
      const neck=mesh(g,geometry('royalClasp',()=>new THREE.TorusGeometry(.12,.022,5,16)),'#dfbc61',0,1.13,.29,[1,1,1],.4);softBall(g,'#cf6955',0,1.13,.32,.06,.08,.035);
      cylinder(g,'#e8be50',0,hy+.39,0,.365,.15,.5);
      for(const y of [hy+.32,hy+.47]){const ring=mesh(g,geometry('crownRing',()=>new THREE.TorusGeometry(.365,.022,5,20)),'#ffe09a',0,y,0,[1,1,1],.5);ring.rotation.x=Math.PI/2;}
      const points=a.crown==='spiked'?6:8;
      for(let i=0;i<points;i++){
        const angle=i*Math.PI*2/points,x=Math.sin(angle)*.32,z=Math.cos(angle)*.32,h=a.crown==='spiked'?.41:.27;
        mesh(g,coneGeo,'#f4d270',x,hy+.5+h*.38,z,[.08,h,.075],.5);
        softBall(g,'#ffe49d',x,hy+.5+h*.88,z,.037);
        softBall(g,['#bd4a55','#65aaa2','#6b83ae'][i%3],Math.sin(angle)*.372,hy+.4,Math.cos(angle)*.372,.045,.06,.035);
      }
      softBox(g,'#89613e',-.24,1.05,-.32,.24,.7,.22);
      for(let i=0;i<3;i++){box(g,'#d5c28f',-.31+i*.075,1.48,-.34,.025,.6,.025);softBox(g,'#e7e5d0',-.31+i*.075,1.8,-.34,.07,.14,.04);}
    }else if(enemy){softBall(g,'#933b46',0,hy+.3,-.02,.35,.15,.3);for(const x of [-.29,.29]){const horn=mesh(g,coneGeo,'#d7c5a2',x,hy+.4,0,[.07,.25,.07]);horn.rotation.z=x<0?.6:-.6;}jobTool=sword(g,.43,.7,.18);}
    else if(knight){softBall(g,'#aabec5',0,hy+.28,-.02,.35,.18,.3);box(g,'#d9dcca',0,hy+.18,.29,.04,.2,.04);softBox(g,'#304f6b',0,.81,.23,.35,.4,.03);jobTool=sword(g);shield(g);}
    else{
      softBall(g,job==='armorer'?'#54616a':job==='inventor'?'#77619b':'#786044',0,hy+.28,-.055,.34,.16,.3);
      softBox(g,job==='farmer'?'#b8ae6f':job==='worker'?'#81947c':job==='armorer'?'#4c4943':'#897251',0,.7,.23,.38,.42,.035);
      if(job==='worker')jobTool=axe(g,.43,.68,.13);
      else if(job==='builder'||job==='armorer'){jobTool=hammer(g);if(job==='armorer'){box(g,'#5e6562',-.4,.6,.2,.03,.35,.035);box(g,'#5e6562',-.35,.6,.2,.03,.35,.035);}}
      else if(job==='farmer'){const tool=group(g,.43,.7,.15);jobTool=tool;cylinder(tool,'#967044',0,.04,0,.025,.85);for(const x of [-.09,0,.09])box(tool,'#a5b5ab',x,.5,0,.025,.2,.025);box(tool,'#a5b5ab',0,.41,0,.21,.025,.03);}
      else if(job==='inventor'){
        for(const x of [-.125,.125]){const lens=mesh(g,geometry('spectacles',()=>new THREE.TorusGeometry(.071,.013,5,14)),'#cbb979',x,hy+.08,.33);}
        box(g,'#cbb979',0,hy+.08,.33,.1,.012,.012);softBox(g,'#e6d6a5',.43,.62,.16,.29,.34,.08);cylinder(g,'#c3a365',.43,.83,.16,.035,.35).rotation.z=Math.PI/2;
      }
      else softBox(g,'#876546',-.2,.81,-.27,.28,.38,.18);
    }
    const weapons=group(g,.5,royal?.91:.77,.17),bow=group(weapons),hatchet=axe(weapons);
    const curve=new THREE.CatmullRomCurve3([[0,-.37,0],[.14,-.17,.08],[.17,.16,.08],[0,.37,0]].map(p=>new THREE.Vector3(...p)));
    mesh(bow,geometry('royalBow',()=>new THREE.TubeGeometry(curve,10,.03,5,false)),'#a77a47',0,0,0);box(bow,'#eee5c8',0,0,0,.015,.74,.015);
    bow.visible=royal;hatchet.visible=false;weapons.visible=royal;
    const health=group(g,0,royal?2.7:2.04,0);box(health,'#543b36',0,0,0,.65,.09,.035);const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    for(const limb of [...legs,...arms])batch(limb);
    if(jobTool)batch(jobTool);
    batch(bow);batch(hatchet);if(cape)batch(cape);
    batch(g,[...legs,...arms,health,weapons,...(cape?[cape]:[]),...(jobTool?[jobTool]:[])]);
    g.userData={body,cape,jobTool,legs,arms,health,healthFill,weapons,bow,axe:hatchet,phase:Math.random()*6,lastX:undefined,lastZ:undefined,job};
    return g;
  }
  const blue='#4b7dbb',darkBlue='#31588d',stone='#bdc2b5',cream='#eee0bc',timber='#806044';
  function roof(parent,width,depth,y,color=blue){
    const rise=width*.34,half=width/2,slope=Math.atan2(rise,half),length=Math.hypot(half,rise);
    for(const side of [-1,1]){const slab=box(parent,side<0?darkBlue:color,side*width/4,y+rise/2,0,length+.18,.12,depth+.3);slab.rotation.z=side*-slope;}
    box(parent,'#b69754',0,y+rise+.045,0,.09,.09,depth+.38);return y+rise;
  }
  function window(parent,x,y,z){box(parent,timber,x,y,z,.49,.55,.08);box(parent,'#b5d8d2',x,y,z+.06,.38,.43,.035);box(parent,'#ecdfbd',x,y,z+.09,.035,.45,.035);box(parent,'#ecdfbd',x,y,z+.09,.4,.035,.035);}
  function building(item,{preview=false}={}){
    const def=BUILDINGS[item.type]||{width:120,depth:110},width=def.width/40,depth=def.depth/40,level=item.level||1;
    const root=group(scene),model=group(root),scaffold=group(root),type=item.type;
    const complete=preview||item.complete!==false;
    if(type==='wall'){
      const height=1.1+level*.18;box(model,stone,0,height/2,0,width,height,Math.max(.38,depth*.75));
      for(let x=-width/2+.1;x<width/2;x+=.37)box(model,'#e1dcc4',x,height+.12,0,.23,.3,depth*.9);
      for(const x of [-width/2+.2,width/2-.2]){cylinder(model,'#b0b8ad',x,(height+.3)/2,0,Math.max(.32,depth*.8),height+.3);cylinder(model,'#dedcc4',x,height+.34,0,Math.max(.39,depth*.95),.18);mesh(model,coneGeo,blue,x,height+.8,0,[Math.max(.45,depth),.8,Math.max(.45,depth)]);}
      box(model,'#8b7651',0,.25,depth*.43,width,.09,.06);
    }else if(type==='farm'){
      box(model,'#88613c',0,.025,0,width,.07,depth);
      const bw=Math.min(1.9,width*.45),bd=Math.min(1.6,depth*.46),barn=group(model,-width*.21,0,-depth*.22);
      box(barn,cream,0,.55,0,bw,1.1,bd);roof(barn,bw+.2,bd+.1,1.1);box(barn,timber,0,.42,bd/2+.02,.45,.84,.06);
      for(let i=0;i<5;i++){const z=depth*.05+i*depth*.16;box(model,'#b08242',-width*.14,.09,z,width*.67,.14,.14);for(let j=0;j<6;j++){const x=-width*.42+j*width*.11;mesh(model,coneGeo,i%2?'#9abe49':'#c9bf52',x,.3,z,[.085,.4,.085]);}}
      const pig=group(model,width*.29,.2,-depth*.22);ball(pig,'#d89c8e',0,.11,0,.27,.18,.36);ball(pig,'#dfb19e',0,.13,.32,.17);box(pig,'#c4857f',0,.09,.47,.16,.09,.07);for(const x of [-.14,.14])for(const z of [-.18,.17])box(pig,'#9e7966',x,-.06,z,.065,.2,.065);
      for(const side of [-1,1])box(model,timber,side*(width/2-.07),.22,0,.07,.09,depth);box(model,timber,0,.22,depth/2-.07,width,.09,.07);
    }else if(type==='academy'){
      box(model,stone,0,.14,0,width,.28,depth);box(model,cream,0,1,0,width*.72,1.8,depth*.75);
      cylinder(model,'#d7d2b4',0,1.8,-.15,Math.min(width,depth)*.24,2.8);mesh(model,coneGeo,blue,0,3.6,-.15,[Math.min(width,depth)*.36,1.2,Math.min(width,depth)*.36]);
      cylinder(model,'#e3bb5d',0,4.28,-.15,.045,.55);ball(model,'#d2b765',0,4.6,-.15,.12);
      const globe=group(model,width*.32,.9,depth*.25);ball(globe,'#8ac8c6',0,0,0,.25);const ring=mesh(globe,geometry('globeRing',()=>new THREE.TorusGeometry(.3,.02,5,20)),'#d4b76c',0,0,0);ring.rotation.x=.9;ring.rotation.z=.45;
      window(model,0,1.3,depth*.38+.01);box(model,timber,-.5,.48,depth*.39,.45,.96,.07);
    }else{
      const h=type==='forge'?1.8:type==='treasury'?1.9:1.5+(level-1)*.17;
      box(model,'#a8afa3',0,.13,0,width,.26,depth);box(model,cream,0,h/2+.15,0,width*.9,h,depth*.88);roof(model,width,depth,h+.15);
      for(const x of [-width*.43,width*.43])for(const z of [-depth*.42,depth*.42])box(model,timber,x,h/2+.15,z,.13,h+.05,.13);
      box(model,timber,-width*.14,.65,depth*.45,.62,1.25,.08);window(model,width*.25,1.03,depth*.45);
      if(level>1)window(model,-width*.28,h-.17,depth*.45);
      if(type==='forge'){
        const chimney=group(model,-width*.3,0,-depth*.22);box(chimney,'#8e9a95',0,1.7,0,.65,3.4,.7);box(chimney,'#b8c1b4',0,3.45,0,.8,.16,.86);
        box(model,'#3c4b4b',-width*.32,.3,depth*.65,.6,.6,.37);box(model,'#576a6f',-width*.32,.63,depth*.65,.92,.17,.47);
        const fire=new THREE.Mesh(new THREE.BoxGeometry(.43,.5,.04),new THREE.MeshBasicMaterial({color:'#f7943c'}));fire.position.set(-width*.3,.55,-depth*.22+.36);fire.userData.ownedGeometry=true;fire.userData.ownedMaterial=true;model.add(fire);
        for(let i=0;i<3;i++)box(model,'#637a82',width*.4,.23+i*.12,depth*.6,.42,.1,.2);
      }
      if(type==='treasury'){
        cylinder(model,'#dbbd65',0,.08,depth*.69,.3,.15,.5);for(let i=0;i<4;i++)cylinder(model,'#ebcb70',width*.38,.12+i*.09,depth*.6,.18,.075,.5);
        const crest=mesh(model,geometry('treasuryCrest',()=>new THREE.TorusGeometry(.2,.04,5,18)),'#e4c369',0,1.8,depth*.46+.04);box(model,'#d6b65f',0,1.8,depth*.47+.04,.06,.35,.045);
      }
    }
    if(!complete||item.upgrading){
      const h=type==='wall'?1.8:type==='academy'?3.7:2.4;
      for(const x of [-width*.48,width*.48])for(const z of [-depth*.48,depth*.48])box(scaffold,'#b18e55',x,h/2,z,.075,h,.075);
      for(const y of [.6,1.5])for(const z of [-depth*.48,depth*.48])box(scaffold,'#b18e55',0,y,z,width,.075,.075);
      const bar=group(root,0,h+.35,0);box(bar,'#334b3f',0,0,0,1.2,.09,.04);const fill=box(bar,'#e8cd78',-.59,0,.04,1.16,.055,.03);root.userData.progressBar=bar;root.userData.progressFill=fill;
      model.visible=complete;box(scaffold,'#aba68e',0,.06,0,width,.1,depth);
    }
    scaffold.visible=!complete||!!item.upgrading;
    batch(model);batch(scaffold);root.userData.model=model;return root;
  }
  return{character,building,axe,defaults};
}
