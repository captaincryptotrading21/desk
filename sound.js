/* ================================================================
   DESK — Sons : deux ambiances générées + sons d'interface discrets
   Tout est synthétisé avec Web Audio (aucun fichier, aucune clé).
   · « Calme » : nappes d'accords lents, cloches pentatoniques, souffle.
   · « Tactique » : ambiance de menu militaire façon Black Ops (création
     originale) : drone grave, pulsation sourde, accords mineurs sombres,
     impacts métalliques lointains, grésillements radio, arpège tendu.
   Bouton musique = menu (ambiance, volume, couper). Bouton haut-parleur =
   sons d'interface. Tout est mémorisé. La musique démarre au premier clic
   (règle des navigateurs).
   ================================================================ */
(function(){
"use strict";
var CK=window.CK,u=CK.u;
var ac=null,master,musicBus,sfxBus,verb,started=false;
var musicOn=CK.ls("music")!=="0",sfxOn=CK.ls("sfx")!=="0",mode=CK.ls("amb")||"tactique",vol=+(CK.ls("vol")||.8);
var engine=null;

function ctx(){
  if(ac)return ac;var A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
  ac=new A();master=ac.createGain();master.gain.value=.9;master.connect(ac.destination);
  /* Réverbération : impulsion de bruit qui décroît sur 5 s */
  verb=ac.createConvolver();var len=ac.sampleRate*5,ir=ac.createBuffer(2,len,ac.sampleRate);
  for(var c=0;c<2;c++){var d=ir.getChannelData(c);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3);}
  verb.buffer=ir;var vg=ac.createGain();vg.gain.value=.5;verb.connect(vg);vg.connect(master);
  musicBus=ac.createGain();musicBus.gain.value=0;musicBus.connect(master);musicBus.connect(verb);
  sfxBus=ac.createGain();sfxBus.gain.value=.5;sfxBus.connect(master);
  return ac;
}
function hz(n){return 440*Math.pow(2,(n-69)/12);}
function noiseBuf(sec,brown){var len=ac.sampleRate*sec,b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0),l=0;
  for(var i=0;i<len;i++){var w=Math.random()*2-1;if(brown){l=(l+.02*w)/1.02;d[i]=l*3.2;}else d[i]=w;}return b;}
/* Petit gestionnaire : minuteries et sons longs d'une ambiance, pour pouvoir tout arrêter */
function Eng(){this.t=[];this.n=[];this.on=true;}
Eng.prototype.every=function(fn,min,max){var self=this;(function go(){if(!self.on)return;fn();self.t.push(setTimeout(go,min+Math.random()*((max||min)-min)));})();};
Eng.prototype.keep=function(node){this.n.push(node);return node;};
Eng.prototype.stop=function(){this.on=false;this.t.forEach(clearTimeout);var n=this.n;setTimeout(function(){n.forEach(function(x){try{x.stop();}catch(e){}});},1500);};

/* ---------- Ambiance « Calme » ---------- */
function calm(){
  var E=new Eng(),CH=[[50,57,61,64,69],[47,54,57,61,66],[43,50,54,59,62],[45,52,57,59,64]],BELL=[74,76,78,81,83,86,88],ci=0;
  function pad(notes,dur){var t=ac.currentTime,f=ac.createBiquadFilter();f.type="lowpass";f.frequency.value=700;f.Q.value=.4;
    var lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.07;lg.gain.value=260;lfo.connect(lg);lg.connect(f.frequency);lfo.start(t);lfo.stop(t+dur+4);
    var g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.055,t+3.5);g.gain.setValueAtTime(.055,t+dur-.5);g.gain.linearRampToValueAtTime(0,t+dur+3.5);
    f.connect(g);g.connect(musicBus);
    notes.forEach(function(n,k){[-6,6].forEach(function(det){var o=ac.createOscillator();o.type=k===0?"sine":"triangle";o.frequency.value=hz(n);o.detune.value=det;
      var og=ac.createGain();og.gain.value=k===0?.9:.38;o.connect(og);og.connect(f);o.start(t);o.stop(t+dur+4);});});}
  function bell(){var t=ac.currentTime,n=BELL[(Math.random()*BELL.length)|0],o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),g2=ac.createGain();
    o.frequency.value=hz(n);o2.frequency.value=hz(n)*2.01;g2.gain.value=.25;o2.connect(g2);g2.connect(g);o.connect(g);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.035,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+3.2);
    var dl=ac.createDelay(1.5),fb=ac.createGain();dl.delayTime.value=.62;fb.gain.value=.32;g.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(musicBus);
    g.connect(musicBus);o.start(t);o2.start(t);o.stop(t+3.4);o2.stop(t+3.4);}
  var s=E.keep(ac.createBufferSource());s.buffer=noiseBuf(3,true);s.loop=true;var f=ac.createBiquadFilter();f.type="lowpass";f.frequency.value=420;var g=ac.createGain();g.gain.value=.05;
  s.connect(f);f.connect(g);g.connect(musicBus);s.start();
  E.every(function(){pad(CH[ci++%CH.length],9);},9000);
  E.t.push(setTimeout(function(){E.every(bell,2600,6800);},3000));
  return E;
}

