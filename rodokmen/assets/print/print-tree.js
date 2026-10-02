/* Rodokmeň slovenskej matematiky: printable ancestor tree poster (vector PDF, A2 or A3).
   Loaded on demand from rodokmen/index.html when "Vytlačiť rodokmeň predkov" is clicked.
   One style, an organic tree (see ORGANIC TREE POSTER below); rendered as SVG and converted to PDF
   with jsPDF + svg2pdf.js, EB Garamond embedded. Postdoc advisor links (ctx.pdAdvisorsOf) are included
   unless opts.postdoc===false and drawn in teal. opts.lang: 'sk' (default) or 'en' (poster language; names
   and thesis titles are never translated).
   opts.dir==='down' draws the academic descendants instead (students hang below the person, same layout mirrored).
   RodokmenPrint.scene() runs the same graph, layout and drawing for the interactive "Strom" view
   (no PDF: text measured on a canvas with the same EB Garamond, the tree returned as SVG markup).
   RodokmenPrint.downloadView() prints the tree of the "Strom" view as a poster PDF ("Stiahnuť PDF", see VIEW EXPORT). */
(function(){
'use strict';
const BASE=((document.currentScript&&document.currentScript.src)||'').replace(/[^/]*$/,'')||'assets/print/';
const FONT='EBGaramond';
const PAPER={A2:[1190.55,1683.78],A3:[841.89,1190.55]};
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
function newDoc(fonts,paper){
  const {jsPDF}=window.jspdf; const [W,H]=PAPER[paper];
  const doc=new jsPDF({unit:'pt',format:[W,H],orientation:'portrait',compress:true});
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
const TP={VIOLET:'#6e4fb3',INK:'#3b3026',INK2:'#7a6c5b',INK3:'#9d907c',TEAL:'#3d8c84',OCHRE:'#c08f2a',CREAM:'#fbf8ef',PAGE:'#fcfaf3',DASH:'#8a7a62',EDGE:'#bfb193',
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
  lBranch:'Vetva: školiteľ (vyššie) a doktorand', lPd:'Postdoktorandský školiteľ a postdoktorand', lPd2:'', lIm:'Neformálny mentor', lIm2:'(výrazný vplyv na výskum pred doktorátom u iného školiteľa; nezapočítava sa do počtu osôb)',
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
  lBranch:'Branch: PhD advisor (above) of a student', lPd:'Postdoc link', lPd2:'(postdoc advisor above)', lIm:'Informal mentor', lIm2:'(strong research influence before a PhD with another advisor; not included in the head count)',
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
function rng(seed){ let s=(seed>>>0)||0x9e3779b9; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const addExt=(m,l,e)=>{ const a=m.get(l); if(!a) m.set(l,[e[0],e[1]]); else { if(e[0]<a[0]) a[0]=e[0]; if(e[1]>a[1]) a[1]=e[1]; } };

function treeGraph(ctx,rootId,G,usePd,dir){
  const P=ctx.people, down=dir==='down';   // down: the "advisors" of the layout are the students (descendants tree)
  const advPhd=down?id=>(ctx.studentsOf?ctx.studentsOf(id):[]).filter(s=>s!==id&&P.has(s)):id=>{ const p=P.get(id); return p?p.adv.filter(a=>P.has(a)&&a!==id):[]; };
  const pdOf=down?ctx.pdStudentsOf:ctx.pdAdvisorsOf;
  const advOrd=usePd&&pdOf?id=>{ const a=advPhd(id); return a.concat(pdOf(id).filter(x=>x!==id&&!a.includes(x))); }:advPhd;
  const isPd=(x,a)=>usePd&&!advPhd(x).includes(a);
  const src=(x,a)=>ctx.edgeSrc?((down?ctx.edgeSrc(a,x):ctx.edgeSrc(x,a))||''):'';
  /* informal mentor links (ctx.imStudentsOf/imMentorsOf): dotted violet leaves, never followed further and not counted as people */
  const imOf=down?ctx.imStudentsOf:ctx.imMentorsOf, IM=new Set();
  const gmin=new Map([[rootId,0]]), par=new Map(); const q=[rootId];
  for(let i=0;i<q.length;i++){ const x=q[i]; if(IM.has(x)) continue; for(const a of advOrd(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); }
    if(imOf) for(const a of imOf(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); IM.add(a); } }
  const ALL=new Set(gmin.keys()); const order=q.filter(x=>gmin.get(x)<=G); const S=new Set(order);
  const kids=new Map(order.map(x=>[x,[]]));
  for(const x of order) if(x!==rootId) kids.get(par.get(x)).push(x);
  const edge=new Map(); for(const x of order) if(x!==rootId){ const p=par.get(x); if(IM.has(x)){ edge.set(x,{im:true,pd:false,unv:false,co:false}); continue; } const pdE=isPd(p,x); edge.set(x,{pd:pdE,unv:UNV_TREE.test(src(p,x)),co:!pdE&&!!ctx.isCoEdge&&(down?ctx.isCoEdge(x,p):ctx.isCoEdge(p,x))}); }
  const extra=[]; for(const x of order) if(!IM.has(x)) for(const a of advOrd(x)) if(S.has(a)&&par.get(a)!==x&&a!==rootId) extra.push({s:x,a,pd:isPd(x,a),unv:UNV_TREE.test(src(x,a))});
  const size=new Map(), leaves=new Map(), height=new Map();
  for(let i=order.length-1;i>=0;i--){ const x=order[i]; let s=1,l=0,h=0; for(const c of kids.get(x)){ s+=size.get(c); l+=leaves.get(c); h=Math.max(h,height.get(c)+1); } size.set(x,s); leaves.set(x,l||1); height.set(x,h); }
  const ancestors=x=>{ const out=new Set(); const st=[x]; while(st.length){ const y=st.pop(); for(const a of advOrd(y)) if(!out.has(a)){ out.add(a); st.push(a); } } return out; };
  const more=new Map(); for(const x of order){ if(IM.has(x)) continue; if(advOrd(x).some(a=>!S.has(a))){ let n=0; for(const a of ancestors(x)) if(!S.has(a)) n++; if(n) more.set(x,n); } }
  const pdEdges=[...edge.values()].filter(e=>e.pd).length+extra.filter(e=>e.pd).length;
  return {S,ALL,order,gmin,par,kids,edge,extra,size,leaves,height,more,usePd:!!usePd,pdEdges,dir:down?'down':'up',im:IM,nIm:[...IM].filter(x=>S.has(x)).length,nImAll:IM.size};
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
  const fs=12.5, flh=18, fmax=W-2*M-30;
  const w23=wrapText(tw,clean(f2+f3),fs,'normal',fmax);
  const flines=scr?[]:wrapText(tw,clean(f1),fs,'normal',fmax).concat(w23.length===1||!f2?w23:wrapText(tw,clean(f2),fs,'normal',fmax).concat([f3])).filter(Boolean);
  const footTop=H-M-12-(flines.length-1)*flh-fs;
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
  if(kk) LI.push({sw:'branch',t1:TX.lBranch});
  const hasPd=[...g.edge.values()].some(e=>e.pd)||g.extra.some(e=>e.pd);
  if(hasPd) LI.push({sw:'pd',t1:TX.lPd,t2:TX.lPd2});
  if([...g.edge.values()].some(e=>e.im)) LI.push({sw:'im',t1:TX.lIm,t2:TX.lIm2});
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
  let credit=null; if(!scr){ const cs=creditSize(W,H), cy=H-36; const cw=T(W/2,cy,TX.credit,cs,'normal',CREDIT_COL,'middle'); credit=[W/2-cw/2,cy-cs,cw,cs*1.3]; }   // below the footer, above the inner frame
  // ----- self check
  const issues=[]; const P2=(b)=>[GX+b[0]*s,GY+b[1]*s,b[2]*s,b[3]*s];
  const all=[...boxes.entries()];
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){ const A=all[i][1], Bb=all[j][1]; if(A[0]<Bb[0]+Bb[2]-0.5&&Bb[0]<A[0]+A[2]-0.5&&A[1]<Bb[1]+Bb[3]-0.5&&Bb[1]<A[1]+A[3]-0.5) issues.push('overlap '+all[i][0]+' '+all[j][0]); }
  for(const [x,b] of all){ const q=P2(b); if(q[0]<M-14||q[0]+q[2]>W-M+14||q[1]<areaT-6||q[1]+q[3]>footTop) issues.push('outside '+x); if(LI.length&&!scr&&q[0]<Lx+Lw&&q[0]+q[2]>Lx&&q[1]<Ly+Lh&&q[1]+q[3]>Ly) issues.push('legend overlaps '+x); }
  // branches running under a label that is not their own end
  for(const [x,c] of curveOf){ const p=g.par.get(x); const pts=curvePts(c,24).slice(2,-2).map(q=>[q[0],fy(q[1])]); for(const [y,b] of boxes){ if(y===x||y===p||typeof y!=='number') continue; if(pts.some(q=>q[0]>b[0]+2&&q[0]<b[0]+b[2]-2&&q[1]>b[1]+2&&q[1]<b[1]+b[3]-2)){ issues.push('branch '+p+'>'+x+' under '+y); } } }
  const svgInner=out.join('');
  if(/[\u2013\u2014]/.test(svgInner)) issues.push('dash in text');
  return {svgInner,W,H,s,issues,legendMode,title,flines,credit,nameSize:cfg.ns*s,centered:F.centered,extra:F.extra,treeSvg,legendItems:LI.map(it=>({sw:it.sw,t1:it.t1,t2:it.t2||''})),boxes:scr?boxes:null};
}

const TREE_FAMOUS=new Set([10480,55185]);  // with FAMOUS: also Kolmogorov and Liouville may be named in the legend when on the highlighted branch
const TREE_BASE={c1:0.3,c2:0.7,maxTiers:3,lean:16,dome:46,ns:13,ms:8.6,wmax:34,dom:0.5,affW:0.5,hgap:12,twig:20,stem:5,availW:1050,tgap:8,gmin:12,g0:14,gk:0.22,gmax:110,xmax:70,smax:1.3,nameW:150,stagger:false};
const TREE_CFGS=opts=>opts.treeCfgs||[{},{stagger:true},{stagger:true,availW:600},{stagger:true,availW:300},{nameW:120,stagger:true},{nameW:120,stagger:true,availW:400},{nameW:96,stagger:true,availW:400}];
async function buildTree(ctx,rootId,opts){
  const scr=!!opts.screen; let doc=null, tw;
  if(scr){ await loadFaces(); tw=canvasMeasure(); }
  else { const fonts=await loadLibs(); doc=newDoc(fonts,opts.paper); tw=makeMeasure(doc); }
  const g=treeGraph(ctx,rootId,opts.gens,opts.postdoc!==false,opts.dir);
  const fp=famousPath(ctx,g,rootId);
  let best=null; const tries=[];
  for(const c of TREE_CFGS(opts)){ const cfg=Object.assign({},TREE_BASE,opts.treeCfg||{},c,{lang:opts.lang}); const lay=treeLayout(ctx,tw,g,fp,rootId,cfg); const comp=treeCompose(ctx,tw,g,fp,lay,rootId,opts);
    const hard=comp.issues.filter(t=>!/^branch /.test(t)).length, soft=comp.issues.length-hard;
    const score=Math.min(comp.s,1)*(cfg.stagger?0.96:1)*(cfg.nameW>=150?1:cfg.nameW>=120?0.9:0.82)*(hard?0.8:1)*Math.pow(0.985,Math.min(soft,10))*(/^free/.test(comp.legendMode)||comp.legendMode==='none'?1:0.95); tries.push([cfg.nameW,cfg.stagger,cfg.availW,+comp.s.toFixed(3),comp.issues.length,comp.legendMode,+score.toFixed(3)]);
    if(!best||score>best.score) best={lay,comp,cfg,score}; if(comp.s>=0.999&&!comp.issues.length) break; }
  const {comp,lay}=best;
  if(scr) return {treeSvg:comp.treeSvg,legend:comp.legendItems,boxes:comp.boxes,g,fp,trunk:lay.trunk,title:comp.title,issues:comp.issues};
  const [PW,PH]=PAPER[opts.paper]; const k=PW/comp.W;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(PW)}pt" height="${n2(PH)}pt" viewBox="0 0 ${n2(PW)} ${n2(PH)}"><g transform="scale(${k.toFixed(6)})">${comp.svgInner}</g></svg>`;
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
  holder.innerHTML=svg; document.body.appendChild(holder);
  doc.setFont(FONT,'normal'); doc.setFontSize(12);
  try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:PW,height:PH}); } finally { holder.remove(); }
  const p=ctx.people.get(rootId);
  if(comp.credit&&!opts.svgOnly) try{ const c=comp.credit; doc.link(c[0]*k,c[1]*k,c[2]*k,c[3]*k,{url:CREDIT_URL}); }catch(e){}
  const TX=L10N[opts.lang]; doc.setProperties({title:comp.title,subject:TX.subject,creator:'slovenskivedci.sk/rodokmen',author:'Peter Richtárik, slovenskivedci.sk'});
  const filename=`${fileSlug(p.name)}_${g.dir==='down'?TX.dFile:TX.file}_${opts.paper}.pdf`;
  const report={style:'strom',lang:opts.lang,dir:g.dir,tries,filename,people:g.S.size,ancestors:g.ALL.size-1,omitted:g.ALL.size-g.S.size,generations:Math.max(...[...g.S].map(x=>g.gmin.get(x))),
    trunk:lay.trunk.map(x=>ctx.people.get(x).name),highlight:fp.path.map(x=>ctx.people.get(x).name),highlightMode:fp.mode,highlightTarget:fp.target!=null?ctx.people.get(fp.target).name:null,highlightDesc:fp.d,
    extraLinks:g.extra.length,postdoc:g.usePd,pdEdges:g.pdEdges,scale:+(comp.s*k).toFixed(4),nameSizePt:+(comp.nameSize*k).toFixed(2),metaSizePt:+(lay.cfg.ms*comp.s*k).toFixed(2),legend:comp.legendMode,centered:comp.centered,
    staggeredRows:lay.tiers.filter(t=>t>1).length,issues:comp.issues,cfg:{nameW:best.cfg.nameW,stagger:best.cfg.stagger,availW:best.cfg.availW},footer:comp.flines,title:comp.title};
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
const PAPER_ALL={A2:[1190.55,1683.78],A0:[2383.94,3370.39]};
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
  branch:vTaper(V_BR), pd:vTaper(TP.TEAL), im:`<path d="M1,11 C12,9.5 24,7 35,5.5" fill="none" stroke="${TP.VIOLET}" stroke-width="2.2" stroke-dasharray="0.1 4.2" stroke-linecap="round"/>`, dash:`<path d="M1,10 Q18,0 35,10" fill="none" stroke="${TP.DASH}" stroke-width="1" stroke-dasharray="3 3"/>`,
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
  const ts=34*k, ss=15*k, ls=11*k, ls2=9.6*k, fs=creditSize(W,H), sw=36*k, gapX=26*k;
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
  const area=[m,legBottom+12*k,W-m,H-m-fs*2.4];
  return {k,m,ts,ss,ls,ls2,fs,sw,yTitle,ySub,yRule,maxT,placed,area};
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
  // footer
  const yF=H-m;
  out.push(`<path d="M${n2(m)},${n2(yF-fs*1.5)} L${n2(W-m)},${n2(yF-fs*1.5)}" stroke="${TP.FRAME}" stroke-width="${n2(0.5*k)}" fill="none"/>`);
  const wl=T(m,yF,o.footL,fs,'normal',CREDIT_COL); T(W-m,yF,o.footR,fs,'normal',CREDIT_COL,'end');
  return {svg:out.join(''),link:{x:m,y:yF-fs,w:wl,h:fs*1.3}};
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
  const url='slovenskivedci.sk/rodokmen/'+(opts.hash?'#'+opts.hash:'');
  // re-flow: the scene laid out for the aspect of the tree area of the sheet (screen-mode page of width 1190.55:
  // its tree area is 1078.55 wide and pageH-130.5 high), in portrait and in landscape
  const frameOf=(paper,land)=>{ const [a,b]=PAPER_ALL[paper]; const W=land?b:a, H=land?a:b; return {paper,land,W,H,F:vFrame(tw,TX,W,H,legend,0)}; };
  const lay={};
  for(const land of [false,true]){ const f=frameOf('A2',land), A=f.F.area, r=(A[3]-A[1])/(A[2]-A[0]);
    const sc=await scene(ctx,rootId,Object.assign({},so,{lang,pageH:130.5+1078.55*r,treeCfg:{xmax:V_XMAX}}));
    lay[land]=Object.assign({sc},sceneParts(sc.treeSvg)); }
  const fitOn=(paper,land)=>{ const f=frameOf(paper,land), L=lay[land], [,,bw,bh]=L.bb, A=f.F.area, k=f.F.k;
    const s=Math.min((A[2]-A[0])/bw,(A[3]-A[1])/bh,V_MAX*(paper==="A0"?2:1)/V_NAME); /* names at most 24 pt on A2, 48 pt on A0 */ return Object.assign(f,{L,s,name:s*V_NAME}); };
  // orientation: the larger scale (ties: less empty paper)
  const orient=paper=>{ const a=fitOn(paper,false), b=fitOn(paper,true); if(Math.abs(b.s-a.s)>0.002*a.s) return b.s>a.s?b:a;
    const fill=c=>{ const A=c.F.area; return c.L.bb[2]*c.L.bb[3]*c.s*c.s/((A[2]-A[0])*(A[3]-A[1])); }; return fill(b)>fill(a)?b:a; };
  let pick;
  if(PAPER_ALL[opts.paper]) pick=orient(opts.paper);
  else { pick=orient('A2'); if(pick.name<V_GOOD) pick=orient('A0'); }
  const {parts,bb}=pick.L, pills=parts.filter(p=>p.pill).map(p=>p.box);
  const [bx,by,bw,bh]=bb;
  const tiled=pick.name<V_MIN;
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
  const render=async(svgInner,link,i)=>{
    if(i>1) doc.addPage([Math.min(W,H),Math.max(W,H)],pick.land?'landscape':'portrait');
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(W)}pt" height="${n2(H)}pt" viewBox="0 0 ${n2(W)} ${n2(H)}">${svgInner}</svg>`;
    const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
    holder.innerHTML=svg; document.body.appendChild(holder);
    doc.setFont(FONT,'normal'); doc.setFontSize(12);
    try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:W,height:H}); } finally { holder.remove(); }
    try{ doc.link(link.x,link.y,link.w,link.h,{url:'https://www.'+url}); }catch(e){}
  };
  const svgs=[];
  // page 1: the whole tree
  { const F=pick.F, A=F.area, s=pick.s; const aw=A[2]-A[0], ah=A[3]-A[1];
    const GX=A[0]+(aw-bw*s)/2-bx*s, GY=A[1]+(ah-bh*s)/2-by*s;
    let tree=`<g transform="translate(${n2(GX)} ${n2(GY)}) scale(${s.toFixed(5)})">${partsSvg(parts,null)}</g>`;
    if(tiled){ const kk=F.k; tiles.forEach((t,i)=>{ const [x0,y0,x1,y1]=t.win; const X0=GX+x0*s, Y0=GY+y0*s, w=(x1-x0)*s, h=(y1-y0)*s;
      tree+=`<rect x="${n2(X0)}" y="${n2(Y0)}" width="${n2(w)}" height="${n2(h)}" fill="none" stroke="${TP.OCHRE}" stroke-width="${n2(1.2*kk)}" stroke-dasharray="${n2(6*kk)} ${n2(4*kk)}"/>`;
      const lb=String(i+1), fz=16*kk, lw=tw(lb,fz,'normal')+8*kk;
      tree+=`<rect x="${n2(X0+2*kk)}" y="${n2(Y0+2*kk)}" width="${n2(lw)}" height="${n2(fz*1.3)}" rx="${n2(3*kk)}" ry="${n2(3*kk)}" fill="${TP.CREAM}" stroke="${TP.OCHRE}" stroke-width="${n2(0.8*kk)}"/><text x="${n2(X0+2*kk+4*kk)}" y="${n2(Y0+2*kk+fz*1.0)}" font-family="${FONT}" font-size="${n2(fz)}" fill="${TP.INK}">${lb}</text>`; }); }
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
  for(let i=0;i<svgs.length;i++){ say(nPages>1?i+1+'/'+nPages:''); await render(svgs[i].svg,svgs[i].link,i+1); }
  doc.setProperties({title,subject:TX.subject,creator:'slovenskivedci.sk/rodokmen',author:'Peter Richtárik, slovenskivedci.sk'});
  const paperName=pick.paper+(pick.land?(lang==='en'?'_landscape':'_na_sirku'):(lang==='en'?'_portrait':'_na_vysku'));
  const filename=[fileSlug(rootP.name),dir==='down'?TX.dFile:TX.file,TX.vStrom,'g'+G,so.postdoc===false?(lang==='en'?'no_postdoc':'bez_postdoc'):'',paperName].filter(Boolean).join('_')+'.pdf';
  const report={lang,dir,gens:G,maxGen:MX,postdoc:so.postdoc!==false,people:n,paper:pick.paper,landscape:pick.land,pageW:W,pageH:H,scale:+pick.s.toFixed(4),nameSizePt:+pick.name.toFixed(2),
    pages:nPages,issues:pick.L.sc.issues,tiles:tiles.map(t=>[t.r,t.c]),tileNameSizePt:tiled?V_TILE:null,bbox:bb.map(v=>Math.round(v)),title,sub,legend:legend.map(l=>l.sw),filename};
  return {doc,filename,report,svgs:svgs.map(x=>x.svg)};
}
async function downloadView(ctx,rootId,opts){ const r=await buildView(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.lastView={report:r.report}; return r.report; }

/* ---------- public ---------- */
async function build(ctx,rootId,opts){
  opts=Object.assign({gens:14,paper:'A2',lang:'sk'},opts||{}); if(!PAPER[opts.paper]) opts.paper='A2'; if(!L10N[opts.lang]) opts.lang='sk';
  return buildTree(ctx,rootId,opts);
}
async function download(ctx,rootId,opts){ const r=await build(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.last={report:r.report,svg:r.svg}; return r.report; }
async function scene(ctx,rootId,opts){ return buildTree(ctx,rootId,Object.assign({gens:6,paper:'A2',lang:'sk'},opts||{},{screen:true})); }
window.RodokmenPrint={build,download,scene,buildView,downloadView,preload:loadLibs,langs:LANGS,_t:{L10N,genitive,schoolShort,surname,fileSlug,treeGraph,famousPath,sceneParts}};
})();
