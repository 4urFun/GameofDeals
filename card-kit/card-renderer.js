/* يحوّل بيانات بطاقة إلى HTML: GOD.card(cardObject) */
(function(){
const A=window.GOD_ART;
const P={land:['#f7c60b','#b78500'],util:['#22a55a','#0f6b36'],cash:['#2f6df6','#1a3fa8'],act:['#ee3b3b','#a31616'],def:['#8b5cf6','#5b2bb8'],blk:[],msn:['#14b8a6','#0b6f65']};
const M=s=>s.replace(/(\d+M)/g,'<span class="m">$1</span>');
const art=(a,p)=>`<div class="art">${p?`<div class="k"><span class="m">${p}</span></div>`:''}<svg viewBox="0 0 200 120">${A[a]}</svg></div>`;
const rows=r=>r.map(i=>`<div class="row"><span>${i[2]?`<i class="dot" style="background:${i[2]}"></i>`:''}${i[0]}</span><b class="m">${i[1]}</b></div>`).join('');
function card(c){
 const p=P[c.k]||[],st=p[0]?`--a:${p[0]};--d:${p[1]}`:'';
 let h;
 if(c.k=='dual')h=`<div class="dh">${c.n.map((n,i)=>`<span style="background:${c.c[i]}">${M(n)}</span>`).join('')}</div><div class="bd"><div class="hh">${c.h}</div>${rows(c.r)}</div><div class="ft">${c.s}</div>`;
 else if(c.k=='cash')h=`<div class="big"><div><b class="m">${c.n}</b><br><span>${c.d}</span></div></div><i class="cor" style="top:10px;right:12px">${c.n}</i><i class="cor" style="top:10px;left:12px">${c.n}</i><i class="cor" style="bottom:10px;right:12px">${c.n}</i><i class="cor" style="bottom:10px;left:12px">${c.n}</i>${c.e?'<div class="ft">كاش إضافي</div>':''}`;
 else if(c.r)h=`<div class="hd"><b>${c.n}</b></div>${art(c.a,c.p)}<div class="bd">${rows(c.r)}</div>${c.s?`<div class="ft">${c.s}</div>`:''}`;
 else if(c.k=='blk')h=`<div class="hd"><b>${c.n}</b></div>${art(c.a)}<div class="bd"><div class="t">${c.d}</div></div>`;
 else h=`<div class="hd"><b>${c.n}</b></div>${art(c.a)}${(c.ch||c.chp)?`<div class="chips">${(c.ch||c.chp).map(x=>`<i style="background:${x}"></i>`).join('')}</div>`:''}<div class="bd"><div class="t">${M(c.d)}</div></div>${c.k=='msn'?`<div class="cond">${c.s}</div>`:''}`;
 return `<div class="c ${c.k}" style="${st}${c.g?`;--a:${c.g};--d:color-mix(in srgb,${c.g} 62%,#000)`:c.k=='dual'?`;--a:${c.c[0]};--d:${c.c[1]}`:''}${c.ch?`;--a:${c.ch[0]};--d:${c.ch[1]}`:''}${c.tx?`;--tx:${c.tx}`:''}${c.bg?`;background:${c.bg}`:''}"><div class="in">${h}</div><div class="x">${c.x}x</div></div>`;
}
window.GOD={card,P,M};
})();