/* ---------- Ambiance « Tactique » (façon menu Black Ops, création originale) ---------- */
function tactical(){
  var E=new Eng(),t0=ac.currentTime;
  /* Drone grave : deux dents de scie en Ré, filtrées, qui respirent */
  var df=ac.createBiquadFilter();df.type="lowpass";df.frequency.value=150;df.Q.value=5;
  var dl=E.keep(ac.createOscillator()),dlg=ac.createGain();dl.frequency.value=.045;dlg.gain.value=70;dl.connect(dlg);dlg.connect(df.frequency);dl.start();
  var dg=ac.createGain();dg.gain.setValueAtTime(0,t0);dg.gain.linearRampToValueAtTime(.085,t0+4);df.connect(dg);dg.connect(musicBus);
  [[36.71,0],[36.71,9],[73.42,-4]].forEach(function(v,k){var o=E.keep(ac.createOscillator());o.type=k===2?"sine":"sawtooth";o.frequency.value=v[0];o.detune.value=v[1];var g=ac.createGain();g.gain.value=k===2?.6:.5;o.connect(g);g.connect(df);o.start();});
  /* Pulsation sourde (double battement) */
  function thump(at,v){var o=ac.createOscillator(),g=ac.createGain();o.frequency.setValueAtTime(62,at);o.frequency.exponentialRampToValueAtTime(36,at+.28);
    g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(v,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+.42);o.connect(g);g.connect(master);o.start(at);o.stop(at+.45);}
  E.every(function(){var t=ac.currentTime+.05;var k=vol*(musicOn&&!document.hidden?1:0);if(!k)return;thump(t,.13*k);thump(t+.24,.08*k);},1700);
  /* Accords mineurs sombres (Ré m → Si♭ → Sol m → La) */
  var CH=[[50,53,57,62],[46,50,53,58],[43,50,55,58],[45,52,57,61]],ci=0;
  function pad(notes,dur){var t=ac.currentTime,f=ac.createBiquadFilter();f.type="lowpass";f.frequency.setValueAtTime(380,t);f.frequency.linearRampToValueAtTime(950,t+dur*.6);f.frequency.linearRampToValueAtTime(420,t+dur+3);
    var g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.032,t+4);g.gain.setValueAtTime(.032,t+dur-.5);g.gain.linearRampToValueAtTime(0,t+dur+3);f.connect(g);g.connect(musicBus);
    notes.forEach(function(n){[-9,9].forEach(function(det){var o=ac.createOscillator();o.type="sawtooth";o.frequency.value=hz(n);o.detune.value=det;o.connect(f);o.start(t);o.stop(t+dur+3.2);});});}
  E.every(function(){pad(CH[ci++%CH.length],11);},11000);
  /* Impacts métalliques lointains (synthèse FM inharmonique) */
  E.t.push(setTimeout(function(){E.every(function(){var t=ac.currentTime,base=hz([38,41,43,45][(Math.random()*4)|0]),c=ac.createOscillator(),m=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain();
    c.frequency.value=base;m.frequency.value=base*2.76;mg.gain.setValueAtTime(base*6,t);mg.gain.exponentialRampToValueAtTime(base*.2,t+3);m.connect(mg);mg.connect(c.frequency);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.06,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+4.5);c.connect(g);g.connect(musicBus);g.connect(verb);
    c.start(t);m.start(t);c.stop(t+4.6);m.stop(t+4.6);},9000,16000);},5000));
  /* Grésillements radio (bruit filtré haché + bip) */
  E.t.push(setTimeout(function(){E.every(function(){var t=ac.currentTime,d=.6+Math.random()*.9,s=ac.createBufferSource();s.buffer=noiseBuf(1.6);
    var bp=ac.createBiquadFilter();bp.type="bandpass";bp.frequency.value=1700+Math.random()*900;bp.Q.value=3.5;
    var g=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain();lfo.type="square";lfo.frequency.value=7+Math.random()*7;lg.gain.value=.008;lfo.connect(lg);lg.connect(g.gain);
    g.gain.setValueAtTime(.009,t);g.gain.setValueAtTime(0,t+d);s.connect(bp);bp.connect(g);g.connect(musicBus);s.start(t);s.stop(t+d);lfo.start(t);lfo.stop(t+d);
    if(Math.random()<.6){var b=ac.createOscillator(),bg=ac.createGain();b.frequency.value=1150;bg.gain.setValueAtTime(0,t+d);bg.gain.linearRampToValueAtTime(.012,t+d+.01);bg.gain.linearRampToValueAtTime(0,t+d+.09);b.connect(bg);bg.connect(musicBus);b.start(t+d);b.stop(t+d+.1);}
  },12000,24000);},8000));
  /* Arpège tendu, très bas dans le mix */
  var ARP=[62,65,69,72,74,72,69,65],ai=0;
  E.t.push(setTimeout(function(){E.every(function(){var t=ac.currentTime,o=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();o.type="triangle";o.frequency.value=hz(ARP[ai++%ARP.length]);
    f.type="lowpass";f.frequency.value=1800;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.011,t+.01);g.gain.exponentialRampToValueAtTime(.0001,t+.28);o.connect(f);f.connect(g);g.connect(musicBus);o.start(t);o.stop(t+.3);},300);},12000));
  return E;
}

