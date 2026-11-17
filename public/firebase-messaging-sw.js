importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCQWUDdYEaUK1kSk6KIrMWVBG0yLF6FLyU",
  authDomain: "jp-bikes.firebaseapp.com",
  projectId: "jp-bikes",
  storageBucket: "jp-bikes.firebasestorage.app",
  messagingSenderId: "686965028440",
  appId: "1:686965028440:web:0fd6367d5890de46bd3c2d"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();


// messaging.onBackgroundMessage((payload) => {
//   console.log('Background Message:', payload);
//   const notificationTitle = payload.notification.title;
//   const notificationOptions = {
//     body: payload.notification.body,
//     icon: '/vite.svg'
//   };

//   self.registration.showNotification(notificationTitle, notificationOptions);
// });