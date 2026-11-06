const E=require('./engine.js');
let games=0,errs=0,wins=0,turnsTot=0;
function clone(o){return JSON.parse(JSON.stringify(o));}
for(let g=0;g<300;g++){
 const ids=['A','B','C','D'].slice(0,2+(g%3));
 let S=E.newGame('X',ids[0],'p'+ids[0]);
 for(const u of ids.slice(1))E.act(S,u,{type:'join',name:'p'+u});
 if(E.act(S,ids[0],{type:'start'}))throw 'start';
 let steps=0;const rnd=Math.random;
 while(S.status==='playing'&&steps<4000){steps++;
  const pd=S.pending;let ok=false;
  try{
  if(pd){
   if(pd.stage==='bid'){for(const u of ids)if(u!==pd.from&&pd.bids[u]==null){E.act(S,u,{type:'bid',amount:Math.floor(rnd()*3)});}continue;}
   const a=E.stageActor(S);const P=S.P[a];
   // maybe respond
   const resp=P.hand.filter(i=>E.C(i).a&&E.respOK(S,pd,a,E.C(i).a));
   if(resp.length&&rnd()<0.5){const ci=resp[0];const to=ids.find(x=>x!==pd.from&&x!==a&&x!==pd.benef);const e=E.act(S,a,{type:'respond',card:ci,to});if(!e)continue;}
   let e;
   switch(pd.stage){case 'respond':e=E.act(S,a,{type:'accept'});break;case 'counter':e=E.act(S,a,{type:'pass'});break;
    case 'pay':e=E.act(S,a,{type:'pay',cards:E.autoPick(S,a,pd.pay.amount),change:rnd()<.5});break;
    case 'choose':e=E.act(S,a,{type:'choose',land:E.looseLands(S.P[pd.queue[0]])[0]});break;
    case 'retarget':{const x=ids.find(x=>x!==pd.from&&!(pd.excl||[]).includes(x));e=E.act(S,a,{type:'retarget',t:x});break;}
    case 'reselect':{const t=pd.queue[0];const o=E.selOptions(S,pd.a,pd.from,t);e=E.act(S,a,{type:'reselect',sel:o[0],mine:pd.a==='swapset'?E.completeColors(S.P[pd.from])[0]:pd.a==='atni'?E.looseLands(S.P[pd.from])[0]:undefined});if(e)e=E.act(S,a,{type:'giveup'});break;}
   }
   if(e){throw new Error('stuck pending '+pd.stage+' '+pd.a+' '+e);}
   continue;}
  const T=S.turn,u=T.ctrl,me=T.p,p=S.P[me];
  if(T.phase==='jail'){let e=E.act(S,u,{type:'jailPay'});if(e)e=E.act(S,u,{type:'jailBroke'});if(e)e=E.act(S,u,{type:'jailWait'});if(e)throw new Error('jail '+e);continue;}
  if(T.phase==='draw'){const e=E.act(S,u,{type:'draw'});if(e)throw new Error('draw '+e);continue;}
  if(E.movesLeft(S)<=0||rnd()<0.08){E.act(S,u,{type:'end'});continue;}
  const ci=p.hand[Math.floor(rnd()*p.hand.length)];if(!ci){E.act(S,u,{type:'end'});continue;}
  const c=E.C(ci);const opp=S.order.filter(x=>x!==me);const t=opp[Math.floor(rnd()*opp.length)];
  let op;
  if(c.t==='money'||c.t==='visa')op={type:'bank',card:ci};
  else if(c.t==='land')op={type:'land',card:ci};
  else if(c.t==='dual')op={type:'land',card:ci,color:c.cs[Math.floor(rnd()*2)]};
  else if(c.t==='joker'){const cc=Object.keys(p.lands.reduce((m,l)=>(m[l.c]=1,m),{}));op={type:'land',card:ci,color:cc[0]||'lb'};}
  else if(c.t==='build')op={type:'build',card:ci,color:E.completeColors(p)[0]};
  else if(c.t==='rent')op={type:'play',card:ci,color:c.cs.find(x=>E.setInfo(p)[x])};
  else{let a=c.a;const o={type:'play',card:ci,t};if(a==='royal'){const list=['nap','stealset','rent','draw2','moab'];a=list[Math.floor(rnd()*list.length)];o.as=a;if(a==='rent')o.color=Object.keys(E.setInfo(p))[0];}
   if(a==='burn'){op={type:'burn',card:ci,other:p.hand.find(x=>x!==ci)};}
   else{const k=E.needSel(a);if(k){if(E.GROUP.includes(a)){o.sel={};for(const x of opp){const s=E.selOptions(S,a,me,x);if(s.length)o.sel[x]=s[0];}if(a==='auction'){const ks=Object.keys(o.sel).slice(0,3);const ss={};ks.forEach(x=>ss[x]=o.sel[x]);o.sel=ss;}}else{o.sel=E.selOptions(S,a,me,t)[0];if(a==='swapset')o.mine=E.completeColors(p).find(x=>!E.fenced(p,x));if(a==='atni')o.mine=E.looseLands(p)[0];}}
    if(a==='rentwild')o.color=Object.keys(E.setInfo(p))[0];if(a==='rentgold'){const all=Object.values(S.P).flatMap(q=>q.lands);if(all.length)o.land=all[0].i;}
    if(a==='give')o.give=p.hand.find(x=>x!==ci);
    if(E.MULTABLE.includes(a)&&rnd()<.5){const m=p.hand.find(x=>['double','triple'].includes(E.C(x).a));if(m)o.mult=m;}
    op=o;}}
  const before=JSON.stringify(S);const e=E.act(S,u,op);
  if(e){const after=JSON.stringify(S);if(after!==before)throw new Error('mutated on error: '+e+' '+JSON.stringify(op));
   // dump useless card occasionally
   if(rnd()<0.3)E.act(S,u,{type:'end'});}
  // invariants
  const all=[...S.deck,...S.discard];for(const q of Object.values(S.P)){all.push(...q.hand,...q.bank,...q.lands.map(l=>l.i));for(const c in q.bld)all.push(...q.bld[c]);}
  if(S.pending&&S.pending.lots)all.push(...S.pending.lots.map(l=>l.i));
  for(const d of S.deferred)if(d.lots)all.push(...d.lots.map(l=>l.i));
  const set=new Set(all);if(set.size!==all.length){throw new Error('dup card '+(all.length-set.size));}
  if(all.length!==S._n&&S._n){throw new Error('card count changed '+S._n+'->'+all.length+' op '+JSON.stringify(op));}S._n=all.length;
  }catch(ex){errs++;if(errs<6)console.log('ERR g',g,ex.message);break;}
 }
 games++;if(S.status==='ended')wins++;turnsTot+=S.tc;
}
console.log({games,errs,wins,avgTurns:turnsTot/games});
