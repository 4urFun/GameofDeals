/* Game of Deals — الواجهة */
const E=ENGINE;const {CARDS,COLORS}=E;
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=iid=>'img/'+E.T(iid)+'.jpg';
// البطاقات تُرسم من حزمة التصميم card-kit عبر العنصر <god-card>
function kimg(src,attrs){attrs=attrs||'';const m=/^img\/(.+)\.jpg$/.exec(src||'');if(!m)return `<img src="${src}"${attrs}>`;attrs=attrs.replace(/\s(loading|draggable)="[^"]*"/g,'').replace(/\salt="/g,' aria-label="');return `<god-card t="${m[1]}" role="img"${attrs}></god-card>`;}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LS={get(k,d){try{const v=localStorage.getItem('god_'+k);return v==null?d:JSON.parse(v);}catch(e){return d;}},set(k,v){try{if(v==null)localStorage.removeItem('god_'+k);else localStorage.setItem('god_'+k,JSON.stringify(v));}catch(e){}}};
const AVC=['#d9b25f','#8ec9de','#e59a52','#6cc095','#dd8aa0','#b4a3e6'];
let uid=null,owner=false;
let view='home',code=null,G=null,online=new Set(),CFG={cards:{},rules:{}};
let lastPendKey='',prevLogLen=0,busy=false,chatMsgs=[],chatSeen=0,sideTab='log',lastTurnKey='',clockSkew=0;
const ORIG={};for(const id in CARDS)ORIG[id]={n:CARDS[id].n,d:CARDS[id].d,v:CARDS[id].v,cnt:CARDS[id].cnt};
const nowH=()=>Date.now()+clockSkew; // host clock
function toast(m,k){const box=$('#toasts');while(box.children.length>1)box.firstChild.remove();const t=document.createElement('div');t.className='toast '+(k||'');t.setAttribute('role','status');t.textContent=m;box.appendChild(t);setTimeout(()=>t.remove(),k==='err'?3800:2400);}

// ---------- الاتصال (PeerJS): جهاز المضيف يدير المباراة ويحفظ حالتها كاملة
const PFX='gameofdeals5-';
let peer=null,isHost=false,hostConn=null,conns={},hostOK=false,retryT=null,pend={},opSeq=0;
uid=LS.get('uid',null);if(!uid){uid='p'+Math.random().toString(36).slice(2,11)+Math.random().toString(36).slice(2,6);LS.set('uid',uid);}
CFG=LS.get('cfg',{cards:{},rules:{}});
function applyCfg(){for(const id in CARDS){const o=(CFG.cards||{})[id]||{};const b=ORIG[id];CARDS[id].n=o.n||b.n;CARDS[id].d=o.d!=null&&o.d!==''?o.d:b.d;CARDS[id].v=o.v!=null&&o.v!==''?+o.v:b.v;CARDS[id].cnt=o.cnt!=null&&o.cnt!==''?+o.cnt:b.cnt;}}
function netReady(){if(NET.mode==='fb')return true;if(!window.Peer){toast('تعذّر تحميل مكتبة الاتصال. تأكد من الإنترنت وحدّث الصفحة.','err');return false;}return true;}
function genCode(){const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';const r=crypto.getRandomValues(new Uint8Array(5));for(let k=0;k<5;k++)s+=a[r[k]%a.length];return s;}
// ما يُسمح لكل لاعب برؤيته: بطاقاته فقط
function viewFor(S,u){if(!S.P)return S;const V=JSON.parse(JSON.stringify(S));const rv=S.reveal&&S.reveal[u]&&S.reveal[u].until===S.tc;
 for(const p in V.P){const seeHand=p===u||(S.turn&&S.turn.ctrl===u&&S.turn.p===p)||(rv&&S.reveal[u].hand===p)||(S.P[p].st.open>S.tc);if(!seeHand)V.P[p].hand=V.P[p].hand.map(()=>'x');
  if(p!==u&&!(rv&&S.reveal[u].miss))V.P[p].miss=V.P[p].miss.map(m=>m.done?m:{i:'x',done:false});}
 V.deck=V.deck.map(()=>'x');V.mdeck=V.mdeck.map(()=>'x');V.seed=0;V.reveal={};if(rv)V.reveal[u]=S.reveal[u];
 if(V.deferred)V.deferred=V.deferred.map(d=>({label:d.label,queue:d.queue}));return V;}
function broadcast(){if(!isHost||!G)return;LS.set('host_'+code,G);const hn=Date.now();for(const u in conns){const c=conns[u];if(c.open)try{c.send({t:'state',s:viewFor(G,u),online:[...online],hn});}catch(e){}}}
function setOnline(){online=new Set([uid,...Object.keys(conns).filter(u=>conns[u].open)]);}
function hostApply(u,op){const S=JSON.parse(JSON.stringify(G));const err=E.act(S,u,op);if(err)return err;S.v=(S.v||0)+1;S.upd=Date.now();const old=G;G=S;broadcast();onGame(old,G);return null;}
function sysChat(m){chatMsgs.push({n:'🔔',x:m,t:Date.now()});chatMsgs=chatMsgs.slice(-80);relayChat();}
function relayChat(){if(isHost){LS.set('chat_'+code,chatMsgs);for(const u in conns)if(conns[u].open)try{conns[u].send({t:'chat',m:chatMsgs});}catch(e){}}renderSide();}
// ---------- طبقة النقل: Firebase Realtime Database (إذا مفعّل) أو اتصال مباشر PeerJS
const NET={mode:'peer'};
function emitter(o){o=o||{};o.h={};o.on=(e,f)=>{(o.h[e]=o.h[e]||[]).push(f);};o._emit=(e,...a)=>{(o.h[e]||[]).forEach(f=>{try{f(...a);}catch(x){console.error(x);}});};return o;}
let lastJoinGone=false,fbConns={},fbHostOff=null,fbGuestOff=null;
const fbRoom=c=>FB.db.ref('rooms/'+c);
const pack=m=>JSON.stringify(m);
// المضيف: كل لاعب له «صندوق وارد» خاص (down) و«نسخة عرض» خاصة (view) لا يقرأها غيره
function fbHostConn(c,g){if(fbConns[g])return fbConns[g];const r=fbRoom(c);const conn=emitter({authUid:g,open:true});
 conn.send=m=>{const p=m&&m.t==='state'?r.child('view/'+g).set({j:pack(m)}):r.child('down/'+g).push({j:pack(m)});p.catch(e=>console.warn('send',e));};
 conn.close=()=>{if(!conn.open)return;conn.open=false;delete fbConns[g];r.child('conn/'+g).remove().catch(()=>{});conn._emit('close');};
 fbConns[g]=conn;wireHostConn(conn);return conn;}
async function fbHostOpen(c){const r=fbRoom(c);
 try{await r.child('host').set(uid);}catch(e){return 'taken';}
 try{await r.child('created').set(firebase.database.ServerValue.TIMESTAMP);}catch(e){}
 const alive=r.child('alive');const info=FB.db.ref('.info/connected');
 const onInfo=s=>{if(s.val()){alive.onDisconnect().remove();alive.set(true).catch(()=>{});}};info.on('value',onInfo);
 fbHostOff=()=>{info.off('value',onInfo);alive.onDisconnect().cancel().catch(()=>{});};return null;}
// يبدأ استقبال رسائل اللاعبين بعد ما تجهز حالة الغرفة عند المضيف
function fbHostListen(c){const r=fbRoom(c);const prev=fbHostOff;
 const up=r.child('up');up.on('child_added',s=>{const v=s.val();s.ref.remove().catch(()=>{});if(!v||typeof v.from!=='string'||typeof v.j!=='string')return;let m;try{m=JSON.parse(v.j);}catch(e){return;}fbHostConn(c,v.from)._emit('data',m);});
 const cn=r.child('conn');cn.on('child_removed',s=>{const conn=fbConns[s.key];if(conn&&conn.open){conn.open=false;delete fbConns[s.key];conn._emit('close');}});
 fbHostOff=()=>{if(prev)prev();up.off();cn.off();};}
// اللاعب: يتأكد أن الغرفة موجودة وأن المضيف متصل، ثم يفتح قناته الخاصة
async function fbGuestOpen(c){const r=fbRoom(c);let hs;
 try{hs=await r.child('host').once('value');}catch(e){return {err:FB.errMsg(e)};}
 if(!hs.exists())return {gone:true,err:'رمز الغرفة غير صحيح، أو المضيف أغلق الغرفة.'};
 const al=await r.child('alive').once('value').catch(()=>null);if(!al||!al.val())return {err:'الغرفة موجودة لكن المضيف غير متصل الآن (صفحته مقفلة أو في الخلفية). خلّه يفتح صفحة اللعبة وجرّب مرة ثانية.'};
 if(fbGuestOff)fbGuestOff();
 const conn=emitter({open:true});const me=r.child('conn/'+uid);
 const join=()=>{me.onDisconnect().remove();me.set(true).catch(()=>{});};
 const down=r.child('down/'+uid);down.on('child_added',s=>{const v=s.val();s.ref.remove().catch(()=>{});if(v&&v.j)try{conn._emit('data',JSON.parse(v.j));}catch(e){}});
 const view=r.child('view/'+uid);view.on('value',s=>{const v=s.val();if(v&&v.j)try{conn._emit('data',JSON.parse(v.j));}catch(e){}});
 const alive=r.child('alive');let seen=false;alive.on('value',s=>{if(s.val())seen=true;else if(seen)conn.close();});
 // إذا انقطع الإنترنت ورجع: نعيد التسجيل ونرسل التحية من جديد
 const info=FB.db.ref('.info/connected');let was=null;const onInfo=s=>{if(s.val()){join();if(was===false&&conn.open)conn._emit('open');was=true;}else was=false;};info.on('value',onInfo);
 conn.send=m=>{r.child('up').push({from:uid,j:pack(m)}).catch(e=>console.warn('up',e));};
 const off=()=>{down.off();view.off();alive.off();info.off('value',onInfo);};
 conn.close=()=>{if(!conn.open)return;conn.open=false;off();me.onDisconnect().cancel().catch(()=>{});me.remove().catch(()=>{});if(fbGuestOff===off)fbGuestOff=null;conn._emit('close');};
 fbGuestOff=off;setTimeout(()=>conn._emit('open'),0);return {conn};}
// إبقاء شاشة المضيف شغالة (إذا انطفت الشاشة يتوقف الجوال عن خدمة الغرفة)
let wakeLock=null;async function keepAwake(on){try{if(on&&'wakeLock' in navigator&&!wakeLock&&document.visibilityState==='visible'){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener('release',()=>{wakeLock=null;});}if(!on&&wakeLock){await wakeLock.release();wakeLock=null;}}catch(e){wakeLock=null;}}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')return;if(isHost){keepAwake(true);if(NET.mode==='peer'&&peer&&!peer.destroyed&&peer.disconnected)try{peer.reconnect();}catch(e){}if(NET.mode==='peer'&&(!peer||peer.destroyed)&&code&&G)startHost(code,G,true);}
 else if(code&&!hostOK)scheduleRetry(300);});
window.GOD_inRoom=()=>!!code;
function openPeer(id){return new Promise((res,rej)=>{let p;try{p=id?new Peer(id,{debug:0}):new Peer({debug:0});}catch(e){rej(e);return;}const to=setTimeout(()=>{try{p.destroy();}catch(e){}rej(new Error('timeout'));},15000);p.on('open',()=>{clearTimeout(to);res(p);});p.on('error',e=>{clearTimeout(to);rej(e);});});}
function wireHostConn(conn){conn.on('data',msg=>onHostMsg(conn,msg));conn.on('close',()=>{const u=conn.u;if(u&&conns[u]===conn){delete conns[u];setOnline();sysChat(`${pname(u)} انقطع`);broadcast();render();}});}
function hostWire(){peer.on('disconnected',()=>{setTimeout(()=>{try{if(peer&&!peer.destroyed&&peer.disconnected)peer.reconnect();}catch(e){}},1000);});
 peer.on('error',e=>{if(e&&['network','server-error','socket-error','socket-closed'].includes(e.type)&&isHost&&code&&G){setTimeout(()=>{if(isHost&&peer&&(peer.destroyed||peer.disconnected)){try{peer.destroy();}catch(x){}peer=null;startHost(code,G,true);}},3000);}});
 peer.on('connection',wireHostConn);}
async function startHost(c,S,quiet){
 if(NET.mode==='fb'){const e=await fbHostOpen(c);if(e){if(!quiet)toast(e==='taken'?'رمز الغرفة مستخدم، جرّب مرة أخرى':FB.errMsg(e),'err');return false;}}
 else{try{peer=await openPeer(PFX+c);}catch(e){if(!quiet)toast(e&&e.type==='unavailable-id'?'رمز الغرفة مستخدم، جرّب مرة أخرى':'تعذّر الاتصال بخادم الربط. تأكد من الإنترنت.','err');return false;}}
 isHost=true;code=c;G=S;conns={};fbConns={};if(NET.mode==='peer')hostWire();else fbHostListen(c);keepAwake(true);chatMsgs=LS.get('chat_'+c,[]);LS.set('room',c);LS.set('role','host');LS.set('host_'+c,S);setOnline();view=G.status==='lobby'?'lobby':'table';prevLogLen=-1;onGame(null,G);return true;}
