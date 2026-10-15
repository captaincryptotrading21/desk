/* ================================================================
   COCKPIT — Screener
   1) Analyse une fois les coins les plus liquides d'OKX (bougies clôturées uniquement)
   2) Filtre instantanément selon les conditions (préréglage ou perso)
   ================================================================ */
(function(){
"use strict";
var CK=window.CK,S=CK.S,u=CK.u,esc=u.esc,nf=u.nf;
var OKX="https://www.okx.com";

/* ---------- Conditions disponibles ---------- */
var COND=[
  {id:"trend",label:"Position face à la MM200",help:"Prix au-dessus ou en dessous de la moyenne mobile 200",type:"side"},
  {id:"stack",label:"MM50 au-dessus de la MM200",help:"Tendance de fond confirmée",type:"bool"},
  {id:"chop",label:"CHOP 14",help:"≥ 55 : marché compressé · ≤ 45 : marché directionnel",type:"cmp"},
  {id:"rvol",label:"Volume relatif",help:"Volume de la dernière bougie clôturée ÷ moyenne des 20 précédentes",type:"min",unit:"×",step:.1},
  {id:"range",label:"Position dans le range 20",help:"0 % = bas du range, 100 % = haut",type:"cmp",unit:"%"},
  {id:"rsi",label:"RSI 14",help:"Entre deux valeurs",type:"between"},
  {id:"perf",label:"Performance sur 7 bougies",help:"Variation du prix sur les 7 dernières bougies clôturées",type:"cmp",unit:"%"},
  {id:"dist",label:"Proche de la MM200",help:"Écart maximum entre le prix et la MM200",type:"max",unit:"%",step:.5},
  {id:"atr",label:"Volatilité (ATR 14)",help:"Amplitude moyenne d'une bougie, en % du prix",type:"cmp",unit:"%",step:.5},
  {id:"rs",label:"Force relative face au BTC",help:"Performance sur 7 bougies moins celle du BTC (en points de %)",type:"cmp",unit:"%",step:1},
  {id:"oi",label:"Open interest sur 24 h",help:"Variation des positions ouvertes sur les perpétuels (Binance, sinon Bybit)",type:"cmp",unit:"%",step:1},
  {id:"fund",label:"Funding (8 h)",help:"Taux de financement actuel du perpétuel, en %",type:"cmp",unit:"%",step:.005}
];
var BASE={rs:{on:0,op:">=",v:5},oi:{on:0,op:">=",v:5},fund:{on:0,op:"<=",v:0},trend:{on:0,v:"above"},stack:{on:0},chop:{on:0,op:">=",v:55},rvol:{on:0,v:1.5},range:{on:0,op:">=",v:85},rsi:{on:0,a:30,b:70},perf:{on:0,op:">=",v:5},dist:{on:0,v:3},atr:{on:0,op:"<=",v:4}};
var PRESETS={
  compression:{name:"Compression",sub:"Range serré avant un mouvement",desc:"Coins dont le marché se resserre (CHOP ≥ 55) : un mouvement fort se prépare souvent. La colonne CHOP montre l'intensité, triée de la plus forte à la plus faible.",c:{chop:{on:1,op:">=",v:55}},sort:["chop","desc"]},
  tendance:{name:"Tendance",sub:"Déjà en tendance haussière",desc:"Coins au-dessus de leur MM200, avec MM50 au-dessus de la MM200 et un marché directionnel (CHOP ≤ 45). Triés par performance récente.",c:{trend:{on:1,v:"above"},stack:{on:1},chop:{on:1,op:"<=",v:45}},sort:["perf","desc"]},
  cassure:{name:"Cassure",sub:"Sort du range avec du volume",desc:"Coins dans les 15 % hauts de leur range 20 bougies, avec un volume au moins 1,5 fois la moyenne. Triés par volume relatif.",c:{range:{on:1,op:">=",v:85},rvol:{on:1,v:1.5}},sort:["rvol","desc"]},
  retest:{name:"Retest MM200",sub:"Revient sur sa moyenne longue",desc:"Coins en tendance haussière (au-dessus de la MM200) revenus à moins de 3 % de la MM200, avec un RSI entre 35 et 55 : zone de rebond classique.",c:{trend:{on:1,v:"above"},dist:{on:1,v:3},rsi:{on:1,a:35,b:55}},sort:["dist","asc"]},
  force:{name:"Force relative",sub:"Bat le BTC",desc:"Coins au-dessus de leur MM200 qui font au moins 5 points de mieux que le BTC sur 7 bougies : l'argent les préfère au marché. Triés par force relative.",c:{trend:{on:1,v:"above"},rs:{on:1,op:">=",v:5}},sort:["rs7","desc"]},
  levier:{name:"Compression + OI",sub:"Le levier s'accumule",desc:"Coins compressés (CHOP ≥ 55) dont l'open interest a grimpé d'au moins 5 % en 24 h : des positions s'ouvrent pendant que le prix stagne, souvent avant une cassure violente. Triés par hausse d'OI.",c:{chop:{on:1,op:">=",v:55},oi:{on:1,op:">=",v:5}},sort:["oi24","desc"]},
  survente:{name:"Survente",sub:"RSI au plancher",desc:"Coins dont le RSI 14 est sous 30 : vente excessive à court terme. À croiser avec la tendance de fond avant d'agir.",c:{rsi:{on:1,a:0,b:30}},sort:["rsi","asc"]},
  perso:{name:"Perso",sub:"Tes propres filtres",desc:"Tes conditions personnalisées. Ouvre « Filtres » pour les régler, puis « Enregistrer ».",c:null,sort:["chop","desc"]}
};

/* ---------- État ---------- */
var st={preset:null,tf:"1D",conds:null,sort:null,search:"",favOnly:false,favs:[],data:{},scanning:false,abort:false,progress:0};
function lsj(k,v){return CK.lsj(k,v);}
function condsFor(p){var c=CK.merge(BASE,{});if(p==="perso")return CK.merge(c,lsj("scanPerso2")||{});var pr=PRESETS[p];if(pr&&pr.c)c=CK.merge(c,pr.c);return c;}

/* ---------- Indicateurs ---------- */
function sma(v,n,end){end=end==null?v.length:end;if(end<n)return null;var s=0;for(var i=end-n;i<end;i++)s+=v[i];return s/n;}
function chop(c,n){n=n||14;if(c.length<n+1)return null;var atr=0;for(var i=c.length-n;i<c.length;i++)atr+=Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c));
  var hh=-Infinity,ll=Infinity;for(var k=c.length-n;k<c.length;k++){if(c[k].h>hh)hh=c[k].h;if(c[k].l<ll)ll=c[k].l;}var r=hh-ll;if(r<=0||atr<=0)return null;return 100*Math.log10(atr/r)/Math.log10(n);}
