import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import DigitalTwin from './pages/DigitalTwin';
import AdvancedAnalytics from './pages/AdvancedAnalytics';
import EnhancedDashboard from './pages/EnhancedDashboard';
import MLAnalytics from './pages/MLAnalytics';
import SafetyMonitor from './pages/SafetyMonitor';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-[var(--color-bg)] text-white overflow-hidden">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Background Ambient Glow */}
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-green-500/10 rounded-full blur-[120px] pointer-events-none" />

          <Header />

          <main className="flex-1 overflow-y-auto p-6 relative z-10">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/enhanced-dashboard" element={<EnhancedDashboard />} />
              <Route path="/digital-twin" element={<DigitalTwin />} />
              <Route path="/analytics" element={<AdvancedAnalytics />} />
              <Route path="/ml-analytics" element={<MLAnalytics />} />
              <Route path="/safety" element={<SafetyMonitor />} />
              <Route path="/settings" element={
                <div className="text-center mt-20 text-2xl text-slate-400">Settings (Coming Soon)</div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