function onHostMsg(conn,msg){if(!msg||typeof msg!=='object')return;
 if(msg.t==='hello'){const u=String(msg.u||'').slice(0,64),name=String(msg.name||'لاعب').trim().slice(0,18)||'لاعب';if(!u||u===uid){conn.send({t:'err',m:'لا يمكن الانضمام من نفس الجهاز والمتصفح'});setTimeout(()=>conn.close(),400);return;}
  if(conn.authUid&&u!==conn.authUid){conn.send({t:'err',m:'هوية غير صحيحة'});setTimeout(()=>conn.close(),400);return;}const known=G.players.some(p=>p.id===u);
  if(!known){if(G.status!=='lobby'){conn.send({t:'err',m:'المباراة في هذه الغرفة بدأت بالفعل'});setTimeout(()=>conn.close(),400);return;}const e=hostApply(u,{type:'join',name});if(e){conn.send({t:'err',m:e});setTimeout(()=>conn.close(),400);return;}}
  if(conns[u]&&conns[u]!==conn)try{conns[u].close();}catch(e){}conn.u=u;conns[u]=conn;setOnline();sysChat(`${pname(u)} ${known?'رجع للغرفة':'انضم'}`);conn.send({t:'welcome'});broadcast();conn.send({t:'chat',m:chatMsgs});render();return;}
 const u=conn.u;if(!u)return;
 if(msg.t==='op'){const op=msg.op||{};if(op.type==='leave'&&G.status==='lobby'){hostApply(u,{type:'leave'});conn.send({t:'ack',id:msg.id,err:null});setTimeout(()=>conn.close(),200);return;}
  if(['start','settings','restart','kick'].includes(op.type)){conn.send({t:'ack',id:msg.id,err:'هذا للمضيف فقط'});return;}
  const e=hostApply(u,op);conn.send({t:'ack',id:msg.id,err:e});return;}
 if(msg.t==='chat'){const x=String(msg.x||'').trim().slice(0,300);if(!x)return;chatMsgs.push({u,n:pname(u),x,t:Date.now()});chatMsgs=chatMsgs.slice(-80);relayChat();}}
const NOTFOUND='ما لقيت الغرفة: تأكد من الرمز، وأن المضيف فاتح صفحة اللعبة (مو مقفل الشاشة أو مطلع للخلفية).';
const NOP2P='تعذّر الاتصال المباشر بين جهازك وجهاز المضيف، وغالباً السبب أن شبكة الجوال تمنعه. جرّب شبكة Wi-Fi، أو فعّل Firebase في الموقع (موضّح في README) لحل المشكلة نهائياً.';
function wireGuest(conn,c,name,res,fail,to){
  conn.on('open',()=>conn.send({t:'hello',u:uid,name}));
  conn.on('data',msg=>{if(!msg)return;
   if(msg.t==='err'){if(!to.done)fail(msg.m);else{toast(msg.m,'err');leaveView();}return;}
   if(msg.t==='welcome'){clearTimeout(to.id);const first=!to.done;to.done=true;hostConn=conn;hostOK=true;LS.set('room',c);LS.set('role','guest');LS.set('name',name);if(first){prevLogLen=-1;if(view!=='table')view=G&&G.status&&G.status!=='lobby'?'table':'lobby';res(true);}else render();return;}
   if(msg.t==='state'){if(msg.hn)clockSkew=msg.hn-Date.now();const old=G;online=new Set(msg.online||[]);onGame(old,msg.s);return;}
   if(msg.t==='chat'){chatMsgs=msg.m||[];renderSide();return;}
   if(msg.t==='ack'){const p=pend[msg.id];if(p){delete pend[msg.id];p(msg.err);}}});
  conn.on('close',()=>{if(hostConn!==conn)return;hostOK=false;hostConn=null;if(code){toast('انقطع الاتصال بالمضيف، أحاول أعيد الاتصال…','err');render();scheduleRetry();}});}
async function connectGuest(c,name,silent){if(NET.mode==='peer'&&!netReady())return false;code=c;isHost=false;hostOK=false;
 if(hostConn){const o=hostConn;hostConn=null;try{o.close();}catch(e){}}
 if(NET.mode==='fb'){const r=await fbGuestOpen(c);lastJoinGone=!!r.gone;if(r.err){if(!silent)toast(r.err,'err');return false;}
  return new Promise(res=>{const to={done:false};const fail=m=>{if(to.done)return;to.done=true;clearTimeout(to.id);try{r.conn.close();}catch(e){}if(!silent)toast(m,'err');res(false);};
   to.id=setTimeout(()=>fail('المضيف ما رد. تأكد أن صفحة اللعبة مفتوحة عنده وجرّب مرة ثانية.'),15000);wireGuest(r.conn,c,name,res,fail,to);});}
 try{if(!peer||peer.destroyed||peer.disconnected){if(peer)try{peer.destroy();}catch(e){}peer=await openPeer();}}catch(e){if(!silent)toast('تعذّر الاتصال بخادم الربط. تأكد من الإنترنت.','err');return false;}
 const attempt=()=>new Promise(res=>{const conn=peer.connect(PFX+c,{reliable:true});const to={done:false};
  const fail=m=>{if(to.done)return;to.done=true;clearTimeout(to.id);peer.off('error',onErr);try{conn.close();}catch(e){}res(m);};
  // ما فتح الاتصال خلال المهلة = الشبكة تمنع الاتصال المباشر (الغرفة موجودة لأن الخادم ما رفضها)
  to.id=setTimeout(()=>fail(conn.open?'المضيف ما رد. جرّب مرة ثانية.':NOP2P),15000);
  const onErr=e=>{if(e&&e.type==='peer-unavailable'&&String(e.message||'').includes(PFX+c))fail('nf');};peer.on('error',onErr);
  conn.on('error',()=>fail(NOP2P));
  conn.on('iceStateChanged',st=>{if(st==='failed')fail(NOP2P);});
  wireGuest(conn,c,name,v=>{peer.off('error',onErr);res(v);},fail,to);});
 // «ما لقيت الغرفة» أحياناً تكون مؤقتة (المضيف يعيد اتصاله بالخادم)، فنعيد المحاولة مرتين قبل ما نعلن الخطأ
 let r;for(let k=0;k<3;k++){r=await attempt();if(r===true)return true;if(r!=='nf')break;await sleep(2500);}
 if(!silent)toast(r==='nf'?NOTFOUND:r,'err');return false;}
function scheduleRetry(ms){clearTimeout(retryT);retryT=setTimeout(async()=>{if(!code||isHost||hostOK)return;const ok=await connectGuest(code,myName(),true);if(ok){toast('رجع الاتصال','good');render();}else if(lastJoinGone){toast('المضيف أغلق الغرفة','err');leaveView();}else scheduleRetry();},ms||4000);}
async function commit(op){if(!code||!G)return false;
 if(isHost){const e=hostApply(uid,op);if(e){toast(e,'err');return false;}return true;}
 if(!hostOK){toast('غير متصل بالمضيف حالياً','err');return false;}if(busy){toast('انتظر لحظة…');return false;}busy=true;
 const id=++opSeq;const err=await new Promise(r=>{pend[id]=r;try{hostConn.send({t:'op',id,op});}catch(e){delete pend[id];r('تعذّر الإرسال');}setTimeout(()=>{if(pend[id]){delete pend[id];r('ما وصل رد من المضيف، حاول مرة أخرى');}},10000);});busy=false;
 if(err){toast(err,'err');return false;}return true;}
function playerName(){return ACC.user&&ACC.name?ACC.name:null;}
async function createRoom(name,winSets,maxP){if(!netReady())return;name=(playerName()||String(name||'')).trim().slice(0,18);if(!name)return toast('اكتب اسمك','err');LS.set('name',name);
 const counts={};for(const id in CARDS)if(CARDS[id].cnt!==ORIG[id].cnt)counts[id]=CARDS[id].cnt;
 toast('جارٍ تجهيز الغرفة…');
 for(let k=0;k<3;k++){const c=genCode();const S=E.newGame(c,uid,name,{rules:Object.assign({},CFG.rules||{},{winSets:Math.max(1,Math.min(12,+winSets||6))}),counts});S.maxP=Math.max(2,Math.min(6,+maxP||6));S.log.push({t:Date.now(),m:`أنشأ ${name} الغرفة`});if(await startHost(c,S,k<2))return;}}
