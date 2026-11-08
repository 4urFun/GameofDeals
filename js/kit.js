/* Game of Deals — ربط حزمة تصميم البطاقات (card-kit) باللعبة
   كل بطاقة في اللعبة تُرسم بالعنصر <god-card t="..."> من ملفات card-kit نفسها:
   cards.css (التنسيق) + card-art.js (الرسومات) + card-renderer.js (البناء) + cards-data.js (البيانات).
   البطاقة تُرسم بمقاسها الأصلي 260×364 داخل Shadow DOM (معزولة عن تنسيق الموقع)
   ثم تُصغَّر أو تُكبَّر بالتناسب لتملأ المكان المخصص لها، فيبقى التصميم مطابقاً تماماً. */
(function(){
const KIT={};(window.GOD_CARDS||[]).forEach(c=>{KIT[c.id]=c;});
const MAP=window.GOD_MAP||{};
const ok=!!(window.GOD&&window.GOD.card&&window.GOD_CARDS);
const CSS_URL='card-kit/cards.css?v=5';
const FALLBACK_CSS="/* تنسيق البطاقات (260x364). الخط: Tajawal */\n@import url('fonts.css');\n\n:root{--bg:#e9ebf0;--ink:#14213d;--pn:#fafbfd;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}\n@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#10131c}}\n.c{--a:#f5b700;--d:#8a6100;width:260px;height:364px;border-radius:20px;padding:7px;position:relative;box-sizing:border-box;background:linear-gradient(160deg,var(--a),var(--d));box-shadow:0 8px 20px #0004,inset 0 0 0 2px #ffffff55;color:var(--ink);display:flex;flex-direction:column}\n.in{flex:1;border-radius:14px;background:var(--pn);display:flex;flex-direction:column;overflow:hidden;border:2px solid #ffd96a}\n.hd{background:linear-gradient(180deg,var(--a),var(--d));color:var(--tx,#fff);padding:10px 12px;display:flex;align-items:center;justify-content:center;gap:8px;min-height:58px;text-shadow:0 1px 2px #0006}\n.hd b{flex:1;font-size:23px;line-height:1.2;font-weight:800;text-align:center}\n.k{width:46px;height:46px;border-radius:50%;background:#fff;color:var(--ink);border:3px solid var(--a);display:grid;place-items:center;font-weight:800;font-size:19px;text-shadow:none;position:absolute;top:6px;left:8px;z-index:2}\n.m{direction:ltr;unicode-bidi:isolate;display:inline-block}\n.art{position:relative;height:112px;background:radial-gradient(circle at 50% 55%,#fff 0,color-mix(in srgb,var(--a) 28%,#fff) 100%);display:grid;place-items:center;border-bottom:3px solid var(--a)}\n.art svg{width:92%;height:100%;color:var(--d);filter:drop-shadow(0 3px 3px #0004)}\n.bd{flex:1;padding:10px 14px;display:flex;flex-direction:column;justify-content:center;gap:5px}\n.t{font-size:19px;line-height:1.45;font-weight:500;text-align:center}\n.row{display:flex;justify-content:space-between;font-size:18px;font-weight:800;padding:3px 8px;border-radius:8px;background:#eef0f4}\n.row .m{color:var(--d)}\n.hh{text-align:center;font-weight:800;font-size:17px}\n.ft{font-size:14px;text-align:center;padding:5px;background:color-mix(in srgb,var(--a) 20%,#fff);font-weight:800;margin:0 8px 8px;border-radius:9px}\n.x{position:absolute;bottom:-12px;left:50%;transform:translateX(-50%);background:#14213d;color:#fff;font:800 12px sans-serif;padding:3px 10px;border-radius:99px}\n.cash .in{background:repeating-radial-gradient(circle at 50% 50%,#0000 0 9px,color-mix(in srgb,var(--a) 14%,#0000) 9px 10px),linear-gradient(160deg,#fff,color-mix(in srgb,var(--a) 16%,#fff))}\n.big{flex:1;display:grid;place-content:center;text-align:center}\n.big b{font-size:78px;line-height:1;color:var(--d);font-weight:800;text-shadow:0 3px 0 #fff,0 6px 8px #0003}\n.big span{font-size:24px;font-weight:800;color:var(--d)}\n.cor{position:absolute;font:800 15px sans-serif;color:var(--d)}\n.blk{background:linear-gradient(160deg,#d4af37,#6b5314 50%,#d4af37);--a:#d4af37;--d:#d4af37}\n.blk .in{background:radial-gradient(circle at 50% 35%,#2a2418,#050506 70%);border-color:#b8921f;color:#f6e7b4}\n.blk .hd{background:none;justify-content:center;text-align:center;border-bottom:1px solid #d4af3766}\n.blk .hd b{color:#ffd966;flex:none;letter-spacing:1px;font-size:24px}\n.blk .art{background:radial-gradient(circle,#ff6a0044,#0000 65%);border-color:#d4af37}\n.blk .art svg{color:#ffd966;filter:drop-shadow(0 0 10px #ff8c00)}\n.blk .t{color:#fff;font-size:20px}\n.dh{display:flex}\n.chips{display:flex;height:18px}.chips i{flex:1}\n.msn .art{height:84px}\n.dh span{flex:1;padding:10px 6px;text-align:center;font-weight:800;font-size:16px;color:#fff}\n.dot{display:inline-block;width:12px;height:12px;border-radius:50%;margin-inline-end:6px}\n.msn .hd{justify-content:center}\n.msn .t{font-size:21px;font-weight:800}\n.cond{font-size:14px;margin:0 8px 8px;padding:6px;border:2px dashed var(--a);border-radius:9px;text-align:center;font-weight:500}\n";
const HOST=`:host{all:initial;display:block;position:relative;aspect-ratio:260/364;font-family:Tajawal,"Segoe UI",Tahoma,sans-serif;direction:rtl;-webkit-user-select:none;user-select:none}
.w{position:absolute;top:0;left:0;width:260px;height:364px;transform-origin:0 0;transform:scale(var(--s,0));font-family:Tajawal,"Segoe UI",Tahoma,sans-serif;direction:rtl}
.x{display:none}
.fb{width:100%;height:100%;border-radius:12px;background:#e9ebf0;display:block}`;
// يحوّل cards.css للعمل داخل البطاقة: متغيرات :root تنتقل إلى .w ، و@import (الخط) يُحمَّل من الصفحة نفسها
function prep(css){
  css=css.replace(/@import[^;]+;/g,'');
  const vars=[];
  css=css.replace(/:root\s*\{([^}]*)\}/g,(m,body)=>{body.split(';').forEach(d=>{d=d.trim();if(d.startsWith('--'))vars.push(d);});return '';});
  css=css.replace(/@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[^{}]*\{[^}]*\}\s*\}/g,'');
  return css+`\n.w{${vars.join(';')}}`;
}
const adopt='adoptedStyleSheets' in Document.prototype&&'replaceSync' in CSSStyleSheet.prototype;
let cssText=prep(FALLBACK_CSS);
let kitSheet=null,hostSheet=null;
if(adopt){kitSheet=new CSSStyleSheet();kitSheet.replaceSync(cssText);hostSheet=new CSSStyleSheet();hostSheet.replaceSync(HOST);}
// نقرأ cards.css من المجلد مباشرة، فأي تعديل عليه في GitHub يظهر في اللعبة
if(location.protocol!=='file:')fetch(CSS_URL).then(r=>r.ok?r.text():null).then(t=>{if(!t)return;cssText=prep(t);
  if(adopt)kitSheet.replaceSync(cssText);else document.querySelectorAll('god-card').forEach(e=>e._repaint&&e._repaint(true));}).catch(()=>{});
