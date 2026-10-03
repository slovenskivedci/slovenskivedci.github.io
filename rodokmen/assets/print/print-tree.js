/* Rodokmeň slovenskej matematiky: printable ancestor tree poster (vector PDF, A2 or A3).
   Loaded on demand from rodokmen/index.html when "Stiahnuť PDF" is clicked (Strom and Profil).
   One style, an organic tree (see ORGANIC TREE POSTER below); rendered as SVG and converted to PDF
   with jsPDF + svg2pdf.js, EB Garamond embedded. Postdoc advisor links (ctx.pdAdvisorsOf) are included
   unless opts.postdoc===false and drawn in teal; informal mentor links (dotted violet leaves) unless opts.informal===false, research-scientist links unless opts.research===false
   (all follow the shared "Väzby" toggles of the page). opts.lang: 'sk' (default) or 'en' (poster language; names
   and thesis titles are never translated).
   opts.dir==='down' draws the academic descendants instead (students hang below the person, same layout mirrored).
   RodokmenPrint.scene() runs the same graph, layout and drawing for the interactive "Strom" view
   (no PDF: text measured on a canvas with the same EB Garamond, the tree returned as SVG markup).
   RodokmenPrint.downloadView() prints the tree of the "Strom" view as a poster PDF ("Stiahnuť PDF", see VIEW EXPORT).
   Every printed page (both looks, every paper and orientation, every page of a multi-page PDF) carries the Rodokmeň logo
   in its bottom right corner (see LOGO below). */
(function(){
'use strict';
const BASE=((document.currentScript&&document.currentScript.src)||'').replace(/[^/]*$/,'')||'assets/print/';
const FONT='EBGaramond';
const AUTO_MIN_PT=5;   /* paper 'auto' (both looks, one page): smallest A size with names of at least this size, else A0 */
const PAPER={A4:[595.28,841.89],A3:[841.89,1190.55],A2:[1190.55,1683.78],A1:[1683.78,2383.94],A0:[2383.94,3370.39]};
// famous ancestors that may be named in the legend of the main line (MGP ids)
const FAMOUS=new Set([18231,38586,60985,74313,134975,108295,17864,17865,17981,15635,7298,53410,54440,7401,17946,7486,18232,125561,126177,126109]);

/* ---------- loading ---------- */
const loadScript=url=>new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=url; s.async=true; s.onload=res; s.onerror=()=>rej(new Error('Nepodarilo sa načítať '+url)); document.head.appendChild(s); });
function b64(buf){ const u=new Uint8Array(buf); let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); }
let libsP=null;
function loadLibs(){
  if(!libsP){ libsP=(async()=>{
    if(!window.jspdf) await loadScript(BASE+'jspdf.umd.min.js');
    if(!window.svg2pdf) await loadScript(BASE+'svg2pdf.umd.min.js');
    const bufs=await Promise.all(['EBGaramond-Regular.ttf','EBGaramond-SemiBold.ttf','EBGaramond-Italic.ttf'].map(f=>fetch(BASE+f).then(r=>{ if(!r.ok) throw new Error('Font '+f+': '+r.status); return r.arrayBuffer(); })));
    return bufs.map(b64);
  })(); libsP.catch(()=>{ libsP=null; }); }
  return libsP;
}
let faceP=null;   // screen view: the same three EB Garamond files as FontFaces (for the SVG text and for measuring)
function loadFaces(){
  if(!faceP){ faceP=Promise.all([['EBGaramond-Regular.ttf','400','normal'],['EBGaramond-SemiBold.ttf','700','normal'],['EBGaramond-Italic.ttf','400','italic']].map(async([f,w,st])=>{ const ff=new FontFace(FONT,`url(${BASE}${f})`,{weight:w,style:st}); await ff.load(); document.fonts.add(ff); })); faceP.catch(()=>{ faceP=null; }); }
  return faceP;
}
function canvasMeasure(){ const c=document.createElement('canvas').getContext('2d'), cache=new Map(); return (t,size,style)=>{ const k=style+'|'+t; let w=cache.get(k); if(w==null){ c.font=(style==='italic'?'italic 400 ':style==='bold'?'700 ':'400 ')+'100px '+FONT; w=c.measureText(t).width/100; cache.set(k,w); } return w*size; }; }
function newDoc(fonts,paper,land){
  const {jsPDF}=window.jspdf; const [W,H]=PAPER[paper];
  const doc=new jsPDF({unit:'pt',format:[W,H],orientation:land?'landscape':'portrait',compress:true});
  [['EBG-R.ttf','normal'],['EBG-B.ttf','bold'],['EBG-I.ttf','italic']].forEach(([f,st],i)=>{ doc.addFileToVFS(f,fonts[i]); doc.addFont(f,FONT,st); });
  doc.setFont(FONT,'normal');
  return doc;
}

/* ---------- text helpers ---------- */
const clean=s=>String(s??'').replace(/\u02bf/g,'\u2018').replace(/\u02be/g,'\u2019').replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g,m=>/\s/.test(m)?' - ':'-').replace(/\s+/g,' ').trim();
const xesc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const pl=(n,one,few,many)=>n===1?one:(n>=2&&n<=4)?few:many;
const n2=v=>Math.round(v*100)/100;
function makeMeasure(doc){ const cache=new Map(); return (t,size,style)=>{ const k=style+'|'+t; let w=cache.get(k); if(w==null){ doc.setFont(FONT,style||'normal'); doc.setFontSize(100); w=doc.getTextWidth(t)/100; cache.set(k,w); } return w*size; }; }
function wrapText(tw,text,size,style,maxW){ const words=text.split(' '); const lines=[]; let cur=''; for(const w of words){ const t=cur?cur+' '+w:w; if(cur&&tw(t,size,style)>maxW){ lines.push(cur); cur=w; } else cur=t; } if(cur) lines.push(cur); return lines; }

/* ---------- names ---------- */
function baseName(name){ return clean(name).replace(/\s*\([^)]*\)/g,'').replace(/,?\s+(Sr|Jr|st|ml)\.?$/i,'').replace(/,.*$/,'').trim(); }
function surname(name){ const w=baseName(name).split(' '); return w[w.length-1]||name; }
function fileSlug(name){ return surname(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').replace(/[łŁ]/g,'l').replace(/[øØ]/g,'o').toLowerCase().replace(/[^a-z0-9]+/g,'')||'rodokmen'; }
const MOBILE={Peter:'Petra',Pavol:'Pavla',Pavel:'Pavla',Karol:'Karla',Karel:'Karla',Marek:'Marka',Alexander:'Alexandra',Lev:'Leva',Petr:'Petra'};
function genWord(w,female,last){
  if(/^(von|van|de|der|den|di|da|du|le|la|zu|ten|ter|y)$/.test(w)) return w;
  if(/^\p{Lu}\.$/u.test(w)) return w;
  if(female){
    if(/ová$/.test(w)||(/ova$/.test(w)&&last)||(/á$/.test(w)&&last)) return w.slice(0,-1)+'ej';
    if(/ia$/.test(w)) return w.slice(0,-1)+'e';
    if(/[cčšžďťňjľ]a$/.test(w)) return (w.slice(0,-1)+'e').replace(/ňe$/,'ne').replace(/ďe$/,'de').replace(/ťe$/,'te').replace(/ľe$/,'le');
    if(/\p{L}a$/u.test(w)) return w.slice(0,-1)+'y';
    if(!last) return w;  // Ingrid, Miriam, Noémi stay unchanged
    return null;
  }
  if(MOBILE[w]) return MOBILE[w];
  if(/ý$/.test(w)) return w.slice(0,-1)+'ého';
  if(/[sc]ky$/.test(w)) return w.slice(0,-1)+'eho';
  if(/í$/.test(w)) return w+'ho';
  if(/[aeo]y$/.test(w)) return w+'a';
  if(/[iy]$/.test(w)) return w+'ho';
  if(/[^aeiouyáéíóúýäô]o$/.test(w)) return w.slice(0,-1)+'a';
  if(/\p{L}a$/u.test(w)) return w.slice(0,-1)+'u';
  if(/[aeiouyéóúäöüôàèìòùëïőű]$/i.test(w)) return null;
  if(/ec$/.test(w)&&w.length>4&&last) return w.slice(0,-2)+'ca';
  if(/ek$/.test(w)&&w.length>4&&last) return w.slice(0,-2)+'ka';
  if(/[bcčdďfghjklľĺmnňpqrřŕsštťvwxzžßłśćńźż]$/i.test(w)) return w+'a';
  return null;
}
function genitive(name,female){
  let n=clean(name), suf='';
  const sm=n.match(/^(.*\S)\s+(Jr\.?|Sr\.?|ml\.|st\.|junior|senior)$/i);
  if(sm){ n=sm[1]; suf=' '+(/^(jr|ml|junior)/i.test(sm[2])?'ml.':'st.'); }
  if(/[(),]/.test(n)) return null;
  const parts=n.split(' '), out=[];
  for(let i=0;i<parts.length;i++){ const last=i===parts.length-1; const hy=parts[i].split('-');
    const sub=hy.map((x,j)=>{ const g=genWord(x,female,last); return g==null&&female&&j<hy.length-1?x:g; });
    if(sub.some(x=>x==null)) return null; out.push(sub.join('-')); }
  return out.join(' ')+suf;
}

/* ---------- schools: short names, Slovak for CZ/SK schools, native otherwise ---------- */
const SCH={
 'Slovenská univerzita (dnes Univerzita Komenského)':'Slovenská univerzita','University of Prague':'Univerzita v Prahe','Karl-Ferdinand-Universität Prag':'Univerzita v Prahe',
 'Universitas Carolina Prague':'Univerzita Karlova','Deutsche Technische Hochschule in Prague':'Nemecká technika v Prahe','Eötvös Loránd University':'Univerzita v Pešti',
 'Lyceum of Ljubljana':'Lýceum v Ľubľane','Humboldt-Universität zu Berlin':'Universität Berlin','Univerzita Pavla Jozefa Šafárika v Košiciach':'UPJŠ v Košiciach',
 'Univerzita Konštantína Filozofa v Nitre':'UKF v Nitre','VŠB - TU Ostrava':'VŠB-TU Ostrava','University of Economics in Bratislava':'Ekonomická univerzita v Bratislave',
 'Ostravská univerzita v Ostravě':'Ostravská univerzita','Ostravská univerzita v Ostrave':'Ostravská univerzita','Ostravská univerzita, Pedagogická fakulta':'Ostravská univerzita',
 'Mendelova univerzita v Brně':'Mendelova univerzita v Brne','Univerzita Pardubice, Česká republika':'Univerzita Pardubice',
 'Výskumný ústav symbolických výpočtov, Keplerova univerzita, Linz, Rakúsko':'RISC Linz','Research Institute for Symbolic Computation (RISC), Linz':'RISC Linz',
 'Trnavská univerzita (1635 - 1777)':'Trnavská univerzita','Vojenská akadémia, Liptovský Mikuláš':'Vojenská akadémia v L. Mikuláši',
 'Königliche Akademie der Wissenschaften zu Berlin':'Akademie der Wissenschaften Berlin','Athenaeum Illustre Amsterdam':'Athenaeum Amsterdam',
 'Europa-Universität Viadrina Frankfurt an der Oder':'Viadrina Frankfurt (Oder)','Rheinisch-Westfälische Technische Hochschule Aachen':'RWTH Aachen',
 'Karlsruher Institut für Technologie (KIT)':'KIT Karlsruhe','Technische Universität Carolo-Wilhelmina zu Braunschweig':'TU Braunschweig',
 'Johann Wolfgang Goethe-Universität Frankfurt am Main':'Universität Frankfurt','Massachusetts Institute of Technology':'MIT',
 'Massachusetts Institute of Technology/Woods Hole Oceanographic Institution':'MIT','King Abdullah University of Science and Technology':'KAUST',
 'Mohamed Bin Zayed University of Artificial Intelligence (MBZUAI)':'MBZUAI','Mohamed bin Zayed University of Artificial Intelligence':'MBZUAI',
 'Scuola Internazionale Superiore di Studi Avanzati (SISSA)':'SISSA','École Polytechnique Fédérale de Lausanne (EPFL)':'EPFL',
 'Universidad Nacional Autónoma de México (UNAM)':'UNAM','l\'Institut National de Recherche en Informatique et en Automatique (INRIA)':'INRIA',
 'California Institute of Technology':'Caltech','Handelsakademie Hamburg':'Handelsakademie Hamburg'
};
const SCH_EN={
 'Slovenská univerzita (dnes Univerzita Komenského)':'Slovak University','University of Prague':'University of Prague','Karl-Ferdinand-Universität Prag':'University of Prague',
 'Universitas Carolina Prague':'Charles University','Deutsche Technische Hochschule in Prague':'German Technical University in Prague','Eötvös Loránd University':'University of Pest',
 'Lyceum of Ljubljana':'Lyceum of Ljubljana','Univerzita Pavla Jozefa Šafárika v Košiciach':'P. J. Šafárik University, Košice','Univerzita Konštantína Filozofa v Nitre':'Constantine the Philosopher University, Nitra',
 'Univerzita Mateja Bela':'Matej Bel University','University of Economics in Bratislava':'University of Economics in Bratislava',
 'Ostravská univerzita v Ostravě':'University of Ostrava','Ostravská univerzita v Ostrave':'University of Ostrava','Ostravská univerzita, Pedagogická fakulta':'University of Ostrava',
 'Mendelova univerzita v Brně':'Mendel University in Brno','Univerzita Pardubice, Česká republika':'University of Pardubice','Trnavská univerzita (1635 - 1777)':'University of Trnava',
 'Vojenská akadémia, Liptovský Mikuláš':'Military Academy, Liptovský Mikuláš','Military Academy, Liptovský Mikuláš':'Military Academy, Liptovský Mikuláš',
 'Výskumný ústav symbolických výpočtov, Keplerova univerzita, Linz, Rakúsko':'RISC Linz','Lomonosov Moscow State University':'Moscow State University',
 'Institute of Mathematics, Slovak Academy of Sciences':'Mathematical Institute SAS','Institute of Measurement Theory, Slovak Academy of Sciences':'Institute of Measurement SAS',
 'Institute of Measurement, Slovak Academy of Sciences':'Institute of Measurement SAS','Matej Bel University, Banska Bystrica':'Matej Bel University','The Ohio State University':'Ohio State University'
};
function schoolShort(raw,lang){
  let s=clean(raw); if(!s) return '';
  if(lang==='en'){ const parts=s.split(/ a (?=\p{Lu})| and (?=\p{Lu})/u); if(SCH_EN[s]) return SCH_EN[s]; if(SCH_EN[parts[0]]) return SCH_EN[parts[0]]; }
  if(SCH[s]) return SCH[s];
  s=s.split(/ a (?=\p{Lu})| and (?=\p{Lu})/u)[0];
  if(SCH[s]) return SCH[s];
  s=s.replace(/,\s*(Faculty|Fakulty|Faculté|Fakulta).*$/i,'').replace(/\s*\([^)]*\)/g,'').trim();
  if(SCH[s]) return SCH[s];
  let m;
  if((m=s.match(/^Technische Universität (.+)$/))) return s.length>26?'TU '+m[1]:s;
  if((m=s.match(/(?:^|[\s-])Universität\s+(?:zu\s+)?(?!des\b)(\p{L}+)/u))&&!/^Freie /.test(s)) return 'Universität '+m[1];
  if((m=s.match(/^Università [Dd]egli Studi di (.+)$/))) return 'Università di '+m[1];
  if((m=s.match(/^University of California, (.+)$/))) return 'UC '+m[1];
  s=s.replace(/^The /,'');
  return s;
}

/* =====================================================================
   ORGANIC TREE POSTER (default style "strom")
   The person sits in a pill at the base of a trunk and the advisors branch out upward like boughs.
   Graph: every person appears once (breadth-first spanning tree: shortest line first, PhD advisors before
   postdoc advisors); any further advisor link to a person already drawn is a thin dashed curve.
   Layout: the trunk follows the dominant line while one advisor's subtree clearly outweighs the rest;
   smaller side boughs leave the trunk towards the lighter side; above the crown base the subtree is packed
   as a tidy tree on generation rows (contours per row; crowded rows are staggered in two tiers), with the
   children of every person ordered for left/right balance and to keep people joined by extra links close.
   Row gaps grow with how far the branches travel sideways; a final spacing pass resolves any label overlap.
   Highlight: one root-to-leaf branch through the ancestor with the most academic descendants
   (ctx.nDesc: MGP count or the local count, whichever is larger); fallback: the longest line.
   ===================================================================== */
const TP={RUST:'#b4532a',VIOLET:'#6e4fb3',INK:'#3b3026',INK2:'#7a6c5b',INK3:'#9d907c',TEAL:'#3d8c84',OCHRE:'#c08f2a',CREAM:'#fbf8ef',PAGE:'#fcfaf3',DASH:'#8a7a62',EDGE:'#bfb193',
  SK:'#2f5d8a',SKF:'#eef3f8',SKE:'#8fb0cf',FOL:'#f0f2e2',FRAME:'#d8ccb4',FRAME2:'#e6dcc8',GROUND:'#cfc2a6'};
const T_BROWN=[110,86,62],T_OLIVE=[122,124,78];
const hex2=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgbHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixc=(a,b,t)=>rgbHex(a.map((v,i)=>v+(b[i]-v)*t));
const over=(h,op)=>mixc(hex2(TP.PAGE),hex2(h),op);   // opaque colour = h at opacity op over the page (no PDF transparency needed)
const LEAFG=['#8f9d62','#a3ad74','#7f8f57','#b2b98a'];
const UNV_TREE=/^[iu]/;   // drawn as unconfirmed on the poster: link only derived from a list of students, or without any source
const nfmt=(n,lang)=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,lang==='en'?',':'\u00a0');
/* ---------- poster language: every printed string except names, thesis titles and data-given degree abbreviations ---------- */
/* displayed degree names, same mapping as the site (index.html DEG); the stored default 'Ph.D.' reads 'PhD.' in Slovak and 'PhD' in English (as in the English legend) */
const DEG_DISP={sk:{'Ph.D.':'PhD.','no degree':'bez titulu','unknown':'neznámy titul','Honorary':'čestný doktorát','Ordained':'vysvätenie','Polymath':'polyhistor'},en:{'Ph.D.':'PhD','PhD.':'PhD'}};
const degDisp=(d,lang)=>{ const c=clean(d); const m=DEG_DISP[lang]||DEG_DISP.sk; return m[c]||c; };
const MONTHS_EN=['January','February','March','April','May','June','July','August','September','October','November','December'];
const L10N={
 sk:{
  noDeg:'údaje o titule neuvedené', tagRod:'RODÁK ZO SLOVENSKA', tagSkF:'SLOVENSKÁ MATEMATIČKA', tagSk:'SLOVENSKÝ MATEMATIK', more:n=>'ďalší predkovia: '+n,
  title:(name,gen)=>gen?'Akademický rodokmeň '+gen:'Akademický rodokmeň: '+name,
  sub:'Rodokmeň slovenskej matematiky · zdroj: slovenskivedci.sk/rodokmen (čerpá z viacerých zdrojov, najmä z Mathematics Genealogy Project)',
  f0:name=>`${name}: v databáze zatiaľ nie sú známi školitelia.`,
  f1one:(name,cut)=>`Zobrazené sú 2 osoby: ${name} a ${cut?'jeho alebo jej školiteľ':'jediný známy predok'}.`,
  f1:(n,name,kk,cut,G,pd)=>`Zobrazen${n>=5?'ých':'é sú'} ${n} ${pl(n,'osoba','osoby','osôb')}: ${name} a ${kk>=5?'všetkých':'všetci'} ${kk} ${pl(kk,'predok','predkovia','predkov')}`+
    (cut?`, ku ktorým vedie aspoň jedna línia dlhá najviac ${G} ${pl(G,'generácia','generácie','generácií')}.`:'.')+' Každá osoba je nakreslená raz; čím vyššie, tým staršia generácia.'+(pd?' Zahrnutí sú aj predkovia cez postdoktorandských školiteľov (zelená vetva).':''),
  f2cut:(tot,dg,oldest,om)=>`Úplný rodokmeň má ${tot} ${pl(tot,'predka','predkov','predkov')} (najdlhšia línia siaha ${dg} ${pl(dg,'generáciu','generácie','generácií')} do minulosti, k osobe ${oldest}); ${om} ${pl(om,'starší predok tu nie je zobrazený','starší predkovia tu nie sú zobrazení','starších predkov tu nie je zobrazených')}. `,
  f2all:'Zobrazený je celý známy rodokmeň. ',
  date:(y,m,d)=>`${d}. ${m}. ${y}`, f3:ds=>ds?`Stav údajov k ${ds}.`:'',
  credit:'Rodokmeň slovenských matematikov · autor a tvorca: Peter Richtárik · www.slovenskivedci.sk/rodokmen',
  hl:chain=>'Zvýraznená vetva: '+chain, hlWhy:(who,d)=>`vedie k predkovi s najviac akademickými potomkami: ${who} (${d})`, hlLong:'najdlhšia línia (údaje o potomkoch chýbajú)',
  lBranch:'Vetva: školiteľ (vyššie) a doktorand', lPd:'Postdoktorandský školiteľ a postdoktorand', lPd2:'', lRs:'Výskumný vedec v skupine', lRs2:'(research scientist; nezapočítava sa do počtu osôb)', lIm:'Neformálny mentor', lIm2:'(výrazný vplyv na výskum pred doktorátom u iného školiteľa; nezapočítava sa do počtu osôb)',
  lDash:'Ďalší školiteľ už nakreslenej osoby', lDash2:'(druhá cesta k tej istej osobe)',
  lUnv:'Neoverený vzťah', lUnv2:'(odvodený zo zoznamu žiakov alebo bez zdroja)', lCo:'Jeden z viacerých školiteľov', lCo2:'(doktorand mal aj ďalšieho školiteľa)', lSk:'Slovenský matematik alebo rodák zo Slovenska',
  lMore:'ďalší predkovia: n', lMore2:'= počet starších predkov mimo výrezu', legend:'LEGENDA', pdTag:'postdoktorand',
  subject:'Rodokmeň slovenskej matematiky', file:'rodokmen',
  // descendants poster (opts.dir==='down')
  dTitle:(name,gen)=>gen?'Akademickí potomkovia '+gen:'Akademickí potomkovia: '+name, dMore:n=>'ďalší potomkovia: '+n,
  dF0:name=>`${name}: v databáze zatiaľ nie sú známi doktorandi.`,
  dF1:(n,name,kk,cut,G,pd)=>`Zobrazen${n>=5?'ých':'é sú'} ${n} ${pl(n,'osoba','osoby','osôb')}: ${name} a ${kk} ${pl(kk,'akademický potomok','akademickí potomkovia','akademických potomkov')}${cut?` do ${G}. generácie`:''}.`+' Každá osoba je nakreslená raz; čím nižšie, tým mladšia generácia.'+(pd?' Zahrnutí sú aj postdoktorandi (zelená vetva).':''),
  dF2cut:(tot,om)=>`Rodokmeň eviduje ${tot} ${pl(tot,'akademického potomka','akademických potomkov','akademických potomkov')} tejto osoby; ${om} ${pl(om,'ďalší tu nie je zobrazený','ďalší tu nie sú zobrazení','ďalších tu nie je zobrazených')}. `,
  dF2all:'Zobrazení sú všetci akademickí potomkovia evidovaní v Rodokmeni. ',
  dHlWhy:(who,d)=>`vedie cez potomka s najviac akademickými potomkami: ${who} (${d})`,
  dLMore:'ďalší potomkovia: n', dLMore2:'= počet ďalších potomkov mimo výrezu', dFile:'potomkovia'
 },
 en:{
  noDeg:'degree details not recorded', tagRod:'BORN IN SLOVAKIA', tagSkF:'SLOVAK MATHEMATICIAN', tagSk:'SLOVAK MATHEMATICIAN', more:n=>'more ancestors: '+n,
  title:name=>'Academic family tree of '+name,
  sub:'Slovak Mathematics Genealogy · source: slovenskivedci.sk/rodokmen (drawing on several sources, mainly the Mathematics Genealogy Project)',
  f0:name=>`${name}: no advisors are known in the database yet.`,
  f1one:(name,cut)=>`2 people: ${name} and ${cut?'his or her advisor':'the only known academic ancestor'}.`,
  f1:(n,name,kk,cut,G,pd)=>`${n} people: ${name} and all ${kk} known academic ancestors`+(cut?` within ${G} ${G===1?'generation':'generations'}.`:'.')+
    ' Each person appears once; the higher a person sits, the further back the generation.'+(pd?' Ancestors through postdoc advisors are included (teal branches).':''),
  f2cut:(tot,dg,oldest,om)=>`The full tree has ${tot} ${tot===1?'ancestor':'ancestors'} (the longest line goes back ${dg} ${dg===1?'generation':'generations'}, to ${oldest}); ${om} older ${om===1?'ancestor is':'ancestors are'} not shown here. `,
  f2all:'The whole known tree is shown. ',
  date:(y,m,d)=>`${d} ${MONTHS_EN[m-1]} ${y}`, f3:ds=>ds?`Data as of ${ds}.`:'',
  credit:'Slovak Mathematical Genealogy · created by Peter Richtárik · www.slovenskivedci.sk/rodokmen',
  hl:chain=>'Highlighted branch: '+chain, hlWhy:(who,d)=>`leads to the ancestor with the most academic descendants: ${who} (${d})`, hlLong:'the longest line (descendant counts missing)',
  lBranch:'Branch: PhD advisor (above) of a student', lPd:'Postdoc link', lPd2:'(postdoc advisor above)', lRs:'Research scientist in the group', lRs2:'(not included in the head count)', lIm:'Informal mentor', lIm2:'(strong research influence before a PhD with another advisor; not included in the head count)',
  lDash:'Also an advisor', lDash2:'(second path to a person)',
  lUnv:'Unconfirmed link', lUnv2:'(derived from a list of students, or without a source)', lCo:'One of several advisors', lCo2:'(the student also had another advisor)', lSk:'Slovak mathematician or born in Slovakia',
  lMore:'more ancestors: n', lMore2:'= older ancestors not shown here', legend:'LEGEND', pdTag:'postdoc',
  subject:'Slovak Mathematics Genealogy', file:'family_tree',
  dTitle:name=>'Academic descendants of '+name, dMore:n=>'more descendants: '+n,
  dF0:name=>`${name}: no doctoral students are known in the database yet.`,
  dF1:(n,name,kk,cut,G,pd)=>`${n} people: ${name} and ${kk} academic ${kk===1?'descendant':'descendants'}${cut?` up to generation ${G}`:''}.`+' Each person appears once; the lower a person sits, the younger the generation.'+(pd?' Postdocs are included (teal branches).':''),
  dF2cut:(tot,om)=>`The database records ${tot} academic ${tot===1?'descendant':'descendants'} of this person; ${om} ${om===1?'is':'are'} not shown here. `,
  dF2all:'All academic descendants recorded in the database are shown. ',
  dHlWhy:(who,d)=>`leads through the descendant with the most academic descendants: ${who} (${d})`,
  dLMore:'more descendants: n', dLMore2:'= further descendants not shown here', dFile:'descendants'
 }
};
const LANGS=Object.keys(L10N);
/* credit on every poster (TX.credit): small and grey at the foot of the page; 8.5 pt on A3, scaled with the paper (12 pt on A2, 24 pt on A0) */
const CREDIT_COL='#857b6f', creditSize=(W,H)=>8.5*Math.min(W,H)/841.89, CREDIT_URL='https://www.slovenskivedci.sk/rodokmen/';
/* ---------- LOGO: the Rodokmeň logo on every printed page ----------
   M2k, the linden tree with the Krišáň ridge: the hand-drawn mark of the site header (index.html, data-logo="M2k") and of
   favicon.svg, as vector paths (crisp at any size) in the dark blue of favicon.svg with its three accent dots. A lockup in
   the bottom right corner of the page: the mark, the wordmark (TX.subject: Rodokmeň slovenskej matematiky / Slovak
   Mathematics Genealogy) and the address; it links to the site. Its size follows the sheet slowly, not in proportion:
   the mark is 7.5 mm high (about 15 mm wide) on A4, 9.2 mm on A2 and 11.2 mm on A0. The layouts keep the corner free
   (on the poster the footer lines rise when one would reach it, the simple look has a footer band as high as the mark),
   so the logo never covers the tree, the legend or the texts. */
