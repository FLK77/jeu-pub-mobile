import * as THREE from 'three';
import {createRoyalModels} from './royal-models.js';

// The same anatomical citizen rig underpins five enemy silhouettes. Retaining
// the unbatched source until the kit has been fitted avoids layering another
// set of draws over an already merged actor.
export function createEnemyModels(k){
  const {scene,group,mesh,geometry,mat,batch}=k;
  let palette={cloth:'#794c43',steel:'#6a7376'};
  const base=createRoyalModels({...k,
    geometry:(key,make)=>{const g=geometry(key,make);g.userData.v6Source=key;return g;},
    mat:(color,metal=0,kind=null)=>mat(color==='#794c43'||color==='#5c5969'?palette.cloth:color==='#626e77'?palette.steel:color,kind==='steel'||kind==='metal'?.4:metal,kind==='cloth'?'linen':kind),
    batch(){}
  });
  const profiles={
    raider:{cloth:'#854a3e',steel:'#82877d',trim:'#bb9670',scale:.87},
    skirmisher:{cloth:'#4d6356',steel:'#69756d',trim:'#a2ad82',scale:.83},
    breaker:{cloth:'#64536c',steel:'#777a85',trim:'#b7a2ba',scale:.92},
    brute:{cloth:'#685142',steel:'#696e67',trim:'#c3a57d',scale:1.01},
    captain:{cloth:'#793c4e',steel:'#596877',trim:'#d1b676',scale:.95}
  };
  const sphere=geometry('v6-enemy-detail',()=>new THREE.SphereGeometry(1,10,6));
  function surface(p,g,c,x=0,y=0,z=0,s=[1,1,1],kind='steel',metal=.4){const m=mesh(p,g,c,x,y,z,s,metal);m.material=mat(c,kind==='steel'?.4:metal,kind);return m;}
  function oval(p,c,x,y,z,sx,sy=sx,sz=sx,kind='steel',metal=.4){return surface(p,sphere,c,x,y,z,[sx,sy,sz],kind,metal);}
  function curve(p,points,c,r=.012,kind='steel',metal=.35){
    const key='v6-enemy-curve-'+JSON.stringify([points,r]);
    return surface(p,geometry(key,()=>new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),Math.max(4,points.length*3),r,5,false)),c,0,0,0,[1,1,1],kind,metal);
  }
  function plate(p,name,points,c,x,y,z,depth=.025){
    const shape=new THREE.Shape();points.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
    return surface(p,geometry('v6-enemy-plate-'+name,()=>new THREE.ExtrudeGeometry(shape,{depth,steps:1,bevelEnabled:true,bevelSegments:2,bevelSize:.006,bevelThickness:.005,curveSegments:6})),c,x,y,z);
  }
  function hideHelmet(root){
    const remove=[];
    for(const m of root.children){if(!m.isMesh)continue;const key=m.geometry.userData.v6Source||'';
      m.geometry.computeBoundingBox();const b=m.geometry.boundingBox;
      const low=b.min.y*m.scale.y+m.position.y;
      if(/conical-helm|cheek-helm|realistic-strap-nasal/.test(key)||low>2.222)remove.push(m);
    }
    remove.forEach(m=>m.removeFromParent());
  }
  function hood(root,c){
    const geo=geometry('v6-enemy-scout-hood',()=>{
      const pos=[],uv=[],idx=[],rows=10,sides=20;
      for(let i=0;i<=rows;i++){const t=i/rows,y=1.88+t*.5,r=.18*Math.sin(Math.PI*(t*.72+.16))+.016;
        for(let j=0;j<=sides;j++){const a=.78+j/sides*(Math.PI*2-1.56);pos.push(Math.sin(a)*r,y,Math.cos(a)*r-.016);uv.push(j/sides,t);if(i&&j){const n=i*(sides+1)+j;idx.push(n,n-1,n-sides-2,n,n-sides-2,n-sides-1);}}
      }
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
    });const m=surface(root,geo,c,0,0,0,[1,1,1],'quilt',0);m.material=mat(c,0,'quilt');
    for(const sign of [-1,1])curve(root,[[sign*.09,1.91,.07],[sign*.132,2.06,.118],[sign*.127,2.23,.115],[sign*.06,2.35,.045]],'#9a9e79',.009,'quilt',0);
  }
  function roundShield(root,c,trim,tier){
    const shield=group(root,-.40,1.30,.18);
    const disk=geometry('v6-round-raider-shield',()=>new THREE.CylinderGeometry(.27,.27,.043,24));
    const face=surface(shield,disk,c,0,0,0,[1,1,1],'hide',0);face.rotation.x=Math.PI/2;
    const rim=geometry('v6-round-raider-rim',()=>new THREE.TorusGeometry(.263,.017,5,24));surface(shield,rim,trim,0,0,.027);
    oval(shield,'#8f9994',0,0,.05,.075,.075,.05);
    for(let i=0;i<8;i++){const a=i*Math.PI/4;oval(shield,trim,Math.sin(a)*.23,Math.cos(a)*.23,.032,.009,.009,.006);}
    for(const sign of [-1,1])curve(shield,[[sign*.05,-.22,.024],[sign*.05,.22,.024]],'#393f35',.009,'hide',0);
    if(tier>1)for(const sign of [-1,1])curve(shield,[[sign*.16,-.16,.031],[0,0,.036],[sign*.16,.16,.031]],trim,.012);
    return shield;
  }
  function hammer(root,c){
    const tool=group(root,.39,1.10,.15);
    curve(tool,[[0,-.45,0],[0,.42,0]],'#745137',.028,'hide',0);
    plate(tool,'breaker-hammer',[[-.25,-.08],[-.19,-.13],[.19,-.13],[.25,-.07],[.25,.07],[.18,.13],[-.18,.13],[-.25,.07]],c,0,.42,-.10,.20);
    for(const x of [-.18,.18])curve(tool,[[x,.32,.115],[x,.51,.115]],'#b4b8ae',.009);
    for(let i=0;i<5;i++)curve(tool,[[-.026,-.28+i*.035,.013],[.026,-.26+i*.035,.013]],'#b49c71',.006,'hide',0);
    return tool;
  }
  function cleaver(root,c){
    const tool=group(root,.39,1.09,.15);
    curve(tool,[[0,-.18,0],[0,.14,0]],'#594837',.032,'hide',0);
    plate(tool,'brute-cleaver',[[-.025,.09],[-.085,.18],[-.13,.67],[-.05,.76],[.14,.70],[.17,.25],[.07,.11]],c,0,0,-.025,.05);
    curve(tool,[[-.06,.16,.04],[-.10,.64,.04],[-.035,.71,.04]],'#c1c6b7',.008);
    return tool;
  }
  function javelins(root,c){
    const tool=group(root,.37,1.10,.14);
    curve(tool,[[0,-.69,0],[0,.72,0]],c,.014,'hide',0);
    plate(tool,'skirmisher-javelin',[[-.027,.64],[0,.85],[.027,.64],[0,.59]],'#bdc5b9',0,0,-.009,.018);
    curve(tool,[[0,-.13,.0],[0,.05,0]],'#453b2f',.025,'hide',0);
    // Spare javelins sit in two fitted leather loops above the shoulder.
    for(let i=0;i<3;i++){
      const x=-.19+i*.036;
      curve(root,[[x,1.12,-.23],[x-.075,2.12,-.24]],c,.008,'hide',0);
      plate(root,'spare-javelin-'+i,[[-.018,0],[0,.14],[.018,0],[0,-.04]],'#adb7aa',x-.071,2.08,-.25,.012);
    }
    for(const y of [1.42,1.72])curve(root,[[-.24,y,-.23],[-.13,y+.01,-.28],[-.07,y+.02,-.23]],'#473c2d',.016,'hide',0);
    return tool;
  }
  function banner(root,c,trim){
    curve(root,[[-.17,1.30,-.20],[-.17,2.92,-.20]],'#776143',.016,'hide',0);
    const pos=[],uv=[],idx=[],columns=6,rows=10;
    for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++){
      const u=x/columns,v=y/rows;pos.push(-.17+u*.46,2.86-v*.72-.07*Math.sin(u*Math.PI),-.20+.045*Math.sin(u*9+v*3)*u);uv.push(u,v);if(x&&y){const n=y*(columns+1)+x;idx.push(n,n-1,n-columns-2,n,n-columns-2,n-columns-1);}}
    const g=geometry('v6-captain-banner',()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;});
    const cloth=surface(root,g,c,0,0,0,[1,1,1],'linen',0);cloth.material=mat(c,0,'linen');
    curve(root,[[-.13,2.66,-.178],[.03,2.72,-.175],[.18,2.64,-.18]],trim,.012,'linen',0);
    curve(root,[[.015,2.74,-.17],[.015,2.36,-.17]],trim,.011,'linen',0);
    oval(root,trim,-.17,2.97,-.2,.032,.067,.032);
  }
  function character(options={}){
    const kind=Object.hasOwn(profiles,options.kind)?options.kind:'raider',tier=Math.max(1,Math.min(4,Math.floor(options.tier)||1)),p=profiles[kind];palette=p;
    const root=base.character('enemy',{elite:kind==='captain'||!!options.elite}),d=root.userData;
    root.scale.set(p.scale*(kind==='brute'?1.13:1),p.scale*(1+(tier-1)*.025),p.scale*(kind==='brute'?1.08:1));
    d.jobTool?.removeFromParent();d.jobTool=null;
    if(kind==='skirmisher'){hideHelmet(root);hood(root,p.cloth);d.jobTool=javelins(root,'#8f7750');}
    else if(kind==='breaker')d.jobTool=hammer(root,p.steel);
    else if(kind==='brute'){hideHelmet(root);d.jobTool=cleaver(root,p.steel);
      for(const sign of [-1,1]){const shoulder=oval(d.arms[sign<0?0:1], '#706f5f',0,0,-.015,.16,.12,.16,'hide',0);shoulder.rotation.z=sign*.2;}
      for(let i=0;i<5;i++){const x=(i-2)*.018;curve(root,[[x,2.25,.025],[x,2.32,-.026],[x,2.28,-.105]],'#463d31',.012,'fur',0);}
    }else {
      const tool=group(root,.38,1.08,.15);curve(tool,[[0,-.2,0],[0,.12,0]],'#4f3c30',.027,'hide',0);plate(tool,'enemy-arming-sword',[[-.035,.06],[-.037,.61],[0,.76],[.037,.61],[.035,.06]],'#bdc6bc',0,0,-.014,.028);curve(tool,[[-.12,.04,.005],[0,.07,.005],[.12,.04,.005]],p.trim,.018);d.jobTool=tool;
      roundShield(root,p.cloth,p.trim,tier);
    }
    if(kind==='captain')banner(root,p.cloth,p.trim);
    // Higher ranks visibly add articulated armor, rather than just changing tint.
    if(tier>1||kind==='breaker'||kind==='captain')for(const sign of [-1,1]){
      const limb=d.arms[sign<0?0:1];
      for(let layer=0;layer<Math.min(3,tier);layer++){
        const m=plate(limb,'rank-pauldron-'+layer,[[-.105,.04],[0,.10],[.105,.04],[.12,-.06],[0,-.10],[-.12,-.06]],p.steel,sign*.025,-.018-layer*.046,.055,.018);m.rotation.z=sign*-.28;
      }
      if(tier>2){const calf=d.knees[sign<0?0:1];plate(calf,'rank-greave',[[-.043,.12],[.047,.12],[.035,-.11],[0,-.15],[-.035,-.11]],p.steel,0,-.27,.077,.012);}
    }
    if(tier>2)for(const sign of [-1,1])curve(root,[[sign*.13,2.31,-.018],[sign*.20,2.43,-.025],[sign*.24,2.49,-.03]],p.trim,.012);
    // Enemy tabards need no mounted splits: fixed panels share the torso draw
    // while arms, knees and legs retain the full articulated gait.
    d.skirtPanels=[];
    // At most one merge for each animation pivot; no micro mesh survives.
    for(let i=0;i<d.legs.length;i++){batch(d.knees[i]);batch(d.legs[i],[d.knees[i]]);}
    for(const limb of d.arms)batch(limb);for(const panel of d.skirtPanels||[])batch(panel);if(d.cape)batch(d.cape);if(d.jobTool)batch(d.jobTool);
    batch(root,[...d.legs,...d.arms,...(d.skirtPanels||[]),d.health,d.weapons,d.cape,d.jobTool].filter(Boolean));
    Object.assign(d,{enemyKind:kind,tier,designRevision:6,modelStyle:'realistic',enemySilhouette:kind,features:{tierArmor:tier>1,banner:kind==='captain',shield:['raider','captain'].includes(kind),ranged:kind==='skirmisher'}});
    return root;
  }
  return{character};
}
