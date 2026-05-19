import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import ShopPage from './pages/ShopPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<ShopPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </ToastProvider>
  );
}

export default App;
