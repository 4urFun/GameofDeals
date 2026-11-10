// اختبار البوت: (1) مباريات كلها بوتات تنتهي بدون أخطاء  (2) بوت ضد لاعبين عشوائيين: نسبة الفوز
const E=require('../js/engine.js');const B=require('./bot.js')(E);
function randomMove(S,u,rnd){ // نفس منطق tools/sim.js (لاعب عشوائي قانوني)
 const pd=S.pending;
 if(pd){if(pd.stage==='bid'){return {type:'bid',amount:Math.floor(rnd()*3)};}
  switch(pd.stage){case 'respond':return {type:'accept'};case 'counter':return {type:'pass'};case 'pay':return {type:'pay',cards:E.autoPick(S,u,pd.pay.amount)};
   case 'lotpay':return {type:'pay',cards:E.autoPick(S,u,pd.pay.amount).filter(i=>S.P[u].bank.includes(i))};
   case 'choose':return {type:'choose',land:E.looseLands(S.P[pd.queue[0]])[0]};
   case 'retarget':return {type:'retarget',t:S.order.find(x=>x!==pd.from&&!(pd.excl||[]).includes(x))};
   case 'reselect':return {type:'giveup'};}return null;}
 const T=S.turn,p=S.P[T.p];
 if(T.phase==='jail'){for(const t of ['jailPay','jailBroke','jailWait']){const s=JSON.parse(JSON.stringify(S));if(!E.act(s,u,{type:t}))return {type:t};}}
 if(T.phase==='draw')return {type:'draw'};
 if(E.movesLeft(S)<=0||rnd()<0.1)return {type:'end'};
 const ci=p.hand[Math.floor(rnd()*p.hand.length)];if(!ci)return {type:'end'};const c=E.C(ci);
 if(c.t==='money'||c.t==='visa')return {type:'bank',card:ci};if(c.t==='land')return {type:'land',card:ci};
 if(c.t==='dual')return {type:'land',card:ci,color:c.cs[0]};
 const t=S.order.filter(x=>x!==T.p)[0];const o={type:'play',card:ci,t};if(E.needSel(c.a||'')){o.sel=E.selOptions(S,c.a,T.p,t)[0];}return o;}
let rnd=Math.random;
function play(nBots,nRand,games){let errs=0,botWins=0,ends=0,turns=0,stuck=0;
 for(let g=0;g<games;g++){const ids=[];for(let k=0;k<nBots;k++)ids.push('bot'+k);for(let k=0;k<nRand;k++)ids.push('r'+k);
  const S=E.newGame('X',ids[0],ids[0]);for(const u of ids.slice(1))E.act(S,u,{type:'join',name:u});E.act(S,ids[0],{type:'start'});
  let steps=0;
  while(S.status==='playing'&&steps<6000){steps++;
   const isBot=u=>u.startsWith('bot');let u=B.whoNeeds(S,isBot),op=null;
   if(u)op=B.decide(S,u);
   else{const pd=S.pending;if(pd){if(pd.stage==='bid'){u=S.order.find(x=>x!==pd.from&&pd.bids[x]==null);}else u=E.stageActor(S);}else u=S.turn.ctrl;op=randomMove(S,u,rnd);}
   if(!op){stuck++;break;}
   const e=E.act(S,u,op);
   if(e){if(u.startsWith('bot')){errs++;if(errs<6)console.log('BOT ERR',e,JSON.stringify(op).slice(0,160),S.pending&&S.pending.stage);
     // fallback so game continues
     const e2=E.act(S,u,S.pending?({respond:{type:'accept'},counter:{type:'pass'}}[S.pending.stage]||{type:'giveup'}):{type:'end'});if(e2){stuck++;break;}}
    else{const e2=E.act(S,u,S.pending?({respond:{type:'accept'},counter:{type:'pass'}}[S.pending.stage]||{type:'giveup'}):{type:'end'});}}
  }
  if(S.status==='ended'){ends++;turns+=S.tc||0;if(String(S.winner||'').startsWith('bot'))botWins++;}
 }
 return {games,ends,errs,stuck,botWins,avgTurns:Math.round(turns/Math.max(1,ends))};}
console.log('4 bots       ',play(4,0,100));
console.log('6 bots       ',play(6,0,50));
console.log('1 bot vs 3 random',play(1,3,150));
