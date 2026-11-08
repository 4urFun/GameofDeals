/* Game of Deals — الاتصال بـ Firebase (اختياري)
   إذا عبّيت إعدادات Firebase في js/config.js:
   - كل لاعب يحصل على هوية مجهولة (Anonymous) تلقائياً بدون أي بيانات شخصية.
   - الغرف تمر عبر Firebase Realtime Database بدل الاتصال المباشر بين الأجهزة،
     فيدخل الجميع اللوبي حتى لو كانت شبكة الجوال تمنع الاتصال المباشر.
   - الحسابات (اسم مستخدم + كلمة مرور) وسجل اللعب تنحفظ في Firebase.
   إذا تركت الإعدادات فاضية، يشتغل الموقع بالاتصال المباشر (PeerJS) واللعب كضيف. */
const FB=(()=>{
 const C=(window.GOD_CONFIG||{}).firebase||{};
 const has=!!(C.apiKey&&C.databaseURL&&C.projectId&&window.firebase&&window.firebase.initializeApp);
 let app=null,auth=null,db=null,readyErr=null;
 const ready=(async()=>{
  if(!has)return null;
  try{app=firebase.initializeApp(C);auth=firebase.auth();db=firebase.database();}catch(e){readyErr=e;return null;}
  try{await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);}catch(e){}
  // ننتظر استرجاع الجلسة المحفوظة، وإذا ما فيه جلسة ندخل بهوية مجهولة
  const u=await new Promise(res=>{const off=auth.onAuthStateChanged(x=>{off();res(x);});});
  if(u)return u;
  try{const r=await auth.signInAnonymously();return r.user;}catch(e){readyErr=e;return null;}
 })();
 function errMsg(e){const c=(e&&e.code)||'';const m=(e&&e.message)||'';
  if(c==='auth/operation-not-allowed'||c==='auth/admin-restricted-operation')return 'إعداد Firebase ناقص: فعّل «Anonymous» و«Email/Password» من Authentication ← Sign-in method';
  if(c==='auth/network-request-failed')return 'تعذّر الاتصال بالخادم، تأكد من الإنترنت';
  if(c==='auth/too-many-requests')return 'محاولات كثيرة، انتظر قليلاً ثم حاول';
  if(/PERMISSION_DENIED|permission/i.test(m+c))return 'الخادم رفض العملية. تأكد أنك نسخت قواعد الأمان (database.rules.json) في Firebase';
  return 'حدث خطأ: '+(c||m);}
 return {get enabled(){return has;},get auth(){return auth;},get db(){return db;},ready,get readyErr(){return readyErr;},errMsg,
  get uid(){return auth&&auth.currentUser?auth.currentUser.uid:null;}};
})();