async function joinRoom(c,name){c=String(c||'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-1632)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-1776)).trim().toUpperCase().replace(/[^A-Z0-9]/g,'');name=(playerName()||String(name||'')).trim().slice(0,18);if(c.length!==5)return toast('رمز الغرفة 5 خانات','err');if(!name)return toast('اكتب اسمك','err');LS.set('name',name);toast('جارٍ الاتصال بالغرفة…');const ok=await connectGuest(c,name);if(ok)render();else code=null;}
async function enterRoom(c){const role=LS.get('role','');if(role==='host'){const S=LS.get('host_'+c,null);if(S){toast('جارٍ إعادة فتح غرفتك…');for(let k=0;k<6;k++){if(await startHost(c,S,true)){toast('رجعت الغرفة '+c,'good');return;}await sleep(3000);}toast('تعذّر إعادة فتح الغرفة','err');return;}}joinRoom(c,myName());}
function leaveView(){clearTimeout(retryT);if(hostConn)try{hostConn.close();}catch(e){}hostConn=null;hostOK=false;if(isHost){for(const u in conns)try{conns[u].send({t:'err',m:'أغلق المضيف الغرفة'});conns[u].close();}catch(e){}conns={};if(peer)try{peer.destroy();}catch(e){}peer=null;keepAwake(false);
  if(NET.mode==='fb'&&code){if(fbHostOff)fbHostOff();fbHostOff=null;fbConns={};const r=fbRoom(code);setTimeout(()=>r.remove().catch(()=>{}),800);}LS.set('host_'+code,null);LS.set('chat_'+code,null);}isHost=false;code=null;G=null;chatMsgs=[];evSeen=null;evQ=[];LS.set('room',null);view='home';render();}
function onGame(old,S){const V=isHost?viewFor(S,uid):S;
 if(V.status==='lobby'&&view==='table')view='lobby';if(V.status!=='lobby'&&view==='lobby')view='table';
 if(prevLogLen>=0&&V.log&&old&&old.log&&V.log.length){const lastOld=old.log.length?old.log[old.log.length-1].t:0;const fresh=V.log.filter(l=>l.t>lastOld);const l=fresh.filter(x=>x.k==='good'&&x.m.includes('🏆')).pop();if(l)toast(l.m,'good');}
 prevLogLen=V.log?V.log.length:0;
 if(V.status==='playing'){const k=V.tc+':'+V.turn.p;if(k!==lastTurnKey){lastTurnKey=k;if(V.turn.ctrl===uid){toast('دورك الآن','good');try{navigator.vibrate&&navigator.vibrate(60);}catch(e){}}}}
 if(V.pending&&V.status==='playing'){const pd=V.pending,a=E.stageActor(V);const key=pd.id+pd.stage+(pd.queue[0]||'')+(pd.lot||0);const need=pd.stage==='bid'?(uid!==pd.from&&pd.bids[uid]==null):a===uid;if(need&&key!==lastPendKey){lastPendKey=key;setTimeout(()=>{if(!$('#sheet'))pendingAction();},300);}}
 // «إكشف الورق»: تفتح أوراق المستهدف لصاحب الأمر تلقائياً (له وحده، حتى نهاية دوره)
 if(V.status==='playing'&&V.reveal&&V.reveal[uid]&&V.reveal[uid].hand&&V.reveal[uid].until===V.tc){const k='pk'+V.tc+V.reveal[uid].hand;if(k!==lastPeekKey){lastPeekKey=k;setTimeout(()=>{if(!$('#sheet'))podSheet(V.reveal[uid].hand);},500);}}
 if(V.status==='ended'&&V.P&&V.P[uid])recordResult(V);
 GV=V;if(!isHost)G=S;render();feedEvents(V);}
let GV=null,lastPeekKey=''; // نسخة العرض للاعب الحالي
function recordResult(V){const key='rec_'+V.code+'_'+V.endedAt;if(!ACC.user||LS.get(key,false))return;LS.set(key,true);
 ACC.record({players:V.order.length,won:V.winner===uid,sets:E.score(V.P[uid]),rounds:V.tc,minutes:Math.round((V.endedAt-V.startedAt)/60000)});}
function sendChat(text){text=String(text||'').trim().slice(0,300);if(!text||!code)return;if(isHost){chatMsgs.push({u:uid,n:myName(),x:text,t:Date.now()});chatMsgs=chatMsgs.slice(-80);relayChat();}else if(hostOK)hostConn.send({t:'chat',x:text});else toast('غير متصل بالمضيف','err');}
function myName(){if(G){const p=G.players.find(p=>p.id===uid);if(p)return p.name;}return playerName()||LS.get('name','');}
// المضيف ينفّذ انتهاء المهلات بنفسه حتى لا تتوقف الطاولة إذا خرج لاعب
setInterval(()=>{if(isHost&&G&&G.status==='playing'&&G.pending&&Date.now()-G.pending.dl>1200)hostApply(uid,{type:'timeout'});},1000);
// عدّاد المهلة على الشاشة
setInterval(()=>{const S=GV;if(!S||S.status!=='playing'||!S.pending)return;const left=Math.max(0,S.pending.dl-nowH());document.querySelectorAll('[data-pbar]').forEach(b=>b.style.width=(100*left/((S.cfg.timeout||60)*1000))+'%');document.querySelectorAll('[data-pleft]').forEach(t=>t.textContent=Math.ceil(left/1000)+' ث');},1000);


// ---------- helpers
function pname(u){const p=G&&G.players.find(x=>x.id===u);return p?p.name:'؟';}
function av(u,size){const i=G?G.players.findIndex(p=>p.id===u):0;return `<span class="av" style="background:${AVC[(i+AVC.length)%AVC.length]};${size?`width:${size}px;height:${size}px`:''}">${esc(pname(u).slice(0,1))}</span>`;}
function me(){return G&&G.P?G.P[uid]:null;}
function viewHandOwner(){if(!G||!G.turn)return uid;if(G.turn.ctrl===uid&&G.turn.p!==uid)return G.turn.p;return uid;}
function colorDot(c){return `<span class="sw" style="background:${COLORS[c].hex}"></span>`;}
function cardImg(iid,cls){return `${kimg(img(iid),` alt="${esc(E.C(iid).n)}" class="${cls||''}" loading="lazy"`)}`;}

// ---------- ask (sheet picker)
let sheetResolve=null;
function closeSheet(v){const s=$('#sheet');if(s)s.remove();const r=sheetResolve;sheetResolve=null;if(r)r(v);}
function sheet(html,onMount){closeSheet(null);const d=document.createElement('div');d.className='sheet-bg';d.id='sheet';d.innerHTML=`<div class="sheet" role="dialog">${html}</div>`;d.addEventListener('click',e=>{if(e.target===d)closeSheet(null);});document.body.appendChild(d);if(onMount)onMount(d);return new Promise(r=>sheetResolve=r);}
function ask(title,options,opts){opts=opts||{};const h=`<h3>${esc(title)}</h3>${opts.sub?`<div class="muted">${opts.sub}</div>`:''}<div class="opts">${options.map((o,k)=>`<button class="opt" data-k="${k}" ${o.disabled?'disabled':''}>${o.img?`${kimg(o.img,` alt=""`)}`:''}${o.color?`<span class="sw" style="width:18px;height:24px;background:${o.color}"></span>`:''}<span style="min-width:0"><div>${esc(o.label)}</div>${o.sub?`<div class="sub">${esc(o.sub)}</div>`:''}</span></button>`).join('')}</div><div class="row" style="margin-top:14px"><button class="btn" data-x="1">${opts.cancelText||'إلغاء'}</button></div>`;
 return sheet(h,d=>{d.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>closeSheet(options[+b.dataset.k].v));d.querySelector('[data-x]').onclick=()=>closeSheet(null);});}
async function pickPlayer(title,filter){const opts=G.order.filter(u=>u!==uid&&(!filter||filter(u))).map(u=>({v:u,label:pname(u),sub:`${E.score(G.P[u])} مجموعات • ${G.P[u].hand.length} بطاقة • بنك ${E.bankMoney(G.P[u])}M`}));if(!opts.length){toast('لا يوجد لاعب مناسب','err');return null;}return ask(title,opts);}
function landOpts(S,lands,ownerU){return lands.map(i=>{const l=S.P[ownerU].lands.find(x=>x.i===i);return{v:i,label:E.C(i).n,sub:`${COLORS[l.c].n} • ${E.C(i).v||0}M`,img:img(i)};});}
function setOpts(cols,u){return cols.map(c=>({v:c,label:'مجموعة '+COLORS[c].n,color:COLORS[c].hex,sub:`إيجارها ${E.rentOf(G.P[u],c)}M${E.fenced(G.P[u],c)?' • عليها شبوك':''}`}));}


// ---------- card actions (my turn)
function myTurn(){return G&&G.status==='playing'&&G.turn.ctrl===uid&&G.turn.phase==='play'&&!G.pending;}
async function cardModal(iid,ctx){const c=E.C(iid);const S=G;const actor=viewHandOwner();const p=S.P[actor];const left=myTurn()?E.movesLeft(S):0;
 const btns=[];
 if(ctx==='hand'){
  if(S.pending&&S.pending.stage!=='bid'&&c.a&&E.respOK(S,S.pending,uid,c.a))btns.push(['respond','استخدمها للرد الآن','gold']);
  if(myTurn()&&left>0){
   if(c.t==='money'||c.t==='visa')btns.push(['bank','ضعها في البنك','gold']);
   else if(['land','dual','joker'].includes(c.t))btns.push(['land','ضعها في ساحتك','gold']);
   else if(c.t==='build')btns.push(['build','أضفها إلى مجموعة','gold']);
   else if(c.t==='rent'||c.t==='action'){if(E.RESP.includes(c.a))btns.push(['x','بطاقة رد: تُستخدم عندما يوجَّه إليك أمر','']);else if(c.a==='double'||c.a==='triple')btns.push(['x','تُضم مع بطاقة إيجار أو ضريبة عند لعبها','']);else if(c.a==='burn')btns.push(['burn','احرق بها بطاقة من يدك','gold']);else btns.push(['play','استخدم البطاقة','gold']);}
   if(c.a!=='burn'&&p.hand.some(x=>E.C(x).a==='burn'))btns.push(['burnthis','احرق هذه البطاقة','']);
  }}
 const txt=c.t==='mission'?c.d:(c.d||(c.t==='land'?`أرض ${COLORS[c.c].n} • القيمة ${c.v}M • الإيجار: ${COLORS[c.c].rent.map((r,k)=>(k+1)+'←'+r+'M').join('، ')}`:c.t==='dual'?`أرض بوجهين: ${c.cs.map(x=>COLORS[x].n).join(' / ')} • القيمة ${c.v}M. قلبها يُحسب حركة.`:c.t==='money'?`نقود قيمتها ${c.v} مليون، توضع في البنك.`:''));
 const h=`<div class="cardview">${kimg(img(iid),` alt=""`)}<div class="stack" style="gap:8px;min-width:0"><h3>${esc(c.n)}</h3><div class="muted" style="font-size:12px">${esc(c.g||'')}${c.black?' • بطاقة سوداء':''}</div><div style="line-height:1.8">${esc(txt)}</div></div></div><div class="stack" style="margin-top:16px;gap:8px">${btns.map(([k,l,cl])=>`<button class="btn ${cl}" data-b="${k}" ${k==='x'?'disabled':''}>${esc(l)}</button>`).join('')}<button class="btn" data-b="cancel">إلغاء</button></div>`;
 const r=await sheet(h,d=>d.querySelectorAll('[data-b]').forEach(b=>b.onclick=()=>closeSheet(b.dataset.b)));
 return actOn(iid,r);}
async function actOn(iid,r,direct){const c=E.C(iid);const S=G;const actor=viewHandOwner();const p=S.P[actor];
 if(!r||r==='cancel'||r==='x')return;
 if(r==='respond')return respondWith(iid);
 if(r==='bank')return commit({type:'bank',card:iid});
 if(r==='land'){let color=c.c;if(c.t==='dual'){color=await ask('اختر الوجه',c.cs.map(x=>({v:x,label:COLORS[x].n,color:COLORS[x].hex})));if(!color)return;}if(c.t==='joker'){color=await ask('الجوكر يمثّل أي لون',Object.keys(COLORS).map(x=>({v:x,label:COLORS[x].n,color:COLORS[x].hex,sub:`لديك ${(E.setInfo(p)[x]||{n:0}).n} من ${COLORS[x].size}`})));if(!color)return;}return commit({type:'land',card:iid,color});}
 if(r==='build'){const cols=E.completeColors(p).filter(x=>c.b==='fence'||!E.NO_BUILD.includes(x));if(!cols.length)return toast('تحتاج مجموعة كاملة (المباني لا تُضاف للمطاعم والمحطات)','err');const color=await ask('أضف '+c.n+' إلى',setOpts(cols,actor));if(color)commit({type:'build',card:iid,color});return;}
 if(r==='burn'){const o=p.hand.filter(x=>x!==iid);const other=await ask('اختر البطاقة التي تريد حرقها',o.map(x=>({v:x,label:E.C(x).n,img:img(x)})));if(other)commit({type:'burn',card:iid,other});return;}
 if(r==='burnthis'){const b=p.hand.find(x=>E.C(x).a==='burn');return commit({type:'burn',card:b,other:iid});}
 if(r==='play')return playWizard(iid,direct);}
async function chooseMult(p,a){const left=E.movesLeft(G);if(!E.MULTABLE.includes(a)||left<2)return undefined;const ms=p.hand.filter(x=>['double','triple'].includes(E.C(x).a));if(!ms.length)return undefined;const r=await ask('تضعيف المبلغ؟',[{v:'none',label:'بدون تضعيف'},...ms.map(x=>({v:x,label:E.C(x).n,img:img(x),sub:'تُحسب حركة إضافية'}))]);if(r===null)return null;return r==='none'?undefined:r;}
async function playWizard(iid,asAction){const S=G;const actor=S.turn.p;const p=S.P[actor];const c=E.C(iid);let a=c.t==='rent'?'rent':c.a;const op={type:'play',card:iid};
 if(a==='royal'){const acts=[{v:'rent',label:'إيجار (أي لون)'}];const seen=new Set();for(const id in CARDS){const x=CARDS[id];if(x.t==='action'&&!x.black&&!E.RESP.includes(x.a)&&!['double','triple','burn','royal'].includes(x.a)&&!seen.has(x.a)){seen.add(x.a);acts.push({v:x.a,label:x.n,img:'img/'+id+'.jpg'});}}a=await ask('المرسوم الملكي: اختر الأمر',acts,{sub:'تصبح البطاقة هذا الأمر، ولا تُرد إلا بـ تخسسسي.'});if(!a)return;op.as=a;}
 const opp=S.order.filter(u=>u!==actor);
 if(a==='rent'){const cs=(c.t==='rent'?c.cs:Object.keys(COLORS)).filter(x=>E.setInfo(p)[x]);if(!cs.length)return toast('لا تملك أرضاً من ألوان هذه البطاقة','err');const col=await ask('اختر لون الإيجار',cs.map(x=>({v:x,label:COLORS[x].n,color:COLORS[x].hex,sub:`الإيجار ${E.rentOf(p,x)}M من كل لاعب`})));if(!col)return;op.color=col;const m=await chooseMult(p,'rent');if(m===null)return;if(m)op.mult=m;return commit(op);}
 if(a==='rentgold'){const all=[];for(const u of S.order)for(const l of S.P[u].lands)all.push({v:l.i,label:E.C(l.i).n,sub:`${COLORS[l.c].n} عند ${pname(u)} • الإيجار ${E.rentOf(S.P[u],l.c)}M`,img:img(l.i)});if(!all.length)return toast('لا توجد أراضٍ في الساحة','err');const land=await ask('اختر أي أرض في الساحة',all);if(!land)return;op.land=land;const m=await chooseMult(p,'rentgold');if(m===null)return;if(m)op.mult=m;return commit(op);}
 if(E.SELF.includes(a)){if(asAction){commit(op);return;}const ok=await ask(E.opLabel(a),[{v:1,label:'نفّذ الآن'}],{sub:esc(E.C(iid).d||'')});if(ok)commit(op);return;}
 if(['theeb','boom','nuke'].includes(a)){op.sel={};for(const u of opp){const o=E.selOptions(S,a,actor,u);if(!o.length)continue;const v=await ask(`${E.opLabel(a)}: اختر من ${pname(u)}`,a==='nuke'?setOpts(o,u):landOpts(S,o,u));if(v===null)return;op.sel[u]=v;}return commit(op);}
 if(['dabatni','cash'].includes(a)){if(asAction){commit(op);return;}const ok=await ask(E.opLabel(a),[{v:1,label:'وجّه الأمر لجميع اللاعبين'}]);if(ok)commit(op);return;}
 if(a==='auction'){op.sel={};const cand=opp.filter(u=>E.looseLands(S.P[u]).length);for(const u of cand){const ls=E.looseLands(S.P[u]);const l=ls.length===1?ls[0]:await ask(`المزاد: اختر أرضاً من ${pname(u)}`,landOpts(S,ls,u));if(!l)return;op.sel[u]=l;}if(!Object.keys(op.sel).length)return toast('لا توجد أراضٍ خارج المجموعات','err');return commit(op);}
 // single target
 if(a==='swapset'){const mine=E.completeColors(p).filter(x=>!E.fenced(p,x));if(!mine.length)return toast('تحتاج مجموعة كاملة بدون شبوك','err');op.mine=await ask('اختر مجموعتك',setOpts(mine,actor));if(!op.mine)return;}
 if(a==='atni'){const mine=E.looseLands(p);if(!mine.length)return toast('تحتاج أرضاً خارج المجموعات','err');op.mine=await ask('اختر أرضك التي ستعطيها',landOpts(S,mine,actor));if(!op.mine)return;}
 if(a==='give'){op.give=await ask('اختر البطاقة التي ستعطيها',p.hand.filter(x=>x!==iid).map(x=>({v:x,label:E.C(x).n,img:img(x)})));if(!op.give)return;}
 const t=await pickPlayer(E.opLabel(a)+': اختر اللاعب',u=>{if(E.needSel(a))return E.selOptions(S,a,actor,u).length>0;if(a==='swaphand'||a==='takecard')return S.P[u].hand.length>0;return true;});if(!t)return;op.t=t;
 if(E.needSel(a)){const o=E.selOptions(S,a,actor,t);const v=await ask('اختر',['set','setany'].includes(E.needSel(a))?setOpts(o,t):landOpts(S,o,t));if(!v)return;op.sel=v;}
 if(a==='rentwild'){const cs=Object.keys(E.setInfo(p));if(!cs.length)return toast('لا تملك أراضي','err');op.color=await ask('اختر لون الإيجار',cs.map(x=>({v:x,label:COLORS[x].n,color:COLORS[x].hex,sub:`${E.rentOf(p,x)}M`})));if(!op.color)return;}
 const m=await chooseMult(p,a);if(m===null)return;if(m)op.mult=m;
 commit(op);}
async function respondWith(iid){const a=E.C(iid).a;const pd=G.pending;const op={type:'respond',card:iid};
 if(a==='asfeq'){op.to=await pickPlayer('حوّل الأمر إلى',u=>u!==pd.from&&u!==uid);if(!op.to)return;}
 if(a==='payforme'){op.to=await pickPlayer('من يدفع عنك؟',u=>u!==pd.benef&&u!==uid);if(!op.to)return;}
 commit(op);}
async function paySheet(){const pd=G.pending,pay=pd.pay,p=G.P[uid];const pool=E.payable(p);let sel=new Set(E.autoPick(G,uid,pay.amount));const hasChange=p.hand.some(x=>E.C(x).a==='change');let change=false;const cash=p.bank.filter(i=>E.T(i)!=='visa');const cashTot=cash.reduce((s,i)=>s+(E.C(i).v||0),0);
 const draw=d=>{const landsOK=cashTot<pay.amount&&cash.every(i=>sel.has(i));if(!landsOK)for(const i of [...sel])if(!p.bank.includes(i))sel.delete(i);const sum=[...sel].reduce((s,i)=>s+(E.C(i).v||0),0);d.querySelector('#paysum').textContent=sum+'M';d.querySelectorAll('[data-i]').forEach(b=>{b.classList.toggle('sel',sel.has(b.dataset.i));if(!p.bank.includes(b.dataset.i))b.disabled=!landsOK;});};
 const items=pool.map(i=>{const inBank=p.bank.includes(i);return `<button class="opt" data-i="${i}">${kimg(img(i),` alt=""`)}<span><div>${esc(E.C(i).n)}</div><div class="sub">${inBank?'من البنك':'أرض'} • ${E.C(i).v||0}M</div></span></button>`;}).join('');
 const h=`<h3>ادفع ${pay.amount}M لـ ${esc(pname(pay.payee))}</h3><div class="muted">الدفع من البنك أولاً حتى لو كانت الورقة أكبر من المطلوب. الأراضي (خارج المجموعات) تُستخدم فقط إذا ما كفى البنك، والمجموعات المكتملة ما تنمس. الباقي ما يرجع إلا بـ «وين الباقي؟». المختار: <b id="paysum"></b></div>${E.hasVisa(p)?`<button class="btn gold" data-v="visa" style="margin-top:10px;width:100%">سدّد بالفيزا</button>`:''}<div class="opts">${items||'<div class="muted">لا تملك ما تدفعه</div>'}</div>${hasChange?`<label class="row" style="margin-top:10px"><input type="checkbox" id="chg"> استخدم «وين الباقي؟» لاسترجاع الفرق</label>`:''}<div class="row" style="margin-top:14px"><button class="btn gold" data-v="pay">ادفع</button></div>`;
 const r=await sheet(h,d=>{draw(d);d.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const i=b.dataset.i;sel.has(i)?sel.delete(i):sel.add(i);draw(d);});const ch=d.querySelector('#chg');if(ch)ch.onchange=()=>change=ch.checked;d.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>closeSheet(b.dataset.v));});
 if(r==='visa')return commit({type:'pay',visa:true});if(r==='pay')return commit({type:'pay',cards:[...sel],change});}