const LOGO_INK='#163179', LOGO_DOT='#1F4FD6', LOGO_W=45.78, LOGO_H=22.53, LOGO_ADDR='slovenskivedci.sk/rodokmen';
const LOGO_D=[
'M2.56 11.98L2.54 11.82L2.48 11.61L2.40 11.38L2.32 11.12L2.26 10.87L2.23 10.63L2.21 10.44L2.22 10.27L2.25 10.08L2.29 9.88L2.34 9.67L2.39 9.44L2.44 9.19L2.47 8.94L2.49 8.68L2.50 8.44L2.51 8.20L2.52 7.98L2.55 7.77L2.59 7.58L2.65 7.41L2.74 7.25L2.86 7.08L3.00 6.90L3.16 6.72L3.34 6.54L3.52 6.35L3.70 6.16L3.87 5.95L4.02 5.74L4.16 5.53L4.29 5.34L4.43 5.16L4.56 5.00L4.71 4.86L4.88 4.75L5.08 4.65L5.32 4.57L5.57 4.49L5.83 4.42L6.11 4.34L6.38 4.23L6.64 4.10L6.88 3.95L7.10 3.80L7.32 3.65L7.53 3.53L7.73 3.43L7.94 3.36L8.18 3.34L8.47 3.33L8.77 3.31L9.08 3.29L9.36 3.26L9.61 3.23L9.79 3.17L9.81 2.94L9.64 2.87L9.41 2.80L9.12 2.73L8.80 2.67L8.47 2.62L8.13 2.62L7.80 2.66L7.50 2.74L7.22 2.85L6.97 2.98L6.72 3.12L6.49 3.26L6.27 3.39L6.05 3.50L5.82 3.60L5.57 3.69L5.31 3.78L5.05 3.88L4.78 3.99L4.53 4.13L4.28 4.29L4.06 4.48L3.86 4.68L3.69 4.89L3.52 5.09L3.36 5.29L3.22 5.48L3.07 5.65L2.92 5.82L2.76 6.00L2.60 6.20L2.43 6.41L2.27 6.63L2.13 6.87L2.00 7.12L1.91 7.38L1.84 7.64L1.79 7.89L1.76 8.14L1.73 8.38L1.71 8.60L1.68 8.82L1.65 9.03L1.61 9.26L1.56 9.49L1.52 9.74L1.49 10.00L1.47 10.26L1.49 10.54L1.54 10.82L1.66 11.10L1.80 11.36L1.95 11.60L2.10 11.81L2.24 11.97L2.36 12.08Z',
'M9.81 3.23L9.99 3.28L10.24 3.29L10.52 3.30L10.83 3.30L11.13 3.32L11.42 3.33L11.66 3.36L11.86 3.43L12.07 3.53L12.28 3.65L12.51 3.78L12.74 3.92L12.99 4.06L13.24 4.18L13.51 4.29L13.78 4.39L14.04 4.48L14.28 4.58L14.50 4.68L14.70 4.78L14.87 4.89L15.02 5.02L15.16 5.17L15.30 5.34L15.43 5.54L15.57 5.74L15.71 5.96L15.87 6.18L16.05 6.38L16.23 6.57L16.41 6.75L16.59 6.92L16.75 7.08L16.88 7.23L16.98 7.40L17.05 7.57L17.10 7.76L17.11 7.97L17.12 8.20L17.11 8.44L17.11 8.68L17.13 8.94L17.17 9.19L17.22 9.43L17.29 9.66L17.34 9.88L17.39 10.08L17.41 10.27L17.40 10.44L17.36 10.63L17.31 10.86L17.23 11.10L17.15 11.35L17.07 11.59L17.02 11.80L17.01 11.97L17.21 12.06L17.32 11.95L17.45 11.78L17.60 11.57L17.75 11.34L17.91 11.09L18.05 10.82L18.12 10.54L18.15 10.26L18.14 9.99L18.11 9.74L18.06 9.49L18.01 9.25L17.96 9.03L17.92 8.82L17.90 8.60L17.89 8.38L17.87 8.14L17.85 7.89L17.81 7.63L17.74 7.36L17.63 7.10L17.49 6.85L17.33 6.63L17.15 6.42L16.97 6.23L16.80 6.04L16.64 5.85L16.50 5.67L16.36 5.49L16.23 5.30L16.08 5.10L15.91 4.89L15.73 4.69L15.53 4.50L15.30 4.32L15.06 4.16L14.80 4.02L14.55 3.89L14.29 3.77L14.04 3.66L13.80 3.55L13.58 3.45L13.36 3.34L13.13 3.23L12.89 3.10L12.64 2.98L12.37 2.86L12.10 2.75L11.80 2.66L11.47 2.61L11.13 2.61L10.80 2.66L10.48 2.74L10.20 2.83L9.96 2.92L9.79 3.00Z',
'M2.38 12.07L2.53 12.54L2.80 13.18L3.15 13.93L3.52 14.74L3.92 15.50L4.35 16.15L4.79 16.63L5.30 16.90L5.84 16.97L6.37 16.89L6.85 16.72L7.28 16.54L7.62 16.39L7.87 16.28L7.83 16.13L7.55 16.13L7.17 16.21L6.74 16.32L6.29 16.42L5.85 16.47L5.45 16.41L5.12 16.21L4.79 15.81L4.40 15.22L3.97 14.50L3.60 13.71L3.21 12.99L2.82 12.40L2.52 12.00Z',
'M17.09 12.01L16.80 12.41L16.41 13.00L16.02 13.72L15.64 14.50L15.21 15.22L14.80 15.80L14.46 16.18L14.14 16.35L13.75 16.40L13.32 16.38L12.86 16.33L12.42 16.25L12.04 16.18L11.76 16.17L11.73 16.32L11.97 16.42L12.32 16.56L12.75 16.71L13.24 16.87L13.76 16.95L14.30 16.89L14.80 16.62L15.22 16.13L15.64 15.48L16.10 14.75L16.52 13.97L16.82 13.19L17.06 12.54L17.22 12.07Z',
'M8.58 21.87L8.72 21.56L8.85 21.14L8.95 20.63L9.00 20.05L9.07 19.44L9.16 18.83L9.21 18.24L9.23 17.65L9.27 17.02L9.30 16.37L9.30 15.72L9.27 15.07L9.22 14.45L9.12 13.86L8.93 13.31L8.63 12.79L8.31 12.32L7.99 11.88L7.68 11.52L7.40 11.23L7.17 11.04L6.99 11.16L7.07 11.47L7.23 11.85L7.44 12.27L7.71 12.70L7.98 13.14L8.20 13.60L8.34 14.06L8.43 14.56L8.52 15.12L8.58 15.73L8.57 16.36L8.49 16.99L8.43 17.61L8.42 18.20L8.41 18.77L8.36 19.37L8.28 19.96L8.21 20.53L8.24 21.06L8.29 21.50L8.35 21.84Z',
'M11.31 21.83L11.38 21.49L11.39 21.04L11.37 20.52L11.28 19.95L11.23 19.35L11.19 18.76L11.15 18.20L11.12 17.65L11.09 17.06L11.09 16.48L11.10 15.89L11.14 15.34L11.24 14.82L11.38 14.37L11.56 13.93L11.79 13.47L12.07 12.99L12.39 12.55L12.66 12.13L12.89 11.76L13.00 11.44L12.82 11.30L12.56 11.49L12.22 11.76L11.84 12.11L11.49 12.57L11.17 13.07L10.86 13.59L10.61 14.12L10.46 14.67L10.39 15.26L10.38 15.87L10.36 16.48L10.33 17.08L10.32 17.67L10.35 18.24L10.43 18.81L10.51 19.42L10.57 20.03L10.64 20.61L10.79 21.12L10.94 21.55L11.08 21.86Z',
'M8.41 21.79L8.18 21.75L7.97 21.78L7.77 21.85L7.57 21.91L7.37 21.97L7.19 22.07L7.04 22.26L7.08 22.38L7.32 22.42L7.53 22.39L7.72 22.32L7.92 22.25L8.12 22.19L8.30 22.08L8.45 21.90Z',
'M11.15 21.90L11.32 22.11L11.52 22.24L11.75 22.33L11.97 22.41L12.20 22.49L12.44 22.53L12.71 22.50L12.75 22.38L12.57 22.18L12.37 22.05L12.14 21.97L11.92 21.88L11.70 21.79L11.46 21.75L11.19 21.77Z',
'M7.92 11.73L7.73 11.31L7.48 10.96L7.20 10.61L6.93 10.26L6.67 9.91L6.35 9.61L5.94 9.37L5.82 9.48L5.99 9.90L6.24 10.27L6.52 10.60L6.80 10.94L7.08 11.28L7.40 11.59L7.80 11.82Z',
'M12.01 12.10L12.43 11.77L12.77 11.38L13.03 10.95L13.28 10.50L13.53 10.06L13.76 9.60L13.92 9.11L13.79 9.03L13.40 9.38L13.08 9.77L12.80 10.20L12.54 10.63L12.28 11.07L12.05 11.53L11.89 12.02Z',
'M9.84 12.60L10.01 11.73L10.09 10.86L10.09 9.98L10.14 9.11L10.19 8.24L10.15 7.36L10.04 6.48L9.89 6.48L9.73 7.35L9.70 8.23L9.67 9.10L9.60 9.97L9.57 10.85L9.61 11.72L9.71 12.60Z',
'M19.27 11.41L19.39 11.36L19.57 11.28L19.77 11.20L19.99 11.11L20.22 11.00L20.42 10.88L20.60 10.75L20.74 10.58L20.84 10.41L20.91 10.22L20.97 10.04L21.03 9.88L21.09 9.73L21.15 9.61L21.24 9.50L21.33 9.41L21.43 9.32L21.53 9.23L21.64 9.14L21.76 9.05L21.87 8.95L21.97 8.86L22.07 8.77L22.18 8.68L22.29 8.59L22.40 8.48L22.51 8.36L22.61 8.21L22.70 8.04L22.77 7.86L22.82 7.68L22.87 7.52L22.93 7.37L22.99 7.24L23.07 7.14L23.18 7.06L23.32 6.99L23.49 6.92L23.68 6.84L23.88 6.76L24.09 6.65L24.27 6.52L24.43 6.38L24.57 6.22L24.70 6.07L24.82 5.91L24.94 5.75L25.05 5.60L25.17 5.46L25.28 5.31L25.38 5.17L25.49 5.02L25.58 4.87L25.67 4.71L25.75 4.55L25.83 4.39L25.90 4.23L25.98 4.06L26.07 3.87L26.15 3.67L26.22 3.46L26.26 3.23L26.27 2.99L26.22 2.74L26.13 2.51L26.03 2.28L25.91 2.07L25.80 1.87L25.71 1.69L25.63 1.53L25.57 1.36L25.50 1.18L25.43 1.01L25.38 0.85L25.36 0.73L25.36 0.66L25.36 0.64L25.39 0.62L25.48 0.58L25.62 0.55L25.78 0.54L25.96 0.55L26.13 0.56L26.27 0.59L26.38 0.64L26.50 0.71L26.63 0.80L26.77 0.91L26.92 1.04L27.08 1.17L27.24 1.29L27.41 1.41L27.57 1.53L27.74 1.65L27.91 1.78L28.08 1.90L28.26 2.01L28.43 2.12L28.61 2.21L28.79 2.30L28.96 2.39L29.13 2.47L29.29 2.56L29.45 2.65L29.61 2.74L29.76 2.85L29.90 2.96L30.05 3.08L30.20 3.20L30.36 3.33L30.54 3.45L30.73 3.56L30.93 3.66L31.13 3.75L31.35 3.84L31.56 3.92L31.78 4.00L32.00 4.08L32.21 4.17L32.44 4.25L32.66 4.32L32.88 4.39L33.09 4.45L33.28 4.52L33.44 4.59L33.59 4.67L33.72 4.78L33.86 4.91L34.00 5.07L34.14 5.26L34.29 5.45L34.46 5.64L34.64 5.81L34.82 5.96L35.00 6.10L35.19 6.23L35.37 6.34L35.56 6.45L35.76 6.55L35.95 6.64L36.14 6.72L36.33 6.80L36.52 6.87L36.71 6.94L36.91 7.00L37.11 7.05L37.33 7.10L37.57 7.14L37.81 7.16L38.06 7.17L38.30 7.17L38.54 7.17L38.77 7.18L38.98 7.21L39.18 7.24L39.39 7.29L39.59 7.35L39.78 7.42L39.96 7.49L40.14 7.57L40.31 7.64L40.48 7.72L40.63 7.80L40.79 7.88L40.95 7.96L41.10 8.05L41.26 8.14L41.42 8.24L41.58 8.34L41.74 8.45L41.89 8.56L42.03 8.68L42.17 8.80L42.31 8.93L42.45 9.06L42.58 9.19L42.70 9.32L42.83 9.45L42.96 9.59L43.10 9.73L43.24 9.87L43.39 10.01L43.55 10.15L43.72 10.30L43.89 10.44L44.06 10.59L44.23 10.74L44.40 10.88L44.56 11.00L44.74 11.12L44.93 11.23L45.12 11.32L45.30 11.41L45.46 11.48L45.60 11.54L45.70 11.58L45.78 11.44L45.68 11.38L45.55 11.31L45.39 11.22L45.22 11.13L45.04 11.03L44.87 10.91L44.71 10.79L44.56 10.66L44.41 10.52L44.26 10.36L44.10 10.20L43.95 10.04L43.80 9.89L43.65 9.74L43.52 9.61L43.39 9.47L43.26 9.33L43.13 9.19L43.00 9.05L42.87 8.91L42.73 8.77L42.58 8.63L42.44 8.50L42.30 8.37L42.15 8.23L42.00 8.11L41.85 7.98L41.70 7.87L41.54 7.76L41.39 7.65L41.23 7.54L41.07 7.44L40.90 7.33L40.72 7.24L40.53 7.14L40.34 7.06L40.14 6.98L39.94 6.90L39.73 6.83L39.51 6.77L39.29 6.72L39.06 6.67L38.82 6.64L38.57 6.63L38.32 6.61L38.08 6.60L37.85 6.58L37.63 6.55L37.43 6.51L37.25 6.46L37.06 6.41L36.89 6.36L36.72 6.30L36.55 6.25L36.37 6.19L36.20 6.13L36.01 6.06L35.84 5.97L35.66 5.88L35.49 5.78L35.32 5.66L35.16 5.53L35.02 5.40L34.88 5.25L34.76 5.08L34.62 4.90L34.48 4.70L34.32 4.51L34.13 4.33L33.92 4.17L33.69 4.05L33.46 3.97L33.23 3.90L33.00 3.85L32.79 3.79L32.58 3.73L32.39 3.66L32.20 3.57L31.99 3.48L31.79 3.39L31.59 3.31L31.39 3.21L31.20 3.12L31.03 3.03L30.86 2.93L30.71 2.83L30.56 2.72L30.41 2.61L30.25 2.49L30.08 2.38L29.91 2.27L29.74 2.18L29.57 2.09L29.39 2.00L29.23 1.92L29.06 1.83L28.90 1.74L28.73 1.64L28.57 1.53L28.41 1.41L28.24 1.28L28.08 1.15L27.91 1.03L27.75 0.91L27.59 0.80L27.44 0.69L27.29 0.58L27.13 0.46L26.96 0.34L26.79 0.23L26.60 0.14L26.40 0.07L26.19 0.03L25.97 0.00L25.75 0.00L25.52 0.01L25.30 0.05L25.09 0.13L24.90 0.29L24.79 0.53L24.77 0.75L24.79 0.97L24.85 1.17L24.92 1.37L24.99 1.56L25.07 1.75L25.17 1.95L25.29 2.16L25.42 2.36L25.54 2.55L25.64 2.74L25.70 2.90L25.73 3.03L25.72 3.16L25.69 3.30L25.64 3.46L25.56 3.62L25.47 3.78L25.38 3.96L25.29 4.13L25.21 4.28L25.13 4.43L25.05 4.57L24.96 4.71L24.87 4.85L24.77 4.99L24.67 5.13L24.57 5.28L24.47 5.44L24.37 5.59L24.28 5.74L24.17 5.88L24.07 6.01L23.96 6.12L23.83 6.22L23.67 6.30L23.49 6.37L23.29 6.44L23.09 6.53L22.89 6.64L22.70 6.78L22.56 6.97L22.47 7.16L22.40 7.36L22.36 7.54L22.32 7.71L22.29 7.86L22.24 7.98L22.18 8.09L22.10 8.20L22.01 8.30L21.92 8.39L21.82 8.49L21.71 8.58L21.61 8.68L21.51 8.78L21.40 8.87L21.29 8.96L21.18 9.05L21.07 9.16L20.96 9.28L20.85 9.42L20.77 9.58L20.70 9.76L20.65 9.94L20.60 10.11L20.55 10.27L20.48 10.42L20.39 10.55L20.26 10.67L20.08 10.79L19.88 10.90L19.67 11.01L19.48 11.11L19.32 11.20L19.20 11.27Z',
'M26.49 1.32L26.53 1.43L26.60 1.58L26.68 1.75L26.77 1.93L26.87 2.12L26.97 2.30L27.06 2.47L27.14 2.64L27.22 2.80L27.30 2.97L27.38 3.13L27.45 3.30L27.53 3.46L27.61 3.63L27.70 3.80L27.79 3.96L27.89 4.12L27.99 4.27L28.09 4.42L28.17 4.57L28.24 4.72L28.29 4.87L28.34 5.03L28.37 5.19L28.40 5.35L28.41 5.51L28.42 5.67L28.41 5.84L28.40 6.00L28.37 6.16L28.33 6.33L28.29 6.50L28.24 6.68L28.19 6.86L28.15 7.04L28.12 7.22L28.08 7.39L28.03 7.57L27.99 7.74L27.95 7.91L27.90 8.09L27.85 8.26L27.81 8.44L27.77 8.61L27.73 8.79L27.69 8.96L27.66 9.14L27.63 9.31L27.60 9.49L27.57 9.66L27.53 9.84L27.49 10.02L27.45 10.19L27.40 10.37L27.35 10.54L27.31 10.72L27.26 10.90L27.21 11.07L27.17 11.25L27.13 11.43L27.09 11.60L27.05 11.78L27.02 11.96L26.98 12.15L26.95 12.36L26.91 12.57L26.88 12.77L26.84 12.95L26.81 13.11L26.79 13.22L26.88 13.24L26.92 13.13L26.97 12.99L27.03 12.81L27.09 12.62L27.15 12.41L27.21 12.21L27.26 12.03L27.30 11.85L27.35 11.68L27.40 11.50L27.45 11.33L27.51 11.15L27.56 10.98L27.61 10.80L27.66 10.63L27.71 10.45L27.75 10.28L27.80 10.10L27.84 9.92L27.88 9.74L27.91 9.56L27.95 9.38L27.99 9.21L28.03 9.03L28.07 8.86L28.11 8.68L28.16 8.51L28.20 8.33L28.25 8.16L28.29 7.99L28.33 7.81L28.37 7.64L28.41 7.46L28.44 7.29L28.47 7.11L28.51 6.94L28.55 6.76L28.59 6.58L28.64 6.40L28.68 6.22L28.71 6.04L28.74 5.85L28.75 5.67L28.75 5.49L28.74 5.31L28.71 5.13L28.68 4.95L28.63 4.77L28.57 4.60L28.49 4.42L28.40 4.26L28.30 4.09L28.19 3.94L28.08 3.78L27.98 3.63L27.88 3.48L27.79 3.32L27.70 3.16L27.61 3.00L27.53 2.84L27.44 2.68L27.35 2.52L27.26 2.36L27.16 2.20L27.05 2.02L26.94 1.84L26.83 1.66L26.73 1.51L26.65 1.37L26.58 1.28Z',
'M0.00 22.26L1.19 22.19L2.79 22.15L4.69 22.08L6.80 22.03L9.01 21.93L11.24 21.93L13.38 21.92L15.49 21.91L17.67 21.95L19.90 22.09L22.17 22.21L24.46 22.27L26.73 22.38L28.99 22.39L31.36 22.32L33.91 22.34L36.51 22.23L39.01 22.10L41.28 22.05L43.19 21.91L44.60 21.79L44.60 21.65L43.19 21.69L41.27 21.74L39.00 21.75L36.49 21.78L33.90 21.85L31.35 21.87L28.99 21.90L26.75 21.90L24.47 21.81L22.19 21.71L19.92 21.63L17.69 21.47L15.50 21.42L13.38 21.46L11.23 21.42L9.00 21.50L6.78 21.62L4.67 21.74L2.78 21.87L1.18 21.98L0.00 22.12Z'];
const LOGO_DOTS=[[5.9,9.406,0.616],[9.956,6.482,0.677],[13.856,9.066,0.616]];
const logoMarkPt=(W,H)=>7.5*Math.pow(Math.min(W,H)/595.28,0.29)*72/25.4;   // height of the mark (pt) on a W x H pt page
/* the lockup for a mark u units high (the units of the page drawing): its size, and its markup with the right edge at x1 and
   the ground line of the mark at y1 (the address sits on the same line, the wordmark above it) */
