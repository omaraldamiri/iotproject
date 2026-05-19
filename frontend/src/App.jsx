import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ShopPage from './pages/ShopPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<ShopPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
    </Routes>
  );
}

export default App;
