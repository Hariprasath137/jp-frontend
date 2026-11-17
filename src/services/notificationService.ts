import { getToken } from "firebase/messaging";
import { doc, setDoc } from "firebase/firestore";
import { messaging, db } from "../firebase/config";

export const requestPushPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // NOTE: Inga unga VAPID key podanum (Step 4 la epdi edukrathu nu solren)
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      
      if (token) {
        // Token kedaichathum, database-la save pandrom
        await setDoc(doc(db, 'admin_tokens', 'main_admin'), { 
          token: token, 
          updatedAt: new Date() 
        });
        console.log("Token successfully saved to DB!");
      }
    }
  } catch (error) {
    console.error("Push notification error:", error);
  }
};