function logoSize(tw,TX,u){ const mw=LOGO_W*u/LOGO_H, gap=0.3*u, s1=0.42*u, s2=0.3*u;
  const w1=tw(TX.subject,s1,'italic'), w2=tw(LOGO_ADDR,s2,'normal'); return {u,mw,gap,s1,s2,w:mw+gap+Math.max(w1,w2),h:u}; }
function logoSvg(L,TX,x1,y1){ const {u,mw,gap,s1,s2}=L, x0=x1-L.w, y0=y1-u, sc=u/LOGO_H, tx=x0+mw+gap;
  const txt=(y,t,size,style,fill)=>`<text x="${n2(tx)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''} fill="${fill}">${xesc(t)}</text>`;
  const svg=`<g data-logo="M2k"><g transform="translate(${n2(x0)} ${n2(y0)}) scale(${sc.toFixed(5)})">`+LOGO_D.map(d=>`<path d="${d}" fill="${LOGO_INK}"/>`).join('')+
    LOGO_DOTS.map(([cx,cy,r])=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${LOGO_DOT}"/>`).join('')+'</g>'+
    txt(y0+0.56*u,TX.subject,s1,'italic',LOGO_INK)+txt(y1-0.02*u,LOGO_ADDR,s2,'normal',CREDIT_COL)+'</g>';
  return {svg,box:[x0,y0-0.05*u,L.w,u*1.1]}; }
function rng(seed){ let s=(seed>>>0)||0x9e3779b9; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const addExt=(m,l,e)=>{ const a=m.get(l); if(!a) m.set(l,[e[0],e[1]]); else { if(e[0]<a[0]) a[0]=e[0]; if(e[1]>a[1]) a[1]=e[1]; } };

function treeGraph(ctx,rootId,G,usePd,dir,useIm,useRs){
  const P=ctx.people, down=dir==='down';   // down: the "advisors" of the layout are the students (descendants tree)
  const advPhd=down?id=>(ctx.studentsOf?ctx.studentsOf(id):[]).filter(s=>s!==id&&P.has(s)):id=>{ const p=P.get(id); return p?p.adv.filter(a=>P.has(a)&&a!==id):[]; };
  const pdOf=down?ctx.pdStudentsOf:ctx.pdAdvisorsOf;
  const advOrd=usePd&&pdOf?id=>{ const a=advPhd(id); return a.concat(pdOf(id).filter(x=>x!==id&&!a.includes(x))); }:advPhd;
  const isPd=(x,a)=>usePd&&!advPhd(x).includes(a);
  const src=(x,a)=>ctx.edgeSrc?((down?ctx.edgeSrc(a,x):ctx.edgeSrc(x,a))||''):'';
  /* informal mentor links (ctx.imStudentsOf/imMentorsOf): dotted violet leaves, never followed further and not counted as people */
  const imOf=useIm===false?null:down?ctx.imStudentsOf:ctx.imMentorsOf, IM=new Set();
  /* research scientist links (ctx.rsMembersOf/rsHostsOf): long-dash rust leaves; kept in IM (never followed, never counted) and flagged in RS */
  const rsOf=useRs===false?null:down?ctx.rsMembersOf:ctx.rsHostsOf, RS=new Set();
  const gmin=new Map([[rootId,0]]), par=new Map(); const q=[rootId];
  for(let i=0;i<q.length;i++){ const x=q[i]; if(IM.has(x)) continue; for(const a of advOrd(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); }
    if(rsOf) for(const a of rsOf(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); IM.add(a); RS.add(a); }
    if(imOf) for(const a of imOf(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); IM.add(a); } }
  const ALL=new Set(gmin.keys()); const order=q.filter(x=>gmin.get(x)<=G); const S=new Set(order);
  const kids=new Map(order.map(x=>[x,[]]));
  for(const x of order) if(x!==rootId) kids.get(par.get(x)).push(x);
  const edge=new Map(); for(const x of order) if(x!==rootId){ const p=par.get(x); if(IM.has(x)){ edge.set(x,RS.has(x)?{rs:true,im:false,pd:false,unv:false,co:false}:{im:true,pd:false,unv:false,co:false}); continue; } const pdE=isPd(p,x); edge.set(x,{pd:pdE,unv:UNV_TREE.test(src(p,x)),co:!pdE&&!!ctx.isCoEdge&&(down?ctx.isCoEdge(x,p):ctx.isCoEdge(p,x))}); }
  const extra=[]; for(const x of order) if(!IM.has(x)) for(const a of advOrd(x)) if(S.has(a)&&par.get(a)!==x&&a!==rootId) extra.push({s:x,a,pd:isPd(x,a),unv:UNV_TREE.test(src(x,a))});
  const size=new Map(), leaves=new Map(), height=new Map();
  for(let i=order.length-1;i>=0;i--){ const x=order[i]; let s=1,l=0,h=0; for(const c of kids.get(x)){ s+=size.get(c); l+=leaves.get(c); h=Math.max(h,height.get(c)+1); } size.set(x,s); leaves.set(x,l||1); height.set(x,h); }
  const ancestors=x=>{ const out=new Set(); const st=[x]; while(st.length){ const y=st.pop(); for(const a of advOrd(y)) if(!out.has(a)){ out.add(a); st.push(a); } } return out; };
  const more=new Map(); for(const x of order){ if(IM.has(x)) continue; if(advOrd(x).some(a=>!S.has(a))){ let n=0; for(const a of ancestors(x)) if(!S.has(a)) n++; if(n) more.set(x,n); } }
  const pdEdges=[...edge.values()].filter(e=>e.pd).length+extra.filter(e=>e.pd).length;
  return {S,ALL,order,gmin,par,kids,edge,extra,size,leaves,height,more,usePd:!!usePd,pdEdges,dir:down?'down':'up',im:IM,rs:RS,nIm:[...IM].filter(x=>S.has(x)).length,nImAll:IM.size};
}

function famousPath(ctx,g,rootId){
  const P=ctx.people; const desc=x=>ctx.nDesc?ctx.nDesc(x):(((P.get(x)||{}).mgp||[])[1]||0);
  const cand=g.order.filter(x=>x!==rootId&&!(g.im&&g.im.has(x))); const yr=x=>P.get(x).year||9999; const gm=x=>g.gmin.get(x);
  if(!cand.length) return {path:[rootId],target:null,d:0,mode:'none',desc};
  let best=null, mode='desc';
  for(const x of cand){ const d=desc(x); if(d>0&&(!best||d>best.d||(d===best.d&&(gm(x)>gm(best.x)||(gm(x)===gm(best.x)&&yr(x)<yr(best.x)))))) best={x,d}; }
  if(!best){ mode='deep'; let b=cand[0]; for(const x of cand) if(gm(x)>gm(b)||(gm(x)===gm(b)&&yr(x)<yr(b))) b=x; best={x:b,d:0}; }
  const path=[]; for(let x=best.x;x!==rootId;x=g.par.get(x)) path.push(x); path.push(rootId); path.reverse();
  for(let x=best.x;g.kids.get(x).filter(k=>!(g.im&&g.im.has(k))).length;){ const ks=g.kids.get(x).filter(k=>!(g.im&&g.im.has(k))); let nx=ks[0]; for(const k of ks) if(desc(k)>desc(nx)||(desc(k)===desc(nx)&&g.height.get(k)>g.height.get(nx))) nx=k; path.push(nx); x=nx; }
  return {path,target:best.x,d:best.d,mode,desc};
}

function treeLayout(ctx,tw,g,fp,rootId,cfg){
  const P=ctx.people, S=g.S, kids=g.kids, size=g.size, hlSet=new Set(fp.path);
  const NS=cfg.ns, MS=cfg.ms, TX=L10N[cfg.lang]||L10N.sk;
  const Wd=s=>Math.min(cfg.wmax,2+3.4*Math.sqrt(s));
  // trunk: follow the dominant advisor
  const trunk=[rootId];
  for(let x=rootId;;){ const ks=kids.get(x); if(!ks.length) break; let h=ks[0]; for(const k of ks) if(size.get(k)>size.get(h)) h=k;
    const rest=size.get(x)-1-size.get(h); if(ks.length>1&&rest>cfg.dom*size.get(h)) break; trunk.push(h); x=h; }
  const tIdx=new Map(trunk.map((x,i)=>[x,i])); const isT=x=>tIdx.has(x); const B=trunk[trunk.length-1];
  const tNext=x=>{ const i=tIdx.get(x); return i!=null&&i+1<trunk.length?trunk[i+1]:null; };
  const side=new Map(); trunk.forEach((x,i)=>{ if(i) side.set(x,i%2?1:-1); });
  // labels
  function makeLabel(x){
    const p=P.get(x), root=x===rootId; const ns=root?NS*2.1:NS, ms=root?MS*1.45:MS;
    const lines=[];
    for(const t of wrapText(tw,clean(p.name),ns,'normal',root?1e4:cfg.nameW)) lines.push({t,size:ns,style:'normal',fill:TP.INK,lh:ns*1.12});
    const pr=p.primary; const yr=pr&&pr.year?String(pr.year):''; const sch=pr?schoolShort(cfg.lang==='en'&&pr.schoolEn?pr.schoolEn:pr.school,cfg.lang):'';
    let meta=yr&&sch?yr+' · '+sch:(yr||sch||TX.noDeg);
    if(root&&pr&&pr.deg&&degDisp(pr.deg,cfg.lang).length<=14&&(yr||sch)) meta=degDisp(pr.deg,cfg.lang)+' '+meta;
    wrapText(tw,meta,ms,'italic',root?1e4:cfg.nameW+14).forEach((t,i)=>lines.push({t,size:ms,style:'italic',fill:TP.INK2,lh:ms*1.25,gap:i?0:-1}));
    if(p.sk){ const tag=p.sk==='rod'?TX.tagRod:ctx.isFemale(p)?TX.tagSkF:TX.tagSk; lines.push({t:tag,size:ms*0.84,style:'normal',fill:TP.SK,lh:ms*1.2,gap:0.5}); }
    if(g.more.has(x)) lines.push({t:(g.dir==='down'?TX.dMore:TX.more)(g.more.get(x)),size:ms*0.92,style:'italic',fill:TP.INK3,lh:ms*1.18});
    const padX=root?14:8, padY=root?6:4;
    let w=0; for(const l of lines){ l.w=tw(l.t,l.size,l.style); w=Math.max(w,l.w); }
    let h=2*padY; for(const l of lines) h+=l.lh+(l.gap||0);
    return {w:w+2*padX,h,lines,padX,padY,sk:p.sk||'',hl:hlSet.has(x),root};
  }
  const lab=new Map(); for(const x of S) lab.set(x,makeLabel(x));
  // extra links -> affinity between sibling subtrees (keeps people joined by dashed links close)
  const gm=x=>g.gmin.get(x);
  const lca=(a,b)=>{ while(gm(a)>gm(b)) a=g.par.get(a); while(gm(b)>gm(a)) b=g.par.get(b); while(a!==b){ a=g.par.get(a); b=g.par.get(b); } return a; };
  const childOn=(anc,x)=>{ let y=x; while(y!==rootId&&g.par.get(y)!==anc) y=g.par.get(y); return y===rootId?null:y; };
  const aff=new Map(); const ak=(a,b)=>a<b?a+'|'+b:b+'|'+a;
  for(const e of g.extra){ const l=lca(e.s,e.a); if(l===e.s||l===e.a) continue; const c1=childOn(l,e.s), c2=childOn(l,e.a); if(c1==null||c2==null||c1===c2) continue; aff.set(ak(c1,c2),(aff.get(ak(c1,c2))||0)+1); }
  const affOf=(a,b)=>aff.get(ak(a,b))||0;
  function orderCrown(ks){
    if(ks.length<=1) return ks.slice();
    const wt=k=>g.leaves.get(k)+0.5;
    const cost=arr=>{ let tot=0; for(const k of arr) tot+=wt(k); let c=0; const pos=arr.map(k=>{ const v=c+wt(k)/2; c+=wt(k); return v; });
      let mom=0,spr=0,af=0; arr.forEach((k,i)=>{ mom+=wt(k)*(pos[i]-tot/2); spr+=size.get(k)*Math.abs(pos[i]-tot/2); });
      for(let i=0;i<arr.length;i++) for(let j=i+1;j<arr.length;j++) af+=affOf(arr[i],arr[j])*Math.abs(pos[i]-pos[j]);
      return Math.abs(mom)/tot+cfg.affW*af+0.02*spr/tot; };
    if(ks.length<=6){ let best=null,bc=Infinity; const perm=(arr,rest)=>{ if(!rest.length){ const c=cost(arr); if(c<bc-1e-9){ bc=c; best=arr.slice(); } return; } for(let i=0;i<rest.length;i++){ arr.push(rest[i]); perm(arr,rest.slice(0,i).concat(rest.slice(i+1))); arr.pop(); } }; perm([],ks); return best; }
    const srt=ks.slice().sort((a,b)=>size.get(b)-size.get(a)); const L=[],R=[]; let wl=0,wr=0;
    for(const k of srt){ if(wl<=wr){ L.push(k); wl+=wt(k); } else { R.push(k); wr+=wt(k); } }
    return L.reverse().concat(R);
  }
  const ord=new Map();
  for(const x of S) if(!isT(x)||x===B) ord.set(x,orderCrown(kids.get(x)));
  { let wL=0,wR=0; for(const x of trunk){ if(x===B) continue; const t=tNext(x); const bs=kids.get(x).filter(k=>k!==t).sort((a,b)=>size.get(b)-size.get(a)); const L=[],R=[];
      for(const b of bs){ const sd=wL<wR?-1:wR<wL?1:(side.get(x)||1); if(sd<0){ L.push(b); wL+=size.get(b); } else { R.push(b); wR+=size.get(b); } }
      ord.set(x,L.slice().reverse().concat([t],R)); } }
  // outward direction of every bough (-1 left, +1 right, 0 straight up): chains lean outward
  const dirOf=new Map([[rootId,0]]);
  (function dv(x){ const ks=ord.get(x)||[]; const t=tNext(x);
    ks.forEach((c,i)=>{ let d;
      if(isT(c)) d=0; else if(isT(x)&&x!==B) d=ks.indexOf(t)>i?-1:1; else if(x===B&&!dirOf.get(x)) d=ks.length===1?0:(i<(ks.length-1)/2?-1:i>(ks.length-1)/2?1:0); else d=dirOf.get(x);
      dirOf.set(c,d); dv(c); }); })(rootId);
  // generation rows (left-to-right order = depth-first order) and tiers
  const rows=[]; (function vis(x){ const r=gm(x); (rows[r]=rows[r]||[]).push(x); for(const c of ord.get(x)) vis(c); })(rootId);
  const nR=rows.length; const tiers=new Array(nR).fill(1); const tier=new Map();
  for(let r=0;r<nR;r++){ const R=rows[r]; let dem=0; for(const x of R){ dem+=lab.get(x).w+cfg.hgap+(isT(x)&&x!==rootId?Wd(size.get(x))+cfg.twig:0); }
    if(cfg.stagger&&R.length>=3&&dem>cfg.availW) tiers[r]=Math.min(cfg.maxTiers,R.length-1,Math.max(2,Math.ceil(dem/Math.max(1,cfg.availW))));
    const ti=R.findIndex(isT); R.forEach((x,i)=>tier.set(x,((i-(ti<0?0:ti))%tiers[r]+tiers[r])%tiers[r])); }
  const base=[0]; for(let r=1;r<=nR;r++) base[r]=base[r-1]+tiers[r-1];
  const nL=base[nR]; const levelRow=[]; for(let r=0;r<nR;r++) for(let t=0;t<tiers[r];t++) levelRow.push(r);
  const lvl=x=>base[gm(x)]+tier.get(x);
  const stem=cfg.stem;
  function own(x){
    const b=lab.get(x), L=lvl(x), m=new Map();
    if(isT(x)&&x!==rootId){ const w=Wd(size.get(x)); m.set(L,side.get(x)>0?[-w/2,w/2+cfg.twig+b.w]:[-w/2-cfg.twig-b.w,w/2]); }
    else m.set(L,[-b.w/2,b.w/2]);
    if(isT(x)){ const t=tNext(x); if(t!=null){ const w=Wd(size.get(x)); for(let l=L+1;l<lvl(t);l++) addExt(m,l,[-w/2,w/2]); } }
    const r0=base[gm(x)], r1=r0+tiers[gm(x)]-1;
    for(let l=r0;l<L;l++) addExt(m,l,[-stem,stem]);   // the incoming branch rises through the lower tiers of the row
    if(kids.get(x).length) for(let l=L+1;l<=r1;l++) addExt(m,l,[-stem,stem]);   // outgoing branches rise through the upper tiers
    return m;
  }
  const rel=new Map();
  function pack(x){
    const ks=ord.get(x)||[]; let acc=null; const offs=[];
    for(const c of ks){ const cc=pack(c);
      if(!acc){ acc=new Map([...cc].map(([l,e])=>[l,e.slice()])); offs.push(0); continue; }
      let sh=-Infinity; for(const [l,e] of cc){ const a=acc.get(l); if(a) sh=Math.max(sh,a[1]-e[0]+cfg.hgap); }
      sh=Math.max(sh,offs[offs.length-1]+2*stem+cfg.hgap);
      offs.push(sh); for(const [l,e] of cc) addExt(acc,l,[e[0]+sh,e[1]+sh]); }
    let anc=0; if(ks.length){ const t=tNext(x); anc=t!=null?offs[ks.indexOf(t)]:(offs[0]+offs[offs.length-1])/2-(ks.length===1&&!isT(x)?cfg.lean*dirOf.get(ks[0]):0); }
    ks.forEach((c,i)=>rel.set(c,offs[i]-anc));
    const res=new Map(); if(acc) for(const [l,e] of acc) res.set(l,[e[0]-anc,e[1]-anc]);
    for(const [l,e] of own(x)) addExt(res,l,e);
    return res;
  }
  pack(rootId);
  const X=new Map([[rootId,0]]); (function px(x){ for(const c of ord.get(x)||[]){ X.set(c,X.get(x)+rel.get(c)); px(c); } })(rootId);
  // vertical: level heights, row gaps by sideways travel
  const lh=new Array(nL).fill(0); for(const x of S) if(x!==rootId) lh[lvl(x)]=Math.max(lh[lvl(x)],lab.get(x).h);
  const travel=new Array(nR).fill(0); for(const x of S) if(x!==rootId){ const p=g.par.get(x); travel[gm(p)]=Math.max(travel[gm(p)],Math.abs(X.get(x)-X.get(p))); }
  const gap0=travel.map(t=>Math.min(cfg.gmax,Math.max(cfg.gmin,cfg.g0+cfg.gk*t)));
  const gw=travel.map(t=>0.6+Math.min(1.4,t/260));
  const stub=B===rootId?Math.min(46,cfg.gmin+22):0;
  if(B===rootId&&nR>1) gap0[0]=Math.max(gap0[0],stub+24);
  function computeY(extra){
    const Y=new Array(nL); Y[0]=0; let y=0;
    for(let l=1;l<nL;l++){ const r0=levelRow[l-1], r=levelRow[l]; const h0=l-1===0?0:Math.max(lh[l-1],10), h1=Math.max(lh[l],10);
      y-=h0/2+h1/2+(r===r0?cfg.tgap:gap0[r0]+extra*gw[r0]); Y[l]=y; }
    return Y;
  }
  const gapW=gw.slice(0,Math.max(0,nR-1)).reduce((a,b)=>a+b,0);
  let xm=1; for(const x of S) if(!isT(x)) xm=Math.max(xm,Math.abs(X.get(x)));
  const dome=x=>isT(x)||x===rootId?0:cfg.dome*Math.pow(Math.abs(X.get(x))/xm,2);
  return {trunk,B,isT,side,ord,rows,tiers,tier,lvl,X,lab,Wd,computeY,gapW,stub,nR,nL,cfg,hlSet,dome};
}

function treeCompose(ctx,tw,g,fp,lay,rootId,opts){
  const P=ctx.people, rootP=P.get(rootId), cfg=lay.cfg, lang=cfg.lang, TX=L10N[lang]||L10N.sk;
  const W=1190.55,H=opts.pageH||1683.78,M=46, down=g.dir==='down', scr=!!opts.screen;
  const out=[]; const T=(x,y,t,size,style,fill,anchor,extra)=>{ const w=tw(t,size,style); const x0=anchor==='middle'?x-w/2:anchor==='end'?x-w:x; out.push(`<text x="${n2(x0)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''}${style==='bold'?' font-weight="bold"':''} fill="${fill}"${extra||''}>${xesc(t)}</text>`); return w; };
  const name=clean(rootP.name);
  // ----- title block
  const gen=lang==='sk'?genitive(rootP.name,ctx.isFemale(rootP)):null;
  const title=(down?TX.dTitle:TX.title)(name,gen);
  const maxTW=W-2*M-40; let ts=50; { const w0=tw(title,ts,'normal'); if(w0>maxTW) ts*=maxTW/w0; }
  const sub=TX.sub;
  let ss=16; { const w1=tw(sub,ss,'italic'); if(w1>maxTW) ss*=maxTW/w1; }
  // ----- footer
  const n=g.S.size-(g.nIm||0), kk=n-1, tot=g.ALL.size-(g.nImAll||0)-1, om=(g.ALL.size-(g.nImAll||0))-n, G=opts.gens, cut=om>0;
  let f1;
  if(down){ f1=kk===0?TX.dF0(name):TX.dF1(n,name,kk,cut,G,!!g.pdEdges); }
  else if(kk===0) f1=TX.f0(name);
  else if(kk===1) f1=TX.f1one(name,cut);
  else f1=TX.f1(n,name,kk,cut,G,!!g.pdEdges);
  const dp=down?null:(g.usePd&&ctx.deepestAll?ctx.deepestAll:ctx.deepest)(rootId); const oldest=down?null:P.get(dp.root);
  const dt=(ctx.generated||'').split('-'); const dstr=dt.length===3?TX.date(+dt[0],+dt[1],+dt[2]):'';
  const f2=down?(cut?TX.dF2cut(tot,om):(kk?TX.dF2all:'')):cut?TX.f2cut(tot,dp.g,clean(oldest.name),om):(kk?TX.f2all:'');
  const f3=TX.f3(dstr);
  /* logo (bottom right, its ground line on the credit's baseline): opts.logoK = pt per design unit of the final page */
  const LG=scr?null:logoSize(tw,TX,logoMarkPt(W*(opts.logoK||1),H*(opts.logoK||1))/(opts.logoK||1)), lgX1=W-M+6, lgY1=H-36;
  const midW=LG?W-2*(W-lgX1+LG.w+16):Infinity;   // centred texts beside the logo stay within this width
  const fs=12.5, flh=18, fmax=W-2*M-30;
  const w23=wrapText(tw,clean(f2+f3),fs,'normal',fmax);
  const flines=scr?[]:wrapText(tw,clean(f1),fs,'normal',fmax).concat(w23.length===1||!f2?w23:wrapText(tw,clean(f2),fs,'normal',fmax).concat([f3])).filter(Boolean);
  /* footer lines beside the logo: row j from the bottom (baseline H-58-18j) clears the top of the logo with 5 units to spare when
     18j >= u-13.9; a line too wide for midW in a row that does not clear it lifts the footer block just enough */
  let lift=0; if(LG) flines.forEach((t,i)=>{ const j=flines.length-1-i, need=LG.u-13.9-flh*j; if(need>lift&&tw(t,fs,'normal')>midW) lift=need; });
  const footTop=H-M-12-lift-(flines.length-1)*flh-fs;
  // ----- legend content
  const LI=[];
  const isFam=x=>FAMOUS.has(x)||TREE_FAMOUS.has(x);
  if(fp.path.length>1){
    const path=fp.path, last=path[path.length-1];
    let mids=path.slice(1,-1).filter(isFam); if(mids.length>3) mids=[mids[0]].concat(mids.slice(1).sort((a,b)=>fp.desc(b)-fp.desc(a)).slice(0,2)).sort((a,b)=>path.indexOf(a)-path.indexOf(b));
    if(!mids.length&&fp.target!=null&&fp.target!==last&&fp.target!==rootId) mids=[fp.target];
    const ids=[rootId].concat(mids,[last]); const sn=ids.map(x=>surname(P.get(x).name));
    const chain=ids.map((x,i)=>sn.indexOf(sn[i])!==sn.lastIndexOf(sn[i])?baseName(P.get(x).name):sn[i]);   // full name when a surname repeats (Bernoulli)
    const why=fp.mode==='desc'?(down?TX.dHlWhy:TX.hlWhy)(baseName(P.get(fp.target).name),nfmt(fp.d,lang)):TX.hlLong;
    LI.push({sw:'hl',t1:TX.hl(chain.join(' → ')),t2:why});
  }
  /* relation types by seniority (P. Richtárik, 2. 10. 2026): neformálny mentor, doktorand, postdoktorand, výskumný vedec */
  if([...g.edge.values()].some(e=>e.im)) LI.push({sw:'im',t1:TX.lIm,t2:TX.lIm2});
  if(kk) LI.push({sw:'branch',t1:TX.lBranch});
  const hasPd=[...g.edge.values()].some(e=>e.pd)||g.extra.some(e=>e.pd);
  if(hasPd) LI.push({sw:'pd',t1:TX.lPd,t2:TX.lPd2});
  if([...g.edge.values()].some(e=>e.rs)) LI.push({sw:'rs',t1:TX.lRs,t2:TX.lRs2});
  if(g.extra.some(e=>!e.pd)) LI.push({sw:'dash',t1:TX.lDash,t2:TX.lDash2});
  const hasUnv=[...g.edge.values()].some(e=>e.unv)||g.extra.some(e=>e.unv);
  if(hasUnv) LI.push({sw:'unv',t1:TX.lUnv,t2:TX.lUnv2});
  if([...g.edge.values()].some(e=>e.co)) LI.push({sw:'co',t1:TX.lCo,t2:TX.lCo2});
  if([...g.S].some(x=>P.get(x).sk)) LI.push({sw:'sk',t1:TX.lSk});
  if(g.more.size) LI.push(down?{sw:'more',t1:TX.dLMore,t2:TX.dLMore2}:{sw:'more',t1:TX.lMore,t2:TX.lMore2});
  const L1=11, L2=9.6, lpad=14, lsw=36, ltx=lpad+lsw+10, LWmax=270;
  for(const it of LI){ it.l1=wrapText(tw,it.t1,L1,'normal',LWmax); it.l2=it.t2?wrapText(tw,it.t2,L2,'italic',LWmax):[]; it.h=Math.max(18,it.l1.length*13.4+it.l2.length*12)+6; }
  let lw=0; for(const it of LI){ for(const t of it.l1) lw=Math.max(lw,tw(t,L1,'normal')); for(const t of it.l2) lw=Math.max(lw,tw(t,L2,'italic')); }
  const Lw=ltx+lw+lpad, Lh=LI.length?40+LI.reduce((a,it)=>a+it.h,0)+2:0;
  // ----- geometry of the tree in design units
  const {X,lab,lvl,isT,side,Wd,B,trunk}=lay; const S=g.S, size=g.size;
  const fy=v=>down?-v:v;   // descendants: the geometry is drawn mirrored (scale(1,-1)), labels and boxes in mirrored coordinates
  const boxOf=(x,Y)=>{ const b=boxRaw(x,Y); return down?[b[0],-b[1]-b[3],b[2],b[3]]:b; };
  const boxRaw=(x,Y)=>{ const b=lab.get(x), y=Y[lvl(x)]+lay.dome(x), xx=X.get(x);
    if(x===rootId) return [xx-b.w/2,y+5,b.w,b.h];
    if(isT(x)){ const w=Wd(size.get(x)); return [side.get(x)>0?xx+w/2+cfg.twig:xx-w/2-cfg.twig-b.w,y-b.h/2,b.w,b.h]; }
    return [xx-b.w/2,y-b.h/2,b.w,b.h]; };
  const rootLab=lab.get(rootId);
  const groundHalf=Math.max(rootLab.w/2+90,230);
  const ext=Y=>{ let x0=-groundHalf,x1=groundHalf,y0=Infinity,y1=-Infinity; for(const x of S){ const b=boxOf(x,Y); const fx=isT(x)||x===rootId?0:22; x0=Math.min(x0,b[0]-fx); x1=Math.max(x1,b[0]+b[2]+fx); y0=Math.min(y0,b[1]-(isT(x)||x===rootId?4:18)); y1=Math.max(y1,b[1]+b[3]); }
    if(down){ y1+=18; y0=Math.min(y0,-(5+rootLab.h+8)); } else y1=Math.max(y1,5+rootLab.h+8); return {x0,x1,y0,y1}; };
  const areaT=scr?M+10:M+150, areaB0=footTop-22, areaL=M+10, areaR0=W-M-10;
  const smax=n<=3?2.3:n<=8?1.8:n<=16?1.5:cfg.smax, xmax=n<=8?170:n<=16?110:cfg.xmax;   // small trees print larger
  function fit(areaR,areaB){
    const aw=areaR-areaL, ah=areaB-areaT;
    const e0=ext(lay.computeY(0)); const half=Math.max(-e0.x0,e0.x1);
    const sTC=Math.min(aw/(2*half)), sBB=aw/(e0.x1-e0.x0);
    const centered=sTC>=0.86*sBB; let sW=centered?sTC:sBB;
    const h0=e0.y1-e0.y0; let extra=0;
    if(h0*sW<ah&&lay.gapW>0) extra=Math.min(xmax,Math.max(0,(ah/sW-h0)/lay.gapW));
    const Y=lay.computeY(extra); const e=ext(Y);
    let s=Math.min(centered?aw/(2*Math.max(-e.x0,e.x1)):aw/(e.x1-e.x0),ah/(e.y1-e.y0),smax);
    const GX=centered?(areaL+areaR)/2:areaL+(aw-(e.x1-e.x0)*s)/2-e.x0*s;
    const GY=areaT+(ah-(e.y1-e.y0)*s)/2-e.y0*s;
    return {s,GX,GY,Y,e,extra,centered,areaR,areaB};
  }
  // obstacles for the legend (page coordinates)
  const obst=f=>{ const R=[]; for(const x of S){ const b=boxOf(x,f.Y); const m=isT(x)||x===rootId?6:24; R.push([f.GX+(b[0]-m)*f.s,f.GY+(b[1]-m)*f.s,(b[2]+2*m)*f.s,(b[3]+2*m)*f.s]); }
    for(const x of S) if(x!==rootId){ const p=g.par.get(x); const a=[X.get(p),f.Y[lvl(p)]+lay.dome(p)], c=[X.get(x),f.Y[lvl(x)]+lay.dome(x)]; for(let t=0;t<=1.001;t+=0.1){ const px=a[0]+(c[0]-a[0])*t, py=fy(a[1]+(c[1]-a[1])*t); R.push([f.GX+px*f.s-6,f.GY+py*f.s-6,12,12]); } }
    if(!down){ const yG=f.GY+(5+rootLab.h*0.7)*f.s; R.push([f.GX-groundHalf*f.s,yG-50*f.s,2*groundHalf*f.s,54*f.s]); } return R; };
  const freeAt=(R,x,y)=>!R.some(r=>r[0]<x+Lw+8&&r[0]+r[2]>x-8&&r[1]<y+Lh+8&&r[1]+r[3]>y-8);
  let F=fit(areaR0,areaB0), Lx=null, Ly=null, legendMode='none';
  if(LI.length&&!scr){
    const tryPlace=f=>{ const R=obst(f); const st=10, c=[];
      for(let y=f.areaB-Lh;y>=areaT;y-=st){ c.push([areaR0-Lw,y]); c.push([areaL,y]); }
      for(let x=areaR0-Lw;x>=areaL;x-=st) c.push([x,areaT]);
      for(const [x,y] of c) if(freeAt(R,x,y)) return [x,y]; return null; };
    let pos=tryPlace(F); legendMode='free';
    if(!pos){ for(const sh of [0.96,0.92,0.88]){ const f2=Object.assign({},F); f2.s=F.s*sh; const cxp=F.centered?(areaL+areaR0)/2:null; const e=F.e;
        f2.GX=F.centered?cxp:areaL+((areaR0-areaL)-(e.x1-e.x0)*f2.s)/2-e.x0*f2.s; f2.GY=areaB0-(e.y1)*f2.s-((areaB0-areaT)-(e.y1-e.y0)*F.s)/2;
        const p2=tryPlace(f2); if(p2){ F=f2; pos=p2; legendMode='free'+sh; break; } } }
    if(!pos){ const Fa=fit(areaR0-Lw-16,areaB0), Fb=fit(areaR0,areaB0-Lh-16);
      if(Fa.s>=Fb.s){ F=Fa; pos=[areaR0-Lw,areaB0-Lh]; legendMode='right'; } else { F=Fb; pos=[areaR0-Lw,areaB0-Lh]; legendMode='below'; } }
    [Lx,Ly]=pos;
  }
  const {s,GX,GY,Y}=F;
  // ----- drawing helpers (design units)
  const bz=(p0,p1,p2,p3,t)=>{ const u=1-t; return [u*u*u*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t*t*t*p3[0],u*u*u*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t*t*t*p3[1]]; };
  const polyTaper=(pts,ws)=>{ const Lp=[],Rp=[],k=pts.length-1; pts.forEach((p,i)=>{ const a=pts[Math.max(0,i-1)], b=pts[Math.min(k,i+1)]; const dx=b[0]-a[0], dy=b[1]-a[1], d=Math.hypot(dx,dy)||1; const nx=-dy/d, ny=dx/d, w=ws[i]/2; Lp.push([p[0]+nx*w,p[1]+ny*w]); Rp.push([p[0]-nx*w,p[1]-ny*w]); });
    return 'M'+Lp.concat(Rp.reverse()).map(q=>n2(q[0])+','+n2(q[1])).join(' L')+'Z'; };
  const curvePts=(c,nn)=>{ const a=[]; for(let i=0;i<=nn;i++) a.push(bz(c[0],c[1],c[2],c[3],i/nn)); return a; };
  const cpath=c=>`M${n2(c[0][0])},${n2(c[0][1])} C${n2(c[1][0])},${n2(c[1][1])} ${n2(c[2][0])},${n2(c[2][1])} ${n2(c[3][0])},${n2(c[3][1])}`;
  const brCol=sz=>mixc(T_BROWN,T_OLIVE,Math.min(1,Math.max(0,(8-sz)/7)));
  const coBranch=(pts,ws,col)=>{   // branch to a co-advised student (2+ advisors): the tapered branch cut into dashes
    const cum=[0]; for(let i=1;i<pts.length;i++) cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const wm=ws.reduce((a,b)=>a+b,0)/ws.length, on=Math.max(9,wm*2.6), off=Math.max(4,wm*1.1); let out2='', run=[];
    const flush=()=>{ if(run.length>1) out2+=`<path d="${polyTaper(run.map(i=>pts[i]),run.map(i=>ws[i]))}" fill="${col}"/>`; run=[]; };
    for(let i=0;i<pts.length;i++){ if(cum[i]%(on+off)<on) run.push(i); else flush(); } flush(); return out2; };
  const dots=(pts,r)=>{ let acc=0, out2=''; const step=Math.max(2.8,r*3.2); for(let i=1;i<pts.length;i++){ const d=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]); acc+=d; if(acc>=step){ acc=0; out2+=`<circle cx="${n2(pts[i][0])}" cy="${n2(pts[i][1])}" r="${n2(r)}" fill="${TP.CREAM}"/>`; } } return out2; };
  const Yl=x=>Y[lvl(x)]+lay.dome(x);
  const forkY=Yl(B)-(B===rootId?lay.stub:0);
  const hl=lay.hlSet; const hlEdge=x=>x!==rootId&&hl.has(x)&&hl.has(g.par.get(x));
  // trunk polygon
  const tY=trunk.map(x=>x===B?forkY:Yl(x)); const tW=trunk.map(x=>Wd(size.get(x)));
  const trunkW=y=>{ if(y>=tY[0]) return tW[0]; for(let i=1;i<trunk.length;i++) if(y>=tY[i]){ const t=(tY[i-1]-y)/((tY[i-1]-tY[i])||1); return tW[i-1]+(tW[i]-tW[i-1])*t; } return tW[tW.length-1]; };
  const yBot=6, yTop=forkY-3; const tp=[], tws=[];
  for(let i=0;i<=90;i++){ const y=yBot+(yTop-yBot)*i/90; tp.push([0,y]); tws.push(trunkW(y)*(B===rootId?0.9:1)+9*Math.max(0,1-(yBot-y)/46)**2); }
  const G2=[];  // tree group content
  // ground, foliage, roots
  const yG=5+rootLab.h*0.7;
  if(!down) G2.push(`<path d="M${n2(-groundHalf)},${n2(yG)} Q0,${n2(yG-22)} ${n2(groundHalf)},${n2(yG)}" fill="none" stroke="${TP.GROUND}" stroke-width="1"/>`);
  for(const x of S){ if(isT(x)&&(x!==B||g.kids.get(x).length)||x===rootId) continue; const b=boxRaw(x,Y); G2.push(`<ellipse cx="${n2(b[0]+b[2]/2)}" cy="${n2(b[1]+b[3]/2)}" rx="${n2(b[2]/2+34)}" ry="${n2(b[3]/2+30)}" fill="${TP.FOL}"/>`); }
  const rootsCol=mixc(T_BROWN,T_OLIVE,0.1); const fl=Math.min(1,tW[0]/24);
  // roots: from the trunk base outward and down to the ground line, mostly behind the pill
  if(!down) for(const sg of [-1,1]) for(const [ex,w] of [[22,8],[58,5.5],[100,4]]){ const x3=sg*(rootLab.w/2+ex*Math.max(0.6,fl)), p0=[sg*tW[0]*0.25,0], p3=[x3,yG-1];
    G2.push(`<path d="${polyTaper(curvePts([p0,[sg*tW[0]*0.6,yG*0.35],[x3*0.55,yG-4],p3],24),Array.from({length:25},(_,i)=>w*1.5*fl*(1-i/24)+0.5*i/24))}" fill="${rootsCol}"/>`); }
  G2.push(`<path d="${polyTaper(tp,tws)}" fill="${brCol(size.get(rootId))}"/>`);
  // trunk sections: postdoc (teal) and unconfirmed (dots)
  const pdTags=[];
  for(let i=1;i<trunk.length;i++){ const x=trunk[i], e=g.edge.get(x); const ya=i-1===0?yBot:tY[i-1], yb=tY[i]; const idx=tp.map((p,j)=>j).filter(j=>tp[j][1]<=ya+0.01&&tp[j][1]>=yb-0.01);
    if(idx.length<2) continue;
    if(e.pd){ G2.push(`<path d="${polyTaper(idx.map(j=>tp[j]),idx.map(j=>tws[j]))}" fill="${TP.TEAL}"/>`); pdTags.push({trunk:true,y0:ya,y1:yb,w:trunkW((ya+yb)/2)}); }
    if(e.co){ const wm=trunkW((ya+yb)/2), off=Math.max(4,wm*0.5), on=Math.max(10,wm*1.4); G2.push(`<path d="M0,${n2(ya)} L0,${n2(yb)}" stroke="${TP.PAGE}" stroke-width="${n2(wm*1.4+4)}" stroke-dasharray="${n2(off)} ${n2(on)}" stroke-dashoffset="${n2(-on/2)}" fill="none"/>`); }
    if(e.unv) G2.push(dots(idx.map(j=>tp[j]),Math.max(0.9,trunkW((ya+yb)/2)*0.16))); }
  // branches
  const veins=[]; const dashedOut=[];
  if(trunk.length>1){ let k=0; while(k+1<trunk.length&&hl.has(trunk[k+1])) k++; if(k>0) veins.push(`M0,${n2(yBot-2)} L0,${n2(k===trunk.length-1?forkY+2:tY[k])}`); }
  const curveOf=new Map();
  for(const x of g.order){ if(x===rootId) continue; const p=g.par.get(x); if(isT(p)&&isT(x)) continue;
    const sy=p===B?forkY:Yl(p), sx=X.get(p); let S0,u0;
    const E=[X.get(x),Yl(x)];
    if(isT(p)&&p!==B){ const dir=Math.sign(E[0]-sx)||1; S0=[sx+dir*(trunkW(sy)/2-1.5),sy]; u0=[dir*0.82,-0.57]; }
    else if(p===B){ S0=[sx+Math.max(-1,Math.min(1,(E[0]-sx)/220))*trunkW(sy)*0.28,sy+2]; u0=[0,-1]; }
    else { S0=[sx,sy]; u0=[0,-1]; }
    const Ld=Math.hypot(E[0]-S0[0],E[1]-S0[1]); const dyv=Math.max(8,S0[1]-E[1]);
    const k1=isT(p)&&p!==B?0.42:cfg.c1, k2=cfg.c2;   // short start and long vertical approach: branches reach their column early and rise straight into the pill
    const c=[S0,[S0[0]+u0[0]*Ld*k1,S0[1]+u0[1]*Math.min(Ld*k1,dyv*0.75)],[E[0],E[1]+dyv*k2],E]; curveOf.set(x,c);
    const pts=curvePts(c,28); const w=Wd(size.get(x)); const e=g.edge.get(x);
    if(e.rs){ G2.push(`<path d="${cpath(c)}" fill="none" stroke="${TP.RUST}" stroke-width="${n2(Math.max(2.4,w*0.8))}" stroke-dasharray="${n2(Math.max(9,w*3))} ${n2(Math.max(4.5,w*1.5))}"/>`); if(hlEdge(x)) veins.push(cpath(c)); continue; }
    if(e.im){ G2.push(`<path d="${cpath(c)}" fill="none" stroke="${TP.VIOLET}" stroke-width="${n2(Math.max(3,w*0.9))}" stroke-dasharray="0.1 ${n2(Math.max(5.5,w*1.8))}" stroke-linecap="round"/>`); if(hlEdge(x)) veins.push(cpath(c)); continue; }
    if(e.co){ const pc=curvePts(c,140); G2.push(coBranch(pc,pc.map((q,i)=>w*1.1+(w*0.72-w*1.1)*i/140),brCol(size.get(x)))); }
    else G2.push(`<path d="${polyTaper(pts,pts.map((q,i)=>w*1.1+(w*0.72-w*1.1)*i/28))}" fill="${e.pd?TP.TEAL:brCol(size.get(x))}"/>`);
    if(e.unv) G2.push(dots(pts.slice(3,-3),Math.max(0.8,w*0.17)));
    if(e.pd){ const m=bz(c[0],c[1],c[2],c[3],0.5); pdTags.push({trunk:false,x:m[0],y:m[1],dir:Math.sign(E[0]-S0[0])||1}); }
    if(hlEdge(x)) veins.push(cpath(c)); }
  // twigs to trunk labels
  for(const x of trunk){ if(x===rootId) continue; const b=boxRaw(x,Y), sd=side.get(x), y=Yl(x); const ex=sd>0?b[0]:b[0]+b[2], ey=b[1]+b[3]/2; const sx=sd*(trunkW(y)/2-2);
    G2.push(`<path d="${polyTaper(curvePts([[sx,y+5],[sx+sd*10,y+1],[ex-sd*12,ey+3],[ex+sd*2,ey]],16),Array.from({length:17},(_,i)=>4.2-2.6*i/16))}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`); }
  for(const d of veins) G2.push(`<path d="${d}" fill="none" stroke="${TP.OCHRE}" stroke-width="2" stroke-linecap="round"/>`);
  // leaves
  const rnd=rng(Math.abs(rootId)*2654435761);
  const leaf=(x,y,ang,Ln,col)=>{ const a=ang*Math.PI/180, ux=Math.cos(a), uy=Math.sin(a), nx=-uy, ny=ux, w=Ln*0.36; const tip=[x+ux*Ln,y+uy*Ln], m1=[x+ux*Ln*0.5+nx*w,y+uy*Ln*0.5+ny*w], m2=[x+ux*Ln*0.5-nx*w,y+uy*Ln*0.5-ny*w];
    return `<path d="M${n2(x)},${n2(y)} Q${n2(m1[0])},${n2(m1[1])} ${n2(tip[0])},${n2(tip[1])} Q${n2(m2[0])},${n2(m2[1])} ${n2(x)},${n2(y)}Z" fill="${col}"/>`; };
  for(const x of g.order){ if(x===rootId) continue; const leafy=!g.kids.get(x).length; if(isT(x)&&!(x===B&&leafy)) continue; const nL=leafy?7:3; const b=boxRaw(x,Y), cxx=b[0]+b[2]/2, cyy=b[1]+b[3]/2;
    for(let j=0;j<nL;j++){ const t=rnd()*2*Math.PI, rr=0.55+rnd()*0.2; G2.push(leaf(cxx+Math.cos(t)*(b[2]/2*rr+10),cyy+Math.sin(t)*(b[3]/2*rr+12),t*180/Math.PI-35+rnd()*70,11+rnd()*8,over(LEAFG[Math.floor(rnd()*4)],0.35+rnd()*0.25))); } }
  if(kk===0){ for(let j=0;j<9;j++){ const t=-Math.PI*(0.1+0.8*j/8); G2.push(leaf(Math.cos(t)*6,forkY+Math.sin(t)*4,t*180/Math.PI+rnd()*30-15,13+rnd()*7,over(LEAFG[j%4],0.55+rnd()*0.3))); } }
  // secondary links
  const anchor=x=>[X.get(x),Yl(x)];
  for(const e of g.extra){ const p=anchor(e.s), q=anchor(e.a); const m=[(p[0]+q[0])/2,(p[1]+q[1])/2]; const dx=q[0]-p[0], dy=q[1]-p[1], d=Math.hypot(dx,dy)||1; let nx=-dy/d, ny=dx/d; if(nx*(m[0])<0||(Math.abs(m[0])<1&&nx>0)){ nx=-nx; ny=-ny; } const bw=Math.min(42,d*0.16);
    const col=e.pd?TP.TEAL:TP.DASH, da=e.unv?'0.8 3':'3 3';
    G2.push(`<path d="M${n2(p[0])},${n2(p[1])} Q${n2(m[0]+nx*bw)},${n2(m[1]+ny*bw)} ${n2(q[0])},${n2(q[1])}" fill="none" stroke="${col}" stroke-width="${e.pd?1.2:0.9}" stroke-dasharray="${da}"${e.unv?' stroke-linecap="round"':''}/>`); }
  // label boxes (spacing pass: push apart anything that still overlaps; trunk labels and the root stay put)
  const boxes=new Map(); for(const x of S) boxes.set(x,boxOf(x,Y));
  const fixed=x=>isT(x)||x===rootId;
  for(let it=0;it<200;it++){ let moved=false; const ids=[...boxes.keys()];
    for(let i=0;i<ids.length;i++) for(let j=i+1;j<ids.length;j++){ const a=ids[i], b=ids[j]; if(fixed(a)&&fixed(b)) continue; const A=boxes.get(a), Bb=boxes.get(b); const gp=4;
      const ox=Math.min(A[0]+A[2],Bb[0]+Bb[2])-Math.max(A[0],Bb[0])+gp, oy=Math.min(A[1]+A[3],Bb[1]+Bb[3])-Math.max(A[1],Bb[1])+gp;
      if(ox>0&&oy>0){ moved=true; const dir=(A[0]+A[2]/2)>=(Bb[0]+Bb[2]/2)?1:-1; const fa=fixed(a)?0:fixed(b)?1:0.5, fb=1-fa; A[0]+=dir*ox*fa*0.6; Bb[0]-=dir*ox*fb*0.6; } }
    if(!moved) break; }
  // postdoc tags
  const G3=[];
  for(const t of pdTags){
    if(t.trunk){ const len=t.y0-t.y1; let fz=Math.min(8,0.8*len/Math.max(1,tw(TX.pdTag,1,'italic'))); const ym=(t.y0+t.y1)/2;
      if(fz>=4.6&&t.w>=fz+3){ const wv=tw(TX.pdTag,fz,'italic'); G3.push(`<text transform="translate(${n2(fz*0.34)} ${n2(fy(ym)+wv/2)}) rotate(-90)" x="0" y="0" font-family="${FONT}" font-size="${n2(fz)}" font-style="italic" fill="${TP.CREAM}">${xesc(TX.pdTag)}</text>`); }
      else { const fz2=7.5, wv=tw(TX.pdTag,fz2,'italic'); let best=null; for(const sd of [-1,1]){ const x0=sd>0?t.w/2+4:-t.w/2-4-wv; const bx=[x0,fy(ym)-fz2*0.7,wv,fz2]; const hit=[...boxes.values()].some(b=>b[0]<bx[0]+bx[2]+2&&bx[0]<b[0]+b[2]+2&&b[1]<bx[1]+bx[3]+2&&bx[1]<b[1]+b[3]+2); if(!hit){ best=x0; break; } }
        if(best!=null) G3.push(`<text x="${n2(best)}" y="${n2(fy(ym)+fz2*0.3)}" font-family="${FONT}" font-size="${fz2}" font-style="italic" fill="${TP.TEAL}">${xesc(TX.pdTag)}</text>`); } }
    else { const fz2=7.5, wv=tw(TX.pdTag,fz2,'italic'); const x0=t.dir>0?t.x+6:t.x-6-wv; G3.push(`<text x="${n2(x0)}" y="${n2(fy(t.y)+3)}" font-family="${FONT}" font-size="${fz2}" font-style="italic" fill="${TP.TEAL}">${xesc(TX.pdTag)}</text>`); boxes.set('pd'+t.x,[x0,fy(t.y)-5,wv,9]); } }
  // pills
  for(const x of S){ const b=lab.get(x), bx=boxes.get(x); const [x0,y0,w,h]=bx; const r=Math.min(10,h/2);
    const fill=b.sk?TP.SKF:TP.CREAM, stroke=b.hl?TP.OCHRE:b.sk?TP.SKE:TP.EDGE, sw=b.hl?(b.root?1.8:1.3):b.sk?0.9:0.6;
    if(scr) G3.push(`<g class="sp${b.root?' sp-root':''}" data-id="${x}" tabindex="0" role="button" aria-label="${xesc(clean(P.get(x).name))}">`);
    G3.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(r)}" ry="${n2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    let yy=y0+b.padY; for(const l of b.lines){ yy+=(l.gap||0); G3.push(`<text x="${n2(x0+(w-l.w)/2)}" y="${n2(yy+l.size*0.86+(l.lh-l.size*1.12)*0.5)}" font-family="${FONT}" font-size="${n2(l.size)}"${l.style==='italic'?' font-style="italic"':''} fill="${l.fill}">${xesc(l.t)}</text>`); yy+=l.lh; } if(scr) G3.push('</g>'); }
  // ----- page
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${TP.PAGE}"/>`);
  out.push(`<rect x="22" y="22" width="${n2(W-44)}" height="${n2(H-44)}" fill="none" stroke="${TP.FRAME}" stroke-width="0.8"/>`);
  out.push(`<rect x="27" y="27" width="${n2(W-54)}" height="${n2(H-54)}" fill="none" stroke="${TP.FRAME2}" stroke-width="0.4"/>`);
  T(W/2,M+62,title,ts,'normal',TP.INK,'middle');
  T(W/2,M+96,sub,ss,'italic',TP.INK2,'middle');
  const dy0=M+118; out.push(`<path d="M${n2(W/2-210)},${dy0} L${n2(W/2-14)},${dy0} M${n2(W/2+14)},${dy0} L${n2(W/2+210)},${dy0}" stroke="${TP.OCHRE}" stroke-width="0.8" fill="none"/>`);
  out.push(leaf(W/2-9,dy0,0,18,over('#8f9d62',0.85)));
  const treeSvg=(down?`<g transform="scale(1,-1)">${G2.join('')}</g>`:G2.join(''))+G3.join('');
  out.push(`<g transform="translate(${n2(GX)} ${n2(GY)}) scale(${s.toFixed(5)})">${treeSvg}</g>`);
  // legend
  if(LI.length&&!scr){ out.push(`<rect x="${n2(Lx)}" y="${n2(Ly)}" width="${n2(Lw)}" height="${n2(Lh)}" rx="8" ry="8" fill="${TP.CREAM}" stroke="${TP.FRAME}" stroke-width="0.7"/>`);
    { let xx=Lx+lpad; for(const ch of TX.legend){ xx+=T(xx,Ly+26,ch,12.5,'normal',TP.INK)+2.4; } }
    let yy=Ly+40; const tp2=(x,y,w0,w1,col)=>polyTaper(curvePts([[x,y+3],[x+14,y+1],[x+28,y],[x+lsw,y-2]],16),Array.from({length:17},(_,i)=>w0+(w1-w0)*i/16));
    for(const it of LI){ const sx=Lx+lpad, cy=yy+7;
      if(it.sw==='branch') out.push(`<path d="${tp2(sx,cy,6,2)}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`);
      else if(it.sw==='pd') out.push(`<path d="${tp2(sx,cy,6,4)}" fill="${TP.TEAL}"/>`);
      else if(it.sw==='rs') out.push(`<path d="M${n2(sx)},${n2(cy+3)} C${n2(sx+12)},${n2(cy+1.5)} ${n2(sx+24)},${n2(cy-1)} ${n2(sx+lsw)},${n2(cy-2.5)}" fill="none" stroke="${TP.RUST}" stroke-width="2.2" stroke-dasharray="6 3"/>`);
      else if(it.sw==='im') out.push(`<path d="M${n2(sx)},${n2(cy+3)} C${n2(sx+12)},${n2(cy+1.5)} ${n2(sx+24)},${n2(cy-1)} ${n2(sx+lsw)},${n2(cy-2.5)}" fill="none" stroke="${TP.VIOLET}" stroke-width="2.2" stroke-dasharray="0.1 4.2" stroke-linecap="round"/>`);
      else if(it.sw==='dash') out.push(`<path d="M${n2(sx)},${n2(cy+2)} Q${n2(sx+20)},${n2(cy-8)} ${n2(sx+lsw)},${n2(cy+2)}" fill="none" stroke="${TP.DASH}" stroke-width="0.9" stroke-dasharray="3 3"/>`);
      else if(it.sw==='unv'){ out.push(`<path d="${tp2(sx,cy,6,4)}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`); for(let k2=0;k2<5;k2++) out.push(`<circle cx="${n2(sx+5+k2*7.5)}" cy="${n2(cy+1.6-k2*0.8)}" r="1" fill="${TP.CREAM}"/>`); }
      else if(it.sw==='co') out.push(`<g transform="translate(${n2(sx)} ${n2(cy-7)})">${V_SW.co}</g>`);
      else if(it.sw==='hl') out.push(`<path d="M${n2(sx)},${n2(cy+1)} L${n2(sx+lsw)},${n2(cy+1)}" stroke="${TP.OCHRE}" stroke-width="2.2" stroke-linecap="round"/><rect x="${n2(sx+lsw/2-9)}" y="${n2(cy-6)}" width="18" height="14" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.OCHRE}" stroke-width="1.2"/>`);
      else if(it.sw==='sk') out.push(`<rect x="${n2(sx+4)}" y="${n2(cy-6)}" width="${lsw-8}" height="14" rx="5" ry="5" fill="${TP.SKF}" stroke="${TP.SKE}" stroke-width="0.9"/>`);
      else if(it.sw==='more') out.push(`<rect x="${n2(sx+4)}" y="${n2(cy-6)}" width="${lsw-8}" height="14" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.EDGE}" stroke-width="0.6"/>`);
      let ty=yy+11; for(const t of it.l1){ T(Lx+ltx,ty,t,L1,it.sw==='more'?'italic':'normal',it.sw==='more'?TP.INK3:TP.INK); ty+=13.4; } for(const t of it.l2){ T(Lx+ltx,ty-1,t,L2,'italic',TP.INK2); ty+=12; }
      yy+=it.h; } }
  flines.forEach((t,i)=>T(W/2,footTop+fs+i*flh,t,fs,'normal',TP.INK2,'middle'));
  let credit=null, logo=null; if(!scr){ let cs=creditSize(W,H); const cy=H-36; { const w0=tw(TX.credit,cs,'normal'); if(w0>midW) cs*=midW/w0; }
    const cw=T(W/2,cy,TX.credit,cs,'normal',CREDIT_COL,'middle'); credit=[W/2-cw/2,cy-cs,cw,cs*1.3];   // below the footer, above the inner frame
    const lg=logoSvg(LG,TX,lgX1,lgY1); out.push(lg.svg); logo=lg.box; }
  // ----- self check
  const issues=[]; const P2=(b)=>[GX+b[0]*s,GY+b[1]*s,b[2]*s,b[3]*s];
  const all=[...boxes.entries()];
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){ const A=all[i][1], Bb=all[j][1]; if(A[0]<Bb[0]+Bb[2]-0.5&&Bb[0]<A[0]+A[2]-0.5&&A[1]<Bb[1]+Bb[3]-0.5&&Bb[1]<A[1]+A[3]-0.5) issues.push('overlap '+all[i][0]+' '+all[j][0]); }
  for(const [x,b] of all){ const q=P2(b); if(q[0]<M-14||q[0]+q[2]>W-M+14||q[1]<areaT-6||q[1]+q[3]>footTop) issues.push('outside '+x); if(LI.length&&!scr&&q[0]<Lx+Lw&&q[0]+q[2]>Lx&&q[1]<Ly+Lh&&q[1]+q[3]>Ly) issues.push('legend overlaps '+x); }
  // branches running under a label that is not their own end
  for(const [x,c] of curveOf){ const p=g.par.get(x); const pts=curvePts(c,24).slice(2,-2).map(q=>[q[0],fy(q[1])]); for(const [y,b] of boxes){ if(y===x||y===p||typeof y!=='number') continue; if(pts.some(q=>q[0]>b[0]+2&&q[0]<b[0]+b[2]-2&&q[1]>b[1]+2&&q[1]<b[1]+b[3]-2)){ issues.push('branch '+p+'>'+x+' under '+y); } } }
  const svgInner=out.join('');
  if(/[\u2013\u2014]/.test(svgInner)) issues.push('dash in text');
  return {svgInner,W,H,s,issues,legendMode,title,flines,credit,logo,logoMm:LG?+(LG.u*(opts.logoK||1)*25.4/72).toFixed(1):null,nameSize:cfg.ns*s,centered:F.centered,extra:F.extra,treeSvg,legendItems:LI.map(it=>({sw:it.sw,t1:it.t1,t2:it.t2||''})),boxes:scr?boxes:null};
}

