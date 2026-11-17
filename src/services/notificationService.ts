// src/services/notificationService.ts
import { getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { messaging, db } from "../firebase/config";

export const requestPushPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      
      // Get the token using VAPID key
      const currentToken = await getToken(messaging, { 
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY 
      });
      
      if (currentToken) {
        // Token-ah "admin_tokens" table-la save pandrom (Backend ithai thedi thaan message anuppum)
        await setDoc(doc(db, "admin_tokens", "main_admin"), {
          token: currentToken,
          updatedAt: new Date().toISOString(),
          platform: 'web'
        });
        console.log("Push Token Saved Successfully!");
      } else {
        console.log("No registration token available.");
      }
    } else {
      console.log("Notification permission denied.");
    }
  } catch (error) {
    console.error("Error getting push token", error);
  }
};