/* Rodokmeň slovenskej matematiky: printable ancestor tree (vector PDF, A2 or A3).
   Loaded on demand from rodokmen/index.html when "Vytlačiť rodokmeň predkov" is clicked.
   Two styles: "strom" (default, an organic tree: see ORGANIC TREE POSTER below) and "klasický" (rows).
   Classic layout: generations as rows (longest line from the person), layered DAG with dummy nodes,
   barycentric crossing reduction and priority placement; rendered as SVG and converted to PDF
   with jsPDF + svg2pdf.js, EB Garamond embedded. Postdoc advisor links (ctx.pdAdvisorsOf) are included unless
   opts.postdoc===false and drawn in teal; the gold main line follows PhD links only. */
(function(){
'use strict';
const BASE=((document.currentScript&&document.currentScript.src)||'').replace(/[^/]*$/,'')||'assets/print/';
const FONT='EBGaramond';
const PAPER={A2:[1190.55,1683.78],A3:[841.89,1190.55]};
const GOLD='#b8891f',GOLD_FILL='#fbf1d6',SK='#2f5d8a',SK_FILL='#eaf1f8',SK_EDGE='#8fb0cf',INK='#2b2622',INK2='#6b625a',INK3='#9a8f82',LINE='#b7ad9f',PD='#2a8f80',CARD='#fffdf8',CARD_EDGE='#cdbfa9',PAGE='#fdfbf6';
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
function schoolShort(raw){
  let s=clean(raw); if(!s) return '';
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

/* ---------- graph ---------- */
function buildGraph(ctx,rootId,G,usePd){
  const P=ctx.people;
  const advPhd=id=>{ const p=P.get(id); return p?p.adv.filter(a=>P.has(a)&&a!==id):[]; };  // MGP order (first = main advisor)
  // with postdoc links: PhD advisors first, then postdoc advisors (a second kind of advisor link)
  const advOrd=usePd&&ctx.pdAdvisorsOf?id=>{ const a=advPhd(id); return a.concat(ctx.pdAdvisorsOf(id).filter(x=>x!==id&&!a.includes(x))); }:advPhd;
  const isPd=(x,a)=>usePd&&!advPhd(x).includes(a);
  const gmin=new Map([[rootId,0]]); const q=[rootId];
  for(let i=0;i<q.length;i++){ const x=q[i]; for(const a of advOrd(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); q.push(a); } }
  const ALL=new Set(gmin.keys()); const S=new Set([...ALL].filter(x=>gmin.get(x)<=G));
  // topological order inside S (DFS; back edges of any cycle are dropped)
  const state=new Map(), post=[], edges=[]; const drop=new Set();
  const dfs=x=>{ state.set(x,1); for(const a of advOrd(x)){ if(!S.has(a)) continue; const st=state.get(a); if(st===1){ drop.add(x+'>'+a); continue; } if(!st) dfs(a); } state.set(x,2); post.push(x); };
  dfs(rootId);
  for(const x of S) for(const a of advOrd(x)) if(S.has(a)&&!drop.has(x+'>'+a)) edges.push([x,a,isPd(x,a)]);
  const topo=post.slice().reverse();
  const rank=new Map([[rootId,0]]);
  for(const x of topo){ const r=rank.get(x)||0; for(const a of advOrd(x)) if(S.has(a)&&!drop.has(x+'>'+a)) rank.set(a,Math.max(rank.get(a)||0,r+1)); }
  // main (gold) line: longest line to the oldest "Rodák zo Slovenska" in view, else to the top row
  // the main (gold) line follows PhD links only, also when postdoc ancestors are drawn
  const phdReach=new Set([rootId]); { const st=[rootId]; while(st.length){ const y=st.pop(); for(const a of advPhd(y)) if(S.has(a)&&!phdReach.has(a)){ phdReach.add(a); st.push(a); } } }
  const cand=[...S].filter(x=>x!==rootId&&phdReach.has(x));
  const yr=x=>{ const p=P.get(x); return p.year||9999; };
  let target=null;
  const rod=cand.filter(x=>P.get(x).sk==='rod');
  const pickBest=arr=>arr.sort((a,b)=>rank.get(b)-rank.get(a)||yr(a)-yr(b))[0];
  if(rod.length) target=pickBest(rod); else if(cand.length){ const dl=new Set(); let k=rootId; const seen=new Set(); while(k!=null&&!seen.has(k)){ seen.add(k); dl.add(k); const d=ctx.deepest(k); const nx=d&&d.g>0?advPhd(k).find(a=>{ const e=ctx.deepest(a); return e&&e.g===d.g-1&&e.root===d.root; }):null; k=nx==null?null:nx; }
    const maxR=Math.max(...cand.map(x=>rank.get(x))); const top=cand.filter(x=>rank.get(x)===maxR); target=top.find(x=>dl.has(x))||pickBest(top); }
  const main=[];
  if(target!=null){
    // L(x): longest distance from x up to target inside S
    const L=new Map([[target,0]]);
    for(const x of post){ if(x===target) continue; let b=-1; for(const a of advPhd(x)){ if(!S.has(a)||drop.has(x+'>'+a)) continue; const la=L.get(a); if(la!=null&&la>=0&&la+1>b) b=la+1; } L.set(x,b); }
    let x=rootId; main.push(x);
    while(x!==target){ const lx=L.get(x); const nx=advPhd(x).find(a=>S.has(a)&&!drop.has(x+'>'+a)&&L.get(a)===lx-1); if(nx==null) break; main.push(nx); x=nx; }
  }
  const ancestors=x=>{ const out=new Set(); const st=[x]; while(st.length){ const y=st.pop(); for(const a of advOrd(y)) if(!out.has(a)){ out.add(a); st.push(a); } } return out; };
  const more=new Map();
  for(const x of S){ if(advOrd(x).some(a=>!S.has(a))){ let n=0; for(const a of ancestors(x)) if(!S.has(a)) n++; more.set(x,n); } }
  return {S,ALL,gmin,rank,edges,main,more,target,usePd:!!usePd,pdEdges:edges.filter(e=>e[2]).length};
}

/* ---------- node boxes ---------- */
function nodeBox(ctx,tw,id,g,cfg){
  const p=ctx.people.get(id); const isMain=g.mainSet.has(id), sk=p.sk||'';
  const nSize=isMain?17:15.5, nStyle=isMain?'bold':'normal';
  const lines=[];
  for(const t of wrapText(tw,clean(p.name),nSize,nStyle,cfg.nameW*(isMain?1.3:1))) lines.push({t,size:nSize,style:nStyle,fill:INK,lh:nSize*1.13});
  const pr=p.primary; const yr=pr&&pr.year?String(pr.year):''; const sch=pr?schoolShort(pr.school):'';
  const meta=yr&&sch?yr+' · '+sch:(yr||sch||'údaje o titule neuvedené');
  for(const t of wrapText(tw,meta,12.5,'italic',cfg.metaW)) lines.push({t,size:12.5,style:'italic',fill:INK2,lh:15});
  if(sk){ const tag=sk==='rod'?'RODÁK ZO SLOVENSKA':ctx.isFemale(p)?'SLOVENSKÁ MATEMATIČKA':'SLOVENSKÝ MATEMATIK'; lines.push({t:tag,size:9.6,style:'normal',fill:SK,lh:13,gap:1.5}); }
  if(g.more.has(id)) lines.push({t:'ďalší predkovia: '+g.more.get(id),size:10.5,style:'italic',fill:INK3,lh:13.5,gap:1});
  const padX=9, padY=7, stripe=sk?7:0;
  let tw0=0; for(const l of lines){ l.w=tw(l.t,l.size,l.style); tw0=Math.max(tw0,l.w); }
  let h=padY*2; for(const l of lines) h+=l.lh+(l.gap||0);
  const w=Math.max(tw0+padX*2+stripe, isMain?120:70);
  return {id,w,h,lines,isMain,sk,stripe,padX,padY};
}

/* ---------- layered layout ---------- */
function layout(ctx,tw,g,cfg){
  const {S,rank,edges,main}=g; g.mainSet=new Set(main);
  const maxR=Math.max(0,...[...S].map(x=>rank.get(x)));
  const layers=Array.from({length:maxR+1},()=>[]);
  const items=new Map();
  for(const x of S){ const b=nodeBox(ctx,tw,x,g,cfg); b.r=rank.get(x); b.up=[]; b.down=[]; items.set(x,b); }
  const chains=[]; let did=0;
  for(const [x,a,pd] of edges){ const lo=items.get(x), hi=items.get(a); const ch=[lo]; for(let r=lo.r+1;r<hi.r;r++){ const d={id:'d'+(did++),dummy:true,w:0,h:0,r,up:[],down:[]}; ch.push(d); } ch.push(hi);
    for(let i=0;i+1<ch.length;i++){ ch[i].up.push(ch[i+1]); ch[i+1].down.push(ch[i]); }
    chains.push({ch,pd:!!pd,main:!pd&&g.mainSet.has(x)&&g.mainSet.has(a)&&main.indexOf(a)===main.indexOf(x)+1}); }
  const all=[...items.values()]; for(const c of chains) for(const n of c.ch) if(n.dummy) all.push(n);
  // initial order: DFS from the root, advisors in MGP order
  const placed=new Set(); const visit=n=>{ if(placed.has(n)) return; placed.add(n); layers[n.r].push(n); for(const u of n.up) visit(u); };
  const root=items.get(main[0]!=null?main[0]:[...S][0]); visit(root); for(const n of all) visit(n);
  const pin=n=>n.isMain?-1e9:0;
  const setIdx=()=>{ for(const L of layers) L.forEach((n,i)=>n.i=i); };
  const crossings=()=>{ let c=0; for(let r=0;r<maxR;r++){ const es=[]; for(const n of layers[r]) for(const u of n.up) es.push([n.i,u.i]); for(let i=0;i<es.length;i++) for(let j=i+1;j<es.length;j++){ const a=es[i],b=es[j]; if((a[0]-b[0])*(a[1]-b[1])<0) c++; } } return c; };
  setIdx(); let best=layers.map(L=>L.slice()), bestC=crossings();
  const bary=(n,nb)=>nb.length?nb.reduce((s,m)=>s+m.i,0)/nb.length:null;
  for(let it=0;it<28;it++){
    const upward=it%2===0;
    const rs=upward?[...Array(maxR).keys()].map(r=>r+1):[...Array(maxR).keys()].map(r=>maxR-1-r);
    for(const r of rs){ const L=layers[r]; const key=new Map(L.map(n=>{ const b=bary(n,upward?n.down:n.up); return [n,b==null?n.i:b]; }));
      L.sort((a,b)=>(pin(a)-pin(b))||(key.get(a)-key.get(b))||(a.i-b.i)); L.forEach((n,i)=>n.i=i); }
    // transpose: swap neighbours when it reduces crossings locally
    for(let r=0;r<=maxR;r++){ const L=layers[r]; let improved=true, guard=0; while(improved&&guard++<6){ improved=false; for(let i=0;i+1<L.length;i++){ const a=L[i],b=L[i+1]; if(a.isMain||b.isMain) continue; const cr=(u,v)=>{ let c=0; for(const x of u.up) for(const y of v.up) if(x.i>y.i) c++; for(const x of u.down) for(const y of v.down) if(x.i>y.i) c++; return c; }; if(cr(b,a)<cr(a,b)){ L[i]=b; L[i+1]=a; a.i=i+1; b.i=i; improved=true; } } } }
    const c=crossings(); if(c<bestC){ bestC=c; best=layers.map(L=>L.slice()); }
  }
  for(let r=0;r<=maxR;r++) layers[r]=best[r]; setIdx();
  // x coordinates: priority method
  const sep=(a,b)=>a.dummy&&b.dummy?9:(a.dummy||b.dummy)?13:cfg.nodeSep;
  const md=(a,b)=>a.w/2+sep(a,b)+b.w/2;
  for(const L of layers){ let x=0; L.forEach((n,i)=>{ if(i) x+=md(L[i-1],n); else x=n.w/2; n.x=x; }); }
  const XM=Math.max(0,...[...items.values()].filter(n=>n.isMain).map(n=>n.w/2));
  const place=(L,desired,prio)=>{ const n=L.length; const idx=[...Array(n).keys()].sort((i,j)=>prio[j]-prio[i]||i-j); const lock=new Array(n).fill(false);
    for(const i of idx){ let lo=-Infinity,hi=Infinity,d=0;
      for(let j=i-1;j>=0;j--){ d+=md(L[j],L[j+1]); if(lock[j]){ lo=L[j].x+d; break; } }
      d=0; for(let j=i+1;j<n;j++){ d+=md(L[j-1],L[j]); if(lock[j]){ hi=L[j].x-d; break; } }
      let t=desired[i]; if(t<lo) t=lo; if(t>hi) t=hi; L[i].x=t; lock[i]=true;
      for(let j=i+1;j<n&&!lock[j];j++){ const m=L[j-1].x+md(L[j-1],L[j]); if(L[j].x<m) L[j].x=m; else break; }
      for(let j=i-1;j>=0&&!lock[j];j--){ const m=L[j+1].x-md(L[j],L[j+1]); if(L[j].x>m) L[j].x=m; else break; } } };
  const avg=a=>a.reduce((s,m)=>s+m.x,0)/a.length;
  const pass=(r,mode)=>{ const L=layers[r]; const des=[], pr=[];
    for(const n of L){ const nb=mode==='down'?n.down:mode==='up'?n.up:n.down.concat(n.up);
      des.push(n.isMain?XM:nb.length?avg(nb):n.x); pr.push(n.isMain?1e9:n.dummy?1e6+(nb.length?0:-1):(nb.length?nb.length*10+(n.down.length+n.up.length):0)); }
    place(L,des,pr); };
  for(let it=0;it<10;it++){ if(it%2===0) for(let r=1;r<=maxR;r++) pass(r,'down'); else for(let r=maxR-1;r>=0;r--) pass(r,'up'); }
  for(let it=0;it<4;it++){ for(let r=0;r<=maxR;r++) pass(r,'both'); for(let r=maxR;r>=0;r--) pass(r,'both'); }
  // compaction: minimise sum of weighted (almost L1) edge lengths subject to the order and spacing
  // in every row (block coordinate descent, each row solved exactly by isotonic regression)
  const OM=(a,b)=>a.dummy&&b.dummy?8:(a.dummy||b.dummy)?2:1;
  const pava=(t,w)=>{ const B=[]; for(let i=0;i<t.length;i++){ let b={v:t[i],w:w[i],n:1}; while(B.length&&B[B.length-1].v>=b.v){ const a=B.pop(); const nw=a.w+b.w; b={v:(a.v*a.w+b.v*b.w)/nw,w:nw,n:a.n+b.n}; } B.push(b); } const o=[]; for(const b of B) for(let j=0;j<b.n;j++) o.push(b.v); return o; };
  const sweep=(r,irls)=>{ const L=layers[r], n=L.length; if(!n) return; const t=[],w=[],c=[]; let off=0;
    for(let i=0;i<n;i++){ const v=L[i]; if(i) off+=md(L[i-1],v); c.push(off); let sw=0,sx=0;
      for(const u of v.up.concat(v.down)){ let ww=OM(u,v); if(irls) ww/=Math.abs(u.x-v.x)+cfg.huber; sw+=ww; sx+=ww*u.x; }
      if(v.isMain){ sw+=1e7; sx+=1e7*XM; } if(sw===0){ sw=1e-4; sx=1e-4*v.x; }
      t.push(sx/sw-off); w.push(sw); }
    const y=pava(t,w); for(let i=0;i<n;i++) L[i].x=y[i]+c[i]; };
  for(let it=0;it<cfg.qpIter;it++){ const irls=it>=cfg.qpIter/3; if(it%2) for(let r=0;r<=maxR;r++) sweep(r,irls); else for(let r=maxR;r>=0;r--) sweep(r,irls); }
  // normalise x, compute rows
  let minX=Infinity,maxX=-Infinity; for(const n of all){ minX=Math.min(minX,n.x-n.w/2); maxX=Math.max(maxX,n.x+n.w/2); }
  for(const n of all) n.x-=minX;
  const rowH=layers.map(L=>Math.max(18,...L.filter(n=>!n.dummy).map(n=>n.h)));
  const rowY=new Array(maxR+1); let y=0;
  for(let r=maxR;r>=0;r--){ rowY[r]=y+rowH[r]/2; y+=rowH[r]+cfg.rankSep; }
  const gh=y-cfg.rankSep, gw=maxX-minX;
  for(const n of all) n.y=rowY[n.r];
  const baseRankSep=cfg.rankSep;
  const packW=Math.max(...layers.map(L=>L.reduce((a,n,i)=>a+n.w+(i?sep(L[i-1],n):0),0)));
  return {items,layers,chains,rowY,rowH,gw,gh,maxR,crossings:bestC,packW,baseRankSep};
}

function setRows(lay,rankSep){ const {layers,rowH,maxR}=lay; const rowY=new Array(maxR+1); let y=0;
  for(let r=maxR;r>=0;r--){ rowY[r]=y+rowH[r]/2; y+=rowH[r]+rankSep; }
  for(const L of layers) for(const n of L) n.y=rowY[n.r];
  lay.rowY=rowY; lay.gh=y-rankSep; lay.rankSep=rankSep; }
function edgePath(ch,rowY,rowH){
  const f=n2; let d='';
  const top=n=>n.dummy?rowY[n.r]-rowH[n.r]/2:n.y-n.h/2, bot=n=>n.dummy?rowY[n.r]+rowH[n.r]/2:n.y+n.h/2;
  const pts=[];
  for(let i=0;i<ch.length;i++){ const n=ch[i]; const rt=rowY[n.r]-rowH[n.r]/2, rb=rowY[n.r]+rowH[n.r]/2;
    if(i===0){ pts.push(['M',n.x,top(n)]); if(top(n)>rt+0.5) pts.push(['L',n.x,rt]); }
    else { const p=pts[pts.length-1]; const y1=p[2], y2=rb, m=(y1+y2)/2; pts.push(['C',p[1],m,n.x,m,n.x,y2]);
      if(i===ch.length-1){ if(bot(n)<rb-0.5) pts.push(['L',n.x,bot(n)]); } else pts.push(['L',n.x,rt]); } }
  for(const p of pts){ d+=p[0]+p.slice(1).map(f).join(','); }
  return {d,pts};
}

/* ---------- page composition ---------- */
function compose(ctx,tw,g,lay,rootId,opts){
  const P=ctx.people, rootP=P.get(rootId);
  const [W,H]=PAPER[opts.paper]; const k=W/1190.55; const M=46*k;
  const out=[]; const T=(x,y,t,size,style,fill,anchor)=>{ const w=tw(t,size,style); const x0=anchor==='middle'?x-w/2:anchor==='end'?x-w:x; out.push(`<text x="${n2(x0)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''}${style==='bold'?' font-weight="bold"':''} fill="${fill}">${xesc(t)}</text>`); return w; };
  out.push(`<rect x="0" y="0" width="${n2(W)}" height="${n2(H)}" fill="${PAGE}"/>`);
  out.push(`<rect x="${n2(M-18*k)}" y="${n2(M-18*k)}" width="${n2(W-2*M+36*k)}" height="${n2(H-2*M+36*k)}" fill="none" stroke="#d9cdb8" stroke-width="${n2(0.8*k)}"/>`);
  out.push(`<rect x="${n2(M-14*k)}" y="${n2(M-14*k)}" width="${n2(W-2*M+28*k)}" height="${n2(H-2*M+28*k)}" fill="none" stroke="#e7dcc9" stroke-width="${n2(0.4*k)}"/>`);
  // title
  const gen=genitive(rootP.name,ctx.isFemale(rootP));
  let title=gen?'Akademickí predkovia '+gen:'Akademickí predkovia: '+clean(rootP.name);
  let ts=50*k; const maxTW=W-2*M-40*k; const w0=tw(title,ts,'normal'); if(w0>maxTW) ts*=maxTW/w0;
  T(W/2,M+60*k,title,ts,'normal',INK,'middle');
  let sub='Rodokmeň slovenskej matematiky · zdroj: slovenskivedci.sk/rodokmen (čerpá z viacerých zdrojov, najmä z Mathematics Genealogy Project)';
  let ss=19*k; const ws=tw(sub,ss,'italic'); if(ws>maxTW) ss*=maxTW/ws;
  T(W/2,M+96*k,sub,ss,'italic',INK2,'middle');
  const cy=M+118*k;
  out.push(`<line x1="${n2(W/2-230*k)}" y1="${n2(cy)}" x2="${n2(W/2-12*k)}" y2="${n2(cy)}" stroke="${GOLD}" stroke-width="${n2(0.9*k)}"/>`);
  out.push(`<line x1="${n2(W/2+12*k)}" y1="${n2(cy)}" x2="${n2(W/2+230*k)}" y2="${n2(cy)}" stroke="${GOLD}" stroke-width="${n2(0.9*k)}"/>`);
  out.push(`<path d="M${n2(W/2)},${n2(cy-5.6*k)} L${n2(W/2+5.6*k)},${n2(cy)} L${n2(W/2)},${n2(cy+5.6*k)} L${n2(W/2-5.6*k)},${n2(cy)} Z" fill="${GOLD}"/>`);
  // footer text (wrapped), measured first so the graph area can use the rest
  const n=g.S.size, kk=n-1, tot=g.ALL.size-1, om=g.ALL.size-g.S.size;
  const name=clean(rootP.name);
  const G=opts.gens; const cut=om>0;
  const f1=kk===1?`Zobrazené sú 2 osoby: ${name} a ${cut?'jeho alebo jej školiteľ':'jediný známy predok'}.`:
    `Zobrazen${n>=5?'ých':'é sú'} ${n} ${pl(n,'osoba','osoby','osôb')}: ${name} a ${kk>=5?'všetkých':'všetci'} ${kk} ${pl(kk,'predok','predkovia','predkov')}`+
    (cut?`, ku ktorým vedie aspoň jedna línia dlhá najviac ${G} ${pl(G,'generácia','generácie','generácií')}.`:'.')+' Každá osoba je nakreslená raz; riadok zodpovedá jej najdlhšej línii.'+(g.pdEdges?' Zahrnutí sú aj predkovia cez postdoktorandských školiteľov (zelené spojnice).':'');
  const dp=(g.usePd&&ctx.deepestAll?ctx.deepestAll:ctx.deepest)(rootId); const oldest=P.get(dp.root);
  const dt=(ctx.generated||'').split('-'); const dstr=dt.length===3?`${+dt[2]}. ${+dt[1]}. ${dt[0]}`:'';
  const f2=(cut?`Úplný rodokmeň má ${tot} ${pl(tot,'predka','predkov','predkov')} (najdlhšia línia siaha ${dp.g} ${pl(dp.g,'generáciu','generácie','generácií')} do minulosti, k osobe ${clean(oldest.name)}); ${om} ${pl(om,'starší predok tu nie je zobrazený','starší predkovia tu nie sú zobrazení','starších predkov tu nie je zobrazených')}. `:'Zobrazený je celý známy rodokmeň. ');
  const fs=13.5*k, flh=20*k, fmax=W-2*M-20*k;
  const f3=`Údaje: slovenskivedci.sk/rodokmen${dstr?', stav k '+dstr:''}.`;
  const w23=wrapText(tw,clean(f2+f3),fs,'normal',fmax);
  const flines=wrapText(tw,clean(f1),fs,'normal',fmax).concat(w23.length===1||!f2?w23:wrapText(tw,clean(f2),fs,'normal',fmax).concat([f3]));
  const footTop=H-M-14*k-(flines.length-1)*flh-fs;
  // legend content
  const mainIds=g.main; const mainLen=Math.max(0,mainIds.length-1);
  const legendItems=[];
  if(mainLen>0){ const mids=mainIds.slice(1,-1).filter(x=>FAMOUS.has(x)).sort((a,b)=>(P.get(b).mgp[1]||0)-(P.get(a).mgp[1]||0));
    const chain=[surname(rootP.name)].concat(mids.length?[surname(P.get(mids[0]).name)]:[],[surname(P.get(mainIds[mainIds.length-1]).name)]);
    legendItems.push({sw:'main',t1:'Hlavná línia '+chain.join(' → '),t2:`(zlatá cesta, ${mainLen} ${pl(mainLen,'generácia','generácie','generácií')})`}); }
  if([...g.S].some(x=>P.get(x).sk)) legendItems.push({sw:'sk',t1:'Slovenský matematik alebo',t2:'rodák zo Slovenska'});
  legendItems.push({sw:'card',t1:'Predok: meno, rok titulu · univerzita',t2:''});
  legendItems.push({sw:'line',t1:'Školiteľ a doktorand; kto mal viac',t2:'školiteľov, je spojený s každým',t2n:true});
  if(lay.chains.some(c=>c.pd)) legendItems.push({sw:'pd',t1:'Postdoktorandský školiteľ',t2:'a postdoktorand',t2n:true});
  const hasMore=g.more.size>0;
  const lk=k; const lpad=18*lk, lsw=40*lk, ltx=lpad+lsw+12*lk, lstep=42*lk;
  let lw=0; for(const it of legendItems){ lw=Math.max(lw,tw(it.t1,14*lk,'normal'),it.t2?tw(it.t2,it.t2n?14*lk:13*lk,it.t2n?'normal':'italic'):0); }
  const moreW=tw('ďalší predkovia: n',13*lk,'italic')+8*lk+tw('= počet starších predkov mimo výrezu',13*lk,'normal');
  const Lw=Math.max(ltx+lw,lpad+moreW)+lpad, Lh=52*lk+legendItems.length*lstep+(hasMore?30*lk:0);
  // graph area
  const labw=44*k; const areaL=M+labw, areaR=W-M, areaT=M+142*k, areaB=footTop-28*k;
  // row spacing: fill the page height when the width is the binding constraint (and vice versa)
  if(lay.maxR>0){ const sW=Math.min((areaR-areaL)/lay.gw,1.6*k); const sumH=lay.rowH.reduce((a,b)=>a+b,0);
    const fill=Math.max(24,Math.min(66,((areaB-areaT)/sW-sumH)/lay.maxR));
    setRows(lay,opts.rowMode==='fill'?fill:lay.baseRankSep); }
  // obstacles (boxes, edge samples) in graph coords
  const rects=[]; for(const b of lay.items.values()) rects.push([b.x-b.w/2,b.y-b.h/2,b.w,b.h]);
  const paths=lay.chains.map(c=>edgePath(c.ch,lay.rowY,lay.rowH));
  for(const p of paths){ let last=null; for(const q of p.pts){ const pt=[q[q.length-2],q[q.length-1]]; if(last){ for(let t=0;t<=1.001;t+=0.125) rects.push([last[0]+(pt[0]-last[0])*t-2,last[1]+(pt[1]-last[1])*t-2,4,4]); } last=pt; } }
  let minBoxX=Infinity; for(const b of lay.items.values()) minBoxX=Math.min(minBoxX,b.x-b.w/2);
  const hits=(pl,x,y,w,h)=>{ const mg=12*k; for(const r of rects){ const X=pl.GX+r[0]*pl.s, Y=pl.GY+r[1]*pl.s, WW=r[2]*pl.s, HH=r[3]*pl.s; if(X<x+w+mg&&X+WW>x-mg&&Y<y+h+mg&&Y+HH>y-mg) return true; }
    const lx=pl.GX+minBoxX*pl.s-14*k; if(x<lx+4*k&&x+w>lx-34*k&&y+h>pl.GY-30*k&&y<pl.GY+lay.gh*pl.s) return true; return false; };
  const place=(aT,aB,ha,va)=>{ const aw=areaR-areaL, ah=aB-aT; const s=Math.min(aw/lay.gw,ah/lay.gh,1.6*k);
    const GX=areaL+(ha==='left'?0:(aw-lay.gw*s)/2), GY=aT+(va==='top'?0:(ah-lay.gh*s)/2); return {s,GX,GY}; };
  // legend: slide along the bottom and right edges (then top and left) for a free spot
  const step=10*k, cands=[];
  for(let x=areaR-Lw;x>=areaL;x-=step) cands.push([x,areaB-Lh]);
  for(let y=areaB-Lh;y>=areaT;y-=step) cands.push([areaR-Lw,y]);
  for(let x=areaR-Lw;x>=areaL;x-=step) cands.push([x,areaT]);
  for(let y=areaB-Lh;y>=areaT;y-=step) cands.push([areaL,y]);
  let Lx,Ly,legendMode=null,pl0=null;
  outer: for(const [ha,va] of [['center','center'],['center','top'],['left','center'],['left','top']]){ const pl=place(areaT,areaB,ha,va);
    for(const [x,y] of cands){ if(!hits(pl,x,y,Lw,Lh)){ Lx=x; Ly=y; pl0=pl; legendMode=ha+'/'+va; break outer; } } }
  if(!pl0){ // no room: reserve a strip for the legend below the tree
    pl0=place(areaT,areaB-Lh-20*k,'center','center'); Lx=areaR-Lw; Ly=areaB-Lh; legendMode='below'; }
  const {s,GX,GY}=pl0;
  // generation numbers
  const lx=GX+minBoxX*s-14*k; const rs=15*k*Math.min(1,Math.max(0.55,s/(0.8*k)));
  T(lx,GY+(lay.rowY[lay.maxR]-lay.rowH[lay.maxR]/2)*s-rs*1.6,'generácia',Math.max(8*k,12*k*Math.min(1,s/(0.8*k))),'italic',INK3,'end');
  for(let r=0;r<=lay.maxR;r++) T(lx,GY+lay.rowY[r]*s+rs*0.34,String(r),rs,'normal',r<=mainLen?GOLD:'#a99d8f','end');
  // graph
  out.push(`<g transform="translate(${n2(GX)} ${n2(GY)}) scale(${s.toFixed(5)})">`);
  lay.chains.forEach((c,i)=>{ if(!c.main&&!c.pd) out.push(`<path d="${paths[i].d}" fill="none" stroke="${LINE}" stroke-width="1.3"/>`); });
  lay.chains.forEach((c,i)=>{ if(c.pd) out.push(`<path d="${paths[i].d}" fill="none" stroke="${PD}" stroke-width="2.2"/>`); });
  lay.chains.forEach((c,i)=>{ if(c.main) out.push(`<path d="${paths[i].d}" fill="none" stroke="${GOLD}" stroke-width="5"/>`); });
  const G2=[]; const TT=(x,y,l)=>{ G2.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${l.size}"${l.style==='italic'?' font-style="italic"':''}${l.style==='bold'?' font-weight="bold"':''} fill="${l.fill}">${xesc(l.t)}</text>`); };
  for(const b of lay.items.values()){
    const x=b.x-b.w/2, y=b.y-b.h/2, rx=8;
    let fill=CARD,stroke=CARD_EDGE,swd=1; if(b.isMain){ fill=GOLD_FILL; stroke=GOLD; swd=3; } else if(b.sk){ fill=SK_FILL; stroke=SK_EDGE; swd=1.4; }
    G2.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(b.w)}" height="${n2(b.h)}" rx="${rx}" ry="${rx}" fill="${fill}"/>`);
    if(b.stripe){ const sw=b.stripe, dy=Math.sqrt(rx*rx-(rx-sw)*(rx-sw));
      G2.push(`<path d="M${n2(x+sw)},${n2(y+rx-dy)} A${rx},${rx} 0 0 0 ${n2(x)},${n2(y+rx)} L${n2(x)},${n2(y+b.h-rx)} A${rx},${rx} 0 0 0 ${n2(x+sw)},${n2(y+b.h-rx+dy)} Z" fill="${SK}"/>`); }
    G2.push(`<rect x="${n2(x)}" y="${n2(y)}" width="${n2(b.w)}" height="${n2(b.h)}" rx="${rx}" ry="${rx}" fill="none" stroke="${stroke}" stroke-width="${swd}"/>`);
    const cx=x+b.stripe+(b.w-b.stripe)/2; let yy=y+b.padY;
    for(const l of b.lines){ yy+=(l.gap||0); TT(cx-l.w/2,yy+l.lh*0.76,l); yy+=l.lh; }
  }
  out.push(G2.join('')); out.push('</g>');
  // legend
  const L=[]; const LT=(x,y,t,size,style,fill)=>{ const w=tw(t,size,style); L.push(`<text x="${n2(x)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''} fill="${fill}">${xesc(t)}</text>`); return w; };
  L.push(`<rect x="${n2(Lx)}" y="${n2(Ly)}" width="${n2(Lw)}" height="${n2(Lh)}" rx="${n2(8*lk)}" ry="${n2(8*lk)}" fill="${CARD}" stroke="#d9cdb8" stroke-width="${n2(0.9*lk)}"/>`);
  { let xx=Lx+lpad; for(const ch of 'LEGENDA'){ xx+=LT(xx,Ly+30*lk,ch,17*lk,'normal',INK)+1.6*lk; } }
  legendItems.forEach((it,i)=>{ const y0=Ly+52*lk+i*lstep; const sx=Lx+lpad, sw=lsw, sh=22*lk;
    if(it.sw==='main') L.push(`<rect x="${n2(sx)}" y="${n2(y0)}" width="${n2(sw)}" height="${n2(sh)}" rx="${n2(5*lk)}" ry="${n2(5*lk)}" fill="${GOLD_FILL}" stroke="${GOLD}" stroke-width="${n2(2.2*lk)}"/>`);
    else if(it.sw==='sk') L.push(`<rect x="${n2(sx)}" y="${n2(y0)}" width="${n2(sw)}" height="${n2(sh)}" rx="${n2(5*lk)}" ry="${n2(5*lk)}" fill="${SK_FILL}" stroke="${SK_EDGE}" stroke-width="${n2(1.1*lk)}"/><rect x="${n2(sx+2*lk)}" y="${n2(y0+2*lk)}" width="${n2(5*lk)}" height="${n2(sh-4*lk)}" rx="${n2(2*lk)}" ry="${n2(2*lk)}" fill="${SK}"/>`);
    else if(it.sw==='card') L.push(`<rect x="${n2(sx)}" y="${n2(y0)}" width="${n2(sw)}" height="${n2(sh)}" rx="${n2(5*lk)}" ry="${n2(5*lk)}" fill="${CARD}" stroke="${CARD_EDGE}" stroke-width="${n2(0.9*lk)}"/>`);
    else if(it.sw==='pd') L.push(`<line x1="${n2(sx)}" y1="${n2(y0+11*lk)}" x2="${n2(sx+sw)}" y2="${n2(y0+11*lk)}" stroke="${PD}" stroke-width="${n2(2.4*lk)}"/>`);
    else L.push(`<line x1="${n2(sx)}" y1="${n2(y0+11*lk)}" x2="${n2(sx+sw)}" y2="${n2(y0+11*lk)}" stroke="${LINE}" stroke-width="${n2(1.3*lk)}"/>`);
    LT(Lx+ltx,y0+10*lk,it.t1,14*lk,'normal',INK);
    if(it.t2) LT(Lx+ltx,y0+26*lk,it.t2,it.t2n?14*lk:13*lk,it.t2n?'normal':'italic',it.t2n?INK:INK2); });
  if(hasMore){ const y0=Ly+52*lk+legendItems.length*lstep; const w=LT(Lx+lpad,y0+10*lk,'ďalší predkovia: n',13*lk,'italic',INK3); LT(Lx+lpad+w+8*lk,y0+10*lk,'= počet starších predkov mimo výrezu',13*lk,'normal',INK2); }
  out.push(L.join(''));
  // footer
  flines.forEach((t,i)=>T(W/2,footTop+fs+i*flh,t,fs,'normal',INK2,'middle'));
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(W)}pt" height="${n2(H)}pt" viewBox="0 0 ${n2(W)} ${n2(H)}">${out.join('')}</svg>`;
  // self check: box overlaps, legend overlap, text inside boxes, dashes
  const issues=[]; const bl=[...lay.items.values()];
  for(let i=0;i<bl.length;i++) for(let j=i+1;j<bl.length;j++){ const a=bl[i],b=bl[j]; if(Math.abs(a.x-b.x)<(a.w+b.w)/2-0.5&&Math.abs(a.y-b.y)<(a.h+b.h)/2-0.5) issues.push('overlap '+a.id+' '+b.id); }
  for(const b of bl){ const X=GX+(b.x-b.w/2)*s, Y=GY+(b.y-b.h/2)*s; if(X<Lx+Lw&&X+b.w*s>Lx&&Y<Ly+Lh&&Y+b.h*s>Ly) issues.push('legend overlaps '+b.id); if(X<M-1||X+b.w*s>W-M+1||Y<areaT-1||Y+b.h*s>footTop) issues.push('outside '+b.id);
    for(const l of b.lines) if(l.w>b.w-2*b.padX-b.stripe+0.5) issues.push('text too wide '+b.id); }
  if(/[\u2013\u2014]/.test(svg)) issues.push('dash in text');
  return {svg,W,H,s,issues,legendMode,title,flines,nameSize:15.5*s};
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
const TP={INK:'#3b3026',INK2:'#7a6c5b',INK3:'#9d907c',TEAL:'#3d8c84',OCHRE:'#c08f2a',CREAM:'#fbf8ef',PAGE:'#fcfaf3',DASH:'#8a7a62',EDGE:'#bfb193',
  SK:'#2f5d8a',SKF:'#eef3f8',SKE:'#8fb0cf',FOL:'#f0f2e2',FRAME:'#d8ccb4',FRAME2:'#e6dcc8',GROUND:'#cfc2a6'};
const T_BROWN=[110,86,62],T_OLIVE=[122,124,78];
const hex2=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const rgbHex=a=>'#'+a.map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
const mixc=(a,b,t)=>rgbHex(a.map((v,i)=>v+(b[i]-v)*t));
const over=(h,op)=>mixc(hex2(TP.PAGE),hex2(h),op);   // opaque colour = h at opacity op over the page (no PDF transparency needed)
const LEAFG=['#8f9d62','#a3ad74','#7f8f57','#b2b98a'];
const UNV_TREE=/^[iu]/;   // drawn as unconfirmed on the poster: link only derived from a list of students, or without any source
const nfmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,'\u00a0');
function rng(seed){ let s=(seed>>>0)||0x9e3779b9; return ()=>{ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; return s/4294967296; }; }
const addExt=(m,l,e)=>{ const a=m.get(l); if(!a) m.set(l,[e[0],e[1]]); else { if(e[0]<a[0]) a[0]=e[0]; if(e[1]>a[1]) a[1]=e[1]; } };

function treeGraph(ctx,rootId,G,usePd){
  const P=ctx.people;
  const advPhd=id=>{ const p=P.get(id); return p?p.adv.filter(a=>P.has(a)&&a!==id):[]; };
  const advOrd=usePd&&ctx.pdAdvisorsOf?id=>{ const a=advPhd(id); return a.concat(ctx.pdAdvisorsOf(id).filter(x=>x!==id&&!a.includes(x))); }:advPhd;
  const isPd=(x,a)=>usePd&&!advPhd(x).includes(a);
  const src=(x,a)=>ctx.edgeSrc?(ctx.edgeSrc(x,a)||''):'';
  const gmin=new Map([[rootId,0]]), par=new Map(); const q=[rootId];
  for(let i=0;i<q.length;i++){ const x=q[i]; for(const a of advOrd(x)) if(!gmin.has(a)){ gmin.set(a,gmin.get(x)+1); par.set(a,x); q.push(a); } }
  const ALL=new Set(gmin.keys()); const order=q.filter(x=>gmin.get(x)<=G); const S=new Set(order);
  const kids=new Map(order.map(x=>[x,[]]));
  for(const x of order) if(x!==rootId) kids.get(par.get(x)).push(x);
  const edge=new Map(); for(const x of order) if(x!==rootId){ const p=par.get(x); edge.set(x,{pd:isPd(p,x),unv:UNV_TREE.test(src(p,x))}); }
  const extra=[]; for(const x of order) for(const a of advOrd(x)) if(S.has(a)&&par.get(a)!==x&&a!==rootId) extra.push({s:x,a,pd:isPd(x,a),unv:UNV_TREE.test(src(x,a))});
  const size=new Map(), leaves=new Map(), height=new Map();
  for(let i=order.length-1;i>=0;i--){ const x=order[i]; let s=1,l=0,h=0; for(const c of kids.get(x)){ s+=size.get(c); l+=leaves.get(c); h=Math.max(h,height.get(c)+1); } size.set(x,s); leaves.set(x,l||1); height.set(x,h); }
  const ancestors=x=>{ const out=new Set(); const st=[x]; while(st.length){ const y=st.pop(); for(const a of advOrd(y)) if(!out.has(a)){ out.add(a); st.push(a); } } return out; };
  const more=new Map(); for(const x of order){ if(advOrd(x).some(a=>!S.has(a))){ let n=0; for(const a of ancestors(x)) if(!S.has(a)) n++; if(n) more.set(x,n); } }
  const pdEdges=[...edge.values()].filter(e=>e.pd).length+extra.filter(e=>e.pd).length;
  return {S,ALL,order,gmin,par,kids,edge,extra,size,leaves,height,more,usePd:!!usePd,pdEdges};
}

function famousPath(ctx,g,rootId){
  const P=ctx.people; const desc=x=>ctx.nDesc?ctx.nDesc(x):(((P.get(x)||{}).mgp||[])[1]||0);
  const cand=g.order.filter(x=>x!==rootId); const yr=x=>P.get(x).year||9999; const gm=x=>g.gmin.get(x);
  if(!cand.length) return {path:[rootId],target:null,d:0,mode:'none',desc};
  let best=null, mode='desc';
  for(const x of cand){ const d=desc(x); if(d>0&&(!best||d>best.d||(d===best.d&&(gm(x)>gm(best.x)||(gm(x)===gm(best.x)&&yr(x)<yr(best.x)))))) best={x,d}; }
  if(!best){ mode='deep'; let b=cand[0]; for(const x of cand) if(gm(x)>gm(b)||(gm(x)===gm(b)&&yr(x)<yr(b))) b=x; best={x:b,d:0}; }
  const path=[]; for(let x=best.x;x!==rootId;x=g.par.get(x)) path.push(x); path.push(rootId); path.reverse();
  for(let x=best.x;g.kids.get(x).length;){ const ks=g.kids.get(x); let nx=ks[0]; for(const k of ks) if(desc(k)>desc(nx)||(desc(k)===desc(nx)&&g.height.get(k)>g.height.get(nx))) nx=k; path.push(nx); x=nx; }
  return {path,target:best.x,d:best.d,mode,desc};
}

function treeLayout(ctx,tw,g,fp,rootId,cfg){
  const P=ctx.people, S=g.S, kids=g.kids, size=g.size, hlSet=new Set(fp.path);
  const NS=cfg.ns, MS=cfg.ms;
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
    const pr=p.primary; const yr=pr&&pr.year?String(pr.year):''; const sch=pr?schoolShort(pr.school):'';
    let meta=yr&&sch?yr+' · '+sch:(yr||sch||'údaje o titule neuvedené');
    if(root&&pr&&pr.deg&&clean(pr.deg).length<=14&&(yr||sch)) meta=clean(pr.deg)+' '+meta;
    wrapText(tw,meta,ms,'italic',root?1e4:cfg.nameW+14).forEach((t,i)=>lines.push({t,size:ms,style:'italic',fill:TP.INK2,lh:ms*1.25,gap:i?0:-1}));
    if(p.sk){ const tag=p.sk==='rod'?'RODÁK ZO SLOVENSKA':ctx.isFemale(p)?'SLOVENSKÁ MATEMATIČKA':'SLOVENSKÝ MATEMATIK'; lines.push({t:tag,size:ms*0.84,style:'normal',fill:TP.SK,lh:ms*1.2,gap:0.5}); }
    if(g.more.has(x)) lines.push({t:'ďalší predkovia: '+g.more.get(x),size:ms*0.92,style:'italic',fill:TP.INK3,lh:ms*1.18});
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
  const P=ctx.people, rootP=P.get(rootId), cfg=lay.cfg;
  const W=1190.55,H=1683.78,M=46;
  const out=[]; const T=(x,y,t,size,style,fill,anchor,extra)=>{ const w=tw(t,size,style); const x0=anchor==='middle'?x-w/2:anchor==='end'?x-w:x; out.push(`<text x="${n2(x0)}" y="${n2(y)}" font-family="${FONT}" font-size="${n2(size)}"${style==='italic'?' font-style="italic"':''}${style==='bold'?' font-weight="bold"':''} fill="${fill}"${extra||''}>${xesc(t)}</text>`); return w; };
  const name=clean(rootP.name);
  // ----- title block
  const gen=genitive(rootP.name,ctx.isFemale(rootP));
  const title=gen?'Akademický rodokmeň '+gen:'Akademický rodokmeň: '+name;
  const maxTW=W-2*M-40; let ts=50; { const w0=tw(title,ts,'normal'); if(w0>maxTW) ts*=maxTW/w0; }
  const sub='Rodokmeň slovenskej matematiky · zdroj: slovenskivedci.sk/rodokmen (čerpá z viacerých zdrojov, najmä z Mathematics Genealogy Project)';
  let ss=16; { const w1=tw(sub,ss,'italic'); if(w1>maxTW) ss*=maxTW/w1; }
  // ----- footer
  const n=g.S.size, kk=n-1, tot=g.ALL.size-1, om=g.ALL.size-g.S.size, G=opts.gens, cut=om>0;
  let f1;
  if(kk===0) f1=`${name}: v databáze zatiaľ nie sú známi školitelia.`;
  else if(kk===1) f1=`Zobrazené sú 2 osoby: ${name} a ${cut?'jeho alebo jej školiteľ':'jediný známy predok'}.`;
  else f1=`Zobrazen${n>=5?'ých':'é sú'} ${n} ${pl(n,'osoba','osoby','osôb')}: ${name} a ${kk>=5?'všetkých':'všetci'} ${kk} ${pl(kk,'predok','predkovia','predkov')}`+
    (cut?`, ku ktorým vedie aspoň jedna línia dlhá najviac ${G} ${pl(G,'generácia','generácie','generácií')}.`:'.')+' Každá osoba je nakreslená raz; čím vyššie, tým staršia generácia.'+(g.pdEdges?' Zahrnutí sú aj predkovia cez postdoktorandských školiteľov (zelená vetva).':'');
  const dp=(g.usePd&&ctx.deepestAll?ctx.deepestAll:ctx.deepest)(rootId); const oldest=P.get(dp.root);
  const dt=(ctx.generated||'').split('-'); const dstr=dt.length===3?`${+dt[2]}. ${+dt[1]}. ${dt[0]}`:'';
  const f2=cut?`Úplný rodokmeň má ${tot} ${pl(tot,'predka','predkov','predkov')} (najdlhšia línia siaha ${dp.g} ${pl(dp.g,'generáciu','generácie','generácií')} do minulosti, k osobe ${clean(oldest.name)}); ${om} ${pl(om,'starší predok tu nie je zobrazený','starší predkovia tu nie sú zobrazení','starších predkov tu nie je zobrazených')}. `:(kk?'Zobrazený je celý známy rodokmeň. ':'');
  const f3=`Údaje: slovenskivedci.sk/rodokmen${dstr?', stav k '+dstr:''}.`;
  const fs=12.5, flh=18, fmax=W-2*M-30;
  const w23=wrapText(tw,clean(f2+f3),fs,'normal',fmax);
  const flines=wrapText(tw,clean(f1),fs,'normal',fmax).concat(w23.length===1||!f2?w23:wrapText(tw,clean(f2),fs,'normal',fmax).concat([f3]));
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
    const why=fp.mode==='desc'?`vedie k predkovi s najviac akademickými potomkami: ${baseName(P.get(fp.target).name)} (${nfmt(fp.d)})`:'najdlhšia línia (údaje o potomkoch chýbajú)';
    LI.push({sw:'hl',t1:'Zvýraznená vetva: '+chain.join(' → '),t2:why});
  }
  if(kk) LI.push({sw:'branch',t1:'Vetva: školiteľ (vyššie) a doktorand'});
  const hasPd=[...g.edge.values()].some(e=>e.pd)||g.extra.some(e=>e.pd);
  if(hasPd) LI.push({sw:'pd',t1:'Postdoktorandský školiteľ a postdoktorand'});
  if(g.extra.some(e=>!e.pd)) LI.push({sw:'dash',t1:'Ďalší školiteľ už nakreslenej osoby',t2:'(druhá cesta k tej istej osobe)'});
  const hasUnv=[...g.edge.values()].some(e=>e.unv)||g.extra.some(e=>e.unv);
  if(hasUnv) LI.push({sw:'unv',t1:'Neoverený vzťah',t2:'(odvodený zo zoznamu žiakov alebo bez zdroja)'});
  if([...g.S].some(x=>P.get(x).sk)) LI.push({sw:'sk',t1:'Slovenský matematik alebo rodák zo Slovenska'});
  if(g.more.size) LI.push({sw:'more',t1:'ďalší predkovia: n',t2:'= počet starších predkov mimo výrezu'});
  const L1=11, L2=9.6, lpad=14, lsw=36, ltx=lpad+lsw+10, LWmax=270;
  for(const it of LI){ it.l1=wrapText(tw,it.t1,L1,'normal',LWmax); it.l2=it.t2?wrapText(tw,it.t2,L2,'italic',LWmax):[]; it.h=Math.max(18,it.l1.length*13.4+it.l2.length*12)+6; }
  let lw=0; for(const it of LI){ for(const t of it.l1) lw=Math.max(lw,tw(t,L1,'normal')); for(const t of it.l2) lw=Math.max(lw,tw(t,L2,'italic')); }
  const Lw=ltx+lw+lpad, Lh=LI.length?40+LI.reduce((a,it)=>a+it.h,0)+2:0;
  // ----- geometry of the tree in design units
  const {X,lab,lvl,isT,side,Wd,B,trunk}=lay; const S=g.S, size=g.size;
  const boxOf=(x,Y)=>{ const b=lab.get(x), y=Y[lvl(x)]+lay.dome(x), xx=X.get(x);
    if(x===rootId) return [xx-b.w/2,y+5,b.w,b.h];
    if(isT(x)){ const w=Wd(size.get(x)); return [side.get(x)>0?xx+w/2+cfg.twig:xx-w/2-cfg.twig-b.w,y-b.h/2,b.w,b.h]; }
    return [xx-b.w/2,y-b.h/2,b.w,b.h]; };
  const rootLab=lab.get(rootId);
  const groundHalf=Math.max(rootLab.w/2+90,230);
  const ext=Y=>{ let x0=-groundHalf,x1=groundHalf,y0=Infinity,y1=-Infinity; for(const x of S){ const b=boxOf(x,Y); const fx=isT(x)||x===rootId?0:22; x0=Math.min(x0,b[0]-fx); x1=Math.max(x1,b[0]+b[2]+fx); y0=Math.min(y0,b[1]-(isT(x)||x===rootId?4:18)); y1=Math.max(y1,b[1]+b[3]); }
    y1=Math.max(y1,5+rootLab.h+8); return {x0,x1,y0,y1}; };
  const areaT=M+150, areaB0=footTop-22, areaL=M+10, areaR0=W-M-10;
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
    for(const x of S) if(x!==rootId){ const p=g.par.get(x); const a=[X.get(p),f.Y[lvl(p)]+lay.dome(p)], c=[X.get(x),f.Y[lvl(x)]+lay.dome(x)]; for(let t=0;t<=1.001;t+=0.1){ const px=a[0]+(c[0]-a[0])*t, py=a[1]+(c[1]-a[1])*t; R.push([f.GX+px*f.s-6,f.GY+py*f.s-6,12,12]); } }
    const yG=f.GY+(5+rootLab.h*0.7)*f.s; R.push([f.GX-groundHalf*f.s,yG-50*f.s,2*groundHalf*f.s,54*f.s]); return R; };
  const freeAt=(R,x,y)=>!R.some(r=>r[0]<x+Lw+8&&r[0]+r[2]>x-8&&r[1]<y+Lh+8&&r[1]+r[3]>y-8);
  let F=fit(areaR0,areaB0), Lx=null, Ly=null, legendMode='none';
  if(LI.length){
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
  G2.push(`<path d="M${n2(-groundHalf)},${n2(yG)} Q0,${n2(yG-22)} ${n2(groundHalf)},${n2(yG)}" fill="none" stroke="${TP.GROUND}" stroke-width="1"/>`);
  for(const x of S){ if(isT(x)&&(x!==B||g.kids.get(x).length)||x===rootId) continue; const b=boxOf(x,Y); G2.push(`<ellipse cx="${n2(b[0]+b[2]/2)}" cy="${n2(b[1]+b[3]/2)}" rx="${n2(b[2]/2+34)}" ry="${n2(b[3]/2+30)}" fill="${TP.FOL}"/>`); }
  const rootsCol=mixc(T_BROWN,T_OLIVE,0.1); const fl=Math.min(1,tW[0]/24);
  // roots: from the trunk base outward and down to the ground line, mostly behind the pill
  for(const sg of [-1,1]) for(const [ex,w] of [[22,8],[58,5.5],[100,4]]){ const x3=sg*(rootLab.w/2+ex*Math.max(0.6,fl)), p0=[sg*tW[0]*0.25,0], p3=[x3,yG-1];
    G2.push(`<path d="${polyTaper(curvePts([p0,[sg*tW[0]*0.6,yG*0.35],[x3*0.55,yG-4],p3],24),Array.from({length:25},(_,i)=>w*1.5*fl*(1-i/24)+0.5*i/24))}" fill="${rootsCol}"/>`); }
  G2.push(`<path d="${polyTaper(tp,tws)}" fill="${brCol(size.get(rootId))}"/>`);
  // trunk sections: postdoc (teal) and unconfirmed (dots)
  const pdTags=[];
  for(let i=1;i<trunk.length;i++){ const x=trunk[i], e=g.edge.get(x); const ya=i-1===0?yBot:tY[i-1], yb=tY[i]; const idx=tp.map((p,j)=>j).filter(j=>tp[j][1]<=ya+0.01&&tp[j][1]>=yb-0.01);
    if(idx.length<2) continue;
    if(e.pd){ G2.push(`<path d="${polyTaper(idx.map(j=>tp[j]),idx.map(j=>tws[j]))}" fill="${TP.TEAL}"/>`); pdTags.push({trunk:true,y0:ya,y1:yb,w:trunkW((ya+yb)/2)}); }
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
    G2.push(`<path d="${polyTaper(pts,pts.map((q,i)=>w*1.1+(w*0.72-w*1.1)*i/28))}" fill="${e.pd?TP.TEAL:brCol(size.get(x))}"/>`);
    if(e.unv) G2.push(dots(pts.slice(3,-3),Math.max(0.8,w*0.17)));
    if(e.pd){ const m=bz(c[0],c[1],c[2],c[3],0.5); pdTags.push({trunk:false,x:m[0],y:m[1],dir:Math.sign(E[0]-S0[0])||1}); }
    if(hlEdge(x)) veins.push(cpath(c)); }
  // twigs to trunk labels
  for(const x of trunk){ if(x===rootId) continue; const b=boxOf(x,Y), sd=side.get(x), y=Yl(x); const ex=sd>0?b[0]:b[0]+b[2], ey=b[1]+b[3]/2; const sx=sd*(trunkW(y)/2-2);
    G2.push(`<path d="${polyTaper(curvePts([[sx,y+5],[sx+sd*10,y+1],[ex-sd*12,ey+3],[ex+sd*2,ey]],16),Array.from({length:17},(_,i)=>4.2-2.6*i/16))}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`); }
  for(const d of veins) G2.push(`<path d="${d}" fill="none" stroke="${TP.OCHRE}" stroke-width="2" stroke-linecap="round"/>`);
  // leaves
  const rnd=rng(Math.abs(rootId)*2654435761);
  const leaf=(x,y,ang,Ln,col)=>{ const a=ang*Math.PI/180, ux=Math.cos(a), uy=Math.sin(a), nx=-uy, ny=ux, w=Ln*0.36; const tip=[x+ux*Ln,y+uy*Ln], m1=[x+ux*Ln*0.5+nx*w,y+uy*Ln*0.5+ny*w], m2=[x+ux*Ln*0.5-nx*w,y+uy*Ln*0.5-ny*w];
    return `<path d="M${n2(x)},${n2(y)} Q${n2(m1[0])},${n2(m1[1])} ${n2(tip[0])},${n2(tip[1])} Q${n2(m2[0])},${n2(m2[1])} ${n2(x)},${n2(y)}Z" fill="${col}"/>`; };
  for(const x of g.order){ if(x===rootId) continue; const leafy=!g.kids.get(x).length; if(isT(x)&&!(x===B&&leafy)) continue; const nL=leafy?7:3; const b=boxOf(x,Y), cxx=b[0]+b[2]/2, cyy=b[1]+b[3]/2;
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
  for(const t of pdTags){
    if(t.trunk){ const len=t.y0-t.y1; let fz=Math.min(8,0.8*len/Math.max(1,tw('postdoktorand',1,'italic'))); const ym=(t.y0+t.y1)/2;
      if(fz>=4.6&&t.w>=fz+3){ const wv=tw('postdoktorand',fz,'italic'); G2.push(`<text transform="translate(${n2(fz*0.34)} ${n2(ym+wv/2)}) rotate(-90)" x="0" y="0" font-family="${FONT}" font-size="${n2(fz)}" font-style="italic" fill="${TP.CREAM}">postdoktorand</text>`); }
      else { const fz2=7.5, wv=tw('postdoktorand',fz2,'italic'); let best=null; for(const sd of [-1,1]){ const x0=sd>0?t.w/2+4:-t.w/2-4-wv; const bx=[x0,ym-fz2*0.7,wv,fz2]; const hit=[...boxes.values()].some(b=>b[0]<bx[0]+bx[2]+2&&bx[0]<b[0]+b[2]+2&&b[1]<bx[1]+bx[3]+2&&bx[1]<b[1]+b[3]+2); if(!hit){ best=x0; break; } }
        if(best!=null) G2.push(`<text x="${n2(best)}" y="${n2(ym+fz2*0.3)}" font-family="${FONT}" font-size="${fz2}" font-style="italic" fill="${TP.TEAL}">postdoktorand</text>`); } }
    else { const fz2=7.5, wv=tw('postdoktorand',fz2,'italic'); const x0=t.dir>0?t.x+6:t.x-6-wv; G2.push(`<text x="${n2(x0)}" y="${n2(t.y+3)}" font-family="${FONT}" font-size="${fz2}" font-style="italic" fill="${TP.TEAL}">postdoktorand</text>`); boxes.set('pd'+t.x,[x0,t.y-5,wv,9]); } }
  // pills
  for(const x of S){ const b=lab.get(x), bx=boxes.get(x); const [x0,y0,w,h]=bx; const r=Math.min(10,h/2);
    const fill=b.sk?TP.SKF:TP.CREAM, stroke=b.hl?TP.OCHRE:b.sk?TP.SKE:TP.EDGE, sw=b.hl?(b.root?1.8:1.3):b.sk?0.9:0.6;
    G2.push(`<rect x="${n2(x0)}" y="${n2(y0)}" width="${n2(w)}" height="${n2(h)}" rx="${n2(r)}" ry="${n2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    let yy=y0+b.padY; for(const l of b.lines){ yy+=(l.gap||0); G2.push(`<text x="${n2(x0+(w-l.w)/2)}" y="${n2(yy+l.size*0.86+(l.lh-l.size*1.12)*0.5)}" font-family="${FONT}" font-size="${n2(l.size)}"${l.style==='italic'?' font-style="italic"':''} fill="${l.fill}">${xesc(l.t)}</text>`); yy+=l.lh; } }
  // ----- page
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="${TP.PAGE}"/>`);
  out.push(`<rect x="22" y="22" width="${n2(W-44)}" height="${n2(H-44)}" fill="none" stroke="${TP.FRAME}" stroke-width="0.8"/>`);
  out.push(`<rect x="27" y="27" width="${n2(W-54)}" height="${n2(H-54)}" fill="none" stroke="${TP.FRAME2}" stroke-width="0.4"/>`);
  T(W/2,M+62,title,ts,'normal',TP.INK,'middle');
  T(W/2,M+96,sub,ss,'italic',TP.INK2,'middle');
  const dy0=M+118; out.push(`<path d="M${n2(W/2-210)},${dy0} L${n2(W/2-14)},${dy0} M${n2(W/2+14)},${dy0} L${n2(W/2+210)},${dy0}" stroke="${TP.OCHRE}" stroke-width="0.8" fill="none"/>`);
  out.push(leaf(W/2-9,dy0,0,18,over('#8f9d62',0.85)));
  out.push(`<g transform="translate(${n2(GX)} ${n2(GY)}) scale(${s.toFixed(5)})">${G2.join('')}</g>`);
  // legend
  if(LI.length){ out.push(`<rect x="${n2(Lx)}" y="${n2(Ly)}" width="${n2(Lw)}" height="${n2(Lh)}" rx="8" ry="8" fill="${TP.CREAM}" stroke="${TP.FRAME}" stroke-width="0.7"/>`);
    { let xx=Lx+lpad; for(const ch of 'LEGENDA'){ xx+=T(xx,Ly+26,ch,12.5,'normal',TP.INK)+2.4; } }
    let yy=Ly+40; const tp2=(x,y,w0,w1,col)=>polyTaper(curvePts([[x,y+3],[x+14,y+1],[x+28,y],[x+lsw,y-2]],16),Array.from({length:17},(_,i)=>w0+(w1-w0)*i/16));
    for(const it of LI){ const sx=Lx+lpad, cy=yy+7;
      if(it.sw==='branch') out.push(`<path d="${tp2(sx,cy,6,2)}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`);
      else if(it.sw==='pd') out.push(`<path d="${tp2(sx,cy,6,4)}" fill="${TP.TEAL}"/>`);
      else if(it.sw==='dash') out.push(`<path d="M${n2(sx)},${n2(cy+2)} Q${n2(sx+20)},${n2(cy-8)} ${n2(sx+lsw)},${n2(cy+2)}" fill="none" stroke="${TP.DASH}" stroke-width="0.9" stroke-dasharray="3 3"/>`);
      else if(it.sw==='unv'){ out.push(`<path d="${tp2(sx,cy,6,4)}" fill="${mixc(T_BROWN,T_OLIVE,0.3)}"/>`); for(let k2=0;k2<5;k2++) out.push(`<circle cx="${n2(sx+5+k2*7.5)}" cy="${n2(cy+1.6-k2*0.8)}" r="1" fill="${TP.CREAM}"/>`); }
      else if(it.sw==='hl') out.push(`<path d="M${n2(sx)},${n2(cy+1)} L${n2(sx+lsw)},${n2(cy+1)}" stroke="${TP.OCHRE}" stroke-width="2.2" stroke-linecap="round"/><rect x="${n2(sx+lsw/2-9)}" y="${n2(cy-6)}" width="18" height="14" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.OCHRE}" stroke-width="1.2"/>`);
      else if(it.sw==='sk') out.push(`<rect x="${n2(sx+4)}" y="${n2(cy-6)}" width="${lsw-8}" height="14" rx="5" ry="5" fill="${TP.SKF}" stroke="${TP.SKE}" stroke-width="0.9"/>`);
      else if(it.sw==='more') out.push(`<rect x="${n2(sx+4)}" y="${n2(cy-6)}" width="${lsw-8}" height="14" rx="5" ry="5" fill="${TP.CREAM}" stroke="${TP.EDGE}" stroke-width="0.6"/>`);
      let ty=yy+11; for(const t of it.l1){ T(Lx+ltx,ty,t,L1,it.sw==='more'?'italic':'normal',it.sw==='more'?TP.INK3:TP.INK); ty+=13.4; } for(const t of it.l2){ T(Lx+ltx,ty-1,t,L2,'italic',TP.INK2); ty+=12; }
      yy+=it.h; } }
  flines.forEach((t,i)=>T(W/2,footTop+fs+i*flh,t,fs,'normal',TP.INK2,'middle'));
  // ----- self check
  const issues=[]; const P2=(b)=>[GX+b[0]*s,GY+b[1]*s,b[2]*s,b[3]*s];
  const all=[...boxes.entries()];
  for(let i=0;i<all.length;i++) for(let j=i+1;j<all.length;j++){ const A=all[i][1], Bb=all[j][1]; if(A[0]<Bb[0]+Bb[2]-0.5&&Bb[0]<A[0]+A[2]-0.5&&A[1]<Bb[1]+Bb[3]-0.5&&Bb[1]<A[1]+A[3]-0.5) issues.push('overlap '+all[i][0]+' '+all[j][0]); }
  for(const [x,b] of all){ const q=P2(b); if(q[0]<M-14||q[0]+q[2]>W-M+14||q[1]<areaT-6||q[1]+q[3]>footTop) issues.push('outside '+x); if(LI.length&&q[0]<Lx+Lw&&q[0]+q[2]>Lx&&q[1]<Ly+Lh&&q[1]+q[3]>Ly) issues.push('legend overlaps '+x); }
  // branches running under a label that is not their own end
  for(const [x,c] of curveOf){ const p=g.par.get(x); const pts=curvePts(c,24).slice(2,-2); for(const [y,b] of boxes){ if(y===x||y===p||typeof y!=='number') continue; if(pts.some(q=>q[0]>b[0]+2&&q[0]<b[0]+b[2]-2&&q[1]>b[1]+2&&q[1]<b[1]+b[3]-2)){ issues.push('branch '+p+'>'+x+' under '+y); } } }
  const svgInner=out.join('');
  if(/[\u2013\u2014]/.test(svgInner)) issues.push('dash in text');
  return {svgInner,W,H,s,issues,legendMode,title,flines,nameSize:cfg.ns*s,centered:F.centered,extra:F.extra};
}

const TREE_FAMOUS=new Set([10480,55185]);  // with FAMOUS: also Kolmogorov and Liouville may be named in the legend when on the highlighted branch
const TREE_BASE={c1:0.3,c2:0.7,maxTiers:3,lean:16,dome:46,ns:13,ms:8.6,wmax:34,dom:0.5,affW:0.5,hgap:12,twig:20,stem:5,availW:1050,tgap:8,gmin:12,g0:14,gk:0.22,gmax:110,xmax:70,smax:1.3,nameW:150,stagger:false};
const TREE_CFGS=opts=>opts.treeCfgs||[{},{stagger:true},{stagger:true,availW:600},{stagger:true,availW:300},{nameW:120,stagger:true},{nameW:120,stagger:true,availW:400},{nameW:96,stagger:true,availW:400}];
async function buildTree(ctx,rootId,opts){
  const fonts=await loadLibs();
  const doc=newDoc(fonts,opts.paper); const tw=makeMeasure(doc);
  const g=treeGraph(ctx,rootId,opts.gens,opts.postdoc!==false);
  const fp=famousPath(ctx,g,rootId);
  let best=null; const tries=[];
  for(const c of TREE_CFGS(opts)){ const cfg=Object.assign({},TREE_BASE,opts.treeCfg||{},c); const lay=treeLayout(ctx,tw,g,fp,rootId,cfg); const comp=treeCompose(ctx,tw,g,fp,lay,rootId,opts);
    const hard=comp.issues.filter(t=>!/^branch /.test(t)).length, soft=comp.issues.length-hard;
    const score=Math.min(comp.s,1)*(cfg.stagger?0.96:1)*(cfg.nameW>=150?1:cfg.nameW>=120?0.9:0.82)*(hard?0.8:1)*Math.pow(0.985,Math.min(soft,10))*(/^free/.test(comp.legendMode)||comp.legendMode==='none'?1:0.95); tries.push([cfg.nameW,cfg.stagger,cfg.availW,+comp.s.toFixed(3),comp.issues.length,comp.legendMode,+score.toFixed(3)]);
    if(!best||score>best.score) best={lay,comp,cfg,score}; if(comp.s>=0.999&&!comp.issues.length) break; }
  const {comp,lay}=best; const [PW,PH]=PAPER[opts.paper]; const k=PW/comp.W;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${n2(PW)}pt" height="${n2(PH)}pt" viewBox="0 0 ${n2(PW)} ${n2(PH)}"><g transform="scale(${k.toFixed(6)})">${comp.svgInner}</g></svg>`;
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
  holder.innerHTML=svg; document.body.appendChild(holder);
  doc.setFont(FONT,'normal'); doc.setFontSize(12);
  try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:PW,height:PH}); } finally { holder.remove(); }
  const p=ctx.people.get(rootId);
  doc.setProperties({title:comp.title,subject:'Rodokmeň slovenskej matematiky',creator:'slovenskivedci.sk/rodokmen',author:'slovenskivedci.sk'});
  const filename=`${fileSlug(p.name)}_rodokmen_strom_${opts.paper}.pdf`;
  const report={style:'strom',tries,filename,people:g.S.size,ancestors:g.ALL.size-1,omitted:g.ALL.size-g.S.size,generations:Math.max(...[...g.S].map(x=>g.gmin.get(x))),
    trunk:lay.trunk.map(x=>ctx.people.get(x).name),highlight:fp.path.map(x=>ctx.people.get(x).name),highlightMode:fp.mode,highlightTarget:fp.target!=null?ctx.people.get(fp.target).name:null,highlightDesc:fp.d,
    extraLinks:g.extra.length,postdoc:g.usePd,pdEdges:g.pdEdges,scale:+(comp.s*k).toFixed(4),nameSizePt:+(comp.nameSize*k).toFixed(2),metaSizePt:+(lay.cfg.ms*comp.s*k).toFixed(2),legend:comp.legendMode,centered:comp.centered,
    staggeredRows:lay.tiers.filter(t=>t>1).length,issues:comp.issues,cfg:{nameW:best.cfg.nameW,stagger:best.cfg.stagger,availW:best.cfg.availW},footer:comp.flines,title:comp.title};
  return {doc,filename,svg,report};
}