const cache={};
function cardHTML(kid){if(!(kid in cache))cache[kid]=window.GOD.card(KIT[kid]);return cache[kid];}
function kitId(t){return MAP[t]||(KIT[t]?t:null);}
const RO=typeof ResizeObserver!=='undefined'?new ResizeObserver(es=>{for(const e of es)e.target._fit&&e.target._fit();}):null;
class GodCard extends HTMLElement{
  static get observedAttributes(){return ['t'];}
  connectedCallback(){
    if(!this.shadowRoot){const r=this.attachShadow({mode:'open'});if(adopt)r.adoptedStyleSheets=[kitSheet,hostSheet];}
    this._repaint();if(RO)RO.observe(this);this._fit();
  }
  disconnectedCallback(){if(RO)RO.unobserve(this);}
  attributeChangedCallback(){if(this.shadowRoot)this._repaint();}
  _repaint(force){
    const t=this.getAttribute('t')||'';if(t===this._t&&!force)return;this._t=t;
    const kid=ok?kitId(t):null;
    const st=adopt?'':`<style>${cssText}\n${HOST}</style>`;
    this.shadowRoot.innerHTML=st+(kid?`<div class="w">${cardHTML(kid)}</div>`:`<div class="fb"></div>`);
  }
  _fit(){const w=this.clientWidth;if(w&&w!==this._w){this._w=w;this.style.setProperty('--s',String(w/260));}}
}
if(!customElements.get('god-card'))customElements.define('god-card',GodCard);
window.addEventListener('resize',()=>document.querySelectorAll('god-card').forEach(e=>e._fit()));
window.GOD_KIT={ok,kitId,KIT};
})();