function rsi(cl,n){n=n||14;if(cl.length<n+1)return null;var g=0,l=0;for(var i=1;i<=n;i++){var d=cl[i]-cl[i-1];if(d>0)g+=d;else l-=d;}g/=n;l/=n;
  for(var j=n+1;j<cl.length;j++){var e=cl[j]-cl[j-1];g=(g*(n-1)+(e>0?e:0))/n;l=(l*(n-1)+(e<0?-e:0))/n;}return l===0?100:100-100/(1+g/l);}
function atrp(c,n){n=n||14;if(c.length<n+1)return null;var s=0;for(var i=c.length-n;i<c.length;i++)s+=Math.max(c[i].h-c[i].l,Math.abs(c[i].h-c[i-1].c),Math.abs(c[i].l-c[i-1].c));return s/n/c[c.length-1].c*100;}
function metrics(u0,c,live){
  var cl=c.map(function(x){return x.c;}),vol=c.map(function(x){return x.v;}),last=cl[cl.length-1];
  var m200=cl.length>=200?sma(cl,200):null,m50=cl.length>=50?sma(cl,50):null,va=sma(vol,20,vol.length-1);
  var seg=c.slice(-20),hh=-Infinity,ll=Infinity;seg.forEach(function(x){if(x.h>hh)hh=x.h;if(x.l<ll)ll=x.l;});
  return {t:u0.base,type:u0.type,inst:u0.inst,usd:u0.usd,chg:u0.chg,px:live||last,last:last,m50:m50,m200:m200,
    chop:chop(c),rsi:rsi(cl.slice(-120)),rvol:va?vol[vol.length-1]/va:null,range:hh>ll?(last-ll)/(hh-ll)*100:null,
    perf:cl.length>7?(last/cl[cl.length-8]-1)*100:null,perf30:cl.length>30?(last/cl[cl.length-31]-1)*100:null,dist:m200?(last/m200-1)*100:null,atr:atrp(c),n:cl.length};
}