/* ---------- Pilotage de la musique ---------- */
function fadeTo(v,sec){var t=ac.currentTime;musicBus.gain.cancelScheduledValues(t);musicBus.gain.setValueAtTime(musicBus.gain.value,t);musicBus.gain.linearRampToValueAtTime(v,t+sec);}
function startEngine(){if(engine)engine.stop();engine=mode==="calme"?calm():tactical();}
function music(on){
  if(!ctx())return;if(ac.state==="suspended")ac.resume();
  if(on){if(!engine)startEngine();fadeTo(vol,2.5);}
  else{fadeTo(0,1.2);var e=engine;engine=null;if(e)setTimeout(function(){if(!musicOn)e.stop();else if(engine!==e)e.stop();},1300);}
}
function setMode(m){if(m===mode&&engine)return;mode=m;CK.ls("amb",m);if(!musicOn||!ac||!started)return;
  fadeTo(0,.8);var old=engine;engine=null;setTimeout(function(){if(old)old.stop();startEngine();fadeTo(vol,2);},850);}

/* ---------- Sons d'interface ---------- */
function blip(f1,f2,dur,v,type){
  if(!sfxOn||!ctx()||ac.state!=="running")return;var t=ac.currentTime,o=ac.createOscillator(),g=ac.createGain();
  o.type=type||"sine";o.frequency.setValueAtTime(f1,t);o.frequency.exponentialRampToValueAtTime(f2,t+dur);
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(sfxBus);o.start(t);o.stop(t+dur+.02);
}
function whoosh(up){
  if(!sfxOn||!ctx()||ac.state!=="running")return;var t=ac.currentTime,s=ac.createBufferSource();s.buffer=noiseBuf(.7);
  var f=ac.createBiquadFilter();f.type="bandpass";f.Q.value=1.2;f.frequency.setValueAtTime(up?300:1800,t);f.frequency.exponentialRampToValueAtTime(up?2200:260,t+.55);
  var g=ac.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.16,t+.18);g.gain.exponentialRampToValueAtTime(.0001,t+.65);
  s.connect(f);f.connect(g);g.connect(sfxBus);g.connect(verb);s.start(t);s.stop(t+.7);
  setTimeout(function(){blip(up?hz(81):hz(74),up?hz(81):hz(74),.5,.05);},up?160:120);
}
var lastHover=0;
CK.sfx={
  click:function(){blip(1250,820,.07,.07);},
  hover:function(){var n=performance.now();if(n-lastHover<70)return;lastHover=n;blip(2400,2100,.035,.018);},
  enter:function(){whoosh(true);},back:function(){whoosh(false);},
  toggle:function(on){blip(on?660:520,on?990:390,.12,.06,"triangle");},
  /* Jingle d'info : trois notes montantes cristallines + souffle bref, indépendant des sons de clic */
  news:function(){if(!ctx()||ac.state!=="running")return;var t=ac.currentTime;
    [[76,0],[81,.11],[88,.22],[93,.36]].forEach(function(n,i){var o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),g2=ac.createGain();
      o.type="sine";o2.type="triangle";o.frequency.value=hz(n[0]);o2.frequency.value=hz(n[0])*2;g2.gain.value=.18;o2.connect(g2);g2.connect(g);o.connect(g);
      var st=t+n[1],v=i===3?.075:.06;g.gain.setValueAtTime(0,st);g.gain.linearRampToValueAtTime(v,st+.008);g.gain.exponentialRampToValueAtTime(.0001,st+(i===3?1.4:.35));
      g.connect(master);g.connect(verb);o.start(st);o2.start(st);o.stop(st+1.5);o2.stop(st+1.5);});
    var s=ac.createBufferSource();s.buffer=noiseBuf(.4);var f=ac.createBiquadFilter();f.type="highpass";f.frequency.value=3500;var g=ac.createGain();
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.03,t+.03);g.gain.exponentialRampToValueAtTime(.0001,t+.35);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+.4);}
};

