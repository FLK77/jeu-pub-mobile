import * as THREE from 'three';
import {createKingArmor} from './king-armor.js';
import {createKingAnatomy} from './king-anatomy.js';
import {createKingRegalia} from './king-regalia.js';

// This dedicated royal model leaves the V5.5 citizens and animals intact.
// The connected anatomical head/hands, forged armor and sculpted regalia are
// assembled around a shared articulated rig, then batched by physical surface.
export function createRoyalKingFactory(k,defaults){
  const {group,mesh,geometry,mat,batch,box}=k;
  const steel='#626d72',gold='#b19a52',leather='#292b29',red='#922530';
  function surface(parent,geo,color,x=0,y=0,z=0,scale=[1,1,1],kind='steel',metal=.55){
    const m=mesh(parent,geo,color,x,y,z,scale,metal);m.material=mat(color,metal,kind);return m;
  }
  function curve(parent,name,points,color,r=.005,kind='steel',metal=.55,segments=20){
    const geo=geometry('v56-king-curve-'+name,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,5,false));
    return surface(parent,geo,color,0,0,0,[1,1,1],kind,metal);
  }
  function shape(parent,name,points,color,depth=.018,bevel=.005,kind='steel',metal=.55){
    const geo=geometry('v56-king-shape-'+name,()=>{
      const s=new THREE.Shape();s.moveTo(...points[0]);for(const p of points.slice(1))s.lineTo(...p);s.closePath();
      return new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:3,steps:1,curveSegments:12});
    });return surface(parent,geo,color,0,0,-depth/2,[1,1,1],kind,metal);
  }
  function gem(parent,x,y,z,size=.025){
    const g=surface(parent,geometry('v56-king-gem',()=>new THREE.OctahedronGeometry(1,1)),red,x,y,z,[size,size*1.4,size*.65],'steel',.25);
    const ring=surface(parent,geometry('v56-king-gem-setting',()=>new THREE.TorusGeometry(1,.12,5,24)),gold,x,y,z-.004,[size*1.13,size*1.5,size*.8]);return g;
  }
  function sword(parent){
    const g=group(parent,0,1.28,.4);g.name='ceremonial-royal-sword';
    shape(g,'ceremonial-blade',[[0,-1.18],[-.065,-1.02],[-.041,-.93],[-.043,-.28],[-.085,-.21],[-.063,-.14],[-.055,0],[.055,0],[.063,-.14],[.085,-.21],[.043,-.28],[.041,-.93],[.065,-1.02]],steel,.034,.009);
    // A raised central arris catches light along the actual blade volume.
    shape(g,'blade-arris',[[0,-1.12],[-.013,-.94],[-.012,-.14],[0,-.055],[.012,-.14],[.013,-.94]],'#a8b1b1',.018,.003).position.z=.025;
    shape(g,'crossguard',[[-.29,-.017],[-.25,.053],[-.11,.082],[0,.065],[.11,.082],[.25,.053],[.29,-.017],[.22,.006],[.09,.022],[.05,-.041],[-.05,-.041],[-.09,.022],[-.22,.006]],gold,.055,.012);
    for(const side of[-1,1]){
      gem(g,side*.225,.027,.04,.023);
      curve(g,'guard-scroll-'+side,[[side*.052,.047,.043],[side*.095,.062,.043],[side*.15,.045,.043],[side*.177,.027,.042]],'#dfca89',.005);
    }
    const grip=surface(g,geometry('v56-royal-sword-grip',()=>new THREE.CylinderGeometry(.031,.034,.39,12)),leather,0,.265,0,[1,1,1],'hide',0);
    for(let i=0;i<12;i++){
      const band=surface(g,geometry('v56-sword-grip-wrap',()=>new THREE.TorusGeometry(.035,.006,5,16)),'#67675a',0,.085+i*.031,0);band.rotation.x=Math.PI/2;
    }
    const pommel=surface(g,geometry('v56-sword-pommel',()=>new THREE.SphereGeometry(1,16,10)),gold,0,.488,0,[.055,.065,.042]);gem(g,0,.493,.039,.03);
    gem(g,0,-.102,.045,.021);batch(g);return g;
  }
  function bow(parent){
    const g=group(parent,-.166,0,.005);g.name='royal-longbow';
    curve(g,'bow-wood',[[0,-.57,0],[.105,-.42,.025],[.19,-.18,.045],[.166,0,.05],[.19,.18,.045],[.105,.42,.025],[0,.57,0]],'#59452d',.021,'wood',0,36);
    curve(g,'bow-lamination',[[0,-.57,.012],[.102,-.4,.049],[.178,-.18,.067],[.154,0,.071],[.178,.18,.067],[.102,.4,.049],[0,.57,.012]],'#b59c64',.005,'wood',0,34);
    curve(g,'bow-string',[[0,-.57,0],[-.018,0,0],[0,.57,0]],'#c9bba0',.0026,'linen',0,4);
    for(const y of[-.44,.44])gem(g,.09,y,.046,.017);
    const wrapGeo=geometry('v56-bow-grip-wrap',()=>new THREE.TorusGeometry(.026,.004,4,12));
    for(let i=0;i<8;i++){const m=surface(g,wrapGeo,'#453b2e',.166,-.06+i*.017,.05,[1,1,1],'hide',0);m.rotation.x=Math.PI/2;}
    batch(g);return g;
  }
  function axe(parent){
    const g=group(parent,0,0,.045);g.name='royal-battle-axe';
    curve(g,'axe-haft',[[0,-.48,0],[-.012,-.15,0],[0,.44,0]],'#584430',.026,'wood',0,18);
    shape(g,'axe-blade',[[0,.4],[.12,.42],[.21,.51],[.3,.5],[.35,.35],[.34,.19],[.29,.12],[.18,.17],[.1,.27],[0,.28]],steel,.048,.009);
    curve(g,'axe-cutting-edge',[[.3,.5,.028],[.344,.407,.029],[.352,.3,.029],[.331,.193,.029],[.29,.12,.028]],'#c5ceca',.006,'steel',.65,24);
    curve(g,'axe-inlay',[[.1,.35,.032],[.17,.39,.032],[.23,.365,.032],[.23,.3,.032],[.18,.285,.032]],gold,.004);
    for(let i=0;i<8;i++){const r=surface(g,geometry('v56-axe-grip-wrap',()=>new THREE.TorusGeometry(.029,.004,4,12)),'#3b342a',0,-.25+i*.023,0,[1,1,1],'hide',0);r.rotation.x=Math.PI/2;}
    gem(g,0,.35,.038,.02);batch(g);return g;
  }
  return function royalKing(appearance={}){
    const a={...defaults,...appearance},armor=createKingArmor(k,a),{root,body,legs,knees,arms,forearms,handSockets,skirtPanels,anatomy}=armor;
    root.name='sculpted-sovereign';
    const skin=createKingAnatomy(k,a),head=skin.head;head.position.set(0,2.23,0);root.add(head);head.name='anatomical-king-head';
    const regalia=createKingRegalia(k,a);root.add(regalia.headDress,regalia.mantle,regalia.cape);regalia.headDress.position.set(0,2.23,0);
    const hands=handSockets.map((socket,i)=>{const hand=skin.createHand(socket,i?1:-1,{grip:true});hand.name=i?'right-anatomical-hand':'left-anatomical-hand';return hand;});
    const freeHand=skin.createHand(handSockets[0],-1,{grip:false});freeHand.name='relaxed-empty-hand';freeHand.visible=false;
    const weapons=group(handSockets[1]);weapons.name='equipped-royal-weapons';const royalBow=bow(weapons),hatchet=axe(weapons);hatchet.visible=false;
    const displaySword=sword(root);displaySword.visible=false;
    const health=group(root,0,2.99,0);box(health,'#543b36',0,0,0,.65,.09,.035);const healthFill=box(health,'#ff5a68',0,0,.04,.58,.055,.02);health.visible=false;
    // Preserve the head, hands and articulation nodes for posing and close
    // inspection. Static ornament inside each node is still physically merged.
    batch(head);batch(regalia.headDress);batch(regalia.mantle);batch(regalia.cape);
    batch(freeHand);
    for(let i=0;i<2;i++){batch(hands[i]);batch(forearms[i],[handSockets[i]]);batch(arms[i],[forearms[i]]);batch(knees[i]);batch(legs[i],[knees[i]]);}
    for(const panel of skirtPanels)batch(panel);
    batch(root,[head,regalia.headDress,regalia.mantle,regalia.cape,...arms,...legs,...skirtPanels,weapons,health,displaySword]);
    function aimArm(index,wrist){
      const arm=arms[index],forearm=forearms[index],socket=handSockets[index],side=index?1:-1,S=arm.position.clone(),T=new THREE.Vector3(...wrist),delta=T.clone().sub(S),distance=delta.length(),direction=delta.normalize();
      const l1=forearm.position.length(),l2=socket.position.length(),d=Math.min(l1+l2-.002,Math.max(.05,distance)),along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));
      const outward=new THREE.Vector3(side,-.55,.06);outward.addScaledVector(direction,-outward.dot(direction)).normalize();
      const elbow=S.clone().addScaledVector(direction,along).addScaledVector(outward,height);
      arm.quaternion.setFromUnitVectors(forearm.position.clone().normalize(),elbow.clone().sub(S).normalize());root.updateWorldMatrix(true,true);
      const desired=root.localToWorld(T.clone());arm.worldToLocal(desired);desired.sub(forearm.position).normalize();forearm.quaternion.setFromUnitVectors(socket.position.clone().normalize(),desired);
    }
    function poseRoyal(p,time,mounted,portrait){
      displaySword.visible=!!portrait;weapons.visible=!portrait;royalBow.visible=p.weapon!=='axe';hatchet.visible=p.weapon==='axe';
      hands[0].visible=!!portrait;freeHand.visible=!portrait;
      if(portrait){
        weapons.position.set(0,0,0);
        aimArm(0,[-.12,1.52,.35]);aimArm(1,[.12,1.66,.35]);
        // The wrists inherit the articulated forearm's rotation. Set a desired
        // orientation in the king's frame, then remove that inherited rotation;
        // otherwise the fingers point upward instead of closing over the hilt.
        root.updateWorldMatrix(true,true);
        const royalRotation=root.getWorldQuaternion(new THREE.Quaternion());
        for(let i=0;i<2;i++){
          const side=i?1:-1,desired=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),-side*Math.PI/2);
          const socketRotation=handSockets[i].getWorldQuaternion(new THREE.Quaternion());
          hands[i].quaternion.copy(socketRotation.invert()).multiply(royalRotation).multiply(desired);
        }
      }else{
        // The anatomical curl wraps the hand's local X axis. Turn that curl
        // around the vertical weapon shaft and place the shaft in the palm.
        weapons.position.set(-.12,0,0);
        for(let i=0;i<2;i++){forearms[i].rotation.set(mounted?-.36:-.16,0,0);hands[i].rotation.set(0,0,i?-Math.PI/2:0);}
      }
    }
    root.userData={body,head,hands,freeHand,headDress:regalia.headDress,mantle:regalia.mantle,cape:regalia.cape,legs,knees,arms,forearms,handSockets,skirtPanels,health,healthFill,weapons,bow:royalBow,axe:hatchet,displaySword,poseRoyal,anatomy,phase:Math.random()*6,lastX:undefined,lastZ:undefined,job:'king',bodyDimensions:{width:.76,depth:.51,height:.94},modelVersion:5,designRevision:3,modelStyle:'sculpted',anatomySource:'makehuman-cc0-sculpted',features:skin.features};
    return root;
  };
}