/* ---------- Récupération (bougies clôturées, débit limité, nouvel essai) ---------- */
var lastReq=0;
function get(url,tries){var wait=Math.max(0,lastReq+75-Date.now());lastReq=Math.max(Date.now(),lastReq+75);
  return u.sleep(wait).then(function(){return u.fetchJSON(url,null,15000);}).catch(function(e){if((tries||0)<1)return u.sleep(800).then(function(){return get(url,1);});throw e;});}
/* Bougies alignées sur l'UTC (comme TradingView et Binance) : « 1D » chez OKX se ferme à 16 h UTC (heure de Hong Kong) */
var UTCBAR={"1D":"1Dutc","4H":"4Hutc"};
function candles(inst,bar){return get(OKX+"/api/v5/market/candles?instId="+inst+"&bar="+(UTCBAR[bar]||bar)+"&limit=300").then(function(j){
  return (j.data||[]).filter(function(c){return c[8]==="1";}).reverse().map(function(c){return {h:+c[2],l:+c[3],c:+c[4],v:+c[7]||+c[5]};});});}
function universe(){
  var m=lsj("scanMarkets")||{spot:true,perp:true,volMin:5};var all=[];
  if(m.spot!==false)all=all.concat(S.uni.spot.map(function(x){return {base:x.base,inst:x.inst,type:"spot",usd:x.usd,chg:x.chg,last:x.last};}));
  if(m.perp!==false)all=all.concat(S.uni.perp.map(function(x){return {base:x.base,inst:x.inst,type:"perp",usd:x.usd,chg:x.chg,last:x.last};}));
  /* Cryptos uniquement : on écarte les actions et matières premières tokenisées (catégorie OKX ≠ 1) */
  var cat=S.cat||{},hasCat=Object.keys(cat).length>0;
  var by={};all.filter(function(x){return x.usd>=(m.volMin||0)*1e6&&(!hasCat||cat[x.inst]==="1");}).forEach(function(x){var b=by[x.base];
    if(!b)by[x.base]={pick:x,usd:x.usd};else{b.usd+=x.usd;if(x.type==="spot")b.pick=x;}});
  return Object.keys(by).map(function(k){var o=by[k].pick;o.usd=by[k].usd;return o;}).sort(function(a,b){return b.usd-a.usd;}).slice(0,CK.cfg().screenerMax||150);
}
function scan(){
  if(st.scanning){st.abort=true;return;}
  if(!S.uni){CK.loadMovers().then(scan);return;}
  if(!S.cat||!Object.keys(S.cat).length){if(!scan._w){scan._w=1;setTimeout(function(){scan._w=0;scan();},1500);}return;}
  var tf=st.tf,list=universe(),out=[],done=0,idx=0,t0=Date.now();
  st.scanning=true;st.abort=false;st.data[tf]={rows:out,ts:0,n:list.length,partial:true};
  u.$("scanRun").textContent="Arrêter";setProgress(0);render();
  function worker(){if(st.abort||idx>=list.length)return Promise.resolve();var x=list[idx++];
    return candles(x.inst,tf).then(function(c){if(c.length>=30)out.push(metrics(x,c,x.last));}).catch(function(){})
      .then(function(){done++;setProgress(done/list.length);if(done%8===0)render();return worker();});}
  Promise.all([worker(),worker(),worker(),worker(),worker()]).then(function(){
    st.scanning=false;u.$("scanRun").textContent="Relancer";setProgress(st.abort?0:1);
    st.data[tf]={rows:out,ts:Date.now(),n:list.length,partial:st.abort,dur:Date.now()-t0};
    if(!st.abort)try{lsj("scanCache3:"+tf,{rows:out,ts:Date.now(),n:list.length});}catch(e){}
    render();setTimeout(function(){setProgress(0);},700);
  });
}
function setProgress(f){var i=u.$("scProg").querySelector("i");i.style.transform="scaleX("+f.toFixed(3)+")";}