const TREE_FAMOUS=new Set([10480,55185]);  // with FAMOUS: also Kolmogorov and Liouville may be named in the legend when on the highlighted branch
const TREE_BASE={c1:0.3,c2:0.7,maxTiers:3,lean:16,dome:46,ns:13,ms:8.6,wmax:34,dom:0.5,affW:0.5,hgap:12,twig:20,stem:5,availW:1050,tgap:8,gmin:12,g0:14,gk:0.22,gmax:110,xmax:70,smax:1.3,nameW:150,stagger:false};
const TREE_CFGS=opts=>opts.treeCfgs||[{},{stagger:true},{stagger:true,availW:600},{stagger:true,availW:300},{nameW:120,stagger:true},{nameW:120,stagger:true,availW:400},{nameW:96,stagger:true,availW:400}];
async function buildTree(ctx,rootId,opts){
  const scr=!!opts.screen; let doc=null, tw;
  if(scr){ await loadFaces(); tw=canvasMeasure(); }
  else { const fonts=await loadLibs(); doc=newDoc(fonts,PAPER[opts.paper]?opts.paper:'A2'); tw=makeMeasure(doc); }
  const g=treeGraph(ctx,rootId,opts.gens,opts.postdoc!==false,opts.dir,opts.informal!==false,opts.research!==false);
  const fp=famousPath(ctx,g,rootId);
  /* orientation of the classic poster: the composition is laid out for the page shape (landscape: a lower, wider page);
     auto keeps portrait unless the tree does not fit at full size there and landscape gives larger names */
  const kOf=(paper,land)=>PAPER[paper][land?1:0]/1190.55;   // pt per design unit (the design page is 1190.55 wide)
  const runAll=(pageH,logoK)=>{ const o=Object.assign({},opts,pageH?{pageH}:{},{logoK:logoK||1}); let best=null; const tries=[];
  for(const c of TREE_CFGS(o)){ const cfg=Object.assign({},TREE_BASE,o.treeCfg||{},c,{lang:o.lang}); const lay=treeLayout(ctx,tw,g,fp,rootId,cfg); const comp=treeCompose(ctx,tw,g,fp,lay,rootId,o);
    const hard=comp.issues.filter(t=>!/^branch /.test(t)).length, soft=comp.issues.length-hard;
    const score=Math.min(comp.s,1)*(cfg.stagger?0.96:1)*(cfg.nameW>=150?1:cfg.nameW>=120?0.9:0.82)*(hard?0.8:1)*Math.pow(0.985,Math.min(soft,10))*(/^free/.test(comp.legendMode)||comp.legendMode==='none'?1:0.95); tries.push([cfg.nameW,cfg.stagger,cfg.availW,+comp.s.toFixed(3),comp.issues.length,comp.legendMode,+score.toFixed(3)]);
    if(!best||score>best.score) best={lay,comp,cfg,score,tries}; if(comp.s>=0.999&&!comp.issues.length) break; }
  return best; };
  let best, land=false;
  if(scr) best=runAll(null);
  else { const p0=PAPER[opts.paper]?opts.paper:'A2', [pa,pb]=PAPER[p0], hL=1190.55*pa/pb;   /* every A size has the same shape */
    if(opts.orient==='landscape'){ best=runAll(hL,kOf(p0,true)); land=true; }
    else { best=runAll(null,kOf(p0,false)); if(opts.orient!=='portrait'&&best.comp.s<0.999){ const b2=runAll(hL,kOf(p0,true)); if(b2.score*pb/pa>best.score){ best=b2; land=true; } /* scores in page units: the landscape page is pb/pa times wider */ } }
    /* paper 'auto': the composition does not depend on the A size (same shape), only its scale does,
       so take the smallest A size on which the names reach AUTO_MIN_PT, else A0 */
    const auto=!PAPER[opts.paper];
    if(auto){ const per=best.comp.nameSize/best.comp.W; let pk='A0';
      for(const q of ['A4','A3','A2','A1','A0']){ const w=land?PAPER[q][1]:PAPER[q][0]; if(per*w>=AUTO_MIN_PT){ pk=q; break; } }
      opts=Object.assign({},opts,{paper:pk,paperAuto:true});
      if(pk!==p0) best=runAll(land?hL:null,kOf(pk,land)); }   /* the logo keeps its size in mm: composed again for the room it takes on this sheet */
    if(land||auto) doc=newDoc(await loadLibs(),opts.paper,land); }
  const {comp,lay}=best, tries=best.tries;
  if(scr) return {treeSvg:comp.treeSvg,legend:comp.legendItems,boxes:comp.boxes,g,fp,trunk:lay.trunk,title:comp.title,issues:comp.issues};
  const [PW,PH]=land?[PAPER[opts.paper][1],PAPER[opts.paper][0]]:PAPER[opts.paper]; const k=PW/comp.W;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(PW)}pt" height="${n2(PH)}pt" viewBox="0 0 ${n2(PW)} ${n2(PH)}"><g transform="scale(${k.toFixed(6)})">${comp.svgInner}</g></svg>`;
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
  holder.innerHTML=svg; document.body.appendChild(holder);
  doc.setFont(FONT,'normal'); doc.setFontSize(12);
  try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:PW,height:PH}); } finally { holder.remove(); }
  const p=ctx.people.get(rootId);
  if(comp.credit&&!opts.svgOnly) try{ const c=comp.credit; doc.link(c[0]*k,c[1]*k,c[2]*k,c[3]*k,{url:CREDIT_URL}); }catch(e){}
  if(comp.logo&&!opts.svgOnly) try{ const c=comp.logo; doc.link(c[0]*k,c[1]*k,c[2]*k,c[3]*k,{url:CREDIT_URL}); }catch(e){}
  const TX=L10N[opts.lang]; doc.setProperties({title:comp.title,subject:TX.subject,creator:'slovenskivedci.sk/rodokmen',author:'Peter Richtárik, slovenskivedci.sk'});
  const filename=`${fileSlug(p.name)}_${g.dir==='down'?TX.dFile:TX.file}_${opts.paper}${land?(opts.lang==='en'?'_landscape':'_na_sirku'):''}.pdf`;
  const report={style:'strom',lang:opts.lang,dir:g.dir,tries,filename,paper:opts.paper,paperAuto:!!opts.paperAuto,landscape:land,pageW:PW,pageH:PH,people:g.S.size,ancestors:g.ALL.size-1,omitted:g.ALL.size-g.S.size,generations:Math.max(...[...g.S].map(x=>g.gmin.get(x))),
    trunk:lay.trunk.map(x=>ctx.people.get(x).name),highlight:fp.path.map(x=>ctx.people.get(x).name),highlightMode:fp.mode,highlightTarget:fp.target!=null?ctx.people.get(fp.target).name:null,highlightDesc:fp.d,
    extraLinks:g.extra.length,postdoc:g.usePd,pdEdges:g.pdEdges,scale:+(comp.s*k).toFixed(4),nameSizePt:+(comp.nameSize*k).toFixed(2),metaSizePt:+(lay.cfg.ms*comp.s*k).toFixed(2),legend:comp.legendMode,centered:comp.centered,
    staggeredRows:lay.tiers.filter(t=>t>1).length,issues:comp.issues,logo:{mm:comp.logoMm,box:comp.logo&&comp.logo.map(v=>+(v*k).toFixed(1))},cfg:{nameW:best.cfg.nameW,stagger:best.cfg.stagger,availW:best.cfg.availW},footer:comp.flines,title:comp.title};
  return {doc,filename,svg,report};
}

