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

// Notification Click panna app-ah thiranthu antha URL-ku poga vaikura magic!
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // Notification la irunthu bikeId eduukurom (backend la irunthu varanum)
  const clickAction = event.notification.data?.click_action || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // App already open-la iruntha antha tab-ah focus panni URL maathum
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes('jp-bikes') && 'focus' in client) {
          return client.focus().then(() => client.navigate(clickAction));
        }
      }
      // App open aagalana puthusa open pannum
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});