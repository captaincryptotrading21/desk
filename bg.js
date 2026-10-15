/* ================================================================
   COCKPIT — Fond : relief 3D tracé avec le vrai cours du BTC (200 jours)
   Fil de fer discret + courbe du prix. Dérive lente, suit la souris.
   Limité à ~30 images/s et en pause quand l'onglet est caché.
   ================================================================ */
(function(){
"use strict";
var CK=window.CK;
var yaw=0,zoom=0,tintHex=null,slow=false;
CK.bg={cam:function(y,z){yaw=y||0;zoom=z||0;},slow:function(v){slow=!!v;},tint:function(hex){tintHex=hex||null;},boot:function(){
  var cv=document.getElementById("bg3d");if(!cv||!window.WebGLRenderingContext)return;
  import("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js").then(function(THREE){
    var r;try{r=new THREE.WebGLRenderer({canvas:cv,antialias:true,powerPreference:"low-power"});}catch(e){return;}
    r.setPixelRatio(1);r.setSize(innerWidth,innerHeight);
    var sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,.1,400);cam.position.set(0,14,62);
    var wireMat=new THREE.MeshBasicMaterial({wireframe:true,transparent:true,opacity:.5}),lineMat=new THREE.LineBasicMaterial({});
    var mesh=null,line=null;
    function colors(){var cs=getComputedStyle(document.documentElement),g=function(n,d){return cs.getPropertyValue(n).trim()||d;};
      var bg=new THREE.Color(g("--bg","#0A0C0F"));sc.background=bg;sc.fog=new THREE.Fog(bg,30,170);
      baseWire=new THREE.Color(g("--terrain","#3A3F48"));baseLine=new THREE.Color(g("--accent","#FF8A3D"));if(!colInit){colInit=true;wireMat.color.copy(baseWire);lineMat.color.copy(baseLine);}draw();}
    var colInit=false;
    var baseWire=new THREE.Color("#3A3F48"),baseLine=new THREE.Color("#FF8A3D"),tW=new THREE.Color(),tL=new THREE.Color();
    /* Teinte du monde choisi : le relief glisse doucement vers sa couleur */
    function tint(){if(tintHex){var c=new THREE.Color(tintHex);tW.copy(baseWire).lerp(c,.32);tL.copy(c);}else{tW.copy(baseWire);tL.copy(baseLine);}
      wireMat.color.lerp(tW,.05);lineMat.color.lerp(tL,.05);}
    function build(closes){
      if(mesh){sc.remove(mesh);mesh.geometry.dispose();}if(line){sc.remove(line);line.geometry.dispose();}
      var mn=Math.min.apply(null,closes),mx=Math.max.apply(null,closes),W=220,D=160,geo=new THREE.PlaneGeometry(W,D,180,80);geo.rotateX(-Math.PI/2);var p=geo.attributes.position;
      for(var i=0;i<p.count;i++){var x=p.getX(i),z=p.getZ(i),k=Math.min(closes.length-1,Math.max(0,Math.round((x+W/2)/W*(closes.length-1))));
        var pr=(closes[k]-mn)/((mx-mn)||1),ridge=Math.exp(-Math.pow((z+20)/22,2)),wave=Math.sin(x*.08+z*.11)*.6+Math.sin(z*.05)*.8;p.setY(i,pr*26*ridge+wave*(1-ridge)*1.4-6);}
      mesh=new THREE.Mesh(geo,wireMat);sc.add(mesh);
      var pts=closes.map(function(c,i){return new THREE.Vector3(-W/2+i/(closes.length-1)*W,(c-mn)/((mx-mn)||1)*26-6+.4,-20);});
      line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),lineMat);sc.add(line);draw();
    }
    /* Particules : poussière lumineuse qui dérive au-dessus du relief */
    var NPt=300,ppos=new Float32Array(NPt*3),pvel=new Float32Array(NPt);
    for(var q=0;q<NPt;q++){ppos[q*3]=(Math.random()-.5)*240;ppos[q*3+1]=Math.random()*46-4;ppos[q*3+2]=-Math.random()*150+30;pvel[q]=.4+Math.random()*1.2;}
    var pgeo=new THREE.BufferGeometry();pgeo.setAttribute("position",new THREE.BufferAttribute(ppos,3));
    var spr=(function(){var c=document.createElement("canvas");c.width=c.height=32;var g=c.getContext("2d"),gr=g.createRadialGradient(16,16,0,16,16,16);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.3,"rgba(255,255,255,.5)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,32,32);return new THREE.CanvasTexture(c);})();
    var pmat=new THREE.PointsMaterial({size:.9,map:spr,transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
    sc.add(new THREE.Points(pgeo,pmat));
    function drift(dt){for(var q=0;q<NPt;q++){var i3=q*3;ppos[i3+1]+=pvel[q]*dt*.9;ppos[i3]+=Math.sin((ppos[i3+1]+q)*.05)*dt*.6;if(ppos[i3+1]>44){ppos[i3+1]=-4;ppos[i3]=(Math.random()-.5)*240;}}pgeo.attributes.position.needsUpdate=true;pmat.color.copy(lineMat.color);}
    function closes(){var d=CK.S.btcD;return d&&d.length>30?d.map(function(x){return x.c;}):null;}
    var tries=0;(function wait(){var c=closes();if(c)build(c);else if(tries++<40)setTimeout(wait,500);else build(Array.from({length:200},function(_,i){return 80000+Math.sin(i/12)*5000+i*20;}));})();
    var mx=0,my=0,last=0,t0=performance.now();addEventListener("pointermove",function(e){mx=e.clientX/innerWidth-.5;my=e.clientY/innerHeight-.5;},{passive:true});
    var lastD=performance.now();function draw(){tint();var nowD=performance.now();drift(Math.min(.1,Math.max(0,(nowD-(lastD||nowD))/1000)));lastD=nowD;var t=(performance.now()-t0)/1000;cam.position.x+=((Math.sin(t*.04)*14+mx*16+yaw)-cam.position.x)*.05;cam.position.z+=((62+zoom)-cam.position.z)*.05;cam.position.y+=((14+Math.sin(t*.06)*2-my*6)-cam.position.y)*.04;cam.lookAt(cam.position.x*.5+yaw*.5,4,-40);r.render(sc,cam);}
    function loop(now){requestAnimationFrame(loop);if(document.hidden||CK.reduce||now-last<(slow?66:33))return;last=now;draw();}
    colors();if(!CK.reduce)requestAnimationFrame(loop);
    addEventListener("resize",function(){cam.aspect=innerWidth/innerHeight;cam.updateProjectionMatrix();r.setSize(innerWidth,innerHeight);draw();});
    CK.bg.theme=colors;CK.bg.rebuild=function(){var c=closes();if(c)build(c);};
  }).catch(function(){});
},theme:function(){},rebuild:function(){}};
})();