/* =====================================================================
   VIEW EXPORT ("Stiahnuť PDF" in the Strom view): a poster of the tree shown in the view
   The same tree as on screen (person, direction, generations, postdoc links; the same graph, drawing and labels),
   laid out again for the sheet: the scene is re-flowed for the aspect of the poster's tree area in portrait and in
   landscape, and the orientation with the larger scale wins. Paper: A2 when the names stay readable there, else A0
   (or the size chosen by the user). Vectors via svg2pdf, with a title, the legend and a footer. A tree too large even
   for A0 gets an overview page followed by detail sections in reading order (overlapping a little, empty ones left
   out), each with a locator map.
   ===================================================================== */
const V_XMAX=220;   // rows may spread further apart than on screen (TREE_BASE.xmax) so that the tree fills the sheet
const PAPER_ALL={A4:[595.28,841.89],A3:[841.89,1190.55],A2:[1190.55,1683.78],A1:[1683.78,2383.94],A0:[2383.94,3370.39]};
const V_NAME=13;               // design size of a name in the tree (TREE_BASE.ns)
const V_GOOD=7, V_MIN=4, V_TILE=5, V_MAX=24;   // printed name size in pt on A2 (A0: V_MAX x2, so 48 pt at most): readable on A2, smallest accepted on A0, in detail sections, largest
Object.assign(L10N.sk,{
  vDir:{up:'predkovia',down:'potomkovia'},
  vGen:(g,mx)=>g>=mx?(g===1?'1 generácia':`všetky ${g} ${pl(g,'generácia','generácie','generácií')}`):`${g} ${pl(g,'generácia','generácie','generácií')} z ${mx}`,
  vPeople:n=>`${nfmt(n,'sk')} ${pl(n,'osoba','osoby','osôb')}`,
  vPd:{up:'vrátane postdoktorandských školiteľov',down:'vrátane postdoktorandov'}, vNoPd:'bez postdoktorandských väzieb',
  vHl:t=>t.replace(/^Zvýraznená vetva:/,'Zvýraznená hlavná línia:'),
  vMade:(d,data)=>`vytvorené ${d}`+(data?` · údaje k ${data}`:''), vPage:(i,n)=>`strana ${i} z ${n}`,
  vOverview:n=>`Celý strom na jednej strane; na ďalších stranách ${n===1?'nasleduje 1 podrobný výrez':`nasleduje ${n} ${pl(n,'podrobný výrez','podrobné výrezy','podrobných výrezov')}`} (čísla v rámčekoch).`,
  vPart:(i,n,r,c)=>`výrez ${i} z ${n} (riadok ${r}, stĺpec ${c})`, vStrom:'strom', vNone:{up:'školitelia zatiaľ nie sú známi',down:'doktorandi zatiaľ nie sú známi'}
});
Object.assign(L10N.en,{
  vDir:{up:'ancestors',down:'descendants'},
  vGen:(g,mx)=>g>=mx?(g===1?'1 generation':`all ${g} generations`):`${g} of ${mx} generations`,
  vPeople:n=>`${nfmt(n,'en')} ${n===1?'person':'people'}`,
  vPd:{up:'including postdoc advisors',down:'including postdocs'}, vNoPd:'without postdoc links',
  vHl:t=>t.replace(/^Highlighted branch:/,'Highlighted main line:'),
  vMade:(d,data)=>`created ${d}`+(data?` · data as of ${data}`:''), vPage:(i,n)=>`page ${i} of ${n}`,
  vOverview:n=>`The whole tree on one page; ${n===1?'1 detailed section follows':`${n} detailed sections follow`} (numbered frames).`,
  vPart:(i,n,r,c)=>`section ${i} of ${n} (row ${r}, column ${c})`, vStrom:'', vNone:{up:'no advisors known yet',down:'no doctoral students known yet'}
});
/* legend swatches: the same drawings as the legend of the screen view (36 x 14 units) */
const V_BR='#726143';
const vTaper=c=>`<path d="M1,9.5 C12,8 24,6 35,5 L35,7.5 C24,8.5 12,11.5 1,13 Z" fill="${c}"/>`;
const V_SW={hl:`<path d="M1,8H35" stroke="${TP.OCHRE}" stroke-width="2.2" stroke-linecap="round"/><rect x="9" y="1.5" width="18" height="12" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.OCHRE}" stroke-width="1.2"/>`,
  branch:vTaper(V_BR), pd:vTaper(TP.TEAL), rs:`<path d="M1,11 C12,9.5 24,7 35,5.5" fill="none" stroke="${TP.RUST}" stroke-width="2.2" stroke-dasharray="6 3"/>`, im:`<path d="M1,11 C12,9.5 24,7 35,5.5" fill="none" stroke="${TP.VIOLET}" stroke-width="2.2" stroke-dasharray="0.1 4.2" stroke-linecap="round"/>`, dash:`<path d="M1,10 Q18,0 35,10" fill="none" stroke="${TP.DASH}" stroke-width="1" stroke-dasharray="3 3"/>`,
  co:vTaper(V_BR)+`<path d="M1,11 C12,9.5 24,7.5 35,6.3" fill="none" stroke="${TP.PAGE}" stroke-width="9" stroke-dasharray="3.5 7" stroke-dashoffset="-6"/>`,
  unv:vTaper(V_BR)+[5,12.5,20,27.5].map((x,i)=>`<circle cx="${x}" cy="${10.6-i*1}" r="1" fill="${TP.CREAM}"/>`).join(''),
  sk:`<rect x="4" y="1.5" width="28" height="12" rx="5" ry="5" fill="${TP.SKF}" stroke="${TP.SKE}" stroke-width="0.9"/>`,
  more:`<rect x="4" y="1.5" width="28" height="12" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.EDGE}" stroke-width="0.7"/>`};

