const fs=require('fs');
const b=JSON.parse(fs.readFileSync('landskap-bboxes.json','utf8'));
const LANDSDEL_ORDER=['Götaland','Svealand','Norrland'];
b.sort((x,y)=>{
  const d=LANDSDEL_ORDER.indexOf(x.landsdel)-LANDSDEL_ORDER.indexOf(y.landsdel);
  return d!==0?d:x.namn.localeCompare(y.namn,'sv');
});
function zoomFor(bb,centerLat){
  const spanLat=bb.north-bb.south;
  const spanLon=(bb.east-bb.west)*Math.cos(centerLat*Math.PI/180);
  const span=Math.max(spanLat,spanLon);
  let z=Math.round(Math.log2(140/span));
  return Math.max(5,Math.min(9,z));
}
const lines=[];
const order=[];
const byLandsdel={};
for(const l of b){
  order.push(l.id);
  (byLandsdel[l.landsdel]=byLandsdel[l.landsdel]||[]).push(l.id);
  const z=zoomFor(l.bbox,l.center[0]);
  lines.push(
`        ${l.id}: {
            id: '${l.id}', namn: ${JSON.stringify(l.namn)}, landsdel: ${JSON.stringify(l.landsdel)}, kod: ${l.kod},
            bbox: { west: ${l.bbox.west}, south: ${l.bbox.south}, east: ${l.bbox.east}, north: ${l.bbox.north} },
            center: [${l.center[0]}, ${l.center[1]}], zoom: ${z},
            // TODO: bygg + ladda upp. Se verktyg/build-landskap-pmtiles.md.
            pmtiles: { url: '', bytes: 0, sha256: '' }
        }`);
}
const header=`// ─────────────────────────────────────────────────────────────────────────────
//  LANDSKAP — PMTiles-presets för "Härdat läge per landskap" (offline i bitar).
//
//  Driver landskaps-väljaren (shared/landskap-offline.js) som öppnas från
//  "Ladda ner offline"- och "Härdat läge"-knapparna. Operatören väljer ett
//  eller flera landskap, köar dem och laddar ner var och en som en egen liten
//  PMTiles-fil — istället för hela Sverige (~4,1 GB) i en klump.
//
//  Datakälla: extract från Protomaps daily build via
//  \`pmtiles extract --bbox=west,south,east,north --maxzoom=15\`, samma pipeline
//  som grannländerna (countries.js). Bbox per landskap är beräknad från
//  Lantmäteriets landskapsgeometri (perliedman/svenska-landskap, CC0).
//  Bygg-recept: verktyg/build-landskap-pmtiles.md.
//
//  Status: pmtiles-filerna är INTE byggda + uppladdade än. Väljaren visar alla
//  landskap men bara de med url+bytes ifyllt är nedladdningsbara ("kommer
//  snart" annars). När en fil är klar:
//    1. ladda upp till samma R2-bucket som sverige.pmtiles
//    2. fyll i url + bytes + sha256 i presets nedan
//    3. landskapet blir automatiskt nedladdningsbart
//
//  Designprinciper (samma som countries.js):
//   - INGA API-nycklar i denna fil (klient-JS är publikt).
//   - URL ska peka på R2/host med Range-requests + CORS för 7srapport.com.
//   - bytes måste vara EXAKT rätt efter rebuild (content-length-mismatch
//     invaliderar cachade gamla versioner).
// ─────────────────────────────────────────────────────────────────────────────

(function (global) {
    'use strict';

    var LANDSDELAR = ['Götaland', 'Svealand', 'Norrland'];

    // bbox används av build-pipelinen; center + zoom används för att panna
    // härdat-kartan till landskapet efter aktivering.
    var presets = {
`;
const footer=`
    };

    // Ordning i listan: grupperad per landsdel, alfabetisk inom gruppen.
    var order = ${JSON.stringify(order)};

    var byLandsdel = ${JSON.stringify(byLandsdel)};

    function getPreset(id) { return presets[id] || null; }

    // True om landskapets pmtiles-fil är byggd + uppladdad (url + bytes ifyllt).
    function isReady(id) {
        var p = presets[id];
        return !!(p && p.pmtiles && p.pmtiles.url && p.pmtiles.bytes > 0);
    }

    global.HVLandskap = {
        presets: presets,
        order: order,
        byLandsdel: byLandsdel,
        LANDSDELAR: LANDSDELAR,
        getPreset: getPreset,
        isReady: isReady
    };
})(window);
`;
fs.writeFileSync('landskap.out.js', header+lines.join(',\n')+footer);
console.log('landskap.js generated,',(fs.statSync('landskap.out.js').size/1024).toFixed(1),'KB');
console.log('order:',order.join(', '));
