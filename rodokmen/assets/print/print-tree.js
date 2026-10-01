/* Rodokmeň slovenskej matematiky: printable ancestor tree (vector PDF, A2 or A3).
   Loaded on demand from rodokmen/index.html when "Vytlačiť rodokmeň predkov" is clicked.
   Layout: generations as rows (longest line from the person), layered DAG with dummy nodes,
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
const clean=s=>String(s??'').replace(/\s*[\u2012\u2013\u2014\u2015]\s*/g,m=>/\s/.test(m)?' - ':'-').replace(/\s+/g,' ').trim();
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

/* ---------- public ---------- */
async function build(ctx,rootId,opts){
  opts=Object.assign({gens:14,paper:'A2'},opts||{}); if(!PAPER[opts.paper]) opts.paper='A2';
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
  const report={tries,rowMode:best.rowMode,rankSep:best.rankSep,gw:lay.gw,gh:lay.gh,packW:lay.packW,filename,people:g.S.size,ancestors:g.ALL.size-1,omitted:g.ALL.size-g.S.size,rows:lay.maxR+1,mainLine:g.main.map(x=>ctx.people.get(x).name),crossings:lay.crossings,postdoc:g.usePd,pdEdges:g.pdEdges,scale:comp.s,nameSizePt:comp.nameSize,legend:comp.legendMode,issues:comp.issues,cfg:best.cfg,footer:comp.flines,title:comp.title};
  return {doc,filename,svg:comp.svg,report};
}
async function download(ctx,rootId,opts){ const r=await build(ctx,rootId,opts); r.doc.save(r.filename); window.RodokmenPrint.last={report:r.report,svg:r.svg}; return r.report; }
window.RodokmenPrint={build,download,preload:loadLibs,_t:{genitive,schoolShort,surname,fileSlug}};
})();
