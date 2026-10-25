export const HOME={x:500,y:240};
export const WORLD={minX:-1800,maxX:2800,minY:-1900,maxY:2500};
export const HORSE_START={x:650,y:440};
export const RESCUE_SITES=[
  [880,650],[80,780],[1150,-180],[-250,-400],[650,1220],[-720,580],[1580,570],[-450,1400],
  [1350,1450],[210,-1000],[1700,-650],[-1050,-850],[-1150,1700],[2050,1850],[2150,-1400]
].map(([x,y],i)=>({id:'camp-'+i,x,y,name:['Les Braises','La Clairière','Les Pins bleus','La Source'][i%4]}));
export const LANDMARKS=[
  {id:'ruins',x:50,y:-300,name:'Les ruines de Valdor',kind:'ruins',gold:55},
  {id:'oak',x:-850,y:100,name:'Le Chêne des serments',kind:'oak',gold:40},
  {id:'watch',x:1550,y:-850,name:'La tour brisée',kind:'ruins',gold:60},
  {id:'spring',x:-1100,y:1250,name:'Le cercle des anciens',kind:'stones',gold:45},
  {id:'cache',x:1180,y:980,name:'La cache des éclaireurs',kind:'chest',gold:35},
  {id:'border',x:2100,y:350,name:'La frontière des Cendres',kind:'stones',gold:50},
  {id:'memory',x:100,y:2000,name:'Le dernier étendard',kind:'ruins',gold:60}
];
const clearings=[HOME,HORSE_START,...RESCUE_SITES,...LANDMARKS];
let seed=881724;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
export const FOREST_TREES=[];
for(let y=WORLD.minY+80;y<WORLD.maxY-50;y+=155)for(let x=WORLD.minX+70;x<WORLD.maxX-50;x+=155){
  const p={x:x+(random()-.5)*95,y:y+(random()-.5)*95,size:.8+random()*.65,species:random()<.57?'pine':'oak',rotation:random()*Math.PI*2};
  if(clearings.some(c=>Math.hypot(c.x-p.x,c.y-p.y)<(c===HOME?470:110)))continue;
  if(Math.abs(p.x-500-Math.sin(p.y/450)*80)<75)continue;
  FOREST_TREES.push(p);
}
const grid=new Map();
for(const t of FOREST_TREES){const key=Math.floor(t.x/160)+','+Math.floor(t.y/160);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(t);}
export function nearbyTrees(x,y){const found=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)found.push(...(grid.get((Math.floor(x/160)+dx)+','+(Math.floor(y/160)+dy))||[]));return found;}
