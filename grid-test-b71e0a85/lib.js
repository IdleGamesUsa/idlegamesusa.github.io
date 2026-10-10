function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function lg(x0,x1,stp){const gr=g.createLinearGradient(x0,0,x1,0);stp.forEach(([s,c])=>gr.addColorStop(s,c));return gr}
function shadow(x,y,w,h,r){g.fillStyle='rgba(0,0,0,.3)';rr(x+2,y+2.4,w,h,r||2);g.fill()}

const hash=(a,b)=>{const s=Math.sin(a*12.9898+b*78.233)*43758.5453;return s-Math.floor(s)};
// pseudo-3D box: roof on top, front wall with window grid
function box(x,y,w,d,h,roof,wall,o={}){
 g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+3,y+3,w,d);
 g.fillStyle=wall;g.fillRect(x,y+d-h,w,h);
 rr(x,y-h,w,d,o.r||1.5);g.fillStyle=lg(x,x+w,[[0,roof[0]],[.5,roof[1]],[1,roof[2]||roof[0]]]);g.fill();g.strokeStyle=OUT;g.lineWidth=.8;g.stroke();
 g.strokeStyle=OUT;g.strokeRect(x,y+d-h,w,h);
 if(o.win){const [cols,rows]=o.win,cw=w/cols,rh=(h-2)/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const on=LIT&&hash(x+i,y+j)>.18;
  g.fillStyle=on?(hash(i,j+x)>.85?'#fff1c0':'#ffd56a'):'#2a3346';g.fillRect(x+i*cw+cw*.22,y+d-h+1+j*rh+rh*.2,cw*.56,rh*.55)}
  if(LIT){g.fillStyle='rgba(255,213,106,.07)';g.fillRect(x-2,y+d-h-2,w+4,h+6)}}
 if(o.ac){g.fillStyle='#8a97b0';for(let i=0;i<o.ac;i++){g.fillRect(x+4+i*9,y-h+3,5,4);g.strokeStyle=OUT;g.lineWidth=.5;g.strokeRect(x+4+i*9,y-h+3,5,4)}}}
function house(x,y,c){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+2,y+3,18,14);g.fillStyle='#c9b79a';g.fillRect(x,y+8,18,8);g.strokeStyle=OUT;g.lineWidth=.7;g.strokeRect(x,y+8,18,8);
 g.fillStyle=c[0];g.beginPath();g.moveTo(x-1,y+8);g.lineTo(x+9,y+1);g.lineTo(x+19,y+8);g.closePath();g.fill();g.fillStyle=c[1];g.fillRect(x-1,y+1,20,0);g.beginPath();g.moveTo(x-1,y+8);g.lineTo(x+9,y+1);g.lineTo(x+9,y+8);g.closePath();g.fill();g.stroke();
 g.fillStyle=LIT?'#ffd56a':'#2a3346';g.fillRect(x+3,y+10,4,3);g.fillRect(x+11,y+10,4,3);g.fillStyle='#5a3d2a';g.fillRect(x+8,y+11,2.5,5)}
