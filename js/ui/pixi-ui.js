// AntWar PixiJS UI Engine v1.7.0
// Game-facing interface rendered with PixiJS. Legacy DOM remains only as a compatibility bridge for game actions.
import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.14.0/+esm';

const C = Object.freeze({ orange:0xf26b21, orange2:0xff8a3d, cream:0xfff7e8, panel:0xfffdf8, panel2:0xead9c1, ink:0x3b281e, muted:0x7d6758, green:0x35a96b });
const FONT = 'Fredoka, Changa, Arial, sans-serif';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const proxy=id=>document.getElementById(id)?.click();
const style=(size,fill=C.ink,weight='800')=>new PIXI.TextStyle({fontFamily:FONT,fontSize:size,fontWeight:weight,fill,align:'center',resolution:Math.min(devicePixelRatio||1,2)});
function text(parent,label,x,y,size,fill,weight='800'){const t=new PIXI.Text({text:label,style:style(size,fill,weight)});t.anchor.set(.5);t.position.set(x,y);parent.addChild(t);return t;}
function box(w,h,fill,r=16,stroke=null){const g=new PIXI.Graphics();g.roundRect(-w/2,-h/2,w,h,r).fill({color:fill});if(stroke)g.roundRect(-w/2,-h/2,w,h,r).stroke({color:stroke,width:2,alpha:.9});return g;}
function button(label,w,h,click,o={}){const c=new PIXI.Container();c.eventMode='static';c.cursor='pointer';const bg=box(w,h,o.fill??C.panel,o.radius??14,o.stroke??C.panel2);c.addChild(bg);text(c,label,0,0,o.size??14,o.text??C.ink,o.weight??'800');c.on('pointerover',()=>{c.scale.set(1.035);bg.alpha=.94});c.on('pointerout',()=>{c.scale.set(1);bg.alpha=1});c.on('pointerdown',()=>c.scale.set(.97));c.on('pointerup',()=>{c.scale.set(1.035);click?.()});c.on('pointerupoutside',()=>c.scale.set(1));return c;}

