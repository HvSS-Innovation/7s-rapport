const fs = require('fs');
const fc = JSON.parse(fs.readFileSync('landskap-klippt.geojson','utf8'));

// ── Douglas-Peucker on [lon,lat] (raw degrees; fine for a selector map) ──
function perp(p,a,b){
  const [px,py]=p,[ax,ay]=a,[bx,by]=b;
  const dx=bx-ax, dy=by-ay;
  const len2=dx*dx+dy*dy;
  if(len2===0){const ex=px-ax,ey=py-ay;return Math.sqrt(ex*ex+ey*ey);}
  let t=((px-ax)*dx+(py-ay)*dy)/len2; t=Math.max(0,Math.min(1,t));
  const cx=ax+t*dx, cy=ay+t*dy, ex=px-cx, ey=py-cy;
  return Math.sqrt(ex*ex+ey*ey);
}
function dp(pts,tol){
  if(pts.length<3) return pts;
  let dmax=0,idx=0;
  for(let i=1;i<pts.length-1;i++){const d=perp(pts[i],pts[0],pts[pts.length-1]);if(d>dmax){dmax=d;idx=i;}}
  if(dmax>tol){
    const l=dp(pts.slice(0,idx+1),tol), r=dp(pts.slice(idx),tol);
    return l.slice(0,-1).concat(r);
  }
  return [pts[0],pts[pts.length-1]];
}
const round=(p,d=3)=>[+p[0].toFixed(d),+p[1].toFixed(d)];
function ringBbox(ring){let W=180,S=90,E=-180,N=-90;for(const[x,y]of ring){if(x<W)W=x;if(x>E)E=x;if(y<S)S=y;if(y>N)N=y;}return{W,S,E,N,w:E-W,h:N-S};}

const TOL=0.006;            // simplification tolerance (deg)
const MIN_ISLAND=0.045;     // drop polygons whose bbox w&h both < this (deg)

function simpRing(ring){
  let s=dp(ring,TOL).map(p=>round(p));
  // ensure closed
  if(s.length && (s[0][0]!==s[s.length-1][0]||s[0][1]!==s[s.length-1][1])) s.push(s[0]);
  return s.length>=4?s:null;
}
function simpPolygon(poly){ // poly = [outerRing, ...holes]
  const outer=simpRing(poly[0]); if(!outer) return null;
  return [outer]; // drop holes for a selector (negligible visually, saves bytes)
}

const out={type:'FeatureCollection',features:[]};
const bboxes=[];
const slug=s=>s.toLowerCase().replace(/å|ä/g,'a').replace(/ö/g,'o').replace(/[^a-z]/g,'');

for(const f of fc.features){
  const name=f.properties.landskap, landsdel=f.properties.landsdel, kod=f.properties.landskapskod;
  const g=f.geometry;
  // bbox from FULL precision geometry
  let W=180,S=90,E=-180,N=-90;
  const scan=a=>{ if(typeof a[0]==='number'){if(a[0]<W)W=a[0];if(a[0]>E)E=a[0];if(a[1]<S)S=a[1];if(a[1]>N)N=a[1];return;} a.forEach(scan);};
  scan(g.coordinates);

  // simplify geometry for display
  let polys = g.type==='Polygon' ? [g.coordinates] : g.coordinates;
  // sort by bbox area desc; always keep the largest, drop tiny islands
  polys = polys.map(p=>({p,bb:ringBbox(p[0])})).sort((a,b)=>b.bb.w*b.bb.h-a.bb.w*a.bb.h);
  const kept=[];
  polys.forEach((o,i)=>{ if(i===0 || o.bb.w>=MIN_ISLAND || o.bb.h>=MIN_ISLAND){ const sp=simpPolygon(o.p); if(sp) kept.push(sp);} });

  const geom = kept.length===1 ? {type:'Polygon',coordinates:kept[0]} : {type:'MultiPolygon',coordinates:kept};
  out.features.push({type:'Feature',properties:{id:slug(name),namn:name,landsdel,kod},geometry:geom});
  bboxes.push({id:slug(name),namn:name,landsdel,kod,bbox:{west:+W.toFixed(4),south:+S.toFixed(4),east:+E.toFixed(4),north:+N.toFixed(4)},center:[+((S+N)/2).toFixed(4),+((W+E)/2).toFixed(4)]});
}

const geoStr='window.HVLandskapGeo='+JSON.stringify(out)+';\n';
fs.writeFileSync('landskap-geo.out.js',geoStr);
fs.writeFileSync('landskap-bboxes.json',JSON.stringify(bboxes,null,2));

// stats
let pts=0; for(const f of out.features){const c=a=>{if(typeof a[0]==='number'){pts++;return;}a.forEach(c);};c(f.geometry.coordinates);}
console.log('output points:',pts,'(from 40547)');
console.log('geo.js size:',(geoStr.length/1024).toFixed(1),'KB');
console.log('sample bbox (Skåne):',JSON.stringify(bboxes[0].bbox));
console.log('sample bbox (Lappland):',JSON.stringify(bboxes.find(b=>b.id==='lappland').bbox));