function tree(x,y,r){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+1.5,y+2,r,0,6.3);g.fill();const gr=g.createRadialGradient(x-r*.3,y-r*.3,1,x,y,r);gr.addColorStop(0,'#5fb36a');gr.addColorStop(1,'#2f6b3e');g.fillStyle=gr;g.beginPath();g.arc(x,y,r,0,6.3);g.fill();g.strokeStyle=OUT;g.lineWidth=.6;g.stroke()}
function car(x,y,ang,c){g.save();g.translate(x,y);g.rotate(ang);g.fillStyle='rgba(0,0,0,.3)';rr(-4+1,-2+1.4,8,4.4,1.2);g.fill();rr(-4,-2.2,8,4.4,1.3);g.fillStyle=c;g.fill();g.strokeStyle=OUT;g.lineWidth=.5;g.stroke();g.fillStyle='#22304f';g.fillRect(.6,-1.6,1.8,3.2);g.fillStyle='#fff6c8';g.fillRect(3.4,-1.8,.8,1);g.fillRect(3.4,.8,.8,1);g.restore()}
function puff(x,y,n,col){for(let i=0;i<n;i++){const p=((TM*.35+i/n)%1);g.fillStyle=col||'rgba(220,228,240,'+(.45*(1-p))+')';g.beginPath();g.arc(x+p*10+Math.sin(TM+i)*2,y-p*26,2.5+p*6,0,6.3);g.fill()}}
// ---- area art ----
const ART={
 res1(x,y,w,h){const c=[['#b5533c','#d06a4f'],['#4a6aa8','#5f82c4'],['#6b7b3a','#86984a'],['#8a5a9a','#a070b0']];[[6,8],[34,6],[62,10],[20,34],[52,34]].forEach(([a,b],i)=>house(x+a+4,y+b,c[i%4]));tree(x+w-10,y+14,5);tree(x+12,y+h-18,4);tree(x+w-16,y+h-22,4.5)},
 com1(x,y,w,h){for(let i=0;i<3;i++){const bx=x+6+i*32;box(bx,y+22,28,18,12,['#c7cfdd','#e3e8f0'],'#5a6680',{win:[3,1]});g.fillStyle=['#e0473c','#38d39f','#f5b84b'][i];for(let s=0;s<6;s++){if(s%2)continue;g.fillRect(bx+s*4.6,y+38,4.6,3)}}car(x+20,y+56,0,'#4aa8ff');car(x+50,y+56,0,'#f5b84b');tree(x+w-10,y+58,4)},
 biz1(x,y,w,h){box(x+6,y+26,40,26,20,['#7f8ba3','#9aa6bd'],'#46557a',{win:[5,3],ac:2});box(x+52,y+20,44,22,26,['#6f7b93','#8a97b0'],'#3d4b6a',{win:[5,4],ac:3})},
 res2(x,y,w,h){box(x+6,y+28,42,22,24,['#b88a6a','#cfa07e'],'#7a5a44',{win:[5,4]});box(x+54,y+30,42,20,22,['#a58a7a','#bfa290'],'#6a5040',{win:[5,4]});tree(x+50,y+62,4)},
 res3(x,y,w,h){box(x+8,y+40,30,24,38,['#9aa6bd','#c3ccdc'],'#56637e',{win:[3,6]});box(x+46,y+42,24,20,44,['#a8b4c8','#d0d8e6'],'#5f6c88',{win:[3,7]});box(x+76,y+44,22,18,30,['#9aa6bd','#c3ccdc'],'#56637e',{win:[2,5]})},
 com2(x,y,w,h){box(x+6,y+24,64,30,16,['#d7dde8','#eef1f6'],'#6b7896',{win:[8,2]});g.fillStyle='#4aa8ff';g.fillRect(x+30,y+10,16,3);g.fillStyle='#2b3448';g.fillRect(x+74,y+12,26,50);for(let i=0;i<4;i++)car(x+80+(i%2)*12,y+20+((i/2)|0)*14,1.57,['#e0473c','#e6edf7','#38d39f','#f5b84b'][i]);g.fillStyle='#e6edf7';for(let i=0;i<4;i++)g.fillRect(x+75,y+14+i*12,24,.6)},
 biz2(x,y,w,h){[[6,22,52],[38,20,62],[72,24,44]].forEach(([a,ww,hh])=>box(x+a,y+h-14-ww*.8,ww,ww*.8,hh,['#4f86c6','#9fd0ff','#3c6aa4'],'#2c4a76',{win:[3,8]}));g.fillStyle=LIT?'#e0473c':'#552';g.beginPath();g.arc(x+49,y+h-14-16-62+2,1.5,0,6.3);g.fill()},
 ind(x,y,w,h){box(x+4,y+34,62,30,18,['#8a8070','#a89c88'],'#5a5040',{win:[6,1]});g.strokeStyle=OUT;g.lineWidth=.8;g.fillStyle='#b8ac96';for(let i=0;i<5;i++){g.beginPath();g.moveTo(x+4+i*12.4,y+16);g.lineTo(x+10+i*12.4,y+8);g.lineTo(x+16.4+i*12.4,y+16);g.fill();g.stroke()}
  g.fillStyle='#6a6a72';g.fillRect(x+72,y+6,6,30);g.strokeRect(x+72,y+6,6,30);g.fillStyle='#e0473c';g.fillRect(x+72,y+8,6,2);if(LIT)puff(x+75,y+4,4,null);
  [[86,40],[86,58]].forEach(([a,b])=>{g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+a+2,y+b+2,7,0,6.3);g.fill();const gr=g.createRadialGradient(x+a-2,y+b-2,1,x+a,y+b,7);gr.addColorStop(0,'#e6edf7');gr.addColorStop(1,'#8a97b0');g.fillStyle=gr;g.beginPath();g.arc(x+a,y+b,7,0,6.3);g.fill();g.stroke()})},
 dc(x,y,w,h){for(let r=0;r<2;r++){const by=y+18+r*26;box(x+6,by,70,18,8,['#d7dde8','#eef1f6'],'#46557a');for(let i=0;i<4;i++){const fx=x+14+i*17,fy=by-8+9;g.fillStyle='#2a3142';g.beginPath();g.arc(fx,fy,5,0,6.3);g.fill();g.save();g.translate(fx,fy);g.rotate(LIT?TM*8+i:i);g.strokeStyle='#8a97b0';g.lineWidth=1.4;for(let k=0;k<3;k++){g.rotate(2.09);g.beginPath();g.moveTo(0,0);g.lineTo(4,0);g.stroke()}g.restore()}
  for(let i=0;i<10;i++){g.fillStyle=LIT?((TM*3+i+r)%3<1.5?'#38d39f':'#4aa8ff'):'#2a3346';g.fillRect(x+9+i*6.6,by+12,2,1.6)}}
  box(x+82,y+20,16,40,6,['#8a97b0','#a8b4c8'],'#46557a');g.fillStyle='#e8c13a';g.fillRect(x+82,y+64,16,2)},
};
function plant(){const x=140,y=445,w=120,h=90,s=st.src,tb=st.tb;
 rr(x,y,w,h,6);g.fillStyle='#232e44';g.fill();g.strokeStyle='#2f5d86';g.lineWidth=1.4;g.stroke();
 g.save();rr(x,y,w,h,6);g.clip();
 if(s===0){g.fillStyle='#3a5a3a';g.fillRect(x,y,w,h);for(let i=0;i<3;i++)turbW(x+22+i*36,y+30+(i%2)*14)}
 else if(s===1){g.fillStyle='#3a4a3a';g.fillRect(x,y,w,h);for(let r=0;r<4;r++)for(let c=0;c<4;c++){const px=x+6+c*21,py=y+6+r*16;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(px+2,py+2,18,12);g.fillStyle=lg(px,px+18,[[0,'#1d3f7a'],[.5,'#3d6fc0'],[1,'#1d3f7a']]);g.fillRect(px,py,18,12);g.strokeStyle='#9fc0ee';g.lineWidth=.4;for(let k=1;k<3;k++){g.beginPath();g.moveTo(px+k*6,py);g.lineTo(px+k*6,py+12);g.stroke()}g.strokeStyle=OUT;g.strokeRect(px,py,18,12)}box(x+94,y+30,20,16,10,['#c7cfdd','#e3e8f0'],'#5a6680')}
 else{const hall={2:['#9a5a44','#b87058'],3:['#c7cfdd','#e3e8f0'],4:['#8a8070','#a89c88'],5:['#d7dde8','#eef1f6']}[s];
  if(s===2){g.fillStyle='#1b1b20';g.beginPath();g.ellipse(x+100,y+76,16,8,0,0,6.3);g.fill();for(let i=0;i<tb+1;i++){const sx=x+76+i*12;g.fillStyle='rgba(0,0,0,.3)';g.fillRect(sx+2,y+8,6,30);g.fillStyle=lg(sx,sx+6,[[0,'#7a7a82'],[.5,'#a0a0aa'],[1,'#6a6a72']]);g.fillRect(sx,y+6,6,32);g.strokeStyle=OUT;g.lineWidth=.6;g.strokeRect(sx,y+6,6,32);g.fillStyle='#e0473c';g.fillRect(sx,y+8,6,2);puff(sx+3,y+4,5)}}
  if(s===3){for(let i=0;i<2;i++){g.fillStyle='#8a97b0';g.fillRect(x+82+i*14,y+14,8,18);g.strokeStyle=OUT;g.strokeRect(x+82+i*14,y+14,8,18);puff(x+86+i*14,y+12,3,null)}g.strokeStyle='#e8c13a';g.lineWidth=2;g.beginPath();g.moveTo(x+4,y+80);g.lineTo(x+116,y+80);g.stroke()}
  if(s===4){for(let i=0;i<3;i++){const cx=x+90+(i%2)*16,cy=y+18+i*20;g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(cx+2,cy+2,9,0,6.3);g.fill();const gr=g.createRadialGradient(cx-3,cy-3,1,cx,cy,9);gr.addColorStop(0,'#e6edf7');gr.addColorStop(1,'#7a8498');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,9,0,6.3);g.fill();g.strokeStyle=OUT;g.stroke()}g.fillStyle='#6a6a72';g.fillRect(x+70,y+4,5,24);puff(x+72,y+2,4)}
  if(s===5){[[92,20],[100,62]].forEach(([a,b])=>{const cx=x+a,cy=y+b;g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(cx+3,cy+3,17,0,6.3);g.fill();const gr=g.createRadialGradient(cx-6,cy-6,2,cx,cy,17);gr.addColorStop(0,'#eef1f6');gr.addColorStop(.75,'#a8b4c8');gr.addColorStop(1,'#7a8498');g.fillStyle=gr;g.beginPath();g.arc(cx,cy,17,0,6.3);g.fill();g.strokeStyle=OUT;g.lineWidth=.9;g.stroke();g.fillStyle='#3a4458';g.beginPath();g.arc(cx,cy,10,0,6.3);g.fill();
    for(let i=0;i<6;i++){const p=(TM*.25+i/6)%1;g.fillStyle='rgba(235,240,248,'+(.55*(1-p))+')';g.beginPath();g.arc(cx+Math.sin(i*2+TM)*4+p*8,cy-p*18,6+p*9,0,6.3);g.fill()}});
   g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+26,y+24,14,0,6.3);g.fill();const dg=g.createRadialGradient(x+20,y+16,2,x+24,y+22,14);dg.addColorStop(0,'#ffffff');dg.addColorStop(1,'#9aa6bd');g.fillStyle=dg;g.beginPath();g.arc(x+24,y+22,14,0,6.3);g.fill();g.strokeStyle=OUT;g.stroke()}
  if(s===4){for(let i=0;i<4;i++){g.fillStyle='rgba(0,0,0,.3)';g.beginPath();g.arc(x+12+i*14+2,y+20+2,6,0,6.3);g.fill();g.fillStyle=lg(x+6+i*14,x+18+i*14,[[0,'#8a97b0'],[.5,'#d0d8e6'],[1,'#7a8498']]);g.beginPath();g.arc(x+12+i*14,y+20,6,0,6.3);g.fill();g.strokeStyle=OUT;g.stroke()}}
  // turbine hall: one bay per turbine (slots shown, empty ones dashed)
  const hy=s===5?50:40;for(let i=0;i<3;i++){const bx=x+6+i*24;if(i<tb){box(bx,y+hy,22,20,12,hall,'#46557a',{win:[3,1]});g.save();g.translate(bx+11,y+hy-2);g.rotate(TM*4+i);g.strokeStyle='#38d39f';g.lineWidth=1.3;for(let k=0;k<4;k++){g.rotate(1.57);g.beginPath();g.moveTo(0,0);g.lineTo(4.5,0);g.stroke()}g.restore()}
   else{g.setLineDash([3,3]);g.strokeStyle='#5b6577';g.lineWidth=1;g.strokeRect(bx,y+hy-10,22,30);g.setLineDash([]);g.fillStyle='#5b6577';g.font='bold 12px system-ui';g.textAlign='center';g.fillText('+',bx+11,y+hy+9);g.textAlign='left'}}}
 g.restore();
 g.font='bold 8.5px system-ui';const t=SRC[s][0].toUpperCase()+' PLANT · '+CAP+' MW',pw=g.measureText(t).width+10;rr(x+w/2-pw/2,y+h-12,pw,12,5);g.fillStyle='rgba(11,18,32,.88)';g.fill();g.fillStyle='#38d39f';g.textAlign='center';g.fillText(t,x+w/2,y+h-3);g.textAlign='left'}