async function pendingAction(){const pd=G.pending;if(!pd)return;const actor=E.stageActor(G);const p=G.P[uid];
 if(pd.stage==='bid'){if(uid===pd.from)return;const lot=pd.lots[pd.lot];const h=`<h3>مزاد على ${esc(E.C(lot.i).n)}</h3><div class="cardview" style="grid-template-columns:110px 1fr">${kimg(img(lot.i),` alt=""`)}<div class="stack"><div class="muted">رصيد بنكك ${E.bankMoney(p)}M${E.hasVisa(p)?' + فيزا':''}. صاحب أعلى مبلغ يحصل على الأرض، والمبلغ لـ ${esc(pname(pd.from))}.</div><div class="field"><label for="bidv">مبلغك (بالمليون)</label><input id="bidv" type="number" min="0" inputmode="numeric" value="0"></div></div></div><div class="row" style="margin-top:14px"><button class="btn gold" data-v="bid">قدّم المبلغ</button><button class="btn" data-v="pass">لا أشارك</button></div>`;
  const r=await sheet(h,d=>d.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>closeSheet(b.dataset.v==='pass'?0:+(d.querySelector('#bidv').value||0))));if(r===null)return;return commit({type:'bid',amount:r});}
 if(actor!==uid)return;
 if(pd.stage==='pay')return paySheet();
 if(pd.stage==='choose'){const ls=E.looseLands(p);const v=await ask(`أعطِ ${pname(pd.benef)} أرضاً من اختيارك`,landOpts(G,ls,uid),{cancelText:'لاحقاً'});if(v)commit({type:'choose',land:v});return;}
 if(pd.stage==='retarget'){const v=await pickPlayer('شف غيري! اختر لاعباً آخر',u=>u!==pd.from&&!(pd.excl||[]).includes(u));if(v)commit({type:'retarget',t:v});return;}
 if(pd.stage==='reselect'){const t=pd.queue[0];const k=E.needSel(pd.a);const op={type:'reselect'};if(pd.a==='swapset'){op.mine=await ask('اختر مجموعتك',setOpts(E.completeColors(p).filter(x=>!E.fenced(p,x)),uid));if(!op.mine)return;}if(pd.a==='atni'){op.mine=await ask('اختر أرضك',landOpts(G,E.looseLands(p),uid));if(!op.mine)return;}const o=E.selOptions(G,pd.a,uid,t);const v=await ask(`تحوّل الأمر إلى ${pname(t)}: اختر`,['set','setany'].includes(k)?setOpts(o,t):landOpts(G,o,t),{cancelText:'تنازل عن الأمر'});if(!v)return commit({type:'giveup'});op.sel=v;return commit(op);}
 const resp=p.hand.filter(x=>E.C(x).a&&E.respOK(G,pd,uid,E.C(x).a));
 if(pd.stage==='counter'){const r=await ask(`${pname(pd.refuser)} رفض أمرك`,[{v:'pass',label:'اقبل الرفض'},...resp.map(x=>({v:x,label:'ردّ بـ '+E.C(x).n,img:img(x),sub:'يلغي الرفض ويعيد الأمر'}))],{cancelText:'لاحقاً'});if(r==='pass')return commit({type:'pass'});if(r)return respondWith(r);return;}
 if(pd.stage==='respond'){const amt=E.PAY_ACTIONS.includes(pd.a)?E.payAmount(G,pd,uid):0;const r=await ask(`${pname(pd.from)} وجّه إليك: ${pd.label}`,[{v:'accept',label:amt?`اقبل وادفع ${amt}M`:'اقبل الأمر'},...resp.map(x=>({v:x,label:'ردّ بـ '+E.C(x).n,img:img(x),sub:E.C(x).d}))],{sub:esc(descOf(pd)),cancelText:'لاحقاً'});if(r==='accept')return commit({type:'accept'});if(r)return respondWith(r);}}
function descOf(pd){const c=pd.played?E.C(pd.played[0]):null;const t=pd.queue[0];let s=c?(c.d||''):'';const sel=pd.sel&&pd.sel[t];if(sel){s+=' • المستهدف: '+(COLORS[sel]?'مجموعة '+COLORS[sel].n:E.C(sel).n);}if(pd.black)s+=' • أمر أسود: لا يُرد إلا بـ تخسسسي';return s;}


function loadingV(){return `<div class="wrap empty-st">جارٍ فتح الغرفة…</div>`;}
function missionsV(u,showAll){const p=G.P[u];return p.miss.map(m=>m.done||showAll?`<div class="mcard kit ${m.done?'done':''}" title="${esc(E.C(m.i).d)}"><god-card t="${E.T(m.i)}" role="img" aria-label="${esc(E.C(m.i).d)}"></god-card>${m.done?'<b class="mdone">✓ محققة</b>':''}</div>`:`<div class="mcard" style="padding:0;border:0;background:none"><img src="img/back.png" alt="مهمة سرية" style="width:100%;display:block;border-radius:10px"></div>`).join('');}
function pendingV(){const S=G,pd=S.pending;if(!pd){const top=S.discard.length?S.discard[S.discard.length-1]:null;const lg=S.log[S.log.length-1];return `<div class="pending"><div class="muted" style="font-size:13px">${lg?esc(lg.m):''}</div></div>`;}
 const t=pd.queue[0];const actor=E.stageActor(S);let line='';
 if(pd.stage==='bid'){const lot=pd.lots[pd.lot];const n=Object.keys(pd.bids).length;line=`🔨 مزاد على ${esc(E.C(lot.i).n)} • قدّم ${n} من ${S.order.length-1}`;}
 else{const st={respond:'بانتظار رد',counter:'بانتظار قرار',pay:'بانتظار دفع',choose:'بانتظار اختيار',retarget:'بانتظار اختيار لاعب آخر من',reselect:'بانتظار اختيار'}[pd.stage]||'';line=`<span class="t">${esc(pname(pd.from))} ← ${esc(pd.label)}</span><span>${st} <b>${esc(pname(actor))}</b>${pd.stage==='pay'?` (${pd.pay.amount}M لـ ${esc(pname(pd.pay.payee))})`:''}</span>`;}
 const mine=(pd.stage==='bid'&&uid!==pd.from&&pd.bids[uid]==null)||(pd.stage!=='bid'&&actor===uid);
 const third=pd.stage==='respond'&&uid!==pd.from&&uid!==t&&G.P[uid]&&G.P[uid].hand.some(x=>E.C(x).a&&E.respOK(G,pd,uid,E.C(x).a));
 return `<div class="pending"><div style="display:grid;gap:2px;font-size:13.5px">${line}</div><div class="bar"><i data-pbar style="width:100%"></i></div><div class="row"><span class="muted" data-pleft style="font-size:12px"></span>${mine?`<button class="btn gold sm" data-go="pending">${pd.stage==='bid'?'قدّم مبلغك':'تصرّف الآن'}</button>`:''}${third?`<button class="btn sm" data-go="defend">دافع عن ${esc(pname(t))}</button>`:''}</div></div>`;}
function order(i){const c=E.C(i);return({money:1,visa:1,land:2,dual:2,joker:2,build:3,rent:4,action:5})[c.t]*1000+(c.v||0);}
function jailV(){const p=G.P[uid];const broke=!E.payable(p).length&&!E.hasVisa(p);return `<div class="card-panel stack"><h3>🚔 أنت في السجن (${p.st.jail} دورات)</h3><div class="muted">للخروج ادفع ${G.cfg.jailFee}M لمن سجنك ثم العب دورك، أو ابقَ وتخطَّ هذا الدور.${broke?' لا تملك أرضاً ولا بنكاً: اسحب بطاقتين، الأرض والمال لصاحب الأمر والأوامر تُحرق، ثم تلعب وتخرج.':''}</div><div class="row">${broke?`<button class="btn gold" data-go="jailbroke">اسحب بطاقتين واخرج</button>`:`<button class="btn gold" data-go="jailpay">ادفع ${G.cfg.jailFee}M واخرج</button>`}<button class="btn" data-go="jailwait">ابقَ في السجن</button></div></div>`;}
function renderSide(){const ci=$('#chatin');const keep=ci?ci.value:'';const foc=ci&&document.activeElement===ci;const html=`<div class="tabs"><button class="${sideTab==='log'?'on':''}" data-tab="log">السجل</button><button class="${sideTab==='chat'?'on':''}" data-tab="chat">المحادثة</button></div>${sideTab==='log'?`<div class="logl">${G?(G.log||[]).slice().reverse().map(l=>`<div class="${l.k||''}">${esc(l.m)}</div>`).join(''):''}</div>`:chatV()}`;
 const el=$('#side')||$('#lobbychat');if(!el)return;if($('#lobbychat')&&!$('#side')){el.innerHTML=chatV();}else el.innerHTML=html;
 el.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{sideTab=b.dataset.tab;if(sideTab==='chat')chatSeen=chatMsgs.length;renderSide();});bindChat(el);if(sideTab==='chat'||$('#lobbychat'))chatSeen=chatMsgs.length;const m=el.querySelector('.msgs');if(m)m.scrollTop=1e9;const ni=$('#chatin');if(ni&&keep){ni.value=keep;}if(ni&&foc)ni.focus();}
