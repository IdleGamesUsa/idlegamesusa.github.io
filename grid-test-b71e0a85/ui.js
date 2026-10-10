// ================= UI / rendering =================
const cv=$('cv'),cx=cv.getContext('2d');g=cx;let VW=400,VH=640,DPR=1,SC=1;
let view='map',SEL=null,last=0,RAF=0;
function size(){const w=cv.clientWidth||392;DPR=Math.min(2,devicePixelRatio||1);cv.width=Math.round(w*DPR);cv.height=Math.round(w*VH/VW*DPR);cv.style.height=w*VH/VW+'px';SC=cv.width/VW;cx.setTransform(SC,0,0,SC,0,0);CACHE={}}
let CACHE={};
function off(key,w,h,rev,fn){let c=CACHE[key];if(!c||c.rev!==rev){c=CACHE[key]||document.createElement('canvas');c.width=Math.ceil(w*SC);c.height=Math.ceil(h*SC);const x=c.getContext('2d');x.setTransform(SC,0,0,SC,0,0);x.clearRect(0,0,w,h);const o=g;g=x;fn();g=o;c.rev=rev;CACHE[key]=c}return c}
// ---------- square view ----------
function entState(i,sd){const n=layout(i).ent[sd].n;if(!S.sq[i])return 'lock';if(n!==1&&!S.sq[n])return 'lock';if(NEEDSUB(i)&&!S.step)return 'red';return C.net[n]?'on':'red'}
function spanState(i,s){if(builtSet(i).has(s.id))return segOn(C,i,s)?'on':'red';return spanBuyable(i,s)?'conn':'lock'}
function staticSquare(i,mini){const L=layout(i),un=!!S.sq[i];ground(L,i);
 L.B.forEach((b,k)=>{const s=un?C.bst[i][k]:'lock',lk=s==='lock'||s==='conn';if(lk||!un){g.save();g.filter='grayscale(1) brightness(.6)';g.globalAlpha=.6}bld(b,s==='on');if(lk||!un)g.restore();g.filter='none';
  if(s==='nomw'){g.fillStyle='rgba(245,184,75,.18)';g.fillRect(b.x-2,b.y-2,b.w+4,b.h+4)}});
 if(mini)dynSquare(i,true)}
function dynSquare(i,mini){const L=layout(i),un=!!S.sq[i];
 for(const sd in L.ent){const e=L.ent[sd];seg2({x:e.x,y:e.y},{x:e.sx,y:e.sy},entState(i,sd),4.5)}
 for(const s of L.segs){const k=spanState(i,s);seg2({x:s.a[0],y:s.a[1]},{x:s.b[0],y:s.b[1]},k==='conn'&&!mini?'conn':k==='conn'?'lock':k,k==='lock'||k==='conn'?1.4:3.2)}
 L.B.forEach((b,k)=>{const s=un?C.bst[i][k]:'lock';seg2({x:b.qx,y:b.qy},{x:b.px,y:b.py},s==='nomw'?'red':s==='conn'&&mini?'lock':s,s==='lock'?1:1.6);pole(b.px,b.py,s==='nomw'?'conn':s==='conn'?'lock':s)});
 for(const sd in L.ent){const e=L.ent[sd],es=entState(i,sd);station(e,es,L.sub,{L:'◀',R:'▶',T:'▲',B:'▼'}[sd]+' #'+e.n+' '+(es==='on'?'live':NEEDSUB(i)&&!S.step&&S.sq[i]?'needs step-up':es==='red'?'no power':'locked'),!mini)}}
function drawSquareView(i){const L=layout(i);g.drawImage(off('sq'+i,LW,LH,REV,()=>staticSquare(i,false)),0,0,LW,LH);cars(L);dynSquare(i,false);
 L.B.forEach((b,k)=>{const s=C.bst[i][k];if(s==='nomw')pill(b.x+b.w/2,b.y+6,'⚡ need MW','rgba(70,40,0,.92)','#f5b84b',8.5)});
 if(SEL&&SEL.i===i){g.strokeStyle='#f5b84b';g.lineWidth=2.5;g.setLineDash([4,3]);if(SEL.k==='b'){const b=L.B[SEL.id];rr(b.x-4,b.y-4,b.w+8,b.h+14,6);g.stroke()}else{const s=L.segs[SEL.id];g.beginPath();g.moveTo(s.a[0],s.a[1]);g.lineTo(s.b[0],s.b[1]);g.lineWidth=7;g.globalAlpha=.6;g.stroke();g.globalAlpha=1}g.setLineDash([])}}