function turbW(x,y){g.fillStyle='rgba(0,0,0,.3)';g.fillRect(x+1,y+1,3,24);g.fillStyle='#e6edf7';g.fillRect(x-1,y,3,24);g.strokeStyle=OUT;g.lineWidth=.5;g.strokeRect(x-1,y,3,24);g.save();g.translate(x+.5,y);g.rotate(TM*2.4+x);for(let k=0;k<3;k++){g.rotate(2.094);g.fillStyle='#f4f7fb';g.beginPath();g.moveTo(-1.4,0);g.lineTo(0,-15);g.lineTo(1.4,0);g.fill();g.stroke()}g.fillStyle='#8a97b0';g.beginPath();g.arc(0,0,2,0,6.3);g.fill();g.restore()}
function pylon(x,y,a){g.save();g.translate(x,y);g.rotate(a);g.fillStyle='rgba(0,0,0,.3)';g.fillRect(-3,-3,8,8);g.strokeStyle='#9aa6bd';g.lineWidth=.8;g.strokeRect(-4,-4,8,8);g.beginPath();g.moveTo(-4,-4);g.lineTo(4,4);g.moveTo(4,-4);g.lineTo(-4,4);g.stroke();g.strokeStyle='#c3ccdc';g.lineWidth=1.4;g.beginPath();g.moveTo(0,-8);g.lineTo(0,8);g.stroke();g.restore()}