function chatV(){return `<div class="chat"><div class="msgs">${chatMsgs.map(m=>`<div class="msg"><b>${esc(m.n)}:</b> ${esc(m.x)}</div>`).join('')||'<div class="muted">لا توجد رسائل بعد</div>'}</div><form class="chatform" data-chat="1"><input id="chatin" maxlength="300" placeholder="اكتب رسالة…" autocomplete="off"><button class="btn sm gold">إرسال</button></form></div>`;}
function bindChat(el){const f=el.querySelector('[data-chat]');if(f)f.onsubmit=e=>{e.preventDefault();const i=f.querySelector('input');sendChat(i.value);i.value='';};}
async function podSheet(u){const S=G,p=S.P[u];const rv=S.reveal&&S.reveal[uid]&&S.reveal[uid].until===S.tc;const seeHand=(rv&&S.reveal[uid].hand===u)||p.st.open>S.tc;const seeMiss=rv&&S.reveal[uid].miss;
 await sheet(`<div class="row">${av(u)}<h3>${esc(pname(u))}</h3><span class="dot ${online.has(u)?'on':''}"></span></div><div class="stats" style="margin-block:8px">🂠 ${p.hand.length} بطاقة • 🏦 ${E.bankMoney(p)}M${E.hasVisa(p)?' + فيزا':''} • 🏆 ${E.score(p)}/${S.cfg.winSets}</div><div class="sec-h"><b>الساحة</b></div><div class="field-area" style="flex-wrap:wrap">${fieldV(u)}</div><div class="bank" style="margin-block:8px">${p.bank.map(i=>E.T(i)==='visa'?`<span class="coin visa">VISA</span>`:`<span class="coin">${E.C(i).v}M</span>`).join('')}</div><div class="sec-h"><b>المهمات</b></div><div class="missions">${missionsV(u,seeMiss)}</div>${seeHand?`<div class="sec-h"><b>أوراقه المكشوفة (${p.hand.length})</b>${rv&&S.reveal[uid].hand===u?'<span class="muted small"> • تشوفها أنت فقط حتى نهاية دورك</span>':''}</div><div class="peekgrid">${p.hand.map(i=>`<button class="pk" data-pk="${esc(i)}" aria-label="${esc(E.C(i).n)}">${cardImg(i)}</button>`).join('')||'<span class="muted">ما معه أوراق</span>'}</div>`:''}<button class="btn" style="margin-top:14px;width:100%" data-x="1">إغلاق</button>`,d=>{d.querySelector('[data-x]').onclick=()=>closeSheet();d.querySelectorAll('[data-land]').forEach(b=>b.onclick=()=>{closeSheet();cardModal(b.dataset.land,'view');});d.querySelectorAll('[data-pk]').forEach(b=>b.onclick=async()=>{const i=b.dataset.pk;closeSheet();await cardModal(i,'view');if(G&&G.status==='playing')podSheet(u);});});}
async function landTap(iid,lo){const c=E.C(iid);if(lo===uid&&myTurn()&&E.movesLeft(G)>0&&(c.t==='dual'||c.t==='joker')){const l=G.P[uid].lands.find(x=>x.i===iid);const cs=(c.t==='dual'?c.cs:Object.keys(COLORS)).filter(x=>x!==l.c);const r=await ask(`${c.n}: حرّكها إلى لون آخر (حركة)`,cs.map(x=>({v:x,label:COLORS[x].n,color:COLORS[x].hex})),{cancelText:'عرض البطاقة فقط'});if(r)return commit({type:'flip',land:iid,color:r});}cardModal(iid,'view');}
async function bldTap(b,lo){if(lo===uid&&myTurn()&&E.movesLeft(G)>0){const p=G.P[uid];const from=Object.keys(p.bld).find(c=>p.bld[c].includes(b));const cs=E.completeColors(p).filter(x=>x!==from&&(E.C(b).b==='fence'||!E.NO_BUILD.includes(x)));if(cs.length){const r=await ask(`انقل ${E.C(b).n} إلى مجموعة أخرى (حركة)`,setOpts(cs,uid),{cancelText:'عرض البطاقة فقط'});if(r)return commit({type:'moveBuild',card:b,to:r});}}cardModal(b,'view');}
function sideSheet(tab){sideTab=tab;if(tab==='chat')chatSeen=chatMsgs.length;sheet(`<div style="height:70vh;display:flex;flex-direction:column" id="sideS"></div>`,d=>{const el=d.querySelector('#sideS');const draw=()=>{el.innerHTML=tab==='log'?`<h3>سجل الأحداث</h3><div class="logl">${(G.log||[]).slice().reverse().map(l=>`<div class="${l.k||''}">${esc(l.m)}</div>`).join('')}</div>`:`<h3>المحادثة</h3>${chatV()}`;bindChat(el);const m=el.querySelector('.msgs');if(m)m.scrollTop=1e9;};draw();});}

// gallery & howto & admin
let gfilter='الكل',gq='';
function galleryV(){const groups=['الكل',...new Set(Object.values(CARDS).map(c=>c.g))];const list=Object.values(CARDS).filter(c=>(gfilter==='الكل'||c.g===gfilter)&&(!gq||(c.n+(c.d||'')).includes(gq)));const total=Object.values(CARDS).reduce((s,c)=>s+c.cnt,0);
 return `<div class="wrap stack"><div class="row" style="justify-content:space-between"><h2 style="font-size:32px">معرض البطاقات</h2><button class="btn sm" data-go="back">رجوع</button></div>
 <div class="note">مجموع النسخ المسجّلة <b>${total}</b> بطاقة من أصل 265 المذكورة. ${total!==265?`الفرق ${265-total} بطاقة لم تظهر في الصور المرسلة أو أن عدد نسخ بعضها غير مؤكد؛ يمكن تعديل الأعداد من لوحة التحكم.`:''}</div>
 <input id="gq" placeholder="ابحث باسم البطاقة أو وظيفتها" value="${esc(gq)}"><div class="chips">${groups.map(g=>{const n=Object.values(CARDS).filter(c=>g==='الكل'||c.g===g).reduce((s,c)=>s+c.cnt,0);return `<button class="chip ${g===gfilter?'on':''}" data-gf="${esc(g)}">${esc(g)} (${n})</button>`;}).join('')}</div>
 <div class="gallery">${list.map(c=>`<button class="gc" data-card="${c.id}.0">${`${kimg('img/'+(c.id)+'.jpg',` alt="${esc(c.n)}" loading="lazy"`)}`}<span>${esc(c.n)}</span><span class="cnt">×${c.cnt}${c.review?' • للمراجعة':''}</span></button>`).join('')}</div></div>`;}
function howtoV(){return `<div class="wrap"><div class="row" style="justify-content:space-between"><h2 style="font-size:32px">طريقة اللعب</h2><button class="btn sm" data-go="back">رجوع</button></div><div class="rules">
<h3>البداية</h3><ul><li>توزَّع 5 أوراق لكل لاعب ومهمة واحدة سرية، ويحتفظ كل لاعب بأوراقه سراً.</li><li>بقية الأوراق في المنتصف للسحب.</li></ul>
<h3>الدور</h3><ul><li>قبل اللعب يسحب اللاعب ورقتين (أو خمساً إذا انتهت الأوراق من يده)، ثم يلعب ${(CFG.rules&&CFG.rules.moves)||3} حركات.</li><li>إنزال أرض أو مبلغ في البنك أو أمر في الساحة = حركة. قلب الأرض ذات الوجهين ونقل الجوكر وتحريك البيت والقصر والفندق والشبوك = حركة.</li><li>إذا تجاوزت يدك 7 أوراق بعد السحب، تُحرق الزيادة عشوائياً.</li></ul>
<h3>المجموعات</h3><ul><li>المجموعة أراضٍ من نفس اللون: منها ما يكتمل بـ 4 (المحطات)، أو 3، أو 2.</li><li>عند اكتمال المجموعة يمكن إضافة بيت وفندق وقصر وشبوك. لا يضاف البيت والفندق والقصر إلى المطاعم والمحطات.</li><li>لا يمكن فك المجموعة حتى لو طُلب منك مبلغ.</li><li>إذا سُرقت أرض من مجموعة عليها مبانٍ، تنتقل المباني إلى مجموعة أخرى لديك، وإلا ترجع إلى يدك.</li></ul>
<h3>البنك</h3><ul><li>لا يوضع في البنك إلا المال والفيزا. لا تنزل بطاقات الأوامر في البنك.</li><li>إذا لم يكفِ البنك تدفع من أراضيك خارج المجموعات. لا يعاد الباقي إلا ببطاقة «وين الباقي؟».</li><li>الفيزا تكفي لتسديد أي مبلغ وتنتقل إلى بنك صاحب الطلب.</li></ul>
<h3>المهام</h3><ul><li>المهمة المحققة تُكشف وتُحسب مجموعة كاملة لا يمكن سرقتها أو تدميرها. لا تُسحب مهمة أخرى إلا ببطاقة «صندوق».</li></ul>
<h3>الفوز</h3><ul><li>في اللعب الفردي بـ 4 لاعبين: أول من يجمع 6 مجموعات يفوز.</li></ul>
<h3>الردود</h3><ul><li>البطاقات السوداء لا تُرد إلا بـ «تخسسسي».</li><li>«عكس» فقط على الأوامر الموجهة لك وحدك، ولا يُلعب على المزاد. «روح يمين/يسار» لا يُلعب على المزاد، وإذا كان اللاعب المجاور هو صاحب الأمر يتخطاه.</li><li>«Loading» يؤجل الأمر إلى دورك القادم بعد أن تسحب، ولك الحرية في الرد.</li><li>«تعطيل» مثل «العب بعيد» لكن يمكن الدفاع بها عن أي لاعب.</li><li>«جبها أنت»: صاحب الطلب يدفع لك أنت.</li></ul>
<h3>السجن</h3><ul><li>يُمنع المسجون من اللعب 3 دورات، ويخرج بدفع 2 مليون. إذا لم يملك أرضاً ولا بنكاً: يسحب ورقتين، الأرض والمال لصاحب الأمر والأوامر تُحرق، ثم يلعب ويخرج.</li></ul>
<h3>المزاد</h3><ul><li>صاحب الأمر يأخذ أرضاً (خارج المجموعات) من ثلاثة لاعبين، ولكل أرض مزادها، والمبالغ له، ولا يشارك فيه. إن لم يشترِ أحد تُحرق الأرض. يُرد على المزاد فقط إذا أُخذت أرض منك.</li></ul>
</div></div>`;}


// ---------- العرض
function render(){const app=$('#app');let h='';
 switch(view){case 'home':h=homeV();break;case 'create':h=createV();break;case 'join':h=joinV();break;case 'lobby':h=G?lobbyV():loadingV();break;case 'table':h=G?tableV():loadingV();break;
  case 'gallery':h=galleryV();break;case 'howto':h=howtoV();break;case 'admin':h=adminV();break;case 'login':h=authV('login');break;case 'signup':h=authV('signup');break;case 'profile':h=profileV();break;default:h=homeV();}
 const keep=document.activeElement&&document.activeElement.id&&document.activeElement.tagName==='INPUT'?{id:document.activeElement.id,v:document.activeElement.value,p:document.activeElement.selectionStart}:null;
 app.innerHTML=h;bind();if(view==='table'){layoutHand();renderSide();}if(view==='lobby')renderSide();
 if(keep){const el=document.getElementById(keep.id);if(el&&el.tagName==='INPUT'){el.value=keep.v;el.focus();try{el.setSelectionRange(keep.p,keep.p);}catch(e){}}}}
function acctBar(){if(!ACC.enabled)return `<div class="acct"><span class="muted">تلعب كضيف</span></div>`;
 return ACC.user?`<div class="acct"><span>مرحباً، <b>${esc(ACC.name)}</b></span><button class="btn sm" data-go="profile">حسابي وسجلي</button></div>`:`<div class="acct"><span class="muted">تلعب كضيف</span><button class="btn sm" data-go="login">تسجيل الدخول</button><button class="btn sm" data-go="signup">حساب جديد</button></div>`;}
function homeV(){const fan=['b_takhsi','joker','m20','gr_jarir','b_nuke'];const last=LS.get('room',null);
 return `<div class="page"><div class="wrap narrow">${acctBar()}<div class="hero"><div class="fan" aria-hidden="true">${fan.map((x,k)=>`${kimg('img/'+(x)+'.jpg',` alt="" style="transform:rotate(${(k-2)*9}deg) translateY(${Math.abs(k-2)*8}px)"`)}`).join('')}</div>
 <h1 class="logo">Game of Deals<small>الإصدار الخامس</small></h1></div>
 <div class="menu">${code&&G?`<button class="btn gold" data-go="back2game">ارجع للمباراة ${esc(code)}</button>`:''}<button class="btn gold big" data-go="create">إنشاء غرفة</button><button class="btn big" data-go="join">الانضمام إلى غرفة</button>
 ${!code&&last?`<button class="btn" data-go="rejoin">العودة إلى غرفتك ${esc(last)}</button>`:''}
 <div class="row center"><button class="btn sm" data-go="howto">طريقة اللعب</button><button class="btn sm" data-go="gallery">معرض البطاقات</button></div></div>
 <p class="note">أنشئ غرفة وأرسل رمزها لأصحابك، وهم يفتحون نفس رابط الموقع ويدخلون الرمز. المضيف يخلي الصفحة مفتوحة طول المباراة، وكل لاعب يشوف بطاقاته هو فقط.</p></div></div>`;}
