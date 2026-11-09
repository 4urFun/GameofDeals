/* ===== يد الجوال: شريط أفقي بالسحب + ترتيب حسب النوع + «كل أوراقي» (للشاشات أصغر من 700px فقط) ===== */
(function(){
const mob=()=>matchMedia('(max-width:700px)').matches;
const GROUPS=[['الفلوس',['money','visa']],['الأراضي والمباني',['land','dual','joker','build']],['الإيجارات',['rent']],['الأوامر والردود',['act','def','action','resp']],['السوداء',['black','blk']]];
const gIdx=id=>{const c=E.C(id);let t=c.t;if(t==='action'&&c.black)t='black';for(let k=0;k<GROUPS.length;k++)if(GROUPS[k][1].includes(t))return k;return 3;};
const _lh=layoutHand;
layoutHand=function(){const box=$('#hand');if(!box)return;
  if(!mob()){box.classList.remove('strip');const bar=$('#handbar');if(bar)bar.remove();return _lh();}
  box.classList.add('strip');box.style.height='';
  const cards=[...box.querySelectorAll('.hc')];
  cards.sort((a,b)=>gIdx(a.dataset.hc)-gIdx(b.dataset.hc));
  box.querySelectorAll('.gsep').forEach(x=>x.remove());
  let prev=null;cards.forEach(c=>{c.style.cssText='';const g=gIdx(c.dataset.hc);if(prev!==null&&g!==prev){const s=document.createElement('i');s.className='gsep';box.appendChild(s);}box.appendChild(c);prev=g;});
  if(!$('#handbar')){const bar=document.createElement('div');bar.className='handbar';bar.id='handbar';box.parentNode.insertBefore(bar,box);}
  $('#handbar').innerHTML=`<span class="cnt">أوراقك ${cards.length} <span>• اسحب يمين ويسار</span></span>${cards.length?'<button class="all" id="showall">كل أوراقي</button>':''}`;
  const sa=$('#showall');if(sa)sa.onclick=showAll;
  if(box.dataset.n!==String(cards.length)){box.dataset.n=cards.length;box.scrollLeft=0;}
};
function showAll(){const hand=(G.P[uid]||{}).hand||[];const sorted=hand.slice().sort((a,b)=>gIdx(a)-gIdx(b));let html=`<h3>كل أوراقي (${hand.length})</h3><div class="muted">اضغط على أي ورقة لتشوفها أو تلعبها</div><div class="handgrid">`;let prev=null;
  for(const i of sorted){const g=gIdx(i);if(g!==prev){html+=`<div class="gh">${GROUPS[g][0]}</div>`;prev=g;}html+=`<button data-gi="${esc(i)}">${kimg(img(i),` alt="${esc(E.C(i).n)}"`)}</button>`;}
  html+=`</div><div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" data-v="x">إغلاق</button></div>`;
  sheet(html,d=>{d.querySelectorAll('[data-gi]').forEach(b=>b.onclick=()=>{closeSheet();cardModal(b.dataset.gi,'hand');});const x=d.querySelector('[data-v=x]');if(x)x.onclick=()=>closeSheet();});}
})();