const SQ=[null,
 [0,4,'Power Plant','plant'],
 [1,4,'Maple Homes',['res1'],{v:[130,270],h:[190,360],f:{4:'park'}},500],
 [0,3,'Oak Lane',['res1'],{v:[200],h:[140,280,410],f:{3:'water'}},1200],
 [2,4,'Main Street',['com1','res1'],{v:[110,290],h:[270],f:{}},6e3],
 [1,3,'Elm Park',['res1','com1','res2'],{v:[150,260],h:[200,380],f:{0:'park'}},15e3],
 [0,2,'Riverside',['res2'],{v:[120,280],h:[260],f:{1:'water',4:'water'}},4e4],
 [1,2,'Central Business',['com1','biz1','biz1','com1','res2','biz1'],{v:[140,260],h:[180,330],f:{}},12e4],
 [2,3,'Midtown',['res2','res3','com1'],{v:[200],h:[180,360],f:{3:'park'}},3e5],
 [0,1,'Lakeview',['res3'],{v:[130,270],h:[270],f:{1:'water',4:'park'}},8e5],
 [2,2,'Market Square',['com2','com1'],{v:[200],h:[180,360],f:{}},2e6],
 [1,1,'Financial District',['biz2'],{v:[130,270],h:[180,360],f:{4:'park'}},6e6],
 [0,0,'Hillcrest',['res3','res2'],{v:[200],h:[270],f:{1:'park'}},15e6],
 [2,1,'Foundry Row',['ind'],{v:[200],h:[180,360],f:{}},4e7],
 [1,0,'Harbor Works',['ind'],{v:[200],h:[260],f:{0:'water'}},9e7],
 [2,0,'Data Valley',['dc','dc','ind'],{v:[200],h:[180,360],f:{}},2.5e8]];