function nameField(){const n=playerName();return n?`<div class="field"><label>اسمك في اللعبة</label><div class="fixed-name">${esc(n)}</div></div>`:`<div class="field"><label for="nm">اسمك في اللعبة</label><input id="nm" maxlength="18" autocomplete="nickname" value="${esc(LS.get('name',''))}" placeholder="مثال: أبو فهد"></div>`;}
function createV(){return `<div class="page"><div class="wrap narrow"><div class="panel stack"><h2>إنشاء غرفة</h2>${nameField()}
 <div class="row"><div class="field grow"><label for="ws">مجموعات الفوز</label><input id="ws" type="number" min="1" max="12" inputmode="numeric" value="${(CFG.rules&&CFG.rules.winSets)||6}"></div><div class="field grow"><label for="mp">أقصى عدد لاعبين</label><select id="mp">${[2,3,4,5,6].map(n=>`<option ${n===4?'selected':''}>${n}</option>`).join('')}</select></div></div>
 <p class="muted small">القواعد: 6 مجموعات للفوز في اللعب الفردي بـ 4 لاعبين، والمهمة المحققة تُحسب مجموعة. الغرفة خاصة ولا يدخلها إلا من عنده الرمز.</p>
 <div class="row"><button class="btn gold" data-go="docreate">إنشاء</button><button class="btn" data-go="home">رجوع</button></div></div></div></div>`;}
function joinV(){return `<div class="page"><div class="wrap narrow"><div class="panel stack"><h2>الانضمام إلى غرفة</h2>
 <div class="field"><label for="jc">رمز الغرفة</label><input id="jc" class="codein" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDE"></div>${nameField()}
 <div class="row"><button class="btn gold" data-go="dojoin">انضمام</button><button class="btn" data-go="home">رجوع</button></div></div></div></div>`;}
function lobbyV(){const S=G;const host=S.host===uid;return `<div class="page"><div class="wrap narrow"><div class="panel stack">
 <div class="row between"><div><div class="muted small">رمز الغرفة</div><div class="code">${esc(S.code)}</div></div><button class="btn" data-go="copy">نسخ الرمز</button></div>
 ${!isHost&&!hostOK?`<div class="note warn">غير متصل بالمضيف، أحاول أعيد الاتصال…</div>`:''}
 <div class="row between"><h3>اللاعبون (${S.players.length}/${S.maxP})</h3><span class="muted small">${S.players.filter(p=>online.has(p.id)).length} متصل</span></div>
 <div class="plist">${S.players.map(p=>`<div class="pl">${av(p.id)}<span class="grow">${esc(p.name)}${p.id===S.host?' <span class="muted small">• المضيف</span>':''}${p.id===uid?' <span class="muted small">• أنت</span>':''}</span><span class="dot ${online.has(p.id)?'on':''}" title="${online.has(p.id)?'متصل':'غير متصل'}"></span>${host&&p.id!==uid?`<button class="btn sm" data-kick="${esc(p.id)}">إخراج</button>`:''}</div>`).join('')}</div>
 <p class="muted">الفوز بجمع <b>${S.cfg.winSets}</b> مجموعات. ${host?'أنت المضيف: المباراة تشتغل من جهازك، فخلّ الصفحة مفتوحة طول اللعب.':'بانتظار أن يبدأ المضيف المباراة.'}</p>
 ${host?`<div class="row"><div class="field grow"><label for="lws">مجموعات الفوز</label><input id="lws" type="number" min="1" max="12" inputmode="numeric" value="${S.cfg.winSets}"></div><button class="btn" data-go="savews">حفظ</button></div><button class="btn gold big" data-go="start" ${S.players.length<2?'disabled':''}>ابدأ المباراة</button>${S.players.length<2?'<p class="muted small">يلزم لاعبان على الأقل.</p>':''}`:''}
 <button class="btn" data-go="leave">${host?'إغلاق الغرفة':'مغادرة الغرفة'}</button></div>
 <div class="panel chatpanel" id="lobbychat"></div></div></div>`;}

