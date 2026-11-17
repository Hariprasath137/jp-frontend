// src/services/bikeService.ts
import { collection, addDoc, getDocs, query, orderBy, doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { Bike } from "../types";

// Puthu bike data-va Firestore-la 'bikes' table(collection)-la save pandrom
export const addNewBike = async (bikeData: Omit<Bike, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, "bikes"), {
      ...bikeData,
      createdAt: Date.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error("Error adding bike: ", error);
    throw error;
  }
};

export const getBikes = async (): Promise<Bike[]> => {
  try {
    // Latest aaga add panna bike first varanum (descending order)
    const q = query(collection(db, "bikes"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const bikes: Bike[] = [];
    querySnapshot.forEach((doc) => {
      // Firebase tharra id-ah namba object kulla vekkurom
      bikes.push({ id: doc.id, ...doc.data() } as Bike);
    });
    
    return bikes;
  } catch (error) {
    console.error("Error fetching bikes: ", error);
    throw error;
  }
};

export const getBikeById = async (id: string): Promise<Bike | null> => {
  try {
    const docRef = doc(db, "bikes", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Bike;
    }
    return null;
  } catch (error) {
    console.error("Error fetching bike details: ", error);
    throw error;
  }
};


export const updateBike = async (id: string, updateData: Partial<Bike>) => {
  try {
    const docRef = doc(db, "bikes", id);
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating bike: ", error);
    throw error;
  }
};