// ---------- map ----------
const GX=14,GY=12,TW=(400-4*GX)/3,TH=(640-6*GY)/5;const tile=i=>({x:GX+SQ[i][0]*(TW+GX),y:GY+SQ[i][1]*(TH+GY)});
function linkState(a,b){const ua=a===1||!!S.sq[a],ub=b===1||!!S.sq[b];if(!ua||!ub)return 'lock';return C.net[a]&&C.net[b]?'on':'red'}
function drawMap(){g.fillStyle='#161d2c';g.fillRect(0,0,400,640);
 for(let i=1;i<=15;i++)for(let j=i+1;j<=15;j++){const a=SQ[i],b=SQ[j];if(Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1])!==1)continue;const s=linkState(i,j),A=tile(i),B=tile(j),p={x:A.x+TW/2,y:A.y+TH/2},q={x:B.x+TW/2,y:B.y+TH/2};
  seg2(p,q,s==='lock'?'grey':s,4);if(s==='lock'){g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.strokeStyle='#5b6577';g.lineWidth=4;g.stroke()}pylon((p.x+q.x)/2,(p.y+q.y)/2,Math.atan2(q.y-p.y,q.x-p.x))}
 for(let i=1;i<=15;i++){const T=tile(i),un=i===1||!!S.sq[i],full=i===1||sqFull(i),cu=i>1&&!un&&canUnlock(i);
  g.fillStyle='rgba(0,0,0,.35)';rr(T.x+2,T.y+3,TW,TH,8);g.fill();rr(T.x,T.y,TW,TH,8);g.fillStyle='#131c30';g.fill();
  g.strokeStyle=SEL&&SEL.map===i?'#f5b84b':un?(i===1||C.net[i]?'#2f5d86':'#a33'):cu?'#6b4a0a':'#2b3448';g.lineWidth=SEL&&SEL.map===i?2.5:1.4;g.stroke();
  const px=T.x+4,py=T.y+4,pw=TW-8,ph=TH-36;
  g.drawImage(off('t'+i,pw,ph,REV+(i===1?'p'+S.src+S.tb:''),()=>{rr(0,0,pw,ph,6);g.clip();if(i===1){g.fillStyle='#232e44';g.fillRect(0,0,pw,ph);const sc=Math.min(pw/120,ph/90)*1.05;g.translate(pw/2,ph/2);g.scale(sc,sc);g.translate(-200,-490);TM=1;plant()}
   else{const sc=pw/LW;g.translate(pw/2,ph/2);g.scale(sc,sc);g.translate(-LW/2,-LH/2);if(!un)g.filter='grayscale(1) brightness(.8)';staticSquare(i,true);g.filter='none'}}),px,py,pw,ph);
  g.font='bold 9px system-ui';g.fillStyle=un?'#cfe0ff':'#8aa0c0';g.fillText('#'+i+' '+SQ[i][2],T.x+6,T.y+TH-22);
  if(i===1){g.fillStyle='#38d39f';g.font='bold 8.5px system-ui';g.fillText(SRC[S.src][1]+' '+SRC[S.src][0]+' · '+fmw(C.cap)+' MW',T.x+6,T.y+TH-8);continue}
  const N=C.tot[i],n=un?C.pc[i]:0;
  if(un){g.fillStyle='#22304d';rr(T.x+6,T.y+TH-17,TW-12,4,2);g.fill();if(n){g.fillStyle=n===N?'#38d39f':'#3d8cff';rr(T.x+6,T.y+TH-17,(TW-12)*n/N,4,2);g.fill()}
   g.font='bold 8px system-ui';g.fillStyle=n?'#8aa0c0':'#ff9a8e';g.fillText(n===N?'✓ '+N+'/'+N+' powered':n?n+'/'+N+' powered':'0/'+N+' · tap to build',T.x+6,T.y+TH-5);g.textAlign='right';g.fillStyle='#38d39f';if(n)g.fillText('+'+fmt(sqInc(i))+'/m',T.x+TW-6,T.y+TH-5);g.textAlign='left'}
  else{g.font='bold 8.5px system-ui';g.fillStyle=cu?'#f5b84b':'#6f84a6';g.fillText('🔒 '+fmt(UNL[i]),T.x+6,T.y+TH-7);g.textAlign='right';g.font='8px system-ui';g.fillStyle='#8aa0c0';g.fillText(cu?(NEEDSUB(i)&&!S.step?'needs step-up':'tap to unlock'):'',T.x+TW-6,T.y+TH-7);g.textAlign='left'}}}