// ---------- الطاولة
const SEATS={1:[[50,2]],2:[[87,30],[13,30]],3:[[87,36],[50,2],[13,36]],4:[[87,44],[68,2],[32,2],[13,44]],5:[[88,52],[78,8],[50,1],[22,8],[12,52]]};
// اللاعب التالي حسب اتجاه الدور الحالي (يتغير مع «إعكس الدور»)
function nextOf(S){const o=S.order;const k=o.indexOf(S.turn.p);return o[(k+(S.dir||1)+o.length)%o.length];}
// سهم دائري: الاتجاه 1 = عكس عقارب الساعة على الطاولة (من مقعدك إلى يمينك)، -1 = مع عقارب الساعة
function dirSvg(S,cls){const ccw=(S.dir||1)>0;return `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true" style="${ccw?'transform:scaleX(-1)':''}"><path d="M50 12a38 38 0 1 1-33.6 20.2" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/><path d="M6 20l12 15 15-11" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;}
function seatOrder(S){const o=S.order,k=o.indexOf(uid);if(k<0)return o.slice();const r=[];for(let j=1;j<o.length;j++)r.push(o[(k+j)%o.length]);return r;}
function seatV(u,pos){const S=G,p=S.P[u],st=p.st;const flags=[];if(st.jail>0)flags.push('سجن '+st.jail);if(st.nap>0)flags.push('غفوة');if(st.ebla>0)flags.push('حركة ×'+st.ebla);if(st.tactic>0)flags.push('حركة واحدة');if(st.estq>0)flags.push('سحب ×'+st.estq);if(st.barrier>S.tc)flags.push('حاجز');if(st.open>S.tc)flags.push('مكشوف');if(S.hack&&S.hack.of===u)flags.push('مخترق');
 const tgt=S.pending&&S.pending.queue[0]===u&&S.pending.stage!=='bid';const si=E.setInfo(p);
 const isNext=S.status==='playing'&&nextOf(S)===u&&S.turn.p!==u;
 return `<button class="seat ${S.turn.p===u?'turn':''} ${isNext?'next':''} ${tgt?'tgt':''}" style="left:${pos[0]}%;top:${pos[1]}%" data-pod="${esc(u)}" aria-label="${esc(pname(u))}">
 <span class="sav">${av(u)}<span class="on ${online.has(u)?'y':''}"></span></span>
 <span class="sn">${esc(pname(u))}</span>${isNext?'<span class="nexttag">التالي</span>':''}
 <span class="ss"><span class="mini-back"></span><b>${p.hand.length}</b><span class="sep"></span>🏆<b>${E.score(p)}</b>/${S.cfg.winSets}</span>
 <span class="ss">🏦 <b>${E.bankMoney(p)}M</b>${E.hasVisa(p)?' + فيزا':''}</span>
 <span class="swatches">${Object.keys(si).map(c=>`<span class="swc ${si[c].sets?'full':''}" style="--c:${COLORS[c].hex}">${si[c].n}</span>`).join('')}</span>
 ${flags.length?`<span class="flags">${flags.map(f=>`<span class="flag">${f}</span>`).join('')}</span>`:''}</button>`;}
function fieldV(u){const p=G.P[u];const si=E.setInfo(p);const cols=Object.keys(si);if(!cols.length)return `<div class="muted small empty-field">لا توجد أراضٍ بعد</div>`;
 // كل مجموعة مكتملة في خانة مستقلة، والأراضي الزائدة من نفس اللون تبدأ خانة جديدة
 const landTag=i=>kimg(img(i),` alt="${esc(E.C(i).n)}" data-land="${esc(i)}" data-lo="${esc(u)}"`);
 const out=[];for(const c of cols){const o=si[c];const chunks=[];for(let k=0;k<o.sets;k++)chunks.push({ids:o.inSet.slice(k*o.size,(k+1)*o.size),full:true});if(o.loose.length)chunks.push({ids:o.loose,full:false});
  chunks.forEach((ch,k)=>{const first=k===0;const blds=first&&ch.full?(p.bld[c]||[]):[];const tag=o.sets>1&&ch.full?` (${k+1})`:'';
   out.push(`<div class="grp ${ch.full?'full':''}"><div class="lbl"><span class="dotc" style="background:${COLORS[c].hex}"></span>${COLORS[c].n}${tag} ${ch.ids.length}/${o.size}${first?` • ${E.rentOf(p,c)}M`:''}</div><div class="cards">${ch.ids.map(landTag).join('')}</div>${blds.length?`<div class="blds">${blds.map(b=>`${kimg(img(b),` alt="${esc(E.C(b).n)}" data-bld="${esc(b)}" data-lo="${esc(u)}"`)}`).join('')}</div>`:''}</div>`);});}
 return out.join('');}
let selCard=null;
function tableV(){const S=G;if(!S.P||(!S.P[uid]&&S.status!=='ended'))return `<div class="page"><div class="wrap narrow empty-st">أنت لست لاعباً في هذه المباراة. <button class="btn sm" data-go="leave">رجوع</button></div></div>`;
 if(S.status==='ended')return resultV();
 const T_=S.turn;const myT=T_.ctrl===uid;const hu=viewHandOwner();const hp=S.P[hu];const left=E.movesLeft(S);const opp=seatOrder(S);const pos=SEATS[opp.length]||SEATS[5];
 const hand=hp.hand.slice().sort((a,b)=>order(a)-order(b));const hacked=hu!==uid;const top=S.discard.length?S.discard[S.discard.length-1]:null;const lg=S.log[S.log.length-1];
 const canDraw=myT&&T_.phase==='draw';if(selCard&&!hand.includes(selCard))selCard=null;const meP=S.P[uid];
 const turnTxt=T_.p===uid&&T_.ctrl===uid?'<b class="gold-t">دورك</b>':`دور <b class="gold-t">${esc(pname(T_.p))}</b>${T_.ctrl!==T_.p?` <span class="muted">(يلعبه ${esc(pname(T_.ctrl))})</span>`:''}`;
 const moves=T_.phase==='play'?(T_.unl?'<span class="movesn">حركات مفتوحة</span>':`<span class="moves" aria-label="الحركات المتبقية ${left}">${Array.from({length:Math.max(T_.moves,0)},(_,k)=>`<i class="${k<T_.used?'u':''}"></i>`).join('')}</span>`):'';
 return `<div class="game"><header class="topbar"><div class="turnb">${turnTxt}${moves}</div><span class="dirb" title="اتجاه الدور" aria-label="اتجاه الدور، التالي ${esc(pname(nextOf(S)))}">${dirSvg(S,'dirico')}<span class="dirt">التالي: <b>${nextOf(S)===uid?'أنت':esc(pname(nextOf(S)))}</b></span></span><span class="code-s">${esc(S.code)}</span>
 <button class="icon-btn mobile-only" data-go="log">السجل</button><button class="icon-btn mobile-only" data-go="chat">المحادثة${chatMsgs.length>chatSeen?`<span class="badge">${chatMsgs.length-chatSeen}</span>`:''}</button><button class="icon-btn" data-go="menu" aria-label="القائمة">☰</button></header>
 <div class="gbody"><main class="tablecol">
 <div class="table-area" id="dropzone"><div class="felt">${dirSvg(S,'feltdir')}<span class="wm">GAME OF DEALS</span></div><div class="drophint">ارمِ الأمر هنا</div>${opp.map((u,k)=>seatV(u,pos[k])).join('')}
  <div class="tcenter"><div class="piles"><button class="deck ${canDraw?'can':''}" data-go="draw" aria-label="كومة السحب"><span class="n">${S.deck.length}</span></button>${top?`<button class="top" data-card="${esc(top)}" aria-label="آخر بطاقة: ${esc(E.C(top).n)}">${kimg(img(top),` alt=""`)}<span class="n">محروقة ${S.discard.length}</span></button>`:`<div class="top empty"></div>`}</div>
  ${lastPlayV(S)}${S.pending?`<div class="pend-desk">${pendingV()}</div>`:`<div class="lastlog">${lg?esc(lg.m):''}</div>`}</div></div>
 ${S.pending?`<div class="pendwrap">${pendingV()}</div>`:''}
 ${myT&&T_.phase==='jail'?jailV():''}
 <section class="mezone" id="myzone"><div class="myhint" id="myhint">ارمها هنا</div><div class="mebar">${av(uid)}<b class="grow">${esc(pname(uid))}</b><span>🏆 <b>${E.score(meP)}</b>/${S.cfg.winSets}</span><span>🏦 <b>${E.bankMoney(meP)}M</b>${E.hasVisa(meP)?' + فيزا':''}</span><button class="btn sm" data-go="mymiss">مهماتي (${meP.miss.filter(m=>m.done).length}/${meP.miss.length})</button></div>
 <div class="field-area">${fieldV(uid)}</div>
 ${meP.bank.length?`<div class="bank">${meP.bank.map(i=>E.T(i)==='visa'?`<span class="coin visa">VISA</span>`:`<span class="coin">${E.C(i).v}M</span>`).join('')}</div>`:''}
 ${hacked?`<div class="note warn">أنت تلعب دور ${esc(pname(hu))} الآن (HACKER). أي أمر تلعبه يكون لصالحه.</div>`:''}</section>
 <section class="handzone"><div class="actbar"><span class="info">${hacked?'يد '+esc(pname(hu))+' • ':''}${hand.length} بطاقة${myT&&T_.phase==='play'?` • ${T_.unl?'حركات مفتوحة':'متبقي '+left+' حركات'}`:''}</span><span class="row">${canDraw?`<button class="btn gold" data-go="draw">اسحب ${E.drawCountFor(S,T_.p)}</button>`:''}${myT&&T_.phase==='play'&&!S.pending?`<button class="btn" data-go="end">أنهِ الدور</button>`:''}</span></div>
 <div class="hand" id="hand">${hand.map(i=>{const resp=S.pending&&E.C(i).a&&E.respOK(S,S.pending,uid,E.C(i).a)&&hu===uid;return `<button class="hc ${resp?'resp':''}" data-hc="${esc(i)}" aria-label="${esc(E.C(i).n)}">${kimg(img(i),` alt="" draggable="false"`)}</button>`;}).join('')||'<span class="muted">لا توجد بطاقات</span>'}</div>
 <div class="hint">${hand.length?'الأراضي والفلوس اسحبها لساحتك، والأوامر ارمها في وسط الطاولة، أو اضغط على البطاقة لتشوف تفاصيلها':''}</div></section>
 </main><aside class="side" id="side"></aside></div></div>`;}
function layoutHand(){const box=$('#hand');if(!box)return;const cards=[...box.querySelectorAll('.hc')];const n=cards.length;if(!n){box.style.height='60px';return;}const W=box.clientWidth;
 const desk=window.innerWidth>=960;const cw=Math.round(desk?Math.min(205,window.innerHeight*0.27*400/597):Math.max(96,Math.min(170,W*0.38,window.innerHeight*0.30*400/597)));
 const ch=cw*597/400;box.style.height=Math.round(ch+18)+'px';const Wu=W-16;const step=n>1?Math.min(cw*0.86,(Wu-cw)/(n-1)):0;const total=cw+step*(n-1);const start=(W-total)/2;const mid=(n-1)/2;const ang=Math.min(2.2,14/n);
 cards.forEach((c,k)=>{const off=k-mid;c.style.width=cw+'px';c.style.right=(start+step*k)+'px';c.style.zIndex=10+k;c.style.setProperty('--t',`translateY(${(Math.abs(off)*Math.abs(off)*0.7).toFixed(1)}px) rotate(${(off*ang).toFixed(2)}deg)`);});}
window.addEventListener('resize',()=>{if(view==='table')layoutHand();});
function lastPlayV(S){const ev=(S.evs||[]).slice(-1)[0];if(!ev)return '';return `<button class="lastplay k-${ev.k}" data-card="${esc(ev.c[0])}" aria-label="آخر حركة"><span class="lp-cards">${ev.c.slice(0,3).map(i=>`${kimg(img(i),` alt=""`)}`).join('')}</span><span class="lp-t">${esc(ev.t)}</span></button>`;}
function onHandTap(id){cardModal(id,'hand');}
// السحب والرمي على الطاولة
let drag=null;
// الأراضي والفلوس والمباني تنسحب لساحتك الخاصة (أراضيك والبنك)، والأوامر والردود لوسط الطاولة
const OWN_T=['money','visa','land','dual','joker','build'];
function dropKind(id){const c=E.C(id);const S=G;if(S&&S.pending&&c.a&&E.respOK(S,S.pending,uid,c.a))return 'table';return OWN_T.includes(c.t)?'own':'table';}
function inRect(el,e){if(!el)return false;const r=el.getBoundingClientRect();return e.clientX>r.left&&e.clientX<r.right&&e.clientY>r.top&&e.clientY<r.bottom;}
function handDown(e){const c=e.currentTarget;if(e.button!==undefined&&e.button!==0)return;drag={id:c.dataset.hc,el:c,x:e.clientX,y:e.clientY,on:false,ghost:null};}
function handMove(e){if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
 if(!drag.on){if(Math.hypot(dx,dy)<10)return;drag.on=true;const r=drag.el.getBoundingClientRect();const src=drag.el.querySelector('god-card,img');const g=src.cloneNode(true);g.removeAttribute('style');g.classList.add('ghost');g.style.width=r.width+'px';drag.kind=dropKind(drag.id);const mh=$('#myhint');if(mh){const c=E.C(drag.id);mh.textContent=c.t==='money'||c.t==='visa'?'ارمها هنا: تروح للبنك':c.t==='build'?'ارمها هنا: تنضاف لمجموعة مكتملة':'ارمها هنا: تنزل في أراضيك';}document.body.classList.add(drag.kind==='own'?'drag-own':'drag-table');drag.w=r.width;drag.h=r.height;document.body.appendChild(g);drag.ghost=g;drag.el.classList.add('dragging');document.body.classList.add('is-drag');}
 e.preventDefault();drag.ghost.style.transform=`translate(${e.clientX-drag.w/2}px,${e.clientY-drag.h*0.6}px) rotate(-3deg)`;
 const z=$('#dropzone'),m=$('#myzone');if(z)z.classList.toggle('over',drag.kind==='table'&&inRect(z,e));if(m)m.classList.toggle('over',drag.kind==='own'&&inRect(m,e));}
function handUp(e){if(!drag)return;const d=drag;drag=null;document.body.classList.remove('is-drag','drag-own','drag-table');if(d.ghost)d.ghost.remove();if(d.el)d.el.classList.remove('dragging');
 const z=$('#dropzone'),m=$('#myzone');const onT=inRect(z,e),onM=inRect(m,e);if(z)z.classList.remove('over');if(m)m.classList.remove('over');
 if(!d.on){onHandTap(d.id);return;}
 if(d.kind==='own'){if(onM)dropPlay(d.id);else if(onT)toast('الأراضي والفلوس تنزلها في ساحتك الخاصة تحت، مو في وسط الطاولة','err');return;}
 if(onT)dropPlay(d.id);else if(onM)toast('الأوامر ترميها في وسط الطاولة','err');}
window.addEventListener('pointermove',handMove,{passive:false});window.addEventListener('pointerup',handUp);window.addEventListener('pointercancel',()=>{if(drag){if(drag.ghost)drag.ghost.remove();if(drag.el)drag.el.classList.remove('dragging');drag=null;document.body.classList.remove('is-drag','drag-own','drag-table');}});
function dropPlay(id){const S=G;if(!S||S.status!=='playing')return;const c=E.C(id);
 if(S.pending){if(S.pending.stage!=='bid'&&c.a&&E.respOK(S,S.pending,uid,c.a))return respondWith(id);return toast(E.stageActor(S)===uid?'هذه البطاقة ما تنفع كرد هنا':'فيه أمر قيد الانتظار، انتظر','err');}
 if(!myTurn())return toast(S.turn.ctrl===uid&&S.turn.phase==='draw'?'اسحب بطاقاتك أولاً':'مو دورك','err');
 if(E.movesLeft(S)<=0)return toast('انتهت حركاتك، أنهِ الدور','err');
 if(c.t==='money'||c.t==='visa')return actOn(id,'bank');
 if(['land','dual','joker'].includes(c.t))return actOn(id,'land');
 if(c.t==='build')return actOn(id,'build');
 if(c.a==='burn')return actOn(id,'burn');
 if(E.RESP.includes(c.a))return toast('هذه بطاقة رد، تستخدمها لما يوجَّه لك أمر','err');
 if(c.a==='double'||c.a==='triple')return toast('هذه تُضم مع بطاقة إيجار أو ضريبة: ارمِ الإيجار وبيسألك','err');
 return actOn(id,'play',true);}
// عرض البطاقة الملعوبة للجميع
let evSeen=null,evQ=[],evT=null;
function feedEvents(V){const evs=V.evs||[];const last=evs.length?evs[evs.length-1].n:0;if(evSeen===null||last<evSeen){evSeen=last;return;}
 const fresh=evs.filter(x=>x.n>evSeen);evSeen=last;if(!fresh.length)return;evQ.push(...fresh);if(evQ.length>3)evQ=evQ.slice(-3);if(!evT)nextEv();}
function nextEv(){const box=$('#showcase');const ev=evQ.shift();if(!ev){if(box)box.hidden=true;evT=null;return;}
 if(box){box.className='showcase k-'+ev.k;box.innerHTML=`<div class="sc-in"><div class="sc-cards">${ev.c.map(i=>`${kimg(img(i),` alt=""`)}`).join('')}</div><div class="sc-t">${esc(ev.t)}</div></div>`;box.hidden=false;}
 evT=setTimeout(nextEv,evQ.length?1600:2600);}
function resultV(){const S=G;const dur=Math.round(((S.endedAt||Date.now())-S.startedAt)/60000);const rows=S.order.slice().sort((a,b)=>E.score(S.P[b])-E.score(S.P[a]));
 return `<div class="page"><div class="wrap narrow"><div class="panel result stack"><div class="trophy">${S.winner?'🏆 '+esc(pname(S.winner)):'انتهت المباراة'}</div><p class="muted">${S.winner?`فاز بجمع ${E.score(S.P[S.winner])} مجموعات • `:''}مدة المباراة ${dur} دقيقة • ${S.tc} دورة</p>
 ${rows.map((u,k)=>`<div class="score-row"><span class="row">${k+1}. ${av(u)} ${esc(pname(u))}</span><span>${E.setsCount(S.P[u])} مجموعات + ${E.missionsDone(S.P[u])} مهام</span><span>🏦 ${E.bankMoney(S.P[u])}M</span></div>`).join('')}
 ${ACC.user?'<p class="muted small">انحفظت النتيجة في سجلك.</p>':(ACC.enabled?'<p class="muted small">سجّل حساباً لتحفظ نتائجك.</p>':'')}
 <div class="row center">${S.host===uid?`<button class="btn gold" data-go="restart">إعادة اللعب</button>`:'<span class="muted">المضيف يقدر يعيد اللعب</span>'}<button class="btn" data-go="leave">الصفحة الرئيسية</button></div></div></div></div>`;}
async function menuSheet(){const r=await ask('القائمة',[{v:'howto',label:'طريقة اللعب'},{v:'gallery',label:'معرض البطاقات'},{v:'home',label:'الصفحة الرئيسية (تبقى في المباراة)'},{v:'quit',label:isHost?'إغلاق الغرفة وإنهاء المباراة':'الخروج من المباراة'}]);
 if(r==='home'){view='home';render();}else if(r==='quit'){const ok=await ask(isHost?'إغلاق الغرفة؟ ستنتهي المباراة لكل اللاعبين.':'الخروج من المباراة؟',[{v:1,label:'نعم'}]);if(ok)leaveView();}else if(r){backTo='table';view=r;render();}}
function missSheet(){const p=G.P[uid];sheet(`<h3>مهماتي</h3><p class="muted small">المهمة المحققة تُحسب مجموعة كاملة لا تُسرق ولا تُدمّر.</p><div class="missions">${missionsV(uid,true)}</div><button class="btn wide" data-x="1">إغلاق</button>`,d=>d.querySelector('[data-x]').onclick=()=>closeSheet());}

// ---------- الحسابات
function authV(mode){if(!ACC.enabled)return `<div class="page"><div class="wrap narrow"><div class="panel stack"><h2>الحسابات</h2><p>الحسابات غير مفعّلة في هذا الموقع، وتقدر تلعب كضيف.</p><button class="btn" data-go="home">رجوع</button></div></div></div>`;
 const su=mode==='signup';return `<div class="page"><div class="wrap narrow"><form class="panel stack" id="authf" autocomplete="on"><h2>${su?'حساب جديد':'تسجيل الدخول'}</h2>
 <div class="field"><label for="au">اسم المستخدم</label><input id="au" name="username" autocomplete="username" maxlength="20" required></div>
 <div class="field"><label for="ap">كلمة المرور</label><input id="ap" name="password" type="password" autocomplete="${su?'new-password':'current-password'}" minlength="6" required></div>
 ${su?`<div class="field"><label for="ap2">تأكيد كلمة المرور</label><input id="ap2" type="password" autocomplete="new-password" minlength="6" required></div>`:''}
 <p class="muted small">${su?'اسم المستخدم من 3 إلى 20 حرفاً، وكلمة المرور 6 أحرف على الأقل. ':''}ما نطلب بريد ولا جوال. اسمك ما ينحفظ على الخادم، وكلمة المرور مشفّرة وما يشوفها أحد.${su?' <b>احفظ كلمة المرور</b>: ما يمديك تسترجعها لأنه ما فيه بريد.':''}</p>
 <div class="row"><button class="btn gold" type="submit">${su?'إنشاء الحساب':'دخول'}</button><button class="btn" type="button" data-go="home">رجوع</button></div>
 <p class="small">${su?'عندك حساب؟ <button type="button" class="link" data-go="login">سجّل الدخول</button>':'ما عندك حساب؟ <button type="button" class="link" data-go="signup">أنشئ حساباً</button>'}</p></form></div></div>`;}
let hist=null;
function profileV(){if(!ACC.user)return authV('login');if(!hist){ACC.history().then(r=>{hist=r;if(view==='profile')render();});}
 const rows=hist?hist.rows:[];const n=rows.length,w=rows.filter(r=>r.won).length;const sets=rows.reduce((s,r)=>s+(r.sets||0),0);const mins=rows.reduce((s,r)=>s+(r.minutes||0),0);
 return `<div class="page"><div class="wrap narrow"><div class="panel stack"><div class="row between"><h2>${esc(ACC.name)}</h2><button class="btn sm" data-go="home">رجوع</button></div>
 ${!hist?'<p class="muted">جارٍ تحميل سجلك…</p>':hist.err?`<p class="note warn">${esc(hist.err)}</p>`:`<div class="stats-grid"><div><b>${n}</b><span>مباراة</span></div><div><b>${w}</b><span>فوز</span></div><div><b>${n?Math.round(100*w/n):0}%</b><span>نسبة الفوز</span></div><div><b>${sets}</b><span>مجموعة</span></div><div><b>${Math.round(mins/6)/10}</b><span>ساعة لعب</span></div></div>
 <h3>آخر المباريات</h3>${n?`<div class="tblwrap"><table class="hist"><thead><tr><th>التاريخ</th><th>النتيجة</th><th>اللاعبون</th><th>المجموعات</th><th>المدة</th></tr></thead><tbody>${rows.slice(0,30).map(r=>`<tr><td>${new Date(r.played_at).toLocaleDateString('ar-SA',{day:'numeric',month:'short'})}</td><td class="${r.won?'won':'lost'}">${r.won?'فوز':'خسارة'}</td><td>${r.players}</td><td>${r.sets}</td><td>${r.minutes} د</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">ما لعبت أي مباراة بحسابك بعد.</p>'}`}
 <div class="row"><button class="btn" data-go="chpass">تغيير كلمة المرور</button><button class="btn" data-go="logout">تسجيل الخروج</button><button class="btn red" data-go="delacct">حذف الحساب</button></div></div></div></div>`;}

// ---------- لوحة الإعدادات (تُفتح من الرابط ‎#admin فقط وتُحفظ على هذا الجهاز)
let atab='cards',admDraft=null;
function adminV(){admDraft=admDraft||JSON.parse(JSON.stringify(CFG));admDraft.cards=admDraft.cards||{};admDraft.rules=Object.assign({},E.DEFAULT_RULES,admDraft.rules||{});
 const tabs=`<div class="chips">${[['cards','البطاقات'],['rules','القواعد']].map(([k,l])=>`<button class="chip ${atab===k?'on':''}" data-atab="${k}">${l}</button>`).join('')}</div>`;let body='';
 if(atab==='cards')body=`<div class="tblwrap"><table class="adm"><thead><tr><th></th><th>الاسم</th><th>النسخ</th><th>القيمة</th><th>الوصف</th></tr></thead><tbody>${Object.values(CARDS).map(c=>{const o=admDraft.cards[c.id]||{};return `<tr><td>${kimg('img/'+(c.id)+'.jpg',` alt="" style="width:40px;border-radius:4px"`)}</td><td><input data-ac="${c.id}" data-f="n" value="${esc(o.n||'')}" placeholder="${esc(ORIG[c.id].n)}"></td><td style="width:64px"><input data-ac="${c.id}" data-f="cnt" type="number" min="0" value="${o.cnt!=null?o.cnt:''}" placeholder="${ORIG[c.id].cnt}"></td><td style="width:64px"><input data-ac="${c.id}" data-f="v" type="number" min="0" value="${o.v!=null?o.v:''}" placeholder="${ORIG[c.id].v||0}"></td><td style="min-width:220px"><input data-ac="${c.id}" data-f="d" value="${esc(o.d||'')}" placeholder="${esc(ORIG[c.id].d||'')}"></td></tr>`;}).join('')}</tbody></table></div><p class="muted small">الحقول الفارغة تستخدم القيمة الأصلية. التعديلات تنحفظ على هذا الجهاز وتنطبق على الغرف اللي تنشئها منه.</p><button class="btn gold" data-go="admsave">حفظ</button>`;
 if(atab==='rules'){const r=admDraft.rules;const f=[['moves','عدد الحركات في الدور'],['draw','السحب في بداية الدور'],['drawEmpty','السحب عند انتهاء الأوراق'],['handLimit','الحد الأقصى لأوراق اليد'],['winSets','مجموعات الفوز (افتراضي)'],['jailTurns','دورات السجن'],['jailFee','رسوم الخروج من السجن (مليون)'],['timeout','مهلة الرد (ثانية)']];body=`<div class="stack" style="max-width:420px">${f.map(([k,l])=>`<div class="field"><label for="ar_${k}">${l}</label><input id="ar_${k}" data-ar="${k}" type="number" min="0" value="${r[k]}"></div>`).join('')}<button class="btn gold" data-go="admsave">حفظ القواعد</button></div>`;}
 return `<div class="page"><div class="wrap stack"><div class="row between"><h2>الإعدادات المتقدمة</h2><button class="btn sm" data-go="home">رجوع</button></div>${tabs}${body}</div></div>`;}

// ---------- الربط
function bind(){const app=$('#app');
 app.querySelectorAll('[data-go]').forEach(b=>b.onclick=e=>{e.preventDefault();go(b.dataset.go);});
 app.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>cardModal(b.dataset.card,'view'));
 app.querySelectorAll('[data-hc]').forEach(b=>{b.onpointerdown=handDown;b.onclick=e=>e.preventDefault();b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onHandTap(b.dataset.hc);}};});
 app.querySelectorAll('[data-pod]').forEach(b=>b.onclick=()=>podSheet(b.dataset.pod));
 app.querySelectorAll('[data-land]').forEach(b=>b.onclick=()=>landTap(b.dataset.land,b.dataset.lo));
 app.querySelectorAll('[data-bld]').forEach(b=>b.onclick=()=>bldTap(b.dataset.bld,b.dataset.lo));
 app.querySelectorAll('[data-kick]').forEach(b=>b.onclick=async()=>{const w=b.dataset.kick;if(await commit({type:'kick',who:w})&&conns[w]){try{conns[w].send({t:'err',m:'أخرجك المضيف من الغرفة'});}catch(e){}setTimeout(()=>{try{conns[w].close();}catch(e){}},300);}});
 app.querySelectorAll('[data-gf]').forEach(b=>b.onclick=()=>{gfilter=b.dataset.gf;render();});
 const q=$('#gq');if(q)q.oninput=()=>{gq=q.value;render();};
 app.querySelectorAll('[data-atab]').forEach(b=>b.onclick=()=>{atab=b.dataset.atab;render();});
 app.querySelectorAll('[data-ac]').forEach(i=>i.onchange=()=>{const id=i.dataset.ac,f=i.dataset.f;admDraft.cards[id]=admDraft.cards[id]||{};if(i.value==='')delete admDraft.cards[id][f];else admDraft.cards[id][f]=f==='cnt'||f==='v'?+i.value:i.value;});
 app.querySelectorAll('[data-ar]').forEach(i=>i.onchange=()=>{admDraft.rules[i.dataset.ar]=+i.value;});
 const jc=$('#jc');if(jc)jc.oninput=()=>{const p=jc.selectionStart;jc.value=jc.value.toUpperCase().replace(/[^A-Z0-9]/g,'');try{jc.setSelectionRange(p,p);}catch(e){}};
 const af=$('#authf');if(af)af.onsubmit=async e=>{e.preventDefault();const u=$('#au').value,p=$('#ap').value;const btn=af.querySelector('[type=submit]');
  if(view==='signup'&&p!==$('#ap2').value)return toast('كلمتا المرور غير متطابقتين','err');btn.disabled=true;const err=view==='signup'?await ACC.signUp(u,p):await ACC.signIn(u,p);btn.disabled=false;
  if(err)return toast(err,'err');hist=null;toast(view==='signup'?'تم إنشاء حسابك':'أهلاً '+ACC.name,'good');view='home';render();};
 app.querySelectorAll('input:not([type=checkbox])').forEach(i=>{if(i.closest('form'))return;i.onkeydown=e=>{if(e.key==='Enter'){const b=app.querySelector('.btn.gold');if(b)b.click();}};});}
let backTo='home';
async function go(k){switch(k){
 case 'home':view='home';render();break;case 'create':view='create';render();break;case 'join':view='join';render();break;
 case 'back2game':view=G.status==='lobby'?'lobby':'table';render();break;
 case 'login':view='login';render();break;case 'signup':view='signup';render();break;case 'profile':hist=null;view='profile';render();break;
 case 'logout':await ACC.signOut();toast('سجّلت الخروج');view='home';render();break;
 case 'chpass':{const h=`<h3>تغيير كلمة المرور</h3><div class="field"><label for="np">كلمة المرور الجديدة</label><input id="np" type="password" minlength="6" autocomplete="new-password"></div><div class="row"><button class="btn gold" data-v="ok">حفظ</button><button class="btn" data-v="x">إلغاء</button></div>`;
  let val='';const r=await sheet(h,d=>d.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{val=d.querySelector('#np').value;closeSheet(b.dataset.v);}));if(r!=='ok')break;const e=await ACC.changePassword(val);toast(e||'تم تغيير كلمة المرور',e?'err':'good');break;}
 case 'delacct':{const ok=await ask('حذف الحساب نهائياً؟',[{v:1,label:'نعم، احذف حسابي وكل سجلي'}],{sub:'ما يمديك تتراجع بعد الحذف.'});if(!ok)break;const e=await ACC.deleteAccount();toast(e||'انحذف حسابك',e?'err':'good');if(!e){view='home';render();}break;}
 case 'rejoin':{const c=LS.get('room',null);if(c)enterRoom(c);break;}
 case 'howto':backTo=view==='table'?'table':'home';view='howto';render();break;case 'gallery':backTo=view==='table'?'table':'home';view='gallery';render();break;
 case 'back':view=backTo==='table'&&G?(G.status==='lobby'?'lobby':'table'):'home';render();break;
 case 'docreate':createRoom(($('#nm')||{}).value,$('#ws').value,$('#mp').value);break;
 case 'dojoin':joinRoom($('#jc').value,($('#nm')||{}).value);break;
 case 'copy':try{await navigator.clipboard.writeText(G.code);toast('نُسخ الرمز');}catch(e){toast('الرمز: '+G.code);}break;
 case 'savews':commit({type:'settings',winSets:+$('#lws').value});break;
 case 'start':commit({type:'start'});break;
 case 'leave':if(!isHost&&G&&G.status==='lobby'&&hostOK)await commit({type:'leave'});leaveView();break;
 case 'restart':if(await commit({type:'restart'}))view='lobby';render();break;
 case 'draw':if(G.turn.ctrl===uid&&G.turn.phase==='draw')commit({type:'draw'});else toast('السحب في بداية دورك فقط');break;
 case 'end':selCard=null;commit({type:'end'});break;
 case 'mymiss':missSheet();break;
 case 'pending':pendingAction();break;
 case 'defend':{const p=G.P[uid];const cs=p.hand.filter(x=>E.C(x).a&&E.respOK(G,G.pending,uid,E.C(x).a));const r=await ask('دافع عن '+pname(G.pending.queue[0]),cs.map(x=>({v:x,label:E.C(x).n,img:img(x)})));if(r)commit({type:'respond',card:r});break;}
 case 'jailpay':commit({type:'jailPay'});break;case 'jailwait':commit({type:'jailWait'});break;case 'jailbroke':commit({type:'jailBroke'});break;
 case 'log':sideSheet('log');break;case 'chat':sideSheet('chat');break;case 'menu':menuSheet();break;
 case 'admsave':CFG=admDraft;LS.set('cfg',CFG);applyCfg();toast('تم الحفظ على هذا الجهاز','good');admDraft=null;render();break;
}}
async function init(){applyCfg();if(location.hash==='#admin')view='admin';render();
 // Firebase (إذا مفعّل): هوية اللاعب = هويته في Firebase، والغرف تمر عبر قاعدة البيانات
 if(FB.enabled){const u=await FB.ready.catch(()=>null);if(u&&FB.uid){NET.mode='fb';uid=FB.uid;}else if(FB.readyErr)toast(FB.errMsg(FB.readyErr)+' — سيتم الاتصال المباشر بدلاً من ذلك','err');}
 await ACC.init().catch(()=>{});ACC.onChange(()=>{if(NET.mode==='fb'&&FB.uid&&!code)uid=FB.uid;hist=null;render();});render();const c=LS.get('room',null);if(c&&view!=='admin')enterRoom(c);}
window.addEventListener('hashchange',()=>{if(location.hash==='#admin'){view='admin';render();}});
init();