const dist=i=>SQ[i][0]+(4-SQ[i][1]);const NEEDSUB=i=>dist(i)>=3;
const LW=400,LH=540,RW=16;
function nbrs(i){const [c,r]=SQ[i],o={};for(let j=1;j<=15;j++){const [a,b]=SQ[j];if(a===c-1&&b===r)o.L=j;if(a===c+1&&b===r)o.R=j;if(a===c&&b===r-1)o.T=j;if(a===c&&b===r+1)o.B=j}return o}
const OFF=6;
function layout(i){if(LAY[i])return LAY[i];const s=SQ[i],t=s[4],xs=[0,...t.v,LW],ys=[0,...t.h,LH],blocks=[],B=[],sub=NEEDSUB(i),nb=nbrs(i);
 const h0=t.h[0]+OFF,hl=t.h[t.h.length-1]+OFF,v0=t.v[0]+OFF,vl=t.v[t.v.length-1]+OFF;
 const ent={};if(nb.L)ent.L={x:0,y:h0,sx:26,sy:h0,n:nb.L};if(nb.R)ent.R={x:LW,y:hl,sx:LW-26,sy:hl,n:nb.R};if(nb.T)ent.T={x:v0,y:0,sx:v0,sy:20,n:nb.T};if(nb.B)ent.B={x:vl,y:LH,sx:vl,sy:LH-20,n:nb.B};
 const ex=Object.values(ent).map(e=>({x:e.sx-30,y:e.sy-22,w:60,h:44}));
 let bi=0;for(let r=0;r<ys.length-1;r++)for(let c=0;c<xs.length-1;c++){const b={x:xs[c]+RW/2+(c?0:4),y:ys[r]+RW/2+(r?0:4),i:bi},b2={x:xs[c+1]-RW/2-(c===xs.length-2?4:0),y:ys[r+1]-RW/2-(r===ys.length-2?4:0)};b.w=b2.x-b.x;b.h=b2.y-b.y;b.f=t.f[bi]||null;blocks.push(b);
  if(!b.f){const ty=s[3][bi%s[3].length],[w,h]=BT[ty][4],gx=18,gy=24,cols=Math.max(1,Math.floor((b.w-6)/(w+gx))),rows=Math.max(1,Math.floor((b.h-6)/(h+gy)));
   const ox=b.x+(b.w-cols*(w+gx)+gx)/2,oy=b.y+(b.h-rows*(h+gy)+gy)/2-3;let cnt=0;const cap=ty==='res1'||ty==='com1'||ty==='biz1'?4:ty==='ind'||ty==='dc'||ty==='com2'?1:3;
   for(let a=0;a<rows;a++)for(let cc=0;cc<cols;cc++){if(cnt>=cap)continue;const x=ox+cc*(w+gx),y=oy+a*(h+gy);if(w>b.w||h>b.h)continue;
    if(ex.some(e=>x<e.x+e.w&&x+w>e.x&&y<e.y+e.h&&y+h+10>e.y))continue;cnt++;B.push({ty,x,y,w,h,px:x+4,py:y+h+7,c:(hash(x,y)*4)|0})}}
  bi++}
 // corridors run along every road; they reach the edge only where a state-map line comes in
 const segs=[],key=(x,y)=>Math.round(x)+','+Math.round(y);const RN=['Elm','Oak','Pine','Main','1st','2nd','3rd'];
 t.h.forEach((hy,k)=>{const y=hy+OFF,pts=[ent.L&&ent.L.y===y?26:12,...t.v.map(v=>v+OFF),ent.R&&ent.R.y===y?LW-26:LW-12];for(let j=0;j<pts.length-1;j++)segs.push({a:[pts[j],y],b:[pts[j+1],y],nm:RN[k]+' St'})});
 t.v.forEach((vx,k)=>{const x=vx+OFF,pts=[ent.T&&ent.T.x===x?20:12,...t.h.map(h=>h+OFF),ent.B&&ent.B.x===x?LH-20:LH-12];for(let j=0;j<pts.length-1;j++)segs.push({a:[x,pts[j]],b:[x,pts[j+1]],nm:RN[k+4]+' Ave'})});
 segs.forEach((s,k)=>{s.id=k;s.ka=key(...s.a);s.kb=key(...s.b);s.len=Math.hypot(s.b[0]-s.a[0],s.b[1]-s.a[1])});
 for(const sd in ent){const e=ent[sd];e.k=key(e.sx,e.sy);e.seg=segs.find(s=>s.ka===e.k||s.kb===e.k)}
 for(const b of B){let best=1e9;for(const s of segs){const dx=s.b[0]-s.a[0],dy=s.b[1]-s.a[1],u=Math.max(0,Math.min(1,((b.px-s.a[0])*dx+(b.py-s.a[1])*dy)/(dx*dx+dy*dy))),qx=s.a[0]+u*dx,qy=s.a[1]+u*dy,d=Math.hypot(b.px-qx,b.py-qy);if(d<best){best=d;b.seg=s;b.qx=qx;b.qy=qy;b.len=d}}}
 const L={blocks,B,sub,xs,ys,ent,segs};const D=energize(L,Object.keys(ent),new Set(segs.map(s=>s.id)),new Set());
 for(const b of B)b.d=Math.min(D[b.seg.ka]??1e9,D[b.seg.kb]??1e9)+b.len;B.sort((p,q)=>p.d-q.d);
 for(const s of segs)s.d=Math.min(D[s.ka]??1e9,D[s.kb]??1e9);
 return LAY[i]=L}
