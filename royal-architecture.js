import * as THREE from 'three';
import {BUILDINGS} from './kingdom-data.js';

// Each structure is made locally from reusable sculpted pieces and then merged
// by surface. The roofs, arches and turned masonry share cached geometry.
export function createRoyalArchitecture(k) {
  const {scene,group,mesh,box,softBox,softBall,cylinder,geometry,mat,batch}=k;
  const C={slate:'#4b7dbb',edge:'#294c78',cream:'#eee0bc',stone:'#b9c1b5',trim:'#e4d9b6',wood:'#806044',dark:'#263f48',gold:'#d4ad58'};
  function surface(m,color,kind,metal=0){m.material=mat(color,metal,kind);return m;}
  function block(p,c,x,y,z,w,h,d,kind='stone'){return surface(softBox(p,c,x,y,z,w,h,d),c,kind);}
  function ellipsoid(p,c,x,y,z,w,h,d){return softBall(p,c,x,y,z,w,h,d);}
  function beam(p,a,b,r=.045,c=C.wood){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const m=surface(cylinder(p,c,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,delta.length()),c,'wood');m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
  function tube(p,points,c,r=.025,kind=null){const key=`architectureTube:${JSON.stringify(points)}:${r}`;const m=mesh(p,geometry(key,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(10,points.length*4),r,6,false)),c,0,0,0);if(kind)surface(m,c,kind);return m;}
  function turned(p,name,profile,c,x,y,z,scale=[1,1,1],kind='stone',metal=0){const m=mesh(p,geometry(`architectureLathe:${name}`,()=>new THREE.LatheGeometry(profile.map(v=>new THREE.Vector2(...v)),24)),c,x,y,z,scale,metal);return surface(m,c,kind,metal);}
  function extrude(name,shape,depth,bevel=.02){return geometry(`architectureShape:${name}:${depth}:${bevel}`,()=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:!!bevel,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,curveSegments:12,steps:1}));}
  function archShape(w,h){const s=new THREE.Shape(),r=w/2,shoulder=h-r;s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,shoulder);s.absarc(0,shoulder,r,0,Math.PI,false);s.lineTo(-r,0);s.closePath();return s;}
  function opening(p,x,y,z,w=.58,h=.82,{door=false,gold=false}={}){
    const g=group(p,x,y,z),s=archShape(w,h);
    const panel=mesh(g,extrude(`opening:${w}:${h}`,s,.045,.012),door?'#694f39':'#628b91',0,0,0);
    surface(panel,door?'#694f39':'#628b91',door?'wood':null);
    const r=w/2,shoulder=h-r,points=[[-r,0,.075],[-r,shoulder,.075]];
    for(let i=1;i<=12;i++){const a=Math.PI-i*Math.PI/12;points.push([Math.cos(a)*r,shoulder+Math.sin(a)*r,.075]);}
    points.push([r,0,.075]);tube(g,points,gold?C.gold:C.trim,door?.06:.045,'stone');
    if(door){for(const a of [-.22,0,.22]){const xx=a*w;beam(g,[xx,.06,.061],[xx,h-w*.18,.061],.009,'#9c794e');}ellipsoid(g,C.gold,w*.23,h*.38,.1,.035,.035,.02);}
    else{beam(g,[0,.03,.064],[0,h-.04,.064],.018,C.trim);beam(g,[-w*.43,h*.4,.065],[w*.43,h*.4,.065],.016,C.trim);block(g,C.trim,0,-.025,.065,w+.17,.09,.17,'stone');}
    return g;
  }
  // The eased profile lifts the ridge and curls gently up at the eaves. Blue
  // slate texture follows the roof instead of being stretched across a box.
  function roof(p,w,d,y,{rise=w*.38,color=C.slate,ornament=true}={}){
    const half=w/2,over=.19,key=`curvedRoof:${w}:${d}:${rise}`;
    const shape=new THREE.Shape();shape.moveTo(-half-over,-.045);
    shape.bezierCurveTo(-half*.63,.02,-half*.4,rise*.86,0,rise);
    shape.bezierCurveTo(half*.4,rise*.86,half*.63,.02,half+over,-.045);
    shape.lineTo(half+over,-.17);
    shape.bezierCurveTo(half*.6,-.06,half*.4,rise*.86-.13,0,rise-.13);
    shape.bezierCurveTo(-half*.4,rise*.86-.13,-half*.6,-.06,-half-over,-.17);shape.closePath();
    const slab=mesh(p,extrude(key,shape,d+.34,.025),color,0,y,-d/2-.17);surface(slab,color,'slate');
    for(const zz of [-d/2-.205,d/2+.205]){
      tube(p,[[-half-over,y-.08,zz],[-half*.67,y+rise*.28,zz],[-half*.32,y+rise*.8,zz],[0,y+rise+.015,zz],[half*.32,y+rise*.8,zz],[half*.67,y+rise*.28,zz],[half+over,y-.08,zz]],C.edge,.045,'wood');
    }
    for(const sign of [-1,1])tube(p,[[sign*(half+over),y-.075,-d/2-.22],[sign*(half+over),y-.075,0],[sign*(half+over),y-.075,d/2+.22]],C.edge,.055,'wood');
    const ridge=turned(p,'ridgeCaps',[[.06,-.5],[.085,-.46],[.085,.46],[.06,.5]],C.gold,0,y+rise+.045,0,[1,d+.46,1],null,.55);ridge.rotation.x=Math.PI/2;
    if(ornament)for(const zz of [-d/2-.23,d/2+.23])ellipsoid(p,C.gold,0,y+rise+.075,zz,.08,.1,.08);
    return y+rise;
  }
  function foundation(p,w,d){block(p,'#9aa89c',0,.14,0,w,.28,d);block(p,C.trim,0,.3,0,w+.08,.12,d+.08);}
  function gable(p,w,d,h){
    const s=new THREE.Shape();s.moveTo(-w*.45,h);s.lineTo(w*.45,h);s.lineTo(0,h+w*.34);s.closePath();
    const m=mesh(p,extrude(`gable:${w}:${d}:${h}`,s,.12,.01),C.cream,0,0,d*.43);surface(m,C.cream,'plaster');
    beam(p,[-w*.44,h+.03,d*.45],[0,h+w*.34,d*.45],.04);beam(p,[0,h+w*.34,d*.45],[w*.44,h+.03,d*.45],.04);beam(p,[0,h+.02,d*.46],[0,h+w*.29,d*.46],.035);
  }
  function lantern(p,x,y,z){const g=group(p,x,y,z);beam(g,[-.06,.13,0],[-.06,.34,0],.025,C.dark);beam(g,[-.06,.34,0],[.12,.34,0],.025,C.dark);turned(g,'lantern',[[0,-.12],[.09,-.09],[.075,.1],[0,.15]],'#edc778',.1,0,0,[1,1,1],null);for(const yy of [-.08,.1]){const ring=mesh(g,geometry('lanternRim',()=>new THREE.TorusGeometry(.08,.014,5,12)),C.dark,.1,yy,0);ring.rotation.x=Math.PI/2;}}
  function houseShell(p,w,d,h,{doorX=-w*.2,windowX=w*.24}={}){
    foundation(p,w,d);block(p,C.cream,0,h/2+.3,0,w*.9,h,d*.87,'plaster');
    for(const x of [-w*.435,w*.435])for(const z of [-d*.425,d*.425])block(p,C.wood,x,h/2+.32,z,.13,h+.09,.13,'wood');
    for(const yy of [.5,h+.2])block(p,C.wood,0,yy,d*.45,w*.9,.12,.11,'wood');
    beam(p,[-w*.42,.58,d*.45],[-w*.29,h*.67,d*.45],.04);beam(p,[w*.42,.58,d*.45],[w*.29,h*.67,d*.45],.04);
    gable(p,w,d,h+.3);roof(p,w,d,h+.32);
    opening(p,doorX,.35,d*.445,.64,1.16,{door:true});opening(p,windowX,.9,d*.445,.54,.7);
    for(let i=0;i<2;i++)block(p,'#c8c7b0',doorX,.13-i*.055,d*.52+i*.12,.91+i*.12,.12,.27);
    lantern(p,doorX-.48,1.28,d*.48);return p;
  }
  function flag(p,x,y,z,color='#4b7dbb'){
    cylinder(p,C.gold,x,y+.35,z,.025,.75,.4);ellipsoid(p,C.gold,x,y+.76,z,.05,.05,.05);
    const geo=geometry('villageFlag',()=>{const g=new THREE.PlaneGeometry(.45,.23,5,2),v=g.attributes.position;for(let i=0;i<v.count;i++)v.setZ(i,Math.sin((v.getX(i)+.225)*12)*.035);g.computeVertexNormals();return g;});const m=mesh(p,geo,color,x+.22,y+.53,z);surface(m,color,'cloth');m.material.side=THREE.DoubleSide;
  }
  function roundedTower(p,x,z,r,h){
    turned(p,`bastion:${r}:${h}`,[[0,0],[r*.94,0],[r,.1],[r,.28],[r*.85,.36],[r*.85,h-.18],[r,h-.13],[r,h],[r*.68,h+.05],[0,h+.05]],C.stone,x,.06,z,[1,1,1]);
    turned(p,`bastionCap:${r}`,[[0,0],[r*1.15,0],[r*.96,.13],[r*.74,.35],[r*.42,.62],[0,.81]],C.slate,x,h+.12,z,[1,1,1],'slate');
    ellipsoid(p,C.gold,x,h+.98,z,.055,.09,.055);return h+1;
  }
  function wall(p,w,d,level){const h=1.18+level*.18;foundation(p,w,Math.max(.43,d));block(p,C.stone,0,h/2+.12,0,w,h,Math.max(.34,d*.77));
    for(let i=0;i<3;i++)block(p,i%2?'#cad0bf':'#b9c1b5',0,.42+i*.32,d*.39,w-.11,.04,.035);
    block(p,C.trim,0,h+.15,0,w+.08,.14,Math.max(.5,d*.98));
    for(let x=-w/2+.16;x<w/2;x+=.38)block(p,C.trim,x,h+.34,0,.24,.32,Math.max(.4,d*.83));
    for(const xx of [-w/2+.15,w/2-.15])roundedTower(p,xx,0,Math.max(.3,d*.61),h+.17);
  }
  function leaf(p,x,y,z,rotation,scale=1,color='#7eaa54'){
    const s=new THREE.Shape();s.moveTo(0,0);s.bezierCurveTo(-.14,.13,-.1,.3,0,.4);s.bezierCurveTo(.1,.3,.14,.13,0,0);const leafGeo=geometry('architectureCropLeaf',()=>new THREE.ExtrudeGeometry(s,{depth:.012,bevelEnabled:false,curveSegments:4,steps:1}));const m=mesh(p,leafGeo,color,x,y,z,[scale,scale,scale]);m.rotation.y=rotation;m.rotation.z=.45;return m;
  }
  function pig(p,x,z){const g=group(p,x,.28,z);ellipsoid(g,'#dca392',0,.07,0,.26,.21,.38);ellipsoid(g,'#edb6a0',0,.13,.31,.2,.19,.2);ellipsoid(g,'#c7847b',0,.08,.48,.13,.085,.04);
    for(const xx of [-.065,.065]){ellipsoid(g,'#7c4f4c',xx,.09,.515,.018,.019,.012);ellipsoid(g,'#364144',xx*1.65,.19,.465,.021,.026,.012);}
    for(const xx of [-.16,.16])for(const zz of [-.2,.17]){ellipsoid(g,'#b7786b',xx,-.14,zz,.06,.12,.067);ellipsoid(g,'#72564c',xx,-.22,zz,.065,.035,.075);}
    for(const sign of [-1,1]){const ear=ellipsoid(g,'#d08b7e',sign*.15,.3,.29,.1,.13,.035);ear.rotation.z=sign*-.55;}
    tube(g,[[.04,.12,-.35],[.13,.18,-.42],[.08,.24,-.44],[.03,.2,-.4]],'#b97c71',.023);return g;
  }
  function farm(p,w,d){
    block(p,'#7e6847',0,.07,0,w,.13,d,'dirt');const barn=group(p,-w*.23,0,-d*.22);houseShell(barn,w*.43,d*.47,1.12,{doorX:-w*.1,windowX:w*.13});
    // Deep, rounded furrows, leaf clusters and grain heads produce a readable
    // working farm even in the distant orthographic view.
    for(let i=0;i<4;i++){const z=.12+i*d*.17;block(p,'#604a34',-w*.13,.16,z,w*.64,.16,.28,'dirt');
      for(let j=0;j<7;j++){const x=-w*.4+j*w*.09;beam(p,[x,.23,z],[x,.57,z],.011,'#9ca052');for(let t=0;t<3;t++){leaf(p,x,.24+t*.08,z,t*2.1,.58,i%2?'#8ba84a':'#648b43');}ellipsoid(p,'#d8bd62',x,.62,z,.035,.095,.035);}
    }
    pig(p,w*.31,-d*.22);pig(p,w*.25,-d*.4).scale.setScalar(.62);
    for(const sign of [-1,1]){const x=sign*(w/2-.065);for(let i=0;i<5;i++)beam(p,[x,.1,-d/2+i*d/4],[x,.55,-d/2+i*d/4],.035);for(const yy of [.3,.48])beam(p,[x,yy,-d/2],[x,yy,d/2],.035);}
    for(const yy of [.3,.48])beam(p,[-w/2,yy,d/2],[w/2,yy,d/2],.035);
    turned(p,'waterTrough',[[0,0],[.24,0],[.28,.1],[.28,.26],[.22,.26],[.21,.08],[0,.08]],'#8b7250',w*.39,.12,-d*.38,[1,1,1],'wood');ellipsoid(p,'#72b3b8',w*.39,.35,-d*.38,.21,.015,.21);
  }
  function academy(p,w,d,level){
    foundation(p,w,d);houseShell(p,w*.72,d*.78,1.55);const r=Math.min(w,d)*.225,tower=group(p,-w*.13,0,-d*.13);
    turned(tower,`academyTower:${r}`,[[0,0],[r+.1,0],[r+.1,.25],[r,.35],[r,2.65],[r+.07,2.71],[r+.07,2.84],[r*.9,2.9],[0,2.9]],'#d4d0b4',0,.22,0,[1,1,1],'stone');
    turned(tower,`academyRoof:${r}`,[[0,0],[r*1.27,0],[r*1.07,.12],[r*.78,.44],[r*.5,.82],[r*.24,1.22],[0,1.63]],C.slate,0,3.04,0,[1,1,1],'slate');
    flag(tower,0,4.64,0,'#657aab');
    opening(tower,0,1.95,r+.015,.5,.74,{gold:true});const side=group(tower,r+.015,1.4,0);side.rotation.y=Math.PI/2;opening(side,0,0,0,.45,.69);
    const globe=group(p,w*.34,.93,d*.31);ellipsoid(globe,'#78b1ad',0,0,0,.27,.27,.27);for(const a of [.15,1.5]){const ring=mesh(globe,geometry('academyArmillary',()=>new THREE.TorusGeometry(.34,.022,6,24)),C.gold,0,0,0,[1,1,1],.5);ring.rotation.set(a,.3,.6);}cylinder(globe,C.gold,0,-.37,0,.055,.43,.4);block(globe,C.stone,0,-.6,0,.42,.11,.42);
    if(level>1)roundedTower(p,w*.35,-d*.28,.34,2.1);
  }
  function forge(p,w,d,h){
    houseShell(p,w,d,h);const x=-w*.28,z=-d*.17;block(p,'#8f9b91',x,1.65,z,.74,3.3,.78);for(let i=0;i<4;i++)block(p,'#b6bcaa',x,.55+i*.72,z,.8,.09,.84);block(p,C.trim,x,3.37,z,.92,.17,.94);block(p,'#293b3c',x,3.48,z,.57,.055,.61);
    // A masonry outdoor furnace, with an inset arched ember opening.
    const furnace=group(p,-w*.25,0,d*.53);block(furnace,'#8c9386',0,.5,0,.93,1,.71);opening(furnace,0,.25,.37,.53,.54,{door:true});
    const ember=mesh(furnace,extrude('furnaceEmber',archShape(.36,.39),.015,.005),'#ffb95b',0,.28,.438);ember.material=mat('#e99044',0);ellipsoid(furnace,'#ffd57a',0,.36,.475,.12,.055,.015);
    const anvil=group(p,w*.3,.22,d*.55);turned(anvil,'anvilBase',[[0,0],[.24,0],[.2,.16],[.12,.2],[.13,.39],[.27,.45],[0,.45]],'#51626a',0,0,0,[1,1,1],null,.6);block(anvil,'#7c9196',0,.52,0,.71,.16,.28,null);const horn=ellipsoid(anvil,'#6e848d',.41,.5,0,.25,.095,.1);horn.rotation.z=.15;
    beam(p,[w*.43,.32,d*.42],[w*.43,1.05,d*.42],.026,'#96724b');block(p,'#7f9295',w*.43,1.09,d*.42,.28,.14,.17,null);
  }
  function treasury(p,w,d,h){houseShell(p,w,d,h);for(const sign of [-1,1]){const x=sign*w*.34;turned(p,'treasuryPillar',[[0,0],[.16,0],[.16,.13],[.11,.18],[.11,1.4],[.16,1.46],[.16,1.59],[0,1.59]],C.trim,x,.32,d*.49,[1,1,1],'stone');}
    const crest=mesh(p,geometry('bankSeal',()=>new THREE.TorusGeometry(.22,.045,8,24)),C.gold,0,h+.2,d*.46,[1,1,1],.65);const diamond=ellipsoid(p,'#f0ce71',0,h+.2,d*.5,.12,.16,.035);diamond.rotation.z=.4;
    const chest=group(p,w*.28,.36,d*.64);block(chest,'#845e3c',0,0,0,.61,.42,.4,'wood');ellipsoid(chest,'#a17a43',0,.2,0,.3,.16,.2);for(const x of [-.21,.21])block(chest,C.gold,x,.05,.21,.035,.36,.02,null);block(chest,C.gold,0,.05,.23,.12,.1,.025,null);
    for(let i=0;i<4;i++)cylinder(p,'#e4c06b',-w*.3,.1+i*.055,d*.64,.14,.05,.65);
    flag(p,0,h+w*.38+.34,0);
  }
  function scaffoldFor(p,w,d,h){for(const x of [-w*.48,w*.48])for(const z of [-d*.48,d*.48])beam(p,[x,.06,z],[x,h,z],.04,'#b18e55');
    for(const y of [.65,1.45])for(const z of [-d*.48,d*.48]){beam(p,[-w*.48,y,z],[w*.48,y,z],.045,'#b18e55');beam(p,[-w*.48,y-.45,z],[w*.48,y+.45,z],.025,'#9b7749');}
    for(let i=0;i<6;i++)beam(p,[-w*.48,.18+i*.26,d*.49],[-w*.3,.18+i*.26,d*.49],.025,'#b18e55');beam(p,[-w*.48,.1,d*.49],[-w*.48,1.75,d*.49],.025,'#b18e55');beam(p,[-w*.3,.1,d*.49],[-w*.3,1.75,d*.49],.025,'#b18e55');
  }
  function building(item,{preview=false}={}){
    const def=BUILDINGS[item.type]||{width:120,depth:110},w=def.width/40,d=def.depth/40,level=item.level||1;
    const root=group(scene),model=group(root),scaffold=group(root),type=item.type,complete=preview||item.complete!==false;
    if(type==='wall')wall(model,w,d,level);else if(type==='farm')farm(model,w,d);else if(type==='academy')academy(model,w,d,level);else if(type==='forge')forge(model,w,d,1.72);else if(type==='treasury')treasury(model,w,d,1.9);else{const h=1.55+(level-1)*.2;houseShell(model,w,d,h);if(level>1){opening(model,-w*.15,h+.36,d*.445,.38,.44);flag(model,w*.3,h+w*.38+.1,0);}const pot=turned(model,'houseFlowerpot',[[0,0],[.15,0],[.18,.25],[.2,.25],[.2,.32],[.14,.32],[.13,.1],[0,.1]],'#ae7954',w*.39,.33,d*.49,[1,1,1],null);for(let i=0;i<4;i++)leaf(model,w*.39,.55,d*.49,i*Math.PI/2,.75,'#719053');}
    if(!complete||item.upgrading){const h=type==='wall'?2.5:type==='academy'?4.3:2.9;scaffoldFor(scaffold,w,d,h);const bar=group(root,0,h+.35,0);box(bar,'#334b3f',0,0,0,1.2,.09,.04);const fill=box(bar,'#e8cd78',-.59,0,.04,1.16,.055,.03);root.userData.progressBar=bar;root.userData.progressFill=fill;model.visible=complete;block(scaffold,'#aba68e',0,.06,0,w,.1,d,'dirt');}
    scaffold.visible=!complete||!!item.upgrading;batch(model);batch(scaffold);root.userData.model=model;return root;
  }
  return {building};
}
