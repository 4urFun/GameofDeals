/* الحسابات وسجل اللعب (Firebase)
   الخصوصية:
   - اسم المستخدم لا يُخزَّن في أي مكان على الخادم. نحوّله إلى بصمة SHA-256 غير قابلة للعكس
     ونستخدمها كمعرّف دخول، فصاحب الموقع لا يرى في لوحة Firebase إلا بصمات عشوائية.
   - كلمة المرور يشفّرها Firebase ولا يراها أحد، ولا حتى صاحب المشروع.
   - لا بريد حقيقي ولا جوال ولا أي بيانات شخصية.
   - كل لاعب يقرأ ويكتب سجله هو فقط (قواعد الأمان في database.rules.json).
   - الحساب الجديد يحتفظ بنفس هوية اللاعب المجهولة، فما تضيع مباراتك لو سجّلت أثناء اللعب. */
const ACC=(()=>{
 let user=null,name=null;const listeners=[];
 const PEPPER='game-of-deals-5|';
 const enabled=()=>FB.enabled;
 // نوحّد الكتابة: أ/إ/آ = ا ، ى = ي ، بدون تشكيل أو تطويل، والحروف الإنجليزية الصغيرة = الكبيرة
 function norm(n){return String(n||'').normalize('NFC').replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/\s+/g,' ').trim().toLowerCase();}
 function validName(n){const x=String(n||'').trim();if(x.length<3||x.length>20)return 'اسم المستخدم من 3 إلى 20 حرفاً';if(!/^[\p{L}\p{N}_ .-]+$/u.test(x))return 'اسم المستخدم يقبل الحروف والأرقام والمسافة و _ . - فقط';return null;}
 async function idFor(n){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(PEPPER+norm(n)));const h=[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');return 'u'+h.slice(0,40)+'@players.example.com';}
 function emit(){listeners.forEach(f=>{try{f();}catch(e){}});}
 function msg(e){const c=(e&&e.code)||'';
  if(c==='auth/email-already-in-use'||c==='auth/credential-already-in-use'||c==='auth/provider-already-linked')return 'اسم المستخدم مستخدم، اختر اسماً آخر';
  if(['auth/invalid-credential','auth/wrong-password','auth/user-not-found','auth/invalid-login-credentials','auth/invalid-email'].includes(c))return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  if(c==='auth/weak-password')return 'كلمة المرور ضعيفة: 6 أحرف على الأقل';
  if(c==='auth/requires-recent-login')return 'لأمان حسابك: سجّل خروج ثم ادخل مرة ثانية، وبعدها أعد المحاولة';
  return FB.errMsg(e);}
 const real=u=>u&&!u.isAnonymous?u:null;
 // لا نغيّر الهوية وأنت داخل غرفة، لأن مقعدك في المباراة مربوط بها
 const busy=()=>typeof window.GOD_inRoom==='function'&&window.GOD_inRoom();
 async function init(){if(!enabled())return;await FB.ready;const a=FB.auth;if(!a)return;
  user=real(a.currentUser);name=user?LS.get('acct_name_'+user.uid,null):null;
  a.onAuthStateChanged(u=>{const r=real(u);if((r&&r.uid)!==(user&&user.uid)){user=r;name=r?LS.get('acct_name_'+r.uid,name):null;emit();}});emit();}
 async function signUp(n,p){if(!enabled())return 'الحسابات غير مفعّلة في هذا الموقع';const v=validName(n);if(v)return v;if(String(p).length<6)return 'كلمة المرور 6 أحرف على الأقل';
  try{await FB.ready;const a=FB.auth;if(!a)return FB.errMsg(FB.readyErr);const email=await idFor(n);
   const cur=a.currentUser;let u;
   if(cur&&cur.isAnonymous){const cred=firebase.auth.EmailAuthProvider.credential(email,p);u=(await cur.linkWithCredential(cred)).user;}
   else{if(busy())return 'اطلع من الغرفة أولاً ثم سجّل';u=(await a.createUserWithEmailAndPassword(email,p)).user;}
   user=u;name=String(n).trim();LS.set('acct_name_'+u.uid,name);emit();return null;}catch(e){return msg(e);}}
 async function signIn(n,p){if(!enabled())return 'الحسابات غير مفعّلة في هذا الموقع';if(!String(n).trim()||!p)return 'اكتب اسم المستخدم وكلمة المرور';if(busy())return 'اطلع من الغرفة أولاً ثم سجّل دخولك';
  try{await FB.ready;const a=FB.auth;if(!a)return FB.errMsg(FB.readyErr);const r=await a.signInWithEmailAndPassword(await idFor(n),p);user=r.user;name=String(n).trim();LS.set('acct_name_'+user.uid,name);emit();return null;}catch(e){return msg(e);}}
 async function signOut(){if(busy()){toast('اطلع من الغرفة أولاً','err');return;}const a=FB.auth;if(a){await a.signOut().catch(()=>{});try{await a.signInAnonymously();}catch(e){}}user=null;name=null;emit();}
 async function changePassword(p){if(String(p).length<6)return 'كلمة المرور 6 أحرف على الأقل';try{await FB.auth.currentUser.updatePassword(p);return null;}catch(e){return msg(e);}}
 async function deleteAccount(){if(busy())return 'اطلع من الغرفة أولاً';const u=FB.auth&&FB.auth.currentUser;if(!real(u))return 'لا يوجد حساب';const id=u.uid;
  try{await FB.db.ref('users/'+id).remove();await u.delete();}catch(e){return msg(e);}
  LS.set('acct_name_'+id,null);user=null;name=null;try{await FB.auth.signInAnonymously();}catch(e){}emit();return null;}
 async function record(r){if(!user)return;try{await FB.db.ref('users/'+user.uid+'/results').push({t:firebase.database.ServerValue.TIMESTAMP,players:r.players|0,won:!!r.won,sets:r.sets|0,rounds:r.rounds|0,minutes:r.minutes|0});}catch(e){}}
 async function history(){if(!user)return {rows:[],err:null};
  try{const s=await FB.db.ref('users/'+user.uid+'/results').orderByChild('t').limitToLast(500).once('value');const rows=[];s.forEach(c=>{const v=c.val()||{};rows.push({played_at:new Date(v.t||0).toISOString(),players:v.players,won:!!v.won,sets:v.sets,rounds:v.rounds,minutes:v.minutes});});rows.reverse();return {rows,err:null};}
  catch(e){return {rows:[],err:msg(e)};}}
 // تفضيلات اللاعب (مثل التصميم) تنحفظ مع حسابه
 async function savePref(k,v){if(!user)return;try{await FB.db.ref('users/'+user.uid+'/prefs/'+k).set(v);}catch(e){}}
 async function loadPref(k){if(!user)return null;try{const s=await FB.db.ref('users/'+user.uid+'/prefs/'+k).once('value');return s.val();}catch(e){return null;}}
 return {savePref,loadPref,get enabled(){return enabled();},get user(){return user;},get name(){return name;},init,signUp,signIn,signOut,changePassword,deleteAccount,record,history,validName,onChange(f){listeners.push(f);}};
})();
