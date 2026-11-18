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

export interface Bike {
  id?: string;
  
  // Basic Details
  make: string;
  model: string;
  year: string;
  regNo: string;
  kmDriven: number;
  pendingChallan: number;
  notes?: string; // <-- Puthusa add pannirukom (For text box)
  
  // Purchase Details
  purchaseDate: string;
  purchasePrice: number;
  sellerName: string;
  sellerPhone: string;
  
  // Stock Status
  status: 'in-stock' | 'sold' | 'returned';
  expenses: Expense[];
  
  // Media (Photos & Docs)
  images: string[];
  rcFrontUrl?: string;     // <-- Changed
  rcBackUrl?: string;      // <-- Changed
  insuranceUrl?: string;   // <-- Puthusa add pannirukom
  sellerIdProofUrl?: string; 
  
  // Sales Details
  soldDate?: string;
  soldPrice?: number;
  customer?: CustomerDetails;
  
  createdAt: number;
}