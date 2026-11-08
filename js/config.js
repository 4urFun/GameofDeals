// إعدادات الموقع — هذا الملف الوحيد اللي تعدّله.
// لتفعيل الحسابات وسجل اللعب والغرف عبر Firebase:
//   انسخ القيم من Firebase Console ← Project settings ← Your apps ← SDK setup and configuration ← Config
//   والصقها هنا بنفس الأسماء. (الخطوات كاملة في README.md)
// إذا تركتها فاضية يشتغل الموقع باللعب كضيف والاتصال المباشر بين الأجهزة.
window.GOD_CONFIG = {
  firebase: {
    apiKey: 'AIzaSyB1qSDv4Kr3RrdgtDlpOCLAG-eB0kos5wU',            // مثال: 'AIzaSyB...'
    authDomain: 'game-of-deals-53f22.firebaseapp.com',        // مثال: 'game-of-deals-123.firebaseapp.com'
    databaseURL: 'https://game-of-deals-53f22-default-rtdb.europe-west1.firebasedatabase.app',       // مهم جداً، مثال: 'https://game-of-deals-123-default-rtdb.europe-west1.firebasedatabase.app'
    projectId: 'game-of-deals-53f22',         // مثال: 'game-of-deals-123'
    storageBucket: 'game-of-deals-53f22.firebasestorage.app',
    messagingSenderId: '966400595569',
    appId: '1:966400595569:web:34fd1585194f0d1dabadd0'
  }
};
