importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyCtAwKrPkUNiPXINi5Jj5Q5lOsGD8mqC7E",
  authDomain: "jp-bikes-126ad.firebaseapp.com",
  projectId: "jp-bikes-126ad",
  storageBucket: "jp-bikes-126ad.firebasestorage.app",
  messagingSenderId: "589340720111",
  appId: "1:589340720111:web:aef8149e714e05c41f141a"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || 'MotoTrack Alert';
  self.registration.showNotification(title, {
    body: payload.notification?.body || payload.data?.body || 'New update received',
    icon: 'https://cdn-icons-png.flaticon.com/512/2950/2950664.png',
    data: { bikeId: payload.data?.bikeId } 
  });
});

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
      if (clients.openWindow) return clients.openWindow(clickAction);
    })
  );
});