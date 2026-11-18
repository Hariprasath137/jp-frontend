// src/App.tsx
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MobileLayout from './layouts/MobileLayout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { useAuthStore } from './stores/useAuthStore';
import { Loader2 } from 'lucide-react';
import AddBike from './pages/AddBike';
import Inventory from './pages/Inventory';
import BikeDetails from './pages/BikeDetails';
import NotificationsPage from './pages/NotificationsPage';
import CapitalInvestedPage from './pages/CapitalInvestedPage';
import BikesInStockPage from './pages/BikesInStockPage';
import NetProfitPage from './pages/NetProfitPage';
import ReturnedBikesPage from './pages/ReturnedBikesPage';
import EditBikePage from './pages/EditBikePage';

function App() {
  const { user, isInitialized, initAuth } = useAuthStore();

  // App start aagum pothu Firebase auth check pannum
  useEffect(() => {
    initAuth();
  }, [initAuth]);

  // Firebase check panni mudikura varaikum loading kaatum
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 size={40} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        
        {/* Protected Routes Wrapper */}
        <Route path="/" element={user ? <MobileLayout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          <Route path="add-bike" element={<AddBike />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="bike/:id" element={<BikeDetails />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="net-profit" element={<NetProfitPage />} />
          <Route path="capital" element={<CapitalInvestedPage />} />
          <Route path="returned-bikes" element={<ReturnedBikesPage />} />
          <Route path="edit-bike/:id" element={<EditBikePage />} />
          <Route path="stock-details" element={<BikesInStockPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;