const sqInc=i=>{let s=0;const L=layout(i);for(const k in C.bst[i])if(C.bst[i][k]==='on')s+=BT[L.B[k].ty][2];return s};
// ---------- plant ----------
function drawPlant(){g.fillStyle='#1c2435';g.fillRect(0,0,400,330);g.fillStyle='#202a3d';for(let y=0;y<330;y+=40)g.fillRect(0,y,400,1);for(let x=0;x<400;x+=40)g.fillRect(x,0,1,330);
 g.save();g.translate(10,8);g.scale(2,1.9);g.translate(-140,-445);plant();g.restore();
 g.fillStyle='#252f42';rr(262,8,130,176,8);g.fill();g.strokeStyle='#e8c13a';g.lineWidth=1;g.stroke();g.font='bold 9px system-ui';g.fillStyle='#f5b84b';g.fillText('TRANSFORMERS · '+S.xf+'/5',270,22);
 for(let k=0;k<6;k++){const x=270+(k%2)*60,y=30+((k/2)|0)*50;if(k===0||k<=S.xf)xfmr(x+4,y);else if(k===S.xf+1)slot(x,y,52,44,'+ next',fmt(XFC[k]));else{g.setLineDash([2,3]);g.strokeStyle='#3a4458';rr(x,y,52,44,6);g.stroke();g.setLineDash([])}}
 g.fillStyle='#283246';g.fillRect(0,188,400,12);
 g.fillStyle='#232e44';rr(8,206,384,118,8);g.fill();g.strokeStyle='#2f5d86';g.lineWidth=1.2;g.stroke();g.font='bold 9px system-ui';g.fillStyle='#8aa0c0';
 if(S.src<2){g.fillText('TURBINE HALL',16,222);g.fillStyle='#6f84a6';g.font='12px system-ui';g.textAlign='center';g.fillText('🔒 Turbines unlock with Coal',200,268);g.textAlign='left';return}
 g.fillText('TURBINE HALL · '+S.tb+'/3 · '+SRC[S.src][0]+' · '+SRC[S.src][3]+' MW each',16,222);
 for(let k=0;k<3;k++){const x=16+k*126,y=246;if(k<S.tb){g.save();g.translate(x,y);g.scale(1.15,1.6);turbine(0,0,true,k);g.restore();g.font='bold 9px system-ui';g.fillStyle='#38d39f';g.fillText('T'+(k+1)+' · '+fmw(SRC[S.src][3]*(1+.08*(S.lvl-1)))+' MW',x+4,y+60)}
  else if(k===S.tb)slot(x,y-6,112,60,'+ Turbine '+(k+1),fmt(TBC[k+1]));else{g.setLineDash([2,3]);g.strokeStyle='#3a4458';rr(x,y-6,112,60,6);g.stroke();g.setLineDash([])}}}
// ---------- loop ----------
function frame(ts){RAF=0;if(document.hidden)return;RAF=requestAnimationFrame(frame);if(ts-last<33)return;last=ts;TM=ts/1000;cx.setTransform(SC,0,0,SC,0,0);g=cx;
 if(view==='map')drawMap();else if(view==='plant')drawPlant();else drawSquareView(view)}