class AntWarPixiUI {
  async init(){
    this.app=new PIXI.Application();
    await this.app.init({resizeTo:window,backgroundAlpha:0,antialias:true,autoDensity:true,resolution:Math.min(devicePixelRatio||1,2)});
    this.app.canvas.id='antwar-pixi-ui-canvas';
    Object.assign(this.app.canvas.style,{position:'fixed',inset:'0',width:'100%',height:'100%',zIndex:'140',pointerEvents:'auto',touchAction:'manipulation'});
    document.body.appendChild(this.app.canvas);
    this.root=new PIXI.Container();this.hud=new PIXI.Container();this.modal=new PIXI.Container();this.toasts=new PIXI.Container();
    this.app.stage.addChild(this.root);this.root.addChild(this.hud,this.modal,this.toasts);this.build();this.layout();
    addEventListener('resize',()=>this.layout());addEventListener('keydown',e=>e.key==='Escape'&&this.close());
    this.hideLegacy();window.AntWarPixiUI=this;
  }
  hideLegacy(){const s=document.createElement('style');s.id='antwar-pixi-shell';s.textContent='#main-app-container{visibility:hidden!important;pointer-events:none!important}#modal-root{visibility:hidden!important;pointer-events:none!important}#loading-screen{z-index:1!important}body{overflow:hidden!important}';document.head.appendChild(s);}
  build(){
    const glow=new PIXI.Graphics();glow.circle(0,0,190).fill({color:C.orange,alpha:.055});this.root.addChild(glow);this.glow=glow;
    const top=new PIXI.Container();this.hud.addChild(top);this.top=top;
    const p=box(300,68,C.panel,20,C.orange);top.addChild(p);const a=box(48,48,C.orange,16);a.position.set(-114,0);top.addChild(a);text(top,'🐜',-114,0,23,C.cream);text(top,'Ant Commander',-20,-11,15,C.ink,'900');text(top,'LEVEL 18',-20,12,10,C.orange,'900');
    const xp=box(160,8,C.panel2,4);xp.position.set(45,19);top.addChild(xp);const xf=box(112,6,C.orange,3);xf.position.set(21,19);top.addChild(xf);
    const gold=text(top,'🪙 12,450',115,-9,12,C.ink,'900');const gems=text(top,'◆ 350',115,13,11,C.orange,'900');this.gold=gold;this.gems=gems;
    const settings=button('⚙',50,50,()=>this.open('settings'),{fill:C.orange,text:C.cream,radius:17,size:23,stroke:C.orange2});settings.position.set(180,0);top.addChild(settings);

    const center=new PIXI.Container();this.hud.addChild(center);this.center=center;const panel=box(390,292,C.cream,34,C.orange);panel.alpha=.97;center.addChild(panel);const em=box(100,100,C.orange,30);em.position.set(0,-62);center.addChild(em);text(center,'🐜',0,-63,52,C.cream);text(center,'ANTWAR',0,20,30,C.orange,'900');text(center,'BATTLE COLONY',0,48,10,C.muted,'900');
    const play=button('PLAY',245,58,()=>proxy('play-action-btn'),{fill:C.orange,text:C.cream,radius:18,size:25,stroke:C.orange2});play.position.set(0,91);center.addChild(play);
    const create=button('CREATE ROOM',175,42,()=>proxy('create-room-action-btn'),{fill:C.panel,text:C.orange,radius:14,size:13,stroke:C.orange});create.position.set(0,145);center.addChild(create);

    const dock=new PIXI.Container();this.hud.addChild(dock);this.dock=dock;[['🎒','INVENTORY','wardrobe-nav-btn'],['🏆','RANK','rank-nav-btn'],['🛒','SHOP','shop-nav-btn'],['🎁','GIFTS','gifts-nav-btn'],['📜','TASKS','tasks-nav-btn'],['👑','PASS','royal-pass-nav-btn']].forEach((x,i)=>{const b=button(`${x[0]}\n${x[1]}`,86,64,()=>proxy(x[2]),{fill:C.panel,text:C.ink,radius:16,size:11,stroke:C.panel2});dock.addChild(b);b.position.set(i%3*94,Math.floor(i/3)*73)});
    const bottom=new PIXI.Container();this.hud.addChild(bottom);this.bottom=bottom;[['💬  CHAT','chat-toggle-btn'],['👥  FRIENDS','friends-nav-btn'],['📨  MAIL','mail-nav-btn']].forEach(x=>bottom.addChild(button(x[0],112,44,()=>proxy(x[1]),{fill:C.panel,text:C.ink,radius:14,size:11,stroke:C.panel2})));text(bottom,'PIXIJS GAME UI',0,32,8,C.muted,'900');
    this.backdrop=new PIXI.Graphics();this.backdrop.eventMode='static';this.backdrop.on('pointerdown',()=>this.close());this.backdrop.visible=false;this.modal.addChild(this.backdrop);this.window=new PIXI.Container();this.window.visible=false;this.modal.addChild(this.window);
  }
  open(type){this.window.removeChildren();this.backdrop.visible=true;this.window.visible=true;const W=clamp(innerWidth*.86,320,760),H=clamp(innerHeight*.72,330,600),cx=innerWidth/2,cy=innerHeight/2;const p=box(W,H,C.panel,28,C.orange);p.position.set(cx,cy);this.window.addChild(p);text(this.window,type==='settings'?'SETTINGS & CONTROLS':type.toUpperCase(),cx,cy-H/2+40,21,C.orange,'900');const close=button('×',42,42,()=>this.close(),{fill:C.orange,text:C.cream,radius:14,size:24,stroke:C.orange2});close.position.set(cx+W/2-38,cy-H/2+38);this.window.addChild(close);
    if(type==='settings'){['🔊 AUDIO','🎮 GAMEPLAY','⚡ PERFORMANCE','🌐 LANGUAGE'].forEach((l,i)=>{const b=button(l,Math.min(290,W*.72),48,()=>this.toast(l+' selected'),{fill:i===0?C.orange:C.cream,text:i===0?C.cream:C.ink,radius:14,size:13,stroke:C.panel2});b.position.set(cx,cy-H/2+112+i*58);this.window.addChild(b)});text(this.window,'Responsive 2D interface • PixiJS rendering',cx,cy+H/2-38,10,C.muted,'700');}
    else {text(this.window,'MODULE READY',cx,cy-28,18,C.ink,'900');text(this.window,`PixiJS ${type} interface`,cx,cy+5,13,C.muted);}
  }
  close(){this.backdrop.visible=false;this.window.visible=false;this.window.removeChildren();}
  toast(msg){const b=box(250,46,C.orange,15,C.orange2);b.position.set(innerWidth/2,innerHeight-90);text(b,msg,0,0,11,C.cream,'900');this.toasts.addChild(b);setTimeout(()=>b.destroy(),1800);}
  layout(){if(!this.app)return;const W=innerWidth,H=innerHeight;this.top.position.set(18,20);this.top.scale.set(clamp(Math.min(W/1050,1),.72,1));this.center.position.set(W/2,H/2+10);this.center.scale.set(clamp(Math.min(W/700,H/650,1),.72,1));this.dock.position.set(W-290,22);this.bottom.position.set(W/2-168,H-58);this.glow.position.set(W*.52,H*.45);this.backdrop.clear().rect(0,0,W,H).fill({color:0x2a1b12,alpha:.58});}
}
new AntWarPixiUI().init().catch(e=>console.error('[AntWar Pixi UI]',e));