function energize(L,live,built,down){const D={},q=[];for(const sd of live){const e=L.ent[sd];if(!e)continue;D[e.k]=0;q.push(e.k)}
 while(q.length){q.sort((a,b)=>D[b]-D[a]);const k=q.pop();for(const s of L.segs){if(!built.has(s.id)||down.has(s.id))continue;const o=s.ka===k?s.kb:s.kb===k?s.ka:null;if(o==null)continue;const nd=D[k]+s.len;if(D[o]===undefined||nd<D[o]){D[o]=nd;q.push(o)}}}return D}

const HC=[['#b5533c','#d06a4f'],['#4a6aa8','#5f82c4'],['#6b7b3a','#86984a'],['#8a5a9a','#a070b0']];
function bld(b,lit){LIT=lit;const {x,y,w,h}=b;switch(b.ty){
 case 'res1':g.save();g.translate(x+2,y);g.scale(1.75,1.75);house(0,0,HC[b.c]);g.restore();break;
 case 'com1':box(x,y+10,w,h-18,8,['#c7cfdd','#e3e8f0'],'#5a6680',{win:[3,1]});g.fillStyle=['#e0473c','#38d39f','#f5b84b','#4aa8ff'][b.c];for(let s=0;s<w;s+=8)g.fillRect(x+s,y+h-8,4,3);break;
 case 'biz1':box(x,y+16,w,h-16,16,['#7f8ba3','#9aa6bd'],'#46557a',{win:[4,3],ac:2});break;
 case 'res2':box(x,y+18,w,h-18,18,['#b88a6a','#cfa07e'],'#7a5a44',{win:[5,3]});break;
 case 'res3':box(x,y+28,w,h-28,28,['#9aa6bd','#c3ccdc'],'#56637e',{win:[3,5]});break;
 case 'com2':box(x,y+14,w,h-14,14,['#d7dde8','#eef1f6'],'#6b7896',{win:[7,2]});g.fillStyle='#4aa8ff';g.fillRect(x+w/2-10,y+3,20,3);break;
 case 'biz2':box(x,y+36,w,h-36,36,['#4f86c6','#9fd0ff','#3c6aa4'],'#2c4a76',{win:[3,7]});break;
 case 'ind':ART.ind(x,y-4,w,h);break;case 'dc':ART.dc(x,y-4,w,h);break}}
function pole(x,y,s){g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(x+1,y+1.5,3,0,6.3);g.fill();g.fillStyle=s==='on'?'#3d8cff':s==='conn'?'#e0473c':'#5b6577';g.beginPath();g.arc(x,y,2.6,0,6.3);g.fill();g.fillStyle='#8a6a4a';g.fillRect(x-.8,y-.8,1.6,1.6);g.strokeStyle=OUT;g.lineWidth=.6;g.stroke();
 if(s==='on'){g.fillStyle='rgba(61,140,255,.25)';g.beginPath();g.arc(x,y,5,0,6.3);g.fill()}g.strokeStyle='#c3ccdc';g.lineWidth=.8;g.beginPath();g.moveTo(x-3.5,y-2.5);g.lineTo(x+3.5,y-2.5);g.stroke()}