function startLoop(){if(!RAF&&!document.hidden)RAF=requestAnimationFrame(frame)}
// ---------- HTML panels ----------
function setView(v){view=v;SEL=null;VH=v==='map'?640:v==='plant'?330:LH;size();document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('on',b.dataset.v===(v==='map'||v==='plant'?v:'map')));ui();scrollTo(0,0)}
function btn(label,sub,cost,act,cls){const ok=S.cash+1e-9>=cost;return '<button class="'+(cls||'')+(ok?'':' lack')+'" data-a="'+act+'"'+(cost===Infinity?' disabled':'')+'>'+label+'<small>'+sub+'</small></button>'}
function ui(){const tb=$('tbar'),bl=$('below');
 if(view==='map'){tb.innerHTML='<span class="tag">State 1</span><div class="tt"><b>Voltania · state map</b><div class="sm">Tap a square · #1 is your plant</div></div><span class="tag">'+[...Array(14)].filter((_,k)=>sqFull(k+2)).length+'/14 ✓</span>';
  let h='';if(SEL&&SEL.map){const i=SEL.map,cu=canUnlock(i),ns=NEEDSUB(i)&&!S.step;h='<div class="card act"><div><b>#'+i+' '+SQ[i][2]+'</b><div class="sm">'+C.tot[i]+' buildings · '+(NEEDSUB(i)?'substation included · ':'')+(cu?ns?'needs the step-up transformer (Plant)':'ready to unlock':'needs a powered neighbor square')+'</div></div>'+(cu&&!ns?btn('🔓 Unlock',fmt(UNL[i]),UNL[i],'unlock:'+i):ns&&cu?'<button class="alt" data-a="goPlant">🏭 Plant</button>':'')+'</div>'}
  if(S.done)h+='<div class="card done"><b>🏆 State complete! More coming soon</b><div class="sm">All 15 squares of Voltania are powered. New states and prestige are on the way.</div></div>';bl.innerHTML=h}
 else if(view==='plant'){tb.innerHTML='<button class="alt back" data-a="map">‹ Map</button><div class="tt"><b>Square 1 · Power Plant</b><div class="sm">'+SRC[S.src][0]+' · Lv '+S.lvl+'/10</div></div><span class="tag">'+fmw(C.cap)+' MW</span>';
  let h='<div class="card"><div class="ladr">';SRC.forEach((s,k)=>h+='<div class="'+(k<S.src?'dn':k===S.src?'cu':k===S.src+1?'nx':'lk')+'"><span>'+s[1]+'</span>'+s[0].replace('Natural gas','Gas')+'</div>');
  h+='</div><div class="sm" style="margin-bottom:6px">Generation <b style="color:var(--txt)">'+fmw(C.gen)+' MW</b> · export limit <b style="color:var(--txt)">'+fmw(C.exp)+' MW</b> → usable <b style="color:var(--acc)">'+fmw(C.cap)+' MW</b>'+(C.exp<C.gen?' <span style="color:var(--warn)">(add a transformer!)</span>':'')+'</div><div class="pbt">';
  h+=S.lvl<10?btn('⬆ Generator Lv '+(S.lvl+1),fmt(lvlCost())+' · +'+fmw((SRC[S.src][2]+SRC[S.src][3]*S.tb)*.08)+' MW',lvlCost(),'level'):'<button disabled>⬆ Generator maxed<small>Lv 10 · switch source</small></button>';
  h+=S.src<5?btn(SRC[S.src+1][1]+' Switch to '+SRC[S.src+1][0],fmt(SRC[S.src+1][4])+' · resets Lv to 1',SRC[S.src+1][4],'source','alt'):'<button disabled>☢️ Best source<small>Nuclear</small></button>';
  h+=S.src>=2?(S.tb<3?btn('⚙ Turbine #'+(S.tb+1),fmt(TBC[S.tb+1])+' · +'+SRC[S.src][3]+' MW base',TBC[S.tb+1],'turbine','alt'):'<button disabled>⚙ 3/3 turbines<small>they carry over</small></button>'):'<button disabled>⚙ Turbines<small>unlock with Coal</small></button>';
  h+=S.xf<5?btn('🔌 Transformer #'+(S.xf+1),fmt(XFC[S.xf+1])+' · export '+XF[S.xf+1]+' MW',XFC[S.xf+1],'xf','alt'):'<button disabled>🔌 Transformers maxed<small>'+XF[5]+' MW export</small></button>';
  h+='</div>'+(S.step?'<div class="sm" style="margin-top:6px">✓ Step-up transformer built: squares #7+ can be fed.</div>':'<div class="pbt" style="margin-top:6px;grid-template-columns:1fr">'+btn('⚡ Build step-up transformer',fmt(STEPC)+' · needed for squares #7–#15 (long-distance lines)',STEPC,'step','alt')+'</div>')+'</div>';bl.innerHTML=h}
 else{const i=view,L=layout(i);tb.innerHTML='<button class="alt back" data-a="map">‹ Map</button><div class="tt"><b>Square '+i+' · '+SQ[i][2]+'</b><div class="sm">'+C.pc[i]+'/'+C.tot[i]+' powered · +'+fmt(sqInc(i))+'/min</div></div><span class="tag">'+Object.keys(L.ent).length+' entries</span>';
  let h='';const ch=cheapest(i);
  if(SEL&&SEL.i===i){if(SEL.k==='b'){const b=L.B[SEL.id],t=BT[b.ty],s=C.bst[i][SEL.id];h='<div class="card act"><div><b>'+t[0]+'</b><div class="sm">'+t[1]+' MW · +'+fmt(t[2])+'/min · '+({on:'✓ powered',nomw:'⚠ dark: plant out of MW',conn:'next to your network',lock:'build a corridor next to it first',out:'no route'})[s]+'</div></div>'+(s==='conn'?btn('⚡ Connect',fmt(bCost(i,b)),bCost(i,b),'b:'+i+':'+SEL.id):s==='nomw'?'<button class="alt" data-a="goPlant">🏭 Plant</button>':'')+'</div>'}
   else{const s=L.segs[SEL.id],k=spanState(i,s);h='<div class="card act"><div><b>Corridor · '+s.nm+'</b><div class="sm">'+(k==='on'?'✓ live':k==='red'?'built, no power yet':k==='conn'?'extends your network':'connect a neighbouring span first')+'</div></div>'+(k==='conn'?btn('🛣 Build span',fmt(spanCost(i,s)),spanCost(i,s),'s:'+i+':'+SEL.id):'')+'</div>'}}
  if(!h)h='<div class="card act"><div><b>'+(C.pc[i]===C.tot[i]?'✓ Square fully powered':'Tap a building or corridor')+'</b><div class="sm">'+(!C.en[i]?(NEEDSUB(i)&&!S.step?'Needs the step-up transformer (Plant).':'No live entry yet. Power a neighbour square.'):'Red dashed = you can build it. Any building next to the network.')+'</div></div>'+(ch?btn(ch.k==='b'?'⚡ Cheapest building':'🛣 Cheapest span',fmt(ch.c),ch.c,'ch:'+i):'')+'</div>';
  bl.innerHTML=h+'<div class="leg"><span><i style="background:#3d8cff"></i>powered</span><span><i style="background:#ff7a6e"></i>can build</span><span><i style="background:#f5b84b"></i>needs MW</span><span><i style="background:#5b6577"></i>locked</span></div>'}
 hdr()}
