/* Game of Deals — البوت (لاعب آلي يفهم القواعد)
   يشتغل عند المضيف فقط: يقرأ حالة اللعبة ويقترح حركة قانونية واحدة في كل مرة.
   كل حركة يتم التحقق منها على نسخة من الحالة قبل اعتمادها (ما يقدر البوت يغش أو يكسر القواعد).
   الاستراتيجية: ينزّل الأراضي ويكمّل المجموعات، يحتفظ ببنك يحميه، يهاجم المتصدّر،
   يدافع بكروت الرد عن الهجمات الكبيرة، ويدفع بأقل فئات ممكنة. */
(function(root){
function makeBot(E){
 const RESP=['takhsi','gameover','playaway','taateel','layikthar','nothing','haza','bordga','right','left','aks','asfeq','shofghairi','loading','jibha','payforme','change'];
 const REDIRECT=['left','right','shofghairi','asfeq','aks','payforme'];
 // ترتيب استخدام كروت الرد: الأرخص أولاً، ونحتفظ بالأقوى
 const RESP_ORDER=['layikthar','nothing','haza','jibha','payforme','shofghairi','left','right','asfeq','aks','loading','bordga','playaway','taateel','gameover','takhsi'];
 const VAL={stealset:200,moab:150,nuke:150,hacker:140,royal:150,sader:140,confiscate:120,swapset:110,boom:100,auction:90,
  stealland:85,atni:80,getjoker:70,takecard:60,jail:55,darb:50,
  rent:70,rentwild:75,rentgold:75,cash:55,tax:60,pay5:65,bank:70,theeb:60,dabatni:60,spit:60,eslahat:45,rusoom:45,
  draw2:65,again:95,fast:60,moves2:60,luck:40,box:40,newhand:0,
  nap:35,estiqaad:30,tactic:35,mazharia:30,slow:25,emp:30,yaweel:30,kharab:30,peek:15,swaphand:15,ebla:25,give:0,barrier:30,reverse:10,copy:0,burn:0};
 const clone=o=>JSON.parse(JSON.stringify(o));
 const ok=(S,u,op)=>{const s=clone(S);return !E.act(s,u,op);};
 const opps=(S,me)=>S.order.filter(x=>x!==me);
 function strength(S,u){const p=S.P[u];return E.score(p)*60+E.bankMoney(p)+p.lands.length*4;}
 function leaders(S,me,excl){return opps(S,me).filter(x=>!(excl||[]).includes(x)).sort((a,b)=>strength(S,b)-strength(S,a));}
 function myCount(S,me,c){return S.P[me].lands.filter(l=>l.c===c).length;}
 function landScore(S,me,c){const si=E.setInfo(S.P[me]);const o=si[c];const size=(E.COLORS[c]&&E.COLORS[c].size)||3;const have=o?o.loose.length:0;const after=have+1;return 50+25*after/size+(after>=size?90:0);}
 function cardWorth(i){const c=E.C(i);return c.v||0;}

 // ---------- الدور
 function turnOp(S,me){const T=S.turn;const p=S.P[me];
  if(T.phase==='jail'){for(const t of ['jailPay','jailBroke','jailWait'])if(ok(S,me,{type:t}))return {type:t};return null;}
  if(T.phase==='draw')return {type:'draw'};
  if(E.movesLeft(S)<=0)return {type:'end'};
  const cands=[];const bank=E.bankMoney(p);
  const add=(score,op)=>cands.push({score,op});
  for(const ci of p.hand){const c=E.C(ci);
   if(c.t==='money')add(bank<6?48:bank<12?32:20,{type:'bank',card:ci});
   else if(c.t==='visa')add(40,{type:'bank',card:ci});
   else if(c.t==='land')add(landScore(S,me,c.c),{type:'land',card:ci});
   else if(c.t==='dual'){const best=c.cs.slice().sort((a,b)=>landScore(S,me,b)-landScore(S,me,a));for(const col of best)add(landScore(S,me,col)-2,{type:'land',card:ci,color:col});}
   else if(c.t==='joker'){const cols=Object.keys(E.setInfo(p)).filter(x=>!E.completeColors(p).includes(x)).sort((a,b)=>landScore(S,me,b)-landScore(S,me,a));for(const col of cols)add(landScore(S,me,col)-5,{type:'land',card:ci,color:col});}
   else if(c.t==='build'){for(const col of E.completeColors(p))add(45,{type:'build',card:ci,color:col});}
   else if(c.t==='rent'){const n=opps(S,me).length;for(const col of c.cs){if(!E.setInfo(p)[col])continue;const amt=E.rentOf(p,col)*n;const o={type:'play',card:ci,color:col};add(25+amt*8,o);const m=p.hand.find(x=>['double','triple'].includes(E.C(x).a));if(m&&E.movesLeft(S)>=2)add(30+amt*14,Object.assign({mult:m},o));}}
   else if(c.a){actionCands(S,me,ci,c,add);}
  }
  cands.sort((a,b)=>b.score-a.score);
  for(const k of cands){if(k.score<12)break;if(ok(S,me,k.op))return k.op;}
  return {type:'end'};}

 function actionCands(S,me,ci,c,add){const p=S.P[me];let a=c.a;
  if(RESP.includes(a)||a==='double'||a==='triple')return; // كروت الرد نحتفظ فيها
  const base=VAL[a]!=null?VAL[a]:20;if(base<=0)return;
  if(a==='royal'){for(const as of ['stealset','moab','rent','draw2','nap'])for(const t of leaders(S,me)){const o={type:'play',card:ci,t,as};if(as==='rent'){const col=Object.keys(E.setInfo(p)).sort((x,y)=>E.rentOf(p,y)-E.rentOf(p,x))[0];if(!col)continue;o.color=col;}if(E.needSel(as)){const s=bestSel(S,as,me,t);if(s==null)continue;o.sel=s;}add((VAL[as]||40)+5,o);}return;}
  const ls=leaders(S,me);
  if(E.GROUP.includes(a)){const o={type:'play',card:ci};if(E.needSel(a)){o.sel={};for(const x of opps(S,me)){const s=bestSel(S,a,me,x);if(s!=null)o.sel[x]=s;}if(!Object.keys(o.sel).length)return;}
   if(a==='rentgold'){const mine=p.lands.slice().sort((x,y)=>E.rentOf(p,y.c)-E.rentOf(p,x.c));if(!mine.length)return;o.land=mine[0].i;}
   add(base,o);const m=p.hand.find(x=>['double','triple'].includes(E.C(x).a));if(m&&E.MULTABLE.includes(a)&&E.movesLeft(S)>=2)add(base+20,Object.assign({mult:m},o));return;}
  for(const t of ls){const o={type:'play',card:ci,t};
   if(E.needSel(a)){const s=bestSel(S,a,me,t);if(s==null)continue;o.sel=s;if(a==='swapset'){o.mine=E.completeColors(p).find(x=>!E.fenced(p,x));if(!o.mine)continue;}if(a==='atni'){const mine=E.looseLands(p).sort((x,y)=>myCount(S,me,E.C(x).c||'')-myCount(S,me,E.C(y).c||''))[0];if(!mine)continue;o.mine=mine;}}
   if(a==='rentwild'){const col=Object.keys(E.setInfo(p)).sort((x,y)=>E.rentOf(p,y)-E.rentOf(p,x))[0];if(!col)return;o.color=col;}
   if(a==='give'){const g=p.hand.filter(x=>x!==ci).sort((x,y)=>cardWorth(x)-cardWorth(y))[0];if(!g)return;o.give=g;}
   const lead=t===ls[0]?8:0;add(base+lead,o);
   if(E.MULTABLE.includes(a)&&E.movesLeft(S)>=2){const m=p.hand.find(x=>['double','triple'].includes(E.C(x).a));if(m)add(base+lead+15,Object.assign({mult:m},o));}
   if(!['stealland','stealset','atni','sader','confiscate'].includes(a))break;}
 }
 // أفضل اختيار: الأرض اللي تكمّل مجموعاتي، أو المجموعة الأغلى
 function bestSel(S,a,me,t){const opts=E.selOptions(S,a,me,t)||[];if(!opts.length)return null;
  const val=x=>{if(typeof x==='string'&&E.COLORS[x])return (E.COLORS[x].rent||[0]).slice(-1)[0]*3+myCount(S,me,x)*5;const c=E.C(x);return (c&&c.c?myCount(S,me,c.c)*10:0)+(c&&c.v||0);};
  return opts.slice().sort((x,y)=>val(y)-val(x))[0];}

 // ---------- الردود والمراحل المعلّقة
 function severity(S,pd,me){if(pd.black)return 200;const a=pd.a;if(['rent','rentwild','rentgold','cash','tax','pay5','spit','eslahat','rusoom'].includes(a)){let amt=0;try{amt=(E.payAmountOf?E.payAmountOf(S,pd,me):0);}catch(e){}if(!amt){const m=pd.mult||1;amt=a==='cash'?2:a==='tax'?3*m:a==='pay5'?5:a==='spit'?13*m:4*m;}return amt*14;}
  return VAL[a]!=null?VAL[a]:30;}
 function pendingOp(S,me){const pd=S.pending;const p=S.P[me];
  if(pd.stage==='bid'){if(me===pd.from||pd.bids[me]!=null)return null;const lot=pd.lots[pd.lot];const c=E.C(lot.i);const bank=E.bankMoney(p);const want=myCount(S,me,lot.c)>0?Math.min((c.v||1)+1,Math.floor(bank*0.6)):Math.min(c.v||1,Math.floor(bank*0.3));return {type:'bid',amount:Math.max(0,want)};}
  const actor=E.stageActor(S);if(actor!==me)return null;
  switch(pd.stage){
   case 'respond':{const sev=severity(S,pd,me);
    if(sev>=50){const mine=p.hand.filter(i=>E.C(i).a&&E.respOK(S,pd,me,E.C(i).a)).sort((x,y)=>RESP_ORDER.indexOf(E.C(x).a)-RESP_ORDER.indexOf(E.C(y).a));
     for(const ci of mine){const a=E.C(ci).a;const op={type:'respond',card:ci};if(REDIRECT.includes(a)){const to=leaders(S,me,[pd.from,pd.benef]).find(x=>ok(S,me,Object.assign({to:x},op)));if(!to)continue;op.to=to;}if(ok(S,me,op))return op;}}
    return {type:'accept'};}
   case 'counter':{const t=p.hand.find(i=>E.C(i).a==='takhsi');if(t&&severity(S,pd,me)>=100){const op={type:'respond',card:t};if(ok(S,me,op))return op;}return {type:'pass'};}
   case 'pay':return {type:'pay',cards:E.autoPick(S,me,pd.pay.amount)};
   case 'lotpay':return {type:'pay',cards:E.autoPick(S,me,pd.pay.amount).filter(i=>p.bank.includes(i))};
   case 'choose':{const l=E.looseLands(p).sort((x,y)=>(myCount(S,me,E.C(x).c||'')*10+cardWorth(x))-(myCount(S,me,E.C(y).c||'')*10+cardWorth(y)))[0];return {type:'choose',land:l};}
   case 'retarget':{const t=leaders(S,me,[pd.from].concat(pd.excl||[])).find(x=>ok(S,me,{type:'retarget',t:x}));return t?{type:'retarget',t}:{type:'giveup'};}
   case 'reselect':{const t=pd.queue[0];const s=bestSel(S,pd.a,pd.from,t);const op={type:'reselect',sel:s,mine:pd.a==='swapset'?E.completeColors(p).find(x=>!E.fenced(p,x)):pd.a==='atni'?E.looseLands(p)[0]:undefined};return ok(S,me,op)?op:{type:'giveup'};}
  }
  return null;}

 // الحركة التالية لهذا البوت (أو null إذا ما عليه شي)
 function decide(S,me){if(!S||S.status!=='playing')return null;
  if(S.pending)return pendingOp(S,me);
  if(S.turn&&S.turn.ctrl===me)return turnOp(S,me);
  return null;}
 // أي بوت (أو لاعب مسلّم للبوت) عليه الدور الحين؟
 function whoNeeds(S,isBot){if(!S||S.status!=='playing')return null;const pd=S.pending;
  if(pd){if(pd.stage==='bid'){for(const u of S.order)if(u!==pd.from&&pd.bids[u]==null&&isBot(u))return u;return null;}const a=E.stageActor(S);return a&&isBot(a)?a:null;}
  return S.turn&&isBot(S.turn.ctrl)?S.turn.ctrl:null;}
 return {decide,whoNeeds};
}
if(typeof module!=='undefined'&&module.exports)module.exports=makeBot;else root.makeBot=makeBot;
})(typeof window!=='undefined'?window:this);
