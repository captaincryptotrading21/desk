/* ================================================================
   COCKPIT — Tableau des signaux
   Une ligne par indicateur : nom, valeur, lecture, force (3 crans).
   Survol = la ligne ressort, les autres s'effacent, la lecture complète s'affiche.
   Clic = épingler. Aucune note globale.
   ================================================================ */
(function(){
"use strict";
var CK=window.CK,S=CK.S,u=CK.u,esc=u.esc;
var FAM=[{nm:"Crypto",ks:["BTC","TOTAL2","USDTD"]},{nm:"Positionnement",ks:["OI","FUND","FG"]},{nm:"Macro",ks:["VIX","US10Y","DXY","NDX"]}];
var list,detail,hoverK=null,pinK=null,first=true;
function byK(){var m={};(S.factors||[]).forEach(function(f){m[f.k]=f;});return m;}
function famOf(k){for(var i=0;i<FAM.length;i++)if(FAM[i].ks.indexOf(k)>=0)return FAM[i].nm;return "";}
function glyph(f){return !f||f.na?"…":f.impact>0?"▲":f.impact<0?"▼":"●";}
/* L'état décrit l'indicateur (« dollar en hausse ») ; le verdict dit ce que ça implique pour le BTC.
   Les deux sont séparés pour ne jamais se contredire visuellement (flèche rouge + « hausse »). */
function verdict(f){return !f||f.na?"":f.impact>0?"Favorable":f.impact<0?"Défavorable":"Neutre";}
function render(){
  if(!list)return;var F=byK(),i=0;
  list.innerHTML=FAM.map(function(fm){
    return '<div class="sg-fam">'+fm.nm+'</div>'+fm.ks.map(function(k){var f=F[k]||{k:k,nm:k,na:true,val:"—",label:"Chargement"},st=CK.stClass(f),d=(i++)*45;
      return '<button type="button" class="sg '+st+(pinK===k?" pin":"")+'" data-k="'+k+'">'+
        '<span class="sg-nm"><span class="rv"><span style="animation-delay:'+(first?d:0)+'ms">'+esc(f.sh||f.nm)+'</span></span></span>'+
        '<span class="sg-v">'+esc(f.val||"—")+'</span>'+
        '<span class="sg-l">'+(f.na?"":'<em class="sg-e">'+verdict(f)+'</em>')+esc(f.na?"Chargement":f.label)+'</span>'+
        '<span class="sg-b">'+[1,2,3].map(function(n){return '<i class="'+(f.impact&&n<=f.str?"on":"")+'"></i>';}).join("")+'</span></button>';}).join("");
  }).join("");
  first=false;showDetail(hoverK||pinK||defaultK());
}
function defaultK(){var F=S.factors||[];var d=F.filter(function(f){return !f.na&&f.impact<0&&f.str>=2;})[0]||F.filter(function(f){return !f.na;})[0];return d?d.k:"BTC";}
/* Contexte : ce que c'est, pourquoi ça compte pour la crypto, quoi surveiller */
var CTX={
  BTC:["L'actif directeur du marché crypto.","Quand le Bitcoin est en tendance haussière solide, les altcoins suivent et les cassures tiennent mieux. Quand il est baissier, la plupart des rebonds échouent.","Le prix par rapport aux moyennes 50 et 200 jours : au-dessus, le marché est porteur."],
  TOTAL2:["La capitalisation de toutes les cryptos hors Bitcoin.","Elle montre si l'argent circule vers les altcoins. Si TOTAL2 monte plus vite que BTC, les capitaux tournent vers les altcoins (« altseason »).","Sa tendance comparée à celle du Bitcoin."],
  USDTD:["La part de l'USDT (stablecoin) dans toute la capitalisation crypto.","Quand les traders vendent, ils se réfugient en USDT : la dominance monte. Elle évolue donc à l'inverse du marché.","En hausse : l'argent se met à l'abri. En baisse : l'argent revient sur les cryptos."],
  OI:["L'open interest : la valeur de tous les contrats à terme ouverts, donc du levier en jeu.","Il dit si un mouvement est porté par de nouvelles positions (conviction, mais plus de levier à purger) ou par des fermetures.","Un OI qui grimpe vite pendant que le prix stagne : le levier s'accumule, un mouvement violent se prépare."],
  FUND:["Le funding : ce que se paient acheteurs et vendeurs de contrats perpétuels toutes les 8 h.","Positif, les acheteurs paient : ils sont majoritaires. Trop haut, le marché devient fragile, la moindre baisse déclenche des liquidations en chaîne.","Au-dessus de 0,03 % : excès d'acheteurs. Négatif pendant une hausse : carburant pour un short squeeze."],
  FG:["L'indice de peur et d'avidité (0 à 100) : volatilité, volumes, réseaux sociaux, dominance.","C'est un indicateur contrarien : la foule achète souvent au plus haut et vend au plus bas.","Sous 25 : peur extrême, historiquement des zones d'achat. Au-dessus de 75 : euphorie, prudence."],
  VIX:["L'indice de la peur de Wall Street : la volatilité attendue du S&P 500 sur 30 jours.","Quand le VIX bondit, les investisseurs coupent le risque partout, crypto comprise.","Sous 15 : calme, favorable au risque. Au-dessus de 25 : stress, les cryptos souffrent souvent."],
  US10Y:["Le taux des obligations d'État américaines à 10 ans : le « prix de l'argent » de référence mondial.","Quand ce taux monte, garder du cash ou des obligations rapporte davantage : les actifs risqués comme les cryptos deviennent moins attractifs, et le crédit se resserre.","En baisse : vent favorable aux cryptos. Hausse rapide : vent contraire. L'inflation (CPI) et la Fed le font bouger."],
  DXY:["L'indice du dollar américain face à 6 grandes devises (euro, yen, livre…).","Un dollar fort aspire les liquidités du reste du monde et pèse sur les actifs cotés en dollars comme le Bitcoin. BTC et DXY évoluent souvent en sens inverse.","DXY en baisse : environnement favorable. Dollar qui s'envole : prudence sur les cryptos."],
  NDX:["Le Nasdaq 100 : les 100 plus grosses valeurs technologiques américaines.","Le Bitcoin est souvent corrélé aux actions tech : les mêmes investisseurs achètent ou vendent du risque en même temps.","Nasdaq en tendance haussière : appétit pour le risque, favorable au Bitcoin."]
};
var REL={BTC:["TOTAL2","USDTD"],TOTAL2:["BTC","USDTD"],USDTD:["BTC","TOTAL2"],OI:["FUND","BTC"],FUND:["OI","FG"],FG:["FUND","VIX"],VIX:["NDX","US10Y"],US10Y:["DXY","NDX"],DXY:["US10Y","BTC"],NDX:["VIX","BTC"]};
function ctxHTML(k){var c=CTX[k];if(!c)return "";var F=byK();
  var rel=(REL[k]||[]).map(function(r){var g=F[r];if(!g)return "";return '<button type="button" class="md-rel '+CK.stClass(g)+'" data-rel="'+r+'">'+esc(g.sh||g.nm)+' <em>'+esc(g.na?"—":g.label)+'</em></button>';}).join("");
  return '<div class="md-ctx"><div><span>C\'est quoi</span><p>'+esc(c[0])+'</p></div><div><span>Pourquoi ça compte</span><p>'+esc(c[1])+'</p></div><div><span>À surveiller</span><p>'+esc(c[2])+'</p></div>'+
    (rel?'<div class="md-rels"><span>À croiser avec</span><div>'+rel+'</div></div>':'')+
    ((k==="NDX"||k==="DXY")&&CK.corrText&&CK.corrText(k==="NDX"?"NDX":"USD")?'<div class="md-rels"><span>Lien mesuré avec le BTC</span><p>'+esc(CK.corrText(k==="NDX"?"NDX":"USD"))+'</p></div>':'')+'</div>';}
function showDetail(k){
  if(!detail)return;var f=(S.factors||[]).filter(function(x){return x.k===k;})[0];
  if(!f){detail.innerHTML='<div class="empty">Analyse des marchés en cours…</div>';return;}
  var proof=(f.proof||[]).map(function(p){return '<span>'+esc(p[0])+'</span><b>'+esc(p[1])+'</b>';}).join("");
  detail.innerHTML='<div class="md-in"><div class="md-k">'+esc(famOf(k))+(f.sub?" · "+esc(f.sub):"")+(pinK===k?" · épinglé":"")+'</div>'+
    '<div class="md-h"><h3>'+esc(f.nm)+'</h3><span class="st '+CK.stClass(f)+'">'+CK.stLabel(f)+'</span></div>'+
    '<div class="md-v">'+esc(f.val)+(f.ch!=null?' <span class="'+u.cls(f.ch)+'">'+u.pct(f.ch)+'</span>':'')+'</div>'+
    '<span class="md-sec">Lecture actuelle</span><p class="md-t">'+f.text+'</p>'+ctxHTML(k)+(proof?'<span class="md-sec">Les chiffres</span><div class="proof">'+proof+'</div>':'')+
    '<div class="md-foot">'+(f.chart?'<button type="button" class="md-a" data-chart="'+f.chart+'" data-title="'+esc(f.nm)+'">Vérifier sur le graphique</button>':'')+
    (f.rule?'<details class="md-rule"><summary>Voir la règle</summary><p>'+esc(f.rule)+'</p></details>':'')+'</div></div>';
}
function wire(){
  if(detail)detail.addEventListener("click",function(e){var r=e.target.closest("[data-rel]");if(!r)return;var k=r.getAttribute("data-rel");pinK=k;
    [].forEach.call(list.querySelectorAll(".sg"),function(x){x.classList.toggle("pin",x.getAttribute("data-k")===pinK);});showDetail(k);});
  list.addEventListener("pointerover",function(e){var r=e.target.closest(".sg");if(!r)return;var k=r.getAttribute("data-k");if(k!==hoverK){hoverK=k;showDetail(k);}});
  list.addEventListener("pointerleave",function(){hoverK=null;showDetail(pinK||defaultK());});
  list.addEventListener("focusin",function(e){var r=e.target.closest(".sg");if(r)showDetail(r.getAttribute("data-k"));});
  list.addEventListener("click",function(e){var r=e.target.closest(".sg");if(!r)return;var k=r.getAttribute("data-k");pinK=pinK===k?null:k;
    [].forEach.call(list.querySelectorAll(".sg"),function(x){x.classList.toggle("pin",x.getAttribute("data-k")===pinK);});showDetail(k);});
}
/* Story : le tableau dessiné sur canvas */
function drawCanvas(x,ox,oy,width,P){
  var F=byK(),y=oy,rowH=62,famH=44;x.save();x.textBaseline="middle";
  x.fillStyle=P.faint||P.muted;x.font="600 20px Barlow, sans-serif";x.textAlign="right";try{x.letterSpacing="2px";}catch(e){}x.fillText("EFFET SUR LE BTC",ox+width,y+famH/2);try{x.letterSpacing="0px";}catch(e){}x.textAlign="left";
  FAM.forEach(function(fm){
    x.fillStyle=P.muted;x.font="600 22px Barlow, sans-serif";try{x.letterSpacing="3px";}catch(e){}x.fillText(fm.nm.toUpperCase(),ox,y+famH/2);try{x.letterSpacing="0px";}catch(e){}y+=famH;
    fm.ks.forEach(function(k){var f=F[k];if(!f)return;var c=f.na?P.muted:f.impact>0?P.up:f.impact<0?P.down:P.muted;
      x.strokeStyle=P.rule;x.lineWidth=1;x.beginPath();x.moveTo(ox,y);x.lineTo(ox+width,y);x.stroke();
      x.fillStyle=P.text;x.font="600 40px 'Barlow Condensed', sans-serif";x.fillText(String(f.sh||f.nm).toUpperCase(),ox,y+rowH/2);
      x.fillStyle=P.muted;x.font="500 24px Barlow, sans-serif";x.fillText(f.na?"—":f.label,ox+300,y+rowH/2,width-300-3*34-200);
      if(!f.na){x.fillStyle=c;x.font="700 22px Barlow, sans-serif";x.textAlign="right";try{x.letterSpacing="1.5px";}catch(e){}x.fillText(verdict(f).toUpperCase(),ox+width-3*34-18,y+rowH/2);try{x.letterSpacing="0px";}catch(e){}x.textAlign="left";}
      for(var n=1;n<=3;n++){x.fillStyle=f.impact&&n<=f.str?c:P.rule;x.fillRect(ox+width-3*34+(n-1)*34,y+rowH/2-5,28,10);}
      y+=rowH;});
    y+=10;});
  x.restore();return y-oy;
}
CK.map={
  boot:function(){list=document.getElementById("sigList");detail=document.getElementById("mapDetail");if(!list)return;render();wire();},
  update:function(changed){render();(changed||[]).forEach(function(c){var el=list&&list.querySelector('.sg[data-k="'+c.f.k+'"]');if(el&&el.animate&&!CK.reduce)el.animate([{backgroundColor:"rgba(255,138,61,.25)"},{backgroundColor:"transparent"}],{duration:1600});});},
  theme:function(){},
  drawCanvas:drawCanvas
};
})();