/* ---------- Filtrage ---------- */
function cmp(v,op,x){return v!=null&&(op===">="?v>=x:v<=x);}
function pass(r,c){
  if(c.trend.on&&!(r.m200!=null&&(c.trend.v==="above"?r.last>r.m200:r.last<r.m200)))return false;
  if(c.stack.on&&!(r.m50!=null&&r.m200!=null&&r.m50>r.m200))return false;
  if(c.chop.on&&!cmp(r.chop,c.chop.op,+c.chop.v))return false;
  if(c.rvol.on&&!(r.rvol!=null&&r.rvol>=+c.rvol.v))return false;
  if(c.range.on&&!cmp(r.range,c.range.op,+c.range.v))return false;
  if(c.rsi.on&&!(r.rsi!=null&&r.rsi>=+c.rsi.a&&r.rsi<=+c.rsi.b))return false;
  if(c.perf.on&&!cmp(r.perf,c.perf.op,+c.perf.v))return false;
  if(c.dist.on&&!(r.dist!=null&&Math.abs(r.dist)<=+c.dist.v))return false;
  if(c.atr.on&&!cmp(r.atr,c.atr.op,+c.atr.v))return false;
  if(c.rs&&c.rs.on&&!cmp(r.rs7,c.rs.op,+c.rs.v))return false;
  if(c.oi&&c.oi.on&&!cmp(r.oi24,c.oi.op,+c.oi.v))return false;
  if(c.fund&&c.fund.on&&!cmp(r.f8,c.fund.op,+c.fund.v))return false;
  return true;
}
function chips(r,c){var a=[];
  if(c.trend.on)a.push(c.trend.v==="above"?"> MM200":"< MM200");if(c.stack.on)a.push("MM50 > MM200");
  if(c.chop.on)a.push("CHOP "+Math.round(r.chop));if(c.rvol.on)a.push("Vol ×"+nf(r.rvol,1));if(c.range.on)a.push("Range "+Math.round(r.range)+" %");
  if(c.rsi.on)a.push("RSI "+Math.round(r.rsi));if(c.perf.on)a.push(u.pct(r.perf,1));if(c.dist.on)a.push("MM200 "+u.pct(r.dist,1));if(c.atr.on)a.push("ATR "+nf(r.atr,1)+" %");
  if(c.rs&&c.rs.on&&r.rs7!=null)a.push("vs BTC "+u.pct(r.rs7,1));if(c.oi&&c.oi.on&&r.oi24!=null)a.push("OI "+u.pct(r.oi24,1));if(c.fund&&c.fund.on&&r.f8!=null)a.push("Funding "+nf(r.f8,3)+" %");
  return a;}
function trendOf(r){if(r.m200==null||r.m50==null)return {t:"Historique court",c:"flat",v:1};if(r.last>r.m200&&r.m50>r.m200)return {t:"Haussière",c:"up",v:2};if(r.last<r.m200&&r.m50<r.m200)return {t:"Baissière",c:"down",v:0};return {t:"Mixte",c:"flat",v:1};}

/* ---------- Rendu ---------- */
var COLS=[["coin","Coin"],["px","Prix","r"],["chg","24 h","r"],["trend","Tendance"],["chop","CHOP","r"],["rsi","RSI","r"],["rs7","vs BTC","r"],["f8","Funding","r"],["oi24","OI 24 h","r"],["rvol","Vol. rel.","r"],["range","Range 20"],["perf","7 bougies","r"],["sig","Signaux"]];
/* ---------- Force relative + dérivés par coin ---------- */
var DV={},dvT=0,dvBusy=false;
function enrich(rows){var b=null;rows.forEach(function(r){if(r.t==="BTC")b=r;});
  rows.forEach(function(r){r.rs7=b&&r.perf!=null&&b.perf!=null?r.perf-b.perf:null;r.rs30=b&&r.perf30!=null&&b.perf30!=null?r.perf30-b.perf30:null;
    var d=DV[r.t];r.f8=d?d.f8:null;r.oi24=d?d.oi24:null;r.oiUsd=d?d.oiUsd:null;r.dsrc=d?d.src:null;});}