function hdr(){$('ipm').textContent=fmt(C.inc)+'/min';$('cash').textContent=fmt(S.cash);$('mw').innerHTML='<span style="color:'+(C.dark?'#ff9a8e':'#7fc4ff')+'">'+fmw(C.used+(C.dark?C.need:0))+'</span>/'+fmw(C.cap);
 const mb=$('mwb');mb.firstChild.style.width=Math.min(100,(C.used+(C.dark?C.need:0))/Math.max(C.cap,1e-9)*100)+'%';mb.classList.toggle('hot',!!C.dark||C.used/C.cap>.9);
 $('areas').textContent=(Object.keys(S.sq).length+1)+'/15';$('bld').textContent=S.ord.length;
 $('ipmSub').innerHTML=C.dark?'<span style="color:#ff9a8e">⚠ '+C.dark+' building'+(C.dark>1?'s':'')+' dark: need '+fmw(C.need)+' more MW · upgrade the plant</span>':!S.ord.length?'Tap #2 Maple Homes to start your grid':(Object.keys(S.sq).length+1)+'/15 squares · '+S.ord.length+' buildings on the grid'}
function doAct(a){const p=a.split(':');let ok=true;
 if(p[0]==='map'){setView('map');return}if(p[0]==='goPlant'){setView('plant');return}
 if(p[0]==='unlock'){ok=A.unlock(+p[1]);if(ok){SEL=null;toast('🔓 '+SQ[+p[1]][2]+' unlocked!');setView(+p[1]);return}}
 else if(p[0]==='b'){ok=A.connect(+p[1],+p[2]);if(ok){SEL=null;toast('⚡ Powered! +'+fmt(BT[layout(+p[1]).B[+p[2]].ty][2])+'/min')}}
 else if(p[0]==='s'){ok=A.span(+p[1],+p[2]);if(ok)SEL=null}
 else if(p[0]==='ch'){const c=cheapest(+p[1]);if(c)ok=c.k==='b'?A.connect(+p[1],c.id):A.span(+p[1],c.id)}
 else ok=A[p[0]]();
 if(!ok)toast('Not enough cash yet');save();ui()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&!b.disabled){doAct(b.dataset.a)}});
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>{if(b.dataset.v==='set')openSet();else setView(b.dataset.v)});
cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*VW/r.width,y=(e.clientY-r.top)*VH/r.height;
 if(view==='map'){for(let i=1;i<=15;i++){const T=tile(i);if(x>=T.x&&x<=T.x+TW&&y>=T.y&&y<=T.y+TH){if(i===1)setView('plant');else if(S.sq[i])setView(i);else{SEL={map:i};ui()}return}}SEL=null;ui();return}
 if(typeof view!=='number')return;const L=layout(view);let best=null,bd=1e9;
 L.B.forEach((b,k)=>{if(x>=b.x-6&&x<=b.x+b.w+6&&y>=b.y-6&&y<=b.y+b.h+12){const d=Math.hypot(x-b.x-b.w/2,y-b.y-b.h/2)*.5;if(d<bd){bd=d;best={i:view,k:'b',id:k}}}});
 for(const s of L.segs){const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],u=Math.max(0,Math.min(1,((x-s.a[0])*dx+(y-s.a[1])*dy)/(dx*dx+dy*dy))),d=Math.hypot(x-s.a[0]-u*dx,y-s.a[1]-u*dy);if(d<16&&d<bd){bd=d;best={i:view,k:'s',id:s.id}}}
 if(best&&SEL&&SEL.k===best.k&&SEL.id===best.id){const a=best.k==='b'?'b:'+view+':'+best.id:'s:'+view+':'+best.id;if((best.k==='b'&&C.bst[view][best.id]==='conn')||(best.k==='s'&&spanBuyable(view,L.segs[best.id]))){doAct(a);return}}
 SEL=best;ui()});
