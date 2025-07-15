import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import SyncStatus from './components/SyncStatus';
import './utils/webDatabase';
import './utils/webAPI';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import AddPart from './pages/AddPart';
import StockMovement from './pages/StockMovement';
import Reports from './pages/Reports';
import LowStock from './pages/LowStock';
import AddStock from './pages/AddStock';
import JobCards from './pages/JobCards';
import AddJobCard from './pages/AddJobCard';
import EditJobCard from './pages/EditJobCard';
import Estimates from './pages/Estimates';
import AddEstimate from './pages/AddEstimate';
import Invoices from './pages/Invoices';
import Invoice from './pages/Invoice';
import StockReceive from './pages/StockReceive';
import StockReceives from './pages/StockReceives';
import ClearDatabase from './pages/ClearDatabase';

function AppContent() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login } = useAuth();

  useEffect(() => {
    console.log('🚀 AppContent useEffect - React app is mounting');
    console.log('🔍 electronAPI available:', !!window.electronAPI);
    console.log('🔍 electronAPI methods:', window.electronAPI ? Object.keys(window.electronAPI) : 'undefined');
    console.log('🔍 Current location:', window.location.href);
    console.log('🔍 Current hash:', window.location.hash);
    console.log('🔍 Auth state - isAuthenticated:', isAuthenticated, 'loading:', loading);
    
    // Only navigate to dashboard if no route is currently active (on app start)
    const currentHash = window.location.hash;
    if (!currentHash || currentHash === '#/' || currentHash === '') {
      setTimeout(() => {
        console.log('🔄 No active route, navigating to dashboard...');
        navigate('/dashboard', { replace: true });
        console.log('📍 Navigated to /dashboard');
      }, 100);
    } else {
      console.log('📍 Route already active:', currentHash);
    }
    
    if (window.electronAPI) {
      console.log('✅ Setting up Electron navigation listeners');
      window.electronAPI.onNavigateToLowStock(() => {
        console.log('📍 Electron navigation: low-stock');
        navigate('/low-stock');
      });

      window.electronAPI.onNavigate((path) => {
        console.log('📍 Electron navigation:', path);
        navigate(path);
      });
    } else {
      console.warn('⚠️ electronAPI not available - running in web mode');
    }
  }, [navigate]);

  // Show loading spinner while checking auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  // Show main app if authenticated
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 animate-fade-in">
          <div className="flex justify-end mb-4">
            <SyncStatus />
          </div>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/add-part" element={<AddPart />} />
            <Route path="/add-stock" element={<AddStock />} />
            <Route path="/job-cards" element={<JobCards />} />
            <Route path="/add-job-card" element={<AddJobCard />} />
            <Route path="/edit-job-card/:id" element={<EditJobCard />} />
            <Route path="/stock-movement" element={<StockMovement />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/low-stock" element={<LowStock />} />
            <Route path="/estimates" element={<Estimates />} />
            <Route path="/add-estimate" element={<AddEstimate />} />
            <Route path="/invoices" element={<Invoices />} />
            <Route path="/add-invoice" element={<Invoice />} />
            <Route path="/stock-receives" element={<StockReceives />} />
            <Route path="/stock-receive" element={<StockReceive />} />
            <Route path="/clear-database" element={<ClearDatabase />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  console.log('🎯 App component rendering - Main App function called');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <AppContent />
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;