/* ---------- public ---------- */
async function build(ctx,rootId,opts){
  opts=Object.assign({gens:14,paper:'A2',style:'strom'},opts||{}); if(!PAPER[opts.paper]) opts.paper='A2';
  return opts.style==='klasicky'?buildClassic(ctx,rootId,opts):buildTree(ctx,rootId,opts);
}
async function buildClassic(ctx,rootId,opts){
  const fonts=await loadLibs();
  const doc=newDoc(fonts,opts.paper); const tw=makeMeasure(doc);
  const g=buildGraph(ctx,rootId,opts.gens,opts.postdoc!==false);
  // try a few box widths; keep the one that prints largest
  let best=null; const tries=[];
  for(const cfg of [{nameW:150,metaW:175,nodeSep:22,rankSep:34,qpIter:90,huber:12},{nameW:118,metaW:140,nodeSep:18,rankSep:34,qpIter:90,huber:12},{nameW:96,metaW:118,nodeSep:14,rankSep:32,qpIter:90,huber:12}]){
    const lay=layout(ctx,tw,g,cfg);
    for(const rowMode of ['fill','base']){ const comp=compose(ctx,tw,g,lay,rootId,Object.assign({},opts,{rowMode}));
      tries.push([cfg.nameW,rowMode,+comp.s.toFixed(3),+lay.rankSep.toFixed(1),comp.legendMode]);
      if(!best||comp.s>best.comp.s*1.02) best={lay,comp,cfg,rowMode,rankSep:lay.rankSep}; }
    if(best.lay===lay&&best.rowMode!==tries[tries.length-1][1]) setRows(lay,best.rankSep);
    if(best.comp.s>=0.8*(PAPER[opts.paper][0]/1190.55)) break;
  }
  const {comp,lay}=best;
  const holder=document.createElement('div'); holder.style.cssText='position:fixed;left:-100000px;top:0;width:10px;height:10px;overflow:hidden';
  holder.innerHTML=comp.svg; document.body.appendChild(holder);
  /* svg2pdf only switches fonts when the SVG style differs from its inherited state, so reset the font the text measurer left behind */
  doc.setFont(FONT,'normal'); doc.setFontSize(12);
  try{ if(!opts.svgOnly) await window.svg2pdf.svg2pdf(holder.firstElementChild,doc,{x:0,y:0,width:comp.W,height:comp.H}); } finally { holder.remove(); }
  const p=ctx.people.get(rootId);
  doc.setProperties({title:comp.title,subject:'Rodokmeň slovenskej matematiky',creator:'slovenskivedci.sk/rodokmen',author:'slovenskivedci.sk'});
  const filename=`${fileSlug(p.name)}_predkovia_${opts.paper}.pdf`;
  const report={style:'klasicky',tries,rowMode:best.rowMode,rankSep:best.rankSep,gw:lay.gw,gh:lay.gh,packW:lay.packW,filename,people:g.S.size,ancestors:g.ALL.size-1,omitted:g.ALL.size-g.S.size,rows:lay.maxR+1,mainLine:g.main.map(x=>ctx.people.get(x).name),crossings:lay.crossings,postdoc:g.usePd,pdEdges:g.pdEdges,scale:comp.s,nameSizePt:comp.nameSize,legend:comp.legendMode,issues:comp.issues,cfg:best.cfg,footer:comp.flines,title:comp.title};
  return {doc,filename,svg:comp.svg,report};
}
async function download(ctx,rootId,opts){ const r=await build(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.last={report:r.report,svg:r.svg}; return r.report; }
window.RodokmenPrint={build,download,preload:loadLibs,_t:{genitive,schoolShort,surname,fileSlug,treeGraph,famousPath}};
})();