function seg2(a,b,s,wd){g.lineCap='round';g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=wd+2;if(s!=='lock')g.stroke();
 g.beginPath();g.moveTo(a.x,a.y);g.lineTo(b.x,b.y);if(s==='on'){g.strokeStyle='#3d8cff';g.lineWidth=wd;g.stroke();g.setLineDash([4,8]);g.lineDashOffset=-TM*30;g.strokeStyle='#bfe3ff';g.lineWidth=wd*.6;g.stroke()}
 else if(s==='red'){g.strokeStyle='#e0473c';g.lineWidth=wd;g.stroke();}
 else if(s==='conn'){g.setLineDash([4,4]);g.lineDashOffset=-TM*10;g.strokeStyle='#ff7a6e';g.lineWidth=wd;g.stroke()}
 else{g.setLineDash([2,4]);g.strokeStyle='rgba(120,132,152,.55)';g.lineWidth=1;g.stroke()}g.setLineDash([]);g.lineDashOffset=0}
function water(b){const gr=g.createLinearGradient(b.x,b.y,b.x+b.w,b.y+b.h);gr.addColorStop(0,'#1f4f86');gr.addColorStop(1,'#163a66');rr(b.x-4,b.y-4,b.w+8,b.h+8,14);g.fillStyle=gr;g.fill();g.strokeStyle='#4a7ab0';g.lineWidth=1;g.stroke();
 g.strokeStyle='rgba(159,208,255,.35)';g.lineWidth=1;for(let k=0;k<6;k++){const yy=b.y+12+k*(b.h-20)/6,xx=b.x+10+((k*37+TM*6)%(b.w-40));g.beginPath();g.moveTo(xx,yy);g.quadraticCurveTo(xx+6,yy-3,xx+12,yy);g.stroke()}}
function park(b){rr(b.x,b.y,b.w,b.h,10);g.fillStyle='#2e5a3a';g.fill();g.strokeStyle='#3f7a4e';g.stroke();g.strokeStyle='#a89c7a';g.lineWidth=3;g.beginPath();g.moveTo(b.x+6,b.y+b.h-8);g.quadraticCurveTo(b.x+b.w/2,b.y+b.h/2-20,b.x+b.w-6,b.y+10);g.stroke();
 for(let k=0;k<9;k++)tree(b.x+10+hash(k,b.x)*(b.w-20),b.y+10+hash(b.y,k)*(b.h-20),4+hash(k,k+b.x)*3)}
function ground(L,i){g.fillStyle='#1c2435';g.fillRect(0,0,LW,LH);g.fillStyle='#202a3d';for(let y=0;y<LH;y+=40)g.fillRect(0,y,LW,1);for(let x=0;x<LW;x+=40)g.fillRect(x,0,1,LH);
 for(const b of L.blocks){if(b.f==='water'){water(b);continue}if(b.f==='park'){park(b);continue}rr(b.x,b.y,b.w,b.h,6);g.fillStyle=SQ[i][3][0]==='ind'||SQ[i][3][0]==='dc'?'#262a33':'#232e44';g.fill();g.strokeStyle='#2b3448';g.lineWidth=1;g.stroke()}
 g.fillStyle='#283246';for(const x of L.xs.slice(1,-1))g.fillRect(x-RW/2,0,RW,LH);for(const y of L.ys.slice(1,-1))g.fillRect(0,y-RW/2,LW,RW);
 g.fillStyle='rgba(232,193,58,.35)';for(const x of L.xs.slice(1,-1))for(let u=4;u<LH;u+=16)g.fillRect(x-.5,u,1,7);for(const y of L.ys.slice(1,-1))for(let u=4;u<LW;u+=16)g.fillRect(u,y-.5,7,1);
 // bridges over water
 for(const b of L.blocks)if(b.f==='water'){for(const y of L.ys.slice(1,-1))if(y>b.y-RW&&y<b.y+b.h+RW){g.fillStyle='#46557a';g.fillRect(b.x-4,y-RW/2-1,b.w+8,RW+2)}}
}
function cars(L){ const CC=['#e0473c','#4aa8ff','#e6edf7','#f5b84b','#38d39f','#c77dff'];let k=0;for(const x of L.xs.slice(1,-1))for(let d of[1,-1]){const u=((TM*30*d+k*131)%LH+LH)%LH;car(x+d*3.5,u,d>0?1.57:-1.57,CC[k%6]);k++}
 for(const y of L.ys.slice(1,-1))for(let d of[1,-1]){const u=((TM*28*d+k*97)%LW+LW)%LW;car(u,y+d*3.5,d>0?0:3.14,CC[k%6]);k++}}
function subst(x,y,on){const X=x-34,Y=y-20;rr(X,Y,68,40,4);g.fillStyle='#252f42';g.fill();g.strokeStyle='#8a97b0';g.setLineDash([2,2]);g.lineWidth=1;g.stroke();g.setLineDash([]);for(let k=0;k<2;k++)box(X+8+k*28,Y+16,20,12,6,['#7a8498','#a8b4c8'],'#46557a');
 g.strokeStyle='#c3ccdc';g.lineWidth=.8;g.beginPath();g.moveTo(X+4,Y+5);g.lineTo(X+64,Y+5);g.stroke();g.fillStyle=on?'#38d39f':'#e0473c';g.beginPath();g.arc(X+62,Y+34,2,0,6.3);g.fill();
 g.font='bold 7.5px system-ui';g.textAlign='center';g.fillStyle='#cfe0ff';g.fillText('SUBSTATION',x,Y+38);g.textAlign='left'}
