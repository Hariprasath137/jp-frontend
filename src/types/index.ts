// src/types/index.ts

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  address?: string;
  idProofUrl?: string;
}

export interface BikeDocument {
  id: string;
  name: string;
  url: string;
}

export interface Bike {
  id?: string;

  // Basic Details
  make: string;
  model: string;
  year: string;
  regNo: string;
  kmDriven: number;
  pendingChallan: number;
  notes?: string;

  // Purchase Details
  purchaseDate: string;
  purchasePrice: number;
  sellerName: string;
  sellerPhone: string;

  // Stock Status
  status: "in-stock" | "sold" | "returned";
  expenses: Expense[];
  returnedDate?: string;
  returnReason?: string;

  // Media (Photos & Dynamic Docs)
  images: string[];
  documents?: BikeDocument[];

  // Legacy fields (Old bikes backward compatibility)
  rcFrontUrl?: string;
  rcBackUrl?: string;
  insuranceUrl?: string;
  sellerIdProofUrl?: string;

  // Sales Details
  soldDate?: string;
  soldPrice?: number;
  customer?: CustomerDetails;

  createdAt: number;
}