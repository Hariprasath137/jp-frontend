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

// 1. Background la popup kaatura Code
messaging.onBackgroundMessage((payload) => {
  console.log('Background Message Payload:', payload);
  
  const title = payload.notification?.title || payload.data?.title || 'MotoTrack Alert';
  const options = {
    body: payload.notification?.body || payload.data?.body || 'New update received',
    icon: 'https://cdn-icons-png.flaticon.com/512/2950/2950664.png',
    data: { bikeId: payload.data?.bikeId } // Click panna thevayana ID
  };

  self.registration.showNotification(title, options);
});

// 2. Notification-ah Touch Panna, App open aagi Page ku kootitu pogum Code
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const bikeId = event.notification.data?.bikeId;
  const clickAction = bikeId ? `/bike/${bikeId}` : '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('jp-bikes') && 'focus' in client) {
          return client.focus().then(() => client.navigate(clickAction));
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});