function pill(x,y,t,bg,fg,fs){g.font='bold '+(fs||8.5)+'px system-ui';const w=g.measureText(t).width+10,h=(fs||8.5)+5;rr(x-w/2,y-h/2,w,h,h/2);g.fillStyle=bg;g.fill();g.strokeStyle='rgba(0,0,0,.4)';g.lineWidth=.8;g.stroke();g.fillStyle=fg;g.textAlign='center';g.fillText(t,x,y+(fs||8.5)*.36);g.textAlign='left'}
function station(e,s,sub,lbl,detail){const x=e.sx,y=e.sy,col=s==='on'?'#3d8cff':s==='red'?'#e0473c':'#5b6577';
 if(sub){const X=x-22,Y=y-15;g.fillStyle='rgba(0,0,0,.3)';rr(X+2,Y+2,44,30,4);g.fill();rr(X,Y,44,30,4);g.fillStyle='#252f42';g.fill();g.strokeStyle=col;g.lineWidth=1.4;g.setLineDash([2,2]);g.stroke();g.setLineDash([]);
  for(let k=0;k<2;k++)box(X+5+k*19,Y+14,15,9,5,['#7a8498','#a8b4c8'],'#46557a');g.fillStyle=s==='on'?'#38d39f':s==='red'?'#e0473c':'#5b6577';g.beginPath();g.arc(X+40,Y+26,2,0,6.3);g.fill()}
 else{g.fillStyle='rgba(0,0,0,.35)';g.beginPath();g.arc(x+1.5,y+2,7,0,6.3);g.fill();g.fillStyle='#2a3448';g.beginPath();g.arc(x,y,7,0,6.3);g.fill();g.strokeStyle=col;g.lineWidth=2;g.stroke();g.fillStyle=col;g.beginPath();g.arc(x,y,3,0,6.3);g.fill()}
 if(detail)pill(x+(e.x===0?30:e.x===LW?-30:0),y+(e.y===0?26:e.y===LH?-26:-22),lbl,'rgba(11,18,32,.9)',s==='on'?'#7fc4ff':s==='red'?'#ff9a8e':'#8aa0c0',8)}
function turbine(x,y,on,k){g.fillStyle='rgba(0,0,0,.3)';rr(x+3,y+3,96,26,10);g.fill();rr(x,y,62,24,11);g.fillStyle=lg(x,x+62,[[0,'#6f8a7a'],[.5,'#a8c4b2'],[1,'#5f7a6a']]);g.fill();g.strokeStyle=OUT;g.lineWidth=.9;g.stroke();
 for(let s=10;s<60;s+=10){g.strokeStyle='rgba(24,34,56,.35)';g.beginPath();g.moveTo(x+s,y+2);g.lineTo(x+s,y+22);g.stroke()}
 g.fillStyle='#8a97b0';g.fillRect(x+62,y+9,8,6);rr(x+70,y+2,26,20,4);g.fillStyle=lg(x+70,x+96,[[0,'#2c4a86'],[.5,'#4a78c8'],[1,'#2c4a86']]);g.fill();g.stroke();
 g.save();g.translate(x+83,y+12);g.rotate(on?TM*6+k:0);g.strokeStyle='#bfe3ff';g.lineWidth=1.4;for(let q=0;q<4;q++){g.rotate(1.57);g.beginPath();g.moveTo(0,0);g.lineTo(6,0);g.stroke()}g.restore();
 g.fillStyle=on?'#38d39f':'#555';g.beginPath();g.arc(x+92,y+5,1.8,0,6.3);g.fill()}
function xfmr(x,y){box(x,y+12,40,24,12,['#7a8498','#a8b4c8'],'#46557a');g.fillStyle='#46557a';for(let i=0;i<7;i++)g.fillRect(x+3+i*5.4,y+38,2.4,5);g.fillStyle='#c48a3a';for(let i=0;i<3;i++){g.beginPath();g.arc(x+8+i*12,y+4,2.6,0,6.3);g.fill();g.strokeStyle=OUT;g.lineWidth=.6;g.stroke()}}
function slot(x,y,w,h,t1,t2){g.setLineDash([4,3]);g.strokeStyle='#f5b84b';g.lineWidth=1.2;rr(x,y,w,h,6);g.stroke();g.setLineDash([]);g.fillStyle='rgba(245,184,75,.06)';g.fill();g.textAlign='center';g.font='bold 10px system-ui';g.fillStyle='#f5b84b';g.fillText(t1,x+w/2,y+h/2-1);g.font='9px system-ui';g.fillStyle='#cfa860';g.fillText(t2,x+w/2,y+h/2+11);g.textAlign='left'}