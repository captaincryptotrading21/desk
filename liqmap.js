/* ================================================================
   COCKPIT — Carte des liquidations (estimation, façon Coinglass)
   Modèle : chaque heure, la hausse d'open interest Binance = nouvelles positions
   ouvertes au prix moyen de l'heure, réparties long/short selon le flux
   acheteur/vendeur (taker), sur 4 paliers de levier. Les positions dont le prix
   de liquidation a déjà été touché sont retirées. Il reste les niveaux « en attente ».
   ================================================================ */
(function(){
"use strict";
var CK=window.CK,S=CK.S,u=CK.u,esc=u.esc;
var BIN="https://fapi.binance.com";
var TIERS=[[10,.30],[25,.30],[50,.25],[100,.15]],MMR=0.004,NB=96;
var RANGE={BTC:.12,ETH:.15,SOL:.2};
var sym="BTC",model={},cv,ctx,tip,W=0,H=0,dpr=1,hover=-1;
function load(s){
  var p=s+"USDT";
  return Promise.all([
    u.fetchJSON(BIN+"/futures/data/openInterestHist?symbol="+p+"&period=1h&limit=500",null,15000),
    u.fetchJSON(BIN+"/fapi/v1/klines?symbol="+p+"&interval=1h&limit=500",null,15000),
    u.fetchJSON("https://api.bybit.com/v5/market/open-interest?category=linear&symbol="+p+"&intervalTime=1h&limit=200",null,15000).catch(function(){return null;})
  ]).then(function(a){
    /* Deux modèles (Binance, Bybit) sur les mêmes bougies, puis fusion */
    var A=compute(s,a[0],a[1]),bb=((a[2]&&a[2].result&&a[2].result.list)||[]).map(function(x){return {timestamp:x.timestamp,sumOpenInterest:x.openInterest};}),B=bb.length?compute(s,bb,a[1]):{L:[],S:[]};
    model[s]={L:A.L.concat(B.L),S:A.S.concat(B.S),ref:A.ref,hours:A.hours,bbHours:bb.length,ts:Date.now()};render();}).catch(function(){model[s]={err:true};render();});
}
function compute(s,oiArr,kl){
  var oi={};(oiArr||[]).forEach(function(x){oi[+x.timestamp]=+x.sumOpenInterest;});
  var L=[],Sh=[];
  for(var i=0;i<kl.length;i++){
    var k=kl[i],t=+k[0],h=+k[2],l=+k[3],c=+k[4],vol=+k[5],tb=+k[9],o0=oi[t],o1=oi[t+3600000];
    if(o0!=null&&o1!=null){
      var d=o1-o0,m=(h+l+c)/3;
      if(d>0){var buy=vol>0?Math.max(.3,Math.min(.7,tb/vol)):.5,n=d*m;
        TIERS.forEach(function(tr,ti){L.push({liq:m*(1-1/tr[0]+MMR),n:n*buy*tr[1],t:ti});Sh.push({liq:m*(1+1/tr[0]-MMR),n:n*(1-buy)*tr[1],t:ti});});}
      else if(d<0){var tot=0;L.forEach(function(x){tot+=x.n;});Sh.forEach(function(x){tot+=x.n;});var f=tot>0?Math.max(0,1+d*m/tot):1;L.forEach(function(x){x.n*=f;});Sh.forEach(function(x){x.n*=f;});}
    }
    L=L.filter(function(x){return l>x.liq;});Sh=Sh.filter(function(x){return h<x.liq;});
  }
  var last=kl.length?+kl[kl.length-1][4]:0;
  return {L:L,S:Sh,ref:last,hours:kl.length,ts:Date.now()};
}
function livePrice(){var t=S.tick[sym+"-USDT"];return t?t.last:(model[sym]&&model[sym].ref);}
function buckets(m,p){
  /* Mise à l'échelle : Binance + Bybit modélisés, puis ramenés à l'OI total des 5 plateformes */
  var P=S.pos&&S.pos[sym],k=1;if(P&&P.tot&&P.ex.binance&&P.ex.bybit){var bbu=P.ex.binance.oiU+P.ex.bybit.oiU;if(bbu>0)k=Math.max(1,Math.min(3,P.tot/bbu));}m.k=k;
  var r=RANGE[sym]||.15,lo=p*(1-r),hi=p*(1+r),bw=(hi-lo)/NB,B=[];
  for(var i=0;i<NB;i++)B.push({lo:lo+i*bw,hi:lo+(i+1)*bw,l:[0,0,0,0],s:[0,0,0,0],lt:0,st:0});
  m.L.forEach(function(x){if(x.liq<lo||x.liq>=p)return;var b=B[Math.floor((x.liq-lo)/bw)];if(b){b.l[x.t]+=x.n*k;b.lt+=x.n*k;}});
  m.S.forEach(function(x){if(x.liq<=p||x.liq>=hi)return;var b=B[Math.floor((x.liq-lo)/bw)];if(b){b.s[x.t]+=x.n*k;b.st+=x.n*k;}});
  var cumL=0,cumS=0;for(var j=NB-1;j>=0;j--){cumL+=B[j].lt;B[j].cl=cumL;}for(var k=0;k<NB;k++){cumS+=B[k].st;B[k].cs=cumS;}
  return {B:B,lo:lo,hi:hi,bw:bw,p:p};
}
function css(n){return getComputedStyle(document.documentElement).getPropertyValue(n).trim();}
function size(){if(!cv)return;var r=cv.getBoundingClientRect();if(!r.width)return;dpr=Math.min(2,window.devicePixelRatio||1);W=r.width;H=r.height;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
var cache=null;
function render(){
  if(!cv)return;size();if(!W)return;ctx.clearRect(0,0,W,H);
  var m=model[sym],head=document.getElementById("liqHead"),leg=document.getElementById("liqLegend");
  document.querySelectorAll("#liqSym button").forEach(function(b){b.setAttribute("aria-pressed",b.getAttribute("data-s")===sym?"true":"false");});
  if(!m||m.err||!m.L){ctx.fillStyle=css("--muted");ctx.font="13px Barlow, sans-serif";ctx.textAlign="center";ctx.fillText(m&&m.err?"Données Binance indisponibles pour le moment.":"Calcul de la carte…",W/2,H/2);head.innerHTML="";return;}
  var p=livePrice()||m.ref,bk=buckets(m,p),B=bk.B;cache=bk;
  var def=css("--def")||"#FB7185",fav=css("--fav")||"#34D399",faint=css("--faint"),text=css("--text"),accent=css("--accent");
  var pl=10,pr=10,pt=18,pb=22,cw=W-pl-pr,ch=H-pt-pb,bw=cw/NB,base=pt+ch;
  var mx=0,mc=0;B.forEach(function(b){mx=Math.max(mx,b.lt,b.st);});mc=Math.max(B[0].cl||0,B[NB-1].cs||0)||1;mx=mx||1;
  var A=[.35,.55,.78,1];
  B.forEach(function(b,i){var x=pl+i*bw,y=base;
    [0,1,2,3].forEach(function(t){var v=b.l[t]+b.s[t];if(!v)return;var hh=v/mx*ch*.82;ctx.globalAlpha=A[t]*(hover>=0&&hover!==i?.55:1);ctx.fillStyle=b.lt?def:fav;ctx.fillRect(x+.5,y-hh,Math.max(1,bw-1),hh);y-=hh;});});
  ctx.globalAlpha=1;
  function curve(side,color){ctx.beginPath();var started=false;B.forEach(function(b,i){var v=side==="l"?b.cl:b.cs,x=pl+(i+.5)*bw;
      if(side==="l"&&b.lo>=p)return;if(side==="s"&&b.hi<=p)return;var y=base-v/mc*ch*.9;if(!started){ctx.moveTo(x,y);started=true;}else ctx.lineTo(x,y);});
    ctx.strokeStyle=color;ctx.lineWidth=1.6;ctx.globalAlpha=.9;ctx.stroke();ctx.globalAlpha=1;}
  curve("l",def);curve("s",fav);
  var px=pl+(p-bk.lo)/(bk.hi-bk.lo)*cw;
  ctx.setLineDash([4,4]);ctx.strokeStyle=accent;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(px,pt-6);ctx.lineTo(px,base);ctx.stroke();ctx.setLineDash([]);
  var lab=u.px(p);ctx.font="500 11px 'JetBrains Mono', monospace";var tw=ctx.measureText(lab).width+12;
  ctx.fillStyle=accent;roundRect(px-tw/2,2,tw,16,6);ctx.fill();ctx.fillStyle="#06121A";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(lab,px,10);
  ctx.fillStyle=faint;ctx.font="10px 'JetBrains Mono', monospace";ctx.textBaseline="alphabetic";
  [0,.25,.5,.75,1].forEach(function(f){var v=bk.lo+(bk.hi-bk.lo)*f,x=pl+cw*f;ctx.textAlign=f===0?"left":f===1?"right":"center";ctx.fillText(u.px(v),x,H-6);});
  var LVd=CK.levels&&CK.levels.data&&CK.levels.data[sym];
  if(LVd){ctx.font="600 10px 'JetBrains Mono', monospace";ctx.textAlign="center";LVd.L.forEach(function(lv,n){if(lv.px<=bk.lo||lv.px>=bk.hi)return;var lx=pl+(lv.px-bk.lo)/(bk.hi-bk.lo)*cw;
    ctx.setLineDash([2,4]);ctx.strokeStyle=text;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(lx,pt+14);ctx.lineTo(lx,base);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=.85;ctx.fillStyle=text;ctx.fillText(lv.k,lx,pt+8+(n%2)*10);ctx.globalAlpha=1;});}
  if(hover>=0&&B[hover]){var hb=B[hover];ctx.strokeStyle=text;ctx.globalAlpha=.25;ctx.strokeRect(pl+hover*bw+.5,pt,bw-1,ch);ctx.globalAlpha=1;}
  var ml=null,ms=null;B.forEach(function(b){if(b.lt&&(!ml||b.lt>ml.lt))ml=b;if(b.st&&(!ms||b.st>ms.st))ms=b;});
  function mid(b){return (b.lo+b.hi)/2;}
  head.innerHTML=(ml?'<span class="mag-l">Aimant sous le prix : <b>'+u.px(mid(ml))+'</b> ('+u.pct((mid(ml)/p-1)*100,1)+') · '+u.usd(ml.lt)+' de longs</span>':'')+
    (ms?'<span class="mag-s">Aimant au-dessus : <b>'+u.px(mid(ms))+'</b> ('+u.pct((mid(ms)/p-1)*100,1)+') · '+u.usd(ms.st)+' de shorts</span>':'')+
    '<span>Estimation · Binance ('+Math.round(m.hours/24)+' j) + Bybit ('+Math.round((m.bbHours||0)/24)+' j)'+(m.k>1.01?' · ×'+u.nf(m.k,2)+' pour OKX, Bitget, Hyperliquid':'')+'</span>';
  S.liqMagnets={sym:sym,p:p,low:ml?{px:mid(ml),usd:ml.lt}:null,high:ms?{px:mid(ms),usd:ms.st}:null};
  if(hover<0)exIntro();
  leg.innerHTML='<span><i style="background:'+def+'"></i>Longs liquidables</span><span><i style="background:'+fav+'"></i>Shorts liquidables</span><span>Opacité : levier 10× → 100×</span><span>Courbes : cumul si le prix y va</span>';
}
function roundRect(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
/* ---------- Panneau d'explication (à droite de la carte) ---------- */
var ex=null,TL=["10×","25×","50×","100×"];
function exIntro(){
  if(!ex||!cache)return;var p=cache.p,B=cache.B,ml=null,ms=null;B.forEach(function(b){if(b.lt&&(!ml||b.lt>ml.lt))ml=b;if(b.st&&(!ms||b.st>ms.st))ms=b;});
  function mid(b){return (b.lo+b.hi)/2;}
  ex.innerHTML='<span class="lx-k">Comment lire la carte</span><h4>Où le levier se ferait liquider</h4>'+
    '<p>Chaque barre est une zone de prix. Sa hauteur estime combien de positions à levier seraient <b>fermées de force</b> si le prix l\'atteint.</p>'+
    '<ul><li><i class="d"></i><span><b>Rouge, sous le prix</b> : des acheteurs (longs). Si le prix descend jusque-là, leurs ventes forcées accélèrent la baisse.</span></li>'+
    '<li><i class="u"></i><span><b>Vert, au-dessus</b> : des vendeurs (shorts). Si le prix monte jusque-là, leurs rachats forcés accélèrent la hausse.</span></li>'+
    '<li><i class="c"></i><span><b>Courbes</b> : le total cumulé si le prix va jusqu\'à ce niveau.</span></li></ul>'+
    '<div class="lx-mag">'+(ml?'<div><span>Aimant sous le prix</span><b class="down">'+u.px(mid(ml))+'</b><em>'+u.pct((mid(ml)/p-1)*100,1)+' · '+u.usd(ml.lt)+'</em></div>':'')+
      (ms?'<div><span>Aimant au-dessus</span><b class="up">'+u.px(mid(ms))+'</b><em>'+u.pct((mid(ms)/p-1)*100,1)+' · '+u.usd(ms.st)+'</em></div>':'')+'</div>'+
    '<p class="lx-n">Les grosses zones agissent souvent comme des aimants : le prix va chercher la liquidité. C\'est une <b>estimation</b> (aucune plateforme ne publie ces niveaux), à croiser avec la structure du graphique.</p>'+
    '<p class="lx-h">Survole une barre pour le détail.</p>';
}
function exBar(i){
  if(!ex||!cache)return;var b=cache.B[i],p=cache.p,mid=(b.lo+b.hi)/2,below=mid<p,d=(mid/p-1)*100,v=below?b.lt:b.st,cum=below?b.cl:b.cs,arr=below?b.l:b.s;
  if(!v&&!cum){ex.innerHTML='<span class="lx-k">'+u.px(b.lo)+' – '+u.px(b.hi)+'</span><h4>Zone vide</h4><p>Presque aucune position à levier ne serait liquidée ici : le prix peut traverser cette zone sans effet d\'accélération.</p>';return;}
  var mx=0,rk=0;cache.B.forEach(function(x){var y=below?x.lt:x.st;if(y>mx)mx=y;if(y>v)rk++;});
  if(v<mx*.02){ex.innerHTML='<span class="lx-k">'+u.px(b.lo)+' – '+u.px(b.hi)+' · '+(d>0?"+":"")+u.nf(d,1)+' % du prix</span><h4>Zone calme</h4>'+
    '<p>Presque aucune position à levier ne serait liquidée à ce niveau précis ('+u.usd(v)+').</p>'+
    (cum>0?'<p>Mais si le prix '+(below?"descend":"monte")+' jusqu\'ici, environ <b>'+u.usd(cum)+'</b> seraient liquidés en chemin, dans les zones plus proches du prix.</p>':'')+
    '<p class="lx-n">Le prix peut traverser cette zone sans effet d\'accélération propre.</p>';return;}
  var tot=arr[0]+arr[1]+arr[2]+arr[3],ti=0;for(var t=1;t<4;t++)if(arr[t]>arr[ti])ti=t;
  var force=v>=mx*.999?"C'est <b>l'aimant principal</b> "+(below?"sous le prix":"au-dessus du prix")+".":rk<5?"Une des <b>plus grosses zones</b> de la carte.":v>mx*.35?"Zone <b>notable</b>.":"Zone <b>secondaire</b>.";
  ex.innerHTML='<span class="lx-k">'+u.px(b.lo)+' – '+u.px(b.hi)+' · '+(d>0?"+":"")+u.nf(d,1)+' % du prix</span>'+
    '<h4 class="'+(below?"down":"up")+'">'+(below?"Liquidations de longs":"Liquidations de shorts")+'</h4>'+
    '<div class="lx-big"><b>'+u.usd(v)+'</b><span>de positions '+(below?"acheteuses":"vendeuses")+' à levier fermées de force à ce niveau</span></div>'+
    '<p>'+force+' Surtout du levier <b>'+TL[ti]+'</b> ('+u.nf(tot?arr[ti]/tot*100:0,0)+' %).</p>'+
    '<p>Si le prix '+(below?"descend":"monte")+' jusqu\'ici, environ <b>'+u.usd(cum)+'</b> au total seraient liquidés en chemin. '+
      (below?"Ces ventes forcées peuvent <b>accélérer la baisse</b> (effet cascade).":"Ces rachats forcés peuvent <b>accélérer la hausse</b> (short squeeze).")+'</p>'+
    '<p class="lx-n">'+(Math.abs(d)<3?"Niveau proche : il peut être atteint dans la séance.":Math.abs(d)<8?"Niveau à portée d'un mouvement normal de quelques jours.":"Niveau éloigné : il faudrait un mouvement important pour l'atteindre.")+'</p>';
}
function onMove(e){
  if(!cache)return;var r=cv.getBoundingClientRect(),x=e.clientX-r.left,i=Math.floor((x-10)/((W-20)/NB));
  if(i<0||i>=NB){onLeave();return;}if(i!==hover){hover=i;render();exBar(i);}
  var b=cache.B[i],p=cache.p,mid=(b.lo+b.hi)/2,below=mid<p;
  tip.hidden=false;
  tip.innerHTML='<div><b>'+u.px(b.lo)+' – '+u.px(b.hi)+'</b> ('+u.pct((mid/p-1)*100,1)+')</div>'+
    (below?'<div style="color:var(--down)">Longs liquidés à ce niveau : <b>'+u.usd(b.lt)+'</b></div><div>Cumul si le prix descend jusque-là : <b>'+u.usd(b.cl)+'</b></div>'
          :'<div style="color:var(--up)">Shorts liquidés à ce niveau : <b>'+u.usd(b.st)+'</b></div><div>Cumul si le prix monte jusque-là : <b>'+u.usd(b.cs)+'</b></div>');
  var tw=tip.offsetWidth,lx=Math.min(W-tw-6,Math.max(6,x+14));tip.style.left=lx+"px";tip.style.top="26px";
}
function onLeave(){hover=-1;if(tip)tip.hidden=true;render();exIntro();}
var lastP=0;
CK.liqmap={
  boot:function(){cv=document.getElementById("liqCanvas");tip=document.getElementById("liqTip");if(!cv)return;ctx=cv.getContext("2d");
    /* La carte et son panneau d'explication côte à côte */
    var mapEl=document.getElementById("liqMap");if(mapEl&&!document.getElementById("liqEx")){var sp=document.createElement("div");sp.className="lq-split";mapEl.parentNode.insertBefore(sp,mapEl);sp.appendChild(mapEl);
      ex=document.createElement("aside");ex.className="lq-ex";ex.id="liqEx";ex.setAttribute("aria-live","polite");sp.appendChild(ex);}
    if(window.ResizeObserver)new ResizeObserver(function(){render();}).observe(cv);
    cv.addEventListener("pointermove",onMove);cv.addEventListener("pointerleave",onLeave);
    document.getElementById("liqSym").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;sym=b.getAttribute("data-s");hover=-1;render();if(!model[sym]||model[sym].err||Date.now()-model[sym].ts>600000)load(sym);});
    render();load(sym);setInterval(function(){load(sym);},600000);},
  render:render,
  price:function(){var p=livePrice();if(p&&Math.abs(p/(lastP||p)-1)>0.0004){lastP=p;render();}}
};
})();