/* the scene off screen: its bounding box and every top-level piece with its box (tree coordinates, y down) */
function sceneParts(treeSvg){
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:800px;height:800px;overflow:hidden;visibility:hidden';
  holder.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800"><g>${treeSvg}</g></svg>`;
  document.body.appendChild(holder);
  try{
    const g=holder.querySelector('svg > g'), parts=[];
    let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
    const add=(el,mir)=>{ const b=el.getBBox(); const box=mir?[b.x,-(b.y+b.height),b.x+b.width,-b.y]:[b.x,b.y,b.x+b.width,b.y+b.height];
      parts.push({html:el.outerHTML,box,mir,pill:!mir&&el.classList.contains('sp')});
      if(b.width||b.height){ x0=Math.min(x0,box[0]); y0=Math.min(y0,box[1]); x1=Math.max(x1,box[2]); y1=Math.max(y1,box[3]); } };
    for(const el of [...g.children]){
      if(el.tagName.toLowerCase()==='g'&&/scale\(1,\s*-1\)/.test(el.getAttribute('transform')||'')) for(const c of [...el.children]) add(c,true);
      else add(el,false); }
    const pad=6; return {parts,bb:[x0-pad,y0-pad,x1-x0+2*pad,y1-y0+2*pad]};
  } finally { holder.remove(); }
}
/* tree markup for a window of the tree (null: all of it); consecutive mirrored pieces go back into one mirrored group */
function partsSvg(parts,win){
  const out=[]; let inMir=false;
  for(const p of parts){ if(win&&(p.box[2]<win[0]||p.box[0]>win[2]||p.box[3]<win[1]||p.box[1]>win[3])) continue;
    if(p.mir!==inMir){ out.push(p.mir?'<g transform="scale(1,-1)">':'</g>'); inMir=p.mir; }
    out.push(p.html); }
  if(inMir) out.push('</g>');
  return out.join('');
}
/* page frame: header, legend and footer for a W x H page (pt); returns the tree area */
function vFrame(tw,TX,W,H,legend,mapW){
  const k=Math.min(W,H)/1190.55, m=40*k;
  const ts=Math.max(34*k,20), ss=Math.max(15*k,10), ls=Math.max(11*k,7.5), ls2=Math.max(9.6*k,6.8), fs=creditSize(W,H), sw=36*k, gapX=26*k;
  const yTitle=m+ts*0.8, ySub=yTitle+ss*1.75, yRule=ySub+ss*0.9;
  const maxT=W-2*m-(mapW?mapW+12*k:0);
  // legend items flow left to right in rows
  const items=legend.map(it=>{ const t1w=Math.min(W-2*m-sw-6*k,it.sw==='hl'?760*k:300*k);
    const l1=wrapText(tw,it.t1,ls,'normal',t1w), l2=it.t2?wrapText(tw,it.t2,ls2,'italic',t1w):[];
    let w=0; for(const t of l1) w=Math.max(w,tw(t,ls,'normal')); for(const t of l2) w=Math.max(w,tw(t,ls2,'italic'));
    return {sw:it.sw,l1,l2,w:sw+6*k+w,h:l1.length*ls*1.25+l2.length*ls2*1.25}; });
  let x=m, y=yRule+9*k, rowH=0; const placed=[];
  for(const it of items){ if(x>m&&x+it.w>W-m){ x=m; y+=rowH+5*k; rowH=0; } placed.push(Object.assign(it,{x,y})); x+=it.w+gapX; rowH=Math.max(rowH,it.h); }
  const legBottom=items.length?y+rowH:yRule;
  // footer: the logo in the bottom right corner, the credit and the date on two lines at the left, a rule above the band
  const LG=logoSize(tw,TX,logoMarkPt(W,H)), yFR=H-m-Math.max(LG.h,fs*2.45)-0.35*LG.h;
  const area=[m,legBottom+12*k,W-m,yFR-0.9*fs];
  return {k,m,ts,ss,ls,ls2,fs,sw,yTitle,ySub,yRule,maxT,placed,area,LG,yFR};
}
function vPageSvg(tw,TX,F,W,H,o){
  const {k,m,ts,ss,ls,ls2,fs,sw}=F, out=[];
  const T=(x,y,t,size,style,fill,anchor)=>{ const w=tw(t,size,style); const x0=anchor==='middle'?x-w/2:anchor==='end'?x-w:x; out.push(`<text x="${n2(x0)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''} fill="${fill||TP.INK}">${xesc(t)}</text>`); return w; };
  out.push(`<rect x="0" y="0" width="${n2(W)}" height="${n2(H)}" fill="${TP.PAGE}"/>`);
  // title and subtitle (shrunk to fit)
  let t1=ts; { const w=tw(o.title,t1,'normal'); if(w>F.maxT) t1*=F.maxT/w; }
  let s1=ss; { const w=tw(o.sub,s1,'italic'); if(w>F.maxT) s1*=F.maxT/w; }
  T(m,F.yTitle,o.title,t1,'normal',TP.INK); T(m,F.ySub,o.sub,s1,'italic',TP.INK2);
  out.push(`<path d="M${n2(m)},${n2(F.yRule)} L${n2(W-m)},${n2(F.yRule)}" stroke="${TP.FRAME}" stroke-width="${n2(0.7*k)}" fill="none"/>`);
  // legend
  for(const it of F.placed){ const sc=sw/36; out.push(`<g transform="translate(${n2(it.x)} ${n2(it.y+ls*0.55-7*sc)}) scale(${n2(sc)})">${V_SW[it.sw]||''}</g>`);
    let yy=it.y+ls*0.95; for(const t of it.l1){ T(it.x+sw+6*k,yy,t,ls,it.sw==='more'?'italic':'normal',it.sw==='more'?TP.INK3:TP.INK); yy+=ls*1.25; }
    for(const t of it.l2){ T(it.x+sw+6*k,yy,t,ls2,'italic',TP.INK2); yy+=ls2*1.25; } }
  // tree
  out.push(o.tree);
  // footer: rule, credit and date at the left, the logo at the right (both end on the bottom margin)
  const yF=H-m, LG=F.LG;
  out.push(`<path d="M${n2(m)},${n2(F.yFR)} L${n2(W-m)},${n2(F.yFR)}" stroke="${TP.FRAME}" stroke-width="${n2(0.5*k)}" fill="none"/>`);
  let f1=fs; { const room=W-2*m-LG.w-LG.gap*2, w=Math.max(tw(o.footL,fs,'normal'),tw(o.footR,fs,'normal')); if(w>room) f1*=room/w; }
  const wl=T(m,yF-f1*1.45,o.footL,f1,'normal',CREDIT_COL); T(m,yF,o.footR,f1,'normal',CREDIT_COL);
  const lg=logoSvg(LG,TX,W-m,yF); out.push(lg.svg);
  return {svg:out.join(''),link:{x:m,y:yF-f1*2.45,w:wl,h:f1*1.3},logo:lg.box};
}
async function buildView(ctx,rootId,opts){
  opts=Object.assign({lang:'sk',paper:'auto'},opts||{}); const lang=L10N[opts.lang]?opts.lang:'sk', TX=L10N[lang];
  const so=Object.assign({gens:6,dir:'up',postdoc:true},opts.sceneOpts||{}); delete so.pageH;
  const say=t=>{ if(opts.progress) try{ opts.progress(t); }catch(e){} };
  await loadFaces();
  const fonts=await loadLibs();
  // measuring with the PDF's own fonts
  const probe=(()=>{ const {jsPDF}=window.jspdf; const d=new jsPDF({unit:'pt',format:'a4',compress:true}); [['EBG-R.ttf','normal'],['EBG-B.ttf','bold'],['EBG-I.ttf','italic']].forEach(([f,st],i)=>{ d.addFileToVFS(f,fonts[i]); d.addFont(f,FONT,st); }); return d; })();
  const tw=makeMeasure(probe);
  // the graph and its legend do not depend on the layout: taken from the screen's scene (or an English one), then one layout per orientation
  const sc0=opts.scene&&lang==='sk'?opts.scene:await scene(ctx,rootId,Object.assign({},so,{lang}));
  const dir=sc0.g.dir, P=ctx.people, rootP=P.get(rootId), name=clean(rootP.name), n=sc0.g.S.size-(sc0.g.nIm||0);
  const gen=lang==='sk'?genitive(rootP.name,ctx.isFemale(rootP)):null;
  const title=(dir==='down'?TX.dTitle:TX.title)(name,gen);
  const G=opts.gens||so.gens, MX=Math.max(G,opts.maxGen||G);
  const sub=(n>1?[TX.vDir[dir],TX.vGen(G,MX),TX.vPeople(n)]:[TX.vDir[dir],TX.vNone[dir]]).concat([so.postdoc!==false?TX.vPd[dir]:TX.vNoPd]).join(' · ');
  const legend=sc0.legend.map(it=>({sw:it.sw,t1:it.sw==='hl'?TX.vHl(it.t1):it.t1,t2:it.t2||''}));
  const today=opts.today||new Date(); const dt=(ctx.generated||'').split('-');
  const dToday=TX.date(today.getFullYear(),today.getMonth()+1,today.getDate()), dData=dt.length===3?TX.date(+dt[0],+dt[1],+dt[2]):'';
  const url='slovenskivedci.sk/rodokmen/'+(opts.query||'')+(opts.hash?'#'+opts.hash:'');
  // re-flow: the scene laid out for the aspect of the tree area of the sheet (screen-mode page of width 1190.55:
  // its tree area is 1078.55 wide and pageH-130.5 high), in portrait and in landscape
  const frameOf=(paper,land)=>{ const [a,b]=PAPER_ALL[paper]; const W=land?b:a, H=land?a:b; return {paper,land,W,H,F:vFrame(tw,TX,W,H,legend,0)}; };
  const lay={};
  for(const land of [false,true]){ const f=frameOf('A2',land), A=f.F.area, r=(A[3]-A[1])/(A[2]-A[0]);
    const sc=await scene(ctx,rootId,Object.assign({},so,{lang,pageH:130.5+1078.55*r,treeCfg:{xmax:V_XMAX}}));
    lay[land]=Object.assign({sc},sceneParts(sc.treeSvg)); }
  const fitOn=(paper,land)=>{ const f=frameOf(paper,land), L=lay[land], [,,bw,bh]=L.bb, A=f.F.area, k=f.F.k;
    const s=Math.min((A[2]-A[0])/bw,(A[3]-A[1])/bh,V_MAX*(Math.min(f.W,f.H)/1190.55)/V_NAME); /* names at most 24 pt on A2, 48 pt on A0, 12 pt on A4 */ return Object.assign(f,{L,s,name:s*V_NAME}); };
  // orientation: the larger scale (ties: less empty paper)
  const orient=paper=>{ if(opts.orient==='portrait') return fitOn(paper,false); if(opts.orient==='landscape') return fitOn(paper,true); const a=fitOn(paper,false), b=fitOn(paper,true); if(Math.abs(b.s-a.s)>0.002*a.s) return b.s>a.s?b:a;
    const fill=c=>{ const A=c.F.area; return c.L.bb[2]*c.L.bb[3]*c.s*c.s/((A[2]-A[0])*(A[3]-A[1])); }; return fill(b)>fill(a)?b:a; };
  let pick;
  /* paper 'auto' (the default): always one page, on the smallest A size where the names reach AUTO_MIN_PT, else one A0 page;
     overview + detail pages only for a fixed size chosen by the reader that is too small */
  const auto=!PAPER_ALL[opts.paper];
  if(!auto) pick=orient(opts.paper);
  else { for(const q of ['A4','A3','A2','A1','A0']){ pick=orient(q); if(pick.name>=AUTO_MIN_PT) break; } }
  const {parts,bb}=pick.L, pills=parts.filter(p=>p.pill).map(p=>p.box);
  const [bx,by,bw,bh]=bb;
  const tiled=!auto&&pick.name<V_MIN;
  // detail sections: same paper and orientation, names at V_TILE pt
  let tiles=[], st=V_TILE/V_NAME, tileF=null, mapW=0;
  if(tiled){
    const W=pick.W, H=pick.H, k=pick.F.k;
    mapW=Math.max(60*k,Math.min(260*k,(pick.F.yRule-pick.F.m)*Math.max(1,bw/bh)));
    tileF=vFrame(tw,TX,W,H,legend,mapW);
    const aw=tileF.area[2]-tileF.area[0], ah=tileF.area[3]-tileF.area[1];
    const tW=aw/st, tH=ah/st, ov=0.06, sx=tW*(1-ov), sy=tH*(1-ov);
    const cols=bw<=tW?1:Math.ceil((bw-tW)/sx)+1, rows=bh<=tH?1:Math.ceil((bh-tH)/sy)+1;
    const ox=bx-((tW+(cols-1)*sx)-bw)/2, oy=by-((tH+(rows-1)*sy)-bh)/2;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){ const win=[ox+c*sx,oy+r*sy,ox+c*sx+tW,oy+r*sy+tH];
      // only sections that hold the middle of at least one name (a name cut at the edge is whole in the neighbouring section)
      if(pills.some(b=>{ const cx=(b[0]+b[2])/2, cy=(b[1]+b[3])/2; return cx>=win[0]&&cx<win[2]&&cy>=win[1]&&cy<win[3]; })) tiles.push({r:r+1,c:c+1,win}); }
  }
  const nPages=1+tiles.length;
  // document
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({unit:'pt',format:[Math.min(pick.W,pick.H),Math.max(pick.W,pick.H)],orientation:pick.land?'landscape':'portrait',compress:true});
  [['EBG-R.ttf','normal'],['EBG-B.ttf','bold'],['EBG-I.ttf','italic']].forEach(([f,st2],i)=>{ doc.addFileToVFS(f,fonts[i]); doc.addFont(f,FONT,st2); });
  doc.setFont(FONT,'normal');
  const W=pick.W, H=pick.H;
  const footL=TX.credit;   // the credit (the link opens this view)
  const footR=i=>TX.vMade(dToday,dData)+(nPages>1?' · '+TX.vPage(i,nPages):'');
  const render=async(svgInner,link,i,logo)=>{
    if(i>1) doc.addPage([Math.min(W,H),Math.max(W,H)],pick.land?'landscape':'portrait');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(W)}pt" height="${n2(H)}pt" viewBox="0 0 ${n2(W)} ${n2(H)}">${svgInner}</svg>`;
    const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
    holder.innerHTML=svg; document.body.appendChild(holder);
    doc.setFont(FONT,'normal'); doc.setFontSize(12);
    try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:W,height:H}); } finally { holder.remove(); }
    try{ doc.link(link.x,link.y,link.w,link.h,{url:'https://www.'+url}); }catch(e){}
    if(logo&&!opts.svgOnly) try{ doc.link(logo[0],logo[1],logo[2],logo[3],{url:CREDIT_URL}); }catch(e){}
  };
  const svgs=[];
  // page 1: the whole tree
  { const F=pick.F, A=F.area, s=pick.s; const aw=A[2]-A[0], ah=A[3]-A[1];
    const GX=A[0]+(aw-bw*s)/2-bx*s, GY=A[1]+(ah-bh*s)/2-by*s;
    let tree=`<g transform="translate(${n2(GX)} ${n2(GY)}) scale(${s.toFixed(5)})">${partsSvg(parts,null)}</g>`;
    if(tiled){ const kk=F.k; tree+=`<defs><clipPath id="vtf"><rect x="0" y="0" width="${n2(W)}" height="${n2(F.yFR-0.5*F.fs)}"/></clipPath></defs><g clip-path="url(#vtf)">`;   // the section frames stop above the footer (logo)
      tiles.forEach((t,i)=>{ const [x0,y0,x1,y1]=t.win; const X0=GX+x0*s, Y0=GY+y0*s, w=(x1-x0)*s, h=(y1-y0)*s;
      tree+=`<rect x="${n2(X0)}" y="${n2(Y0)}" width="${n2(w)}" height="${n2(h)}" fill="none" stroke="${TP.OCHRE}" stroke-width="${n2(1.2*kk)}" stroke-dasharray="${n2(6*kk)} ${n2(4*kk)}"/>`;
      const lb=String(i+1), fz=16*kk, lw=tw(lb,fz,'normal')+8*kk;
      tree+=`<rect x="${n2(X0+2*kk)}" y="${n2(Y0+2*kk)}" width="${n2(lw)}" height="${n2(fz*1.3)}" rx="${n2(3*kk)}" ry="${n2(3*kk)}" fill="${TP.CREAM}" stroke="${TP.OCHRE}" stroke-width="${n2(0.8*kk)}"/><text x="${n2(X0+2*kk+4*kk)}" y="${n2(Y0+2*kk+fz*1.0)}" font-family="${FONT}" font-size="${n2(fz)}" fill="${TP.INK}">${lb}</text>`; }); tree+='</g>'; }
    const sub1=tiled?sub+' · '+TX.vOverview(tiles.length):sub;
    svgs.push(vPageSvg(tw,TX,F,W,H,{title,sub:sub1,tree,footL,footR:footR(1)})); }
  // detail sections
  tiles.forEach((t,i)=>{ const F=tileF, A=F.area, [x0,y0,x1,y1]=t.win;
    const GX=A[0]-x0*st, GY=A[1]-y0*st, cid='vc'+i;
    const tree=`<defs><clipPath id="${cid}"><rect x="${n2(A[0])}" y="${n2(A[1])}" width="${n2(A[2]-A[0])}" height="${n2(A[3]-A[1])}"/></clipPath></defs>`+
      `<g clip-path="url(#${cid})"><g transform="translate(${n2(GX)} ${n2(GY)}) scale(${st.toFixed(5)})">${partsSvg(parts,[x0-2,y0-2,x1+2,y1+2])}</g></g>`;
    // locator map in the header: every name as a dot, the sections as frames, this one filled
    const mh=F.yRule-F.m-4*F.k, ms=Math.min(mapW/bw,mh/bh), mw=bw*ms, mx0=W-F.m-mw, my0=F.m;
    let map=`<rect x="${n2(mx0)}" y="${n2(my0)}" width="${n2(mw)}" height="${n2(bh*ms)}" fill="${TP.CREAM}" stroke="${TP.FRAME}" stroke-width="${n2(0.5*F.k)}"/>`;
    map+=`<rect x="${n2(mx0+(x0-bx)*ms)}" y="${n2(my0+(y0-by)*ms)}" width="${n2((x1-x0)*ms)}" height="${n2((y1-y0)*ms)}" fill="${over(TP.OCHRE,0.28)}"/>`;
    for(const b of pills) map+=`<rect x="${n2(mx0+(b[0]-bx)*ms)}" y="${n2(my0+(b[1]-by)*ms)}" width="${n2(Math.max(0.6,(b[2]-b[0])*ms))}" height="${n2(Math.max(0.6,(b[3]-b[1])*ms))}" fill="${TP.INK2}"/>`;
    map+=`<rect x="${n2(mx0+(x0-bx)*ms)}" y="${n2(my0+(y0-by)*ms)}" width="${n2((x1-x0)*ms)}" height="${n2((y1-y0)*ms)}" fill="none" stroke="${TP.OCHRE}" stroke-width="${n2(0.9*F.k)}"/>`;
    svgs.push(vPageSvg(tw,TX,F,W,H,{title,sub:TX.vPart(i+1,tiles.length,t.r,t.c)+' · '+sub,tree:tree+map,footL,footR:footR(i+2)})); });
  for(let i=0;i<svgs.length;i++){ say(nPages>1?i+1+'/'+nPages:''); await render(svgs[i].svg,svgs[i].link,i+1,svgs[i].logo); }
  doc.setProperties({title,subject:TX.subject,creator:'slovenskivedci.sk/rodokmen',author:'Peter Richtárik, slovenskivedci.sk'});
  const paperName=pick.paper+(pick.land?(lang==='en'?'_landscape':'_na_sirku'):(lang==='en'?'_portrait':'_na_vysku'));
  const filename=[fileSlug(rootP.name),dir==='down'?TX.dFile:TX.file,TX.vStrom,'g'+G,so.postdoc===false?(lang==='en'?'no_postdoc':'bez_postdoc'):'',paperName].filter(Boolean).join('_')+'.pdf';
  const report={lang,dir,gens:G,maxGen:MX,postdoc:so.postdoc!==false,people:n,paper:pick.paper,paperAuto:auto,landscape:pick.land,pageW:W,pageH:H,scale:+pick.s.toFixed(4),nameSizePt:+pick.name.toFixed(2),
    pages:nPages,issues:pick.L.sc.issues,logo:{mm:+(pick.F.LG.u*25.4/72).toFixed(1),box:svgs[0].logo.map(v=>+v.toFixed(1))},tiles:tiles.map(t=>[t.r,t.c]),tileNameSizePt:tiled?V_TILE:null,bbox:bb.map(v=>Math.round(v)),title,sub,legend:legend.map(l=>l.sw),filename};
  return {doc,filename,report,svgs:svgs.map(x=>x.svg)};
}
async function downloadView(ctx,rootId,opts){ const r=await buildView(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.lastView={report:r.report}; return r.report; }

/* ---------- public ---------- */
async function build(ctx,rootId,opts){
  opts=Object.assign({gens:14,paper:'A2',lang:'sk'},opts||{}); if(!PAPER[opts.paper]&&opts.paper!=='auto') opts.paper='A2'; if(!L10N[opts.lang]) opts.lang='sk';
  return buildTree(ctx,rootId,opts);
}
async function download(ctx,rootId,opts){ const r=await build(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.last={report:r.report,svg:r.svg}; return r.report; }
async function scene(ctx,rootId,opts){ return buildTree(ctx,rootId,Object.assign({gens:6,paper:'A2',lang:'sk'},opts||{},{screen:true})); }
window.RodokmenPrint={build,download,scene,buildView,downloadView,preload:loadLibs,langs:LANGS,_t:{L10N,genitive,schoolShort,surname,fileSlug,treeGraph,famousPath,sceneParts}};
})();