let TT=0;function toast(t){const el=$('toast');el.textContent=t;el.style.display='block';clearTimeout(TT);TT=setTimeout(()=>el.style.display='none',1600)}
function pop(html){$('popBox').innerHTML=html;$('popup').classList.remove('hide')}
const closePop=()=>$('popup').classList.add('hide');
$('popup').addEventListener('click',e=>{if(e.target.id==='popup'||e.target.dataset.k==='close')closePop();if(e.target.dataset.k==='reset'){if(e.target.dataset.armed){localStorage.removeItem(KEY);S=fresh();for(const k in bset)delete bset[k];refresh();save();closePop();setView('map');toast('Progress reset')}else{e.target.dataset.armed=1;e.target.textContent='Tap again to confirm'}}});
function openSet(){pop('<h3 style="margin:0 0 6px">⚙ Settings</h3><p class="sm">Idle Power Grid prototype · save v'+VER+' · Idle Games USA</p><p class="sm">Offline earnings are capped at 8 h.</p><div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px"><button class="dng" data-k="reset">Reset progress</button><button data-k="close">Close</button></div>')}
function showDone(){pop('<h3 style="margin:0 0 6px">🏆 State complete!</h3><p>All 15 squares of Voltania are powered.</p><p class="sm">More coming soon: new states and prestige.</p><div style="text-align:right"><button data-k="close">Nice!</button></div>')}
// ---------- tick / offline / save ----------
let lt=Date.now(),lsave=0;function tick(){const n=Date.now(),dt=Math.min((n-lt)/1000,OFFCAP);lt=n;const e=C.inc/60*dt;S.cash+=e;S.life+=e;hdr();
 if(n-lsave>5000){lsave=n;save()}}
function offline(){const dt=Math.min((Date.now()-S.t)/1000,OFFCAP);if(dt>60&&C.inc>0){const e=C.inc/60*dt;S.cash+=e;S.life+=e;const h=Math.floor(dt/3600),m=Math.floor(dt%3600/60);
 pop('<h3 style="margin:0 0 6px">👋 Welcome back!</h3><p>Your grid earned <b style="color:var(--acc)" id="offAmt">'+fmt(e)+'</b> while you were away ('+(h?h+'h ':'')+m+'m'+(dt>=OFFCAP?' · 8h cap':'')+').</p><div style="text-align:right"><button data-k="close">Collect</button></div>');window.__offline=e}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)save();else{lt=Date.now();startLoop()}});addEventListener('pagehide',save);addEventListener('resize',()=>{size()});
refresh();offline();lt=Date.now();setView('map');save();setInterval(tick,250);setInterval(()=>{if(view!=='map'&&view!=='plant'||SEL)ui()},1000);startLoop();
window.__game={get S(){return S},get C(){return C},A,layout,cheapest,sim,save,fresh,refresh,setView,UNL,canUnlock,spanBuyable};