function loadDeriv(){
  var d=st.data[st.tf];if(dvBusy||!d||!d.rows.length)return;if(Date.now()-dvT<600000&&Object.keys(DV).length)return;dvBusy=true;
  var bases=d.rows.map(function(r){return r.t;});
  Promise.all([u.fetchJSON("https://fapi.binance.com/fapi/v1/premiumIndex",null,15000).catch(function(){return [];}),
    u.fetchJSON("https://api.bybit.com/v5/market/tickers?category=linear",null,15000).catch(function(){return null;})]).then(function(a){
    var bn={},by={};(a[0]||[]).forEach(function(x){if(/USDT$/.test(x.symbol))bn[x.symbol.replace(/USDT$/,"")]=x;});
    ((a[1]&&a[1].result&&a[1].result.list)||[]).forEach(function(x){if(/USDT$/.test(x.symbol))by[x.symbol.replace(/USDT$/,"")]=x;});
    var todo=bases.filter(function(b){return bn[b]||by[b];});
    todo.forEach(function(b){var x=bn[b],y=by[b];DV[b]=DV[b]||{};DV[b].f8=x?+x.lastFundingRate*100:+y.fundingRate*100;DV[b].src=x?"Binance":"Bybit";if(y)DV[b].oiUsd=+y.openInterestValue;});
    var i=0;function next(){if(i>=todo.length){dvBusy=false;dvT=Date.now();render();return;}var b=todo[i++],url=bn[b]?"https://fapi.binance.com/futures/data/openInterestHist?symbol="+b+"USDT&period=1h&limit=25":"https://api.bybit.com/v5/market/open-interest?category=linear&symbol="+b+"USDT&intervalTime=1h&limit=25";
      get(url).then(function(j){var arr=bn[b]?(j||[]).map(function(x){return +x.sumOpenInterest;}):((j&&j.result&&j.result.list)||[]).map(function(x){return +x.openInterest;}).reverse();
        if(arr.length>=2&&arr[0]>0)DV[b].oi24=(arr[arr.length-1]/arr[0]-1)*100;}).catch(function(){}).then(function(){if(i%15===0)render();next();});}
    next();next();
  });
}
function sv(r,k){if(k==="coin")return r.t;if(k==="rs7"||k==="f8"||k==="oi24"){var z=r[k];return z==null?-1e9:z;}if(k==="trend")return trendOf(r).v;if(k==="sig")return 0;var v=r[k];return v==null?-1e9:v;}
function render(){
  var body=u.$("scanBody");if(!body)return;var c=st.conds,d=st.data[st.tf];
  u.$("scanHead").innerHTML="<tr>"+COLS.map(function(x){return '<th data-key="'+x[0]+'" class="'+(x[2]||"")+'">'+x[1]+(st.sort&&st.sort[0]===x[0]?'<span class="ar">'+(st.sort[1]==="asc"?"▲":"▼")+'</span>':'')+'</th>';}).join("")+"</tr>";
  var cat=S.cat||{},hc=Object.keys(cat).length>0;if(d&&d.rows)enrich(d.rows);if(d&&!st.scanning)loadDeriv();
  var rows=(d&&d.rows||[]).filter(function(r){return (!hc||cat[r.inst]==="1")&&pass(r,c)&&(!st.favOnly||st.favs.indexOf(r.t)>=0)&&(!st.search||r.t.toLowerCase().indexOf(st.search)>=0);});
  var k=st.sort?st.sort[0]:"chop",dir=st.sort?st.sort[1]:"desc";
  rows.sort(function(a,b){var x=sv(a,k),y=sv(b,k);var r=typeof x==="string"?x.localeCompare(y):x-y;return dir==="asc"?r:-r;});
  var meta=u.$("scanMeta");
  if(d){var tfl=st.tf==="1D"?"journalier":"4 h";meta.textContent=st.scanning?("Analyse… "+d.rows.length+"/"+d.n+" · "+rows.length+" résultat"+(rows.length>1?"s":"")):
    (rows.length+" résultat"+(rows.length>1?"s":"")+" sur "+d.rows.length+" coins · "+tfl+(d.ts?" · "+u.ago(d.ts):""));}
  var empty=u.$("scanState");
  if(!rows.length){body.innerHTML="";empty.hidden=false;empty.textContent=st.scanning?"Analyse en cours, les résultats apparaissent au fur et à mesure…":!d?"Lancement de l'analyse…":
    (st.search||st.favOnly)?"Aucun coin ne correspond à ta recherche ou à tes favoris.":"Aucun coin ne remplit ces conditions en ce moment. Assouplis un filtre ou essaie un autre préréglage.";return;}
  empty.hidden=true;
  var seen=render.seen||(render.seen={});
  body.innerHTML=rows.slice(0,80).map(function(r){var tr=trendOf(r),fav=st.favs.indexOf(r.t)>=0,sym="OKX:"+r.t+"USDT"+(r.type==="perp"?".P":""),isNew=!seen[r.t];seen[r.t]=1;
    return '<tr class="clk'+(isNew?" in":"")+'" data-chart="'+sym+'" data-title="'+esc(r.t)+'"><td><div class="coin"><button type="button" class="star'+(fav?" on":"")+'" data-star="'+esc(r.t)+'" aria-label="Favori">★</button>'+u.logo(r.t)+'<div><div class="t">'+esc(r.t)+'</div><div class="n">'+(r.type==="perp"?"Perp":"Spot")+' · '+u.usd(r.usd)+'</div></div></div></td>'+
      '<td class="r mono">'+u.px(r.px)+'</td><td class="r mono '+u.cls(r.chg)+'">'+u.pct(r.chg,1)+'</td>'+
      '<td><span class="pill '+tr.c+'">'+tr.t+'</span></td>'+
      '<td class="r mono">'+(r.chop!=null?Math.round(r.chop):"–")+'</td><td class="r mono">'+(r.rsi!=null?Math.round(r.rsi):"–")+'</td>'+
      '<td class="r mono '+(r.rs7!=null?u.cls(r.rs7):"")+'" data-x="'+esc('<b>Force relative face au BTC</b><span>7 bougies : '+(r.rs7!=null?u.pct(r.rs7,1):"—")+' · 30 bougies : '+(r.rs30!=null?u.pct(r.rs30,1):"—")+'. Positif : le coin fait mieux que le BTC, donc les capitaux le préfèrent au marché.</span>')+'">'+(r.rs7!=null?u.pct(r.rs7,1):"–")+'</td>'+
      '<td class="r mono '+(r.f8!=null?(r.f8>.03?"down":r.f8<0?"up":""):"")+'" data-x="'+esc('<b>Funding du perpétuel</b><span>'+(r.f8!=null?nf(r.f8,4)+' % par 8 h ('+nf(r.f8*3*365,1)+' % par an), source '+r.dsrc+'. Au-dessus de 0,03 % : acheteurs à levier chargés. Négatif : les shorts paient.':'Pas de perpétuel sur Binance ni Bybit.')+'</span>')+'">'+(r.f8!=null?nf(r.f8,3)+" %":"–")+'</td>'+
      '<td class="r mono '+(r.oi24!=null?u.cls(r.oi24):"")+'" data-x="'+esc('<b>Open interest sur 24 h</b><span>'+(r.oi24!=null?'Variation des positions ouvertes (en coins) : '+u.pct(r.oi24,1)+(r.oiUsd?', open interest Bybit '+u.usd(r.oiUsd):'')+'. En hausse avec un prix plat : le levier s\'accumule.':'Donnée en cours de chargement ou indisponible.')+'</span>')+'">'+(r.oi24!=null?u.pct(r.oi24,1):"–")+'</td>'+
      '<td class="r mono">'+(r.rvol!=null?nf(r.rvol,1)+"×":"–")+'</td>'+
      '<td>'+(r.range!=null?'<span class="rg"><i style="left:'+Math.max(0,Math.min(100,r.range)).toFixed(0)+'%"></i></span><span class="mono">'+Math.round(r.range)+' %</span>':"–")+'</td>'+
      '<td class="r mono '+u.cls(r.perf)+'">'+u.pct(r.perf,1)+'</td>'+
      '<td><div class="chips">'+chips(r,c).map(function(x){return '<span class="chip">'+esc(x)+'</span>';}).join("")+'</div></td></tr>';}).join("");
}
function renderPresets(){
  u.$("presets").innerHTML=Object.keys(PRESETS).map(function(k){var p=PRESETS[k];return '<button type="button" class="preset" data-p="'+k+'" aria-pressed="'+(st.preset===k?"true":"false")+'"><b>'+p.name+'</b><span>'+p.sub+'</span></button>';}).join("");
  u.$("scDesc").textContent=(PRESETS[st.preset]||{}).desc||"";
  document.querySelectorAll("#scTf button").forEach(function(b){b.setAttribute("aria-pressed",b.getAttribute("data-tf")===st.tf?"true":"false");});
}
function renderBuilder(){
  var c=st.conds,m=lsj("scanMarkets")||{spot:true,perp:true,volMin:5};
  function num(id,v,step){return '<input type="number" data-f="'+id+'" value="'+v+'" step="'+(step||1)+'">';}
  var h='<div class="cond"><span></span><div class="ct">Marchés analysés<small>Les '+(CK.cfg().screenerMax||150)+' coins les plus liquides d\'OKX (nombre réglable dans le Studio)</small></div><div class="cv"><label><input type="checkbox" data-m="spot"'+(m.spot!==false?" checked":"")+'> Spot</label><label><input type="checkbox" data-m="perp"'+(m.perp!==false?" checked":"")+'> Perp</label> · vol. 24 h ≥ <input type="number" data-m="volMin" value="'+(m.volMin||5)+'" step="1"> M$</div></div>';
  COND.forEach(function(d){var x=c[d.id],v="";
    if(d.type==="side")v='<select data-f="'+d.id+'.v"><option value="above"'+(x.v==="above"?" selected":"")+'>Au-dessus</option><option value="below"'+(x.v==="below"?" selected":"")+'>En dessous</option></select>';
    else if(d.type==="cmp")v='<select data-f="'+d.id+'.op"><option value=">="'+(x.op===">="?" selected":"")+'>≥</option><option value="<="'+(x.op==="<="?" selected":"")+'>≤</option></select>'+num(d.id+".v",x.v,d.step)+(d.unit||"");
    else if(d.type==="min")v="≥ "+num(d.id+".v",x.v,d.step)+(d.unit||"");
    else if(d.type==="max")v="≤ "+num(d.id+".v",x.v,d.step)+(d.unit||"");
    else if(d.type==="between")v="entre "+num(d.id+".a",x.a)+" et "+num(d.id+".b",x.b);
    h+='<div class="cond'+(x.on?"":" off")+'"><input type="checkbox" data-on="'+d.id+'"'+(x.on?" checked":"")+' aria-label="'+esc(d.label)+'"><div class="ct">'+esc(d.label)+'<small>'+esc(d.help)+'</small></div><div class="cv">'+v+'</div></div>';});
  h+='<div class="sc-actions"><button type="button" class="btn sm" id="scReset">Réinitialiser</button><button type="button" class="btn sm primary" id="scSave">Enregistrer dans « Perso »</button></div>';
  u.$("scBuilder").innerHTML=h;
}
function readBuilder(){
  var b=u.$("scBuilder"),c=CK.merge(st.conds,{});
  b.querySelectorAll("[data-on]").forEach(function(i){c[i.getAttribute("data-on")].on=i.checked?1:0;i.closest(".cond").classList.toggle("off",!i.checked);});
  b.querySelectorAll("[data-f]").forEach(function(i){var p=i.getAttribute("data-f").split("."),v=i.tagName==="SELECT"?i.value:+i.value;c[p[0]][p[1]]=v;});
  return c;
}
function setPreset(p){st.preset=p;st.conds=condsFor(p);st.sort=(PRESETS[p]||{}).sort||["chop","desc"];renderPresets();if(!u.$("scBuilder").hidden)renderBuilder();render();}
function wire(){
  u.$("presets").addEventListener("click",function(e){var b=e.target.closest(".preset");if(!b)return;setPreset(b.getAttribute("data-p"));});
  u.$("scTf").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;var tf=b.getAttribute("data-tf");if(tf===st.tf)return;st.tf=tf;CK.ls("scanTf",tf);renderPresets();
    if(!st.data[tf]){var cch=lsj("scanCache3:"+tf);if(cch&&Date.now()-cch.ts<1800000)st.data[tf]=cch;}render();if(!st.data[tf]||Date.now()-st.data[tf].ts>900000){if(st.scanning){st.abort=true;setTimeout(scan,700);}else scan();}});
  u.$("scanRun").addEventListener("click",scan);
  u.$("scanSearch").addEventListener("input",function(){st.search=this.value.trim().toLowerCase();render();});
  u.$("favOnly").addEventListener("click",function(){st.favOnly=!st.favOnly;this.setAttribute("aria-pressed",st.favOnly?"true":"false");render();});
  u.$("scFilters").addEventListener("click",function(){var b=u.$("scBuilder");b.hidden=!b.hidden;this.setAttribute("aria-pressed",b.hidden?"false":"true");if(!b.hidden)renderBuilder();});
  u.$("scBuilder").addEventListener("input",function(e){
    if(e.target.hasAttribute("data-m")){var m=lsj("scanMarkets")||{spot:true,perp:true,volMin:5};var k=e.target.getAttribute("data-m");m[k]=e.target.type==="checkbox"?e.target.checked:+e.target.value;lsj("scanMarkets",m);return;}
    st.conds=readBuilder();if(st.preset!=="perso"){st.preset="perso";renderPresets();}render();});
  u.$("scBuilder").addEventListener("change",function(e){if(e.target.hasAttribute("data-m"))CK.toast("Marchés modifiés : clique sur « Relancer » pour refaire l'analyse.");});
  u.$("scBuilder").addEventListener("click",function(e){
    if(e.target.id==="scSave"){lsj("scanPerso2",st.conds);st.preset="perso";renderPresets();CK.toast("Filtres enregistrés dans « Perso »");}
    if(e.target.id==="scReset"){st.conds=CK.merge(BASE,{});renderBuilder();render();}});
  u.$("scanHead").addEventListener("click",function(e){var th=e.target.closest("th");if(!th)return;var k=th.getAttribute("data-key");if(k==="sig")return;
    st.sort=st.sort&&st.sort[0]===k?[k,st.sort[1]==="asc"?"desc":"asc"]:[k,k==="coin"?"asc":"desc"];render();});
  u.$("scanBody").addEventListener("click",function(e){var s=e.target.closest(".star");if(!s)return;e.stopPropagation();var t=s.getAttribute("data-star"),i=st.favs.indexOf(t);
    if(i>=0)st.favs.splice(i,1);else st.favs.push(t);lsj("favs",st.favs);s.classList.toggle("on",i<0);if(st.favOnly)render();},true);
}
CK.screener={
  boot:function(){st.favs=lsj("favs")||[];st.tf=CK.ls("scanTf")||"1D";var p=CK.cfg().screenerPreset;if(p==="perso"&&!lsj("scanPerso2"))p="compression";if(!PRESETS[p])p="compression";
    var cch=lsj("scanCache3:"+st.tf);if(cch&&Date.now()-cch.ts<1800000)st.data[st.tf]=cch;
    wire();setPreset(p);},
  start:function(){var d=st.data[st.tf];if(!d||Date.now()-d.ts>600000)scan();setInterval(function(){if(!st.scanning)scan();},900000);},
  run:scan,
  rows:function(){var d=st.data[st.tf];return d?d.rows:[];},tf:function(){return st.tf;},
  preset:setPreset
};
CK.runScan=scan;
})();
