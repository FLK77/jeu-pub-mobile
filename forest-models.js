import * as THREE from 'three';

// Botanical silhouettes are built from folded leaves and tapered branches, then
// merged into a bark and a foliage surface. The forest instances these two
// surfaces per sector; no individual leaf creates a draw call.
export function createForestModels(k){
  const {scene,group,mesh,geometry,mat,batch}=k;
  const branchGeo=geometry('v5-tapered-branch',()=>new THREE.CylinderGeometry(.55,1,1,7,1));
  const trunkGeo=geometry('v5-rooted-trunk',()=>{
    const g=new THREE.CylinderGeometry(.09,.25,2.95,10,6),p=g.attributes.position;
    for(let i=0;i<p.count;i++){
      const y=p.getY(i),t=(y+1.475)/2.95,a=Math.atan2(p.getZ(i),p.getX(i));
      const flare=1+.055*Math.sin(a*5+t*5);
      p.setXYZ(i,p.getX(i)*flare+Math.sin(t*2.6)*.1,y,p.getZ(i)*flare+t*t*.1);
    }
    g.computeVertexNormals();return g;
  });
  const leafPoints=[[0,0,-.5],[-.19,.025,-.3],[-.27,.055,.05],[-.16,.035,.32],[0,-.025,.55],[.16,.035,.32],[.27,.055,.05],[.19,.025,-.3],[0,.13,0]];
  const leafFaces=[0,1,8,1,2,8,2,3,8,3,4,8,4,5,8,5,6,8,6,7,8,7,0,8];
  const colors={oak:['#419c33','#5bb62f','#77cb35','#a7df4c','#4cac38','#86d83c'],pine:['#217a40','#329b45','#48b344','#6bc746','#8cd743']};
  const barkMaterial=mat('#825b35',0,'bark'),leafMaterial=mat('#d7f3b3',0,'foliage');
  leafMaterial.side=THREE.DoubleSide;leafMaterial.vertexColors=true;
  function branch(parent,a,b,r=.05){
    const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av);
    const m=mesh(parent,branchGeo,'#825b35',(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,[r,d.length(),r]);
    m.material=barkMaterial;m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
  }
  function canopy(species,far){
    const vertices=[],uv=[],color=[],indices=[],rotation=new THREE.Euler(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3();let leaves=0;
    function leaf(x,y,z,rx,ry,rz,size,tone){
      rotation.set(rx,ry,rz);q.setFromEuler(rotation);matrix.compose(new THREE.Vector3(x,y,z),q,new THREE.Vector3(size*(species==='pine'?.46:1),size*.85,size));
      const offset=vertices.length/3,c=new THREE.Color(colors[species][tone%colors[species].length]);
      for(let i=0;i<leafPoints.length;i++){
        const p=leafPoints[i];v.set(...p).applyMatrix4(matrix);vertices.push(v.x,v.y,v.z);uv.push(p[0]/.54+.5,p[2]/1.05+.5);
        // The raised centre catches light, while a darker base gives every leaf
        // a small painted vein even when the surface map is distant.
        const light=i===8?1.09:i===0?.78:i===4?1.02:.92;color.push(c.r*light,c.g*light,c.b*light);
      }
      for(const i of leafFaces)indices.push(offset+i);leaves++;
    }
    if(species==='oak'){
      const lobes=[[-.8,2.62,.35,.84],[-.86,3.13,-.34,.81],[.8,2.8,.45,.87],[.7,3.43,-.48,.79],[0,3.8,0,.85],[-.23,3.15,.88,.76],[.04,2.98,-.87,.75],[-.48,3.69,-.56,.7],[.26,3.69,.64,.7]];
      for(let l=0;l<lobes.length;l++){
        const [cx,cy,cz,r]=lobes[l],sprigs=far?4:11;
        for(let j=0;j<sprigs;j++){
          const a=j*2.399+l*.83,e=(j+.5)/sprigs,reach=r*Math.sqrt(e),sx=cx+Math.sin(a)*reach,sz=cz+Math.cos(a)*reach,sy=cy+(1-e)*.3-.12*Math.sin(a*2);
          const size=(far?.9:.72)*(1-.22*e);
          leaf(sx,sy,sz,-.35+e*.65,a,.12*Math.sin(a*3),size,j+l);
          leaf(sx-Math.cos(a)*.17,sy-.055,sz+Math.sin(a)*.17,.15,a-.95,-.15,size*.82,j+l+2);
          leaf(sx+Math.cos(a)*.17,sy+.025,sz-Math.sin(a)*.17,-.1,a+.95,.2,size*.82,j+l+1);
        }
      }
    }else{
      const tiers=far?6:9;
      for(let t=0;t<tiers;t++){
        const fraction=t/(tiers-1),y=1.2+fraction*3.05,reach=1.28*(1-fraction*.9),spokes=far?5:8;
        for(let j=0;j<spokes;j++){
          const a=j*Math.PI*2/spokes+t*1.3;
          const fans=far?2:4;
          for(let n=0;n<fans;n++){
            const u=(n+1)/(fans+1),x=Math.sin(a)*reach*u,z=Math.cos(a)*reach*u,py=y+.18-reach*u*.16;
            const s=(.82-fraction*.3)*(far?1.1:1);
            leaf(x,py,z,-.25,a,0,s*(1-u*.25),t+j+n);
            leaf(x+Math.cos(a)*.13,py-.03,z-Math.sin(a)*.13,-.12,a+.82,.12,s*.7,t+j+n+1);
            if(!far)leaf(x-Math.cos(a)*.13,py+.025,z+Math.sin(a)*.13,-.12,a-.82,-.12,s*.7,t+j+n+2);
          }
        }
      }
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(new Float32Array(vertices.length),3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setAttribute('color',new THREE.Float32BufferAttribute(color,3));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingSphere();g.userData.leaves=leaves;return g;
  }
  function treeModel(species='oak',far=false){
    const t=group(scene),trunk=mesh(t,trunkGeo,'#825b35',0,1.45,0);trunk.material=barkMaterial;
    for(let i=0;i<(far?4:7);i++){
      const a=i*Math.PI*2/(far?4:7)+.2,r=.51+(i%2)*.11;
      branch(t,[.025,.3,.03],[Math.sin(a)*r,.025,Math.cos(a)*r],.105);
    }
    if(species==='oak'){
      for(let i=0;i<(far?5:10);i++){
        const a=i*2.399,y=1.65+(i%4)*.36,r=.83+(i%3)*.16,end=[Math.sin(a)*r,2.55+(i%4)*.31,Math.cos(a)*r];
        branch(t,[.055,y,.065],end,.065-i*.002);
        if(!far){for(const side of [-1,1])branch(t,end,[end[0]+Math.cos(a)*side*.3,end[1]+.22,end[2]-Math.sin(a)*side*.3],.025);}
      }
    }else{
      for(let tier=0;tier<(far?5:8);tier++){
        const fraction=tier/(far?4:7),y=1.3+fraction*2.6,r=1.14*(1-fraction*.82),spokes=far?4:6;
        for(let j=0;j<spokes;j++){const a=j*Math.PI*2/spokes+tier*1.2;branch(t,[.03,y+.16,.06],[Math.sin(a)*r,y-.08,Math.cos(a)*r],.032*(1-fraction*.5));}
      }
    }
    const leafGeo=geometry('v5-botanical-'+species+'-'+(far?'far':'near'),()=>canopy(species,far));
    const foliage=mesh(t,leafGeo,'#d7f3b3',0,0,0);foliage.material=leafMaterial;foliage.userData.botanicalLeaves=leafGeo.userData.leaves;
    batch(t);t.userData.foliageVersion=5;t.userData.leafCount=leafGeo.userData.leaves;t.updateWorldMatrix(true,true);t.removeFromParent();return t;
  }
  return {treeModel:species=>treeModel(species,false),distantTree:species=>treeModel(species,true)};
}
