// إعدادات الموقع — هذا الملف الوحيد اللي تعدّله.
// لتفعيل الحسابات وسجل اللعب والغرف عبر Firebase:
//   انسخ القيم من Firebase Console ← Project settings ← Your apps ← SDK setup and configuration ← Config
//   والصقها هنا بنفس الأسماء. (الخطوات كاملة في README.md)
// إذا تركتها فاضية يشتغل الموقع باللعب كضيف والاتصال المباشر بين الأجهزة.
window.GOD_CONFIG = {
  firebase: {
    apiKey: '',            // مثال: 'AIzaSyB...'
    authDomain: '',        // مثال: 'game-of-deals-123.firebaseapp.com'
    databaseURL: '',       // مهم جداً، مثال: 'https://game-of-deals-123-default-rtdb.europe-west1.firebasedatabase.app'
    projectId: '',         // مثال: 'game-of-deals-123'
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  }
};
