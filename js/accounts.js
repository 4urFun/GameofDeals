/* الحسابات وسجل اللعب (Supabase)
   الخصوصية:
   - اسم المستخدم لا يُخزَّن في أي مكان على الخادم. نحوّله إلى بصمة SHA-256 غير قابلة للعكس
     ونستخدمها كمعرّف دخول، فصاحب الموقع لا يرى في لوحة Supabase إلا بصمات عشوائية.
   - كلمة المرور يشفّرها Supabase (bcrypt) ولا يراها أحد.
   - لا بريد ولا جوال ولا أي بيانات شخصية.
   - كل لاعب يقرأ ويكتب سجله هو فقط (Row Level Security).
   - معرّف الحساب لا يُرسل أبداً للاعبين الآخرين داخل المباراة. */
const ACC=(()=>{
 const C=window.GOD_CONFIG||{};let sb=null,user=null,name=null;const listeners=[];
 const enabled=!!(C.supabaseUrl&&C.supabaseAnonKey&&window.supabase&&window.supabase.createClient);
 const PEPPER='game-of-deals-5|';
 function norm(n){return String(n||'').normalize('NFC').replace(/\s+/g,' ').trim().toLowerCase();}
 function validName(n){const x=String(n||'').trim();if(x.length<3||x.length>20)return 'اسم المستخدم من 3 إلى 20 حرفاً';if(!/^[\p{L}\p{N}_ .-]+$/u.test(x))return 'اسم المستخدم يقبل الحروف والأرقام والمسافة و _ . - فقط';return null;}
 async function idFor(n){const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(PEPPER+norm(n)));const h=[...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');return 'u'+h.slice(0,40)+'@players.example.com';}
 function emit(){listeners.forEach(f=>{try{f();}catch(e){}});}
 function msg(e){const m=(e&&e.message)||'';
  if(/already registered|already exists/i.test(m))return 'اسم المستخدم مستخدم، اختر اسماً آخر';
  if(/invalid login|invalid credentials/i.test(m))return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  if(/password.*(at least|short|weak)/i.test(m))return 'كلمة المرور ضعيفة: 6 أحرف على الأقل';
  if(/rate limit|too many/i.test(m))return 'محاولات كثيرة، انتظر قليلاً ثم حاول';
  if(/email not confirmed/i.test(m))return 'إعداد Supabase ناقص: عطّل «Confirm email» من إعدادات المصادقة';
  if(/signups not allowed|signup.*disabled/i.test(m))return 'التسجيل مغلق في إعدادات Supabase';
  if(/fetch|network/i.test(m))return 'تعذّر الاتصال بالخادم، تأكد من الإنترنت';
  return 'حدث خطأ: '+m;}
 async function init(){if(!enabled)return;
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'god_auth'}});
  try{const {data}=await sb.auth.getSession();user=data.session?data.session.user:null;}catch(e){user=null;}
  name=user?LS.get('acct_name_'+user.id,null):null;if(user&&!name){await sb.auth.signOut().catch(()=>{});user=null;}
  sb.auth.onAuthStateChange((_e,s)=>{const u=s?s.user:null;if((u&&u.id)!==(user&&user.id)){user=u;name=u?LS.get('acct_name_'+u.id,name):null;emit();}});emit();}
 async function signUp(n,p){if(!enabled)return 'الحسابات غير مفعّلة في هذا الموقع';const v=validName(n);if(v)return v;if(String(p).length<6)return 'كلمة المرور 6 أحرف على الأقل';
  try{const {data,error}=await sb.auth.signUp({email:await idFor(n),password:p});if(error)return msg(error);
   if(!data.session){const r=await sb.auth.signInWithPassword({email:await idFor(n),password:p});if(r.error)return msg(r.error);data.session=r.data.session;}
   user=data.session.user;name=String(n).trim();LS.set('acct_name_'+user.id,name);emit();return null;}catch(e){return msg(e);}}
 async function signIn(n,p){if(!enabled)return 'الحسابات غير مفعّلة في هذا الموقع';if(!String(n).trim()||!p)return 'اكتب اسم المستخدم وكلمة المرور';
  try{const {data,error}=await sb.auth.signInWithPassword({email:await idFor(n),password:p});if(error)return msg(error);user=data.user;name=String(n).trim();LS.set('acct_name_'+user.id,name);emit();return null;}catch(e){return msg(e);}}
 async function signOut(){if(sb)await sb.auth.signOut().catch(()=>{});user=null;name=null;emit();}
 async function changePassword(p){if(String(p).length<6)return 'كلمة المرور 6 أحرف على الأقل';const {error}=await sb.auth.updateUser({password:p});return error?msg(error):null;}
 async function deleteAccount(){const {error}=await sb.rpc('delete_me');if(error)return msg(error);const id=user&&user.id;await signOut();if(id)LS.set('acct_name_'+id,null);return null;}
 async function record(r){if(!user)return;try{await sb.from('game_results').insert({players:r.players,won:!!r.won,sets:r.sets|0,rounds:r.rounds|0,minutes:r.minutes|0});}catch(e){}}
 async function history(){if(!user)return {rows:[],err:null};const {data,error}=await sb.from('game_results').select('played_at,players,won,sets,rounds,minutes').order('played_at',{ascending:false}).limit(500);return {rows:data||[],err:error?msg(error):null};}
 return {get enabled(){return enabled;},get user(){return user;},get name(){return name;},init,signUp,signIn,signOut,changePassword,deleteAccount,record,history,validName,onChange(f){listeners.push(f);}};
})();