/* ---------- Header : interrupteur sons + menu musique ---------- */
var IC={sfx:'<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path class="w1" d="M15.5 9a4 4 0 0 1 0 6"/><path class="w2" d="M18 6.5a7.5 7.5 0 0 1 0 11"/><path class="x" d="m16 9 5 6m0-6-5 6"/></svg>',
  music:'<svg viewBox="0 0 24 24"><path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/><path class="x" d="M3 3l18 18"/></svg>'};
var pop;
function paint(){var a=u.$("btnSfx"),b=u.$("btnMusic");
  if(a){a.setAttribute("aria-pressed",sfxOn?"true":"false");a.title=sfxOn?"Couper les sons d'interface":"Activer les sons d'interface";}
  if(b){b.setAttribute("aria-pressed",musicOn?"true":"false");b.title="Musique d'ambiance";}
  if(pop){[].forEach.call(pop.querySelectorAll("[data-amb]"),function(x){var k=x.getAttribute("data-amb");x.setAttribute("aria-pressed",(k==="off"?!musicOn:musicOn&&k===mode)?"true":"false");});
    var r=pop.querySelector("#sndVol");if(r)r.value=Math.round(vol*100);}}
function choose(k){
  if(k==="off"){if(musicOn){musicOn=false;CK.ls("music","0");music(false);}}
  else{var was=musicOn;musicOn=true;CK.ls("music","1");started=true;if(!was){mode=k;CK.ls("amb",k);music(true);}else setMode(k);}
  paint();CK.sfx.toggle(musicOn);
}
CK.sound={
  boot:function(){
    var act=document.querySelector(".top .actions");if(!act)return;
    var wrap=document.createElement("div");wrap.className="snd";wrap.setAttribute("role","group");wrap.setAttribute("aria-label","Son");
    wrap.innerHTML='<button type="button" class="btn icon snd-b" id="btnSfx">'+IC.sfx+'</button>'+
      '<button type="button" class="btn icon snd-b" id="btnMusic" aria-haspopup="true" aria-expanded="false">'+IC.music+'<span class="eq" aria-hidden="true"><i></i><i></i><i></i></span></button>'+
      '<div class="snd-pop" id="sndPop" role="dialog" aria-label="Musique d\'ambiance" hidden><span class="sp-h">Ambiance</span>'+
        '<button type="button" data-amb="tactique"><b>Tactique</b><span>Menu militaire, tension sourde</span></button>'+
        '<button type="button" data-amb="calme"><b>Calme</b><span>Nappes douces, cloches</span></button>'+
        '<button type="button" data-amb="off"><b>Coupée</b><span>Silence</span></button>'+
        '<label class="sp-v" for="sndVol"><span>Volume</span><input type="range" id="sndVol" min="0" max="100" step="1"></label>'+
        '<label class="sp-f" for="sndFlash"><input type="checkbox" id="sndFlash"><span><b>Flash news</b>Pop-up + son à chaque news FinancialJuice importante</span></label>'+
        '<button type="button" class="sp-test" id="sndFlashT">Tester un flash</button></div>';
    act.insertBefore(wrap,act.firstChild);pop=u.$("sndPop");paint();
    u.$("btnSfx").addEventListener("click",function(){sfxOn=!sfxOn;CK.ls("sfx",sfxOn?"1":"0");ctx();if(ac&&ac.state==="suspended")ac.resume();paint();if(sfxOn)setTimeout(function(){CK.sfx.toggle(true);},30);});
    var mb=u.$("btnMusic");
    function openPop(on){pop.hidden=!on;mb.setAttribute("aria-expanded",on?"true":"false");if(on){paint();
      /* positionné par rapport à l'écran : la barre de boutons défile sur mobile et rognerait le menu */
      var r=mb.getBoundingClientRect(),w=Math.min(260,innerWidth-24);pop.style.position="fixed";pop.style.width=w+"px";pop.style.top=Math.round(r.bottom+10)+"px";pop.style.left=Math.round(Math.max(12,Math.min(r.left,innerWidth-w-12)))+"px";var f=pop.querySelector('[aria-pressed="true"]')||pop.querySelector("button");if(f)f.focus();}}
    mb.addEventListener("click",function(e){e.stopPropagation();openPop(pop.hidden);});
    pop.addEventListener("click",function(e){e.stopPropagation();var b=e.target.closest("[data-amb]");if(b)choose(b.getAttribute("data-amb"));});
    var fl=pop.querySelector("#sndFlash");fl.checked=!CK.flash||CK.flash.on();fl.addEventListener("change",function(){if(CK.flash)CK.flash.set(fl.checked);});
    pop.querySelector("#sndFlashT").addEventListener("click",function(){ctx();if(ac&&ac.state==="suspended")ac.resume();if(CK.flashTest)CK.flashTest();});
    pop.querySelector("#sndVol").addEventListener("input",function(e){vol=+e.target.value/100;CK.ls("vol",String(vol));if(ac&&musicOn)fadeTo(vol,.15);});
    document.addEventListener("click",function(){if(!pop.hidden)openPop(false);});
    window.addEventListener("resize",function(){if(!pop.hidden)openPop(false);});window.addEventListener("scroll",function(){if(!pop.hidden)openPop(false);},{passive:true});
    document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!pop.hidden){e.stopPropagation();openPop(false);mb.focus();}},true);
    /* Premier geste : le navigateur autorise enfin le son */
    function first(e){if(started)return;if(e&&e.target&&e.target.closest&&e.target.closest("#sndPop,#btnMusic"))return;started=true;ctx();if(ac.state==="suspended")ac.resume();if(musicOn)music(true);}
    ["pointerdown","keydown"].forEach(function(ev){document.addEventListener(ev,first,{capture:true});});
    document.addEventListener("click",function(e){var t=e.target.closest&&e.target.closest("button,a,[role=option],[role=tab],[role=link],.tk,.sg,.mv,tr.clk");if(!t||t.closest(".snd"))return;CK.sfx.click();},true);
    document.addEventListener("pointerover",function(e){if(e.pointerType!=="mouse")return;var t=e.target.closest&&e.target.closest(".ln-card,.wb-sw button,.wb-back,.ln-go");if(t&&!t.contains(e.relatedTarget))CK.sfx.hover();});
    document.addEventListener("visibilitychange",function(){if(!ac||!musicOn||!started)return;musicBus.gain.setTargetAtTime(document.hidden?0:vol,ac.currentTime,document.hidden?.4:.8);});
  }
};
})();
